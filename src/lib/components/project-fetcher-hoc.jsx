import React from 'react';
import PropTypes from 'prop-types';
import {intlShape, injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';

import {setProjectUnchanged} from '../../reducers/project-changed.js';
import {
    LoadingStates,
    getIsCreatingNew,
    getIsFetchingWithId,
    getIsLoading,
    getIsShowingProject,
    onFetchedProjectData,
    projectError,
    returnToShowProject,
    setProjectId,
    defaultProjectId
} from '../../reducers/project-state.js';
import {
    activateTab,
    BLOCKS_TAB_INDEX
} from '../../reducers/editor-tab.js';
import {setProjectError} from '../../reducers/tw.js';
import {openInvalidProjectModal} from '../../reducers/modals.js';

import log from '../utils/log.js';
import storage from '../persistence/storage.js';

import VM from 'scratch-vm';
import {fetchProjectMeta} from './tw-project-meta-fetcher-hoc.jsx';

// TW: Temporary hack for project tokens
const fetchProjectToken = async projectId => {
    if (projectId === '0') {
        return null;
    }
    // Parse ?token=abcdef
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has('token')) {
        return searchParams.get('token');
    }
    // Parse #1?token=abcdef
    const hashParams = new URLSearchParams(location.hash.split('?')[1]);
    if (hashParams.has('token')) {
        return hashParams.get('token');
    }
    try {
        const metadata = await fetchProjectMeta(projectId);
        return metadata.project_token;
    } catch (e) {
        log.error(e);
        throw new Error('Cannot access project token. Project is probably unshared. See https://docs.turbowarp.org/unshared-projects');
    }
};

// Public CORS proxies. When embedding loads a project from a URL whose server
// does not send an Access-Control-Allow-Origin header, fetch() throws a
// "TypeError: Failed to fetch" which previously took the whole editor down.
// Routing cross-origin requests through a proxy makes embedding work without
// requiring the upstream server to be modified.
//
// Precedence for cross-origin urls:
//   1. Our own same-origin proxy (/api/project-proxy on Cloudflare Workers) —
//      most reliable and private.
//   2. A public CORS proxy (corsproxy.io) — fallback when the own proxy is
//      not deployed on this host.
//   3. Direct request — in case the upstream already sends CORS headers.
const OWN_PROXY_PATH = '/api/project-proxy';
const PUBLIC_PROXY_URL = 'https://corsproxy.io/?url=';

const buildOwnProxyUrl = projectUrl => {
    try {
        const u = new URL(OWN_PROXY_PATH, window.location.origin);
        u.searchParams.set('url', projectUrl);
        return u.toString();
    } catch (e) {
        return null;
    }
};

// Only proxy cross-origin http(s) requests. Same-origin, data: and already-
// proxied URLs are fetched directly.
const isCrossOriginHttpUrl = url => {
    if (!url) return false;
    try {
        const target = new URL(url);
        if (!['http:', 'https:'].includes(target.protocol)) return false;
        const current = new URL(window.location.href);
        return target.origin !== current.origin;
    } catch (e) {
        return false;
    }
};

// True when a response body is clearly HTML rather than project data. Some
// hosts reply with 200 + their index.html when a route is missing (the dev
// server's historyApiFallback, or a Pages site that has not deployed the
// /api/project-proxy function). Feeding that HTML into the project loader
// crashes the editor with "JSON.parse: unexpected character '<'", so we
// detect it here and move on to the next proxy attempt instead.
const looksLikeHtml = (contentType, buffer) => {
    if (contentType && contentType.includes('text/html')) {
        return true;
    }
    if (buffer && buffer.byteLength > 0) {
        // '<' as the first byte is a strong signal of an HTML document
        // (e.g. "<!doctype html>" or "<html>"). Real project data is either a
        // ZIP archive (PK\x03\x04), raw JSON ('{'), or a binary sprite/sb.
        const head = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 8)));
        if (head[0] === 0x3C) { // '<'
            return true;
        }
    }
    return false;
};

// Attempt to fetch a project from the given url. Cross-origin urls are tried
// through our own proxy, then a public proxy, then directly. Any attempt that
// returns HTML (e.g. a 200 error page) is treated as a failure so it can never
// reach the project loader.
const fetchProjectBuffer = async projectUrl => {
    if (!isCrossOriginHttpUrl(projectUrl)) {
        // Same-origin or non-http(s): fetch directly.
        const r = await fetch(projectUrl);
        if (!r.ok) {
            throw new Error(`Request returned status ${r.status}`);
        }
        const buffer = await r.arrayBuffer();
        if (looksLikeHtml(r.headers.get('content-type'), buffer)) {
            throw new Error(`Request returned HTML instead of project data (${projectUrl})`);
        }
        return buffer;
    }

    const ownProxyUrl = buildOwnProxyUrl(projectUrl);
    const attempts = [];
    if (ownProxyUrl) attempts.push(ownProxyUrl);
    attempts.push(`${PUBLIC_PROXY_URL}${encodeURIComponent(projectUrl)}`);
    attempts.push(projectUrl);

    let lastError = null;
    for (const url of attempts) {
        try {
            const r = await fetch(url);
            if (!r.ok) {
                throw new Error(`Request returned status ${r.status}`);
            }
            const buffer = await r.arrayBuffer();
            if (looksLikeHtml(r.headers.get('content-type'), buffer)) {
                throw new Error(`Request returned HTML instead of project data (${url})`);
            }
            return buffer;
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError || new Error('Could not fetch project');
};

/* Higher Order Component to provide behavior for loading projects by id. If
 * there's no id, the default project is loaded.
 * @param {React.Component} WrappedComponent component to receive projectData prop
 * @returns {React.Component} component with project loading behavior
 */
const ProjectFetcherHOC = function (WrappedComponent) {
    class ProjectFetcherComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'fetchProject'
            ]);
            storage.setProjectHost(props.projectHost);
            storage.setProjectToken(props.projectToken);
            storage.setAssetHost(props.assetHost);
            storage.setTranslatorFunction(props.intl.formatMessage);
            // props.projectId might be unset, in which case we use our default;
            // or it may be set by an even higher HOC, and passed to us.
            // Either way, we now know what the initial projectId should be, so
            // set it in the redux store.
            if (
                props.projectId !== '' &&
                props.projectId !== null &&
                typeof props.projectId !== 'undefined'
            ) {
                this.props.setProjectId(props.projectId.toString());
                // 在构造函数中立即开始获取项目数据，无需等待 componentDidUpdate。
                // 这样 projectFetcher 的第一次渲染还未完成时，网络请求就已经发出，
                // 节省一个完整的 React 渲染周期（约 10-50ms）。
                const id = props.projectId.toString();
                const loadingState = (id === '0') ? LoadingState.FETCHING_NEW_DEFAULT : LoadingState.FETCHING_WITH_ID;
                this._fetchStarted = true;
                this.fetchProject(id, loadingState);
            }
        }
        componentDidUpdate (prevProps) {
            if (prevProps.projectHost !== this.props.projectHost) {
                storage.setProjectHost(this.props.projectHost);
            }
            if (prevProps.projectToken !== this.props.projectToken) {
                storage.setProjectToken(this.props.projectToken);
            }
            if (prevProps.assetHost !== this.props.assetHost) {
                storage.setAssetHost(this.props.assetHost);
            }
            if (this.props.isFetchingWithId && !prevProps.isFetchingWithId) {
                // 如果构造函数已启动获取，跳过（避免重复请求）
                if (this._fetchStarted) {
                    this._fetchStarted = false;
                    return;
                }
                this.fetchProject(this.props.reduxProjectId, this.props.loadingState);
            }
            if (this.props.isShowingProject && !prevProps.isShowingProject) {
                this.props.onProjectUnchanged();
            }
            if (this.props.isShowingProject && (prevProps.isLoadingProject || prevProps.isCreatingNew)) {
                this.props.onActivateTab(BLOCKS_TAB_INDEX);
            }
        }
        fetchProject (projectId, loadingState) {
            // tw: clear and stop the VM before fetching
            // these will also happen later after the project is fetched, but fetching may take a while and
            // the project shouldn't be running while fetching the new project
            this.props.vm.clear();
            this.props.vm.quit();

            let assetPromise;
            // In case running in node...
            let projectUrl = typeof URLSearchParams === 'undefined' ?
                null :
                new URLSearchParams(location.search).get('project_url');
            if (projectUrl) {
                if (
                    !projectUrl.startsWith('http:') &&
                    !projectUrl.startsWith('https:') &&
                    !projectUrl.startsWith('data:')
                ) {
                    projectUrl = `https://${projectUrl}`;
                }
                assetPromise = fetchProjectBuffer(projectUrl)
                    .then(buffer => ({data: buffer}));
            } else if (projectId === '0') {
                // Default project is bundled; no network request needed.
                assetPromise = storage.load(storage.AssetType.Project, projectId, storage.DataFormat.JSON);
            } else {
                // Public Scratch projects do NOT require a token to download.
                // The previous code waited for a cross-origin metadata round-trip
                // (fetchProjectMeta -> trampoline.turbowarp.org) BEFORE starting the
                // actual project download, adding a full extra network latency to
                // every project load. We now start the download immediately and only
                // fall back to fetching a token (for unshared projects) if the
                // no-token download fails with an auth error.
                storage.setProjectToken(null);
                assetPromise = storage.load(storage.AssetType.Project, projectId, storage.DataFormat.JSON)
                    .catch(err => {
                        const needsToken = err && (
                            `${err}`.includes('403') ||
                            `${err}`.includes('401') ||
                            `${err}`.includes('token') ||
                            `${err}`.includes('unshared')
                        );
                        if (!needsToken) {
                            throw err;
                        }
                        return fetchProjectToken(projectId)
                            .then(token => {
                                storage.setProjectToken(token);
                                return storage.load(storage.AssetType.Project, projectId, storage.DataFormat.JSON);
                            });
                    });
            }

            return assetPromise
                .then(projectAsset => {
                    if (projectAsset) {
                        this.props.onFetchedProjectData(projectAsset.data, loadingState);
                    } else {
                        // Treat failure to load as an error
                        // Throw to be caught by catch later on
                        throw new Error('Could not find project');
                    }
                })
                .catch(err => {
                    if (projectUrl) {
                        // Loading a project from an external URL failed (e.g. the
                        // server did not allow CORS). Show a friendly modal instead
                        // of throwing inside render() which would crash the editor.
                        this.props.onReturnToShow();
                        this.props.onSetProjectError(err);
                        this.props.onOpenInvalidProjectModal();
                        log.error(err);
                    } else {
                        this.props.onError(err);
                        log.error(err);
                    }
                });
        }
        render () {
            const {
                /* eslint-disable no-unused-vars */
                assetHost,
                intl,
                isLoadingProject: isLoadingProjectProp,
                loadingState,
                onActivateTab,
                onError: onErrorProp,
                onFetchedProjectData: onFetchedProjectDataProp,
                onProjectUnchanged,
                onReturnToShow,
                onSetProjectError,
                projectHost,
                projectId,
                reduxProjectId,
                setProjectId: setProjectIdProp,
                /* eslint-enable no-unused-vars */
                isFetchingWithId: isFetchingWithIdProp,
                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    fetchingProject={isFetchingWithIdProp}
                    {...componentProps}
                />
            );
        }
    }
    ProjectFetcherComponent.propTypes = {
        assetHost: PropTypes.string,
        canSave: PropTypes.bool,
        intl: intlShape.isRequired,
        isCreatingNew: PropTypes.bool,
        isFetchingWithId: PropTypes.bool,
        isLoadingProject: PropTypes.bool,
        isShowingProject: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onActivateTab: PropTypes.func,
        onError: PropTypes.func,
        onFetchedProjectData: PropTypes.func,
        onOpenInvalidProjectModal: PropTypes.func,
        onProjectUnchanged: PropTypes.func,
        onReturnToShow: PropTypes.func,
        onSetProjectError: PropTypes.func,
        projectHost: PropTypes.string,
        projectToken: PropTypes.string,
        projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        reduxProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        setProjectId: PropTypes.func,
        vm: PropTypes.instanceOf(VM)
    };
    ProjectFetcherComponent.defaultProps = {
        assetHost: 'https://rw-asset.pages.dev',
        projectHost: 'https://projects.scratch.mit.edu'
    };

    const mapStateToProps = state => ({
        isCreatingNew: getIsCreatingNew(state.scratchGui.projectState.loadingState),
        isFetchingWithId: getIsFetchingWithId(state.scratchGui.projectState.loadingState),
        isLoadingProject: getIsLoading(state.scratchGui.projectState.loadingState),
        isShowingProject: getIsShowingProject(state.scratchGui.projectState.loadingState),
        loadingState: state.scratchGui.projectState.loadingState,
        reduxProjectId: state.scratchGui.projectState.projectId,
        vm: state.scratchGui.vm
    });
    const mapDispatchToProps = dispatch => ({
        onActivateTab: tab => dispatch(activateTab(tab)),
        onError: error => dispatch(projectError(error)),
        onFetchedProjectData: (projectData, loadingState) =>
            dispatch(onFetchedProjectData(projectData, loadingState)),
        setProjectId: projectId => dispatch(setProjectId(projectId)),
        onProjectUnchanged: () => dispatch(setProjectUnchanged()),
        onOpenInvalidProjectModal: () => dispatch(openInvalidProjectModal()),
        onReturnToShow: () => dispatch(returnToShowProject()),
        onSetProjectError: error => dispatch(setProjectError(error))
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );
    return injectIntl(connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(ProjectFetcherComponent));
};

export {
    ProjectFetcherHOC as default
};

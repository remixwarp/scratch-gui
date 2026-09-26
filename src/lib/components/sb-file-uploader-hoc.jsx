import bindAll from 'lodash.bindall';
import React from 'react';
import PropTypes from 'prop-types';
import {intlShape, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import log from '../utils/log';
import sharedMessages from '../constants/shared-messages';
import {setFileHandle, setProjectError} from '../../reducers/tw';
import unpackage from '../unpackager';
import {loadRJIntoVM} from '../rj/deserialize.js';
import {isRJFilename} from '../rj/constants.js';
import {createRJProgressReporter} from '../rj/progress.js';
import {setLoadingProgress, resetLoadingProgress} from '../../reducers/loading-progress';

import {
    LoadingStates,
    getIsLoadingUpload,
    getIsShowingWithoutId,
    onLoadedProject,
    requestProjectUpload,
    getIsShowingProject
} from '../../reducers/project-state';
import {setProjectTitle} from '../../reducers/project-title';
import {
    openLoadingProject,
    closeLoadingProject,
    openInvalidProjectModal
} from '../../reducers/modals';
import {
    closeFileMenu
} from '../../reducers/menus';

/**
 * Higher Order Component to provide behavior for loading local project files into editor.
 * @param {React.Component} WrappedComponent the component to add project file loading functionality to
 * @returns {React.Component} WrappedComponent with project file loading functionality added
 *
 * <SBFileUploaderHOC>
 *     <WrappedComponent />
 * </SBFileUploaderHOC>
 */
const SBFileUploaderHOC = function (WrappedComponent) {
    class SBFileUploaderComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'createFileObjects',
                'getProjectTitleFromFilename',
                'handleFinishedLoadingUpload',
                'handleStartSelectingFileUpload',
                'handleChange',
                'onload',
                'removeFileObjects'
            ]);
            // tw: We have multiple instances of this HOC alive at a time. This flag fixes issues that arise from that.
            this.expectingFileUploadFinish = false;
            // Store instance reference for drag and drop functionality
            window.SBFileUploaderInstance = this;
        }
        componentDidUpdate (prevProps) {
            if (this.props.isLoadingUpload && !prevProps.isLoadingUpload && this.expectingFileUploadFinish) {
                this.handleFinishedLoadingUpload(); // cue step 5 below
            }
        }
        componentWillUnmount () {
            this.removeFileObjects();
        }
        // step 1: this is where the upload process begins
        handleStartSelectingFileUpload () {
            this.expectingFileUploadFinish = true;
            this.createFileObjects(); // go to step 2
        }
        // step 2: create a FileReader and an <input> element, and issue a
        // pseudo-click to it. That will open the file chooser dialog.
        createFileObjects () {
            // redo step 7, in case it got skipped last time and its objects are
            // still in memory
            this.removeFileObjects();
            // create fileReader
            this.fileReader = new FileReader();
            this.fileReader.onload = this.onload;
            // tw: Use FS API when available
            if (this.props.showOpenFilePicker) {
                (async () => {
                    try {
                        const [handle] = await this.props.showOpenFilePicker({
                            multiple: false,
                            types: [
                                {
                                    description: 'Scratch Project',
                                    accept: {
                                        // Using application/x.scratch.sb3 as done in scratch-vm causes file pickers
                                        // to disallow picking any items in Chrome 133 on Android.
                                        'application/octet-stream': ['.sb', '.sb2', '.sb3', '.rj'],
                                        'text/html': ['.html']
                                    }
                                }
                            ]
                        });
                        const file = await handle.getFile();
                        this.handleChange({
                            target: {
                                files: [file],
                                handle: handle
                            }
                        });
                    } catch (err) {
                        // If the user aborted it, that's not an error.
                        if (err && err.name === 'AbortError') {
                            return;
                        }
                        // eslint-disable-next-line no-console
                        console.error(err);
                    }
                })();
            } else {
                // create <input> element and add it to DOM
                this.inputElement = document.createElement('input');
                this.inputElement.accept = '.sb,.sb2,.sb3,.html,.rj';
                this.inputElement.style = 'display: none;';
                this.inputElement.type = 'file';
                this.inputElement.onchange = this.handleChange; // connects to step 3
                document.body.appendChild(this.inputElement);
                // simulate a click to open file chooser dialog
                this.inputElement.click();
            }
        }
        // step 3: user has picked a file using the file chooser dialog.
        // We don't actually load the file here, we only decide whether to do so.
        handleChange (e) {
            const {
                intl,
                isShowingWithoutId,
                loadingState,
                projectChanged,
                userOwnsProject
            } = this.props;
            const thisFileInput = e.target;
            if (thisFileInput.files) { // Don't attempt to load if no file was selected
                this.fileToUpload = thisFileInput.files[0];

                // If user owns the project, or user has changed the project,
                // we must confirm with the user that they really intend to
                // replace it. (If they don't own the project and haven't
                // changed it, no need to confirm.)
                let uploadAllowed = true;
                if (userOwnsProject || (projectChanged && isShowingWithoutId)) {
                    uploadAllowed = confirm( // eslint-disable-line no-alert
                        intl.formatMessage(sharedMessages.replaceProjectWarning)
                    );
                }
                if (uploadAllowed) {
                    // Don't update file handle until after confirming replace.
                    const handle = thisFileInput.handle;
                    if (handle) {
                        if (this.fileToUpload.name.endsWith('.sb3')) {
                            this.props.onSetFileHandle(handle);
                        } else {
                            this.props.onSetFileHandle(null);
                        }
                    }

                    // cues step 4
                    this.props.requestProjectUpload(loadingState);
                } else {
                    // skips ahead to step 7
                    this.removeFileObjects();
                }
                this.props.closeFileMenu();
            }
        }
        // step 4 is below, in mapDispatchToProps

        // step 5: called from componentDidUpdate when project state shows
        // that project data has finished "uploading" into the browser
        handleFinishedLoadingUpload () {
            this.expectingFileUploadFinish = false;
            if (this.fileToUpload && this.fileReader) {
                // begin to read data from the file. When finished,
                // cues step 6 using the reader's onload callback
                this.fileReader.readAsArrayBuffer(this.fileToUpload);
            } else {
                this.props.cancelFileUpload(this.props.loadingState);
                // skip ahead to step 7
                this.removeFileObjects();
            }
        }
        // used in step 6 below
        getProjectTitleFromFilename (fileInputFilename) {
            if (!fileInputFilename) return '';
            // only parse title with valid scratch project extensions
            // (.sb, .sb2, .sb3, .rj, or .html)
            const matches = fileInputFilename.match(/^(.*)\.(?:sb[23]?|rj|html)$/);
            if (!matches) return '';
            return matches[1].substring(0, 100); // truncate project title to max 100 chars
        }
        // step 6: attached as a handler on our FileReader object; called when
        // file upload raw data is available in the reader
        async onload () {
            if (this.fileReader) {
                const filename = this.fileToUpload && this.fileToUpload.name;
                // 先上报「正在从硬盘读取作品文件」，再打开加载遮罩。
                // 注意顺序：onLoadingStarted 会 reset 进度，所以必须放在它之后。
                const reportReadFile = () => {
                    const zh = this.props.locale === 'zh-cn';
                    this.props.onLoadingProgress({
                        source: 'file',
                        phase: 'readFile',
                        detail: zh ?
                            `正在从硬盘读取作品文件（${filename}）……` :
                            `Reading project file from disk (${filename}) …`,
                        percent: 2
                    });
                };
                this.props.onLoadingStarted();
                reportReadFile();
                let loadingSuccess = false;
                // tw: stop when loading new project
                this.props.vm.quit();
                let projectData = this.fileReader.result;

                if (filename && filename.endsWith('.html')) {
                    try {
                        const blob = new Blob([projectData], {type: 'text/html'});
                        const unpackaged = await unpackage(blob);
                        projectData = unpackaged.data;
                    } catch (error) {
                        log.error('Failed to unpackage HTML file:', error);
                        this.props.onLoadingFailed(error);
                        this.props.onLoadingFinished(this.props.loadingState, false);
                        this.removeFileObjects();
                        return;
                    }
                }

                // .rj 是 RemixWarp 的分片式作品文件（zip + 多个 json）。
                // 读取时按顺序读出角色 / 造型 / 背景 / 声音 / 变量 / 积木等名称表与数据，
                // 然后直接装进 VM —— 资源由 VM 按需解压，不再重新打包成 sb3，
                // 因此大作品的加载速度大幅提升。
                if (isRJFilename(filename)) {
                    try {
                        const locale = this.props.locale;
                        const report = this.props.onLoadingProgress;
                        await loadRJIntoVM(this.props.vm, projectData, {
                            onProgress: progress => {
                                log.info(`[rj] ${progress.stage}`, progress);
                                createRJProgressReporter(locale, report)(progress);
                            }
                        });
                        if (filename) {
                            this.props.onSetProjectTitle(this.getProjectTitleFromFilename(filename));
                        }
                        this.props.vm.renderer.draw();
                        this.props.onLoadingFinished(this.props.loadingState, true);
                        this.removeFileObjects();
                        return;
                    } catch (error) {
                        log.error('Failed to load .rj project file:', error);
                        this.props.onLoadingFailed(error);
                        this.props.onLoadingFinished(this.props.loadingState, false);
                        this.removeFileObjects();
                        return;
                    }
                }

                this.props.vm.loadProject(projectData)
                    .then(() => {
                        if (filename) {
                            const uploadedProjectTitle = this.getProjectTitleFromFilename(filename);
                            this.props.onSetProjectTitle(uploadedProjectTitle);
                        }
                        this.props.vm.renderer.draw();
                        loadingSuccess = true;
                    })
                    .catch(error => {
                        log.error(error);
                        this.props.onLoadingFailed(error);
                    })
                    .then(() => {
                        this.props.onLoadingFinished(this.props.loadingState, loadingSuccess);
                        // go back to step 7: whether project loading succeeded
                        // or failed, reset file objects
                        this.removeFileObjects();
                    });
            }
        }
        // step 7: remove the <input> element from the DOM and clear reader and
        // fileToUpload reference, so those objects can be garbage collected
        removeFileObjects () {
            if (this.inputElement) {
                this.inputElement.value = '';
                document.body.removeChild(this.inputElement);
            }
            this.inputElement = null;
            this.fileReader = null;
            this.fileToUpload = null;
        }
        render () {
            const {
                /* eslint-disable no-unused-vars */
                cancelFileUpload,
                closeFileMenu: closeFileMenuProp,
                isLoadingUpload,
                isShowingWithoutId,
                loadingState,
                locale,
                onLoadingFailed,
                onLoadingFinished,
                onLoadingProgress,
                onLoadingStarted,
                onSetFileHandle,
                onSetProjectTitle,
                projectChanged,
                requestProjectUpload: requestProjectUploadProp,
                userOwnsProject,
                /* eslint-enable no-unused-vars */
                ...componentProps
            } = this.props;
            return (
                <React.Fragment>
                    <WrappedComponent
                        onStartSelectingFileUpload={this.handleStartSelectingFileUpload}
                        {...componentProps}
                    />
                </React.Fragment>
            );
        }
    }

    SBFileUploaderComponent.propTypes = {
        canSave: PropTypes.bool,
        cancelFileUpload: PropTypes.func,
        closeFileMenu: PropTypes.func,
        intl: intlShape.isRequired,
        isLoadingUpload: PropTypes.bool,
        isShowingProject: PropTypes.bool,
        isShowingWithoutId: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onLoadingFailed: PropTypes.func,
        onLoadingFinished: PropTypes.func,
        onLoadingProgress: PropTypes.func,
        onLoadingStarted: PropTypes.func,
        onSetProjectTitle: PropTypes.func,
        locale: PropTypes.string,
        projectChanged: PropTypes.bool,
        requestProjectUpload: PropTypes.func,
        showOpenFilePicker: PropTypes.func,
        userOwnsProject: PropTypes.bool,
        vm: PropTypes.shape({
            loadProject: PropTypes.func,
            quit: PropTypes.func,
            renderer: PropTypes.shape({
                draw: PropTypes.func
            })
        }),
        onSetFileHandle: PropTypes.func
    };
    SBFileUploaderComponent.defaultProps = {
        showOpenFilePicker: typeof showOpenFilePicker === 'function' && !navigator.userAgent.includes('Android') ?
            window.showOpenFilePicker.bind(window) :
            null
    };
    const mapStateToProps = (state, ownProps) => {
        const loadingState = state.scratchGui.projectState.loadingState;
        const user = state.session && state.session.session && state.session.session.user;
        return {
            isLoadingUpload: getIsLoadingUpload(loadingState),
            isShowingProject: getIsShowingProject(loadingState),
            isShowingWithoutId: getIsShowingWithoutId(loadingState),
            loadingState: loadingState,
            projectChanged: state.scratchGui.projectChanged,
            userOwnsProject: ownProps.authorUsername && user &&
                (ownProps.authorUsername === user.username),
            locale: state.locales ? state.locales.locale : 'en',
            vm: state.scratchGui.vm
        };
    };
    const mapDispatchToProps = (dispatch, ownProps) => ({
        cancelFileUpload: loadingState => dispatch(onLoadedProject(loadingState, false, false)),
        closeFileMenu: () => dispatch(closeFileMenu()),
        onLoadingFailed: error => {
            dispatch(setProjectError(error));
            dispatch(openInvalidProjectModal());
        },
        // transition project state from loading to regular, and close
        // loading screen and file menu
        onLoadingFinished: (loadingState, success) => {
            dispatch(onLoadedProject(loadingState, ownProps.canSave, success));
            dispatch(closeLoadingProject());
            dispatch(closeFileMenu());
        },
        // show project loading screen
        onLoadingStarted: () => {
            dispatch(resetLoadingProgress());
            dispatch(openLoadingProject());
        },
        onLoadingProgress: payload => dispatch(setLoadingProgress(payload)),
        onSetProjectTitle: title => dispatch(setProjectTitle(title)),
        // step 4: transition the project state so we're ready to handle the new
        // project data. When this is done, the project state transition will be
        // noticed by componentDidUpdate()
        requestProjectUpload: loadingState => dispatch(requestProjectUpload(loadingState)),
        onSetFileHandle: fileHandle => dispatch(setFileHandle(fileHandle))
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );
    return injectIntl(connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(SBFileUploaderComponent));
};

export {
    SBFileUploaderHOC as default
};

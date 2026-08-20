import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import VM from 'scratch-vm';
import AudioEngine from 'scratch-audio';

import * as BrowserGit from '../git/browser-git';
import JSZip from 'jszip';

import {setProjectUnchanged} from '../../reducers/project-changed';
import {
    LoadingStates,
    getIsLoadingWithId,
    onLoadedProject,
    projectError
} from '../../reducers/project-state';
import log from '../utils/log';

/**
 * List of fonts that could be used by security prompts.
 */
const SECURITY_CRITICAL_FONTS = [
    'Helvetica Neue',
    'Helvetica',
    'Arial'
];

/*
 * Higher Order Component to manage events emitted by the VM
 * @param {React.Component} WrappedComponent component to manage VM events for
 * @returns {React.Component} connected component with vm events bound to redux
 */
const vmManagerHOC = function (WrappedComponent) {
    class VMManager extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'loadProject'
            ]);
            this._loadingPromise = null;
        }
        componentDidMount () {
            if (!this.props.vm.initialized) {
                window.vm = this.props.vm;

                try {
                    this.audioEngine = new AudioEngine();
                    this.props.vm.attachAudioEngine(this.audioEngine);
                } catch (e) {
                    log.error('could not create scratch-audio', e);
                }
                for (const font of SECURITY_CRITICAL_FONTS) {
                    this.props.vm.runtime.fontManager.restrictFont(font);
                }
                this.props.vm.initialized = true;
                this.props.vm.setLocale(this.props.locale, this.props.messages);
            }
            // 不再立即启动 VM 运行时：项目还未加载，此时启动线程/sequencer
            // 毫无意义。将 start() 推迟到 loadProject() 成功后执行。
        }
        componentDidUpdate (prevProps) {
            // 加载项目：不再等待字体加载完成。项目数据加载到 VM 只需要 JSON 解析，
            // 字体仅在 blocks 渲染时才需要，无需串行等待。
            if (this.props.isLoadingWithId && !prevProps.isLoadingWithId) {
                this.loadProject();
            }
        }

        componentWillUnmount () {
            // Mark any in-flight load as cancelled so its .then() callbacks
            // do not dispatch to an unmounted component.
            this._loadingPromise = null;
        }

        loadProject () {
            // Guard against concurrent loads: if a previous load is still in
            // flight, quit the VM first (which cancels its work) and then let
            // the new load proceed. The old promise is discarded so its
            // callbacks won't fire on a stale VM state.
            if (this._loadingPromise) {
                this.props.vm.quit();
            }

            // tw: stop when loading new project
            this.props.vm.quit();
            const promise = this.props.vm.loadProject(this.props.projectData)
                .then(() => {
                    // If a newer load has started (or the component unmounted),
                    // discard this result — the VM is already in a different state.
                    if (this._loadingPromise !== promise) {
                        return;
                    }

                    // 立即发送加载完成信号（不包 setTimeout），尽快把 UI 从 Loading 切换到显示
                    this.props.onLoadedProject(this.props.loadingState, this.props.canSave);

                    // 项目加载完成后才启动 VM: 避免加载完成前调度空序列
                    if (!this.props.isPlayerOnly && !this.props.isStarted) {
                        this.props.vm.start();
                    }

                    // 合并异步回调：原来有 2 个独立的 setTimeout(0)，
                    // 每个都会单独推迟到下一次事件循环，累计延迟用户可感知的
                    // 加载时间。统一用一个 microtask + 一个可选 requestAnimationFrame
                    Promise.resolve().then(() => {
                        if (this._loadingPromise !== promise) return;
                        this.props.onSetProjectUnchanged();
                        // If the vm is not running, call draw on the renderer manually
                        // This draws the state of the loaded project with no blocks running
                        // which closely matches the 2.0 behavior, except for monitors–
                        // 2.0 runs monitors and shows updates (e.g. timer monitor)
                        // before the VM starts running other hat blocks.
                        if (!this.props.isStarted && this.props.vm.renderer) {
                            // 皮肤加载通常为异步，但 requestAnimationFrame 比 setTimeout
                            // 更精准地在下一次重绘前执行，避免额外的帧等待
                            if (typeof requestAnimationFrame !== 'undefined') {
                                requestAnimationFrame(() => this.props.vm.renderer.draw());
                            } else {
                                this.props.vm.renderer.draw();
                            }
                        }
                    });
                    this._loadingPromise = null;
                })
                .catch(e => {
                    if (this._loadingPromise !== promise) return;
                    this.props.onError(e);
                    this._loadingPromise = null;
                });
            this._loadingPromise = promise;
            return promise;
        }
        render () {
            const {
                /* eslint-disable no-unused-vars */
                fontsLoaded,
                loadingState,
                locale,
                messages,
                isStarted,
                onError: onErrorProp,
                onLoadedProject: onLoadedProjectProp,
                onSetProjectUnchanged,
                projectData,
                /* eslint-enable no-unused-vars */
                isLoadingWithId: isLoadingWithIdProp,
                vm,
                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    isLoading={isLoadingWithIdProp}
                    vm={vm}
                    {...componentProps}
                />
            );
        }
    }

    VMManager.propTypes = {
        canSave: PropTypes.bool,
        cloudHost: PropTypes.string,
        fontsLoaded: PropTypes.bool,
        isLoadingWithId: PropTypes.bool,
        isPlayerOnly: PropTypes.bool,
        isStarted: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        locale: PropTypes.string,
        messages: PropTypes.objectOf(PropTypes.string),
        onError: PropTypes.func,
        onLoadedProject: PropTypes.func,
        onSetProjectUnchanged: PropTypes.func,
        projectData: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
        projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        username: PropTypes.string,
        vm: PropTypes.instanceOf(VM).isRequired,
        gitJson: PropTypes.object
    };

    const mapStateToProps = state => {
        const loadingState = state.scratchGui.projectState.loadingState;
        return {
            fontsLoaded: state.scratchGui.fontsLoaded,
            isLoadingWithId: getIsLoadingWithId(loadingState),
            locale: state.locales.locale,
            messages: state.locales.messages,
            projectData: state.scratchGui.projectState.projectData,
            projectId: state.scratchGui.projectState.projectId,
            loadingState: loadingState,
            isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
            isStarted: state.scratchGui.vmStatus.started
        };
    };

    const mapDispatchToProps = dispatch => ({
        onError: error => dispatch(projectError(error)),
        onLoadedProject: (loadingState, canSave) =>
            dispatch(onLoadedProject(loadingState, canSave, true)),
        onSetProjectUnchanged: () => dispatch(setProjectUnchanged())
    });

    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );

    return connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(VMManager);
};

export default vmManagerHOC;

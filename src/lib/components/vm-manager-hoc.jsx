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
            // 与 TurboWarp 一致：编辑器模式下始终保证 VM 运行时（frameLoop）在运行。
            // scratch-vm 的 frameLoop 会按 30fps 每帧调用 renderer.draw()，这是舞台
            // 能自动刷新的唯一来源。加载作品时各链路会调用 vm.quit() 停掉帧循环，
            // 之后由 componentDidUpdate 在 RUNTIME_STOPPED 后自动恢复。
            if (!this.props.isPlayerOnly && !this.props.isStarted) {
                this.props.vm.start();
            }
        }
        componentDidUpdate (prevProps) {
            // 加载项目：不再等待字体加载完成。项目数据加载到 VM 只需要 JSON 解析，
            // 字体仅在 blocks 渲染时才需要，无需串行等待。
            if (this.props.isLoadingWithId && !prevProps.isLoadingWithId) {
                this.loadProject();
            }
            // 与 TurboWarp 一致：VM 一停就立刻拉回来。quit() 会 emit
            // RUNTIME_STOPPED -> started=false -> 触发这里。否则帧循环会永久停摆，
            // 舞台停在最后一次 draw 的画面，之后任何数据变化都不会重绘（只有点
            // 绿旗重新启动 VM 才会刷新）。
            if (!this.props.isPlayerOnly && !this.props.isStarted) {
                this.props.vm.start();
            }
        }

        componentWillUnmount () {
            // Mark any in-flight load as cancelled so its .then() callbacks
            // do not dispatch to an unmounted component.
            this._loadingPromise = null;
        }

        loadProject () {
            // Guard against concurrent loads: quit the VM before starting a new
            // load (which cancels the in-flight work). Stale results are already
            // discarded by the `this._loadingPromise !== promise` checks below,
            // so a second quit() here would just do the same work twice.
            // tw: stop when loading new project
            this.props.vm.quit();
            const promise = this.props.vm.loadProject(this.props.projectData)
                .then(() => {
                    // If a newer load has started (or the component unmounted),
                    // discard this result — the VM is already in a different state.
                    if (this._loadingPromise !== promise) {
                        return;
                    }

                    // 立即发送加载完成信号，尽快把 UI 从 Loading 切换到显示
                    this.props.onLoadedProject(this.props.loadingState, this.props.canSave);

                    // VM 的启动不再依赖这里的 props 快照（quit() 之后 isStarted
                    // 可能仍是旧值），统一由 componentDidMount / componentDidUpdate
                    // 保证，见上方两处 tw 同款逻辑。
                    const onSetProjectUnchanged = this.props.onSetProjectUnchanged;
                    const renderer = this.props.vm.renderer;

                    // 与 TurboWarp 一致：皮肤加载可能是异步的，把「标记未修改」和
                    // 「补画一帧」都推迟到下一个事件循环。此前用一个 microtask 包裹
                    // 并再次判断 this._loadingPromise，但该字段在同步代码末尾已被置
                    // 为 null，guard 永远失败 —— 补画一帧根本没有执行，这也是加载后
                    // 舞台空白的直接原因之一。此后 frameLoop 会以 30fps 持续重绘，
                    // 即使这一帧画早了，后续帧也会把舞台补上。
                    setTimeout(() => {
                        onSetProjectUnchanged();
                        if (renderer && typeof renderer.draw === 'function') {
                            renderer.draw();
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

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
        }
        componentDidMount () {
            if (!this.props.vm.initialized) {
                window.vm = this.props.vm;

                this.installGitProjectFileHooks();
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
            if (!this.props.isPlayerOnly && !this.props.isStarted) {
                this.props.vm.start();
            }
        }
        componentDidUpdate (prevProps) {
            // if project is in loading state, AND fonts are loaded,
            // and they weren't both that way until now... load project!
            if (this.props.isLoadingWithId && this.props.fontsLoaded &&
                (!prevProps.isLoadingWithId || !prevProps.fontsLoaded)) {
                this.loadProject();
            }
            // Start the VM if entering editor mode with an unstarted vm
            if (!this.props.isPlayerOnly && !this.props.isStarted) {
                this.props.vm.start();
            }
        }

        installGitProjectFileHooks () {
            const vm = this.props.vm;
            if (vm._mwGit_hooksInstalled) return;
            vm._mwGit_hooksInstalled = true;

            const originalSaveProjectZip = vm._saveProjectZip;
            vm._saveProjectZip = (options = {}) => {
                const zip = originalSaveProjectZip.call(vm, options);
                zip.file('git.json', JSON.stringify(BrowserGit.exportRepoToGitJsonStringSync()));
                return zip;
            };

            const originalLoadProject = vm.loadProject;
            vm.loadProject = async (data, opts = {}) => {
                // 先执行项目加载（最优先级），git.json 提取放到后面空闲时处理
                // 避免两个 JSZip.loadAsync 并行竞争 CPU/内存，大项目显著提升加载速度
                const result = await originalLoadProject.call(vm, data);

                // 调用方显式跳过 git 导入时直接返回
                if (opts && opts.skipGitImport) {
                    return result;
                }

                // 在浏览器空闲时异步提取和导入 git.json，不阻塞项目加载完成信号
                const scheduleIdle = typeof requestIdleCallback !== 'undefined'
                    ? requestIdleCallback
                    : cb => setTimeout(cb, 0);

                scheduleIdle(async () => {
                    try {
                        let buffer = null;
                        if (data instanceof ArrayBuffer) {
                            buffer = data;
                        } else if (ArrayBuffer.isView(data)) {
                            buffer = data.buffer.slice(
                                data.byteOffset,
                                data.byteOffset + data.byteLength
                            );
                        } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
                            buffer = await data.arrayBuffer();
                        }

                        if (buffer) {
                            const zip = await JSZip.loadAsync(buffer);
                            const file = zip.file('git.json');
                            if (file) {
                                const gitJson = await file.async('string');
                                if (gitJson) {
                                    await BrowserGit.importRepoFromGitJsonString(gitJson);
                                }
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                }, {timeout: 5000});

                return result;
            };
        }

        loadProject () {
            // tw: stop when loading new project
            this.props.vm.quit();
            return this.props.vm.loadProject(this.props.projectData)
                .then(() => {
                    // 立即发送加载完成信号（不包 setTimeout），尽快把 UI 从 Loading 切换到显示
                    this.props.onLoadedProject(this.props.loadingState, this.props.canSave);

                    // 合并异步回调：原来有 2 个独立的 setTimeout(0)，
                    // 每个都会单独推迟到下一次事件循环，累计延迟用户可感知的
                    // 加载时间。统一用一个 microtask + 一个可选 requestAnimationFrame
                    Promise.resolve().then(() => {
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
                })
                .catch(e => {
                    this.props.onError(e);
                });
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

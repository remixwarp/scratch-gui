import {useEffect, useMemo, useRef} from 'react';
import PropTypes from 'prop-types';

import LazyScratchBlocks from '../../lib/tw-lazy-scratch-blocks';
import Utils from '../../lib/find-bar/Utils';

import {loadAddonMessagesForLocale, formatAddonMessage} from './addon-i18n';
import {waitForElement} from './dom-utils';
import FindBarController from './FindBarController';

import inputStyles from '../forms/input.css';

import './find-bar.css';

// 标签栏 <ul> 的类名：经典布局是 gui_tab-list_*；VS Code 布局下标签栏被渲染成
// 活动栏，类名是 gui_vscode_*。查找栏必须在这两种布局下都能找到同一个 <ul>。
const TAB_LIST_SELECTOR = 'ul[class*=gui_tab-list_], ul[class*=gui_vscode]';
const TAB_LIST_FIND_BAR_SELECTOR =
    'ul[class*=gui_tab-list_] .mw-native-find-bar, ul[class*=gui_vscode] .mw-native-find-bar';

/**
 * The find bar component
 * @param {object} props the props for the component
 * @returns {void}
 */
export default function NativeFindBar ({vm, locale, activeTabIndex, isPlayerOnly}) {
    const activeTabIndexRef = useRef(activeTabIndex);
    activeTabIndexRef.current = activeTabIndex;

    const isPlayerOnlyRef = useRef(isPlayerOnly);
    isPlayerOnlyRef.current = isPlayerOnly;

    const localeRef = useRef(locale);
    localeRef.current = locale;

    const state = useMemo(() => ({
        cleanup: null
    }), []);

    useEffect(() => {
        let didUnmount = false;
        const abortController = new AbortController();

        const run = async () => {
            if (!vm || isPlayerOnlyRef.current) return;

            const ScratchBlocks = await LazyScratchBlocks.load().then(() => LazyScratchBlocks.get());
            if (didUnmount) return;

            const messages = await loadAddonMessagesForLocale(localeRef.current);
            if (didUnmount) return;

            const msg = (id, args) => formatAddonMessage(messages, `find-bar/${id}`, args);
            const msgAny = (fullId, args) => formatAddonMessage(messages, fullId, args);

            const utils = new Utils(vm, ScratchBlocks);

            const originalDoBlockClick = ScratchBlocks.Gesture &&
                ScratchBlocks.Gesture.prototype &&
                ScratchBlocks.Gesture.prototype.doBlockClick_;

            const findBar = new FindBarController({
                ScratchBlocks,
                utils,
                vm,
                msg,
                msgAny,
                inputClassName: inputStyles.inputForm,
                activeTabIndexRef,
                isPlayerOnlyRef
            });

            const installGesturePatch = () => {
                if (!originalDoBlockClick) return () => {};

                if (ScratchBlocks.Gesture.prototype.doBlockClick_.__mwFindBarPatched) {
                    return () => {};
                }

                const patched = function () {
                    /* eslint-disable no-invalid-this */
                    if (document.querySelector('.mw-native-find-bar')) {
                        if ((this.mostRecentEvent_.button === 1 ||
                        this.mostRecentEvent_.shiftKey) &&
                        findBar.findInput) {
                            let block = this.startBlock_;
                            for (; block; block = block.getSurroundParent()) {
                                if (block.type === 'procedures_definition' ||
                                (!this.jumpToDef && block.type === 'procedures_call')) {
                                    const id = block.id ? block.id : block.getId ? block.getId() : null;
                                    findBar.findInput.focus();
                                    findBar.showDropDown(id);
                                    return;
                                }

                                if (block.type === 'data_variable' ||
                                    block.type === 'data_changevariableby' ||
                                    block.type === 'data_setvariableto') {

                                    const id = block.getVars()[0];
                                    findBar.findInput.focus();
                                    findBar.showDropDown(id, block);
                                    findBar.selVarID = id;
                                    return;
                                }

                                if (
                                    block.type === 'event_whenbroadcastreceived' ||
                                    block.type === 'event_broadcastandwait' ||
                                    block.type === 'event_broadcast') {

                                    const id = block.id;
                                    findBar.findInput.focus();
                                    findBar.showDropDown(id, block);
                                    findBar.selVarID = id;
                                    return;
                                }
                            }
                        }
                    }

                    const result = originalDoBlockClick.call(this);
                    /* eslint-enable no-invalid-this */
                    return result;
                };
                patched.__mwFindBarPatched = true;

                ScratchBlocks.Gesture.prototype.doBlockClick_ = patched;

                return () => {
                    if (ScratchBlocks.Gesture.prototype.doBlockClick_ === patched) {
                        ScratchBlocks.Gesture.prototype.doBlockClick_ = originalDoBlockClick;
                    }
                };
            };

            const ensureInjected = async () => {
                if (didUnmount || isPlayerOnlyRef.current) return;

                const tabList = await waitForElement(TAB_LIST_SELECTOR, {
                    signal: abortController.signal}
                ).catch(() => null);
                if (!tabList || didUnmount) return;

                if (findBar.findBarOuter) {
                    findBar.syncHost();
                    findBar.tabChanged();
                    return;
                }

                // VS Code 布局下这个 ul 就是 41px 宽的活动栏：查找栏的 li 若挂进去会被
                // 当成绝对定位浮层裁剪，还会撑出横向滚动条。该布局下查找栏只显示在搜索
                // 面板里，因此先创建在游离容器中，等面板打开时再由 syncHost 搬进面板。
                const isActivityBar = String(tabList.className).includes('gui_vscode');
                findBar.createDom(isActivityBar ? document.createElement('div') : tabList);
                findBar.tabChanged();
            };

            const removeGesturePatch = installGesturePatch();

            const observer = new MutationObserver(() => {
                if (didUnmount) return;
                // 查找栏被搬进 VS Code 布局的搜索面板时，它不在标签栏内，此时不要重复注入
                if (document.querySelector('[data-mw-find-bar-host] .mw-native-find-bar')) return;
                if (!document.querySelector(TAB_LIST_FIND_BAR_SELECTOR)) {
                    ensureInjected();
                }
            });
            observer.observe(document.documentElement, {childList: true, subtree: true});

            await ensureInjected();

            state.cleanup = () => {
                observer.disconnect();
                removeGesturePatch();
                findBar.destroy();
            };
        };

        run();

        return () => {
            didUnmount = true;
            abortController.abort();
            if (state.cleanup) {
                state.cleanup();
                state.cleanup = null;
            }
        };
    }, [vm, state]);

    useEffect(() => {
        const el = document.querySelector('.mw-native-find-bar');
        if (!el) return;
        // 被搬进 VS Code 布局的搜索面板时，可见性由面板控制，不随标签页显隐
        const parent = el.parentNode;
        if (parent && parent.hasAttribute && parent.hasAttribute('data-mw-find-bar-host')) return;
        const visible = activeTabIndex === 0 ||
                        activeTabIndex === 1 ||
                        activeTabIndex === 2;
        el.hidden = !visible;
    }, [activeTabIndex]);
    return null;
}

NativeFindBar.propTypes = {
    vm: PropTypes.shape({
        runtime: PropTypes.shape({
            targets: PropTypes.array,
            getBlocksJSON: PropTypes.func,
            getTargetById: PropTypes.func
        }).isRequired,
        setEditingTarget: PropTypes.func.isRequired
    }).isRequired,
    locale: PropTypes.string,
    activeTabIndex: PropTypes.number.isRequired,
    isPlayerOnly: PropTypes.bool
};

NativeFindBar.defaultProps = {
    locale: null,
    isPlayerOnly: false
};

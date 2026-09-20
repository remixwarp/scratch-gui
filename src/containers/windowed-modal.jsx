import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import {connect, Provider} from 'react-redux';
import {FormattedMessage, IntlProvider} from 'react-intl';

import WindowManager from '../addons/window-system/window-manager';
import Box from '../components/box/box.jsx';
import './windowed-modal.css';

// 移动端 UA 检测：匹配常见手机/平板浏览器标识
const isMobileUA = () => typeof navigator !== 'undefined' &&
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Silk/i.test(navigator.userAgent);

class WindowedModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'addEventListeners',
            'removeEventListeners',
            'handlePopState',
            'pushHistory',
            'handleWindowClose',
            'handleWindowMinimize',
            'handleWindowMove',
            'handleWindowResize',
            'scheduleBlocklyWidgetReposition'
        ]);
        this.window = null;
        this.contentContainer = null;
        this.createdWindow = false;
        this.windowId = this.props.id || 'modal-window';
        this.blocklyWidgetRepositionRaf_ = null;
        // 仍然保留 UA 检测，但不再用来切换内联全屏分支 —
        // 所有设备统一走 WindowManager.AddonWindow（有 header + 关闭/
        // 最大化按钮）。移动端在 createWindow() 里自动 maximize 到
        // 100vw×100vh，minimizable 关掉（iOS 没有合理的"最小化"语义）。
        this.isMobile = isMobileUA();
        this.addEventListeners();
    }
    
    componentDidMount () {
        if (this.props.visible === false) {
            return;
        }
        // 所有设备统一走 WindowManager.AddonWindow —— 不再有 mobile 的
        // 内联全屏短路。mobile 端 auto-maximize 放在 createWindow 里做。
        this.createWindow();
        // Add a history event only if it's not currently for our modal. This
        // avoids polluting the history with many entries. We only need one.
        this.pushHistory(this.id, (history.state === null || history.state !== this.id));

        if (this.window) {
            this.window.show();
        }

        this.resizeToContentIfNeeded();
    }
    
    componentDidUpdate (prevProps) {
        // 所有设备统一走 WindowManager.AddonWindow。移除 mobile 的
        // 内联全屏短路，让下面 show/hide 逻辑对所有 UA 生效。
        // Handle visibility changes
        if (this.props.visible !== prevProps.visible) {
            if (this.props.visible && !this.window) {
                // Modal should be visible but window doesn't exist - create it
                this.createWindow();
                this.pushHistory(this.id, (history.state === null || history.state !== this.id));
            } else if (!this.props.visible && this.window) {
                // Modal should be hidden but window exists - hide it
                if (!this.window.isDestroying) {
                    this.window.hide();
                }
                return;
            }
        }
        
        // Show/hide window based on visibility
        if (this.window) {
            if (this.props.visible === false) {
                // If the window is already being destroyed (its close button
                // was clicked), the closing animation is in progress and the
                // element will be removed by the window system — don't hide it
                // again here or we'd cancel that removal.
                if (!this.window.isDestroying) {
                    this.window.hide();
                }
            } else {
                this.window.show();
            }
        }
        
        // Update content if window exists
        if (this.window && this.contentContainer) {
            // React will handle rendering through the portal
        }

        this.resizeToContentIfNeeded();
    }

    componentWillUnmount () {
        this.removeEventListeners();
        // 所有设备统一走 WindowManager.AddonWindow，mobile 也要清理
        if (this.blocklyWidgetRepositionRaf_) {
            window.cancelAnimationFrame(this.blocklyWidgetRepositionRaf_);
            this.blocklyWidgetRepositionRaf_ = null;
        }
        if (this.window && this.createdWindow) {
            if (!this.window.isDestroying) {
                this.window.hide();
            }
        }
    }

    scheduleBlocklyWidgetReposition () {
        if (this.blocklyWidgetRepositionRaf_) return;

        this.blocklyWidgetRepositionRaf_ = window.requestAnimationFrame(() => {
            this.blocklyWidgetRepositionRaf_ = null;
            const ScratchBlocks = window.ScratchBlocks;
            if (!ScratchBlocks || !ScratchBlocks.WidgetDiv) return;
            if (typeof ScratchBlocks.WidgetDiv.isVisible === 'function' && !ScratchBlocks.WidgetDiv.isVisible()) return;

            try {
                // FieldTextInput positions itself with extra alignment logic in resizeEditor_.
                // Calling it keeps the editor's left/top correct when the modal window moves.
                const owner = ScratchBlocks.WidgetDiv.owner_;
                if (owner && typeof owner.resizeEditor_ === 'function') {
                    owner.resizeEditor_();
                } else if (typeof ScratchBlocks.WidgetDiv.repositionForWindowResize === 'function') {
                    ScratchBlocks.WidgetDiv.repositionForWindowResize();
                }
            } catch (e) {
                // Never allow a reposition failure to break window dragging.
            }
        });
    }

    handleWindowMove () {
        this.scheduleBlocklyWidgetReposition();
    }

    handleWindowResize () {
        this.scheduleBlocklyWidgetReposition();
    }

    resizeToContentIfNeeded () {
        if (!this.window || !this.contentContainer) return;
        if (this.props.id !== 'mwProjectThemeModal') return;

        window.requestAnimationFrame(() => {
            if (!this.window || !this.contentContainer) return;

            const headerHeight = this.window.headerElement ? this.window.headerElement.offsetHeight : 0;
            const contentHeight = this.contentContainer.scrollHeight;
            const desiredHeight = Math.max(0, headerHeight + contentHeight);

            if (!desiredHeight || !Number.isFinite(desiredHeight)) return;

            this.window.height = desiredHeight;
            this.window.element.style.height = `${desiredHeight}px`;

            this.window.minHeight = desiredHeight;
            this.window.maxHeight = desiredHeight;
        });
    }
    
    createWindow () {
        // Prevent creating duplicate windows
        if (this.window) {
            return;
        }

        const windowId = this.props.id || 'modal-window';
        this.windowId = windowId;

        // If a previous window with the same id is still registered, destroy it
        // before creating a new one. Reusing a stale window leaves the modal empty
        // because its React portal was torn down when the component unmounted.
        const existingWindow = WindowManager.getWindow(windowId);
        if (existingWindow) {
            try {
                // 清空旧窗口的 onClose，避免关闭残留窗口时触发 onRequestClose，
                // 从而误把刚刚打开的新窗口状态（visible）关掉导致“弹出后立即关闭”。
                existingWindow.onClose = () => {};
                existingWindow.close();
            } catch (e) {
                // Ignore errors from closing an already-closing window
            }
        }

        const {
            id,
            contentLabel,
            className = '',
            fullScreen = false
        } = this.props;

        // Determine window size based on content type
        let width = this.props.width || 600;
        let height = this.props.height || 500;
        let minWidth = this.props.minWidth || 400;
        let minHeight = this.props.minHeight || 300;
        const resizable = this.props.resizable !== false;
        const maximizable = this.props.maximizable !== false;
        const maxWidth = this.props.maxWidth || null;
        const maxHeight = this.props.maxHeight || null;

        // 所有设备统一视口约束 + 居中定位，保证 modal 不超出屏幕、
        // 且不是随机飘在左上角。移动端尤其需要：props.width 通常是
        // 600-900px，而手机视口可能只有 375px。
        const padding = 24;
        const maxW = window.innerWidth - padding;
        const maxH = window.innerHeight - padding;
        if (fullScreen) {
            width = Math.min(1200, maxW);
            height = Math.min(800, maxH);
        } else {
            width = Math.min(width, maxW);
            height = Math.min(height, maxH);
        }
        // 视口过小时也允许 minWidth/minHeight 收缩，避免硬性 400px 下限
        // 把移动端 modal 撑出屏幕。
        minWidth = Math.min(minWidth, width);
        minHeight = Math.min(minHeight, height);

        const x = Math.max(0, Math.round((window.innerWidth - width) / 2));
        const y = Math.max(0, Math.round((window.innerHeight - height) / 2));
        // 移动端保留 Header + 关闭/最大化按钮，但没有"最小化"语义，
        // 并且创建后立即 maximize 到 100vw×100vh，等价于以前的内联
        // 全屏效果，只是共享同一套 AddonWindow 外壳。
        const minimizable = !this.isMobile && this.props.minimizable !== false;

        this.window = WindowManager.createWindow({
            id: windowId,
            title: typeof contentLabel === 'string' ? contentLabel : 'Dialog',
            width,
            height,
            x,
            y,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            resizable,
            minimizable,
            maximizable,
            closable: true,
            className: `modal-window ${className}`,
            modal: true,
            alwaysOnTop: id === 'unknownPlatformModal',
            destroyOnMinimize: true,
            onClose: this.handleWindowClose,
            onMinimize: this.handleWindowMinimize,
            onMove: this.handleWindowMove,
            onResize: this.handleWindowResize
        });
        this.createdWindow = true;

        // 移动端自动展开到全屏（100vw×100vh），保留 PC 版的
        // Header + 按钮体系，用户随时能点"还原"回到浮动尺寸。
        if (this.isMobile) {
            this.window.maximize();
        }
        
        // Create content container with modal styling
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'modal-window-content windowed-modal-content';
        this.contentContainer.style.cssText = `
            height: 100%;
            max-height: 100%;
            display: flex;
            flex-direction: column;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            background: var(--ui-modal-background, #fff);
            color: var(--ui-modal-foreground, #000);
            overflow: hidden;
            min-height: 0;
        `;

        if (id === 'mwProjectThemeModal') {
            this.contentContainer.style.height = 'auto';
            this.contentContainer.style.maxHeight = 'none';
            this.contentContainer.style.overflow = 'visible';
        }
        
        this.window.setContent(this.contentContainer);
        this.forceUpdate(); // Force re-render now that container is available
        // Don't auto-show here, let componentDidUpdate handle visibility
    }
    
    renderContent () {
        if (!this.contentContainer) return null;
        
        const {
            children,
            headerImage,
            contentLabel,
            onHelp,
            isRtl,
            showHeader = false,
            locale,
            messages
        } = this.props;
        
        const modalContent = React.createElement(
            Box,
            {
                dir: isRtl ? 'rtl' : 'ltr',
                direction: 'column',
                grow: 1,
                style: {
                    height: '100%',
                    overflow: 'hidden'
                }
            },
            // Header (only if showHeader is true)
            showHeader && React.createElement(
                'div',
                {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1rem',
                        borderBottom: '1px solid var(--ui-tertiary, #ccc)',
                        background: 'var(--ui-secondary, #f8f8f8)',
                        flexShrink: 0
                    }
                },
                // Help button
                onHelp && React.createElement(
                    'button',
                    {
                        onClick: onHelp,
                        style: {
                            marginRight: '1rem',
                            padding: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                        }
                    },
                    React.createElement(FormattedMessage, {
                        defaultMessage: 'Help',
                        description: 'Help button in modal',
                        id: 'gui.modal.help'
                    })
                ),
                // Header image
                headerImage && React.createElement('img', {
                    src: headerImage,
                    style: {marginRight: '1rem', maxHeight: '24px'},
                    draggable: false
                }),
                // Title
                React.createElement(
                    'div',
                    {
                        style: {
                            flex: 1,
                            fontSize: '1.1rem',
                            fontWeight: 'bold'
                        }
                    },
                    typeof contentLabel === 'string' ? contentLabel : contentLabel
                )
            ),
            // Content
            React.createElement(
                'div',
                {
                    style: {
                        flex: 1,
                        overflow: 'hidden',
                        minHeight: 0,
                        height: '100%',
                        maxHeight: '100%',
                        padding: '0',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                },
                children
            )
        );
        
        // Wrap the content with both Redux Provider and IntlProvider to provide full context
        const wrappedContent = React.createElement(
            Provider,
            {
                store: this.props.store
            },
            React.createElement(
                IntlProvider,
                {
                    locale: locale || 'en',
                    messages: messages || {}
                },
                modalContent
            )
        );
        
        // Use React portal to render content into the window container
        return ReactDOM.createPortal(wrappedContent, this.contentContainer);
    }
    
    handleWindowClose = () => {
        // Notify the parent first so Redux state can be updated while the
        // window reference is still available for cleanup in componentWillUnmount.
        if (this.props.onRequestClose) {
            this.props.onRequestClose();
        }

        this.contentContainer = null;
        this.createdWindow = false;
        this.window = null;
    };

    handleWindowMinimize = () => {
        this.contentContainer = null;
        this.createdWindow = false;
        this.window = null;
    };
    
    addEventListeners () {
        window.addEventListener('popstate', this.handlePopState);
    }
    
    removeEventListeners () {
        window.removeEventListener('popstate', this.handlePopState);
    }
    
    handlePopState () {
        // Whenever someone navigates, we want to be closed
        this.props.onRequestClose();
    }
    
    get id () {
        return `modal-${this.props.id}`;
    }
    
    pushHistory (state, push) {
        if (push) return history.pushState(state, this.id, null);
        history.replaceState(state, this.id, null);
    }
    
    renderInlineMobile () {
        const {
            children,
            onRequestClose,
            locale,
            messages,
            store
        } = this.props;

        const content = React.createElement(
            'div',
            {
                className: 'windowed-modal-mobile-overlay',
                onClick: e => {
                    // 点击背景（非内容区域）关闭模态
                    if (e.target === e.currentTarget && onRequestClose) {
                        onRequestClose();
                    }
                }
            },
            React.createElement(
                'div',
                {
                    className: 'windowed-modal-mobile-container'
                },
                children
            )
        );

        return React.createElement(
            Provider,
            {store},
            React.createElement(
                IntlProvider,
                {
                    locale: locale || 'en',
                    messages: messages || {}
                },
                content
            )
        );
    }

    render () {
        // 所有设备统一通过 WindowManager.AddonWindow portal 渲染。
        // 内联全屏分支（renderInlineMobile）已废弃 — mobile 端走
        // 同一套窗口，只是在 createWindow() 里 auto-maximize。
        if (this.contentContainer) {
            return this.renderContent();
        }
        return null;
    }
}

WindowedModal.propTypes = {
    id: PropTypes.string.isRequired,
    isRtl: PropTypes.bool,
    onRequestClose: PropTypes.func,
    children: PropTypes.node,
    className: PropTypes.string,
    contentLabel: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object
    ]).isRequired,
    fullScreen: PropTypes.bool,
    headerImage: PropTypes.string,
    onHelp: PropTypes.func,
    showHeader: PropTypes.bool,
    visible: PropTypes.bool,
    locale: PropTypes.string,
    messages: PropTypes.object,
    store: PropTypes.object.isRequired,
    width: PropTypes.number,
    height: PropTypes.number,
    resizable: PropTypes.bool,
    maximizable: PropTypes.bool,
    minWidth: PropTypes.number,
    minHeight: PropTypes.number,
    maxWidth: PropTypes.number,
    maxHeight: PropTypes.number
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl,
    locale: state.locales.locale,
    messages: state.locales.messages
});

const ConnectedWindowedModal = connect(
    mapStateToProps
)(WindowedModal);

// Wrapper component to access store from context
const WindowedModalWithStore = (props, context) => (
    <ConnectedWindowedModal
        {...props}
        store={context.store}
    />
);

WindowedModalWithStore.contextTypes = {
    store: PropTypes.object
};

export default WindowedModalWithStore;

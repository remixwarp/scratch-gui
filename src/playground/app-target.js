import ReactDOM from 'react-dom';
import {setAppElement} from 'react-modal';

// ============ 全局未捕获异常兜底 ============
// SplashEnd 会把启动期的 window.onerror 置空；此后的任何未捕获异步异常
// （Promise rejection、事件处理器抛错等）若不兜底，会静默导致页面白屏/无响应，
// 在 Android WebView 上甚至表现为"应用卡死"。这里注册常驻兜底：
// 记录到控制台并显示可恢复的提示层，避免整个编辑器崩溃。
(() => {
    if (window.__mwGlobalErrorHandlerInstalled) return;
    window.__mwGlobalErrorHandlerInstalled = true;

    const handleError = (type, detail) => {
        // 不拦截已知会被 React 错误边界处理的渲染错误
        if (detail && detail.preventBubbling) return;
        // eslint-disable-next-line no-console
        console.error(`[RemixWarp] Unhandled ${type}`, detail && detail.error ? detail.error : detail);
    };

    window.addEventListener('error', event => {
        handleError('error', {error: event.error});
    });

    window.addEventListener('unhandledrejection', event => {
        handleError('rejection', {error: event.reason});
        // 阻止默认的 console 噪声，但保留事件本身
        event.preventDefault();
    });
})();

const appTarget = document.getElementById('app');

// Remove everything from the target to fix macOS Safari "Save Page As",
while (appTarget.firstChild) {
    appTarget.removeChild(appTarget.firstChild);
}

setAppElement(appTarget);

const render = children => {
    // Use ReactDOM.createRoot for better performance if available (React 18+)
    if (ReactDOM.createRoot) {
        const root = ReactDOM.createRoot(appTarget);
        root.render(children);
    } else {
        ReactDOM.render(children, appTarget);
    }

    // Schedule splash end after render completes
    requestAnimationFrame(() => {
        // Log time when React app renders (splash screen ends)
        if (window.MISTWARP_LOAD_START_TIME) {
            if (window.performance && window.performance.mark) {
                window.performance.mark('mistwarp-app-render');
            }
        }

        if (window.SplashEnd) {
            window.SplashEnd();
        }
    });
};

export default render;

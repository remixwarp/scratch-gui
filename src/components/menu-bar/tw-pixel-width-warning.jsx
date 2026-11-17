import WindowManager from '../../addons/window-system/window-manager';
import {openSettingsModal} from '../../reducers/modals';
import {
    shouldWarnPixelTheme,
    setPixelPreviewSettings
} from '../../lib/themes/pixel-preview-settings.js';
import {openWidthCalibrationWindow} from './tw-pixel-width-calibration.jsx';

/**
 * 打开「手动配置宽度」校准窗口，最终值写入设备预览设置并标记为已配置。
 * 设置页、警告框、以及编辑器里的入口都复用这一个回调。
 */
export const openPixelWidthCalibrationForSettings = intl => openWidthCalibrationWindow({
    intl,
    onApplyWidth: width => setPixelPreviewSettings({width, configured: true})
});

/**
 * 从主题里读取「主题色的主要颜色」，用于宽度警告框确认按钮的背景色。
 * 兼容 CustomTheme 实例（customAccent）与导出的普通主题对象（accent）：
 * 像素主题的 customAccent 不单独保留 primaryColor 字段，主色落在
 * guiColors['motion-primary'] / blockColors.checkboxActiveBackground 上。
 */
const getThemePrimaryColor = theme => {
    if (!theme || typeof theme !== 'object') return null;
    for (const accent of [theme.customAccent, theme.accent]) {
        if (!accent || typeof accent !== 'object') continue;
        const color = accent.primaryColor ||
            (accent.guiColors && accent.guiColors['motion-primary']) ||
            (accent.blockColors && accent.blockColors.checkboxActiveBackground);
        if (typeof color === 'string' && color) return color;
    }
    return null;
};

/**
 * 打开设置窗口，并自动切换到「主题 → 像素主题」页。
 * 不再直接弹出「手动配置宽度」校准窗口；宽度仍可在该页里手动配置。
 * 用 app-state-hoc 暴露的 window.ReduxStore 派发，与仓库其它命令式窗口一致。
 */
export const openPixelThemeSettings = () => {
    // 一次性标记：设置窗口 constructor 会读取并清除；
    // 若窗口已经打开（constructor 不会重跑），则靠下面的事件切换 tab。
    window.__twSettingsInitialView = 'pixelTheme';
    try {
        window.dispatchEvent(new CustomEvent('tw:settings-view', {detail: 'pixelTheme'}));
    } catch (e) {
        // ignore
    }
    const store = window.ReduxStore;
    if (!store || typeof store.dispatch !== 'function') return;
    store.dispatch(openSettingsModal());
    // 设置窗口是 React.lazy 加载的，可能稍后才挂载；补发一次事件，
    // 保证窗口挂载完成后也能切到「主题 → 像素主题」页。
    setTimeout(() => {
        try {
            window.dispatchEvent(new CustomEvent('tw:settings-view', {detail: 'pixelTheme'}));
        } catch (e) {
            // ignore
        }
    }, 120);
};

let warningWindow = null;

/**
 * 弹出「请手动配置宽度」警告框。
 * 复用还原点「网络还原点」上方警告框的浅红底 / 红字 / 左边框样式。
 */
export const showPixelWidthWarning = ({intl, onConfigure, primaryColor}) => {
    if (warningWindow) {
        try {
            warningWindow.show().bringToFront();
        } catch (e) {
            // ignore
        }
        return;
    }

    // 全部 id 使用完整字面量，确保 react-intl 静态提取与运行期查找可靠
    const messages = {
        title: intl.formatMessage({
            defaultMessage: '主题已经应用',
            description: 'Title of the notice shown after a flexible pixel theme is applied',
            id: 'tw.pixelWidthWarning.title'
        }),
        message: intl.formatMessage({
            defaultMessage: '主题已经应用，如果遇到效果不佳等情况，请点击下方去配置按钮进行配置。',
            description: 'Notice shown when a flexible pixel theme is applied with the reference width as default',
            id: 'tw.pixelWidthWarning.message'
        }),
        configure: intl.formatMessage({
            defaultMessage: '去配置',
            description: 'Button that opens the pixel theme settings page',
            id: 'tw.pixelWidthWarning.configure'
        })
    };
    const win = WindowManager.createWindow({
        id: 'tw-pixel-width-warning-window',
        title: messages.title,
        width: 480,
        height: 250,
        minWidth: 380,
        minHeight: 210,
        resizable: false,
        maximizable: false,
        minimizable: false,
        modal: true,
        alwaysOnTop: true,
        // 去掉「稍后再说」后仍保留关闭按钮 / Esc，用户可随时关掉这个提示。
        closable: true,
        className: 'tw-pixel-width-warning-window',
        onClose: () => {
            warningWindow = null;
        }
    });
    warningWindow = win;

    const content = document.createElement('div');
    content.style.cssText = 'padding:18px;display:flex;flex-direction:column;gap:14px;' +
        'box-sizing:border-box;height:100%;font-family:inherit;color:var(--ui-modal-foreground, #333);';

    const warningBox = document.createElement('div');
    warningBox.style.cssText = 'background:rgba(255,107,107,0.15);color:#ff6b6b;' +
        'padding:12px 16px;border-radius:6px;border-left:4px solid #ff6b6b;' +
        'font-size:13px;line-height:1.6;white-space:pre-wrap;';
    warningBox.innerText = messages.message;
    content.appendChild(warningBox);

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:auto;';

    const configureBtn = document.createElement('button');
    configureBtn.type = 'button';
    configureBtn.innerText = messages.configure;
    configureBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:none;' +
        'background:var(--motion-primary, var(--ui-primary, #4C97FF));color:white;cursor:pointer;font-weight:600;font-family:inherit;';
    // 确认按钮背景直接取主题色的主要颜色；取不到时保留上面的默认主色兜底。
    // 用 style.background 赋值（而非拼进 cssText），避免主题色字符串破坏整条样式。
    if (primaryColor) configureBtn.style.background = primaryColor;
    configureBtn.addEventListener('click', () => {
        win.close();
        if (typeof onConfigure === 'function') onConfigure();
    });

    controls.appendChild(configureBtn);
    content.appendChild(controls);

    win.setContent(content);
    win.center().show();
};

/**
 * 应用 / 导入 / 预览像素主题时调用：仅在「灵活编码 + 宽度从未手动配置」时弹一次警告。
 * @returns {boolean} 是否弹出了警告
 */
export const maybeWarnPixelTheme = (theme, intl) => {
    if (!intl || !shouldWarnPixelTheme(theme)) return false;
    showPixelWidthWarning({
        intl,
        primaryColor: getThemePrimaryColor(theme),
        onConfigure: openPixelThemeSettings
    });
    return true;
};

export default maybeWarnPixelTheme;

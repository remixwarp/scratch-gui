import WindowManager from '../../addons/window-system/window-manager';
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

let warningWindow = null;

/**
 * 弹出「请手动配置宽度」警告框。
 * 复用还原点「网络还原点」上方警告框的浅红底 / 红字 / 左边框样式。
 */
export const showPixelWidthWarning = ({intl, onConfigure}) => {
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
            defaultMessage: '需要配置预览宽度',
            description: 'Title of the pixel preview width warning window',
            id: 'tw.pixelWidthWarning.title'
        }),
        message: intl.formatMessage({
            defaultMessage: '检测到已应用灵活编码的像素主题，但预览宽度仍是默认值。请手动配置宽度，否则图案可能无法正确显示。',
            description: 'Warning text shown when a flexible pixel theme is applied with default width',
            id: 'tw.pixelWidthWarning.message'
        }),
        configure: intl.formatMessage({
            defaultMessage: '去手动配置宽度',
            description: 'Button that opens the manual width calibration window',
            id: 'tw.pixelWidthWarning.configure'
        }),
        later: intl.formatMessage({
            defaultMessage: '稍后再说',
            description: 'Button to dismiss the pixel preview width warning',
            id: 'tw.pixelWidthWarning.later'
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

    const laterBtn = document.createElement('button');
    laterBtn.type = 'button';
    laterBtn.innerText = messages.later;
    laterBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:1px solid #ccc;' +
        'background:transparent;color:inherit;cursor:pointer;font-family:inherit;';
    laterBtn.addEventListener('click', () => win.close());

    const configureBtn = document.createElement('button');
    configureBtn.type = 'button';
    configureBtn.innerText = messages.configure;
    configureBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:none;' +
        'background:var(--ui-primary, #4C97FF);color:white;cursor:pointer;font-weight:600;font-family:inherit;';
    configureBtn.addEventListener('click', () => {
        win.close();
        if (typeof onConfigure === 'function') onConfigure();
    });

    controls.appendChild(laterBtn);
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
        onConfigure: () => openPixelWidthCalibrationForSettings(intl)
    });
    return true;
};

export default maybeWarnPixelTheme;

import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import {FormattedMessage, IntlProvider, injectIntl, intlShape} from 'react-intl';
import WindowManager from '../../addons/window-system/window-manager';
import {
    computeScreenWidthReference,
    buildCalibrationPixelData,
    CALIBRATION
} from '../../lib/themes/pixel-width-calibration.js';
import styles from './settings-menu.css';

/* 所有 message id 均为完整字面量，确保 l10n 提取与运行期查找可靠 */
const STEP_IDS = [
    'tw.customThemes.pixelCreator.widthCalib.step1',
    'tw.customThemes.pixelCreator.widthCalib.step2',
    'tw.customThemes.pixelCreator.widthCalib.step3'
];
const STEP_DEFAULTS = ['1. 大致中心', '2. 微调设置', '3. 完成配置校准'];

const STEP_SIZE_MESSAGES = {
    1: {defaultMessage: '1 位', description: 'Step size option: 1 column', id: 'tw.customThemes.pixelCreator.widthCalib.stepSize1'},
    3: {defaultMessage: '3 位', description: 'Step size option: 3 columns', id: 'tw.customThemes.pixelCreator.widthCalib.stepSize3'},
    5: {defaultMessage: '5 位', description: 'Step size option: 5 columns', id: 'tw.customThemes.pixelCreator.widthCalib.stepSize5'},
    10: {defaultMessage: '10 位', description: 'Step size option: 10 columns', id: 'tw.customThemes.pixelCreator.widthCalib.stepSize10'}
};

const COPY_MESSAGES = {
    copy: {defaultMessage: '复制', description: 'Copy the reference value button', id: 'tw.customThemes.pixelCreator.widthCalib.copy'},
    copied: {defaultMessage: '已复制', description: 'Copied confirmation', id: 'tw.customThemes.pixelCreator.widthCalib.copied'}
};

const ARROW_MESSAGES = {
    left: {defaultMessage: '向左箭头', description: 'Left arrow aria label', id: 'tw.customThemes.pixelCreator.widthCalib.arrowLeft'},
    right: {defaultMessage: '向右箭头', description: 'Right arrow aria label', id: 'tw.customThemes.pixelCreator.widthCalib.arrowRight'}
};

/** 三步进度条 */
const StepProgress = ({step}) => (
    <div style={{display: 'flex', gap: '8px', marginTop: '20px', borderTop: '1px solid #e0e0e0', paddingTop: '12px'}}>
        {[1, 2, 3].map(i => (
            <div
                key={i}
                style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '12px',
                    padding: '6px 4px',
                    borderRadius: '4px',
                    background: step === i ? '#4c97ff' : (step > i ? '#d6e6ff' : '#f0f0f0'),
                    color: step === i ? '#fff' : '#555',
                    fontWeight: step === i ? 'bold' : 'normal'
                }}
            >
                <FormattedMessage
                    defaultMessage={STEP_DEFAULTS[i - 1]}
                    id={STEP_IDS[i - 1]}
                />
            </div>
        ))}
    </div>
);

StepProgress.propTypes = {step: PropTypes.number.isRequired};

/**
 * 「手动配置宽度」自由窗口的内容：
 *   首页：不稳定参考值 + 复制 + 进行配置
 *   步骤1 大致中心：×2 / ×0.75 粗调总列数
 *   步骤2 微调设置：±1/3/5/10 列像素级微调
 *   步骤3 完成配置校准：显示最佳宽度并回填到网格设置
 */
const WidthCalibrationApp = injectIntl(props => {
    const {intl, onApplyWidth, onPreviewCalibration, onRestoreTheme, onClose} = props;

    const [step, setStep] = React.useState(0);
    const [width, setWidth] = React.useState(CALIBRATION.initialWidth);
    const [stepSize, setStepSize] = React.useState(1);
    const [copied, setCopied] = React.useState(false);
    const reference = React.useMemo(() => computeScreenWidthReference(), []);

    const previewRef = React.useRef(onPreviewCalibration);
    previewRef.current = onPreviewCalibration;
    const copyTimerRef = React.useRef(null);

    // 步骤 1/2：把校准标尺应用到主题；宽度变化时重新应用，
    // 深色块与白色竖线会随新宽度自动居中（等价于「同时移动到中心」）。
    React.useEffect(() => {
        if ((step === 1 || step === 2) && typeof previewRef.current === 'function') {
            previewRef.current(buildCalibrationPixelData(width));
        }
    }, [step, width]);

    React.useEffect(() => () => {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        if (typeof onRestoreTheme === 'function') onRestoreTheme();
    }, []);

    const handleCopy = async () => {
        const text = String(reference.value);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            setCopied(false);
        }
    };

    const confirm = () => {
        if (step === 0) {
            setStep(1);
        } else if (step === 1) {
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        } else if (step === 3) {
            if (typeof onApplyWidth === 'function') onApplyWidth(width);
            if (typeof onClose === 'function') onClose();
        }
    };

    const arrowButton = (direction, onClick, disabled) => (
        <button
            type="button"
            className={styles.paletteBtn}
            onClick={onClick}
            disabled={disabled}
            aria-label={intl.formatMessage(ARROW_MESSAGES[direction])}
            title={intl.formatMessage(ARROW_MESSAGES[direction])}
            style={{fontSize: '20px', minWidth: '64px', padding: '8px 16px'}}
        >
            {direction === 'left' ? '←' : '→'}
        </button>
    );

    const containerStyle = {
        padding: '16px',
        fontFamily: 'inherit',
        color: '#333',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'
    };

    return (
        <div style={containerStyle}>
            <div style={{flex: 1}}>
                {/* ---------- 首页：不稳定参考值 ---------- */}
                {step === 0 && (
                    <div>
                        <h3 style={{margin: '0 0 8px', fontSize: '15px'}}>
                            <FormattedMessage
                                defaultMessage="不稳定参考值"
                                description="Label of the unstable screen-ratio based width reference"
                                id="tw.customThemes.pixelCreator.widthCalib.referenceLabel"
                            />
                        </h3>
                        <p style={{fontSize: '12px', color: '#777', margin: '0 0 12px'}}>
                            <FormattedMessage
                                defaultMessage="根据当前屏幕宽高比例换算，仅供参考"
                                description="Hint for the unstable reference value"
                                id="tw.customThemes.pixelCreator.widthCalib.referenceHint"
                            />
                        </p>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                            <input
                                type="text"
                                readOnly
                                value={String(reference.value)}
                                className={styles.gradientInput}
                                style={{fontSize: '18px', fontWeight: 'bold', width: '120px', textAlign: 'center'}}
                                aria-label={intl.formatMessage({
                                    defaultMessage: '不稳定参考值',
                                    id: 'tw.customThemes.pixelCreator.widthCalib.referenceLabel'
                                })}
                            />
                            <button
                                type="button"
                                className={styles.paletteBtn}
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <FormattedMessage {...COPY_MESSAGES.copied} />
                                ) : (
                                    <FormattedMessage {...COPY_MESSAGES.copy} />
                                )}
                            </button>
                        </div>
                        <p style={{fontSize: '12px', color: '#777', margin: '0 0 4px'}}>
                            <FormattedMessage
                                defaultMessage="屏幕 {width}×{height}，归一化比例 {ratio}"
                                description="Screen size and normalized ratio used for the reference"
                                id="tw.customThemes.pixelCreator.widthCalib.ratioInfo"
                                values={{width: reference.screenWidth, height: reference.screenHeight, ratio: reference.ratioText}}
                            />
                        </p>
                        <p style={{fontSize: '11px', color: '#999', margin: '0'}}>
                            <FormattedMessage
                                defaultMessage="公式：F(m,n)=490+410×[(m−n)−11]/(6−11)，手机 20:9 得 490，电脑 16:10 得 900"
                                description="Formula note for the reference value"
                                id="tw.customThemes.pixelCreator.widthCalib.formulaNote"
                            />
                        </p>
                    </div>
                )}

                {/* ---------- 步骤 1：大致中心 ---------- */}
                {step === 1 && (
                    <div>
                        <p style={{fontSize: '13px', lineHeight: '1.7', margin: '0 0 16px'}}>
                            <FormattedMessage
                                defaultMessage="请观察深色块的中心白色竖线，如果其偏左或者出现了多个深色块，请点击右侧箭头，如果偏右，请点击左侧箭头。"
                                description="Instruction of step 1: coarse center calibration"
                                id="tw.customThemes.pixelCreator.widthCalib.step1Hint"
                            />
                        </p>
                        <div style={{display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px'}}>
                            {arrowButton('left',
                                () => setWidth(w => Math.max(2, Math.round(w * 0.75))))}
                            {arrowButton('right',
                                () => setWidth(w => w * 2))}
                        </div>
                        <p style={{fontSize: '12px', color: '#777', textAlign: 'center', margin: '0 0 12px'}}>
                            <FormattedMessage
                                defaultMessage="当前全部列数：{width}"
                                description="Current total column count"
                                id="tw.customThemes.pixelCreator.widthCalib.currentWidth"
                                values={{width}}
                            />
                        </p>
                        <p style={{fontSize: '12px', color: '#4c97ff', textAlign: 'center', margin: 0}}>
                            <FormattedMessage
                                defaultMessage="当前白色竖线已在大概中心时，请点击下方确定按钮。"
                                description="Tip shown under the arrows in step 1"
                                id="tw.customThemes.pixelCreator.widthCalib.step1Tip"
                            />
                        </p>
                    </div>
                )}

                {/* ---------- 步骤 2：微调设置 ---------- */}
                {step === 2 && (
                    <div>
                        <p style={{fontSize: '13px', lineHeight: '1.7', margin: '0 0 12px'}}>
                            <FormattedMessage
                                defaultMessage="选择单击一次移动的位数，再用箭头以像素级位移微调深色块与白色竖线。"
                                description="Instruction of step 2: pixel-level fine tuning"
                                id="tw.customThemes.pixelCreator.widthCalib.step2Hint"
                            />
                        </p>
                        <div className={styles.formField} style={{marginBottom: '16px'}}>
                            <label>
                                <FormattedMessage
                                    defaultMessage="每次移动"
                                    description="Label of the step size dropdown"
                                    id="tw.customThemes.pixelCreator.widthCalib.stepSizeLabel"
                                />
                            </label>
                            <select
                                value={stepSize}
                                onChange={e => setStepSize(Number(e.target.value))}
                                className={styles.gradientInput}
                                aria-label={intl.formatMessage({
                                    defaultMessage: '每次移动',
                                    id: 'tw.customThemes.pixelCreator.widthCalib.stepSizeLabel'
                                })}
                            >
                                {[1, 3, 5, 10].map(n => (
                                    <option key={n} value={n}>
                                        {intl.formatMessage(STEP_SIZE_MESSAGES[n])}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px'}}>
                            {arrowButton('left',
                                () => setWidth(w => Math.max(2, w - stepSize)), width <= 2)}
                            {arrowButton('right',
                                () => setWidth(w => w + stepSize))}
                        </div>
                        <p style={{fontSize: '12px', color: '#777', textAlign: 'center', margin: 0}}>
                            <FormattedMessage
                                defaultMessage="当前全部列数：{width}"
                                id="tw.customThemes.pixelCreator.widthCalib.currentWidth"
                                values={{width}}
                            />
                        </p>
                    </div>
                )}

                {/* ---------- 步骤 3：完成配置校准 ---------- */}
                {step === 3 && (
                    <div style={{textAlign: 'center'}}>
                        <p style={{fontSize: '13px', lineHeight: '1.7', margin: '0 0 16px'}}>
                            <FormattedMessage
                                defaultMessage="以下数值为您的设备在当前状态下的最佳宽度"
                                description="Result hint of step 3"
                                id="tw.customThemes.pixelCreator.widthCalib.resultHint"
                            />
                        </p>
                        <div style={{fontSize: '36px', fontWeight: 'bold', color: '#4c97ff', marginBottom: '8px'}}>
                            {width}
                        </div>
                        <p style={{fontSize: '12px', color: '#777', margin: 0}}>
                            <FormattedMessage
                                defaultMessage="当前全部列数：{width}"
                                id="tw.customThemes.pixelCreator.widthCalib.currentWidth"
                                values={{width}}
                            />
                        </p>
                    </div>
                )}
            </div>

            {/* ---------- 底部：按钮 + 三步进度 ---------- */}
            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center'}}>
                <button
                    type="button"
                    className={styles.footerBtn}
                    onClick={confirm}
                >
                    {step === 0 ? (
                        <FormattedMessage
                            defaultMessage="进行配置"
                            description="Start calibration button"
                            id="tw.customThemes.pixelCreator.widthCalib.start"
                        />
                    ) : (
                        <FormattedMessage
                            defaultMessage="确定"
                            description="Confirm button"
                            id="tw.customThemes.pixelCreator.widthCalib.confirm"
                        />
                    )}
                </button>
            </div>
            <p style={{fontSize: '11px', color: '#999', textAlign: 'right', margin: '6px 0 0'}}>
                <FormattedMessage
                    defaultMessage="可随时使用窗口右上角的最小化或关闭按钮退出"
                    description="Hint that the free window can be minimized or closed at any time"
                    id="tw.customThemes.pixelCreator.widthCalib.closeHint"
                />
            </p>
            <StepProgress step={step} />
        </div>
    );
});

WidthCalibrationApp.propTypes = {
    onApplyWidth: PropTypes.func,
    onPreviewCalibration: PropTypes.func,
    onRestoreTheme: PropTypes.func,
    onClose: PropTypes.func,
    intl: intlShape.isRequired
};

let calibrationWindow = null;
let calibrationContainer = null;

/**
 * 打开「手动配置宽度」自由窗口。窗口由 WindowManager 创建，自带最小化与关闭按钮，
 * 中途或最后都能直接关闭；onClose 会恢复校准前的主题并卸载 React 树。
 */
export const openWidthCalibrationWindow = ({
    intl,
    onApplyWidth,
    onPreviewCalibration,
    onRestoreTheme
}) => {
    if (calibrationWindow) {
        calibrationWindow.show().bringToFront();
        return calibrationWindow;
    }

    calibrationContainer = document.createElement('div');
    const win = WindowManager.createWindow({
        id: 'tw-pixel-width-calibration-window',
        title: intl.formatMessage({
            defaultMessage: '手动配置宽度',
            description: 'Title of the manual width calibration window',
            id: 'tw.customThemes.pixelCreator.widthCalib.windowTitle'
        }),
        width: 520,
        height: 430,
        minWidth: 380,
        minHeight: 320,
        className: 'tw-pixel-width-calibration-window',
        onClose: () => {
            if (typeof onRestoreTheme === 'function') onRestoreTheme();
            try {
                if (calibrationContainer) ReactDOM.unmountComponentAtNode(calibrationContainer);
            } catch (e) {
                // ignore
            }
            calibrationContainer = null;
            calibrationWindow = null;
        }
    });
    calibrationWindow = win;

    try {
        const contentElement = win.getContentElement();
        if (contentElement) {
            contentElement.innerHTML = '';
            ReactDOM.render(
                React.createElement(IntlProvider, {
                    locale: intl.locale || 'en',
                    messages: intl.messages || {}
                },
                    React.createElement(WidthCalibrationApp, {
                        onApplyWidth,
                        onPreviewCalibration,
                        onRestoreTheme,
                        onClose: () => win.close()
                    })),
                contentElement
            );
            contentElement.style.pointerEvents = 'auto';
        }
    } catch (e) {
        console.warn('Failed to render width calibration content', e);
    }

    win.show();
    return win;
};

export default WidthCalibrationApp;

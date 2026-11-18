import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {
    getPixelPreviewSettings,
    setPixelPreviewSettings,
    subscribePixelPreviewSettings,
    PIXEL_ORIENTATION_LANDSCAPE,
    PIXEL_ORIENTATION_PORTRAIT
} from '../../lib/themes/pixel-preview-settings.js';
import {computeScreenWidthReference} from '../../lib/themes/pixel-width-calibration.js';
import {previewCalibrationTheme, restoreCalibrationTheme} from '../../lib/themes/pixel-calibration-preview.js';
import {openWidthCalibrationWindow} from '../menu-bar/tw-pixel-width-calibration.jsx';
import styles from './settings-modal.css';

/**
 * 「设置 → 主题 → 像素主题」页面。
 * 这里的宽度 / 高度是当前设备预览灵活编码像素主题时使用的画布尺寸，
 * 与主题文件里保存的 w / h 互不干扰。
 *
 * 方向（横屏 / 竖屏）只表示「短边在哪一侧」：横屏的短边是左右、竖屏的短边是上下。
 * 参考值按最简比例计算，横竖屏用两种互为止数的算法，结果接近但不会完全相同。
 */

const ORIENTATION_LABELS = {
    [PIXEL_ORIENTATION_LANDSCAPE]: {
        defaultMessage: '横屏',
        description: 'Label of the landscape orientation option',
        id: 'tw.settingsModal.pixelTheme.orientationLandscape'
    },
    [PIXEL_ORIENTATION_PORTRAIT]: {
        defaultMessage: '竖屏',
        description: 'Label of the portrait orientation option',
        id: 'tw.settingsModal.pixelTheme.orientationPortrait'
    }
};

const ORIENTATION_ORDER = [PIXEL_ORIENTATION_LANDSCAPE, PIXEL_ORIENTATION_PORTRAIT];

const computeReference = orientation => computeScreenWidthReference(null, {orientation});

class PixelThemePage extends React.Component {
    constructor (props) {
        super(props);
        const settings = getPixelPreviewSettings();
        this.state = {
            ...settings,
            reference: computeReference(settings.orientation)
        };
        this.unsubscribe = null;
    }

    componentDidMount () {
        this.unsubscribe = subscribePixelPreviewSettings(settings => this.setState({
            ...settings,
            reference: computeReference(settings.orientation)
        }));
    }

    componentWillUnmount () {
        if (this.unsubscribe) this.unsubscribe();
        this.unsubscribe = null;
        // 离开设置页时不要把校准标尺留在编辑器上
        restoreCalibrationTheme();
    }

    handleWidthChange = e => {
        const n = Number(e.target.value);
        if (!Number.isFinite(n) || n < 2) return;
        setPixelPreviewSettings({width: Math.min(10000, Math.round(n)), configured: true});
    };

    handleHeightChange = e => {
        const n = Number(e.target.value);
        if (!Number.isFinite(n) || n < 2) return;
        setPixelPreviewSettings({height: Math.min(50, Math.round(n))});
    };

    handleOrientationChange = e => {
        const orientation = e.target.value === PIXEL_ORIENTATION_LANDSCAPE ?
            PIXEL_ORIENTATION_LANDSCAPE : PIXEL_ORIENTATION_PORTRAIT;
        const next = setPixelPreviewSettings({orientation});
        // 宽度还是默认值（从未手动配置）时，让它继续跟随参考值
        if (!next.configured) {
            setPixelPreviewSettings({width: computeReference(orientation).value});
        }
        this.setState({reference: computeReference(orientation)});
    };

    handleUseReference = () => {
        setPixelPreviewSettings({width: this.state.reference.value, configured: true});
    };

    handleManualWidth = () => {
        openWidthCalibrationWindow({
            intl: this.props.intl,
            // 校准窗口最终值回填到本设置，并标记为已配置
            onApplyWidth: width => setPixelPreviewSettings({width, configured: true}),
            // 与「创建像素主题」窗口里的手动配置保持一致：校准过程中把深色块标尺
            // 直接画到编辑器菜单栏上，关闭窗口时恢复原主题。
            onPreviewCalibration: pixelData => previewCalibrationTheme(pixelData),
            onRestoreTheme: () => restoreCalibrationTheme()
        });
    };

    render () {
        const {width, height, configured, reference, orientation} = this.state;
        const inputStyle = {
            width: '140px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(128, 128, 128, 0.5)',
            background: 'transparent',
            color: 'inherit',
            fontFamily: 'inherit',
            fontSize: '14px'
        };
        return (
            <div>
                <div className={styles.header}>
                    <FormattedMessage
                        defaultMessage="像素主题"
                        description="Title of the pixel theme preview settings page"
                        id="tw.settingsModal.pixelTheme.title"
                    />
                </div>
                <div className={styles.setting}>
                    <p className={styles.detail}>
                        <FormattedMessage
                            defaultMessage="这里的宽度和高度用于在当前设备上预览灵活编码的像素主题。"
                            description="Description of the pixel theme preview settings page"
                            id="tw.settingsModal.pixelTheme.description"
                        />
                    </p>

                    <label className={styles.label} style={{display: 'block', marginTop: '12px'}}>
                        <FormattedMessage
                            defaultMessage="预览宽度"
                            description="Preview width of flexible pixel themes"
                            id="tw.settingsModal.pixelTheme.width"
                        />
                    </label>
                    <input
                        type="number"
                        min="2"
                        max="10000"
                        value={width}
                        onChange={this.handleWidthChange}
                        style={inputStyle}
                        aria-label={this.props.intl.formatMessage({
                            defaultMessage: '预览宽度',
                            id: 'tw.settingsModal.pixelTheme.width'
                        })}
                    />

                    <label className={styles.label} style={{display: 'block', marginTop: '12px'}}>
                        <FormattedMessage
                            defaultMessage="预览高度"
                            description="Preview height of flexible pixel themes"
                            id="tw.settingsModal.pixelTheme.height"
                        />
                    </label>
                    <input
                        type="number"
                        min="2"
                        max="50"
                        value={height}
                        onChange={this.handleHeightChange}
                        style={inputStyle}
                        aria-label={this.props.intl.formatMessage({
                            defaultMessage: '预览高度',
                            id: 'tw.settingsModal.pixelTheme.height'
                        })}
                    />

                    <label className={styles.label} style={{display: 'block', marginTop: '12px'}}>
                        <FormattedMessage
                            defaultMessage="屏幕方向"
                            description="Label of the landscape/portrait selector for the pixel theme reference"
                            id="tw.settingsModal.pixelTheme.orientation"
                        />
                    </label>
                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '4px'
                        }}
                        role="radiogroup"
                        aria-label={this.props.intl.formatMessage({
                            defaultMessage: '屏幕方向',
                            id: 'tw.settingsModal.pixelTheme.orientation'
                        })}
                    >
                        {ORIENTATION_ORDER.map(value => {
                            const selected = orientation === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => this.handleOrientationChange({target: {value}})}
                                    style={{
                                        flex: '1 1 0',
                                        minWidth: '140px',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: selected ?
                                            '2px solid #4c97ff' :
                                            '1px solid rgba(128, 128, 128, 0.5)',
                                        background: selected ?
                                            'rgba(76, 151, 255, 0.12)' :
                                            'transparent',
                                        color: 'inherit',
                                        fontFamily: 'inherit',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'background 120ms ease, border-color 120ms ease'
                                    }}
                                >
                                    {this.props.intl.formatMessage(ORIENTATION_LABELS[value])}
                                </button>
                            );
                        })}
                    </div>
                    <p className={styles.detail} style={{marginTop: '6px'}}>
                        <FormattedMessage
                            defaultMessage="横屏：左右为短边、上下为长边，按短:长计算；竖屏：上下为短边、左右为长边，按长:短计算。两种算法结果接近，只差几个像素。"
                            description="Hint explaining what the orientation option changes"
                            id="tw.settingsModal.pixelTheme.orientationHint"
                        />
                    </p>

                    <p className={styles.detail} style={{marginTop: '16px'}}>
                        <FormattedMessage
                            defaultMessage="不稳定参考值：{reference}（最简比例 {ratio}）"
                            description="Unstable screen-ratio reference value and its simplified ratio"
                            id="tw.settingsModal.pixelTheme.reference"
                            values={{reference: reference.value, ratio: reference.ratioText}}
                        />
                    </p>
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            marginTop: '10px',
                            marginBottom: '4px'
                        }}
                    >
                        <button
                            type="button"
                            className={styles.button}
                            onClick={this.handleUseReference}
                        >
                            <FormattedMessage
                                defaultMessage="使用参考值"
                                description="Apply the unstable reference value as preview width"
                                id="tw.settingsModal.pixelTheme.useReference"
                            />
                        </button>
                        <button
                            type="button"
                            className={styles.button}
                            onClick={this.handleManualWidth}
                        >
                            <FormattedMessage
                                defaultMessage="手动设置宽度"
                                description="Open the manual width calibration window from settings"
                                id="tw.settingsModal.pixelTheme.manualWidth"
                            />
                        </button>
                    </div>

                    <p className={styles.detail} style={{marginTop: '16px'}}>
                        {configured ? (
                            <FormattedMessage
                                defaultMessage="预览宽度已配置。"
                                description="Status when the pixel preview width has been configured"
                                id="tw.settingsModal.pixelTheme.configured"
                            />
                        ) : (
                            <FormattedMessage
                                defaultMessage="预览宽度尚未配置，应用灵活编码主题时会提示。"
                                description="Status when the pixel preview width is still default"
                                id="tw.settingsModal.pixelTheme.notConfigured"
                            />
                        )}
                    </p>
                </div>
            </div>
        );
    }
}

PixelThemePage.propTypes = {
    intl: intlShape.isRequired
};

export default injectIntl(PixelThemePage);

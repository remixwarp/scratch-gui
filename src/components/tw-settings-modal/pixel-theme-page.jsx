import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {
    getPixelPreviewSettings,
    setPixelPreviewSettings,
    subscribePixelPreviewSettings
} from '../../lib/themes/pixel-preview-settings.js';
import {computeScreenWidthReference} from '../../lib/themes/pixel-width-calibration.js';
import {openWidthCalibrationWindow} from '../menu-bar/tw-pixel-width-calibration.jsx';
import styles from './settings-modal.css';

/**
 * 「设置 → 主题 → 像素主题」页面。
 * 这里的宽度 / 高度是当前设备预览灵活编码像素主题时使用的画布尺寸，
 * 与主题文件里保存的 w / h 互不干扰。
 */
class PixelThemePage extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            ...getPixelPreviewSettings(),
            reference: computeScreenWidthReference().value
        };
    }

    componentDidMount () {
        this.unsubscribe = subscribePixelPreviewSettings(settings => this.setState({...settings}));
    }

    componentWillUnmount () {
        if (this.unsubscribe) this.unsubscribe();
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

    handleUseReference = () => {
        setPixelPreviewSettings({width: this.state.reference, configured: true});
    };

    handleManualWidth = () => {
        openWidthCalibrationWindow({
            intl: this.props.intl,
            // 校准窗口最终值回填到本设置，并标记为已配置
            onApplyWidth: width => setPixelPreviewSettings({width, configured: true})
        });
    };

    render () {
        const {width, height, configured, reference} = this.state;
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

                    <p className={styles.detail} style={{marginTop: '16px'}}>
                        <FormattedMessage
                            defaultMessage="不稳定参考值：{reference}"
                            description="Unstable screen-ratio reference value shown in pixel theme settings"
                            id="tw.settingsModal.pixelTheme.reference"
                            values={{reference}}
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

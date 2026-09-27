import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, intlShape, injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import Box from '../box/box.jsx';
import styles from './settings-modal.css';

import {
    getFrostedGlassSettings,
    setFrostedGlassSettings,
    applyFrostedGlass,
    DEFAULT_SETTINGS
} from '../../lib/bl-frosted-glass.js';

class FrostedGlassPage extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleEnabledChange',
            'handleBlurRadiusChange',
            'handleOpacityChange',
            'handleThemeBoostChange'
        ]);
        const saved = getFrostedGlassSettings();
        this.state = {
            enabled: saved ? saved.enabled : DEFAULT_SETTINGS.enabled,
            blurRadius: saved ? saved.blurRadius : DEFAULT_SETTINGS.blurRadius,
            opacity: saved ? saved.opacity : DEFAULT_SETTINGS.opacity,
            themeBoost: saved && saved.themeBoost != null ? saved.themeBoost : DEFAULT_SETTINGS.themeBoost
        };
    }

    applyAndSave (patch) {
        const newSettings = {
            ...this.state,
            ...patch
        };
        this.setState(newSettings);
        setFrostedGlassSettings(newSettings);
        applyFrostedGlass(newSettings);
    }

    handleEnabledChange (e) {
        this.applyAndSave({enabled: e.target.checked});
    }

    handleBlurRadiusChange (e) {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 4 && value <= 24) {
            this.applyAndSave({blurRadius: value});
        }
    }

    handleOpacityChange (e) {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= 0.05 && value <= 0.35) {
            this.applyAndSave({opacity: value});
        }
    }

    handleThemeBoostChange (e) {
        const value = parseFloat(e.target.value);
        if (!isNaN(value) && value >= 0.10 && value <= 0.55) {
            this.applyAndSave({themeBoost: value});
        }
    }

    render () {
        const {enabled, blurRadius, opacity, themeBoost} = this.state;

        return (
            <Box className={styles.body}>
                <div className={styles.settingHeader}>
                    <FormattedMessage
                        id="bl.frostedGlass.pageTitle"
                        defaultMessage="Frosted Glass"
                    />
                </div>

                {/* Enable toggle */}
                <div className={styles.setting}>
                    <div className={styles.label}>
                        <label>
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={this.handleEnabledChange}
                                className={styles.checkbox}
                            />
                            <FormattedMessage
                                id="bl.frostedGlass.enabled"
                                defaultMessage="Enable Frosted Glass"
                            />
                        </label>
                    </div>
                </div>

                {enabled && (
                    <React.Fragment>
                        {/* Blur radius slider */}
                        <div className={styles.setting}>
                            <div className={styles.label}>
                                <FormattedMessage
                                    id="bl.frostedGlass.blurRadius"
                                    defaultMessage="Blur Intensity"
                                />
                                <span className={styles.settingValue}>{blurRadius}px</span>
                            </div>
                            <input
                                type="range"
                                min="4"
                                max="24"
                                step="1"
                                value={blurRadius}
                                onChange={this.handleBlurRadiusChange}
                                className={styles.gcSlider}
                            />
                            <div className={styles.rangeLabels}>
                                <span>4px</span>
                                <span>24px</span>
                            </div>
                        </div>

                        {/* Opacity slider */}
                        <div className={styles.setting}>
                            <div className={styles.label}>
                                <FormattedMessage
                                    id="bl.frostedGlass.opacity"
                                    defaultMessage="Opacity"
                                />
                                <span className={styles.settingValue}>{opacity.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.05"
                                max="0.35"
                                step="0.01"
                                value={opacity}
                                onChange={this.handleOpacityChange}
                                className={styles.gcSlider}
                            />
                            <div className={styles.rangeLabels}>
                                <span>0.05</span>
                                <span>0.35</span>
                            </div>
                        </div>

                        {/* Dark/light difference slider */}
                        <div className={styles.setting}>
                            <div className={styles.label}>
                                <FormattedMessage
                                    id="bl.frostedGlass.themeBoost"
                                    defaultMessage="Dark/Light Difference"
                                />
                                <span className={styles.settingValue}>{themeBoost.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.10"
                                max="0.55"
                                step="0.05"
                                value={themeBoost}
                                onChange={this.handleThemeBoostChange}
                                className={styles.gcSlider}
                            />
                            <div className={styles.rangeLabels}>
                                <span>0.10</span>
                                <span>0.55</span>
                            </div>
                        </div>
                    </React.Fragment>
                )}
            </Box>
        );
    }
}

FrostedGlassPage.propTypes = {
    intl: intlShape.isRequired
};

export default injectIntl(FrostedGlassPage);
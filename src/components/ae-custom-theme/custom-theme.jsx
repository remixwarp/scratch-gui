import { defineMessages, FormattedMessage, intlShape, injectIntl } from 'react-intl';
import React, {useState, useCallback} from 'react';
import Modal from '../../containers/modal.jsx';
import PropTypes from 'prop-types';
import Box from '../box/box.jsx';
import { setTheme } from '../../reducers/theme.js';
import { Theme } from '../../lib/themes/index.js';
import { persistTheme } from '../../lib/themes/themePersistance.js';
import { connect } from 'react-redux';
import styles from './custom-theme.css';
import classNames from 'classnames';
import { closeCustomTheme } from '../../reducers/modals.js';
import {
    setColorTo,
    saveColors
} from "../../lib/themes/custom/custom.js";

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    const toHex = (n) => {
        const h = n.toString(16);
        return h.length === 1 ? '0' + h : h;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const messages = defineMessages({
    title: {
        defaultMessage: 'Custom Theme',
        description: 'Title of custom theme modal',
        id: 'tw.customTheme.title'
    },
    namePlaceholder: {
        defaultMessage: 'My Custom Theme',
        description: 'Placeholder for theme name input',
        id: 'tw.customTheme.name.placeholder'
    }
});

const isValidHex = (value) => {
    const clean = value.replace('#', '').trim();
    return /^[0-9a-fA-F]{6}$/.test(clean) || /^[0-9a-fA-F]{3}$/.test(clean);
};

const applyColorToTheme = (value) => {
    const hex = hexToRgb(value);
    setColorTo("motion-primary", value);
    setColorTo("motion-primary-transparent", value + "e6");
    setColorTo("motion-tertiary", rgbToHex(hex.r, hex.g - 51, hex.b));

    setColorTo("looks-secondary", value);
    setColorTo("looks-transparent", rgbToHex(hex.r, hex.g - 34, hex.b - 85) + "59");
    setColorTo("looks-light-transparent", rgbToHex(hex.r, hex.g - 51, hex.b - 119) + "26");
    setColorTo("looks-secondary-dark", rgbToHex(hex.r + 30, hex.g - 51, hex.b - 50));

    setColorTo("extensions-primary", value);
    setColorTo("extensions-tertiary", rgbToHex(hex.r + 30, hex.g - 51, hex.b - 50));
    setColorTo("extensions-light", rgbToHex(hex.r + 30, hex.g + 10, hex.b + 10));
    setColorTo("drop-highlight", rgbToHex(hex.r + 30, hex.g + 10, hex.b + 10));
    setColorTo("checkboxActiveBackground", value);
};

const CustomModalComponent = props => {
    const initialColor = props.theme && props.theme.getGuiColors ?
        props.theme.getGuiColors()['motion-primary'] : '#ff4c4c';

    const [color, setColor] = useState(initialColor || '#ff4c4c');
    const [hexInput, setHexInput] = useState(initialColor || '#ff4c4c');
    const [hexError, setHexError] = useState(false);
    const [themeName, setThemeName] = useState('');

    const handleColorPickerChange = (newColor) => {
        setColor(newColor);
        setHexInput(newColor);
        setHexError(false);
        applyColorToTheme(newColor);
    };

    const handleHexChange = (e) => {
        const raw = e.target.value;
        setHexInput(raw);
        const normalized = raw.startsWith('#') ? raw : `#${raw}`;
        if (isValidHex(normalized)) {
            setHexError(false);
            const final = normalized.length === 4
                ? '#' + normalized.slice(1).split('').map(c => c + c).join('')
                : normalized;
            setColor(final);
            applyColorToTheme(final);
        } else if (raw.trim() === '' || raw === '#') {
            setHexError(false);
        } else {
            setHexError(true);
        }
    };

    const handleHexBlur = () => {
        if (!isValidHex(hexInput)) {
            setHexInput(color);
            setHexError(false);
        } else {
            const normalized = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
            const final = normalized.length === 4
                ? '#' + normalized.slice(1).split('').map(c => c + c).join('')
                : normalized;
            setHexInput(final);
            setHexError(false);
        }
    };

    const handleApply = () => {
        applyColorToTheme(color);
        saveColors();
        const newTheme = props.theme.set('accent', 'custom');
        props.onChangeTheme(newTheme);
        props.onClose();
    };

    return (
        <Modal
            className={styles.modalContent}
            onRequestClose={props.onClose}
            contentLabel={props.intl.formatMessage(messages.title)}
            id="customtheme"
        >
            <Box className={styles.body}>
                <div className={styles.content}>
                    <FormattedMessage
                        defaultMessage="You can customize the theme colors for the interface. Enter your preferred color below and click 'Apply' to update your theme."
                        description="introduction of custom theme modal"
                        id="tw.customTheme.introduction"
                    />
                    <br />

                    {/* Theme name input */}
                    <div className={styles.nameRow}>
                        <label className={styles.nameLabel}>
                            <FormattedMessage
                                defaultMessage="Theme Name"
                                description="Theme name label"
                                id="tw.customTheme.name.label"
                            />
                        </label>
                        <input
                            className={styles.nameInput}
                            type='text'
                            value={themeName}
                            onChange={(e) => setThemeName(e.target.value)}
                            placeholder={props.intl.formatMessage(messages.namePlaceholder)}
                        />
                    </div>

                    <div className={styles.header}>
                        <div className={styles.divider} />
                    </div>

                    <div className={styles.titleBox}>
                        <div>
                            <span className={styles.title}>
                                <FormattedMessage
                                    defaultMessage="Theme Color"
                                    description="gui-theme-color"
                                    id="tw.customTheme.maincolor"
                                />
                            </span><br />
                            <span>
                                <FormattedMessage
                                    defaultMessage="Choose the color you like, and other colors will be automatically filled in"
                                    description="gui-theme-color-intro"
                                    id="tw.customTheme.maincolor.introduction"
                                />
                            </span>
                        </div>

                        <div className={styles.colorPickerRow}>
                            <input
                                className={styles.colorInput}
                                type='color'
                                value={color}
                                onChange={(e) => handleColorPickerChange(e.target.value)}
                            />
                            <input
                                className={classNames(styles.hexInput, {[styles.hexInputError]: hexError})}
                                type='text'
                                value={hexInput}
                                onChange={handleHexChange}
                                onBlur={handleHexBlur}
                                placeholder="#rrggbb"
                                maxLength={9}
                            />
                        </div>
                    </div>
                </div>
                <div className={styles.apply}>
                    <button
                        className={styles.button}
                        onClick={handleApply}
                    >
                        <FormattedMessage
                            defaultMessage="Apply"
                            description="Apply Button"
                            id="tw.customTheme.apply"
                        />
                    </button>
                </div>
            </Box>
        </Modal>
    );
};

CustomModalComponent.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func,
    theme: PropTypes.instanceOf(Theme),
    onChangeTheme: PropTypes.func
};

const mapStateToProps = state => ({
    theme: state.scratchGui.theme.theme
});

const mapDispatchToProps = dispatch => ({
    onChangeTheme: theme => {
        dispatch(setTheme(theme));
        persistTheme(theme);
    },
    onClose: () => dispatch(closeCustomTheme())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(injectIntl(CustomModalComponent));

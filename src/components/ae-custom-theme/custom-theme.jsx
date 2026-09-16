import { defineMessages, FormattedMessage, intlShape, injectIntl } from 'react-intl';
import React, { useRef, useState } from 'react';
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
    customGUITheme,
    customBlockColors,
    setColorTo,
    getColorOf,
    saveColors
} from "../../lib/themes/custom/custom.js"

function hexToRgb(hex) {
    hex = hex.replace('#', '');

    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
}

function rgbToHex(r, g, b) {
    const toHex = (n) => {
        const hex = n.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const messages = defineMessages({
    title: {
        defaultMessage: 'Custom Theme',
        description: 'Title of custom theme modal',
        id: 'tw.customTheme.title'
    }
});

const isValidHex = (value) => {
    const clean = value.replace('#', '').trim();
    return /^[0-9a-fA-F]{6}$/.test(clean) || /^[0-9a-fA-F]{3}$/.test(clean);
};

const SelectBox = ({ value, onChangeColor, title, intro, id, ...props }) => {
    const [hexValue, setHexValue] = useState(value || '#ff4c4c');
    const [hexError, setHexError] = useState(false);

    const handleColorChange = (newValue) => {
        setHexValue(newValue);
        setHexError(false);
        onChangeColor(newValue);
    };

    const handleHexChange = (e) => {
        const raw = e.target.value;
        setHexValue(raw);
        const normalized = raw.startsWith('#') ? raw : `#${raw}`;
        if (isValidHex(normalized)) {
            setHexError(false);
            const final = normalized.length === 4
                ? '#' + normalized.slice(1).split('').map(c => c + c).join('')
                : normalized;
            onChangeColor(final);
        } else if (raw.trim() === '' || raw === '#') {
            setHexError(false);
        } else {
            setHexError(true);
        }
    };

    const handleHexBlur = () => {
        if (!isValidHex(hexValue)) {
            setHexValue(value || '#ff4c4c');
            setHexError(false);
        } else {
            const normalized = hexValue.startsWith('#') ? hexValue : `#${hexValue}`;
            const final = normalized.length === 4
                ? '#' + normalized.slice(1).split('').map(c => c + c).join('')
                : normalized;
            setHexValue(final);
            setHexError(false);
        }
    };

    return (
        <>
            <div className={styles.header}>
                <div className={styles.divider} />
            </div>

            <div className={styles.titleBox}>
                <div>
                    <span className={styles.title}>{title}</span><br />
                    <span>{intro}</span>
                </div>

                <div className={styles.colorPickerRow}>
                    <input
                        className={styles.colorInput}
                        type='color'
                        value={value || '#ff4c4c'}
                        onChange={(e) => handleColorChange(e.target.value)}
                    />
                    <input
                        className={classNames(styles.hexInput, {[styles.hexInputError]: hexError})}
                        type='text'
                        value={hexValue}
                        onChange={handleHexChange}
                        onBlur={handleHexBlur}
                        placeholder="#rrggbb"
                        maxLength={9}
                    />
                </div>
            </div>
        </>
    );
};

const onThemeColorChange = (value, id) => {
    const hex = hexToRgb(value);
    setColorTo(
        "motion-primary", value
    );
    setColorTo(
        "motion-primary-transparent", value + "e6"
    );
    setColorTo(
        "motion-tertiary", rgbToHex(hex.r, hex.g - 51, hex.b)
    );

    setColorTo(
        "looks-secondary", value
    );
    setColorTo(
        "looks-transparent", rgbToHex(hex.r, hex.g - 34, hex.b - 85) + "59"
    );
    setColorTo(
        "looks-light-transparent", rgbToHex(hex.r, hex.g - 51, hex.b - 119) + "26"
    );
    setColorTo(
        "looks-secondary-dark", rgbToHex(hex.r + 30, hex.g - 51, hex.b - 50)
    );
    setColorTo(
        "extensions-primary", value
    );
    setColorTo(
        "extensions-tertiary", rgbToHex(hex.r + 30, hex.g - 51, hex.b - 50)
    );
    setColorTo(
        "extensions-tertiary", rgbToHex(hex.r + 30, hex.g - 90, hex.b - 90) + "59"
    );
    setColorTo(
        "extensions-light", rgbToHex(hex.r + 30, hex.g + 10, hex.b + 10)
    );
    setColorTo(
        "drop-highlight", rgbToHex(hex.r + 30, hex.g + 10, hex.b + 10)
    );
    setColorTo(
        "checkboxActiveBackground", value
    );
}

const ThemeColor = props => (
    <SelectBox
        {...props}
        id="main-color"
        value={customGUITheme['motion-primary'] || '#ff4c4c'}
        title={
            <FormattedMessage
                defaultMessage="Theme Color"
                description="gui-theme-color"
                id="tw.customTheme.maincolor"
            />
        }
        intro={
            <FormattedMessage
                defaultMessage="Choose the color you like, and other colors will be automatically filled in"
                description="gui-theme-color-intro"
                id="tw.customTheme.maincolor.introduction"
            />
        }
        onChangeColor={(e) => {
            onThemeColorChange(
                e, "main-theme"
            )
        }}
    />
)

SelectBox.prototype = {
    title: PropTypes.string,
    intro: PropTypes.string,
    id: PropTypes.string,
}

const CustomModalComponent = props => {
    const handleApply = () => {
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
                    <ThemeColor />
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
            </div>

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

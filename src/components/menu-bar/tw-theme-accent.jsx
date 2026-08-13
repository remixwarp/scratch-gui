import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, defineMessages, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';

import {Check} from 'lucide-react';
import ChevronDown from './ChevronDown.jsx';
import {MenuItem, Submenu} from '../menu/menu.jsx';
import {ACCENT_MAP, Theme} from '../../lib/themes/index.js';
import {CustomTheme} from '../../lib/themes/custom-themes.js';
import {openAccentMenu, accentMenuOpen, closeSettingsMenu} from '../../reducers/menus.js';
import {setTheme} from '../../reducers/theme.js';
import {applyTheme} from '../../lib/themes/themePersistance.js';
import styles from './settings-menu.css';

import {openCustomTheme} from '../../reducers/modals.js';

import {closeEditMenu} from '../../reducers/menus.js';

import mcThemeCircle from '../../lib/themes/pixel-presets/MC风格主题_○_pixel_theme.json';
import mcThemeRight from '../../lib/themes/pixel-presets/MC风格主题_→_pixel_theme.json';
import mcThemeLeft from '../../lib/themes/pixel-presets/MC风格主题_←_pixel_theme.json';

import cysoThemeCircle from '../../lib/themes/pixel-presets/cyso_○_pixel_theme.json';
import cysoThemeLeft from '../../lib/themes/pixel-presets/cyso_←_pixel_theme.json';
import cysoThemeN from '../../lib/themes/pixel-presets/cyso_n_pixel_theme.json';

const PIXEL_PRESETS = [
    {id: 'pixel-mc-circle', name: mcThemeCircle.themes[0].name, data: mcThemeCircle},
    {id: 'pixel-mc-right', name: mcThemeRight.themes[0].name, data: mcThemeRight},
    {id: 'pixel-mc-left', name: mcThemeLeft.themes[0].name, data: mcThemeLeft},
    {id: 'pixel-cyso-circle', name: cysoThemeCircle.themes[0].name, data: cysoThemeCircle},
    {id: 'pixel-cyso-left', name: cysoThemeLeft.themes[0].name, data: cysoThemeLeft},
    {id: 'pixel-cyso-n', name: cysoThemeN.themes[0].name, data: cysoThemeN}
];

// Keep the original accent messages for FormattedMessage component
const ACCENT_MESSAGES = {};
for (const key in ACCENT_MAP) {
    ACCENT_MESSAGES[key] = {
        id: ACCENT_MAP[key].id,
        defaultMessage: ACCENT_MAP[key].defaultMessage,
        description: ACCENT_MAP[key].description
    };
}

// Create a separate map for accent values if needed
const ACCENT_VALUES = {};
for (const key in ACCENT_MAP) {
    ACCENT_VALUES[key] = ACCENT_MAP[key].accent;
}

const icons = {
    rainbow: null // We don't have a rainbow icon yet, but we can add it later
};

const ColorIcon = props => {
    const accentId = props.id || 'pale blue';
    const accent = ACCENT_MAP[accentId] && ACCENT_MAP[accentId].accent;

    if (accentId && accentId.startsWith('pixel-')) {
        return (
            <div
                className={styles.accentIconOuter}
                style={{
                    backgroundColor: accentId.startsWith('pixel-cyso-') ? '#4e8dc1' : '#3c8527',
                    backgroundImage: 'none'
                }}
            />
        );
    }

    if (icons[accentId]) {
        return (
            <img
                className={styles.accentIconOuter}
                src={icons[accentId]}
                draggable={false}
                alt=""
            />
        );
    }
    
    if (accentId === 'custom') {
        return (
            <div
                className={styles.accentIconOuter}
                style={{
                    backgroundColor: '#ff6b6b',
                    backgroundImage: 'none'
                }}
            />
        );
    }
    
    if (accent && accent.guiColors) {
        return (
            <div
                className={styles.accentIconOuter}
                style={{
                    backgroundColor: accent.guiColors['looks-secondary'],
                    backgroundImage: accent.guiColors['menu-bar-background-image']
                }}
            />
        );
    }
    
    return (
        <div
            className={styles.accentIconOuter}
            style={{
                backgroundColor: '#4A90E2',
                backgroundImage: 'none'
            }}
        />
    );
};

ColorIcon.propTypes = {
    id: PropTypes.string
};

const AccentMenuItem = props => (
    <MenuItem onClick={props.onClick}>
        <div className={styles.option}>
            <Check className={classNames(styles.check, {[styles.selected]: props.isSelected})} />
            <ColorIcon id={props.id} />
            <FormattedMessage {...ACCENT_MESSAGES[props.id]} />
        </div>
    </MenuItem>
);

AccentMenuItem.propTypes = {
    id: PropTypes.string,
    isSelected: PropTypes.bool,
    onClick: PropTypes.func
};

const AccentThemeMenu = ({
    intl,
    isOpen,
    isRtl,
    onChangeTheme,
    onApplyPixelTheme,
    onOpen,
    onClickCustomThemeModal,
    theme
}) => {
    const isZh =
        intl &&
        intl.locale &&
        (intl.locale.startsWith('zh') ||
            intl.locale.startsWith('cmn') ||
            intl.locale.startsWith('yue'));
    return (
    <MenuItem expanded={isOpen}>
        <div
            className={styles.option}
            onClick={onOpen}
        >
            <ColorIcon id={theme.accent} />
            <span className={styles.submenuLabel}>
                <FormattedMessage
                    defaultMessage="Accent"
                    description="Label for menu to choose accent color"
                    id="tw.menuBar.accent"
                />
            </span>
            <ChevronDown className={styles.expandCaret} />
        </div>
        <Submenu
            place={isRtl ? 'left' : 'right'}
            className={styles.accentSubmenu}
        >
            {Object.keys(ACCENT_MAP).map(item => (
                <AccentMenuItem
                    key={item}
                    id={item}
                    isSelected={theme.accent === item}
                    onClick={() => onChangeTheme(theme.set('accent', item))}
                />
            ))}
            {PIXEL_PRESETS.map(preset => (
                <MenuItem key={preset.id} onClick={() => onApplyPixelTheme(preset.data)}>
                    <div className={styles.option}>
                        <Check className={classNames(styles.check, {[styles.selected]: false})} />
                        <ColorIcon id={preset.id} />
                        <span>{preset.name}</span>
                    </div>
                </MenuItem>
            ))}
            <MenuItem onClick={onClickCustomThemeModal}>
                <div className={styles.option}>
                    <ColorIcon id="custom" />
                    <FormattedMessage
                        defaultMessage="Custom"
                        description="Custom theme option"
                        id="tw.accent.custom"
                    />
                </div>
            </MenuItem>
            <MenuItem className={styles.pixelPresetDisclaimerItem}>
                <div className={styles.pixelPresetDisclaimer}>
                    {isZh ? (
                        <>
                            非MINECRAFT官方产品。未经Mojang AB或Microsoft批准，
                            <br />
                            也不与Mojang AB或Microsoft关联。
                        </>
                    ) : (
                        <>
                            Not an official MINECRAFT product. Not approved by or
                            <br />
                            associated with MOJANG or MICROSOFT.
                        </>
                    )}
                </div>
            </MenuItem>
        </Submenu>
    </MenuItem>
    );
};

AccentThemeMenu.propTypes = {
    intl: intlShape.isRequired,
    isOpen: PropTypes.bool,
    isRtl: PropTypes.bool,
    onChangeTheme: PropTypes.func,
    onApplyPixelTheme: PropTypes.func,
    onClickCustomThemeModal: PropTypes.func,
    onOpen: PropTypes.func,
    theme: PropTypes.instanceOf(Theme)
};

const mapStateToProps = state => ({
    isOpen: accentMenuOpen(state),
    isRtl: state.locales.isRtl,
    theme: state.scratchGui.theme.theme
});

const mapDispatchToProps = dispatch => ({
    onChangeTheme: theme => {
        dispatch(setTheme(theme));
        dispatch(closeSettingsMenu());
        applyTheme(theme);
    },
    onApplyPixelTheme: data => {
        const themeData = data.themes[0];
        const customTheme = CustomTheme.import(themeData);
        dispatch(setTheme(customTheme));
        dispatch(closeSettingsMenu());
        applyTheme(customTheme);
    },
    onOpen: () => dispatch(openAccentMenu()),
    onClickCustomThemeModal: () => {
        dispatch(closeEditMenu());
        dispatch(openCustomTheme());
    },
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(AccentThemeMenu));

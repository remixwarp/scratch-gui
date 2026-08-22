import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {Settings} from 'lucide-react';

import styles from './shortcut-manager.css';

const formatDisplayKey = key => {
    if (!key) return '';
    return key
        .replace(/Ctrl/g, navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
        .replace(/Alt/g, navigator.platform.includes('Mac') ? '⌥' : 'Alt')
        .replace(/Shift/g, '⇧')
        .replace(/ /g, '');
};

const ShortcutItem = ({
    shortcut,
    onEdit,
    isRecording
}) => (
    <div className={classNames(styles.shortcutItem, {[styles.recording]: isRecording})}>
        <div className={styles.shortcutInfo}>
            <div className={styles.shortcutLabel}>{shortcut.label}</div>
            <div className={styles.shortcutKey}>
                <span className={styles.keyDisplay}>
                    {formatDisplayKey(shortcut.key)}
                </span>
            </div>
        </div>
        {!shortcut.readOnly && (
            <button
                type="button"
                className={styles.editIcon}
                title="设置快捷键"
                aria-label="设置快捷键"
                onClick={() => onEdit(shortcut.id)}
            >
                <Settings size={14} />
            </button>
        )}
    </div>
);

ShortcutItem.propTypes = {
    shortcut: PropTypes.shape({
        id: PropTypes.string,
        key: PropTypes.string,
        defaultKey: PropTypes.string,
        label: PropTypes.string,
        readOnly: PropTypes.bool
    }).isRequired,
    onEdit: PropTypes.func,
    isRecording: PropTypes.bool
};

export default ShortcutItem;

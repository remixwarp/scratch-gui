import React from 'react';
import {FormattedMessage} from 'react-intl';
import styles from './settings-modal.css';

// 布局配置页右上角的"全选 / 全不选"按钮
const LayoutToolbar = ({onSelectAll, onSelectNone}) => (
    <div className={styles['layout-toolbar']}>
        <button
            type="button"
            className={styles['layout-toolbar-button']}
            onClick={onSelectAll}
        >
            <FormattedMessage id="tw.settingsModal.selectAll" defaultMessage="Select all" />
        </button>
        <button
            type="button"
            className={styles['layout-toolbar-button']}
            onClick={onSelectNone}
        >
            <FormattedMessage id="tw.settingsModal.selectNone" defaultMessage="Deselect all" />
        </button>
    </div>
);

export default LayoutToolbar;

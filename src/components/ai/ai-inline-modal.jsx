import PropTypes from 'prop-types';
import React from 'react';
import WindowManager from '../addons/window-system/window-manager.js';
import AIPanel from './ai-panel.jsx';
import styles from './ai-inline-modal.css';

const AIInlineModal = ({visible, onRequestClose}) => {
    // if the floating window exists, don't render overlay
    if (!visible) return null;
    if (WindowManager.getWindow && WindowManager.getWindow('aiModal')) return null;
    return (
        <div className={styles.backdrop} onClick={onRequestClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <AIPanel onRequestClose={onRequestClose} showHeader={true} />
            </div>
        </div>
    );
};

AIInlineModal.propTypes = {
    visible: PropTypes.bool,
    onRequestClose: PropTypes.func
};

export default AIInlineModal;

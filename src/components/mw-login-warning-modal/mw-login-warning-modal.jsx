import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import {X} from 'lucide-react';

import Modal from '../../containers/windowed-modal.jsx';
import styles from './mw-login-warning-modal.css';

const WarningIcon = () => (
    <svg
        width="56"
        height="56"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <path
            d="M12 2 2 21h20L12 2z"
            fill="#e11d48"
            stroke="#e11d48"
            strokeWidth="1"
            strokeLinejoin="round"
        />
        <path d="M12 9v5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1.2" fill="#fff" />
    </svg>
);

const MwLoginWarningModal = ({onRequestClose, onSetupLogin}) => (
    <Modal
        className={styles.modalContent}
        contentLabel="Bilup login warning"
        id="mwLoginWarningModal"
        onRequestClose={onRequestClose}
        resizable={false}
        maxWidth={420}
    >
        <button
            type="button"
            className={styles.closeButton}
            onClick={onRequestClose}
            aria-label="Close"
        >
            <X size={18} />
        </button>
        <div className={styles.warningBody}>
            <WarningIcon />
            <div className={styles.title}>
                <FormattedMessage
                    defaultMessage="Bilup 账户需要额外登录"
                    description="Title of the Bilup login warning modal"
                    id="mw.loginWarning.title"
                />
            </div>
            <p className={styles.message}>
                <FormattedMessage
                    defaultMessage="你在编辑器中登录后，还需要在 com.bilup.org 网站上也登录 Bilup 账户，才能正常使用完整的社区功能。"
                    description="Body message of the Bilup login warning modal"
                    id="mw.loginWarning.message"
                />
            </p>
            <a
                className={styles.link}
                href="https://editor.bilup.org/"
                target="_blank"
                rel="noopener noreferrer"
            >
                <FormattedMessage
                    defaultMessage="前往 editor.bilup.org 登录"
                    description="Link text to go to editor.bilup.org to log in"
                    id="mw.loginWarning.link"
                />
            </a>
        </div>
        <div className={styles.footer}>
            <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                onClick={onSetupLogin}
            >
                <FormattedMessage
                    defaultMessage="设置登录"
                    description="Button to set up Bilup login"
                    id="mw.loginWarning.setupLogin"
                />
            </button>
            <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                onClick={onRequestClose}
            >
                <FormattedMessage
                    defaultMessage="我已配置"
                    description="Button to confirm the user has already set up login"
                    id="mw.loginWarning.continue"
                />
            </button>
        </div>
    </Modal>
);

MwLoginWarningModal.propTypes = {
    onRequestClose: PropTypes.func.isRequired,
    onSetupLogin: PropTypes.func
};

MwLoginWarningModal.defaultProps = {
    onSetupLogin: () => {
        window.open('https://com.bilup.org/login', '_blank', 'noopener,noreferrer');
    }
};

export default MwLoginWarningModal;

import React from 'react';
import PropTypes from 'prop-types';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import classNames from 'classnames';

import Modal from '../../containers/windowed-modal.jsx';
import Box from '../box/box.jsx';

import styles from './bilup-login-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Login Bilup Accounts',
        id: 'bilup.loginModal.title',
        description: 'Title of the Bilup Accounts login modal'
    },
    heading: {
        defaultMessage: 'Connect Bilup to Bilup Accounts',
        id: 'bilup.loginModal.heading',
        description: 'Heading of the Bilup Accounts login modal'
    },
    description: {
        defaultMessage: 'Sign in to your Bilup Accounts to access cloud sync, activity feeds, and more.',
        id: 'bilup.loginModal.description',
        description: 'Description text in the Bilup Accounts login modal'
    },
    afterLoginLabel: {
        defaultMessage: 'After logging in to BILUP ACCOUNTS, you can:',
        id: 'bilup.loginModal.afterLoginLabel',
        description: 'Label introducing the features available after login'
    },
    featureShareTitle: {
        defaultMessage: 'Share editing status',
        id: 'bilup.loginModal.featureShareTitle',
        description: 'Title of the share editing status feature card'
    },
    featureShareDesc: {
        defaultMessage: 'Show your Bilup activity on your Bilup Accounts profile.',
        id: 'bilup.loginModal.featureShareDesc',
        description: 'Description of the share editing status feature'
    },
    featureCloudTitle: {
        defaultMessage: 'Cloud themes and settings',
        id: 'bilup.loginModal.featureCloudTitle',
        description: 'Title of the cloud themes and settings feature card'
    },
    featureCloudDesc: {
        defaultMessage: 'Sync your themes and settings across devices after signing in.',
        id: 'bilup.loginModal.featureCloudDesc',
        description: 'Description of the cloud themes and settings feature'
    },
    featureGitTitle: {
        defaultMessage: 'Bilup Git in the Git window',
        id: 'bilup.loginModal.featureGitTitle',
        description: 'Title of the Bilup Git feature card'
    },
    featureGitDesc: {
        defaultMessage: 'Create repositories, push projects, and clone others on git.bilup.org.',
        id: 'bilup.loginModal.featureGitDesc',
        description: 'Description of the Bilup Git feature'
    },
    comingSoonLabel: {
        defaultMessage: 'Coming soon',
        id: 'bilup.loginModal.comingSoonLabel',
        description: 'Label for the coming soon section'
    },
    featureFriendsTitle: {
        defaultMessage: 'Friends and collaboration invites',
        id: 'bilup.loginModal.featureFriendsTitle',
        description: 'Title of the friends and collaboration feature card'
    },
    featureFriendsDesc: {
        defaultMessage: 'See online friends on Bilup and send them collaboration invites.',
        id: 'bilup.loginModal.featureFriendsDesc',
        description: 'Description of the friends and collaboration feature'
    },
    laterButton: {
        defaultMessage: 'Not now',
        id: 'bilup.loginModal.laterButton',
        description: 'Button to dismiss the login modal without logging in'
    },
    continueButton: {
        defaultMessage: 'Continue to Bilup Accounts',
        id: 'bilup.loginModal.continueButton',
        description: 'Button to proceed to login on Bilup Accounts'
    },
    footerNote: {
        defaultMessage: 'Sign in securely at accounts.bilup.org. Your account supports online status, cloud sync, and Bilup Git.',
        id: 'bilup.loginModal.footerNote',
        description: 'Footer note about Bilup Accounts login'
    }
});

const BilupLoginModalComponent = props => {
    const {
        intl,
        visible,
        onCancel,
        onContinue
    } = props;

    const handleContinue = () => {
        if (onContinue) {
            onContinue();
        } else {
            // 默认行为：打开 accounts.bilup.org
            const url = 'https://accounts.bilup.org';
            try {
                const target = window.parent || window;
                if (target && target.open) {
                    target.open(url, '_blank', 'noopener,noreferrer');
                } else {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            } catch (e) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
        if (onCancel) {
            onCancel();
        }
    };

    return (
        <Modal
            visible={visible}
            className={styles.modalContent}
            onRequestClose={onCancel}
            contentLabel={intl.formatMessage(messages.title)}
            id="bilupLoginModal"
            resizable={false}
            maximizable={false}
            width={520}
            height={560}
        >
            <Box className={styles.body}>
                <div className={styles.headerRow}>
                    <div className={styles.iconWrap}>
                        <svg
                            className={styles.headerIcon}
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M12 19l7-7 3 3-7 7-3-3z" />
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                            <path d="M2 2l7.586 7.586" />
                            <circle cx="11" cy="11" r="2" />
                        </svg>
                    </div>
                    <h2 className={styles.heading}>
                        <FormattedMessage {...messages.heading} />
                    </h2>
                </div>

                <p className={styles.description}>
                    <FormattedMessage {...messages.description} />
                </p>

                <p className={styles.afterLoginLabel}>
                    <FormattedMessage {...messages.afterLoginLabel} />
                </p>

                <div className={styles.featureList}>
                    <div className={styles.featureItem}>
                        <div className={classNames(styles.featureIcon, styles.featureIconShare)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                        </div>
                        <div className={styles.featureText}>
                            <div className={styles.featureTitle}>
                                <FormattedMessage {...messages.featureShareTitle} />
                            </div>
                            <div className={styles.featureDesc}>
                                <FormattedMessage {...messages.featureShareDesc} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.featureItem}>
                        <div className={classNames(styles.featureIcon, styles.featureIconCloud)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                            </svg>
                        </div>
                        <div className={styles.featureText}>
                            <div className={styles.featureTitle}>
                                <FormattedMessage {...messages.featureCloudTitle} />
                            </div>
                            <div className={styles.featureDesc}>
                                <FormattedMessage {...messages.featureCloudDesc} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.featureItem}>
                        <div className={classNames(styles.featureIcon, styles.featureIconGit)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="6" y1="3" x2="6" y2="15" />
                                <circle cx="18" cy="6" r="3" />
                                <circle cx="6" cy="18" r="3" />
                                <path d="M18 9a9 9 0 0 1-9 9" />
                            </svg>
                        </div>
                        <div className={styles.featureText}>
                            <div className={styles.featureTitle}>
                                <FormattedMessage {...messages.featureGitTitle} />
                            </div>
                            <div className={styles.featureDesc}>
                                <FormattedMessage {...messages.featureGitDesc} />
                            </div>
                        </div>
                    </div>
                </div>

                <p className={styles.comingSoonLabel}>
                    <FormattedMessage {...messages.comingSoonLabel} />
                </p>

                <div className={styles.featureList}>
                    <div className={styles.featureItem}>
                        <div className={classNames(styles.featureIcon, styles.featureIconFriends)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div className={styles.featureText}>
                            <div className={styles.featureTitle}>
                                <FormattedMessage {...messages.featureFriendsTitle} />
                            </div>
                            <div className={styles.featureDesc}>
                                <FormattedMessage {...messages.featureFriendsDesc} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.buttonRow}>
                    <button
                        className={styles.laterButton}
                        onClick={onCancel}
                    >
                        <FormattedMessage {...messages.laterButton} />
                    </button>
                    <button
                        className={styles.continueButton}
                        onClick={handleContinue}
                    >
                        <FormattedMessage {...messages.continueButton} />
                    </button>
                </div>

                <p className={styles.footerNote}>
                    <FormattedMessage {...messages.footerNote} />
                </p>
            </Box>
        </Modal>
    );
};

BilupLoginModalComponent.propTypes = {
    intl: intlShape,
    visible: PropTypes.bool,
    onCancel: PropTypes.func,
    onContinue: PropTypes.func
};

BilupLoginModalComponent.defaultProps = {
    visible: false,
    onCancel: () => {},
    onContinue: null
};

const BilupLoginModal = injectIntl(BilupLoginModalComponent);

// 兼容两种使用方式：<BilupLoginModal visible={...} /> 或 <BilupLoginModal.WrappedComponent ... />
export default BilupLoginModal;
export {BilupLoginModalComponent};
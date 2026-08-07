import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {Activity, Cloud, GitBranch, Users} from 'lucide-react';

import Modal from '../../containers/windowed-modal.jsx';
import Box from '../box/box.jsx';
import {getRoturSessionApi} from '../../lib/rotur/session-api.js';
import styles from './rotur-login-modal.css';

const FEATURES = [
    {
        icon: Activity,
        titleId: 'mw.roturLogin.feature.editTitle',
        titleDefault: 'Show what you\'re editing',
        descId: 'mw.roturLogin.feature.editDesc',
        descDefault: 'Share Bilup activity on your Bilup Accounts profile.'
    },
    {
        icon: Cloud,
        titleId: 'mw.roturLogin.feature.cloudTitle',
        titleDefault: 'Cloud themes and settings',
        descId: 'mw.roturLogin.feature.cloudDesc',
        descDefault: 'Sync themes and settings across devices when signed in.'
    },
    {
        icon: GitBranch,
        titleId: 'mw.roturLogin.feature.gitTitle',
        titleDefault: 'Bilup Git in the Git window',
        descId: 'mw.roturLogin.feature.gitDesc',
        descDefault: 'Create repos on git.bilup.org, push your project, and clone others.'
    }
];

const COMING_SOON = [
    {
        icon: Users,
        titleId: 'mw.roturLogin.feature.friendsTitle',
        titleDefault: 'Friends and collab invites',
        descId: 'mw.roturLogin.feature.friendsDesc',
        descDefault: 'See online friends on Bilup and invite them to collab.'
    }
];

const messages = defineMessages({
    contentLabel: {id: 'mw.roturLogin.contentLabel', defaultMessage: 'Sign in with Bilup Accounts'},
    loggedInContentLabel: {id: 'mw.roturLogin.loggedInContentLabel', defaultMessage: 'Bilup Accounts in Bilup'},
    loggedInTitle: {id: 'mw.roturLogin.loggedInTitle', defaultMessage: 'Bilup Accounts in Bilup'},
    connectTitle: {id: 'mw.roturLogin.connectTitle', defaultMessage: 'Connect Bilup to Bilup Accounts'},
    subtitle: {
        id: 'mw.roturLogin.subtitle',
        defaultMessage: 'Sign in for presence, your profile picture, and cloud sync of themes and settings.'
    },
    loggedInSubtitle: {
        id: 'mw.roturLogin.loggedInSubtitle',
        defaultMessage: 'You are signed in as {username}. Below is what your account powers.'
    },
    unlockTitle: {id: 'mw.roturLogin.unlockTitle', defaultMessage: 'What you unlock'},
    comingSoonTitle: {id: 'mw.roturLogin.comingSoonTitle', defaultMessage: 'Coming soon'},
    notNow: {id: 'mw.roturLogin.notNow', defaultMessage: 'Not now'},
    continue: {id: 'mw.roturLogin.continue', defaultMessage: 'Continue with Bilup Accounts'},
    busyContinue: {id: 'mw.roturLogin.busyContinue', defaultMessage: 'Opening Bilup Accounts...'},
    close: {id: 'mw.roturLogin.close', defaultMessage: 'Close'},
    sessionNotReady: {id: 'mw.roturLogin.sessionNotReady', defaultMessage: 'Bilup Accounts session is not ready yet. Try again in a moment.'},
    footnote: {
        id: 'mw.roturLogin.footnote',
        defaultMessage: 'Secure sign-in on accounts.bilup.org. Your account powers presence, cloud sync, and Bilup Git.'
    }
});

const FeatureRow = ({icon: Icon, intl, titleId, titleDefault, descId, descDefault, comingSoon}) => (
    <li className={comingSoon ? styles.featureComing : styles.feature}>
        <div className={styles.featureIcon}>
            <Icon />
        </div>
        <div className={styles.featureText}>
            <p className={styles.featureTitle}>
                {intl.formatMessage({id: titleId, defaultMessage: titleDefault})}
            </p>
            <p className={styles.featureDesc}>
                {intl.formatMessage({id: descId, defaultMessage: descDefault})}
            </p>
        </div>
    </li>
);

FeatureRow.propTypes = {
    icon: PropTypes.elementType.isRequired,
    intl: intlShape.isRequired,
    titleId: PropTypes.string.isRequired,
    titleDefault: PropTypes.string.isRequired,
    descId: PropTypes.string.isRequired,
    descDefault: PropTypes.string.isRequired,
    comingSoon: PropTypes.bool
};

class RoturLoginModal extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            busy: false,
            localError: null
        };
        this.handleLogin = this.handleLogin.bind(this);
    }

    async handleLogin () {
        if (this.state.busy) return;
        this.setState({busy: true, localError: null});
        try {
            const api = getRoturSessionApi();
            if (!api || typeof api.login !== 'function') {
                throw new Error(this.props.intl.formatMessage(messages.sessionNotReady));
            }
            await api.login();
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            this.setState({localError: message});
        } finally {
            this.setState({busy: false});
        }
    }

    render () {
        const error = this.state.localError || this.props.error;
        const busy = this.state.busy || this.props.status === 'logging-in';
        const loggedIn = Boolean(this.props.username);
        const intl = this.props.intl;

        return (
            <Modal
                className={styles.modalContent}
                contentLabel={loggedIn ? intl.formatMessage(messages.loggedInContentLabel) : intl.formatMessage(messages.contentLabel)}
                headerClassName={styles.header}
                id="roturLoginModal"
                onRequestClose={this.props.onRequestClose}
                resizable
                maximizable={false}
                width={440}
                height={480}
                minHeight={320}
                minWidth={320}
            >
                <Box className={styles.body}>
                    <div className={styles.hero}>
                        <img
                            alt=""
                            className={styles.logo}
                            draggable={false}
                            src="https://accounts.bilup.org/logo.png"
                        />
                        <div className={styles.heroText}>
                            <h2 className={styles.title}>
                                {intl.formatMessage(loggedIn ? messages.loggedInTitle : messages.connectTitle)}
                            </h2>
                            <p className={styles.subtitle}>
                                {loggedIn ?
                                    intl.formatMessage(messages.loggedInSubtitle, {username: this.props.username}) :
                                    intl.formatMessage(messages.subtitle)}
                            </p>
                        </div>
                    </div>

                    <p className={styles.sectionLabel}>{intl.formatMessage(messages.unlockTitle)}</p>

                    <ul className={styles.featureList}>
                        {FEATURES.map((feature, index) => (
                            <FeatureRow
                                key={`feature-${index}`}
                                icon={feature.icon}
                                intl={intl}
                                titleId={feature.titleId}
                                titleDefault={feature.titleDefault}
                                descId={feature.descId}
                                descDefault={feature.descDefault}
                            />
                        ))}
                    </ul>

                    <p className={styles.sectionLabel}>{intl.formatMessage(messages.comingSoonTitle)}</p>

                    <ul className={styles.featureList}>
                        {COMING_SOON.map((feature, index) => (
                            <FeatureRow
                                key={`coming-${index}`}
                                icon={feature.icon}
                                intl={intl}
                                titleId={feature.titleId}
                                titleDefault={feature.titleDefault}
                                descId={feature.descId}
                                descDefault={feature.descDefault}
                                comingSoon
                            />
                        ))}
                    </ul>

                    {error ? (
                        <p className={styles.error}>{error}</p>
                    ) : null}

                    <div className={styles.actions}>
                        {loggedIn ? (
                            <button
                                className={`${styles.button} ${styles.primary}`}
                                onClick={this.props.onRequestClose}
                                type="button"
                            >
                                {intl.formatMessage(messages.close)}
                            </button>
                        ) : (
                            <React.Fragment>
                                <button
                                    className={`${styles.button} ${styles.secondary}`}
                                    onClick={this.props.onRequestClose}
                                    type="button"
                                >
                                    {intl.formatMessage(messages.notNow)}
                                </button>
                                <button
                                    className={`${styles.button} ${styles.primary}`}
                                    disabled={busy}
                                    onClick={this.handleLogin}
                                    type="button"
                                >
                                    {busy ?
                                        intl.formatMessage(messages.busyContinue) :
                                        intl.formatMessage(messages.continue)}
                                </button>
                            </React.Fragment>
                        )}
                    </div>

                    <p className={styles.footnote}>
                        {intl.formatMessage(messages.footnote)}
                    </p>
                </Box>
            </Modal>
        );
    }
}

RoturLoginModal.propTypes = {
    error: PropTypes.string,
    intl: intlShape.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    status: PropTypes.string,
    username: PropTypes.string
};

const mapStateToProps = state => ({
    error: state.scratchGui.rotur.error,
    status: state.scratchGui.rotur.status,
    username: state.scratchGui.rotur.username
});

export default connect(mapStateToProps)(injectIntl(RoturLoginModal));

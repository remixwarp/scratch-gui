import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {AlertTriangle} from 'lucide-react';

import styles from './info-window.css';

const messages = defineMessages({
    heading: {
        id: 'mw.info.heading',
        defaultMessage: 'About RemixWarp'
    },
    warningText: {
        id: 'mw.info.warningText',
        defaultMessage: 'Sign-in and other auxiliary features are synced from github.com/bilup.'
    },
    sectionTitle: {
        id: 'mw.info.sectionTitle',
        defaultMessage: 'Description'
    },
    paragraph1: {
        id: 'mw.info.paragraph1',
        defaultMessage:
            'Sign-in and other auxiliary features are synced from github.com/bilup. For any bugs related to these features and their accessories, please first reproduce them on https://com.bilup.org/editor and confirm it is indeed a RemixWarp-only bug before submitting a report to us.'
    },
    paragraph2: {
        id: 'mw.info.paragraph2',
        defaultMessage:
            'All usage and feedback of these features and accessories are provided by the source code at github.com/bilup (except for this notice). For any operation that asks you to do things including but not limited to information collection, payment, etc., RemixWarp will not store or save anything (everything you pay on it goes directly to the Bilup team\'s wallet).'
    },
    usageSectionTitle: {
        id: 'mw.info.usageSectionTitle',
        defaultMessage: 'Usage'
    },
    usageParagraph1: {
        id: 'mw.info.usageParagraph1',
        defaultMessage: 'RemixWarp may differ from Bilup when using this feature or its accessories.'
    },
    usageParagraph2: {
        id: 'mw.info.usageParagraph2',
        defaultMessage:
            'In the editor, signing in to your account and viewing the "My Stuff" and "Notifications" pages use two separate sign-in mechanisms, which do not exist on Bilup, so you need to sign in twice (please do not be surprised).'
    },
    usageParagraph3: {
        id: 'mw.info.usageParagraph3',
        defaultMessage: 'Otherwise, the usage may not differ.'
    }
});

const InfoWindow = () => (
    <div className={styles.root}>
        <h2 className={styles.heading}>
            <FormattedMessage {...messages.heading} />
        </h2>

        <div className={styles.warning} role="alert">
            <AlertTriangle className={styles.warningIcon} aria-hidden="true" />
            <div className={styles.warningText}>
                <FormattedMessage {...messages.warningText} />
            </div>
        </div>

        <h3 className={styles.sectionTitle}>
            <FormattedMessage {...messages.sectionTitle} />
        </h3>

        <div className={styles.body}>
            <p>
                <FormattedMessage
                    {...messages.paragraph1}
                    values={{
                        link: (
                            <a
                                className={styles.link}
                                href="https://com.bilup.org/editor"
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                https://com.bilup.org/editor
                            </a>
                        )
                    }}
                />
            </p>
            <p>
                <FormattedMessage
                    {...messages.paragraph2}
                    values={{
                        bilup: (
                            <a
                                className={styles.link}
                                href="https://github.com/bilup"
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                github.com/bilup
                            </a>
                        )
                    }}
                />
            </p>
        </div>

        <h3 className={styles.sectionTitle}>
            <FormattedMessage {...messages.usageSectionTitle} />
        </h3>

        <div className={styles.body}>
            <p>
                <FormattedMessage {...messages.usageParagraph1} />
            </p>
            <div className={styles.usageWarning} role="alert">
                <AlertTriangle className={styles.warningIcon} aria-hidden="true" />
                <div className={styles.warningText}>
                    <FormattedMessage {...messages.usageParagraph2} />
                </div>
            </div>
            <p>
                <FormattedMessage {...messages.usageParagraph3} />
            </p>
        </div>
    </div>
);

InfoWindow.propTypes = {
    intl: intlShape
};

export default injectIntl(InfoWindow);

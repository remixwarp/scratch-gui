import React, {useState} from 'react';
import {FormattedMessage} from 'react-intl';
import {Link} from 'react-router-dom';
import {FlaskConical, X} from 'lucide-react';
import {useIntl} from '../../lib/tw-use-intl.jsx';
import styles from './BetaBanner.module.css';

const DISMISS_KEY = 'mw:beta-banner-dismissed';

const wasDismissed = () => {
    try {
        return localStorage.getItem(DISMISS_KEY) === 'true';
    } catch (e) {
        return false;
    }
};

const BetaBanner = () => {
    const intl = useIntl();
    const [dismissed, setDismissed] = useState(wasDismissed);
    if (dismissed) {
        return null;
    }
    const dismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(DISMISS_KEY, 'true');
        } catch (e) {
            return;
        }
    };
    return (
        <div className={styles.banner}>
            <FlaskConical
                size={15}
                className={styles.icon}
            />
            <span className={styles.text}>
                <FormattedMessage
                    defaultMessage="The new Bilup is a beta. Expect bugs, and please report them via {mailto}."
                    id="mw.community.betaBanner.text"
                    values={{
                        mailto: <a href="mailto:support@bilup.org">support@bilup.org</a>
                    }}
                />
            </span>
            <button
                className={styles.dismiss}
                aria-label={intl.formatMessage({id: 'mw.community.betaBanner.dismiss', defaultMessage: 'Dismiss'})}
                onClick={dismiss}
            >
                <X size={15} />
            </button>
        </div>
    );
};

export default BetaBanner;

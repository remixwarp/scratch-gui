import React from 'react';
import {Link} from 'react-router-dom';
import {useIntl} from '../../lib/tw-use-intl.jsx';
import {ShieldAlert} from 'lucide-react';
import {useUser} from '../UserContext.jsx';
import styles from './StandingBanner.module.css';

const MESSAGE_KEYS = {
    warning: 'mw.community.standing.warning',
    suspended: 'mw.community.standing.suspended'
};

const StandingBanner = () => {
    const intl = useIntl();
    const t = (id, defaultMessage, values) => intl.formatMessage({id, defaultMessage}, values);
    const {user, banMessage, dismissBan} = useUser();
    if (banMessage) {
        return (
            <div className={styles.banner}>
                <ShieldAlert
                    className={styles.icon}
                    size={16}
                />
                <span className={styles.text}>{banMessage}</span>
                <button
                    type="button"
                    className={styles.link}
                    onClick={dismissBan}
                >{t('mw.community.standing.dismiss', 'Dismiss')}</button>
            </div>
        );
    }
    if (!user || !user.standing || user.standing === 'good') {
        return null;
    }
    const messageKey = MESSAGE_KEYS[user.standing];
    if (!messageKey) {
        return null;
    }
    const message = t(messageKey,
        user.standing === 'suspended' ?
            'Your account is suspended. You cannot share projects or comment right now.' :
            'Your account has a warning. Please review the community guidelines.');
    return (
        <div className={styles.banner}>
            <ShieldAlert
                className={styles.icon}
                size={16}
            />
            <span className={styles.text}>{message}</span>
            <Link
                to="/notifications"
                className={styles.link}
            >{t('mw.community.standing.seeDetails', 'See details')}</Link>
        </div>
    );
};

export default StandingBanner;

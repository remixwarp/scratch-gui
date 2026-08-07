import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {Bell} from 'lucide-react';

import menuBarStyles from './menu-bar.css';
import styles from './mw-notifications.css';
import openMistWarpCommunityWindow from '../../lib/mw/open-mw-community-window.jsx';
import NotificationsPage from '../../community/pages/Notifications.jsx';
import api from '../../community/api.js';
import {useIntl} from '../../lib/tw-use-intl.jsx';

const openNotifications = title => openMistWarpCommunityWindow({
    id: 'mw-notifications-window',
    title,
    initialPath: '/notifications',
    element: <NotificationsPage hideHeading />,
    width: 460,
    height: 640
});

const MwNotifications = ({username}) => {
    const intl = useIntl();
    const [unread, setUnread] = React.useState(0);

    React.useEffect(() => {
        if (!username) {
            setUnread(0);
            return () => {};
        }
        let stale = false;
        api.notifications()
            .then(data => {
                if (!stale) {
                    setUnread((data.notifications || []).filter(n => !n.read).length);
                }
            })
            .catch(() => {});
        const onRead = () => setUnread(0);
        window.addEventListener('mw:notifications-read', onRead);
        return () => {
            stale = true;
            window.removeEventListener('mw:notifications-read', onRead);
        };
    }, [username]);

    if (!username) {
        return null;
    }

    const notificationsTitle = intl.formatMessage({
        id: 'mw.menuBar.notifications',
        defaultMessage: 'Notifications'
    });
    const notificationsUnread = intl.formatMessage({
        id: 'mw.menuBar.notificationsUnread',
        defaultMessage: 'Notifications ({count} unread)'
    }, {count: unread});
    const handleKeyDown = e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openNotifications(notificationsTitle);
        }
    };

    return (
        <div
            className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable)}
            title={notificationsTitle}
            aria-label={unread > 0 ? notificationsUnread : notificationsTitle}
            role="button"
            tabIndex={0}
            onClick={() => openNotifications(notificationsTitle)}
            onKeyDown={handleKeyDown}
        >
            <span className={styles.bellWrap}>
                <Bell size={18} />
                {unread > 0 ? (
                    <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>
                ) : null}
            </span>
        </div>
    );
};

MwNotifications.propTypes = {
    username: PropTypes.string
};

export default connect(state => ({
    username: state.scratchGui.rotur.username
}))(MwNotifications);

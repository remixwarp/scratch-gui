import React from 'react';
import PropTypes from 'prop-types';
import {FolderOpen, Bell} from 'lucide-react';
import {useIntl} from '../../lib/tw-use-intl.jsx';

import menuBarStyles from './menu-bar.css';

const NavItem = ({title, icon: Icon, url}) => (
    <a
        className={menuBarStyles.menuBarItem}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        aria-label={title}
    >
        <Icon size={18} />
    </a>
);

NavItem.propTypes = {
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired
};

const MwEditorNav = () => {
    const intl = useIntl();
    const myStuffTitle = intl.formatMessage({
        id: 'mw.menuBar.myStuff',
        defaultMessage: 'My Stuff'
    });
    const notificationsTitle = intl.formatMessage({
        id: 'mw.menuBar.notifications',
        defaultMessage: 'Notifications'
    });
    return (
        <React.Fragment>
            <NavItem
                title={myStuffTitle}
                icon={FolderOpen}
                url="https://editor.bilup.org/mystuff"
            />
            <NavItem
                title={notificationsTitle}
                icon={Bell}
                url="https://editor.bilup.org/notifications"
            />
        </React.Fragment>
    );
};

export default MwEditorNav;

import React from 'react';
import PropTypes from 'prop-types';
import {FolderOpen, Bell} from 'lucide-react';
import {useIntl} from '../../lib/tw-use-intl.jsx';

import menuBarStyles from './menu-bar.css';

const openCommunityWindow = async (id, title, url) => {
    let WindowManager;
    try {
        const module = await import('../../addons/window-system/window-manager.js');
        WindowManager = module.default;
    } catch (e) {
        // Window manager not available: fall back to a new tab.
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
    }

    const existing = WindowManager.getWindow(id);
    if (existing && !existing.isClosed()) {
        existing.bringToFront();
        existing.focus();
        return;
    }

    const win = WindowManager.createWindow({
        id,
        title,
        width: 1100,
        height: 720,
        minWidth: 600,
        minHeight: 400,
        resizable: true,
        maximizable: true,
        closable: true,
        className: 'mw-community-window'
    });

    const container = win.getContentElement();
    container.style.padding = '0';
    container.style.overflow = 'hidden';

    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '0 0 8px 8px';
    iframe.src = url;
    container.appendChild(iframe);

    win.show();
};

const NavItem = ({title, icon: Icon, onClick}) => (
    <div
        className={menuBarStyles.menuBarItem}
        title={title}
        aria-label={title}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }}
    >
        <Icon size={18} />
    </div>
);

NavItem.propTypes = {
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired
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
                onClick={() => openCommunityWindow(
                    'mw-mystuff-window',
                    myStuffTitle,
                    'https://editor.bilup.org/mystuff'
                )}
            />
            <NavItem
                title={notificationsTitle}
                icon={Bell}
                onClick={() => openCommunityWindow(
                    'mw-notifications-window',
                    notificationsTitle,
                    'https://editor.bilup.org/notifications'
                )}
            />
        </React.Fragment>
    );
};

export default MwEditorNav;

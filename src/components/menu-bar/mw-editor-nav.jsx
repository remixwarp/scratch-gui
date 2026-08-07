import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {FolderOpen} from 'lucide-react';

import menuBarStyles from './menu-bar.css';
import MwNotifications from './mw-notifications.jsx';
import MyStuffPage from '../../community/pages/MyStuff.jsx';
import openMistWarpCommunityWindow from '../../lib/mw/open-mw-community-window.jsx';
import {useIntl} from '../../lib/tw-use-intl.jsx';

const openMyStuff = title => openMistWarpCommunityWindow({
    id: 'mw-mystuff-window',
    title,
    initialPath: '/mystuff',
    element: <MyStuffPage />
});

const NavItem = ({title, icon: Icon, onClick}) => {
    const handleKeyDown = e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };
    return (
        <div
            className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable)}
            title={title}
            aria-label={title}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={handleKeyDown}
        >
            <Icon size={18} />
        </div>
    );
};

NavItem.propTypes = {
    icon: PropTypes.elementType.isRequired,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired
};

const MwEditorNav = ({username}) => {
    const intl = useIntl();
    if (!username) {
        return null;
    }
    const myStuffTitle = intl.formatMessage({
        id: 'mw.menuBar.myStuff',
        defaultMessage: 'My Stuff'
    });
    return (
        <React.Fragment>
            <NavItem
                title={myStuffTitle}
                icon={FolderOpen}
                onClick={() => openMyStuff(myStuffTitle)}
            />
            <MwNotifications />
        </React.Fragment>
    );
};

MwEditorNav.propTypes = {
    username: PropTypes.string
};

export default connect(state => ({
    username: state.scratchGui.rotur.username
}))(MwEditorNav);

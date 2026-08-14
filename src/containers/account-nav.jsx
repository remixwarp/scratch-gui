/*
NOTE: this file only temporarily resides in scratch-gui.
Nearly identical code appears in scratch-www, and the two should
eventually be consolidated.

Updated with Bilup Accounts integration.
*/

import {injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import AccountNavComponent from '../components/menu-bar/account-nav.jsx';
import {
    getCurrentUser, switchAccount, logout
} from '../lib/community/api.js';
import {saveToBilup} from '../lib/mw/smart-save.js';

const AccountNav = function (props) {
    const {
        /* eslint-disable no-unused-vars */
        vm,
        projectTitle,
        onSaved,
        /* eslint-enable no-unused-vars */
        ...componentProps
    } = props;
    return (
        <AccountNavComponent
            {...componentProps}
        />
    );
};

AccountNav.propTypes = {
    classroomId: PropTypes.string,
    isEducator: PropTypes.bool,
    isRtl: PropTypes.bool,
    isStudent: PropTypes.bool,
    profileUrl: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    username: PropTypes.string,
    onSwitchAccount: PropTypes.func,
    onLogOut: PropTypes.func
};

const mapStateToProps = state => {
    // Try to get user from Redux session (legacy), fall back to Bilup Accounts localStorage
    const reduxUser = state.session && state.session.session && state.session.session.user;
    const bilupUser = getCurrentUser();
    const user = reduxUser || bilupUser;

    return {
        classroomId: user ? user.classroomId || '' : '',
        isEducator: (state.session && state.session.permissions && state.session.permissions.educator) || false,
        isStudent: (state.session && state.session.permissions && state.session.permissions.student) || false,
        profileUrl: user ? (`https://com.bilup.org/users/${user.username}`) : '',
        thumbnailUrl: user ? (user.thumbnailUrl || user.avatar || null) : null,
        username: user ? (user.username || user.displayName || '') : ''
    };
};

const mapDispatchToProps = (dispatch, ownProps) => ({
    onSwitchAccount: async () => {
        await switchAccount();
        if (window.location) {
            window.location.reload();
        }
    },
    onLogOut: async () => {
        await logout();
        if (window.location) {
            window.location.reload();
        }
    },
    onSaveToBilup: async () => {
        const {vm, projectTitle} = ownProps;
        if (!vm) {
            console.warn('No VM available for saveToBilup');
            return;
        }
        try {
            await saveToBilup({
                vm,
                title: projectTitle || '',
                onSaved: (result) => {
                    if (ownProps.onSaved) {
                        ownProps.onSaved(result);
                    }
                }
            });
        } catch (e) {
            console.error('Save to Bilup failed:', e);
        }
    }
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(AccountNav));

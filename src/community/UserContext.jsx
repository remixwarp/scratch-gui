import React, {createContext, useContext, useState, useCallback} from 'react';
import {applyThemeVisuals, detectTheme} from '../lib/themes/themePersistance.js';
import {customThemeManager} from '../lib/themes/custom-themes.js';

const UserContext = createContext({user: null, login: () => {}, logout: () => {}});

const normalizeUser = user => user && {...user, isAdmin: user.isAdmin === true};

const UserProvider = ({children}) => {
    // Bilup Accounts 登录已移除：用户态恒为未登录（本地/匿名）。
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [banMessage, setBanMessage] = useState(null);

    const login = useCallback(async () => {
        // 登录已移除，保持空操作。
    }, []);

    const logout = useCallback(async () => {
        // 登录已移除，保持空操作。
    }, []);

    return (
        <UserContext.Provider value={{user, loading, login, logout, banMessage, dismissBan: () => setBanMessage(null)}}>
            {children}
        </UserContext.Provider>
    );
};

const useUser = () => useContext(UserContext);

export {UserProvider, useUser, normalizeUser};

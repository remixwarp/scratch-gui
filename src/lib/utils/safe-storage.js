/**
 * Safe wrappers around localStorage.
 *
 * Accessing localStorage can throw in privacy modes, when storage is
 * disabled, or when the quota is exceeded. Every direct call site in the
 * app should go through these helpers so a single missing try/catch can
 * never take down the whole GUI.
 */

const getItem = (key, fallback = null) => {
    try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch (e) {
        void e;
        return fallback;
    }
};

const setItem = (key, value) => {
    try {
        window.localStorage.setItem(key, value);
        return true;
    } catch (e) {
        void e;
        return false;
    }
};

const removeItem = key => {
    try {
        window.localStorage.removeItem(key);
    } catch (e) {
        void e;
    }
};

export {
    getItem,
    setItem,
    removeItem
};
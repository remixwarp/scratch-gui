import {getDefaultAuthor, setDefaultAuthor} from './browser-git';
import {getItem as getStorageItem} from '../utils/safe-storage.js';

const DEFAULT_BRANCH_KEY = 'mw:git-default-branch';
const AUTO_COMMIT_KEY = 'mw:git-auto-commit';

const readLocal = (key, fallback) => {
    try {
        const value = getStorageItem(key);
        return value === null ? fallback : value;
    } catch (e) {
        return fallback;
    }
};

const writeLocal = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        // ignore
    }
};

const getAuthorName = () => getDefaultAuthor().name;
const getAuthorEmail = () => getDefaultAuthor().email;

const setAuthorName = name => {
    const author = getDefaultAuthor();
    setDefaultAuthor({name, email: author.email});
};

const setAuthorEmail = email => {
    const author = getDefaultAuthor();
    setDefaultAuthor({name: author.name, email});
};

const getDefaultBranch = () => readLocal(DEFAULT_BRANCH_KEY, 'main');
const setDefaultBranch = branch => writeLocal(DEFAULT_BRANCH_KEY, branch);

const getAutoCommit = () => readLocal(AUTO_COMMIT_KEY, true);
const setAutoCommit = value => writeLocal(AUTO_COMMIT_KEY, !!value);

export {
    getAuthorName,
    getAuthorEmail,
    setAuthorName,
    setAuthorEmail,
    getDefaultBranch,
    setDefaultBranch,
    getAutoCommit,
    setAutoCommit
};

const getDefaultAuthor = () => {
    try {
        const saved = JSON.parse(localStorage.getItem('mw:git-author') || 'null');
        if (saved && typeof saved.name === 'string' && typeof saved.email === 'string') {
            return saved;
        }
    } catch (e) {
        // ignore
    }
    return {name: 'User', email: 'user@example.com'};
};

const setDefaultAuthor = author => {
    try {
        localStorage.setItem('mw:git-author', JSON.stringify(author));
    } catch (e) {
        // ignore
    }
};

export {
    getDefaultAuthor,
    setDefaultAuthor
};

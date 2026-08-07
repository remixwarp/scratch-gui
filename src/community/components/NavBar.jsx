import React, {useState, useEffect, useRef} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {FormattedMessage} from 'react-intl';
import {useIntl} from '../../lib/tw-use-intl.jsx';
import {Search, Compass, Plus, FolderOpen, Bell, LogIn, ShieldCheck, Wallet} from 'lucide-react';
import {useUser} from '../UserContext.jsx';
import api, {editorUrl} from '../api';
import logo from '../assets/bilup-logo.svg';
import Avatar from './Avatar.jsx';
import setFaviconBadge from '../faviconBadge';
import ProjectThumbnail from './ProjectThumbnail.jsx';
import {RoturAccount} from '../../components/menu-bar/mw-rotur-account.jsx';
import styles from './NavBar.module.css';

const NavBar = () => {
    const {user, loading, login, logout} = useUser();
    const intl = useIntl();
    const [loginError, setLoginError] = useState('');
    const [signingIn, setSigningIn] = useState(false);
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [projectSuggestions, setProjectSuggestions] = useState([]);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const [openReports, setOpenReports] = useState(0);
    const navigate = useNavigate();
    const searchRef = useRef(null);

    useEffect(() => {
        if (!user) {
            setUnread(0);
            setOpenReports(0);
            return;
        }
        let stale = false;
        const refresh = () => {
            if (document.hidden) return;
            api.notifications()
                .then(data => {
                    if (!stale) setUnread((data.notifications || []).filter(n => !n.read).length);
                })
                .catch(() => {});
            if (user.isAdmin) {
                api.admin.reports()
                    .then(data => {
                        if (!stale) setOpenReports((data.reports || []).filter(r => !r.resolved).length);
                    })
                    .catch(() => {});
            }
        };
        refresh();
        const timer = setInterval(refresh, 300000);
        const onRead = () => setUnread(0);
        window.addEventListener('mw:notifications-read', onRead);
        window.addEventListener('mw:reports-updated', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            stale = true;
            clearInterval(timer);
            window.removeEventListener('mw:notifications-read', onRead);
            window.removeEventListener('mw:reports-updated', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [user]);

    useEffect(() => {
        setFaviconBadge(unread > 0);
    }, [unread]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setSuggestions([]);
            setProjectSuggestions([]);
            return;
        }
        let stale = false;
        const timer = setTimeout(() => {
            Promise.all([
                api.searchUsers(q).catch(() => ({users: []})),
                api.explore({q, limit: 5}).catch(() => ({projects: []}))
            ]).then(([u, p]) => {
                if (stale) return;
                setSuggestions(u.users || []);
                setProjectSuggestions(p.projects || []);
            });
        }, 200);
        return () => {
            stale = true;
            clearTimeout(timer);
        };
    }, [query]);

    useEffect(() => {
        const close = event => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSuggestionsOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const submitSearch = event => {
        event.preventDefault();
        setSuggestionsOpen(false);
        navigate(`/explore?q=${encodeURIComponent(query)}`);
    };

    const doLogin = async () => {
        if (signingIn) return;
        setLoginError('');
        setSigningIn(true);
        try {
            await login();
        } catch (e) {
            if (e && e.code === 'banned') {
                // handled by the global ban banner
            } else {
                setLoginError(
                    e && /popup|blocked|window/i.test(String(e.message || '')) ?
                        intl.formatMessage({
                            id: 'mw.community.nav.signInBlocked',
                            defaultMessage: 'Sign-in window was blocked. Allow popups for this site and try again.'
                        }) :
                        (e && e.message) || intl.formatMessage({
                            id: 'mw.community.nav.signInFailed',
                            defaultMessage: 'Sign-in did not complete. Please try again.'
                        })
                );
            }
        } finally {
            setSigningIn(false);
        }
    };

    const goToProfile = name => {
        setSuggestionsOpen(false);
        setQuery('');
        navigate(`/users/${name}`);
    };

    const goToProject = id => {
        setSuggestionsOpen(false);
        setQuery('');
        navigate(`/project/${id}`);
    };

    return (
        <header className={styles.bar}>
            <div className={styles.inner}>
                <Link
                    to="/"
                    className={styles.brand}
                >
                    <img
                        className={styles.logo}
                        src={logo}
                        alt=""
                    />
                    <span className={styles.wordmark}>Bilup</span>
                </Link>

                <nav className={styles.links}>
                    <a
                        href={editorUrl()}
                        className={styles.link}
                    >
                        <Plus size={17} />
                        <span className={styles.linkLabel}>
                            <FormattedMessage
                                defaultMessage="Create"
                                description="NavBar link to the editor"
                                id="mw.community.nav.create"
                            />
                        </span>
                    </a>
                    <Link
                        to="/explore"
                        className={styles.link}
                    >
                        <Compass size={17} />
                        <span className={styles.linkLabel}>
                            <FormattedMessage
                                defaultMessage="Explore"
                                description="NavBar link to explore projects"
                                id="mw.community.nav.explore"
                            />
                        </span>
                    </Link>
                </nav>

                <form
                    className={styles.search}
                    onSubmit={submitSearch}
                    ref={searchRef}
                >
                    <Search
                        size={17}
                        className={styles.searchIcon}
                    />
                    <input
                        className={styles.searchInput}
                        placeholder={intl.formatMessage({
                            id: 'mw.community.nav.searchPlaceholder',
                            defaultMessage: 'Search projects and people'
                        })}
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setSuggestionsOpen(true);
                        }}
                        onFocus={() => setSuggestionsOpen(true)}
                    />
                    {suggestionsOpen && (suggestions.length || projectSuggestions.length) ? (
                        <div className={styles.suggestions}>
                            {projectSuggestions.map(project => (
                                <button
                                    key={project.id}
                                    type="button"
                                    className={styles.suggestion}
                                    onClick={() => goToProject(project.id)}
                                >
                                    <ProjectThumbnail
                                        project={project}
                                        className={styles.suggestionThumb}
                                        fallbackClassName={styles.suggestionThumbFallback}
                                    />
                                    <span>{project.title}</span>
                                    <span className={styles.suggestionMeta}>
                                        <FormattedMessage
                                            defaultMessage="by {owner}"
                                            description="Project suggestion attribution"
                                            id="mw.community.nav.byUser"
                                            values={{owner: project.owner}}
                                        />
                                    </span>
                                </button>
                            ))}
                            {suggestions.map(person => (
                                <button
                                    key={person.username}
                                    type="button"
                                    className={styles.suggestion}
                                    onClick={() => goToProfile(person.username)}
                                >
                                    <Avatar
                                        username={person.username}
                                        size={26}
                                    />
                                    <span>{person.username}</span>
                                    <span className={styles.suggestionMeta}>
                                        <FormattedMessage
                                            defaultMessage="{followers} followers · {projects} projects"
                                            description="User search suggestion follower and project counts"
                                            id="mw.community.nav.followersProjects"
                                            values={{followers: person.followers ?? 0, projects: person.projects}}
                                        />
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </form>

                <div className={styles.account}>
                    {user ? (
                        <>
                            {user.isAdmin ? (
                                <Link
                                    to="/admin"
                                    className={`${styles.iconLink} ${styles.bellLink}`}
                                    title={intl.formatMessage({id: 'mw.community.nav.admin', defaultMessage: 'Admin'})}
                                    aria-label={openReports > 0 ?
                                        intl.formatMessage({
                                            id: 'mw.community.nav.adminReports',
                                            defaultMessage: 'Admin ({count} open reports)'
                                        }, {count: openReports}) :
                                        intl.formatMessage({id: 'mw.community.nav.admin', defaultMessage: 'Admin'})}
                                >
                                    <ShieldCheck size={19} />
                                    {openReports > 0 ? (
                                        <span className={styles.bellBadge}>{openReports > 9 ? '9+' : openReports}</span>
                                    ) : null}
                                </Link>
                            ) : null}
                            <Link
                                to="/mystuff"
                                className={styles.iconLink}
                                title={intl.formatMessage({id: 'mw.community.nav.myStuff', defaultMessage: 'My stuff'})}
                                aria-label={intl.formatMessage({id: 'mw.community.nav.myStuff', defaultMessage: 'My stuff'})}
                            >
                                <FolderOpen size={19} />
                            </Link>
                            <Link
                                to="/wallet"
                                className={styles.iconLink}
                                title={intl.formatMessage({id: 'mw.community.nav.wallet', defaultMessage: 'Wallet'})}
                                aria-label={intl.formatMessage({id: 'mw.community.nav.wallet', defaultMessage: 'Wallet'})}
                            >
                                <Wallet size={19} />
                            </Link>
                            <Link
                                to="/notifications"
                                className={`${styles.iconLink} ${styles.bellLink}`}
                                title={intl.formatMessage({id: 'mw.community.nav.notifications', defaultMessage: 'Notifications'})}
                                aria-label={unread > 0 ?
                                    intl.formatMessage({
                                        id: 'mw.community.nav.notificationsUnread',
                                        defaultMessage: 'Notifications ({count} unread)'
                                    }, {count: unread}) :
                                    intl.formatMessage({id: 'mw.community.nav.notifications', defaultMessage: 'Notifications'})}
                            >
                                <Bell size={19} />
                                {unread > 0 ? (
                                    <span className={styles.bellBadge}>{unread > 9 ? '9+' : unread}</span>
                                ) : null}
                            </Link>
                            <RoturAccount
                                username={user.username}
                                menuOpen={accountOpen}
                                showEditorItems={false}
                                onOpenMenu={() => setAccountOpen(true)}
                                onCloseMenu={() => setAccountOpen(false)}
                                onOpenLogin={doLogin}
                                onLogout={logout}
                            />
                        </>
                    ) : loading ? null : (
                        <button
                            className={styles.signIn}
                            onClick={doLogin}
                            disabled={signingIn}
                            title={intl.formatMessage({id: 'mw.community.nav.signIn', defaultMessage: 'Sign in'})}
                            aria-label={intl.formatMessage({id: 'mw.community.nav.signIn', defaultMessage: 'Sign in'})}
                        >
                            <LogIn size={19} />
                        </button>
                    )}
                </div>
            </div>
            {loginError ? (
                <div
                    className={styles.loginError}
                    role="alert"
                >
                    <span>{loginError}</span>
                    <button
                        className={styles.loginErrorClose}
                        onClick={() => setLoginError('')}
                        aria-label={intl.formatMessage({id: 'mw.community.nav.dismiss', defaultMessage: 'Dismiss'})}
                    >×</button>
                </div>
            ) : null}
        </header>
    );
};

export default NavBar;

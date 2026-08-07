import React from 'react';
import {Link} from 'react-router-dom';
import {FormattedMessage} from 'react-intl';
import {Github} from 'lucide-react';
import {editorUrl} from '../api';
import logo from '../assets/bilup-logo.svg';
import styles from './Footer.module.css';

const Footer = () => (
    <footer className={styles.footer}>
        <div className={styles.inner}>
            <div className={styles.brand}>
                <img
                    className={styles.logo}
                    src={logo}
                    alt=""
                />
                <div>
                    <span className={styles.wordmark}>Bilup</span>
                    <p className={styles.tagline}>
                        <FormattedMessage
                            defaultMessage="Build, share, and remix projects together."
                            description="Footer tagline"
                            id="mw.community.footer.tagline"
                        />
                    </p>
                </div>
            </div>

            <div className={styles.columns}>
                <div className={styles.column}>
                    <span className={styles.columnTitle}>
                        <FormattedMessage
                            defaultMessage="Create"
                            description="Footer column title"
                            id="mw.community.nav.create"
                        />
                    </span>
                    <a href={editorUrl()}>
                        <FormattedMessage
                            defaultMessage="Editor"
                            description="Footer link to the editor"
                            id="mw.community.footer.editor"
                        />
                    </a>
                    <Link to="/mystuff">
                        <FormattedMessage
                            defaultMessage="My stuff"
                            description="Footer link to user projects"
                            id="mw.community.nav.myStuff"
                        />
                    </Link>
                </div>
                <div className={styles.column}>
                    <span className={styles.columnTitle}>
                        <FormattedMessage
                            defaultMessage="Community"
                            description="Footer column title"
                            id="mw.community.footer.community"
                        />
                    </span>
                    <Link to="/explore">
                        <FormattedMessage
                            defaultMessage="Explore"
                            description="Footer link to explore"
                            id="mw.community.nav.explore"
                        />
                    </Link>
                    <Link to="/leaderboard">
                        <FormattedMessage
                            defaultMessage="Leaderboard"
                            description="Footer link to the leaderboard"
                            id="mw.community.footer.leaderboard"
                        />
                    </Link>
                    <Link to="/news">
                        <FormattedMessage
                            defaultMessage="News"
                            description="Footer link to news"
                            id="mw.community.footer.news"
                        />
                    </Link>
                    <a href="mailto:support@bilup.org">
                        <FormattedMessage
                            defaultMessage="Report a bug"
                            description="Footer link to report a bug"
                            id="mw.community.footer.reportBug"
                        />
                    </a>
                </div>
                <div className={styles.column}>
                    <span className={styles.columnTitle}>
                        <FormattedMessage
                            defaultMessage="More"
                            description="Footer column title"
                            id="mw.community.footer.more"
                        />
                    </span>
                    <a
                        href="https://github.com/bilup"
                        target="_blank"
                        rel="noreferrer"
                        className={styles.iconRow}
                    >
                        <Github size={14} />
                        GitHub
                    </a>
                    <a
                        href="https://accounts.bilup.org"
                        target="_blank"
                        rel="noreferrer"
                    >Bilup Accounts</a>
                    <Link to="/credits">
                        <FormattedMessage
                            defaultMessage="Credits"
                            description="Footer link to credits"
                            id="mw.community.footer.credits"
                        />
                    </Link>
                </div>
            </div>
        </div>
        <div className={styles.legal}>
            <FormattedMessage
                defaultMessage="Bilup is a mod of TurboWarp and Scratch. Not affiliated with Scratch or the Scratch Foundation."
                description="Footer legal text"
                id="mw.community.footer.legal"
            />
        </div>
    </footer>
);

export default Footer;

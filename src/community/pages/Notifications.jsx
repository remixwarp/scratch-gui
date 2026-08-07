import PropTypes from 'prop-types';
import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {FormattedMessage} from 'react-intl';
import {useIntl} from '../../lib/tw-use-intl.jsx';
import {
    Heart, MessageCircle, GitFork, UserPlus, AtSign, ShieldAlert, Megaphone, Flag, Reply, Coins
} from 'lucide-react';
import api, {projectUrl} from '../api';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import {useUser} from '../UserContext.jsx';
import {timeAgo} from '../format';
import styles from './Notifications.module.css';

const ICONS = {
    love: Heart,
    comment: MessageCircle,
    profile_comment: MessageCircle,
    reply: Reply,
    remix: GitFork,
    follow: UserPlus,
    mention: AtSign,
    purchase: Coins,
    donation: Coins,
    standing: ShieldAlert,
    moderation: ShieldAlert,
    news: Megaphone,
    report_update: Flag
};

const SYSTEM_TYPES = ['standing', 'moderation', 'news', 'report_update'];

const commentAnchor = n => (n.commentId ? `#comment-id-${n.commentId}` : '');

const REPORT_OUTCOMES = {
    dismiss: 'mw.community.notifications.outcome.dismiss',
    warn_user: 'mw.community.notifications.outcome.warnUser',
    ban_user: 'mw.community.notifications.outcome.banUser',
    unshare_project: 'mw.community.notifications.outcome.unshareProject'
};

const describe = (n, intl) => {
    switch (n.type) {
    case 'love': return <FormattedMessage
        id="mw.community.notifications.love"
        defaultMessage="loved {title}"
        values={{title: <strong>{n.projectTitle}</strong>}}
    />;
    case 'comment': return <FormattedMessage
        id="mw.community.notifications.comment"
        defaultMessage="commented on {title}"
        values={{title: <strong>{n.projectTitle}</strong>}}
    />;
    case 'profile_comment': return <FormattedMessage
        id="mw.community.notifications.profileComment"
        defaultMessage="commented on your profile"
    />;
    case 'reply': return n.projectTitle ?
        <FormattedMessage
            id="mw.community.notifications.replyOn"
            defaultMessage="replied to your comment on {title}"
            values={{title: <strong>{n.projectTitle}</strong>}}
        /> :
        <FormattedMessage
            id="mw.community.notifications.reply"
            defaultMessage="replied to your comment"
        />;
    case 'purchase': return <FormattedMessage
        id="mw.community.notifications.purchase"
        defaultMessage="bought {title} for {amount} credits"
        values={{title: <strong>{n.projectTitle}</strong>, amount: n.amount}}
    />;
    case 'donation': return <FormattedMessage
        id="mw.community.notifications.donation"
        defaultMessage="donated {amount} credits to you"
        values={{amount: n.amount}}
    />;
    case 'remix': return <FormattedMessage
        id="mw.community.notifications.remix"
        defaultMessage="remixed {title}"
        values={{title: <strong>{n.projectTitle}</strong>}}
    />;
    case 'follow': return <FormattedMessage
        id="mw.community.notifications.follow"
        defaultMessage="followed you"
    />;
    case 'mention': return n.projectTitle ?
        <FormattedMessage
            id="mw.community.notifications.mentionOn"
            defaultMessage="mentioned you on {title}"
            values={{title: <strong>{n.projectTitle}</strong>}}
        /> :
        <FormattedMessage
            id="mw.community.notifications.mention"
            defaultMessage="mentioned you in a comment"
        />;
    case 'standing': return n.reason ?
        <FormattedMessage
            id="mw.community.notifications.standingReason"
            defaultMessage="Your account standing is now {level}: {reason}"
            values={{level: <strong>{n.level}</strong>, reason: n.reason}}
        /> :
        <FormattedMessage
            id="mw.community.notifications.standing"
            defaultMessage="Your account standing is now {level}."
            values={{level: <strong>{n.level}</strong>}}
        />;
    case 'moderation': return <FormattedMessage
        id="mw.community.notifications.moderatorMessage"
        defaultMessage="A moderator sent you a message."
    />;
    case 'news': return <FormattedMessage
        id="mw.community.notifications.news"
        defaultMessage="New announcement: {title}"
        values={{title: <strong>{n.title}</strong>}}
    />;
    case 'report_update': return <FormattedMessage
        id="mw.community.notifications.reportOutcome"
        defaultMessage="Your report was {outcome}."
        values={{outcome: intl.formatMessage({
            id: (n.action && REPORT_OUTCOMES[n.action]) || 'mw.community.notifications.outcome.dismiss',
            defaultMessage: 'reviewed; no action was taken'
        })}}
    />;
    default: return <FormattedMessage
        id="mw.community.notifications.didSomething"
        defaultMessage="did something"
    />;
    }
};

const Notifications = ({hideHeading}) => {
    const intl = useIntl();
    const {user, loading} = useUser();
    const [items, setItems] = useState(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!user) {
            return;
        }
        setFailed(false);
        api.notifications()
            .then(data => {
                setItems(data.notifications || []);
                api.readNotifications()
                    .then(() => window.dispatchEvent(new Event('mw:notifications-read')))
                    .catch(() => {});
            })
            .catch(() => setFailed(true));
    }, [user, attempt]);

    if (loading) {
        return <main className={styles.page}><p className={styles.status}>{intl.formatMessage({id: 'mw.community.notifications.loading', defaultMessage: 'Loading…'})}</p></main>;
    }
    if (!user) {
        return <main className={styles.page}><p className={styles.status}>{intl.formatMessage({id: 'mw.community.notifications.signIn', defaultMessage: 'Sign in to see your notifications.'})}</p></main>;
    }

    return (
        <main className={styles.page}>
            {hideHeading ? null : <h1>{intl.formatMessage({id: 'mw.community.notifications.title', defaultMessage: 'Notifications'})}</h1>}
            {failed ? (
                <p className={styles.status}>
                    {intl.formatMessage({id: 'mw.community.notifications.couldNotLoad', defaultMessage: 'Couldn\'t load.'})}{' '}
                    <Button onClick={() => setAttempt(a => a + 1)}>{intl.formatMessage({id: 'mw.community.notifications.tryAgain', defaultMessage: 'Try again'})}</Button>
                </p>
            ) : items === null ? (
                <p className={styles.status}>{intl.formatMessage({id: 'mw.community.notifications.loading', defaultMessage: 'Loading…'})}</p>
            ) : items.length ? (
                <div className={styles.list}>
                    {items.map(n => {
                        const Icon = ICONS[n.type] || Heart;
                        const system = SYSTEM_TYPES.includes(n.type);
                        if (system) {
                            const body = <span className={styles.body}>{describe(n, intl)}</span>;
                            return (
                                <div
                                    key={n.id}
                                    className={n.read ? styles.item : styles.itemUnread}
                                >
                                    <span className={styles.sysAvatar}><Icon size={20} /></span>
                                    <div className={styles.text}>
                                        {n.type === 'news' && n.newsId ? (
                                            <Link
                                                to="/news"
                                                className={styles.body}
                                            >{describe(n, intl)}</Link>
                                        ) : body}
                                    </div>
                                    <span className={styles.time}>{timeAgo(n.created)}</span>
                                </div>
                            );
                        }
                        return (
                            <div
                                key={n.id}
                                className={n.read ? styles.item : styles.itemUnread}
                            >
                                <Link to={`/users/${n.actor}`}>
                                    <Avatar
                                        username={n.actor}
                                        size={40}
                                    />
                                </Link>
                                <span className={styles.icon}><Icon size={15} /></span>
                                <div className={styles.text}>
                                    <Link
                                        to={`/users/${n.actor}`}
                                        className={styles.actor}
                                    >{n.actor}</Link>
                                    {' '}
                                    {n.projectId ? (
                                        <Link
                                            to={`${projectUrl(n.projectId)}${commentAnchor(n)}`}
                                            className={styles.body}
                                        >{describe(n, intl)}</Link>
                                    ) : (n.type === 'profile_comment' || n.profile) ? (
                                        <Link
                                            to={`/users/${n.profile || user.username}${commentAnchor(n)}`}
                                            className={styles.body}
                                        >{describe(n, intl)}</Link>
                                    ) : (
                                        <span className={styles.body}>{describe(n, intl)}</span>
                                    )}
                                </div>
                                <span className={styles.time}>{timeAgo(n.created)}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className={styles.status}>{intl.formatMessage({id: 'mw.community.notifications.empty', defaultMessage: 'Nothing yet. Activity on your projects shows up here.'})}</p>
            )}
        </main>
    );
};

Notifications.propTypes = {
    hideHeading: PropTypes.bool
};

export default Notifications;

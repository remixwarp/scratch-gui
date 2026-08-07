import React, {useState, useEffect, useRef} from 'react';
import {useIntl} from '../../lib/tw-use-intl.jsx';
import {Flag} from 'lucide-react';
import api from '../api';
import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';
import styles from './ReportModal.module.css';

const REASON_KEYS = [
    {key: 'inappropriate', labelKey: 'mw.community.report.reason.inappropriate', labelDefault: 'Inappropriate or explicit content'},
    {key: 'harassment', labelKey: 'mw.community.report.reason.harassment', labelDefault: 'Harassment or bullying'},
    {key: 'spam', labelKey: 'mw.community.report.reason.spam', labelDefault: 'Spam or misleading'},
    {key: 'hateful', labelKey: 'mw.community.report.reason.hateful', labelDefault: 'Hateful or abusive behaviour'},
    {key: 'dangerous', labelKey: 'mw.community.report.reason.dangerous', labelDefault: 'Dangerous or illegal activity'},
    {key: 'copyright', labelKey: 'mw.community.report.reason.copyright', labelDefault: 'Copyright or credit problem'},
    {key: 'other', labelKey: 'mw.community.report.reason.other', labelDefault: 'Something else'}
];

const ReportModal = ({type, target, context, onClose}) => {
    const intl = useIntl();
    const t = (id, defaultMessage, values) => intl.formatMessage({id, defaultMessage}, values);
    const reasons = REASON_KEYS.map(item => t(item.labelKey, item.labelDefault));
    const [category, setCategory] = useState(reasons[0]);
    const [details, setDetails] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const firstRef = useRef(null);

    useEffect(() => {
        if (firstRef.current) firstRef.current.focus();
    }, []);

    const submit = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        const reason = details.trim() ? `${category}: ${details.trim()}` : category;
        try {
            await api.report(type, target, reason, context);
            setSent(true);
        } catch (e) {
            setError(e.message || t('mw.community.report.couldNotSend', 'Could not send the report.'));
        } finally {
            setBusy(false);
        }
    };

    const noun = type === 'project' ?
        t('mw.community.report.noun.project', 'project') :
        type === 'user' ?
            t('mw.community.report.noun.user', 'user') :
            type === 'comment' ?
                t('mw.community.report.noun.comment', 'comment') :
                t('mw.community.report.noun.content', 'content');

    return (
        <Modal
            icon={Flag}
            title={t('mw.community.report.title', 'Report this {noun}', {noun})}
            onClose={onClose}
            actions={sent ? (
                <Button
                    variant="primary"
                    onClick={onClose}
                >{t('mw.community.report.done', 'Done')}</Button>
            ) : (
                <React.Fragment>
                    <Button onClick={onClose}>{t('mw.community.report.cancel', 'Cancel')}</Button>
                    <Button
                        variant="primary"
                        disabled={busy}
                        onClick={submit}
                    >{busy ?
                        t('mw.community.report.sending', 'Sending…') :
                        t('mw.community.report.send', 'Send report')}</Button>
                </React.Fragment>
            )}
        >
            {sent ? (
                <p className={styles.sent}>{t('mw.community.report.sent', 'Thanks. Your report was sent to the moderators.')}</p>
            ) : (
                <React.Fragment>
                    <label className={styles.label}>{t('mw.community.report.whatWrong', 'What is wrong?')}</label>
                    <select
                        ref={firstRef}
                        className={styles.select}
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                    >
                        {reasons.map(reason => (
                            <option
                                key={reason}
                                value={reason}
                            >{reason}</option>
                        ))}
                    </select>
                    <label className={styles.label}>{t('mw.community.report.details', 'Details (optional)')}</label>
                    <textarea
                        className={styles.textarea}
                        value={details}
                        maxLength={1000}
                        placeholder={t('mw.community.report.detailsPlaceholder', 'Add anything that helps a moderator understand the problem.')}
                        onChange={e => setDetails(e.target.value)}
                    />
                    {error ? <div className={styles.error}>{error}</div> : null}
                </React.Fragment>
            )}
        </Modal>
    );
};

export default ReportModal;

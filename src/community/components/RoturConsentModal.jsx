import React from 'react';
import {useIntl} from '../../lib/tw-use-intl.jsx';
import {ShieldCheck} from 'lucide-react';
import {
    describePermission as defaultDescribePermission,
    categoryLabel as defaultCategoryLabel,
    categoryOf
} from '../../lib/rotur/permission-descriptions.js';
import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';
import styles from './RoturConsentModal.module.css';

const groupScopes = (scopes, categoryLabelFn) => {
    const groups = {};
    for (const scope of scopes || []) {
        const label = categoryLabelFn(scope);
        (groups[label] = groups[label] || []).push(scope);
    }
    return groups;
};

// Trusted consent/confirm UI rendered in the community project page (the parent
// of the project iframe). The sandboxed project cannot read or dismiss this, so
// it can request an action but never approve one on the user's behalf.
const RoturConsentModal = ({type, data, onAllow, onDeny, onShareThis, onShareAll, onShareNo}) => {
    const intl = useIntl();
    const t = (id, defaultMessage, values) => intl.formatMessage({id, defaultMessage}, values);
    const describePermission = scope => t(
        `mw.roturPermission.${scope}`,
        defaultDescribePermission(scope)
    );
    const categoryLabel = scope => t(
        `mw.roturCategory.${categoryOf(scope)}`,
        defaultCategoryLabel(scope)
    );
    if (type === 'share') {
        return (
            <Modal
                icon={ShieldCheck}
                title={t('mw.roturConsent.shareTitle', 'Show activity on your profile?')}
                onDismiss={onShareNo}
                actions={
                    <React.Fragment>
                        <Button onClick={onShareNo}>{t('mw.roturConsent.notNow', 'Not now')}</Button>
                        <Button onClick={onShareAll}>{t('mw.roturConsent.allowAll', 'Allow all')}</Button>
                        <Button
                            variant="primary"
                            onClick={onShareThis}
                        >{t('mw.roturConsent.justThis', 'Just this project')}</Button>
                    </React.Fragment>
                }
            >
                <p className={styles.lead}>
                    {t('mw.roturConsent.shareBody', '"{name}" wants to show it on your Bilup Accounts profile', {
                        name: data.name || t('mw.roturConsent.thisProject', 'This project')
                    })}
                    {data.username ? ` (@${data.username}).` : t('mw.roturConsent.period', '.')}
                </p>
            </Modal>
        );
    }
    const groups = groupScopes(data.scopes, categoryLabel);
    return (
        <Modal
            icon={ShieldCheck}
            title={type === 'confirm' ?
                t('mw.roturConsent.confirmTitle', 'Confirm Bilup Accounts action') :
                t('mw.roturConsent.connectTitle', 'Connect to Bilup Accounts')}
            onDismiss={onDeny}
            actions={
                <React.Fragment>
                    <Button onClick={onDeny}>
                        {type === 'confirm' ?
                            t('mw.roturConsent.cancel', 'Cancel') :
                            t('mw.roturConsent.notNow', 'Not now')}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onAllow}
                    >
                        {type === 'confirm' ?
                            t('mw.roturConsent.allow', 'Allow') :
                            t('mw.roturConsent.connect', 'Connect')}
                    </Button>
                </React.Fragment>
            }
        >
            {type === 'confirm' ? (
                <p className={styles.lead}>
                    {t('mw.roturConsent.confirmBody', 'This project wants to ')}
                    <b>{data.label}</b>
                    {data.username ? ` as @${data.username}.` : t('mw.roturConsent.period', '.')}
                    {' '}{t('mw.roturConsent.confirmTrust', 'Only allow it if you trust this project.')}
                </p>
            ) : (
                <React.Fragment>
                    <p className={styles.lead}>
                        {t('mw.roturConsent.connectBody', '"{name}" wants to use your Bilup Accounts account', {
                            name: data.name || t('mw.roturConsent.thisProject', 'This project')
                        })}
                        {data.username ? ` (@${data.username})` : ''}
                        {t('mw.roturConsent.connectTo', ' to:')}
                    </p>
                    {Object.keys(groups).map(label => (
                        <div
                            key={label}
                            className={styles.group}
                        >
                            <div className={styles.groupLabel}>{label}</div>
                            <ul className={styles.scopeList}>
                                {groups[label].map(scope => (
                                    <li key={scope}>{describePermission(scope)}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    {(data.scopes || []).length === 0 ? (
                        <p className={styles.lead}>{t('mw.roturConsent.noScopes', 'This only reads your public Bilup Accounts info.')}</p>
                    ) : null}
                </React.Fragment>
            )}
        </Modal>
    );
};

export default RoturConsentModal;

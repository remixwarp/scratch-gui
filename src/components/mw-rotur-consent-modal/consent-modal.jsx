import PropTypes from 'prop-types';
import React from 'react';
import {useIntl} from '../../lib/tw-use-intl.jsx';
import Box from '../box/box.jsx';
import Modal from '../../containers/windowed-modal.jsx';
import {
    describePermission as defaultDescribePermission,
    categoryLabel as defaultCategoryLabel,
    categoryOf
} from '../../lib/rotur/permission-descriptions.js';
import styles from '../tw-security-manager-modal/security-manager-modal.css';

const groupScopes = (scopes, categoryLabelFn) => {
    const groups = {};
    for (const scope of scopes) {
        const label = categoryLabelFn(scope);
        (groups[label] = groups[label] || []).push(scope);
    }
    return groups;
};

// Localized description/category resolution. Falls back to the English
// defaults from permission-descriptions.js for unknown scopes.
const useLocalizedPermissions = () => {
    const intl = useIntl();
    const describePermission = scope =>
        intl.formatMessage({
            id: `mw.roturPermission.${scope}`,
            defaultMessage: defaultDescribePermission(scope)
        });
    const categoryLabel = scope =>
        intl.formatMessage({
            id: `mw.roturCategory.${categoryOf(scope)}`,
            defaultMessage: defaultCategoryLabel(scope)
        });
    return {describePermission, categoryLabel};
};

const RoturConsentModal = props => {
    const {type, data} = props;
    const {describePermission, categoryLabel} = useLocalizedPermissions();
    const groups = groupScopes(data.scopes || [], categoryLabel);
    const intl = useIntl();
    const notNow = intl.formatMessage({id: 'mw.roturConsent.notNow', defaultMessage: 'Not now'});
    if (type === 'share') {
        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={props.onShareNo}
                contentLabel="Bilup Accounts"
                id="roturconsentmodal"
            >
                <Box className={styles.body}>
                    <h2>
                        {intl.formatMessage({
                            id: 'mw.roturConsent.shareTitle',
                            defaultMessage: 'Show activity on your profile?'
                        })}
                    </h2>
                    <p>
                        {intl.formatMessage({
                            id: 'mw.roturConsent.shareBody',
                            defaultMessage: '"{name}" wants to show that you\'re using it on your Bilup Accounts profile'
                        }, {
                            name: data.name || intl.formatMessage({
                                id: 'mw.roturConsent.thisProject',
                                defaultMessage: 'This project'
                            })
                        })}
                        {data.username ? (
                            ` (@${data.username}).`
                        ) : (
                            intl.formatMessage({id: 'mw.roturConsent.period', defaultMessage: '.'})
                        )}
                    </p>
                    <Box className={styles.buttons}>
                        <button
                            className={styles.denyButton}
                            onClick={props.onShareNo}
                        >
                            {notNow}
                        </button>
                        <button
                            className={styles.allowButton}
                            onClick={props.onShareAll}
                        >
                            {intl.formatMessage({
                                id: 'mw.roturConsent.allowAll',
                                defaultMessage: 'Allow all projects'
                            })}
                        </button>
                        <button
                            className={styles.allowButton}
                            onClick={props.onShareThis}
                        >
                            {intl.formatMessage({
                                id: 'mw.roturConsent.justThis',
                                defaultMessage: 'Just this project'
                            })}
                        </button>
                    </Box>
                </Box>
            </Modal>
        );
    }
    return (
        <Modal
            className={styles.modalContent}
            onRequestClose={props.onDenied}
            contentLabel="Bilup Accounts"
            id="roturconsentmodal"
        >
            <Box className={styles.body}>
                {type === 'confirm' ? (
                    <React.Fragment>
                        <h2>
                            {intl.formatMessage({
                                id: 'mw.roturConsent.confirmTitle',
                                defaultMessage: 'Confirm Bilup Accounts action'
                            })}
                        </h2>
                        <p>
                            {intl.formatMessage({
                                id: 'mw.roturConsent.confirmBody',
                                defaultMessage: 'This project wants to '
                            })}
                            <b>{data.label}</b>
                            {data.username ? (
                                ` as @${data.username}.`
                            ) : (
                                intl.formatMessage({id: 'mw.roturConsent.period', defaultMessage: '.'})
                            )}
                        </p>
                        <p>
                            {intl.formatMessage({
                                id: 'mw.roturConsent.confirmTrust',
                                defaultMessage: 'Only allow this if you trust the project.'
                            })}
                        </p>
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        <h2>
                            {intl.formatMessage({
                                id: 'mw.roturConsent.connectTitle',
                                defaultMessage: 'Connect to Bilup Accounts'
                            })}
                        </h2>
                        <p>
                            {intl.formatMessage({
                                id: 'mw.roturConsent.connectBody',
                                defaultMessage: '"{name}" wants to use your Bilup Accounts account'
                            }, {
                                name: data.name || intl.formatMessage({
                                    id: 'mw.roturConsent.thisProject',
                                    defaultMessage: 'This project'
                                })
                            })}
                            {data.username ? ` (@${data.username})` : ''}
                            {intl.formatMessage({
                                id: 'mw.roturConsent.connectTo',
                                defaultMessage: ' to:'
                            })}
                        </p>
                        {Object.keys(groups).map(label => (
                            <div key={label}>
                                <b>{label}</b>
                                <ul>
                                    {groups[label].map(scope => (
                                        <li key={scope}>{describePermission(scope)}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        {(data.scopes || []).length === 0 ? (
                            <p>
                                {intl.formatMessage({
                                    id: 'mw.roturConsent.noScopes',
                                    defaultMessage: 'This just lets the project read your public Bilup Accounts info.'
                                })}
                            </p>
                        ) : null}
                    </React.Fragment>
                )}

                <Box className={styles.buttons}>
                    <button
                        className={styles.denyButton}
                        onClick={props.onDenied}
                    >
                        {type === 'confirm' ?
                            intl.formatMessage({id: 'mw.roturConsent.cancel', defaultMessage: 'Cancel'}) :
                            notNow}
                    </button>
                    <button
                        className={styles.allowButton}
                        onClick={props.onAllowed}
                    >
                        {type === 'confirm' ?
                            intl.formatMessage({id: 'mw.roturConsent.allow', defaultMessage: 'Allow'}) :
                            intl.formatMessage({id: 'mw.roturConsent.connect', defaultMessage: 'Connect'})}
                    </button>
                </Box>
            </Box>
        </Modal>
    );
};

RoturConsentModal.propTypes = {
    type: PropTypes.oneOf(['consent', 'confirm', 'share']).isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    data: PropTypes.object.isRequired,
    onAllowed: PropTypes.func,
    onDenied: PropTypes.func,
    onShareThis: PropTypes.func,
    onShareAll: PropTypes.func,
    onShareNo: PropTypes.func
};

export default RoturConsentModal;

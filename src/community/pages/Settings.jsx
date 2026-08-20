import React, {useEffect, useState, useCallback} from 'react';
import {useIntl} from '../../lib/tw-use-intl.jsx';
import styles from './Settings.module.css';

/**
 * Desktop settings panel.
 *
 * When rendered inside the Bilup/RemixWarp desktop app (`isScratchDesktop === true`),
 * this component reads and writes desktop settings through the Electron preload bridge
 * exposed as `window.EditorPreload`. In a plain web context it renders a fallback
 * message because the desktop settings API is unavailable.
 */
const Settings = ({isScratchDesktop = false}) => {
    const intl = useIntl();
    const t = (id, defaultMessage, values) => intl.formatMessage({id, defaultMessage}, values);

    const preload = typeof window !== 'undefined' ? window.EditorPreload : null;
    const [settings, setSettings] = useState(null);
    const [saving, setSaving] = useState(false);

    const reload = useCallback(() => {
        if (preload && typeof preload.getDesktopSettings === 'function') {
            setSettings(preload.getDesktopSettings());
        }
    }, [preload]);

    useEffect(() => {
        reload();
    }, [reload]);

    const set = useCallback((key, value) => {
        setSaving(true);
        setSettings(prev => (prev ? {...prev, [key]: value} : prev));
        Promise.resolve()
            .then(() => preload.setDesktopSetting(key, value))
            .catch(err => {
                // eslint-disable-next-line no-console
                console.error(`Failed to save desktop setting "${key}":`, err);
                reload();
            })
            .finally(() => setSaving(false));
    }, [preload, reload]);

    if (!isScratchDesktop) {
        return (
            <main className={styles.page}>
                <h1 className={styles.title}>{t('mw.community.settings.notDesktop', 'Desktop settings')}</h1>
                <p className={styles.status}>{t('mw.community.settings.requiresDesktop', 'This settings page is only available in the desktop app.')}</p>
            </main>
        );
    }

    if (!settings) {
        return (
            <main className={styles.page}>
                <p className={styles.status}>{t('mw.community.settings.loading', 'Loading…')}</p>
            </main>
        );
    }

    const booleans = [
        {key: 'updateChecker', labelKey: 'mw.community.settings.updateChecker', label: t('mw.community.settings.updateChecker', 'Check for updates')},
        {key: 'microphone', labelKey: 'mw.community.settings.microphone', label: t('mw.community.settings.microphone', 'Allow microphone')},
        {key: 'camera', labelKey: 'mw.community.settings.camera', label: t('mw.community.settings.camera', 'Allow camera')},
        {key: 'hardwareAcceleration', labelKey: 'mw.community.settings.hardwareAcceleration', label: t('mw.community.settings.hardwareAcceleration', 'Hardware acceleration')},
        {key: 'backgroundThrottling', labelKey: 'mw.community.settings.backgroundThrottling', label: t('mw.community.settings.backgroundThrottling', 'Throttle background windows')},
        {key: 'bypassCORS', labelKey: 'mw.community.settings.bypassCORS', label: t('mw.community.settings.bypassCORS', 'Bypass CORS')},
        {key: 'spellchecker', labelKey: 'mw.community.settings.spellchecker', label: t('mw.community.settings.spellchecker', 'Enable spellchecker')},
        {key: 'exitFullscreenOnEscape', labelKey: 'mw.community.settings.exitFullscreenOnEscape', label: t('mw.community.settings.exitFullscreenOnEscape', 'Exit fullscreen with Esc')},
        {key: 'richPresence', labelKey: 'mw.community.settings.richPresence', label: t('mw.community.settings.richPresence', 'Rich presence (show activity)')},
        {key: 'cloudExtensions', labelKey: 'mw.community.settings.cloudExtensions', label: t('mw.community.settings.cloudExtensions', 'Cloud extensions')}
    ].filter(item => item.key in settings);

    return (
        <main className={styles.page}>
            <h1 className={styles.title}>{t('mw.community.settings.title', 'Settings')}</h1>

            {settings.isOnline !== undefined ? (
                <p className={styles.onlineStatus}>
                    {settings.isOnline ?
                        t('mw.community.settings.online', 'You are online') :
                        t('mw.community.settings.offline', 'You are offline')}
                </p>
            ) : null}

            <div className={styles.card}>
                {booleans.map(item => {
                    const disabled = item.key === 'updateChecker' && settings.updateCheckerAllowed === false;
                    return (
                        <label key={item.key} className={styles.row}>
                            <span className={styles.rowLabel}>{item.label}</span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={!!settings[item.key]}
                                aria-label={item.label}
                                className={styles.toggle}
                                data-on={!!settings[item.key]}
                                disabled={disabled || saving}
                                onClick={() => set(item.key, !settings[item.key])}
                            >
                                <span className={styles.toggleKnob} />
                            </button>
                        </label>
                    );
                })}
            </div>
        </main>
    );
};

export default Settings;

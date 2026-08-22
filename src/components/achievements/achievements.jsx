import React, {useEffect, useRef, useState} from 'react';
import classNames from 'classnames';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import Modal from '../../containers/windowed-modal.jsx';
import {AESettings} from '../../lib/settings.js';
import settingsStore from '../../addons/settings-store-singleton.js';
import {applyLayout} from '../tw-settings-modal/settings-modal.jsx';
import {
    ACHIEVEMENTS,
    getAchievementExperience,
    getUnlockedAchievementIds,
    isAchievementsEnabled,
    selectAchievementExperience,
    UNLOCK_EVENT,
    unlockAchievement
} from '../../lib/achievements.js';
import styles from './achievements.css';

const ALL_CATEGORIES = '全部';
const ACHIEVEMENT_CATEGORIES = [
    ALL_CATEGORIES,
    ...Array.from(new Set(ACHIEVEMENTS.map(achievement => achievement.type)))
];

const messages = defineMessages({
    welcomeTitle: {
        defaultMessage: 'Welcome to RemixWarp',
        description: 'Welcome title on first launch',
        id: 'achievements.welcomeTitle'
    },
    welcomeSubtitle: {
        defaultMessage: 'Choose your editor experience to decide whether achievements, the tutorial, and similar features are enabled by default.',
        description: 'Welcome subtitle',
        id: 'achievements.welcomeSubtitle'
    },
    importConfig: {
        defaultMessage: 'Import All Config',
        description: 'Import all config link on welcome screen',
        id: 'achievements.importConfig'
    },
    scratchBeginner: {
        defaultMessage: 'Scratch Beginner',
        description: 'Button text for Scratch beginner',
        id: 'achievements.scratchBeginner'
    },
    scratchBeginnerDesc: {
        defaultMessage: 'Auto-enable achievements + show onboarding tutorial',
        description: 'Description for Scratch beginner button',
        id: 'achievements.scratchBeginnerDesc'
    },
    turboWarpExpert: {
        defaultMessage: 'TurboWarp Expert',
        description: 'Button text for TurboWarp expert',
        id: 'achievements.turboWarpExpert'
    },
    turboWarpExpertDesc: {
        defaultMessage: 'Enable achievements in settings, no onboarding tutorial',
        description: 'Description for TurboWarp expert button',
        id: 'achievements.turboWarpExpertDesc'
    },
    selectDeviceTitle: {
        defaultMessage: 'Choose Your Device',
        description: 'Device selection title',
        id: 'achievements.selectDeviceTitle'
    },
    selectDeviceSubtitle: {
        defaultMessage: 'Select your primary device type and we\'ll optimize the editor experience for you.',
        description: 'Device selection subtitle',
        id: 'achievements.selectDeviceSubtitle'
    },
    mobileDevice: {
        defaultMessage: 'Mobile',
        description: 'Mobile device option',
        id: 'achievements.mobileDevice'
    },
    mobileDeviceDesc: {
        defaultMessage: 'Auto-enable mobile layout and touch mode',
        description: 'Mobile device description',
        id: 'achievements.mobileDeviceDesc'
    },
    pcDevice: {
        defaultMessage: 'PC',
        description: 'PC device option',
        id: 'achievements.pcDevice'
    },
    pcDeviceDesc: {
        defaultMessage: 'Use standard desktop layout',
        description: 'PC device description',
        id: 'achievements.pcDeviceDesc'
    },
    goBack: {
        defaultMessage: 'Back',
        description: 'Go back button',
        id: 'achievements.goBack'
    },
    selectLayoutTitle: {
        defaultMessage: 'Choose Your Layout',
        description: 'Layout selection title',
        id: 'achievements.selectLayoutTitle'
    },
    selectLayoutSubtitle: {
        defaultMessage: 'Pick the editor layout. This is the same option as "选择布局" in Advanced Settings.',
        description: 'Layout selection subtitle',
        id: 'achievements.selectLayoutSubtitle'
    },
    vscodeLayout: {
        defaultMessage: 'VS Code Layout',
        description: 'VS Code layout option',
        id: 'achievements.vscodeLayout'
    },
    vscodeLayoutDesc: {
        defaultMessage: 'Left activity bar + right multi-tab workspace',
        description: 'VS Code layout description',
        id: 'achievements.vscodeLayoutDesc'
    },
    scratchLayout: {
        defaultMessage: 'Scratch Layout',
        description: 'Scratch layout option',
        id: 'achievements.scratchLayout'
    },
    scratchLayoutDesc: {
        defaultMessage: 'Classic Scratch interface layout',
        description: 'Scratch layout description',
        id: 'achievements.scratchLayoutDesc'
    }
});

const isMobileMode = () => {
    try {
        return AESettings.get('EnableMobileTouchDrag') === true;
    } catch (e) {
        return false;
    }
};

const ArrowRightIcon = () => (
    <svg
        className={styles.arrowIcon}
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
    >
        <path
            d={
                'M881 562H81c-27.6 0-50-22.4-50-50s22.4-50 50-50h800' +
                'c27.6 0 50 22.4 50 50s-22.4 50-50 50z'
            }
        />
        <path
            d={
                'M907.6 540.7L695.5 328.6c-19.5-19.5-19.5-51.2 0-70.7' +
                's51.2-19.5 70.7 0L978.4 470c19.5 19.5 19.5 51.2 0 70.7' +
                '-19.6 19.6-51.2 19.6-70.8 0z'
            }
        />
        <path
            d={
                'M695.5 695.4l212.1-212.1c19.5-19.5 51.2-19.5 70.7 0' +
                's19.5 51.2 0 70.7L766.2 766.1c-19.5 19.5-51.2 19.5-70.7 0' +
                's-19.5-51.2 0-70.7z'
            }
        />
    </svg>
);

const Achievements = ({intl}) => {
    const [unlockedIds, setUnlockedIds] = useState(() => getUnlockedAchievementIds());
    const [notice, setNotice] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [experience, setExperience] = useState(() => getAchievementExperience());
    const [enabled, setEnabled] = useState(() => isAchievementsEnabled());
    const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
    const [deviceStep, setDeviceStep] = useState(false);
    const [layoutStep, setLayoutStep] = useState(false);
    const [pendingExperience, setPendingExperience] = useState(null);
    const [pendingDevice, setPendingDevice] = useState(null);

    const categoriesNavRef = useRef(null);
    const dragStateRef = useRef({isDragging: false, startX: 0, scrollLeft: 0, moved: false});

    useEffect(() => {
        const handleUnlock = event => {
            const {achievement, unlockedIds: nextIds} = event.detail;
            setUnlockedIds(nextIds);
            setNotice(achievement);
        };

        window.addEventListener(UNLOCK_EVENT, handleUnlock);
        return () => window.removeEventListener(UNLOCK_EVENT, handleUnlock);
    }, []);

    useEffect(() => {
        const handleOpen = () => {
            if (isAchievementsEnabled()) {
                unlockAchievement('achievement-hunter');
                setIsOpen(true);
            }
        };
        const handleSettingsChanged = event => {
            setEnabled(event.detail.enabled);
        };
        window.addEventListener('rw-achievements-open', handleOpen);
        window.addEventListener('rw-achievements-settings-changed', handleSettingsChanged);
        return () => {
            window.removeEventListener('rw-achievements-open', handleOpen);
            window.removeEventListener('rw-achievements-settings-changed', handleSettingsChanged);
        };
    }, []);

    useEffect(() => {
        if (!notice) return;
        const timeout = setTimeout(() => setNotice(null), 4500);
        return () => clearTimeout(timeout);
    }, [notice]);

    const chooseExperience = selectedExperience => {
        setPendingExperience(selectedExperience);
        setDeviceStep(true);
    };

    const chooseDevice = device => {
        if (!pendingExperience) return;

        if (device === 'mobile') {
            AESettings.set('EnableMobileLayout', true);
            AESettings.set('EnableMobileTouchDrag', true);
        } else {
            AESettings.set('EnableMobileLayout', false);
            AESettings.set('EnableMobileTouchDrag', false);
        }

        setPendingDevice(device);
        setLayoutStep(true);
    };

    const chooseLayout = vscode => {
        // 在布局选择完成时才真正提交经验选择（保持 experience 在第三步仍为空，确保布局步骤可见）。
        selectAchievementExperience(pendingExperience);
        setExperience(pendingExperience);
        setEnabled(pendingExperience === 'sc-newbie');

        // 应用到高级设置里的"选择布局"选项（与设置面板 applyLayout 完全一致）。
        applyLayout(vscode);

        if (pendingExperience === 'sc-newbie' && pendingDevice !== 'mobile') {
            setTimeout(() => {
                window.dispatchEvent(new Event('show-onboarding'));
            }, 300);
        }
    };

    const goBackToExperience = () => {
        setDeviceStep(false);
        setPendingExperience(null);
    };

    const goBackToDevice = () => {
        setLayoutStep(false);
        setPendingDevice(null);
    };

    const onChooseNewbie = () => chooseExperience('sc-newbie');
    const onChooseVeteran = () => chooseExperience('tw-veteran');
    const onChooseMobile = () => chooseDevice('mobile');
    const onChoosePc = () => chooseDevice('pc');
    const onChooseVSCode = () => chooseLayout(true);
    const onChooseScratch = () => chooseLayout(false);
    const onOpenAchievements = () => window.dispatchEvent(new Event('rw-achievements-open'));
    const onCloseModal = () => setIsOpen(false);

    const visibleAchievements = selectedCategory === ALL_CATEGORIES ?
        ACHIEVEMENTS :
        ACHIEVEMENTS.filter(achievement => achievement.type === selectedCategory);
    const chooseCategory = event => {
        if (dragStateRef.current.moved) {
            dragStateRef.current.moved = false;
            return;
        }
        const button = event.target.closest('button[data-achievement-category]');
        if (button) {
            setSelectedCategory(button.dataset.achievementCategory);
        }
    };

    const getClientX = e => (e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX);
    const handleCategoriesPointerDown = e => {
        const nav = categoriesNavRef.current;
        if (!nav) return;
        dragStateRef.current = {
            isDragging: true,
            startX: getClientX(e),
            scrollLeft: nav.scrollLeft,
            moved: false
        };
    };
    const handleCategoriesPointerMove = e => {
        if (!dragStateRef.current.isDragging) return;
        const nav = categoriesNavRef.current;
        if (!nav) return;
        const delta = getClientX(e) - dragStateRef.current.startX;
        if (Math.abs(delta) > 4) {
            dragStateRef.current.moved = true;
        }
        nav.scrollLeft = dragStateRef.current.scrollLeft - delta;
    };
    const handleCategoriesPointerUp = () => {
        dragStateRef.current.isDragging = false;
    };

    const mobileMode = isMobileMode();

    return (
        <div className={styles.root}>
            {!experience && !deviceStep && (
                <div className={styles.backdrop}>
                    <section
                        aria-label={intl.formatMessage(messages.welcomeTitle)}
                        className={styles.choicePanel}
                    >
                        <button
                            type="button"
                            className={styles.importConfigLink}
                            onClick={handleImportConfig}
                        >
                            {intl.formatMessage(messages.importConfig)}
                        </button>
                        <h2>{intl.formatMessage(messages.welcomeTitle)}</h2>
                        <p>{intl.formatMessage(messages.welcomeSubtitle)}</p>
                        <div className={styles.choiceActions}>
                            <button
                                onClick={onChooseNewbie}
                                type="button"
                                className={styles.choiceButton}
                            >
                                <div className={styles.choiceButtonContent}>
                                    <div className={styles.choiceButtonText}>
                                        <strong>
                                            {intl.formatMessage(messages.scratchBeginner)}
                                        </strong>
                                        <small>
                                            {intl.formatMessage(messages.scratchBeginnerDesc)}
                                        </small>
                                    </div>
                                    <ArrowRightIcon />
                                </div>
                            </button>
                            <button
                                onClick={onChooseVeteran}
                                type="button"
                                className={styles.choiceButton}
                            >
                                <div className={styles.choiceButtonContent}>
                                    <div className={styles.choiceButtonText}>
                                        <strong>
                                            {intl.formatMessage(messages.turboWarpExpert)}
                                        </strong>
                                        <small>
                                            {intl.formatMessage(messages.turboWarpExpertDesc)}
                                        </small>
                                    </div>
                                    <ArrowRightIcon />
                                </div>
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {!experience && deviceStep && (
                <div className={styles.backdrop}>
                    <section
                        aria-label={intl.formatMessage(messages.selectDeviceTitle)}
                        className={styles.choicePanel}
                    >
                        <button
                            className={styles.backButton}
                            onClick={goBackToExperience}
                            type="button"
                        >
                            {'← '}
                            {intl.formatMessage(messages.goBack)}
                        </button>
                        <h2>{intl.formatMessage(messages.selectDeviceTitle)}</h2>
                        <p>{intl.formatMessage(messages.selectDeviceSubtitle)}</p>
                        <div className={styles.choiceActions}>
                            <button
                                onClick={onChooseMobile}
                                type="button"
                                className={styles.choiceButton}
                            >
                                <div className={styles.choiceButtonContent}>
                                    <div className={styles.choiceButtonText}>
                                        <strong>
                                            {intl.formatMessage(messages.mobileDevice)}
                                        </strong>
                                        <small>
                                            {intl.formatMessage(messages.mobileDeviceDesc)}
                                        </small>
                                    </div>
                                    <ArrowRightIcon />
                                </div>
                            </button>
                            <button
                                onClick={onChoosePc}
                                type="button"
                                className={styles.choiceButton}
                            >
                                <div className={styles.choiceButtonContent}>
                                    <div className={styles.choiceButtonText}>
                                        <strong>
                                            {intl.formatMessage(messages.pcDevice)}
                                        </strong>
                                        <small>
                                            {intl.formatMessage(messages.pcDeviceDesc)}
                                        </small>
                                    </div>
                                    <ArrowRightIcon />
                                </div>
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {!experience && layoutStep && (
                <div className={styles.backdrop}>
                    <section
                        aria-label={intl.formatMessage(messages.selectLayoutTitle)}
                        className={styles.choicePanel}
                    >
                        <button
                            className={styles.backButton}
                            onClick={goBackToDevice}
                            type="button"
                        >
                            {'← '}
                            {intl.formatMessage(messages.goBack)}
                        </button>
                        <h2>{intl.formatMessage(messages.selectLayoutTitle)}</h2>
                        <p>{intl.formatMessage(messages.selectLayoutSubtitle)}</p>
                        <div className={styles.choiceActions}>
                            <button
                                onClick={onChooseVSCode}
                                type="button"
                                className={styles.choiceButton}
                            >
                                <div className={styles.choiceButtonContent}>
                                    <div className={styles.choiceButtonText}>
                                        <strong>
                                            {intl.formatMessage(messages.vscodeLayout)}
                                        </strong>
                                        <small>
                                            {intl.formatMessage(messages.vscodeLayoutDesc)}
                                        </small>
                                    </div>
                                    <ArrowRightIcon />
                                </div>
                            </button>
                            <button
                                onClick={onChooseScratch}
                                type="button"
                                className={styles.choiceButton}
                            >
                                <div className={styles.choiceButtonContent}>
                                    <div className={styles.choiceButtonText}>
                                        <strong>
                                            {intl.formatMessage(messages.scratchLayout)}
                                        </strong>
                                        <small>
                                            {intl.formatMessage(messages.scratchLayoutDesc)}
                                        </small>
                                    </div>
                                    <ArrowRightIcon />
                                </div>
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {enabled && notice && (
                <button
                    className={styles.notice}
                    onClick={onOpenAchievements}
                    type="button"
                >
                    <span className={styles.noticeIcon}>{'🏆'}</span>
                    <span>
                        <strong>{'成就解锁：'}{notice.name}</strong>
                        <small>{notice.description}</small>
                    </span>
                </button>
            )}
            {isOpen && (
                <Modal
                    id="achievementsModal"
                    contentLabel="成就"
                    visible={isOpen}
                    onRequestClose={onCloseModal}
                    width={560}
                    height={620}
                    minWidth={400}
                    minHeight={400}
                    resizable
                    maximizable
                >
                    <div className={styles.windowContent}>
                        <header className={styles.windowHeader}>
                            <div>
                                <h2>{'成就'}</h2>
                                <p>{unlockedIds.length}{' / '}{ACHIEVEMENTS.length}{' 已解锁'}</p>
                            </div>
                        </header>
                        <nav
                            aria-label="成就分类"
                            className={classNames(styles.categories, {
                                [styles.categoriesDraggable]: mobileMode
                            })}
                            onClick={chooseCategory}
                            ref={categoriesNavRef}
                            {...(mobileMode ? {
                                onMouseDown: handleCategoriesPointerDown,
                                onMouseMove: handleCategoriesPointerMove,
                                onMouseUp: handleCategoriesPointerUp,
                                onMouseLeave: handleCategoriesPointerUp,
                                onTouchStart: handleCategoriesPointerDown,
                                onTouchMove: handleCategoriesPointerMove,
                                onTouchEnd: handleCategoriesPointerUp
                            } : {})}
                        >
                            {ACHIEVEMENT_CATEGORIES.map(category => {
                                const isSelected = selectedCategory === category;
                                const categoryAchievements = category === ALL_CATEGORIES ?
                                    ACHIEVEMENTS :
                                    ACHIEVEMENTS.filter(achievement => achievement.type === category);
                                const unlockedCount = categoryAchievements.filter(achievement => (
                                    unlockedIds.includes(achievement.id)
                                )).length;
                                return (
                                    <button
                                        aria-pressed={isSelected}
                                        className={classNames({
                                            [styles.categorySelected]: isSelected
                                        })}
                                        data-achievement-category={category}
                                        key={category}
                                        type="button"
                                    >
                                        {category} <span>{unlockedCount}{'/'}{categoryAchievements.length}</span>
                                    </button>
                                );
                            })}
                        </nav>
                        <div className={styles.list}>
                            {visibleAchievements.map(achievement => {
                                const unlocked = unlockedIds.includes(achievement.id);
                                return (
                                    <article
                                        className={unlocked ? styles.unlocked : styles.locked}
                                        key={achievement.id}
                                    >
                                        <span className={styles.icon}>{unlocked ? '🏆' : '🔒'}</span>
                                        <div>
                                            <small>{achievement.type}{' · '}{achievement.difficulty}</small>
                                            <h3>{achievement.name}</h3>
                                            <p>{achievement.description}</p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

Achievements.propTypes = {
    intl: intlShape.isRequired
};

const handleImportConfig = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.rwc';
    input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            const {default: JSZip} = await import('@turbowarp/jszip');
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const zip = new JSZip();
                    const content = await zip.loadAsync(event.target.result);
                    const settingsFile = content.file('settings.json');
                    if (!settingsFile) throw new Error('设置文件不存在或格式错误');
                    const settingsData = JSON.parse(await settingsFile.async('text'));
                    if (!confirm('确定要导入配置吗？这将覆盖您当前的设置。')) return;
                    // 导入插件设置
                    if (settingsData.addonSettings) {
                        try {
                            settingsStore.import(settingsData.addonSettings);
                        } catch (err) {
                            console.error('导入插件设置失败:', err);
                        }
                    }
                    // 导入全部 localStorage 设置
                    if (settingsData.localStorageSettings) {
                        for (const [key, value] of Object.entries(settingsData.localStorageSettings)) {
                            if (key === 'tw:addons') continue;
                            localStorage.setItem(key, value);
                        }
                    }
                    // 兼容字段
                    if (settingsData.themeSettings) localStorage.setItem('tw:theme', settingsData.themeSettings);
                    if (settingsData.shortcuts) localStorage.setItem('tw:shortcuts', settingsData.shortcuts);
                    if (settingsData.language) localStorage.setItem('tw:language', settingsData.language);
                    if (settingsData.workspaceBookmarks) {
                        try {
                            localStorage.setItem('mw:workspaceBookmarks', JSON.stringify(settingsData.workspaceBookmarks));
                        } catch (err) { /* ignore */ }
                    }
                    alert('设置已成功导入，即将刷新页面以应用更改。');
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } catch (error) {
                    alert('导入设置失败：' + error.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            alert('读取设置文件失败：' + error.message);
        }
    };
    input.click();
};

export default injectIntl(Achievements);

import React, {useEffect, useRef, useState} from 'react';
import classNames from 'classnames';
import Modal from '../../containers/windowed-modal.jsx';
import {AESettings} from '../../lib/settings.js';
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

const isMobileMode = () => {
    try {
        const settings = new AESettings();
        return settings.get('EnableMobileTouchDrag') === true;
    } catch (e) {
        return false;
    }
};

const Achievements = () => {
    const [unlockedIds, setUnlockedIds] = useState(() => getUnlockedAchievementIds());
    const [notice, setNotice] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [experience, setExperience] = useState(() => getAchievementExperience());
    const [enabled, setEnabled] = useState(() => isAchievementsEnabled());
    const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);

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
        if (!notice) return undefined;
        const timeout = setTimeout(() => setNotice(null), 4500);
        return () => clearTimeout(timeout);
    }, [notice]);

    const chooseExperience = selectedExperience => {
        selectAchievementExperience(selectedExperience);
        setExperience(selectedExperience);
        setEnabled(selectedExperience === 'sc-newbie');
    };

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

    // Mobile drag-to-scroll for category tabs
    const getClientX = e => (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
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
            {!experience && (
                <div className={styles.backdrop}>
                    <section aria-label="选择编辑器经验" className={styles.choicePanel}>
                        <h2>欢迎使用 RemixWarp</h2>
                        <p>请选择你的编辑器经验，以决定是否默认启用成就。</p>
                        <div className={styles.choiceActions}>
                            <button onClick={() => chooseExperience('sc-newbie')} type="button">
                                <strong>SC 新手</strong>
                                <small>自动开启成就</small>
                            </button>
                            <button onClick={() => chooseExperience('tw-veteran')} type="button">
                                <strong>TW 老手</strong>
                                <small>可在实验性设置中开启成就</small>
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {enabled && notice && (
                <button
                    className={styles.notice}
                    onClick={() => window.dispatchEvent(new Event('rw-achievements-open'))}
                    type="button"
                >
                    <span className={styles.noticeIcon}>🏆</span>
                    <span>
                        <strong>成就解锁：{notice.name}</strong>
                        <small>{notice.description}</small>
                    </span>
                </button>
            )}
            {isOpen && (
                <Modal
                    id="achievementsModal"
                    contentLabel="成就"
                    visible={isOpen}
                    onRequestClose={() => setIsOpen(false)}
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
                                <h2>成就</h2>
                                <p>{unlockedIds.length} / {ACHIEVEMENTS.length} 已解锁</p>
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
                                        {category} <span>{unlockedCount}/{categoryAchievements.length}</span>
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

export default Achievements;

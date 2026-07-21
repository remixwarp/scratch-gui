import React, {useEffect, useState} from 'react';
import classNames from 'classnames';
import Draggable from 'react-draggable';
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

const Achievements = () => {
    const [unlockedIds, setUnlockedIds] = useState(() => getUnlockedAchievementIds());
    const [notice, setNotice] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [experience, setExperience] = useState(() => getAchievementExperience());
    const [enabled, setEnabled] = useState(() => isAchievementsEnabled());
    const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);

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
        const button = event.target.closest('button[data-achievement-category]');
        if (button) {
            setSelectedCategory(button.dataset.achievementCategory);
        }
    };

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
                                <small>可在高级设置中开启成就</small>
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
                <Draggable handle={`.${styles.windowHeader}`}>
                    <section
                        aria-label="成就"
                        className={styles.panel}
                    >
                        <header className={styles.windowHeader}>
                            <div>
                                <h2>成就</h2>
                                <p>{unlockedIds.length} / {ACHIEVEMENTS.length} 已解锁</p>
                            </div>
                            <button
                                aria-label="关闭成就"
                                onClick={() => setIsOpen(false)}
                                type="button"
                            >
                                ×
                            </button>
                        </header>
                        <nav
                            aria-label="成就分类"
                            className={styles.categories}
                            onClick={chooseCategory}
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
                    </section>
                </Draggable>
            )}
        </div>
    );
};

export default Achievements;

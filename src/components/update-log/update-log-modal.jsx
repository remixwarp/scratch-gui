import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, injectIntl, intlShape } from 'react-intl';
import Box from '../box/box.jsx';
import styles from './update-log-modal.css';

const STORAGE_KEY = 'remixwarp_last_seen_version';
const POSITION_STORAGE_KEY = 'remixwarp_update_log_position';

const UpdateLogModal = ({ intl, visible, onClose, versions, themeColors, locale }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
    const modalRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (visible) {
            const savedPosition = localStorage.getItem(POSITION_STORAGE_KEY);
            if (savedPosition) {
                try {
                    const pos = JSON.parse(savedPosition);
                    setPosition({ x: pos.x || 0, y: pos.y || 0 });
                } catch (e) {
                    console.error('Failed to parse saved position:', e);
                    setPosition({ x: 0, y: 0 });
                }
            } else {
                setPosition({ x: 0, y: 0 });
            }
        }
    }, [visible]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, versions?.[0]?.version || '');
    }, [visible, versions]);

    const savePosition = useCallback((pos) => {
        try {
            localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos));
        } catch (e) {
            console.error('Failed to save position:', e);
        }
    }, []);

    const handleDragMove = useCallback((clientX, clientY) => {
        if (!isDragging) return;

        const deltaX = clientX - startDrag.x;
        const deltaY = clientY - startDrag.y;

        const newX = startPosition.x + deltaX;
        const newY = startPosition.y + deltaY;

        setPosition({ x: newX, y: newY });
    }, [isDragging, startDrag, startPosition]);

    useEffect(() => {
        const handleMouseUp = () => {
            savePosition(position);
            setIsDragging(false);
        };

        const handleMouseMove = (e) => {
            handleDragMove(e.clientX, e.clientY);
        };

        const handleTouchEnd = () => {
            savePosition(position);
            setIsDragging(false);
        };

        const handleTouchMove = (e) => {
            if (e.touches && e.touches.length > 0) {
                handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        if (isDragging) {
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('touchcancel', handleTouchEnd);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
        }

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchEnd);
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, [isDragging, handleDragMove, position, savePosition]);

    const handleClose = () => {
        savePosition(position);
        onClose();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handleDragStart = useCallback((e) => {
        e.preventDefault();
        
        const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
        
        setIsDragging(true);
        setStartDrag({ x: clientX, y: clientY });
        setStartPosition({ x: position.x, y: position.y });
    }, [position]);

    const handleTouchStartPassive = useCallback((e) => {
        const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
        
        setIsDragging(true);
        setStartDrag({ x: clientX, y: clientY });
        setStartPosition({ x: position.x, y: position.y });
    }, [position]);

    if (!visible || !versions || versions.length === 0) return null;

    const primaryColor = themeColors['motion-primary'] || '#9966ff';
    const secondaryColor = themeColors['motion-tertiary'] || '#8a4fff';

    return (
        <div 
            className={styles.modalOverlay}
            onClick={handleOverlayClick}
            onTouchEnd={handleOverlayClick}
        >
            <div 
                className={styles.modalContainer}
                ref={modalRef}
                style={{
                    transform: isDragging 
                        ? `translate(${position.x}px, ${position.y}px)` 
                        : `translate(${position.x}px, ${position.y}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                }}
            >
                <div 
                    className={`${styles.modalHeader} ${isDragging ? styles.dragging : ''}`}
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                    }}
                    onMouseDown={handleDragStart}
                    onTouchStart={handleTouchStartPassive}
                >
                    <div className={styles.dragHandle}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className={styles.dragIcon}
                        >
                            <path d="M11 4h6M11 20h6M4 11v6M20 11v6" />
                            <path d="M4 4h6M14 4h6M4 11h6M14 11h6" />
                        </svg>
                    </div>
                    <h2 className={styles.title}>
                        {locale === 'zh-cn' ? '版本更新' : 'Version Update'}
                    </h2>
                </div>

                <div 
                    className={styles.modalContent}
                    ref={containerRef}
                >
                    <div className={styles.warningBanner}>
                        <div className={styles.warningIcon}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                                <path d="M12 9v4" />
                                <path d="M12 17h.01" />
                            </svg>
                        </div>
                        <div className={styles.warningContent}>
                            <strong>
                                {locale === 'zh-cn' ? '注意：' : 'Note: '}
                            </strong>
                            <span>
                                {locale === 'zh-cn'
                                    ? '此版本信息是从代码仓库读取的最新更新内容。由于部署需要一定时间，新功能可能需要等待一段时间才能在当前环境中显示。请耐心等待部署完成。'
                                    : 'This version information is read from the code repository. Due to deployment time, new features may take a while to appear in the current environment. Please be patient.'}
                            </span>
                        </div>
                    </div>
                    {versions.map((versionInfo, index) => (
                        <div key={`${versionInfo.version}-${index}`} className={styles.versionSection}>
                            <div className={styles.versionInfo}>
                                <div
                                    className={styles.versionBadge}
                                    style={{
                                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                                    }}
                                >
                                    {locale === 'zh-cn' ? `版本 ${versionInfo.version}` : `Version ${versionInfo.version}`}
                                </div>
                                <div className={styles.updateDate}>
                                    {locale === 'zh-cn' ? `更新日期: ${versionInfo.date}` : `Update Date: ${versionInfo.date}`}
                                </div>
                            </div>

                            <div className={styles.changesContainer}>
                                <h3 className={styles.changesTitle}>
                                    {locale === 'zh-cn' ? '更新内容' : 'Changes'}
                                </h3>
                                <div className={styles.changesList}>
                                    {versionInfo.changes.map((change, changeIndex) => (
                                        <div key={changeIndex} className={styles.changeItem}>
                                            <span className={`${styles.changeType} ${styles[change.type]}`}>
                                                {change.type === 'feature' && '✨'}
                                                {change.type === 'improvement' && '🌠'}
                                                {change.type === 'bugfix' && '🐛'}
                                                {change.type === 'other' && '📝'}
                                            </span>
                                            <span className={styles.changeTypeText}>
                                                {change.type === 'feature' && (locale === 'zh-cn' ? '新增' : 'Feature')}
                                                {change.type === 'improvement' && (locale === 'zh-cn' ? '优化' : 'Improvement')}
                                                {change.type === 'bugfix' && (locale === 'zh-cn' ? '修复' : 'Bugfix')}
                                                {change.type === 'other' && (locale === 'zh-cn' ? '其他' : 'Other')}
                                            </span>
                                            <span className={styles.changeText}>{change.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {index < versions.length - 1 && <div className={styles.versionDivider}></div>}
                        </div>
                    ))}
                </div>

                <div className={styles.modalFooter}>
                    <button
                        className={styles.closeButtonFull}
                        onClick={handleClose}
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                        }}
                    >
                        {locale === 'zh-cn' ? '关闭' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

UpdateLogModal.propTypes = {
    intl: intlShape.isRequired,
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    versions: PropTypes.arrayOf(PropTypes.shape({
        version: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
        changes: PropTypes.arrayOf(PropTypes.shape({
            type: PropTypes.oneOf(['feature', 'improvement', 'bugfix', 'other']).isRequired,
            text: PropTypes.string.isRequired
        })).isRequired
    })).isRequired,
    themeColors: PropTypes.object,
    locale: PropTypes.string
};

export const shouldShowUpdateLog = (currentVersion) => {
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
    
    if (!lastSeenVersion || lastSeenVersion !== currentVersion) {
        return true;
    }

    return false;
};

export const parseCommitMessage = (commitMessage, lastVersion = '1.0.0') => {
    const versionMatch = commitMessage.match(/__([\d.]+)__/);
    let version = versionMatch ? versionMatch[1] : null;
    
    if (!version) {
        version = lastVersion + '1';
    }

    let content = commitMessage.replace(/__[\d.]+__/g, '').trim();
    
    const changes = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        let type = 'other';
        
        const lowerLine = trimmedLine.toLowerCase();
        if (lowerLine.includes('新增') || lowerLine.includes('添加') || lowerLine.includes('new') || lowerLine.includes('add')) {
            type = 'feature';
        } else if (lowerLine.includes('优化') || lowerLine.includes('改进') || lowerLine.includes('improve') || lowerLine.includes('optimize')) {
            type = 'improvement';
        } else if (lowerLine.includes('修复') || lowerLine.includes('bug') || lowerLine.includes('fix')) {
            type = 'bugfix';
        }
        
        const cleanText = trimmedLine.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
        
        if (cleanText) {
            changes.push({
                type,
                text: cleanText
            });
        }
    });

    if (changes.length === 0 && content) {
        changes.push({
            type: 'other',
            text: content
        });
    }

    return { version, changes };
};

export const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default injectIntl(UpdateLogModal);

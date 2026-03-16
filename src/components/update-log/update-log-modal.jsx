 import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, injectIntl, intlShape } from 'react-intl';
import Box from '../box/box.jsx';
import styles from './update-log-modal.css';

const STORAGE_KEY = 'remixwarp_last_seen_version';
const DONT_SHOW_KEY = 'remixwarp_dont_show_updates';

const UpdateLogModal = ({ intl, visible, onClose, versions }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem(DONT_SHOW_KEY, 'true');
        }
        // 记录已查看的最新版本
        if (versions && versions.length > 0) {
            localStorage.setItem(STORAGE_KEY, versions[0].version);
        }
        onClose();
    };

    const handleCheckboxChange = (e) => {
        setDontShowAgain(e.target.checked);
    };

    if (!visible || !versions || versions.length === 0) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.title}>
                        <FormattedMessage
                            defaultMessage="版本更新"
                            description="Update log modal title"
                            id="gui.updateLog.title"
                        />
                    </h2>
                    <button 
                        className={styles.closeButton}
                        onClick={handleClose}
                        aria-label={intl.formatMessage({
                            defaultMessage: '关闭',
                            description: 'Close button label',
                            id: 'gui.updateLog.close'
                        })}
                    >
                        ×
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {versions.map((versionInfo, index) => (
                        <div key={versionInfo.version} className={styles.versionSection}>
                            <div className={styles.versionInfo}>
                                <div className={styles.versionBadge}>
                                    <FormattedMessage
                                        defaultMessage="版本 {version}"
                                        description="Version number display"
                                        id="gui.updateLog.version"
                                        values={{ version: versionInfo.version }}
                                    />
                                </div>
                                <div className={styles.updateDate}>
                                    <FormattedMessage
                                        defaultMessage="更新日期: {date}"
                                        description="Update date display"
                                        id="gui.updateLog.date"
                                        values={{ date: versionInfo.date }}
                                    />
                                </div>
                            </div>

                            <div className={styles.changesContainer}>
                                <h3 className={styles.changesTitle}>
                                    <FormattedMessage
                                        defaultMessage="更新内容"
                                        description="Changes section title"
                                        id="gui.updateLog.changesTitle"
                                    />
                                </h3>
                                <div className={styles.changesList}>
                                    {versionInfo.changes.map((change, changeIndex) => (
                                        <div key={changeIndex} className={styles.changeItem}>
                                            <span className={`${styles.changeType} ${styles[change.type]}`}>
                                                {change.type === 'feature' && '✨'}
                                                {change.type === 'improvement' && '⚡'}
                                                {change.type === 'bugfix' && '🐛'}
                                                {change.type === 'other' && '📝'}
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
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={handleCheckboxChange}
                            className={styles.checkbox}
                        />
                        <span className={styles.checkboxText}>
                            <FormattedMessage
                                defaultMessage="不再显示此版本更新"
                                description="Don't show again checkbox"
                                id="gui.updateLog.dontShowAgain"
                            />
                        </span>
                    </label>
                    <button 
                        className={styles.confirmButton}
                        onClick={handleClose}
                    >
                        <FormattedMessage
                            defaultMessage="知道了"
                            description="Confirm button text"
                            id="gui.updateLog.confirm"
                        />
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
    })).isRequired
};

// 检查是否需要显示更新日志
export const shouldShowUpdateLog = (currentVersion) => {
    // 如果用户选择了不再显示
    if (localStorage.getItem(DONT_SHOW_KEY) === 'true') {
        return false;
    }

    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
    
    // 如果没有记录过版本，或者当前版本与上次查看的版本不同
    if (!lastSeenVersion || lastSeenVersion !== currentVersion) {
        return true;
    }

    return false;
};

// 解析提交信息中的版本号和更新内容
export const parseCommitMessage = (commitMessage, lastVersion = '1.0.0') => {
    const versionMatch = commitMessage.match(/##([\d.]+)##/);
    let version = versionMatch ? versionMatch[1] : null;
    
    // 如果没有检测到版本号，自动递增版本号
    if (!version) {
        const versionParts = lastVersion.split('.').map(Number);
        if (versionParts.length >= 3) {
            versionParts[2] += 1; // 增加第三位版本号
            version = versionParts.join('.');
        } else {
            version = lastVersion;
        }
    }

    // 移除版本号标记，获取更新内容
    let content = commitMessage.replace(/##[\d.]+##/g, '').trim();
    
    // 解析更新内容
    const changes = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        let type = 'other';
        
        // 根据关键词判断更新类型
        const lowerLine = trimmedLine.toLowerCase();
        if (lowerLine.includes('新增') || lowerLine.includes('添加') || lowerLine.includes('new') || lowerLine.includes('add')) {
            type = 'feature';
        } else if (lowerLine.includes('优化') || lowerLine.includes('改进') || lowerLine.includes('improve') || lowerLine.includes('optimize')) {
            type = 'improvement';
        } else if (lowerLine.includes('修复') || lowerLine.includes('bug') || lowerLine.includes('fix')) {
            type = 'bugfix';
        }
        
        // 移除列表标记
        const cleanText = trimmedLine.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
        
        if (cleanText) {
            changes.push({
                type,
                text: cleanText
            });
        }
    });

    // 如果没有解析到任何内容，将整个提交信息作为一条更新
    if (changes.length === 0 && content) {
        changes.push({
            type: 'other',
            text: content
        });
    }

    return { version, changes };
};

// 获取当前日期字符串
export const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default injectIntl(UpdateLogModal);

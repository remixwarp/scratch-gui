/**
 * 版本管理工具
 * 用于检测应用更新和管理版本更新日志
 */

const VERSION_STORAGE_KEY = 'remixwarp_last_seen_version';
const DONT_SHOW_KEY = 'remixwarp_dont_show_updates';
const VERSION_HISTORY_KEY = 'remixwarp_version_history';

/**
 * 获取当前版本号
 * @returns {string} 当前版本号
 */
export const getCurrentVersion = () => {
    // 从 package.json 或环境变量获取版本号
    return process.env.APP_VERSION || '3.2.37';
};

/**
 * 获取上次查看的版本号
 * @returns {string|null} 上次查看的版本号
 */
export const getLastSeenVersion = () => {
    return localStorage.getItem(VERSION_STORAGE_KEY);
};

/**
 * 设置上次查看的版本号
 * @param {string} version - 版本号
 */
export const setLastSeenVersion = (version) => {
    localStorage.setItem(VERSION_STORAGE_KEY, version);
};

/**
 * 检查是否应该显示更新日志
 * @param {string} currentVersion - 当前版本号
 * @returns {boolean} 是否应该显示
 */
export const shouldShowUpdateLog = (currentVersion) => {
    // 如果用户选择了不再显示
    if (localStorage.getItem(DONT_SHOW_KEY) === 'true') {
        return false;
    }

    const lastSeenVersion = getLastSeenVersion();
    
    // 如果没有记录过版本，或者当前版本与上次查看的版本不同
    if (!lastSeenVersion || lastSeenVersion !== currentVersion) {
        return true;
    }

    return false;
};

/**
 * 重置"不再显示"设置
 */
export const resetDontShowSetting = () => {
    localStorage.removeItem(DONT_SHOW_KEY);
};

/**
 * 获取版本历史记录
 * @returns {Array} 版本历史数组
 */
export const getVersionHistory = () => {
    try {
        const history = localStorage.getItem(VERSION_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error('Error reading version history:', e);
        return [];
    }
};

/**
 * 添加版本历史记录
 * @param {Object} versionInfo - 版本信息
 * @param {string} versionInfo.version - 版本号
 * @param {string} versionInfo.date - 更新日期
 * @param {Array} versionInfo.changes - 更新内容
 */
export const addVersionHistory = (versionInfo) => {
    try {
        const history = getVersionHistory();
        
        // 检查是否已存在该版本
        const existingIndex = history.findIndex(v => v.version === versionInfo.version);
        if (existingIndex >= 0) {
            // 更新现有记录
            history[existingIndex] = {
                ...history[existingIndex],
                ...versionInfo,
                updatedAt: new Date().toISOString()
            };
        } else {
            // 添加新记录
            history.push({
                ...versionInfo,
                createdAt: new Date().toISOString()
            });
        }
        
        // 只保留最近 20 个版本记录
        if (history.length > 20) {
            history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            history.length = 20;
        }
        
        localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Error saving version history:', e);
    }
};

/**
 * 解析提交信息中的版本号和更新内容
 * @param {string} commitMessage - 提交信息
 * @param {string} lastVersion - 上一个版本号（用于自动递增）
 * @returns {Object} 解析结果
 */
export const parseCommitMessage = (commitMessage, lastVersion = '1.0.0') => {
    if (!commitMessage || typeof commitMessage !== 'string') {
        return {
            version: incrementVersion(lastVersion),
            changes: [{ type: 'other', text: '常规更新' }],
            rawMessage: commitMessage
        };
    }

    // 匹配 ##版本号## 格式
    const versionMatch = commitMessage.match(/##([\d.]+)##/);
    let version = versionMatch ? versionMatch[1] : null;
    
    // 如果没有检测到版本号，自动递增版本号
    if (!version) {
        version = incrementVersion(lastVersion);
    }

    // 移除版本号标记，获取更新内容
    let content = commitMessage.replace(/##[\d.]+##/g, '').trim();
    
    // 解析更新内容
    const changes = parseChanges(content);

    return {
        version,
        changes,
        rawMessage: commitMessage
    };
};

/**
 * 递增版本号
 * @param {string} version - 当前版本号
 * @returns {string} 递增后的版本号
 */
export const incrementVersion = (version) => {
    const versionParts = version.split('.').map(Number);
    
    // 确保版本号格式正确
    while (versionParts.length < 3) {
        versionParts.push(0);
    }
    
    // 增加第三位版本号（补丁版本）
    versionParts[2] += 1;
    
    // 处理进位
    if (versionParts[2] >= 100) {
        versionParts[2] = 0;
        versionParts[1] += 1;
    }
    if (versionParts[1] >= 100) {
        versionParts[1] = 0;
        versionParts[0] += 1;
    }
    
    return versionParts.join('.');
};

/**
 * 解析更新内容
 * @param {string} content - 更新内容文本
 * @returns {Array} 更新内容数组
 */
export const parseChanges = (content) => {
    const changes = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        let type = 'other';
        
        // 根据关键词判断更新类型
        const lowerLine = trimmedLine.toLowerCase();
        if (lowerLine.includes('新增') || lowerLine.includes('添加') || 
            lowerLine.includes('new') || lowerLine.includes('add') ||
            lowerLine.includes('feature')) {
            type = 'feature';
        } else if (lowerLine.includes('优化') || lowerLine.includes('改进') || 
                   lowerLine.includes('improve') || lowerLine.includes('optimize') ||
                   lowerLine.includes('enhance')) {
            type = 'improvement';
        } else if (lowerLine.includes('修复') || lowerLine.includes('bug') || 
                   lowerLine.includes('fix') || lowerLine.includes('issue')) {
            type = 'bugfix';
        }
        
        // 移除列表标记和常见前缀
        let cleanText = trimmedLine
            .replace(/^[-*•]\s*/, '')
            .replace(/^\d+\.\s*/, '')
            .replace(/^(新增|添加|优化|改进|修复|修复了|解决|调整|更新|删除|移除)\s*[:：]?\s*/i, '');
        
        if (cleanText) {
            changes.push({
                type,
                text: cleanText
            });
        }
    });

    // 如果没有解析到任何内容，将整个内容作为一条更新
    if (changes.length === 0 && content.trim()) {
        changes.push({
            type: 'other',
            text: content.trim()
        });
    }

    return changes;
};

/**
 * 获取当前日期字符串
 * @returns {string} 格式化的日期字符串
 */
export const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * 检查版本更新
 * @returns {Object|null} 更新信息，如果没有更新则返回 null
 */
export const checkForUpdate = async () => {
    try {
        const currentVersion = getCurrentVersion();
        const lastSeenVersion = getLastSeenVersion();
        
        // 如果是首次使用或版本有变化
        if (!lastSeenVersion || lastSeenVersion !== currentVersion) {
            // 尝试从 GitHub API 获取最新的提交信息
            const updateInfo = await fetchUpdateInfo();
            
            if (updateInfo) {
                // 保存到版本历史
                addVersionHistory({
                    version: currentVersion,
                    date: getCurrentDate(),
                    changes: updateInfo.changes,
                    commitMessage: updateInfo.rawMessage
                });
                
                return {
                    hasUpdate: true,
                    currentVersion,
                    lastVersion: lastSeenVersion,
                    ...updateInfo
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error checking for update:', error);
        return null;
    }
};

/**
 * 从 GitHub 获取更新信息
 * @returns {Object|null} 更新信息
 */
export const fetchUpdateInfo = async () => {
    try {
        // 从 package.json 获取仓库信息
        const repoUrl = process.env.REPO_URL || 'https://github.com/remixwarp/scratch-gui';
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        
        if (!repoMatch) {
            console.warn('Could not parse repository URL');
            return generateDefaultUpdateInfo();
        }
        
        const [, owner, repo] = repoMatch;
        
        // 调用 GitHub API 获取最近的提交
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`);
        
        if (!response.ok) {
            console.warn('Failed to fetch commits from GitHub');
            return generateDefaultUpdateInfo();
        }
        
        const commits = await response.json();
        
        if (!commits || commits.length === 0) {
            return generateDefaultUpdateInfo();
        }
        
        // 获取最新的提交信息
        const latestCommit = commits[0];
        const commitMessage = latestCommit.commit.message;
        const lastVersion = getLastSeenVersion() || '1.0.0';
        
        const parsedInfo = parseCommitMessage(commitMessage, lastVersion);
        
        return {
            ...parsedInfo,
            commitSha: latestCommit.sha,
            commitUrl: latestCommit.html_url,
            author: latestCommit.commit.author.name,
            date: latestCommit.commit.author.date
        };
    } catch (error) {
        console.error('Error fetching update info:', error);
        return generateDefaultUpdateInfo();
    }
};

/**
 * 生成默认更新信息
 * @returns {Object} 默认更新信息
 */
export const generateDefaultUpdateInfo = () => {
    const lastVersion = getLastSeenVersion() || '1.0.0';
    const newVersion = incrementVersion(lastVersion);
    
    return {
        version: newVersion,
        changes: [
            { type: 'improvement', text: '性能优化和稳定性改进' },
            { type: 'other', text: '常规维护和更新' }
        ],
        date: getCurrentDate()
    };
};

/**
 * 标记当前版本为已查看
 */
export const markVersionAsSeen = () => {
    const currentVersion = getCurrentVersion();
    setLastSeenVersion(currentVersion);
};

export default {
    getCurrentVersion,
    getLastSeenVersion,
    setLastSeenVersion,
    shouldShowUpdateLog,
    resetDontShowSetting,
    getVersionHistory,
    addVersionHistory,
    parseCommitMessage,
    incrementVersion,
    parseChanges,
    getCurrentDate,
    checkForUpdate,
    fetchUpdateInfo,
    generateDefaultUpdateInfo,
    markVersionAsSeen
};

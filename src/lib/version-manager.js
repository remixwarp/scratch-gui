/**
 * 版本管理工具
 * 用于检测应用更新和管理版本更新日志
 */

const VERSION_STORAGE_KEY = 'remixwarp_last_seen_version';
const DONT_SHOW_KEY = 'remixwarp_dont_show_updates';
const VERSION_HISTORY_KEY = 'remixwarp_version_history';
const CURRENT_VERSION_KEY = 'remixwarp_current_version';

/**
 * 获取当前版本号
 * @returns {string} 当前版本号
 */
export const getCurrentVersion = () => {
    // 优先从 localStorage 获取（从 GitHub 提交中解析的）
    const storedVersion = localStorage.getItem(CURRENT_VERSION_KEY);
    if (storedVersion) {
        return storedVersion;
    }
    // 从 package.json 或环境变量获取版本号
    return process.env.APP_VERSION || '1.0.0';
};

/**
 * 设置当前版本号
 * @param {string} version - 版本号
 */
export const setCurrentVersion = (version) => {
    localStorage.setItem(CURRENT_VERSION_KEY, version);
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

    // 匹配 __版本号__ 格式，支持更广泛的版本号格式
    const versionMatch = commitMessage.match(/__([\d.]+(?:-[\w.]+)?(?:\+[\w.]+)?)__/);
    let version = versionMatch ? versionMatch[1] : null;
    
    // 如果没有检测到版本号，自动递增版本号
    if (!version) {
        version = incrementVersion(lastVersion);
    }

    // 移除版本号标记，获取更新内容
    let content = commitMessage.replace(/__[\d.]+(?:-[\w.]+)?(?:\+[\w.]+)?__/g, '').trim();
    
    // 清理可能的多余下划线
    content = content.replace(/^_+|_+$/g, '').trim();
    
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
 * 获取当前日期时间字符串（精确到分钟）
 * @returns {string} 格式化的日期时间字符串
 */
export const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
};

/**
 * 格式化日期时间（精确到分钟）
 * @param {string|Date} date - 日期对象或字符串
 * @returns {string} 格式化的日期时间字符串
 */
export const formatDateTime = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
};

/**
 * 检查版本更新
 * @returns {Object|null} 更新信息，如果没有更新则返回 null
 */
export const checkForUpdate = async () => {
    try {
        // 从 GitHub 获取最新的版本信息
        const updateInfo = await fetchUpdateInfo();
        
        if (!updateInfo) {
            return null;
        }
        
        // 更新当前版本号
        const newVersion = updateInfo.version;
        setCurrentVersion(newVersion);
        
        const lastSeenVersion = getLastSeenVersion();
        
        // 保存到版本历史
        addVersionHistory({
            version: newVersion,
            date: updateInfo.date || getCurrentDateTime(),
            changes: updateInfo.changes,
            commitMessage: updateInfo.rawMessage,
            commitSha: updateInfo.commitSha,
            author: updateInfo.author
        });
        
        // 如果是首次使用或版本有变化
        if (!lastSeenVersion || lastSeenVersion !== newVersion) {
            // 获取版本历史，筛选出从上次版本到当前版本的所有版本
            const versionHistory = getVersionHistory();
            const versionsToShow = getVersionsSinceLastSeen(versionHistory, lastSeenVersion);
            
            return {
                hasUpdate: true,
                currentVersion: newVersion,
                lastVersion: lastSeenVersion,
                versions: versionsToShow.length > 0 ? versionsToShow : [{
                    version: newVersion,
                    date: updateInfo.date || getCurrentDateTime(),
                    changes: updateInfo.changes,
                    commitSha: updateInfo.commitSha,
                    author: updateInfo.author
                }]
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error checking for update:', error);
        return null;
    }
};

/**
 * 从版本历史中获取从上次查看版本到当前版本的所有版本
 * @param {Array} versionHistory - 版本历史数组
 * @param {string} lastSeenVersion - 上次查看的版本号
 * @returns {Array} 版本列表
 */
export const getVersionsSinceLastSeen = (versionHistory, lastSeenVersion) => {
    if (!versionHistory || versionHistory.length === 0) {
        return [];
    }
    
    // 按版本号排序（从新到旧）
    const sortedHistory = [...versionHistory].sort((a, b) => {
        return compareVersions(b.version, a.version);
    });
    
    if (!lastSeenVersion) {
        // 首次使用，返回所有版本
        return sortedHistory;
    }
    
    // 找到上次查看的版本在历史中的位置
    const lastSeenIndex = sortedHistory.findIndex(v => v.version === lastSeenVersion);
    
    if (lastSeenIndex === -1) {
        // 上次查看的版本不在历史中，返回所有版本
        return sortedHistory;
    }
    
    // 返回从最新版本到上次查看版本之间的所有版本（不包括上次查看版本）
    return sortedHistory.slice(0, lastSeenIndex);
};

/**
 * 比较两个版本号
 * @param {string} version1 - 版本号1
 * @param {string} version2 - 版本号2
 * @returns {number} 1: version1 > version2, 0: 相等, -1: version1 < version2
 */
export const compareVersions = (version1, version2) => {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1 = v1Parts[i] || 0;
        const v2 = v2Parts[i] || 0;
        
        if (v1 > v2) return 1;
        if (v1 < v2) return -1;
    }
    
    return 0;
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
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`);
        
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
        
        // 使用提交时间作为版本时间
        const commitDate = latestCommit.commit.author.date;
        
        return {
            ...parsedInfo,
            date: formatDateTime(commitDate),
            commitSha: latestCommit.sha,
            commitUrl: latestCommit.html_url,
            author: latestCommit.commit.author.name,
            rawDate: commitDate
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
        date: getCurrentDateTime()
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
    setCurrentVersion,
    getLastSeenVersion,
    setLastSeenVersion,
    shouldShowUpdateLog,
    resetDontShowSetting,
    getVersionHistory,
    addVersionHistory,
    parseCommitMessage,
    incrementVersion,
    parseChanges,
    getCurrentDateTime,
    formatDateTime,
    checkForUpdate,
    fetchUpdateInfo,
    generateDefaultUpdateInfo,
    markVersionAsSeen
};

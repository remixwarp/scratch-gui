/**
 * 版本管理工具
 * 用于检测应用更新和管理版本更新日志
 */

const VERSION_STORAGE_KEY = 'remixwarp_last_seen_version';
const CURRENT_URL_KEY = 'remixwarp_current_url';
const DONT_SHOW_KEY = 'remixwarp_dont_show_updates';
const VERSION_HISTORY_KEY = 'remixwarp_version_history';
const CURRENT_VERSION_KEY = 'remixwarp_current_version';

/**
 * 获取当前 URL
 * @returns {string} 当前 URL
 */
export const getCurrentUrl = () => {
    return window.location.href;
};

/**
 * 存储当前 URL
 */
export const storeCurrentUrl = () => {
    const url = getCurrentUrl();
    localStorage.setItem(CURRENT_URL_KEY, url);
    console.log('存储当前 URL:', url);
};

/**
 * 获取存储的 URL
 * @returns {string|null} 存储的 URL
 */
export const getStoredUrl = () => {
    return localStorage.getItem(CURRENT_URL_KEY);
};

/**
 * 检查 URL 是否发生变化
 * @returns {boolean} URL 是否变化
 */
export const hasUrlChanged = () => {
    const currentUrl = getCurrentUrl();
    const storedUrl = getStoredUrl();
    return currentUrl !== storedUrl;
};

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
        
        // 只保留最近 50 个版本记录
        if (history.length > 50) {
            history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            history.length = 50;
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
 * 从 GitHub 获取提交历史
 * @param {number} perPage - 每页获取的提交数量
 * @returns {Array|null} 提交历史数组
 */
export const fetchCommitsFromGitHub = async (perPage = 100) => {
    try {
        // 从 package.json 获取仓库信息
        const repoUrl = process.env.REPO_URL || 'https://github.com/remixwarp/scratch-gui';
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        
        if (!repoMatch) {
            console.warn('Could not parse repository URL');
            return null;
        }
        
        const [, owner, repo] = repoMatch;
        
        // 调用 GitHub API 获取最近的提交
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}`);
        
        if (!response.ok) {
            console.warn('Failed to fetch commits from GitHub');
            return null;
        }
        
        const commits = await response.json();
        return commits;
    } catch (error) {
        console.error('Error fetching commits from GitHub:', error);
        return null;
    }
};

/**
 * 递归查找匹配的版本
 * 从 GitHub 提交历史中查找，直到找到与本地存储版本匹配的提交
 * @param {string} lastSeenVersion - 上次查看的版本号
 * @param {Array} commits - GitHub 提交历史
 * @returns {Object} 查找结果
 */
export const findMatchingVersion = (lastSeenVersion, commits) => {
    if (!commits || commits.length === 0) {
        return {
            found: false,
            versions: [],
            allCommits: []
        };
    }

    const versions = [];
    let foundIndex = -1;
    let lastVersion = lastSeenVersion || '1.0.0';

    // 遍历提交历史，解析版本号
    for (let i = 0; i < commits.length; i++) {
        const commit = commits[i];
        const commitMessage = commit.commit.message;
        
        // 解析提交信息获取版本号
        const parsedInfo = parseCommitMessage(commitMessage, lastVersion);
        const version = parsedInfo.version;
        
        // 使用提交时间作为版本时间
        const commitDate = commit.commit.author.date;
        
        const versionInfo = {
            version: version,
            date: formatDateTime(commitDate),
            changes: parsedInfo.changes,
            commitSha: commit.sha,
            commitUrl: commit.html_url,
            author: commit.commit.author.name,
            rawDate: commitDate,
            rawMessage: commitMessage
        };
        
        versions.push(versionInfo);
        
        // 检查是否找到匹配的版本
        if (lastSeenVersion && version === lastSeenVersion) {
            foundIndex = i;
            break;
        }
        
        // 更新 lastVersion 用于下一个提交的版本号计算
        lastVersion = version;
    }

    return {
        found: foundIndex !== -1,
        versions: versions,
        foundIndex: foundIndex,
        allCommits: commits
    };
};

/**
 * 检查版本更新
 * 核心逻辑：
 * 1. 实时读取当前 URL，存储当前 URL
 * 2. 从 GitHub 获取最新版本
 * 3. 对比当前版本和最新版本
 * 4. 如果版本号不同，递归读取历史版本，直到找到匹配的版本
 * 5. 返回所有需要显示的更新版本
 * @returns {Object|null} 更新信息，如果没有更新则返回 null
 */
export const checkForUpdate = async () => {
    try {
        console.log('=== 开始检查版本更新 ===');
        
        // 1. 实时读取当前 URL 并存储
        storeCurrentUrl();
        const currentUrl = getCurrentUrl();
        console.log('当前 URL:', currentUrl);
        
        // 2. 从 GitHub 获取提交历史
        const commits = await fetchCommitsFromGitHub(100);
        
        if (!commits || commits.length === 0) {
            console.warn('无法从 GitHub 获取提交历史');
            return generateDefaultUpdateInfo();
        }
        
        console.log(`获取到 ${commits.length} 条提交记录`);
        
        // 3. 获取最新提交信息
        const latestCommit = commits[0];
        const latestCommitMessage = latestCommit.commit.message;
        const lastSeenVersion = getLastSeenVersion();
        const currentStoredVersion = getCurrentVersion();
        
        console.log('上次查看版本:', lastSeenVersion);
        console.log('当前存储版本:', currentStoredVersion);
        console.log('最新提交信息:', latestCommitMessage.substring(0, 100));
        
        // 4. 解析最新版本号
        const latestParsedInfo = parseCommitMessage(latestCommitMessage, currentStoredVersion);
        const latestVersion = latestParsedInfo.version;
        
        console.log('最新版本号:', latestVersion);
        
        // 5. 更新当前版本号
        setCurrentVersion(latestVersion);
        
        // 6. 保存最新版本到历史记录
        addVersionHistory({
            version: latestVersion,
            date: formatDateTime(latestCommit.commit.author.date),
            changes: latestParsedInfo.changes,
            commitMessage: latestCommitMessage,
            commitSha: latestCommit.sha,
            author: latestCommit.commit.author.name
        });
        
        // 7. 检查是否需要显示更新
        // 如果用户选择了不再显示，直接返回 null
        if (localStorage.getItem(DONT_SHOW_KEY) === 'true') {
            console.log('用户选择了不再显示更新');
            return null;
        }
        
        // 8. 对比版本号
        // 如果最新版本与上次查看的版本相同，不显示更新
        if (lastSeenVersion && lastSeenVersion === latestVersion) {
            console.log('版本号相同，无需显示更新');
            return null;
        }
        
        // 9. 如果版本号不同，递归读取历史版本，直到找到匹配的版本
        console.log('版本号不同，开始查找历史版本...');
        
        const searchResult = findMatchingVersion(lastSeenVersion, commits);
        
        console.log(`找到 ${searchResult.versions.length} 个版本`);
        console.log('是否找到匹配版本:', searchResult.found);
        
        // 10. 准备需要显示的版本列表
        let versionsToShow = [];
        
        if (searchResult.found) {
            // 找到了匹配的版本，显示从最新版本到匹配版本之间的所有版本（不包括匹配版本）
            versionsToShow = searchResult.versions.slice(0, searchResult.foundIndex);
            console.log(`显示从最新版本到上次查看版本之间的 ${versionsToShow.length} 个版本`);
        } else {
            // 没有找到匹配的版本，显示所有获取到的版本
            versionsToShow = searchResult.versions;
            console.log(`未找到匹配版本，显示所有 ${versionsToShow.length} 个版本`);
        }
        
        // 11. 返回更新信息
        return {
            hasUpdate: true,
            currentVersion: latestVersion,
            lastVersion: lastSeenVersion,
            versions: versionsToShow,
            url: currentUrl,
            isUrlChanged: hasUrlChanged()
        };
        
    } catch (error) {
        console.error('检查版本更新时出错:', error);
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
        hasUpdate: true,
        currentVersion: newVersion,
        lastVersion: lastVersion,
        versions: [{
            version: newVersion,
            date: getCurrentDateTime(),
            changes: [
                { type: 'improvement', text: '性能优化和稳定性改进' },
                { type: 'other', text: '常规维护和更新' }
            ],
            commitSha: null,
            author: 'System'
        }],
        url: getCurrentUrl(),
        isUrlChanged: hasUrlChanged()
    };
};

/**
 * 标记当前版本为已查看
 */
export const markVersionAsSeen = () => {
    const currentVersion = getCurrentVersion();
    setLastSeenVersion(currentVersion);
    console.log('已标记版本为已查看:', currentVersion);
};

/**
 * 获取当前日期字符串
 * @returns {string} 格式化的日期字符串
 */
export const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default {
    getCurrentUrl,
    storeCurrentUrl,
    getStoredUrl,
    hasUrlChanged,
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
    compareVersions,
    fetchCommitsFromGitHub,
    findMatchingVersion,
    checkForUpdate,
    generateDefaultUpdateInfo,
    markVersionAsSeen,
    getCurrentDate
};

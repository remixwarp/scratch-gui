/**
 * 配置迁移文件（.rjc）读写辅助，兼容旧版 .rwc。
 *
 * .rjc 是「文件 → 配置迁移 → 导出全部配置」的新扩展名，内部结构与旧版
 * .rwc 完全一致：一个包含 settings.json / version.json 的 ZIP 压缩包。
 * 为方便外部工具、教程或手工改名后的配置文件，这里额外兼容：
 *   1. ZIP 压缩包（优先 settings.json / config.json，其次任意含配置字段的 json）
 *   2. 纯 JSON 文本（直接拖入或改名成 .rjc 的配置文件）
 */

export const CONFIG_FILE_EXTENSIONS = ['.rjc', '.rwc'];

// 供 <input type="file" accept> 使用：既接受新格式，也接受旧的 .rwc
export const CONFIG_FILE_ACCEPT = CONFIG_FILE_EXTENSIONS.join(',');

const CONFIG_DATA_KEYS = [
    'addonSettings',
    'localStorageSettings',
    'themeSettings',
    'shortcuts',
    'language',
    'workspaceBookmarks',
    'reduxSettings'
];

const looksLikeConfig = data => (
    Boolean(data) &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    CONFIG_DATA_KEYS.some(key => data[key] !== undefined && data[key] !== null)
);

const readJsonEntry = async (zip, name) => {
    try {
        return JSON.parse(await zip.files[name].async('text'));
    } catch (e) {
        return null;
    }
};

/**
 * 解析配置文件内容。
 * @param {ArrayBuffer} buffer 文件二进制内容
 * @returns {Promise<Object>} 配置数据（含 addonSettings / localStorageSettings 等）
 */
export const parseConfigBuffer = async buffer => {
    const {default: JSZip} = await import('@turbowarp/jszip');

    // 1) 标准格式：ZIP 压缩包
    let zip = null;
    try {
        zip = await new JSZip().loadAsync(buffer);
    } catch (e) {
        zip = null;
    }

    if (zip) {
        const entries = Object.keys(zip.files).filter(name => !zip.files[name].dir);
        const settingsEntry = entries.find(name => /(^|\/)(settings|config)\.json$/i.test(name));
        if (settingsEntry) {
            const data = await readJsonEntry(zip, settingsEntry);
            if (data) return data;
        }
        for (const name of entries) {
            if (!/\.json$/i.test(name)) continue;
            const data = await readJsonEntry(zip, name);
            if (looksLikeConfig(data)) return data;
        }
        throw new Error('设置文件不存在');
    }

    // 2) 兼容纯 JSON 文本的配置文件
    let text = '';
    try {
        text = new TextDecoder('utf-8').decode(buffer);
    } catch (e) {
        text = '';
    }
    if (text.trim()) {
        let data = null;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = null;
        }
        if (looksLikeConfig(data)) return data;
    }

    throw new Error('不是有效的配置文件（需要 .rjc / .rwc 压缩包或 JSON）');
};

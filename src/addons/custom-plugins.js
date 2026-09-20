/**
 * 自定义插件登记处（Custom Plugins Registry）
 *
 * 允许用户在运行时导入自己的插件，无需重新打包项目。
 * 插件格式：单个 .js 文件（ES Module），导出 manifest 和默认导出入口函数：
 *
 *   export const manifest = {
 *       name: '我的插件',
 *       description: '插件说明',
 *       tags: ['custom'],
 *       settings: [...],      // 可选，与内置插件 addon.json 的 settings 结构一致
 *       css: '...',           // 可选，插件自带的样式
 *       enabledByDefault: false
 *   };
 *
 *   export default async function ({addon, console, msg}) {
 *       // 插件逻辑
 *   }
 *
 * 插件代码持久化在 IndexedDB（localStorage 容量有限），
 * 开关状态与设置项仍走现有的 SettingsStore（localStorage tw:addons）。
 */

import {nanoid} from 'nanoid';

// 自定义插件 ID 统一加前缀，避免与内置插件冲突
export const CUSTOM_PREFIX = 'custom-';

// 内存注册表：id -> {manifest, code, trusted}
const registry = new Map();

// 编译缓存：id -> 入口函数（同一插件只解析一次）
const moduleCache = new Map();

// ---- localStorage 持久化 ---------------------------------------------------
// 插件代码与清单直接存 localStorage（与设置存储同源、无 IndexedDB 的事务/隐私模式问题）。
// 所有读写均为同步：导入/删除后 UI 立即刷新，持久化失败仅告警不影响内存操作。

const PLUGINS_STORAGE_KEY = 'bilup:customPlugins';

const readPersistedPlugins = () => {
    try {
        const raw = localStorage.getItem(PLUGINS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
};

const writePersistedPlugins = () => {
    try {
        localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(Array.from(registry.values())));
    } catch (e) {
        // 存储已满/被禁用：内存中的插件仍然可用，仅提示无法持久化
        console.warn('[Custom Plugins] 持久化失败（localStorage）:', e);
    }
};

// ---- 插件代码解析 ---------------------------------------------------------

// 从函数体起始花括号扫描到匹配的右花括号（跳过字符串/模板字符串/注释）
// 注意：示例插件格式固定（无正则字面量），如遇正则会误判为注释，格式校验会失败并提示
const scanMatchingBrace = (code, startBrace) => {
    let depth = 0;
    let inString = null;
    let inLineComment = false;
    let inBlockComment = false;
    let inTemplate = false;
    for (let i = startBrace; i < code.length; i++) {
        const c = code[i];
        const next = code[i + 1];
        if (inLineComment) {
            if (c === '\n') {
                inLineComment = false;
            }
            continue;
        }
        if (inBlockComment) {
            if (c === '*' && next === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }
        if (inString) {
            if (c === '\\') {
                i++;
            } else if (c === inString) {
                inString = null;
            }
            continue;
        }
        if (inTemplate) {
            if (c === '\\') {
                i++;
            } else if (c === '`') {
                inTemplate = false;
            }
            // ${...} 内部的花括号由模板字符串消化，忽略
            continue;
        }
        if (c === '/' && next === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (c === '/' && next === '*') {
            inBlockComment = true;
            i++;
            continue;
        }
        if (c === "'" || c === '"' || c === '`') {
            if (c === '`') {
                inTemplate = true;
            } else {
                inString = c;
            }
            continue;
        }
        if (c === '{') {
            depth++;
        } else if (c === '}') {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
};

/**
 * 解析自定义插件源码（ES Module 格式），不依赖动态 import。
 * 要求格式固定：
 *   export const manifest = {...};
 *   export default async function ({addon, console}) {...}
 * @returns {{manifest: object, entry: Function}}
 */
const parseCustomPlugin = code => {
    const defaultIdx = code.indexOf('export default');
    if (defaultIdx === -1) {
        throw new Error('未找到 "export default" 入口函数');
    }
    // 1. 提取 manifest 对象字面量（位于 export default 之前）
    const manifestSection = code.slice(0, defaultIdx);
    const manifestMatch = manifestSection.match(/export\s+const\s+manifest\s*=\s*/);
    if (!manifestMatch) {
        throw new Error('未找到 "export const manifest = {...}"');
    }
    const manifestText = manifestSection.slice(manifestMatch.index + manifestMatch[0].length)
        .trim()
        .replace(/;?\s*$/, '');
    let manifest;
    try {
        manifest = new Function(`"use strict"; return (${manifestText});`)();
    } catch (e) {
        throw new Error(`manifest 解析失败: ${e.message}`);
    }
    if (!manifest || typeof manifest !== 'object') {
        throw new Error('manifest 必须是对象');
    }
    // 2. 提取入口函数（export default <函数表达式>；函数体在参数右括号之后）
    const defaultSection = code.slice(defaultIdx);
    const closeParen = defaultSection.indexOf(')');
    if (closeParen === -1) {
        throw new Error('入口函数的参数列表不完整');
    }
    const openBrace = defaultSection.indexOf('{', closeParen);
    if (openBrace === -1) {
        throw new Error('入口函数体为空');
    }
    const endBrace = scanMatchingBrace(defaultSection, openBrace);
    if (endBrace === -1) {
        throw new Error('入口函数的花括号不匹配');
    }
    const fnSource = defaultSection.slice(0, endBrace + 1).replace(/^export\s+default\s+/, '');
    let entry;
    try {
        entry = new Function(`"use strict"; return (${fnSource});`)();
    } catch (e) {
        throw new Error(`入口函数解析失败: ${e.message}`);
    }
    if (typeof entry !== 'function') {
        throw new Error('默认导出必须是函数');
    }
    return {manifest, entry};
};

// 规范化用户提供的 manifest，补齐 AddonRunner 需要的字段
const normalizeManifest = (id, manifest) => {
    const result = {...manifest};
    if (!result.name) {
        result.name = id;
    }
    if (!Array.isArray(result.tags)) {
        result.tags = [];
    }
    if (!result.tags.includes('custom')) {
        result.tags = [...result.tags, 'custom'];
    }
    // 入口脚本统一命名为 userscript.js，与内置插件结构一致
    result.userscripts = [{url: 'userscript.js'}];
    if (typeof result.css === 'string' && result.css.trim()) {
        result.userstyles = [{url: 'style.css'}];
    } else {
        delete result.userstyles;
    }
    return result;
};

// ---- 对外 API -------------------------------------------------------------

/**
 * 从 localStorage 重建注册表（页面启动 / 跨窗口同步时调用）。
 * 以存储为准：存储里没有的本地插件会被移除，保证跨窗口增删一致。
 * 保留 async 签名以兼容现有调用点（.then 用法）。
 */
const refreshFromDB = async () => {
    const records = readPersistedPlugins();
    const storedIds = new Set(records.map(record => record.id));
    // 移除已被其他窗口删除的插件
    for (const id of Array.from(registry.keys())) {
        if (!storedIds.has(id)) {
            registry.delete(id);
            moduleCache.delete(id);
        }
    }
    for (const record of records) {
        registry.set(record.id, {
            manifest: record.manifest,
            code: record.code,
            trusted: !!record.trusted
        });
    }
};

/**
 * 注册一个新插件（内存 + localStorage，同步生效）
 * @param {object} manifest 插件清单（未规范化也可，会自动补全）
 * @param {string} code 插件源码（ES Module）
 * @param {boolean} trusted 用户是否已确认信任该插件
 * @returns {Promise<string>} 生成的插件 id
 */
const add = async (manifest, code, trusted) => {
    const id = `${CUSTOM_PREFIX}${nanoid(8)}`;
    const normalized = normalizeManifest(id, manifest);
    const record = {
        id,
        manifest: normalized,
        code,
        trusted: !!trusted
    };
    registry.set(id, record);
    writePersistedPlugins();
    return id;
};

/**
 * 删除插件（内存 + localStorage，同步生效）
 */
const remove = async id => {
    if (!registry.has(id)) {
        return;
    }
    registry.delete(id);
    moduleCache.delete(id);
    // 清理设置存储残留并写回，避免跨窗口同步时触发未知插件异常
    delete SettingsStore.store[id];
    SettingsStore.saveToLocalStorage();
    writePersistedPlugins();
};

/**
 * 设置插件的信任状态
 */
const setTrusted = async (id, trusted) => {
    const record = registry.get(id);
    if (!record) {
        return;
    }
    record.trusted = !!trusted;
    writePersistedPlugins();
};

/**
 * 获取插件的运行入口，结构模仿 addonEntries[id]() 的返回值
 * @returns {{resources: object}}
 */
const getEntry = id => {
    const record = registry.get(id);
    if (!record) {
        throw new Error(`Unknown custom plugin: ${id}`);
    }
    if (!moduleCache.has(id)) {
        // 运行时解析并编译入口函数（同一插件只解析一次）
        const {entry} = parseCustomPlugin(record.code);
        moduleCache.set(id, entry);
    }
    const resources = {
        'userscript.js': moduleCache.get(id)
    };
    if (record.manifest.css) {
        resources['style.css'] = {toString: () => record.manifest.css};
    }
    return {resources};
};

const getManifest = id => {
    const record = registry.get(id);
    return record ? record.manifest : null;
};

const isTrusted = id => {
    const record = registry.get(id);
    return record ? record.trusted : false;
};

const isCustom = id => registry.has(id);

const getIds = () => Array.from(registry.keys());

const getAll = () => Array.from(registry.entries()).map(([id, record]) => ({
    id,
    manifest: record.manifest,
    trusted: record.trusted
}));

export {parseCustomPlugin};

export default {
    CUSTOM_PREFIX,
    refreshFromDB,
    add,
    remove,
    setTrusted,
    getEntry,
    getManifest,
    isTrusted,
    isCustom,
    getIds,
    getAll
};

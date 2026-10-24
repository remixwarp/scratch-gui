// 积木文本载荷（剪贴板 / 注释围栏共用）。
//
// 文本格式：
//   <!--RemixWarp-extensions-base64:<base64>--> <block ...>...</block>
//
// 扩展加载信息永远位于整条积木链文本的最前面（HTML 注释），与积木 XML 完全解耦：
//   - 渲染注释里的积木时只用 XML，不需要、也不会渲染扩展内部内容
//   - 复制 / 拖拽 / 粘贴时，扩展信息可以被单独解析出来重新加载
//
// meta 结构：
//   {
//     v: 1,
//     exts: [
//       {id: 'myext', kind: 'url', url: 'https://.../ext.js'},
//       {id: 'fileext', kind: 'file', mime: 'application/javascript', base64: '...'},
//       {id: 'coreext', kind: 'builtin'}
//     ]
//   }

const HEADER_PREFIX = '<!--RemixWarp-extensions-base64:';
const HEADER_RE = /^\s*<!--(?:RemixWarp|remixwarp|mistwarp|MistWarp)-extensions-base64:([\s\S]*?)-->/;
const TRAILING_HEADER_RE = /<!--(?:RemixWarp|remixwarp|mistwarp|MistWarp)-extensions-base64:([\s\S]*?)-->\s*$/;

const CORE_PREFIXES = new Set([
    'motion',
    'looks',
    'sound',
    'event',
    'events',
    'control',
    'sensing',
    'operator',
    'data',
    'procedures'
]);

// 内置分类之外、但属于 Scratch 本身的积木（主要是各种输入框 shadow 与自定义积木参数）
const CORE_BLOCK_TYPES = new Set([
    'math_number',
    'math_whole_number',
    'math_positive_number',
    'math_integer',
    'math_angle',
    'text',
    'colour_picker',
    'colour_random',
    'argument_reporter_string_number',
    'argument_reporter_boolean'
]);

const DEFAULT_MIME = 'application/javascript';

const encodeBase64Utf8 = value => {
    if (typeof btoa !== 'function') return null;
    try {
        return btoa(unescape(encodeURIComponent(value)));
    } catch (e) {
        return null;
    }
};

const decodeBase64Utf8 = value => {
    if (typeof atob !== 'function') return null;
    try {
        return decodeURIComponent(escape(atob(String(value).replace(/\s+/g, ''))));
    } catch (e) {
        return null;
    }
};

/**
 * 积木类型是否属于 Scratch 内置分类（内置积木不带扩展信息）。
 */
const isCoreBlockType = type => {
    if (!type || !type.includes('_')) return true;
    if (CORE_BLOCK_TYPES.has(type)) return true;
    const prefix = type.split('_')[0];
    return !prefix || CORE_PREFIXES.has(prefix);
};

const getBlockTypeExtensionId = type => (isCoreBlockType(type) ? null : type.split('_')[0]);

/**
 * 从 XML DOM 里收集所有非内置积木的扩展 ID。
 * @param {Element} xmlDom
 * @returns {string[]}
 */
const getExtensionIdsFromXmlDom = xmlDom => {
    const ids = new Set();
    if (!xmlDom) return [];
    const nodes = [xmlDom];
    while (nodes.length) {
        const node = nodes.pop();
        if (!node || node.nodeType !== 1) continue;
        if (/^(block|shadow)$/i.test(node.tagName)) {
            const id = getBlockTypeExtensionId(node.getAttribute('type'));
            if (id) ids.add(id);
        }
        for (let child = node.firstChild; child; child = child.nextSibling) nodes.push(child);
    }
    return Array.from(ids);
};

/**
 * 从 XML 文本里收集扩展 ID（不需要先解析 DOM，正则足够且更快）。
 * @param {string} xmlText
 * @returns {string[]}
 */
const getExtensionIdsFromXmlText = xmlText => {
    const ids = new Set();
    if (typeof xmlText !== 'string') return [];
    const re = /<(?:block|shadow)\b[^>]*\btype="([^"]+)"/g;
    let match;
    while ((match = re.exec(xmlText))) {
        const id = getBlockTypeExtensionId(match[1]);
        if (id) ids.add(id);
    }
    return Array.from(ids);
};

/* ------------------------------------------------------------------ */
/* 扩展加载 URL 记录                                                    */
/* ------------------------------------------------------------------ */

/** vm -> Map<extensionId, url> */
const urlRegistry = new WeakMap();

const getLoadedExtensionIds = extensionManager => {
    if (!extensionManager) return [];
    try {
        if (typeof extensionManager.getLoadedExtensions === 'function') {
            return extensionManager.getLoadedExtensions() || [];
        }
    } catch (e) { /* ignore */ }
    try {
        if (extensionManager._loadedExtensions instanceof Map) {
            return Array.from(extensionManager._loadedExtensions.keys());
        }
    } catch (e) { /* ignore */ }
    return [];
};

const extractExtensionIdFromResult = result => {
    try {
        if (result && typeof result.getInfo === 'function') {
            const info = result.getInfo();
            if (info && info.id) return info.id;
        }
    } catch (e) { /* ignore */ }
    return null;
};

/**
 * 记录扩展 URL -> ID 的对应关系。
 * scratch-vm 没有稳定的「按 ID 取 URL」接口，这里通过包装 loadExtensionURL 自行记录，
 * 同时尽量从 extensionManager / runtime 上已有的映射里补种。
 */
const installExtensionUrlRecorder = vm => {
    if (!vm || !vm.extensionManager) return null;
    let map = urlRegistry.get(vm);
    if (!map) {
        map = new Map();
        urlRegistry.set(vm, map);
    }

    const seed = urls => {
        if (!urls || typeof urls !== 'object') return;
        for (const id of Object.keys(urls)) {
            const url = urls[id];
            if (id && typeof url === 'string' && url) map.set(id, url);
        }
    };

    const em = vm.extensionManager;
    try {
        if (typeof em.getExtensionURLs === 'function') seed(em.getExtensionURLs());
    } catch (e) { /* ignore */ }
    try { seed(em.extensionURLs); } catch (e) { /* ignore */ }
    try { seed(vm.extensionURLs); } catch (e) { /* ignore */ }
    try { seed(vm.runtime && vm.runtime.extensionURLs); } catch (e) { /* ignore */ }
    try { seed(vm.runtime && vm.runtime.project && vm.runtime.project.extensionURLs); } catch (e) { /* ignore */ }

    if (!em.__rwExtensionUrlRecorderInstalled) {
        em.__rwExtensionUrlRecorderInstalled = true;

        if (typeof em.loadExtensionURL === 'function') {
            const originalLoadExtensionURL = em.loadExtensionURL.bind(em);
            em.loadExtensionURL = async function (extensionURL, ...args) {
                const before = new Set(getLoadedExtensionIds(em));
                const result = await originalLoadExtensionURL(extensionURL, ...args);
                let id = extractExtensionIdFromResult(result);
                if (!id) {
                    for (const candidate of getLoadedExtensionIds(em)) {
                        if (!before.has(candidate)) {
                            id = candidate;
                            break;
                        }
                    }
                }
                if (id) map.set(id, extensionURL);
                return result;
            };
        }

        if (typeof em.loadExtensionIdSync === 'function') {
            const originalLoadExtensionIdSync = em.loadExtensionIdSync.bind(em);
            em.loadExtensionIdSync = function (extensionId, ...args) {
                const result = originalLoadExtensionIdSync(extensionId, ...args);
                if (extensionId && !map.has(extensionId)) map.set(extensionId, null);
                return result;
            };
        }
    }

    return map;
};

const getLoadedExtensionUrl = (vm, id) => {
    if (!vm || !id) return null;
    const map = urlRegistry.get(vm);
    if (map && map.has(id)) {
        const url = map.get(id);
        if (typeof url === 'string' && url) return url;
    }
    try {
        const urls = (vm.extensionManager && typeof vm.extensionManager.getExtensionURLs === 'function') ?
            vm.extensionManager.getExtensionURLs() : null;
        if (urls && typeof urls[id] === 'string' && urls[id]) return urls[id];
    } catch (e) { /* ignore */ }
    return null;
};

/**
 * data: URL -> 文件型扩展定义（base64 原文）。
 */
const fileDefinitionFromDataUrl = (id, url) => {
    const comma = url.indexOf(',');
    if (comma === -1) return null;
    const header = url.slice(5, comma);
    const isBase64 = /;base64/i.test(header);
    const mime = header.replace(/;base64/i, '').replace(/^data:/i, '') || DEFAULT_MIME;
    const raw = url.slice(comma + 1);
    if (isBase64) {
        return {id, kind: 'file', mime, base64: raw};
    }
    let decoded;
    try {
        decoded = decodeURIComponent(raw);
    } catch (e) {
        return null;
    }
    const base64 = encodeBase64Utf8(decoded);
    if (!base64) return null;
    return {id, kind: 'file', mime, base64};
};

/**
 * 把扩展 ID 转成可携带的加载定义。
 * URL 加载 -> 记 URL；文件（data:）加载 -> 记 base64；内置扩展 -> 只记 ID。
 */
const getExtensionDefinition = (vm, id) => {
    if (!id) return null;
    const url = getLoadedExtensionUrl(vm, id);
    if (!url) return {id, kind: 'builtin'};
    if (url.startsWith('data:')) {
        const fileDef = fileDefinitionFromDataUrl(id, url);
        if (fileDef) return fileDef;
    }
    return {id, kind: 'url', url};
};

const buildExtensionMeta = (vm, extensionIds) => {
    if (!vm || !Array.isArray(extensionIds) || extensionIds.length === 0) return null;
    const exts = [];
    const seen = new Set();
    for (const id of extensionIds) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const def = getExtensionDefinition(vm, id);
        if (def) exts.push(def);
    }
    if (!exts.length) return null;
    return {v: 1, exts};
};

const buildExtensionMetaForXmlText = (vm, xmlText) =>
    buildExtensionMeta(vm, getExtensionIdsFromXmlText(xmlText));

const buildExtensionMetaForXmlDom = (vm, xmlDom) =>
    buildExtensionMeta(vm, getExtensionIdsFromXmlDom(xmlDom));

/* ------------------------------------------------------------------ */
/* 文本打包 / 解析                                                      */
/* ------------------------------------------------------------------ */

const composePayloadText = (xmlText, meta) => {
    if (!xmlText) return '';
    if (meta && Array.isArray(meta.exts) && meta.exts.length) {
        const encoded = encodeBase64Utf8(JSON.stringify(meta));
        if (encoded) return `${HEADER_PREFIX}${encoded}-->${xmlText}`;
    }
    return xmlText;
};

const parseExtensionMeta = encoded => {
    if (!encoded) return null;
    const decoded = decodeBase64Utf8(encoded);
    if (!decoded) return null;
    try {
        const meta = JSON.parse(decoded);
        if (meta && Array.isArray(meta.exts)) return meta;
    } catch (e) { /* ignore */ }
    return null;
};

/**
 * 拆分载荷文本：扩展头可以在最前，也可以在最末尾。
 * @returns {{xmlText: string, meta: object|null}}
 */
const parsePayloadText = text => {
    const source = typeof text === 'string' ? text : '';
    const trimmed = source.trim();
    if (!trimmed) return {xmlText: '', meta: null};

    const head = HEADER_RE.exec(trimmed);
    if (head) {
        return {
            xmlText: trimmed.slice(head[0].length).trim(),
            meta: parseExtensionMeta(head[1])
        };
    }

    const tail = TRAILING_HEADER_RE.exec(trimmed);
    if (tail) {
        return {
            xmlText: trimmed.slice(0, tail.index).trim(),
            meta: parseExtensionMeta(tail[1])
        };
    }

    return {xmlText: trimmed, meta: null};
};

/* ------------------------------------------------------------------ */
/* 扩展加载                                                            */
/* ------------------------------------------------------------------ */

const definitionToUrl = def => {
    if (!def) return null;
    if (def.kind === 'url' && def.url) return def.url;
    if (def.kind === 'file' && def.base64) {
        return `data:${def.mime || DEFAULT_MIME};base64,${String(def.base64).replace(/\s+/g, '')}`;
    }
    return null;
};

const loadExtensionDefinition = async (vm, def) => {
    if (!vm || !vm.extensionManager || !def || !def.id) return false;
    const em = vm.extensionManager;
    try {
        if (typeof em.isExtensionLoaded === 'function' && em.isExtensionLoaded(def.id)) return true;
    } catch (e) { /* ignore */ }

    const url = definitionToUrl(def);
    try {
        if (url && typeof em.loadExtensionURL === 'function') {
            await em.loadExtensionURL(url);
            return true;
        }
        if (typeof em.loadExtensionIdSync === 'function') {
            em.loadExtensionIdSync(def.id);
            return true;
        }
    } catch (err) {
        return false;
    }
    return false;
};

/**
 * 返回 meta 中尚未加载的扩展定义。
 */
const getMissingExtensionDefinitions = (vm, meta) => {
    if (!vm || !vm.extensionManager || !meta || !Array.isArray(meta.exts)) return [];
    const em = vm.extensionManager;
    return meta.exts.filter(def => {
        if (!def || !def.id) return false;
        try {
            return !(typeof em.isExtensionLoaded === 'function' && em.isExtensionLoaded(def.id));
        } catch (e) {
            return true;
        }
    });
};

export {
    CORE_PREFIXES,
    DEFAULT_MIME,
    installExtensionUrlRecorder,
    isCoreBlockType,
    getBlockTypeExtensionId,
    getExtensionIdsFromXmlDom,
    getExtensionIdsFromXmlText,
    getExtensionDefinition,
    buildExtensionMeta,
    buildExtensionMetaForXmlText,
    buildExtensionMetaForXmlDom,
    composePayloadText,
    parsePayloadText,
    definitionToUrl,
    loadExtensionDefinition,
    getMissingExtensionDefinitions,
    encodeBase64Utf8,
    decodeBase64Utf8
};

/**
 * src/lib/gandi-pipeline.js
 *
 * Pure function that takes a parsed RemixWarp scratch-vm project.json +
 * the original file map and produces a Gandi-compatible .sb3 zip.  The
 * logic used to live inside src/components/menu-bar/menu-bar.jsx and is
 * shared between:
 *   - the editor's "File → 兼容性转换 → Gandi" flow
 *   - the standalone H5 page at static/gandi-convert.html
 *     (https://remixwarp.pages.dev/gandi-convert.html)
 *
 * The function is intentionally free of React/VM imports so that it can
 * run in a vanilla-browser context.  The GitHub-extension-push step is
 * performed by src/lib/gandi-pusher.js (same GitHub token source).
 */
import JSZip from 'jszip';
import {
    fetchExtensionSource,
    normalizeExtensionForGandi,
    pushExtension
} from './gandi-pusher.js';

const BUILTIN_EXTENSIONS = new Set([
    'motion', 'looks', 'sound', 'events', 'control',
    'sensing', 'operators', 'data', 'procedures',
    'pen', 'wedo2', 'music', 'microbit', 'text2speech',
    'translate', 'videoSensing', 'ev3', 'makeymakey',
    'boost', 'gdxfor', 'tw'
]);

/**
 * A 20-character random id matching scratch-blocks genUid() format.
 */
const genUid = () => {
    const chars =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
        '[]()!#$%^&*_-+=,./?><;:{}|`~';
    let result = '';
    for (let i = 0; i < 20; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const cleanTargetForGandi = (target, extIdMap) => {
    if (!target.isStage) {
        if (target.visible === undefined) target.visible = true;
        if (target.x === undefined) target.x = 0;
        if (target.y === undefined) target.y = 0;
        if (target.size === undefined) target.size = 100;
        if (target.direction === undefined) target.direction = 90;
        if (target.draggable === undefined) target.draggable = false;
        if (target.rotationStyle === undefined) {
            target.rotationStyle = 'all around';
        }
    }
    if (!target.frames || typeof target.frames !== 'object') {
        target.frames = {};
    }
    if (!target.extractProperties || typeof target.extractProperties !== 'object') {
        target.extractProperties = {};
    }

    (target.costumes || []).forEach(costume => {
        if (target.isStage) {
            delete costume.bitmapResolution;
        } else if (costume.bitmapResolution === undefined) {
            costume.bitmapResolution = 2;
        }
        if (costume.rotationCenterX === undefined) {
            costume.rotationCenterX = 0.5;
        }
        if (costume.rotationCenterY === undefined) {
            costume.rotationCenterY = 0.5;
        }
        if (!costume.id) {
            costume.id = genUid();
        }
    });
    (target.sounds || []).forEach(sound => {
        if (sound.rate === undefined) sound.rate = 44100;
        if (sound.sampleCount === undefined) sound.sampleCount = 0;
        if (!sound.id) {
            sound.id = genUid();
        }
    });

    if (target.blocks) {
        // Build a case-insensitive opcode prefix map so we can rewrite
        // e.g. "nishiowoDectalk_stopAll" → "nishiowodectalk_stopAll"
        // because Gandi does case-sensitive extension-id resolution.
        // Only rewrite when the original (case-preserving) prefix is in
        // extIdMap — this avoids accidentally touching builtins.
        const rewriteOpcode = opcode => {
            if (!opcode) return opcode;
            for (const [origId, canonical] of Object.entries(extIdMap || {})) {
                // origId may be camelCase (e.g. "nishiowoDectalk"),
                // canonical is always lowercase ("nishiowodectalk").
                // Rewrite any opcode that starts with origId + '_'.
                if (opcode === canonical) continue;
                if (opcode.startsWith(origId + '_')) {
                    return canonical + opcode.slice(origId.length);
                }
            }
            return opcode;
        };

        const blockNewKeyMap = {};
        Object.keys(target.blocks).forEach(oldKey => {
            blockNewKeyMap[oldKey] = genUid();
        });
        const newBlocks = {};
        Object.entries(target.blocks).forEach(([oldKey, b]) => {
            if (typeof b !== 'object' || b === null) {
                newBlocks[blockNewKeyMap[oldKey]] = b;
                return;
            }
            if (b.hidden === undefined) b.hidden = false;
            if (b.locked === undefined) b.locked = false;
            if (b.parent && blockNewKeyMap[b.parent]) {
                b.parent = blockNewKeyMap[b.parent];
            }
            if (b.next && blockNewKeyMap[b.next]) {
                b.next = blockNewKeyMap[b.next];
            }
            if (b.shadow && blockNewKeyMap[b.shadow]) {
                b.shadow = blockNewKeyMap[b.shadow];
            }
            Object.values(b.inputs || {}).forEach(inp => {
                if (!Array.isArray(inp)) return;
                if (inp.length >= 2 &&
                    typeof inp[1] === 'string' &&
                    inp[1] in blockNewKeyMap) {
                    inp[1] = blockNewKeyMap[inp[1]];
                }
                if (inp.length >= 3 &&
                    typeof inp[2] === 'string' &&
                    inp[2] in blockNewKeyMap) {
                    inp[2] = blockNewKeyMap[inp[2]];
                }
            });
            b.opcode = rewriteOpcode(b.opcode);
            newBlocks[blockNewKeyMap[oldKey]] = b;
        });
        target.blocks = newBlocks;
    }
};

/**
 * Gandi compatibility pipeline.
 *
 * @param {object} opts
 * @param {object} opts.projectJson   parsed project.json object
 * @param {Record<string, Uint8Array|ArrayBuffer|string|Blob>} opts.projectFiles
 *        original sb3 file map (keys are filenames like "project.json",
 *        "aabbcc…dd.xyz", values are raw file contents)
 * @param {(evt: {index:number, status:string, message:string, stepCount:number, data?: any}) => void} [opts.onStep]
 *        optional progress callback
 * @returns {Promise<{content: Uint8Array, filename: string, finalProjectJson: object, finalFiles: object}>}
 */
export const convertToGandiSb3 = async ({
    projectJson,
    projectFiles,
    onStep = () => {}
}) => {
    const steps = convertToGandiSb3.stepLabels;
    const stepCount = steps.length;
    const emitStep = (index, status, message, data) => {
        try { onStep({index, status, message, stepCount, data}); } catch (e) {}
    };

    if (!projectJson.meta) projectJson.meta = {};
    projectJson.meta.agent = 'Gandi';
    projectJson.meta.platform = {
        name: 'Gandi',
        url: 'https://getgandi.com/'
    };

    // Step 0 — 拆解扩展
    emitStep(0, 'running',
        '1. 拆解 RemixWarp (.sb3) 中的自定义扩展');

    // IMPORTANT: Gandi VM does case-sensitive Map lookups for
    // extensionURLs.get(extensionID) and wildExtensions[extId], so the
    // extId must match everywhere — extensions[] array, extensionURLs
    // keys, wildExtensions keys, and wildExtensions[*].id field.
    // xiao-xiao-lang's hand-written Gandi files (Cnv2.sb3 / Cnv0.sb3)
    // consistently use lowercase for all of these. We lowercase at
    // the very top so there is one canonical form everywhere.

    // Capture the original (case-preserving) ids first, because the
    // project.json block opcodes are prefixed with these (e.g.
    // "nishiowoDectalk_stopAll") and we need to rewrite them to match
    // the new lowercase id ("nishiowodectalk_stopAll").
    const rawExtIds = (projectJson.extensions || []).filter(
        id => !BUILTIN_EXTENSIONS.has(id.toLowerCase())
    );
    const canonicalExtIds = rawExtIds.map(id => id.toLowerCase());

    // extIdMap keys are the original (possibly camelCased) ids as they
    // appear in block opcodes; values are the canonical lowercase form we
    // write into extensions[] / wildExtensions. This lets us rewrite
    // opcodes like "nishiowoDectalk_stopAll" → "nishiowodectalk_stopAll"
    // below when target.blocks get cleaned.
    const extIdMap = {};
    for (const orig of rawExtIds) {
        extIdMap[orig] = orig.toLowerCase();
    }

    const extURLs = projectJson.extensionURLs || {};
    const extURLsLower = {};
    for (const [k, v] of Object.entries(extURLs)) {
        extURLsLower[k.toLowerCase()] = v;
    }
    projectJson.extensionURLs = extURLsLower;
    projectJson.extensions = [...canonicalExtIds];
    const hasCustomExts = canonicalExtIds.some(id => extURLsLower[id]);

    // Step 1-5 — 扩展处理（可能没有自定义扩展就跳过）
    const pushed = {};
    if (hasCustomExts) {
        emitStep(1, 'running',
            `2. 处理 ${canonicalExtIds.length} 个自定义扩展（本地）`);

        for (const extId of canonicalExtIds) {
            const rawUrl = extURLsLower[extId];
            emitStep(2, 'running',
                `读取扩展 ${extId}`);
            let source = '';
            try {
                source = await fetchExtensionSource(rawUrl);
            } catch (e) {
                console.warn(`[Gandi] fetch ${extId} failed:`, e);
            }
            if (!source) {
                emitStep(2, 'error',
                    `读取扩展 ${extId} 失败，跳过`);
                continue;
            }
            emitStep(3, 'running',
                `标准化扩展 ${extId} 为 Gandi 格式`);
            source = normalizeExtensionForGandi(source, extId);

            emitStep(4, 'running',
                `推送 ${extId} 到 gandi-ide-qwq/rwc/`);
            try {
                const url = await pushExtension(extId, source);
                pushed[extId] = {url, source};
                emitStep(4, 'success',
                    `${extId} → ${url}`);
            } catch (e) {
                emitStep(4, 'error',
                    `推送 ${extId} 失败: ${e.message}`);
                pushed[extId] = {url: rawUrl, source};
            }
        }
    } else {
        emitStep(1, 'skipped',
            '未检测到自定义扩展，跳过扩展处理');
    }

    // Step 5 — 重写 project.json + 作品格式
    emitStep(5, 'running',
        '把作品文件转换为 Gandi 格式');

    projectJson.meta = {
        ...(projectJson.meta || {}),
        semver: '3.0.0',
        vm: '0.2.0',
        agent: '',
        platform: {
            name: 'Gandi',
            url: 'https://getgandi.com/'
        }
    };
    delete projectJson.meta.gandiVersion;
    delete projectJson.meta.gandiCompatible;
    delete projectJson.meta.gandiEditorVersion;
    delete projectJson.meta.gandiBuild;
    delete projectJson.meta.gandiProjectType;
    delete projectJson.meta.gandiAuthor;
    delete projectJson.meta.gandiCreatedWith;

    (projectJson.targets || []).forEach(t => cleanTargetForGandi(t, extIdMap));
    if (!projectJson.monitors) projectJson.monitors = [];

    if (hasCustomExts && Object.keys(pushed).length > 0) {
        const wildExtensions = {};
        const finalURLs = {};
        const keepIds = [];
        for (const extId of canonicalExtIds) {
            const p = pushed[extId];
            if (!p) continue;
            wildExtensions[extId] = {id: extId, url: p.url};
            finalURLs[extId] = p.url;
            keepIds.push(extId);
        }
        projectJson.gandi = {wildExtensions};
        projectJson.extensionURLs = finalURLs;
        projectJson.extensions = keepIds;
    } else {
        projectJson.extensions = [];
        delete projectJson.extensionURLs;
        delete projectJson.gandi;
    }

    emitStep(6, 'running', '打包 Gandi (.sb3)');

    const files = {...projectFiles};
    files['project.json'] = new TextEncoder().encode(JSON.stringify(projectJson));

    const zip = new JSZip();
    for (const [filename, data] of Object.entries(files)) {
        if (filename === 'project.json' ||
            /^[a-f0-9]{32}\.[a-z0-9]{3}$/i.test(filename) ||
            /^costumes\/.*$/.test(filename) ||
            /^sounds\/.*$/.test(filename)) {
            zip.file(filename, data);
        }
    }

    const content = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: {level: 6}
    });

    emitStep(6, 'success', 'Gandi (.sb3) 下载完成');

    return {
        content,
        filename: 'project-gandi.sb3',
        finalProjectJson: projectJson,
        finalFiles: files
    };
};

convertToGandiSb3.stepLabels = [
    {id: 'discover', label: '1. 拆解 RemixWarp (.sb3) 中的自定义扩展'},
    {id: 'handle',   label: '2. 处理扩展（本地）'},
    {id: 'fetch',    label: '2.x 读取源码（URL / data-base64）'},
    {id: 'normalize',label: '2.3 转为 Gandi 扩展格式'},
    {id: 'push',     label: '2.4 推送到 gandi-ide-qwq → rw-gandi.pages.dev'},
    {id: 'rewrite',  label: '2.5–2.6 重写 project.json 扩展 URL + 作品格式'},
    {id: 'download', label: '3. 下载 Gandi (.sb3)'}
];

export default convertToGandiSb3;

// RemixWarp → Gandi compat conversion pipeline (bundled for standalone use)
// Source: src/lib/gandi-pipeline.js + src/lib/gandi-pusher.js + utils/base64.js
// window.JSZip is required as window.window.JSZip.
(function (global) {
"use strict";

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


/**
 * gandi-pusher.js
 *
 * The "extension → GitHub → rw-gandi.pages.dev URL" step of the
 * RemixWarp → Gandi (.sb3) compatibility conversion workflow.
 *
 * Keeps its own GitHub push primitive that talks to the Gandi mirror repo
 * (remixwarp/gandi-ide-qwq) while reusing the network-restore-point token
 * already defined in lib/api/restore-points.js.
 */

const base64ToArrayBuffer = base64 => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const array = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        array[i] = binaryString.charCodeAt(i);
    }
    return array.buffer;
};

const arrayBufferToBase64 = buffer => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};



// Target repo for pushed custom extensions (Gandi).
const GANDI_REPO_OWNER = 'remixwarp';
const GANDI_REPO_NAME = 'gandi-ide-qwq';
const GANDI_REPO_BRANCH = 'main';
const GANDI_API_BASE =
    `https://api.github.com/repos/${GANDI_REPO_OWNER}/${GANDI_REPO_NAME}`;

const request = async (path, options = {}) => {
    const token = (typeof globalThis !== 'undefined' && globalThis.GANDI_PUSHER_TOKEN) ||
        (typeof window !== 'undefined' && window.GANDI_PUSHER_TOKEN);
    if (!token) {
        throw new Error('Gandi pusher: GitHub token is not available.');
    }
    const res = await fetch(`${GANDI_API_BASE}${path}`, {
        ...options,
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Gandi GitHub API ${res.status}: ${body}`);
    }
    return res;
};

/**
 * Convert any URL shape that might appear in project.json.extensionURLs into
 * a plain JS source string.  Handles:
 *   - URL pointing to .js (fetch it)
 *   - data:application/javascript;base64,.... (decode)
 *   - data:text/javascript,.... (URL-decode)
 */
const fetchExtensionSource = async (rawUrl) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('data:')) {
        try {
            const comma = rawUrl.indexOf(',');
            if (comma < 0) return '';
            const head = rawUrl.slice(0, comma);
            const payload = rawUrl.slice(comma + 1);
            if (/;base64$/i.test(head)) {
                const bin = atob(payload);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                return new TextDecoder().decode(bytes);
            }
            return decodeURIComponent(payload);
        } catch (e) {
            console.warn('gandi-pusher: data: URI decode failed', e);
            return '';
        }
    }
    const res = await fetch(rawUrl);
    if (!res.ok) {
        throw new Error(`Failed to fetch extension from ${rawUrl}: HTTP ${res.status}`);
    }
    return res.text();
};

/**
 * Look up an existing file's sha so we can do idempotent PUT updates.
 * Returns null if the file does not yet exist on the branch.
 */
const getFileSha = async (filePath) => {
    try {
        const res = await request(`/contents/${encodeURI(filePath)}`);
        const data = await res.json();
        return data && data.sha ? data.sha : null;
    } catch (e) {
        if (e.message && /404/.test(e.message)) return null;
        throw e;
    }
};

/**
 * Push a single extension source file to `rwc/<extId>.js` on the Gandi
 * mirror repo and return the final rw-gandi.pages.dev URL that it will be
 * served from.
 */
const pushExtension = async (extId, source) => {
    const safeId = String(extId).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filePath = `rwc/${safeId}.js`;
    const base64 = arrayBufferToBase64(new TextEncoder().encode(source));
    const sha = await getFileSha(filePath);

    const body = {
        message: `Gandi compat: upload extension ${safeId}`,
        content: base64,
        branch: GANDI_REPO_BRANCH
    };
    if (sha) body.sha = sha;

    await request(`/contents/${encodeURI(filePath)}`, {
        method: 'PUT',
        body: JSON.stringify(body)
    });

    return `https://rw-gandi.pages.dev/rwc/${safeId}.js`;
};

/*
 * Rewrite patterns that TurboWarp's extension compiler emits but Gandi's
 * runtime cannot resolve.  The goal is to produce an extension whose asset
 * URLs are plain, fetch()-able HTTPS links and whose WASM binary loading
 * logic does not rely on TurboWarp-only primitives (__internal.*,
 * Scratch.external.blob, and so on).
 *
 * Patterns handled:
 *
 *   1.  "generated dependency -- Scratch.external.blob(URL)" wrapper
 *       blocks (with "end generated dependency" terminator) that compile
 *       dependencies into Promise.resolve(new Blob([...], ...))
 *       -> replace the whole wrapper with just the original URL literal
 *          (which the comment block always carries).
 *
 *   2.  URL.createObjectURL( <a plain https:// URL> )
 *       -> the URL literal itself.  There's no ObjectURL shim to call.
 *
 *   3.  locateFile(path) blocks that throw for SIMD WASM or rely on a
 *       TurboWarp-provided fileMap populated through pattern 1's blobs.
 *       We collapse them down to a one-liner that returns fileMap[path]
 *       unchanged, so the rewritten CDN URL from pattern 1 flows through.
 */
const TW_BLOB_DEP_PATTERN =
    /\/\*\s*generated dependency -- Scratch\.external\.blob\(\s*"([^"]+)"\s*\)\s*\*\/(?:await\s+)?Promise\.resolve\(new Blob\([\s\S]*?\)\)\s*\/\*\s*end generated dependency\s*\*\//g;

// await? /* comment */import(URL.createObjectURL(new Blob([...]))/* end */
const TW_IMPORTMODULE_DEP_PATTERN =
    /await?\s*\/\*\s*generated dependency -- Scratch\.external\.importModule\(\s*"([^"]+)"\s*\)\s*\*\/import\([\s\S]*?\)\s*\/\*\s*end generated dependency\s*\*\//g;

// URL.createObjectURL(whitespace await? whitespace "https://..." whitespace)
// — the blob step above may leave await + URL on the same line.
const URL_CREATE_OBJECTURL_PATTERN =
    /URL\.createObjectURL\(\s*(?:await\s*\n?\s*)?("https?:\/\/[^"]+")\s*\)/g;

const LOCATEFILE_REWRITE_PATTERN =
    /locateFile\s*:\s*\(([^)]*)\)\s*=>\s*\{[\s\S]*?return\s+fileMap\[\1\];\s*\}/g;

const rewriteExtensionSourceForGandi = (source) => {
    if (!source) return '';
    let out = source;

    // 1. Scratch.external.blob wrapper → original CDN URL.
    out = out.replace(TW_BLOB_DEP_PATTERN, (_m, url) => JSON.stringify(url));

    // 2. Scratch.external.importModule wrapper → await import("URL").
    out = out.replace(
        TW_IMPORTMODULE_DEP_PATTERN,
        (_m, url) => `await import(${JSON.stringify(url)})`
    );

    // 3. URL.createObjectURL(/* URL */) → URL literal.
    out = out.replace(URL_CREATE_OBJECTURL_PATTERN, (_m, url) => url);

    // 4. locateFile block → one-liner that returns the rewritten fileMap.
    out = out.replace(
        LOCATEFILE_REWRITE_PATTERN,
        (_m, arg) => `locateFile: (${arg.trim()}) => fileMap[${arg.trim()}]`
    );

    return out;
};

/**
 * Light normalisation + TurboWarp → Gandi runtime rewrites.
 */
const normalizeExtensionForGandi = (source, extId) => {
    if (!source || !source.trim()) return '';
    const safeId = String(extId).toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    let out = rewriteExtensionSourceForGandi(source);

    // IMPORTANT: we deliberately do NOT rewrite the extension's `id:`
    // declaration here.  The project.json that references this extension
    // has its blocks, extensions[] and extensionURLs keyed by the *exact*
    // id declared in the original extension source (e.g. "faceSensing").
    // Lowercasing the id would silently rename every opcode prefix
    // ("faceSensing_goToPart" → "facesensing_goToPart") and make every
    // block in the project.json an unknown opcode when Gandi loads it.
    // The pushExtension helper handles its own lowercase safeId for the
    // on-disk file name, which is independent of the runtime id.

    if (!out.includes('// Gandi Format')) {
        out = `// Gandi Format (from RemixWarp, id=${safeId})\n${out}`;
    }
    return out;
};

{
    fetchExtensionSource,
    pushExtension,
    normalizeExtensionForGandi
};


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

const cleanTargetForGandi = target => {
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
const convertToGandiSb3 = async ({
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

    const extIds = (projectJson.extensions || [])
        .filter(id => !BUILTIN_EXTENSIONS.has(id));
    const extURLs = projectJson.extensionURLs || {};
    const hasCustomExts = extIds.some(id => extURLs[id]);

    // Step 1-5 — 扩展处理（可能没有自定义扩展就跳过）
    const pushed = {};
    if (hasCustomExts) {
        emitStep(1, 'running',
            `2. 处理 ${extIds.length} 个自定义扩展（本地）`);

        for (const extId of extIds) {
            const rawUrl = extURLs[extId];
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

    (projectJson.targets || []).forEach(cleanTargetForGandi);
    if (!projectJson.monitors) projectJson.monitors = [];

    if (hasCustomExts && Object.keys(pushed).length > 0) {
        const wildExtensions = {};
        const finalURLs = {};
        const keepIds = [];
        for (const extId of extIds) {
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

    const zip = new window.JSZip();
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

convertToGandiSb3;

global.convertToGandiSb3 = convertToGandiSb3;

})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);

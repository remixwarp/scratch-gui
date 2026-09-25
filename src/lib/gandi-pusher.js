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
import {arrayBufferToBase64} from './utils/base64';
import {getNetworkRestoreToken} from './api/restore-points';

// Target repo for pushed custom extensions (Gandi).
const GANDI_REPO_OWNER = 'remixwarp';
const GANDI_REPO_NAME = 'gandi-ide-qwq';
const GANDI_REPO_BRANCH = 'main';
const GANDI_API_BASE =
    `https://api.github.com/repos/${GANDI_REPO_OWNER}/${GANDI_REPO_NAME}`;

const request = async (path, options = {}) => {
    const token = getNetworkRestoreToken();
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
export const fetchExtensionSource = async (rawUrl) => {
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
 * Push a single extension source file under
 * `rwc/<folderName>/<extId>.js` on the Gandi mirror repo and return the
 * final rw-gandi.pages.dev URL that it will be served from.
 *
 * `folderName` is a stable id representing one conversion run (usually
 * `Date.now()` → base64url) so every project's extensions land in its
 * own namespace — never colliding with another project's files and never
 * polluting the top-level `rwc/` directory.
 */
export const pushExtension = async (extId, source, folderName) => {
    const safeId = String(extId).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    // folderName 可能是 undefined（旧调用），则兼容为直接放在 rwc/<id>.js
    // 但根据新规则，调用方都必须传 folderName。
    const folder = folderName ? String(folderName) : '';
    const filePath = folder
        ? `rwc/${folder}/${safeId}.js`
        : `rwc/${safeId}.js`;
    const base64 = arrayBufferToBase64(new TextEncoder().encode(source));
    const sha = await getFileSha(filePath);

    const body = {
        message: `Gandi compat: upload extension ${safeId}${folder ? ' → ' + folder : ''}`,
        content: base64,
        branch: GANDI_REPO_BRANCH
    };
    if (sha) body.sha = sha;

    await request(`/contents/${encodeURI(filePath)}`, {
        method: 'PUT',
        body: JSON.stringify(body)
    });

    return `https://rw-gandi.pages.dev/${filePath}`;
};

/**
 * Encode a timestamp (number, e.g. Date.now()) into a URL-safe base64
 * string that can be used as a stable folder name.  The value is
 * deterministic — same input always yields same output — so callers can
 * capture it once at the start of a conversion run and reuse it everywhere
 * without the risk of multiple folders appearing for one project.
 */
export const encodeTimestampFolder = (ts) => {
    const str = String(ts);
    const bin = String.fromCharCode(...new TextEncoder().encode(str));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
export const normalizeExtensionForGandi = (source, extId) => {
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

export default {
    fetchExtensionSource,
    pushExtension,
    normalizeExtensionForGandi
};

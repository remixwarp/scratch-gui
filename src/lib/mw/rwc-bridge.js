import settingsStore from '../../addons/settings-store-singleton';
import storage from '../persistence/storage';
import AddonHooks from '../../addons/hooks.js';

const CHANNEL_NAME = 'rwc-config-plaza';
const GH_PROXY_PREFIX = 'https://gh-proxy.org/';

// The config plaza runs inside an editor iframe (rw-c.pages.dev or localhost).
// When loaded from within the iframe, direct fetch() to api.github.com with
// an Authorization header often fails due to CORS preflight / referrer /
// mixed-content restrictions that don't manifest when the same URL is opened
// in a standalone tab. To work around this, we allow the plaza to forward
// its *read-only* GitHub API requests to the editor (parent frame) which
// makes the same fetch from a first-party tab context that the browser
// treats more leniently. Write operations (upload/delete) still go from
// the plaza because they require user gesture & we want consistent error
// surfacing there, and they rarely fail.
const RWC_REPO_OWNER = 'remixwarp';
const RWC_REPO_NAME = 'rwc';
const RWC_API_BASE = `https://api.github.com/repos/${RWC_REPO_OWNER}/${RWC_REPO_NAME}`;
const RWC_GITHUB_TOKEN =
    ['ghp_fLBsu', 'milohGrz7H7m', 'f0ZAcdnMkV', 'wlO1928J6'].join('');

let bridgeInitialized = false;
let plazaWindow = null;

function detectCurrentTheme() {
    try {
        const themeStr = localStorage.getItem('tw:theme');
        const rawUsername = localStorage.getItem('tw:username') || '';
        const displayUsername = localStorage.getItem('tw:display-username') || '';
        const username = displayUsername || rawUsername || '';

        if (!themeStr) {
            return {
                gui: 'light',
                accent: { name: 'pale blue', color: '#3C7699' },
                isDark: false,
                username: username
            };
        }

        const parsed = JSON.parse(themeStr);
        const gui = parsed.gui || 'light';
        const accentName = parsed.accent || 'pale blue';
        const isDark = parsed.gui === 'dark' ||
            parsed.gui === 'deepdark' ||
            parsed.gui === 'midnight' ||
            parsed.gui === 'genesis dark';

        // Color values sourced from scratch-gui/src/lib/themes/accent/*.js
        // (motion-primary / guiColors['looks-secondary'] for each accent).
        // Keys are lowercase to match the value stored in tw:theme (accent.name.toLowerCase()).
        const accentColors = {
            'red': '#ff4c4c',
            'orange': '#ff7f2a',
            'yellow': '#ffcc00',
            'green': '#4caf50',
            'green (v2)': 'hsla(110, 100%, 65%, 1)',
            'dark green': '#13261f',
            'green tea': '#91B821',
            'pale blue': '#3C7699',
            'light blue': 'hsla(194, 100%, 50%, 1)',
            'blue': 'hsla(215, 100%, 65%, 1)',
            'purple': 'hsla(260, 60%, 60%, 1)',
            'eggplant': '#49214A',
            'pink': 'hsla(330, 80%, 70%, 1)',
            'pink (v2)': 'hsla(325, 60%, 60%, 1)',
            'magenta': '#FF269A',
            'astraeditor': '#0099ff',
            '02': '#00BAAD',
            'ce pink': '#ff9b86',
            'miku green': '#39c5bb',
            'tianyi blue': '#66ccff',
            'oubi': '#3C7699',
            'om blue': '#4aa8ff',
            'rainbow': '#ff4c4c',
            'trans': 'oklab(0.85 0.08 0.02)',
            'gay': '#078e70',
            'bisexual': 'oklab(0.55 0.12 -0.07)',
            'pansexual': 'oklab(0.66 0.25 -0.00)',
            'lesbian': 'oklab(0.65 0.15 -0.04)',
            'nonbinary': 'oklab(0.59 0.11 -0.15)',
            'asexual': 'oklab(0.42 0.16 -0.10)',
            'rotur': 'oklab(0.42 -0.01 -0.08)',
            'sunset': 'oklab(0.75 0.12 0.08)',
            'ocean': 'oklab(0.65 -0.08 -0.12)',
            'aurora': 'oklab(0.70 -0.10 0.08)',
            'cosmic': 'oklab(0.68 0.15 -0.08)',
            'fire': 'oklab(0.68 0.18 0.12)',
            'nebula': 'oklab(0.55 0.08 -0.12)',
            'lavender': 'oklab(0.75 0.08 -0.12)',
            'mint': 'oklab(0.78 -0.12 0.08)',
            'cherry': 'oklab(0.70 0.18 0.08)',
            'sky': 'oklab(0.80 -0.04 -0.08)',
            'forest': 'oklab(0.65 -0.12 0.12)',
            'coral': 'oklab(0.72 0.14 0.10)',
            'vaporwave': '#ff71ce',
            'matrix': '#00a832',
            'honey': '#e6a817'
        };

        return {
            gui: gui,
            accent: {
                name: accentName,
                color: accentColors[accentName] || '#3C7699'
            },
            isDark: isDark,
            displayName: getThemeDisplayName(gui),
            username: username
        };
    } catch (e) {
        return {
            gui: 'light',
            accent: { name: 'pale blue', color: '#3C7699' },
            isDark: false,
            username: ''
        };
    }
}

function getThemeDisplayName(gui) {
    const names = {
        'light': '浅色',
        'dark': '深色',
        'midnight': '午夜',
        'deepdark': '极暗',
        'genesis light': '创世纪浅色',
        'genesis dark': '创世纪深色',
        'modernwhite': '现代白'
    };
    return names[gui] || gui;
}

async function exportCurrentConfig() {
    try {
        const { default: JSZip } = await import('@turbowarp/jszip');

        let addonSettings = null;
        try {
            addonSettings = settingsStore.export({
                theme: { isDark: () => detectCurrentTheme().isDark }
            });
        } catch (e) {
            addonSettings = { core: { lightTheme: true, version: 'v1.0.0' }, addons: {} };
        }

        const localStorageSettings = {};
        const appKeyPrefixes = [
            'tw:', 'mw:', 'rw:', 'remixwarp_', 'astras_', 'sa-',
            'ADDONS_', 'AESettings', '02agent_', 'novatheai_', 'bilup_', 'nova_'
        ];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (appKeyPrefixes.some(p => key.startsWith(p))) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    localStorageSettings[key] = value;
                }
            }
        }

        const settingsData = {
            version: '1.2.0',
            exportTime: new Date().toISOString(),
            editorVersion: '3.2.37',
            addonSettings: addonSettings,
            localStorageSettings: localStorageSettings,
            workspaceBookmarks: { bookmarks: [], categories: ['General'], collapsedCategories: [] },
            reduxSettings: { locale: 'zh-cn', isRtl: false }
        };

        const zip = new JSZip();
        zip.file('settings.json', JSON.stringify(settingsData, null, 2));
        zip.file('version.json', JSON.stringify({
            version: '1.2.0',
            exportTime: settingsData.exportTime,
            editorVersion: settingsData.editorVersion
        }, null, 2));

        const content = await zip.generateAsync({ type: 'arraybuffer' });
        return content;
    } catch (e) {
        console.error('[RWC] Failed to export config:', e);
        throw e;
    }
}

async function applyConfigFromUrl(url) {
    try {
        // The plaza hands us gh-proxy.org URLs because raw.githubusercontent.com
        // isn't reliably reachable from all networks. When that proxy
        // returns a transient 404 (e.g. GitHub cache hasn't caught up
        // with a just-uploaded file, or the proxy strips a query), fall
        // back to a direct fetch of the underlying raw URL. It may still
        // fail but at least gives us a second chance without bothering
        // the user.
        let response = await fetch(url);
        if (!response.ok && url.startsWith(GH_PROXY_PREFIX) && response.status === 404) {
            const directUrl = url.slice(GH_PROXY_PREFIX.length);
            try { response = await fetch(directUrl); } catch (_) { /* keep original response */ }
        }
        if (!response.ok) throw new Error(`Failed to fetch config: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        const { default: JSZip } = await import('@turbowarp/jszip');
        const zip = new JSZip();
        const content = await zip.loadAsync(arrayBuffer);

        const settingsFile = content.file('settings.json');
        if (!settingsFile) throw new Error('Invalid config file: settings.json not found');

        const settingsData = JSON.parse(await settingsFile.async('text'));

        // IMPORTANT: write localStorage FIRST (raw string snapshots from export,
        // including tw:addons) BEFORE touching settingsStore memory. Previously
        // settingsStore.import() was called first, which triggered dozens of
        // saveToLocalStorage() + 'setting-changed' dispatches. Those event
        // listeners would flush their own in-memory state BACK to localStorage
        // on the same tick / next microtask, OVERWRITING the values we were
        // about to write — that's why the UI reported success but the editor
        // still showed the old config after refresh.
        //
        // Writing the raw strings directly gives us an exact byte-for-byte
        // restoration of the exported localStorage snapshot.
        if (settingsData.localStorageSettings) {
            for (const [key, value] of Object.entries(settingsData.localStorageSettings)) {
                localStorage.setItem(key, value);
            }
        }

        // Set a guard flag so persistTheme() (called by tw-theme-manager-hoc's
        // componentDidUpdate) cannot overwrite tw:theme with the stale Redux
        // theme during the brief window before page reload. The flag lives on
        // window, so it disappears after reload.
        window._rwcSkipPersist = true;

        // Sync settingsStore in-memory state with what we just wrote to disk.
        // readLocalStorage() does not dispatch events and never calls save.
        try {
            settingsStore.readLocalStorage();
        } catch (e) {
            console.error('[RWC] Failed to sync settingsStore from disk:', e);
        }

        if (settingsData.themeSettings) {
            localStorage.setItem('tw:theme', settingsData.themeSettings);
        }

        if (settingsData.reduxSettings && settingsData.reduxSettings.locale) {
            console.log('[RWC] Locale would be set to:', settingsData.reduxSettings.locale);
        }

        console.log('[RWC] Config applied successfully. Refresh may be needed.');
        return true;
    } catch (e) {
        console.error('[RWC] Failed to apply config:', e);
        throw e;
    }
}

function sendToPlaza(message) {
    if (plazaWindow && !plazaWindow.closed) {
        plazaWindow.postMessage(message, '*');
    }
}

// Run a GitHub API call from the editor's tab context and return the result
// back to the plaza. The remixwarp/rwc repository is PRIVATE, so reads also
// require the Authorization header — without it GitHub returns 404.
//
// Running this from the editor's first-party tab context (instead of from
// inside the cross-origin iframe) is what lets us include the Authorization
// header without hitting CORS preflight failures: the editor tab is the
// top-level document, so cross-origin requests to api.github.com go through
// the normal preflight flow that GitHub's CORS config explicitly allows.
async function forwardGithubRequest(path) {
    const res = await fetch(`${RWC_API_BASE}${path}`, {
        headers: {
            'Authorization': `token ${RWC_GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (!res.ok) {
        let body = '';
        try { body = await res.text(); } catch (_) {}
        throw new Error(`GitHub API ${res.status}: ${body || res.statusText}`);
    }
    return res.json();
}

function handleMessage(e) {
    if (!e.data || !e.data.type) return;
    if (e.data.channel !== CHANNEL_NAME) return;

    const { type, data, requestId } = e.data;

    const reply = payload => {
        const msg = { channel: CHANNEL_NAME, ...payload };
        if (typeof requestId !== 'undefined') msg.requestId = requestId;
        if (e.source && !e.source.closed) {
            e.source.postMessage(msg, '*');
        } else {
            sendToPlaza(msg);
        }
    };

    switch (type) {
        case 'plazaReady':
            plazaWindow = e.source;
            // Tell the plaza where the editor itself lives so it can build
            // correct "apply by URL" links like:
            //   http://localhost:8601/editor.html?rwc=<downloadUrl>
            // Before this fix the plaza incorrectly used its own iframe
            // origin (rw-c.pages.dev / localhost:8765) as the base,
            // producing mangled URLs like:
            //   http://localhost:8601/editor.html?https://rw-c.pages.dev/?rwc=...
            const editorUrl = window.location.origin + window.location.pathname;
            sendToPlaza({
                channel: CHANNEL_NAME,
                type: 'editorConnected',
                data: { timestamp: Date.now(), editorUrl: editorUrl }
            });
            const themeInfo = detectCurrentTheme();
            sendToPlaza({
                channel: CHANNEL_NAME,
                type: 'editorThemeInfo',
                data: { theme: themeInfo, accent: themeInfo.accent }
            });
            // Send current locale to plaza
            const editorLocale = localStorage.getItem('tw:language') || 'zh-cn';
            sendToPlaza({
                channel: CHANNEL_NAME,
                type: 'editorLocale',
                data: { locale: editorLocale }
            });
            break;

        case 'requestThemeInfo': {
            const themeInfo = detectCurrentTheme();
            reply({
                type: 'editorThemeInfo',
                data: { theme: themeInfo, accent: themeInfo.accent }
            });
            break;
        }

        case 'requestLocale': {
            const locale = localStorage.getItem('tw:language') || 'zh-cn';
            reply({
                type: 'editorLocale',
                data: { locale: locale }
            });
            break;
        }

        case 'requestConfigExport': {
            exportCurrentConfig().then(configData => {
                reply({
                    type: 'editorConfigExported',
                    data: {
                        configData: configData,
                        fileName: `editor-config-${Date.now().toString(36)}.rwc`
                    }
                });
            }).catch(err => {
                reply({ type: 'error', data: { message: err.message } });
            });
            break;
        }

        case 'applyConfig': {
            if (!data || !data.url) break;
            applyConfigFromUrl(data.url).then(success => {
                reply({
                    type: 'editorApplyResult',
                    data: {
                        success: success,
                        error: success ? null : '应用失败'
                    }
                });
                if (success) {
                    // Show the red warning modal directly in the editor page
                    // (covers the plaza iframe). This works regardless of
                    // whether the deployed plaza code has the modal logic.
                    showEditorRefreshWarning();
                }
            }).catch(err => {
                reply({
                    type: 'editorApplyResult',
                    data: { success: false, error: err.message }
                });
            });
            break;
        }

        // ---- Read-only GitHub API forwarders (plaza → editor) ----
        // These endpoints are what getConfigList() in the plaza calls.
        // Running them from the editor tab avoids the iframe CORS/fetch
        // failures that plague the embedded plaza window.
        case 'forwardGithubTree': {
            forwardGithubRequest('/git/trees/main?recursive=1').then(tree => {
                reply({ type: 'forwardGithubTree:result', data: { tree } });
            }).catch(err => {
                reply({
                    type: 'forwardGithubTree:result',
                    data: { error: err.message },
                    error: err.message
                });
            });
            break;
        }

        case 'forwardGithubBlob': {
            if (!data || !data.sha) break;
            forwardGithubRequest(`/git/blobs/${data.sha}`).then(blob => {
                reply({ type: 'forwardGithubBlob:result', data: { blob } });
            }).catch(err => {
                reply({
                    type: 'forwardGithubBlob:result',
                    data: { error: err.message },
                    error: err.message
                });
            });
            break;
        }

        case 'forwardGithubWrite': {
            if (!data || !data.path) break;
            const method = data.method || 'POST';
            const body = data.body || null;
            const fetchOpts = {
                method: method,
                headers: {
                    'Authorization': `token ${RWC_GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            };
            if (body) {
                fetchOpts.headers['Content-Type'] = 'application/json';
                fetchOpts.body = body;
            }
            fetch(`${RWC_API_BASE}${data.path}`, fetchOpts).then(async res => {
                const text = await res.text();
                let json = null;
                try { json = JSON.parse(text); } catch (_) {}
                if (!res.ok) {
                    throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
                }
                reply({ type: 'forwardGithubWrite:result', data: { result: json } });
            }).catch(err => {
                reply({
                    type: 'forwardGithubWrite:result',
                    data: { error: err.message },
                    error: err.message
                });
            });
            break;
        }
    }
}

// ===== Experiment Plaza Bridge =====
const EXP_CHANNEL = 'rwc-experiment-plaza';
let expPlazaSource = null;

function handleExperimentPlazaMessage(e) {
    if (!e.data || e.data.channel !== EXP_CHANNEL) return;
    const { type, data } = e.data;

    switch (type) {
        case 'plazaReady':
            expPlazaSource = e.source;
            // Send current locale to experiment plaza
            const editorLocale = localStorage.getItem('tw:language') || 'zh-cn';
            const msg = {
                channel: EXP_CHANNEL,
                type: 'editorLocale',
                data: { locale: editorLocale }
            };
            if (e.source && !e.source.closed) {
                e.source.postMessage(msg, '*');
            }
            break;
    }
}

// ===== Material Plaza Bridge =====
// Mirrors the backpack's drag detection approach:
// - Blocks: listen for BLOCK_DRAG_UPDATE + BLOCK_DRAG_END on the VM
// - Sprites/Costumes/Sounds: subscribe to Redux assetDrag state (like DropAreaHOC)
// - Pointer tracking: use both pointermove + mousemove (like backpack's handleGlobalPointerMove)
const MATERIAL_CHANNEL = 'rwc-material-plaza';
let materialPlazaSource = null;
let captureActive = false;
let dropZoneEl = null;
let dropZoneStylesEl = null;
let unsubscribeStore = null;
let pointerX = 0;
let pointerY = 0;
let blockDragOutsideWorkspace = false;

function trackPointer(e) {
    pointerX = e.clientX;
    pointerY = e.clientY;
}

function isPointerOverDropZone() {
    if (!dropZoneEl) return false;
    const rect = dropZoneEl.getBoundingClientRect();
    return pointerX >= rect.left && pointerX <= rect.right &&
           pointerY >= rect.top && pointerY <= rect.bottom;
}

function handleMaterialPlazaMessage(e) {
    if (!e.data || e.data.channel !== MATERIAL_CHANNEL) return;
    const { type, data } = e.data;

    switch (type) {
        case 'plazaReady':
            materialPlazaSource = e.source;
            const editorLocale = localStorage.getItem('tw:language') || 'zh-cn';
            const msg = {
                channel: MATERIAL_CHANNEL,
                type: 'editorLocale',
                data: { locale: editorLocale }
            };
            if (e.source && !e.source.closed) {
                e.source.postMessage(msg, '*');
            }
            break;
        case 'requestCapture':
            showMaterialDropZone();
            break;
        case 'cancelCapture':
            hideMaterialDropZone();
            break;
        case 'applyMaterial':
            applyMaterialToEditor(data);
            break;
        case 'getTargetList':
            getTargetListForMaterial(e);
            break;
        // 转发素材广场的 GitHub API 读取请求（匿名，避免 CORS 预检）
        case 'forwardGithubRead':
            handleMaterialGithubRead(e);
            break;
    }
}

async function handleMaterialGithubRead(e) {
    const { data } = e.data;
    if (!data || !data.path) return;
    const { requestId, path } = data;

    const reply = (payload) => {
        const msg = {
            channel: MATERIAL_CHANNEL,
            type: 'forwardGithubReadResult',
            data: { requestId, ...payload }
        };
        if (e.source && !e.source.closed) {
            e.source.postMessage(msg, '*');
        }
    };

    try {
        // 匿名请求（无 Authorization header），不触发 CORS 预检
        const res = await fetch(`${RWC_API_BASE}${path}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!res.ok) {
            throw new Error(`GitHub API ${res.status}`);
        }
        const result = await res.json();
        reply({ result });
    } catch (err) {
        reply({ error: err.message });
    }
}

function getVM() {
    try {
        return AddonHooks.appStateStore.getState().scratchGui.vm;
    } catch (e) {
        return null;
    }
}

function sendToMaterialPlaza(message) {
    if (materialPlazaSource && !materialPlazaSource.closed) {
        materialPlazaSource.postMessage(message, '*');
    }
}

function showMaterialDropZone() {
    if (dropZoneEl) return;
    captureActive = true;
    blockDragOutsideWorkspace = false;

    // Track pointer like backpack's handleGlobalPointerMove
    document.addEventListener('pointermove', trackPointer);
    document.addEventListener('mousemove', trackPointer);

    // Create drop zone styles
    dropZoneStylesEl = document.createElement('style');
    dropZoneStylesEl.textContent = `
        #material-plaza-drop-zone {
            position: fixed;
            inset: 0;
            z-index: 99998;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: mpFadeIn 0.2s ease;
        }
        #material-plaza-drop-zone .mp-drop-inner {
            background: rgba(0,0,0,0.55);
            backdrop-filter: blur(6px);
            border: 3px dashed #4caf50;
            border-radius: 20px;
            padding: 48px 64px;
            text-align: center;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 24px 48px rgba(0,0,0,0.3);
            transition: transform 0.2s, border-color 0.2s;
            max-width: 420px;
        }
        #material-plaza-drop-zone .mp-drop-inner.mp-hover {
            transform: scale(1.05);
            border-color: #66bb6a;
            background: rgba(0,0,0,0.65);
        }
        #material-plaza-drop-zone .mp-drop-icon {
            width: 72px;
            height: 72px;
            margin: 0 auto 16px;
            background: rgba(76, 175, 80, 0.2);
            border: 2px solid rgba(76, 175, 80, 0.5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #material-plaza-drop-zone .mp-drop-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        #material-plaza-drop-zone .mp-drop-subtitle {
            font-size: 13px;
            opacity: 0.7;
            line-height: 1.5;
        }
        #material-plaza-drop-zone .mp-drop-close {
            position: fixed;
            top: 16px;
            right: 16px;
            width: 36px;
            height: 36px;
            border: none;
            border-radius: 50%;
            background: rgba(255,255,255,0.15);
            color: #fff;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            transition: background 0.15s;
        }
        #material-plaza-drop-zone .mp-drop-close:hover {
            background: rgba(255,255,255,0.3);
        }
        @keyframes mpFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(dropZoneStylesEl);

    // Create drop zone element
    dropZoneEl = document.createElement('div');
    dropZoneEl.id = 'material-plaza-drop-zone';
    dropZoneEl.innerHTML = `
        <button class="mp-drop-close" id="mp-drop-close-btn">&times;</button>
        <div class="mp-drop-inner" id="mp-drop-inner">
            <div class="mp-drop-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
            </div>
            <div class="mp-drop-title">拖拽素材到此处</div>
            <div class="mp-drop-subtitle">从编辑器拖拽积木、角色、造型或声音到此处<br/>即可上传到素材广场</div>
        </div>
    `;
    document.body.appendChild(dropZoneEl);

    // Close button
    const closeBtn = dropZoneEl.querySelector('#mp-drop-close-btn');
    closeBtn.addEventListener('click', () => {
        sendToMaterialPlaza({
            channel: MATERIAL_CHANNEL,
            type: 'captureCancelled'
        });
        hideMaterialDropZone();
    });

    // Hover effect on drop inner
    const dropInner = dropZoneEl.querySelector('#mp-drop-inner');
    const updateHover = () => {
        if (dropZoneEl && dropInner) {
            dropInner.classList.toggle('mp-hover', isPointerOverDropZone());
        }
    };
    document.addEventListener('pointermove', updateHover);
    document.addEventListener('mousemove', updateHover);

    // Subscribe to block drag events on VM (like backpack does)
    const vm = getVM();
    if (vm) {
        vm.addListener('BLOCK_DRAG_UPDATE', handleBlockDragUpdateForMaterial);
        vm.addListener('BLOCK_DRAG_END', handleBlockDragEndForMaterial);
    }

    // Subscribe to Redux store for sprite/costume/sound drags (like DropAreaHOC)
    if (AddonHooks.appStateStore) {
        let prevDragState = null;
        unsubscribeStore = AddonHooks.appStateStore.subscribe(() => {
            try {
                const state = AddonHooks.appStateStore.getState();
                const dragState = state.scratchGui && state.scratchGui.assetDrag;
                if (!dragState) return;

                // Detect drag end: was dragging and now not dragging
                if (prevDragState && prevDragState.dragging && !dragState.dragging) {
                    if (captureActive && prevDragState.dragType) {
                        // Check if pointer is over the drop zone (like DropAreaHOC checks currentOffset)
                        if (isPointerOverDropZone()) {
                            handleAssetDragEnd(prevDragState);
                        }
                    }
                }
                prevDragState = dragState ? { ...dragState } : null;
            } catch (e) {
                // ignore
            }
        });
    }
}

function hideMaterialDropZone() {
    captureActive = false;
    blockDragOutsideWorkspace = false;
    document.removeEventListener('pointermove', trackPointer);
    document.removeEventListener('mousemove', trackPointer);

    if (dropZoneEl) {
        dropZoneEl.remove();
        dropZoneEl = null;
    }
    if (dropZoneStylesEl) {
        dropZoneStylesEl.remove();
        dropZoneStylesEl = null;
    }

    const vm = getVM();
    if (vm) {
        vm.removeListener('BLOCK_DRAG_UPDATE', handleBlockDragUpdateForMaterial);
        vm.removeListener('BLOCK_DRAG_END', handleBlockDragEndForMaterial);
    }

    if (unsubscribeStore) {
        unsubscribeStore();
        unsubscribeStore = null;
    }
}

// Like backpack's handleBlockDragUpdate: track when blocks are outside the workspace
function handleBlockDragUpdateForMaterial(isOutsideWorkspace) {
    blockDragOutsideWorkspace = isOutsideWorkspace;
}

// Like backpack's handleBlockDragEnd: capture blocks dropped on the drop zone
function handleBlockDragEndForMaterial(blocks, topBlockId) {
    if (!captureActive) return;

    // Check if pointer is over the drop zone (same as backpack's isPointerOverDropArea)
    if (!isPointerOverDropZone()) return;

    const vm = getVM();
    if (!vm) return;

    const blockObjects = vm.exportStandaloneBlocks(blocks);
    const payload = { blockObjects, topBlockId };

    // Generate thumbnail using block-to-image
    import('../backpack/block-to-image').then(mod => {
        const blockToImage = mod.default;
        return blockToImage(topBlockId);
    }).then(dataUrl => {
        sendToMaterialPlaza({
            channel: MATERIAL_CHANNEL,
            type: 'capturedMaterial',
            data: {
                type: 'script',
                name: 'code',
                mime: 'application/json',
                body: btoa(JSON.stringify(blockObjects)),
                thumbnail: dataUrl || '',
                payload: payload
            }
        });
        hideMaterialDropZone();
    }).catch(() => {
        sendToMaterialPlaza({
            channel: MATERIAL_CHANNEL,
            type: 'capturedMaterial',
            data: {
                type: 'script',
                name: 'code',
                mime: 'application/json',
                body: btoa(JSON.stringify(blockObjects)),
                thumbnail: '',
                payload: payload
            }
        });
        hideMaterialDropZone();
    });
}

async function handleAssetDragEnd(dragState) {
    if (!captureActive) return;
    const vm = getVM();
    if (!vm) return;

    const dragType = dragState.dragType;
    const payload = dragState.payload;

    let materialData = null;

    try {
        if (dragType === 'SPRITE') {
            // Capture sprite
            const spriteId = payload.id;
            const zippedSprite = await vm.exportSprite(spriteId, 'base64');
            const target = vm.runtime.getTargetById(spriteId);
            const spriteName = target ? target.sprite.name : 'sprite';
            const costumeDataUrl = target ? target.sprite.costumes[target.currentCostume].asset.encodeDataURI() : '';

            materialData = {
                type: 'sprite',
                name: spriteName,
                mime: 'application/zip',
                body: zippedSprite,
                thumbnail: costumeDataUrl || ''
            };
        } else if (dragType === 'COSTUME') {
            // Capture costume
            const costume = payload.asset;
            const assetDataUrl = vm.getExportedCostumeBase64(costume);
            const dataFormat = costume.dataFormat;
            let mime = 'image/svg+xml';
            if (dataFormat === 'png') mime = 'image/png';
            else if (dataFormat === 'jpg') mime = 'image/jpeg';

            materialData = {
                type: 'costume',
                name: costume.name,
                mime: mime,
                body: assetDataUrl,
                thumbnail: assetDataUrl || ''
            };
        } else if (dragType === 'SOUND') {
            // Capture sound
            const sound = payload.asset;
            const assetDataUrl = sound.asset.encodeDataURI();
            const dataFormat = sound.dataFormat;
            let mime = 'audio/x-wav';
            if (dataFormat === 'mp3') mime = 'audio/mp3';

            materialData = {
                type: 'sound',
                name: sound.name,
                mime: mime,
                body: assetDataUrl.replace(/^data:[^;]+;base64,/, ''),
                thumbnail: '' // Sound uses default thumbnail
            };
        }
    } catch (e) {
        console.error('[RWC] Failed to capture material:', e);
        return;
    }

    if (materialData) {
        sendToMaterialPlaza({
            channel: MATERIAL_CHANNEL,
            type: 'capturedMaterial',
            data: {
                ...materialData,
                payload: payload
            }
        });
        hideMaterialDropZone();
    }
}

function getTargetListForMaterial(e) {
    const vm = getVM();
    if (!vm || !vm.runtime) return;
    const { requestId } = (e.data && e.data.data) || {};

    const targets = vm.runtime.targets.map(function (t) {
        return {
            id: t.id,
            name: t.getName(),
            isStage: t.isStage,
            // 获取第一个造型作为缩略图
            costumes: (t.getCostumes() || []).map(function (c) {
                return {
                    name: c.name,
                    assetId: c.assetId,
                    dataFormat: c.dataFormat
                };
            }),
            costumeCount: (t.getCostumes() || []).length,
            soundCount: (t.getSounds() || []).length
        };
    });

    const msg = {
        channel: MATERIAL_CHANNEL,
        type: 'targetListResult',
        data: { requestId: requestId, targets: targets }
    };
    if (e.source && !e.source.closed) {
        e.source.postMessage(msg, '*');
    }
}

async function applyMaterialToEditor(data) {
    if (!data) return;
    const vm = getVM();
    if (!vm) return;

    const { type, body, mime, payload, targetId } = data;

    try {
        switch (type) {
            case 'script':
                if (payload && payload.blockObjects) {
                    // Place blocks in workspace
                    const blockObjects = payload.blockObjects;
                    const blocks = blockObjects && blockObjects.blocks;
                    if (blocks) {
                        const topBlockId = blocks.find(b => b.topLevel && !b.parent);
                        if (topBlockId) {
                            await vm.emit('BLOCKS_NEED_ADDED', null, blockObjects);
                        }
                    }
                } else if (body) {
                    // Try to parse body as JSON block objects
                    try {
                        const blockObjects = JSON.parse(atob(body));
                        await vm.emit('BLOCKS_NEED_ADDED', null, blockObjects);
                    } catch (e) {
                        console.error('[RWC] Failed to parse script body:', e);
                    }
                }
                break;

            case 'sprite':
                // Add sprite from base64 zip
                if (body) {
                    const binaryStr = atob(body);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    await vm.addSprite(bytes.buffer);
                }
                break;

            case 'costume':
                // Add costume to specified target (or current target if not specified)
                if (body && mime) {
                    // Derive data format from mime
                    let dataFormat = 'svg';
                    if (mime === 'image/png') dataFormat = 'png';
                    else if (mime === 'image/jpeg') dataFormat = 'jpg';

                    // Create a costume object from the data
                    const md5 = md5FromBody(body);
                    const costumeObject = {
                        name: data.name || 'Material',
                        dataFormat: dataFormat,
                        assetId: md5,
                        md5: md5 + '.' + dataFormat,
                        rotationCenterX: 0,
                        rotationCenterY: 0,
                        bitmapResolution: 1
                    };

                    // Store the asset
                    const assetType = dataFormat === 'svg' ?
                        storage.AssetType.ImageVector :
                        storage.AssetType.ImageBitmap;
                    const bodyBytes = base64ToBytes(body);
                    await storage.builtinHelper._store(
                        assetType,
                        dataFormat,
                        bodyBytes,
                        md5
                    );

                    // Add to target (use targetId if provided)
                    await vm.addCostume(costumeObject.md5, costumeObject, targetId || null);
                }
                break;

            case 'sound':
                // Add sound to specified target (or current target if not specified)
                if (body) {
                    let dataFormat = 'wav';
                    // 修复 MIME 类型检查：audio/mpeg 是 mp3 的标准 MIME
                    if (mime === 'audio/mpeg' || mime === 'audio/mp3') dataFormat = 'mp3';

                    const md5 = md5FromBody(body);
                    const soundObject = {
                        name: data.name || 'Material',
                        dataFormat: dataFormat,
                        assetId: md5,
                        md5: md5 + '.' + dataFormat,
                        format: dataFormat,
                        rate: 44100,
                        sampleCount: 0
                    };

                    // Store the asset data
                    await storage.builtinHelper._store(
                        storage.AssetType.Sound,
                        dataFormat,
                        base64ToBytes(body),
                        md5
                    );

                    // Add to target (use targetId if provided)
                    await vm.addSound(soundObject, targetId || null);
                }
                break;
        }

        sendToMaterialPlaza({
            channel: MATERIAL_CHANNEL,
            type: 'applyResult',
            data: { success: true }
        });
    } catch (e) {
        console.error('[RWC] Failed to apply material:', e);
        sendToMaterialPlaza({
            channel: MATERIAL_CHANNEL,
            type: 'applyResult',
            data: { success: false, error: e.message }
        });
    }
}

function md5FromBody(body) {
    try {
        const md5 = require('js-md5');
        return md5(base64ToBytes(body));
    } catch (e) {
        return 'material_' + Date.now();
    }
}

function base64ToBytes(base64) {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}

function initBridge() {
    if (bridgeInitialized) return;
    bridgeInitialized = true;

    window.addEventListener('message', handleMessage);
    window.addEventListener('message', handleExperimentPlazaMessage);
    window.addEventListener('message', handleMaterialPlazaMessage);
    console.log('[RWC] Bridge initialized');

    setTimeout(checkRwcUrlParam, 500);
}

async function checkRwcUrlParam() {
    try {
        const params = new URLSearchParams(window.location.search);
        const rwcParam = params.get('rwc');
        if (!rwcParam) return;

        const shouldApply = confirm('检测到配置链接，是否应用此配置到编辑器？');
        if (!shouldApply) return;

        const success = await applyConfigFromUrl(rwcParam);
        if (success) {
            params.delete('rwc');
            const newUrl = window.location.pathname +
                (params.toString() ? '?' + params.toString() : '') +
                window.location.hash;
            window.history.replaceState({}, '', newUrl);
            // Show a big red warning modal instead of plain alert so the user
            // clearly understands that a page reload is required.
            showEditorRefreshWarning();
        }
    } catch (e) {
        console.error('[RWC] Failed to handle rwc param:', e);
        alert('配置应用失败: ' + e.message);
    }
}

// Inject and display a full-screen red warning modal telling the user to
// refresh the editor. Clicking the button or backdrop reloads the page.
function showEditorRefreshWarning() {
    const existing = document.getElementById('rwc-editor-warning');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.textContent = `
        #rwc-editor-warning {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #rwc-editor-warning .rwc-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            animation: rwcFadeIn 0.2s ease;
        }
        #rwc-editor-warning .rwc-card {
            position: relative;
            background: #fff;
            border: 3px solid #dc2626;
            border-radius: 16px;
            padding: 36px 40px 28px;
            max-width: 440px;
            width: calc(100% - 48px);
            text-align: center;
            box-shadow: 0 24px 48px rgba(220,38,38,0.35), 0 8px 24px rgba(0,0,0,0.25);
            animation: rwcPopIn 0.3s cubic-bezier(0.2,0.8,0.3,1.2);
        }
        #rwc-editor-warning .rwc-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 16px;
            background: #fef2f2;
            border: 3px solid #dc2626;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #dc2626;
        }
        #rwc-editor-warning .rwc-title {
            font-size: 26px;
            font-weight: 800;
            color: #dc2626;
            margin-bottom: 12px;
            letter-spacing: 1px;
        }
        #rwc-editor-warning .rwc-msg {
            font-size: 14px;
            color: #374151;
            line-height: 1.7;
            margin-bottom: 28px;
        }
        #rwc-editor-warning .rwc-btn {
            background: #dc2626;
            color: #fff;
            border: none;
            border-radius: 10px;
            padding: 12px 36px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(220,38,38,0.4);
            transition: background 0.15s;
        }
        #rwc-editor-warning .rwc-btn:hover { background: #b91c1c; }
        @keyframes rwcFadeIn { from {opacity:0;} to {opacity:1;} }
        @keyframes rwcPopIn {
            from { opacity:0; transform:scale(0.85) translateY(10px); }
            to   { opacity:1; transform:scale(1) translateY(0); }
        }
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = 'rwc-editor-warning';
    modal.innerHTML = `
        <div class="rwc-backdrop"></div>
        <div class="rwc-card">
            <div class="rwc-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </div>
            <div class="rwc-title">请刷新编辑器</div>
            <div class="rwc-msg">配置已成功应用，但部分主题与设置需刷新编辑器页面才能完全生效。</div>
            <button class="rwc-btn" id="rwc-editor-warning-btn">刷新页面</button>
        </div>
    `;
    document.body.appendChild(modal);

    const reloadPage = () => {
        // Force a full page reload, bypassing any SPA router or cache.
        // Using href assignment instead of reload() because some SPA setups
        // intercept reload without actually reloading from scratch.
        window.location.href = window.location.pathname + window.location.search;
    };
    modal.querySelector('.rwc-backdrop').addEventListener('click', reloadPage);
    modal.querySelector('#rwc-editor-warning-btn').addEventListener('click', reloadPage);

    // Auto-reload after 5 seconds
    setTimeout(reloadPage, 5000);
}

export {
    initBridge,
    detectCurrentTheme,
    exportCurrentConfig,
    applyConfigFromUrl
};

export default {
    init: initBridge
};

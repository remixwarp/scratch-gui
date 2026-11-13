#!/usr/bin/env node
/**
 * 把官方 EXE 自带的 renderer（dist-renderer-webpack/editor）原封不动地打成单个 HTML5。
 * - 不往里加任何东西（没有标题、加载圈、标签栏、"从内联启动"提示…）
 * - 不往外删任何东西（保留 gui.html 的所有 DOM、脚本、样式、splash）
 * - 仅做一件事：把所有外部资源（js/chunk/worker/css/static/assets/blocks-media/monaco/addons）
 *   内联进同一个文件，运行时拦截所有请求走内存，不产生本地 404。
 *
 * 用法：node scripts/build-exe-single-html.mjs
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const EDITOR_DIR = process.env.RW_EDITOR_DIR || '/tmp/rw-asar/dist-renderer-webpack/editor';
const OUT_FILE = process.env.RW_OUT_FILE || '/workspace/RemixWarp-EXE.html';

const MIME = {
    '.js': 'text/javascript;charset=utf-8',
    '.css': 'text/css;charset=utf-8',
    '.html': 'text/html;charset=utf-8',
    '.json': 'application/json;charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.cur': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.wasm': 'application/wasm'
};

const mimeOf = file => MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';

function walk(dir, base = dir, out = new Map()) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, base, out);
        else out.set(path.relative(base, full).split(path.sep).join('/'), full);
    }
    return out;
}

// 内联范围：全部，除了 gui.html 本身（它作为入口壳，要保持原样，只在 <head> 里插一段 bootstrap）
function shouldInclude(rel) {
    if (rel === 'gui/gui.html') return false;
    if (/\.(map|gz|br)$/.test(rel)) return false;
    return true;
}

const allFiles = walk(EDITOR_DIR);
const dataUriCache = new Map();
function dataUriOf(rel) {
    if (!dataUriCache.has(rel)) {
        const abs = allFiles.get(rel);
        if (!abs) return null;
        dataUriCache.set(rel, `data:${mimeOf(rel)};base64,${fs.readFileSync(abs).toString('base64')}`);
    }
    return dataUriCache.get(rel);
}

const stats = {rewrittenAssets: 0, missingAssets: 0};

function rewriteJsAssets(rel, source) {
    const root = rel.startsWith('addons/') ? 'addons/' : (rel.startsWith('gui/') ? 'gui/' : '');
    let count = 0;
    let missing = 0;
    const rewritten = source.replace(
        /([A-Za-z_$][\w$]*)\.p\s*\+\s*(["'])(static\/assets\/[^"']+)\2/g,
        (match, pub, quote, assetRel) => {
            const uri = dataUriOf(root + assetRel);
            if (!uri) { missing++; return match; }
            count++;
            return JSON.stringify(uri);
        }
    );
    stats.rewrittenAssets += count;
    stats.missingAssets += missing;
    if (rewritten !== source && rewritten.length < 4 * 1024 * 1024) {
        try { new Function(rewritten); } catch (error) {
            throw new Error(`[exe-html] ${rel} 内联后语法错误: ${error.message}`);
        }
    }
    return rewritten;
}

function rewriteCssUrls(rel, cssText) {
    const dir = path.posix.dirname(rel);
    return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, rawUrl) => {
        const url = rawUrl.trim();
        if (!url || /^(data:|blob:|https?:|#|\/\/)/i.test(url)) return match;
        const clean = url.split('#')[0].split('?')[0];
        const key = path.posix.normalize(path.posix.join(dir, clean));
        const uri = dataUriOf(key);
        if (!uri) return match;
        stats.rewrittenAssets++;
        return `url("${uri}")`;
    });
}

function rewriteMonacoIframe(htmlText) {
    // 仅修改：iframe 内的 Monaco 基准路径，让 loader 从我们的 rwmonaco/ 前缀下找资源。
    let out = htmlText.replace(/var MONACO_LOCAL_BASE = 'monaco\/vs';/, "var MONACO_LOCAL_BASE = 'rwmonaco/vs';");
    // 让 iframe 里的 require 能解析到父窗口注入的 EMB
    const envScript = `<script>window.MonacoEnvironment={getWorkerUrl:function(moduleId,label){return 'rwmonaco-worker/'+encodeURIComponent(label)+'.js';}};</script>`;
    out = out.replace(/<head([^>]*)>/i, match => match + envScript);
    return out;
}

function rewriteAddonsPage(htmlText) {
    // 去掉 CSP，否则 srcdoc 里的 data/blob 会被拦
    return htmlText.replace(/<meta[^>]+Content-Security-Policy[^>]*>\s*/i, '');
}

function buildPayload() {
    const entries = Object.create(null);
    const included = [];
    let rawBytes = 0;
    let packedBytes = 0;

    for (const [rel, abs] of allFiles) {
        if (!shouldInclude(rel)) continue;
        let data = fs.readFileSync(abs);
        if (rel.endsWith('.js')) {
            data = Buffer.from(rewriteJsAssets(rel, data.toString('utf8')), 'utf8');
        } else if (rel.endsWith('.css')) {
            data = Buffer.from(rewriteCssUrls(rel, data.toString('utf8')), 'utf8');
        } else if (rel === 'monaco-editor-iframe.html') {
            data = Buffer.from(rewriteMonacoIframe(data.toString('utf8')), 'utf8');
        } else if (rel === 'addons/addons.html') {
            data = Buffer.from(rewriteAddonsPage(data.toString('utf8')), 'utf8');
        }
        rawBytes += data.length;
        included.push(rel);
        if (data.length >= 1024) {
            const gz = zlib.gzipSync(data, {level: 9});
            if (gz.length < data.length) { entries[rel] = [1, gz.toString('base64')]; packedBytes += gz.length; continue; }
        }
        entries[rel] = [0, data.toString('base64')];
        packedBytes += data.length;
    }
    return {entries, included, rawBytes, packedBytes};
}

// ---- 注入到顶层 gui.html 的引导脚本 ----
// 必须在 gui.html 自己的 <script> 之前执行，因为它马上就会 fetch('index.js')、Worker(...) 等。
function BOOT_SCRIPT() {
    'use strict';
    (function () {
        if (window.__RW_BOOTED__) return;
        window.__RW_BOOTED__ = true;
        const ASSETS = JSON.parse(document.getElementById('rw-assets').textContent);
        const MIME = {'text/javascript;charset=utf-8':1,'text/css;charset=utf-8':1,'text/html;charset=utf-8':1,'application/json;charset=utf-8':1,'image/svg+xml':1,'image/png':1,'image/jpeg':1,'image/webp':1,'image/gif':1,'image/x-icon':1,'font/woff':1,'font/woff2':1,'font/ttf':1,'audio/mpeg':1,'audio/wav':1,'audio/ogg':1,'application/wasm':1};
        const cache = Object.create(null);
        const syncBlobs = Object.create(null);
        const getMime = k => { const i = k.lastIndexOf('.'); return MIME[k.slice(i).toLowerCase()] || 'application/octet-stream'; };
        const bytesOf = b64 => { const bin = atob(b64), n = bin.length, out = new Uint8Array(n); for (let i = 0; i < n; i++) out[i] = bin.charCodeAt(i); return out; };
        const blobUrlOf = key => {
            if (cache[key]) return cache[key];
            const entry = ASSETS[key];
            if (!entry) return Promise.reject(new Error('missing ' + key));
            let data;
            if (entry[0] === 0) {
                data = Promise.resolve(bytesOf(entry[1]));
            } else {
                data = new Blob([bytesOf(entry[1])]).stream().pipeThrough(new DecompressionStream('gzip'));
                data = new Response(data).arrayBuffer().then(b => new Uint8Array(b));
            }
            cache[key] = data.then(buf => URL.createObjectURL(new Blob([buf], {type: getMime(key)})));
            return cache[key];
        };

        const has = key => Object.prototype.hasOwnProperty.call(ASSETS, key);
        const normalize = raw => {
            let s = String(raw).trim();
            if (!s || /^(data:|blob:|javascript:|about:|mailto:|tel:)/i.test(s)) return null;
            // Android WebView / 微信 / 原生 App 打开本地文件时用 content:// 协议，
            // 它不支持在文档 URL 上拼相对路径。直接剥到最后一段文件名，让 findKey
            // 能通过 gui/<name>、<name> 等候选命中。
            if (/^content:/i.test(s)) {
                const clean = s.split('#')[0].split('?')[0];
                const last = clean.replace(/\\/g, '/').split('/').filter(Boolean).pop();
                return last || null;
            }
            if (s.indexOf('rwmonaco/') === 0) return 'monaco/' + s.slice('rwmonaco/'.length);
            if (s.indexOf('rwmonaco-worker/') === 0) return null;
            if (/^tw-editor:/i.test(s)) {
                const m = /^tw-editor:\/\/\.?\/?(.*)$/i.exec(s);
                if (!m) return null;
                s = m[1];
            } else if (/^(file:|https?:)?\/\//i.test(s)) {
                try {
                    const u = new URL(s, location.href);
                    if (u.protocol !== 'file:' && u.origin !== location.origin) return null;
                    s = u.pathname;
                } catch (e) { return null; }
            }
            s = s.split('#')[0].split('?')[0].replace(/\\/g, '/');
            try { s = decodeURIComponent(s); } catch (e) {}
            s = s.replace(/^\.?\//, '').replace(/^\/+/, '');
            return s || null;
        };
        const findKey = (raw, base) => {
            const key = normalize(raw);
            if (!key) return null;
            const list = [];
            if (base) list.push(base + key);
            list.push(key, 'gui/' + key, 'addons/' + key);
            if (key.indexOf('vs/') === 0) list.push('monaco/' + key);
            for (let i = 0; i < list.length; i++) if (has(list[i])) return list[i];
            return null;
        };

        // 预解压 blockly 需要的 blocks-media（icon url 通过 setAttribute 同步写入）
        const preloadBlocksMedia = () => {
            const keys = Object.keys(ASSETS).filter(k => k.indexOf('gui/static/blocks-media/') === 0);
            return Promise.all(keys.map(k => blobUrlOf(k).then(u => { syncBlobs[k] = u; }, () => {})));
        };
        const syncUrlOf = (raw, base) => {
            const key = findKey(raw, base);
            return key ? (syncBlobs[key] || null) : null;
        };

        const PAGES = {
            monaco: ASSETS['monaco-editor-iframe.html'] ? ASSETS['monaco-editor-iframe.html'][1] : null,
            addons: ASSETS['addons/addons.html'] ? ASSETS['addons/addons.html'][1] : null
        };

        // ---- monkey patch ----
        const _origAppend = Node.prototype.appendChild;
        const _origInsertBefore = Node.prototype.insertBefore;
        const patchNode = (node, parent) => {
            if (!node || node.nodeType !== 1) return false;
            const tag = node.tagName;
            if (tag === 'SCRIPT') {
                const src = node.getAttribute('src');
                if (!src) return false;
                const key = findKey(src, 'gui/');
                if (!key) return false;
                blobUrlOf(key).then(url => { node.setAttribute('src', url); _origAppend.call(parent, node); }, () => _origAppend.call(parent, node));
                return true;
            }
            if (tag === 'LINK') {
                const href = node.getAttribute('href');
                if (!href) return false;
                const rel = (node.getAttribute('rel') || '').toLowerCase();
                if (rel.indexOf('prefetch') !== -1 || rel.indexOf('preload') !== -1 || rel.indexOf('modulepreload') !== -1) return true;
                const key = findKey(href, 'gui/');
                if (!key) return false;
                blobUrlOf(key).then(url => { node.setAttribute('href', url); _origAppend.call(parent, node); }, () => _origAppend.call(parent, node));
                return true;
            }
            if (tag === 'IFRAME') {
                const frameSrc = node.getAttribute('src');
                if (!frameSrc) return false;
                if (/monaco-editor-iframe/i.test(frameSrc)) {
                    node.removeAttribute('src');
                    const entry = ASSETS['monaco-editor-iframe.html'];
                    // 直接塞进原文件内容（已 rewriteMonacoIframe 处理过）
                    const bytes = entry[0] === 0 ? bytesOf(entry[1]) : null;
                    if (bytes) {
                        _origAppend.call(parent, node);
                        node.setAttribute('srcdoc', new TextDecoder().decode(bytes));
                    } else {
                        blobUrlOf('monaco-editor-iframe.html').then(url => {
                            _origAppend.call(parent, node);
                            node.setAttribute('srcdoc', fetch(url).then(r => r.text()).then(t => t));
                        }, () => _origAppend.call(parent, node));
                    }
                    return true;
                }
                if (/^tw-editor:\/\/\//i.test(frameSrc) && frameSrc.indexOf('addons/') !== -1) {
                    node.removeAttribute('src');
                    const entry = ASSETS['addons/addons.html'];
                    const bytes = entry[0] === 0 ? bytesOf(entry[1]) : null;
                    if (bytes) {
                        _origAppend.call(parent, node);
                        node.setAttribute('srcdoc', new TextDecoder().decode(bytes));
                    } else {
                        blobUrlOf('addons/addons.html').then(url => {
                            _origAppend.call(parent, node);
                            fetch(url).then(r => r.text()).then(t => node.setAttribute('srcdoc', t));
                        }, () => _origAppend.call(parent, node));
                    }
                    return true;
                }
                return false;
            }
            return false;
        };
        Node.prototype.appendChild = function (node) {
            if (patchNode(node, this)) return node;
            return _origAppend.call(this, node);
        };
        Node.prototype.insertBefore = function (node, ref) {
            if (patchNode(node, this)) return node;
            return _origInsertBefore.call(this, node, ref);
        };

        // 属性层：同步改写 svg <image xlink:href> / <img src> / <a href> 等，让 blockly 的 icon
        // 在 appendChild 前就已经是 blob url，避免 404。
        const _origSetAttribute = Element.prototype.setAttribute;
        const _origSetAttributeNS = Element.prototype.setAttributeNS;
        Element.prototype.setAttribute = function (name, value) {
            const lower = String(name).toLowerCase();
            if (lower === 'src' || lower === 'href' || lower === 'xlink:href') {
                const mapped = syncUrlOf(value, 'gui/');
                if (mapped) return _origSetAttribute.call(this, name, mapped);
            }
            return _origSetAttribute.call(this, name, value);
        };
        Element.prototype.setAttributeNS = function (ns, name, value) {
            const lower = String(name).toLowerCase();
            if (lower === 'href' || lower === 'xlink:href') {
                const mapped = syncUrlOf(value, 'gui/');
                if (mapped) return _origSetAttributeNS.call(this, ns, name, mapped);
            }
            return _origSetAttributeNS.call(this, ns, name, value);
        };

        try {
            const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
            if (imgDesc && imgDesc.set) {
                Object.defineProperty(HTMLImageElement.prototype, 'src', {
                    configurable: true, enumerable: imgDesc.enumerable,
                    get: () => imgDesc.get.call(this),
                    set: function (v) {
                        const sync = syncUrlOf(v, 'gui/');
                        if (sync) { imgDesc.set.call(this, sync); return; }
                        const key = typeof v === 'string' ? findKey(v, 'gui/') : null;
                        if (key) { blobUrlOf(key).then(u => imgDesc.set.call(this, u), () => imgDesc.set.call(this, v)); return; }
                        imgDesc.set.call(this, v);
                    }
                });
            }
        } catch (e) {}

        try {
            const frameDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
            if (frameDesc && frameDesc.set) {
                Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
                    configurable: true, enumerable: frameDesc.enumerable,
                    get: () => frameDesc.get.call(this),
                    set: function (v) {
                        if (/monaco-editor-iframe/i.test(v)) { node.setAttribute('srcdoc', ''); /* handled via attribute setter above */ return; }
                        frameDesc.set.call(this, v);
                    }
                });
            }
        } catch (e) {}

        // fetch
        if (window.fetch) {
            const _origFetch = window.fetch.bind(window);
            window.fetch = function (input, init) {
                try {
                    const raw = typeof input === 'string' ? input : (input && input.url);
                    if (raw && /\/api\/warptheme\//.test(raw)) {
                        return Promise.resolve(new Response('{"themes":[]}', {status: 200, headers: {'Content-Type': 'application/json'}}));
                    }
                    const key = raw ? findKey(raw, 'gui/') : null;
                    if (key) {
                        return blobUrlOf(key).then(url => typeof input === 'string' ? _origFetch(url, init) : _origFetch(new Request(url, input), init));
                    }
                } catch (e) {}
                return _origFetch(input, init);
            };
        }

        // Web Worker 排队代理
        try {
            const RealWorker = window.Worker;
            if (RealWorker) {
                const ProxyWorker = function (url, options) {
                    let self = this, queue = [], worker = null, terminated = false;
                    this.onmessage = null; this.onerror = null; this.onmessageerror = null;
                    this.__listeners = Object.create(null);
                    this.postMessage = function (msg, transfer) {
                        if (worker) worker.postMessage(msg, transfer); else queue.push([msg, transfer]);
                    };
                    this.terminate = function () { terminated = true; queue = []; if (worker) worker.terminate(); };
                    this.addEventListener = function (t, fn) { (self.__listeners[t] || (self.__listeners[t] = [])).push(fn); };
                    this.removeEventListener = function (t, fn) {
                        const list = self.__listeners[t]; if (!list) return;
                        const i = list.indexOf(fn); if (i !== -1) list.splice(i, 1);
                    };
                    this.dispatchEvent = function (event) {
                        const list = self.__listeners[event.type] || [];
                        for (let i = 0; i < list.length; i++) try { list[i].call(self, event); } catch (e) {}
                        return true;
                    };
                    const attach = w => {
                        worker = w;
                        w.onmessage = e => { if (self.onmessage) self.onmessage(e); self.dispatchEvent(e); };
                        w.onerror = e => { if (self.onerror) self.onerror(e); self.dispatchEvent(e); };
                        w.onmessageerror = e => { if (self.onmessageerror) self.onmessageerror(e); self.dispatchEvent(e); };
                        for (let i = 0; i < queue.length; i++) worker.postMessage(queue[i][0], queue[i][1]);
                        queue = [];
                    };

                    const urlText = String(url);
                    if (urlText.indexOf('rwmonaco-worker/') === 0) {
                        const label = decodeURIComponent(urlText.slice('rwmonaco-worker/'.length).replace(/\.js$/, ''));
                        const map = {typescript: 'language/typescript/tsWorker.js', javascript: 'language/typescript/tsWorker.js', json: 'language/json/jsonWorker.js', css: 'language/css/cssWorker.js', scss: 'language/css/cssWorker.js', less: 'language/css/cssWorker.js', html: 'language/html/htmlWorker.js', handlebars: 'language/html/htmlWorker.js', razor: 'language/html/htmlWorker.js'};
                        const mod = map[label];
                        const loadText = k => blobUrlOf(k).then(u => fetch(u).then(r => r.text()));
                        loadText('monaco/vs/base/worker/workerMain.js').then(main => {
                            if (terminated) return;
                            if (!mod) return new RealWorker(URL.createObjectURL(new Blob([main], {type: 'text/javascript'})), options);
                            loadText('monaco/vs/' + mod).then(extra => {
                                if (terminated) return;
                                attach(new RealWorker(URL.createObjectURL(new Blob([main + '\n;' + extra], {type: 'text/javascript'})), options));
                            });
                        });
                        return;
                    }
                    const key = findKey(urlText, 'gui/');
                    if (!key) { attach(new RealWorker(url, options)); return; }
                    blobUrlOf(key).then(u => { if (!terminated) attach(new RealWorker(u, options)); }, () => { if (!terminated) attach(new RealWorker(url, options)); });
                };
                ProxyWorker.prototype = RealWorker.prototype;
                window.Worker = ProxyWorker;
            }
        } catch (e) {}

        // 给 preload 注入的 EditorPreload 桌面 API 兜底（浏览器里无副作用）
        if (!window.EditorPreload) {
            window.EditorPreload = {
                isInitiallyFullscreen: () => false,
                getInitialFile: () => Promise.resolve(null),
                getAdvancedCustomizations: () => Promise.resolve({}),
                getDesktopSettings: () => ({updateCheckerAllowed: false}),
                getAboutInfo: () => ({version: '', commit: ''}),
                getPreferredMediaDevices: () => Promise.resolve([]),
                getFile: () => Promise.resolve(null),
                showOpenFilePicker: () => Promise.resolve(null),
                showSaveFilePicker: () => Promise.resolve(null),
                setLocale: (locale) => ({locale: locale || 'en', strings: {'prompt.ok': 'OK', 'prompt.cancel': 'Cancel'}}),
                setChanged: () => {},
                setIsFullScreen: () => {},
                setExportForPackager: () => {},
                exportAddonSettings: () => Promise.resolve(),
                openedFile: () => {},
                closedFile: () => {},
                openNewWindow: () => {},
                openPackager: () => {}
            };
        }

        // 等 blocks-media 都预解压好了再开始渲染（GUI 本来就有 splash 显示/隐藏逻辑，
        // 不影响我们的启动顺序）
        preloadBlocksMedia();
    })();
}

const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c');

function main() {
    if (!fs.existsSync(EDITOR_DIR)) { console.error(`[exe-html] 找不到渲染目录：${EDITOR_DIR}`); process.exit(1); }
    const payload = buildPayload();
    if (!payload.entries['gui/index.js']) { console.error('[exe-html] payload 缺 gui/index.js'); process.exit(1); }

    // 读取官方入口 gui.html，完整保留所有原有内容，仅在 <head> 最前插入引导脚本和 rw-assets
    const guiHtml = fs.readFileSync(path.join(EDITOR_DIR, 'gui/gui.html'), 'utf8');
    const assetsJson = safeJson(payload.entries);
    const bootInline = `(${BOOT_SCRIPT.toString()})();`;
    const injection = `<script type="application/json" id="rw-assets">${assetsJson}</script>\n<script>\n${bootInline}\n</script>\n`;

    // 插到 <head> 标签之后，让 gui.html 后面原有的 <script src="index.js"> 被我们的 hook 接管
    const injected = guiHtml.replace(/<head([^>]*)>/i, (m, attrs) => m + '\n' + injection);

    fs.writeFileSync(OUT_FILE, injected);
    console.log('[exe-html] 输出:', OUT_FILE);
    console.log('[exe-html] 文件数:', payload.included.length, '| 原始:', (payload.rawBytes / 1048576).toFixed(2), 'MB', '| gzip:', (payload.packedBytes / 1048576).toFixed(2), 'MB');
    console.log('[exe-html] 最终 HTML:', (Buffer.byteLength(injected) / 1048576).toFixed(2), 'MB', '| 内联静态资源:', stats.rewrittenAssets, '| 缺失:', stats.missingAssets);
}

main();

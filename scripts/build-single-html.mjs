#!/usr/bin/env node
/**
 * 将 build/ 目录下的全部产物融合为一个自包含的 HTML5 单文件。
 *
 * 做法：
 *  1. 遍历 build/，跳过 .gz/.br（它们只是同一产物的预压缩副本）与 .map。
 *  2. 所有资源以 gzip + base64 形式内联进 <script type="application/json">。
 *  3. 单文件内置一个“虚拟文件系统”：拦截 script/link/iframe/img/fetch/XHR，
 *     把相对路径映射为内存中的 Blob URL，从而让 webpack 的按需 chunk、
 *     monaco、静态资源全部从本文件读取，不再发起本地网络请求。
 *  4. 六个入口页面（editor/index/fullscreen/embed/addons/credits）以
 *     标签页 + iframe(srcdoc) 的形式融合在同一个界面里。
 *
 * 用法（先执行 npm run cf-build）：
 *  node scripts/build-single-html.mjs
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const OUT_FILE = path.join(ROOT, 'RemixWarp-Single.html');
const BARE_OUT_FILE = path.join(ROOT, 'RemixWarp-Editor.html');

const PAGES = [
    {id: 'editor', file: 'editor.html', label: '编辑器'},
    {id: 'player', file: 'index.html', label: '首页'},
    {id: 'fullscreen', file: 'fullscreen.html', label: '全屏播放'},
    {id: 'embed', file: 'embed.html', label: '嵌入'},
    {id: 'addons', file: 'addons.html', label: '附加设置'},
    {id: 'credits', file: 'credits.html', label: '致谢'}
];

const MIME = {
    '.js': 'text/javascript;charset=utf-8',
    '.mjs': 'text/javascript;charset=utf-8',
    '.css': 'text/css;charset=utf-8',
    '.html': 'text/html;charset=utf-8',
    '.htm': 'text/html;charset=utf-8',
    '.json': 'application/json;charset=utf-8',
    '.webmanifest': 'application/manifest+json;charset=utf-8',
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
    '.eot': 'application/vnd.ms-fontobject',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.wasm': 'application/wasm',
    '.txt': 'text/plain;charset=utf-8',
    '.xml': 'application/xml;charset=utf-8',
    '.hex': 'text/plain;charset=utf-8',
    '.md': 'text/markdown;charset=utf-8',
    '.map': 'application/json;charset=utf-8'
};

const mimeOf = file => MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';

function walk(dir, base = dir, out = new Map()) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, base, out);
        } else {
            out.set(path.relative(base, full).split(path.sep).join('/'), full);
        }
    }
    return out;
}

function collectFiles() {
    if (!fs.existsSync(BUILD_DIR)) {
        console.error('[single-html] build/ 不存在，请先执行 npm run cf-build');
        process.exit(1);
    }
    const all = walk(BUILD_DIR);
    const files = new Map();
    let skipped = 0;
    for (const [rel, abs] of all) {
        if (rel.endsWith('.gz') || rel.endsWith('.br')) {
            skipped++;
            continue;
        }
        files.set(rel, abs);
    }
    return {files, skipped};
}

function findAssetKey(candidate, exists) {
    if (!candidate) return null;
    let key = candidate.replace(/\\/g, '/').replace(/^\.?\//, '');
    const tries = [
        key,
        key.replace(/^\/+/, ''),
        `static/${key.replace(/^\/+/, '')}`,
        key.replace(/^static\//, '')
    ];
    for (const item of tries) {
        if (exists(item)) return item;
    }
    return null;
}

function rewriteCss(cssText, cssRel, exists, read) {
    return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, rawUrl) => {
        let url = rawUrl.trim();
        if (!url || /^(data:|blob:|https?:|#|\/\/)/i.test(url)) return match;
        const clean = url.split('#')[0].split('?')[0];
        let candidate;
        if (clean.startsWith('/')) {
            candidate = clean.slice(1);
        } else {
            candidate = path.posix.normalize(path.posix.join(path.posix.dirname(cssRel), clean));
        }
        let key = findAssetKey(candidate, exists);
        if (!key) {
            try {
                key = findAssetKey(decodeURIComponent(candidate), exists);
            } catch (e) {
                // ignore malformed escape
            }
        }
        if (!key) return match;
        const bytes = read(key);
        return `url("data:${mimeOf(key)};base64,${bytes.toString('base64')}")`;
    });
}

function isLocalUrl(url) {
    if (typeof url !== 'string') return false;
    const value = url.trim();
    if (!value) return false;
    if (/^(data:|blob:|https?:|wss?:|file:|about:|javascript:|mailto:|tel:|#|\/\/)/i.test(value)) {
        return false;
    }
    return true;
}

function buildPayload(files) {
    const exists = rel => files.has(rel);
    const read = rel => fs.readFileSync(files.get(rel));
    const entries = Object.create(null);
    const dataUriCache = new Map();
    const dataUriOf = rel => {
        if (!dataUriCache.has(rel)) {
            dataUriCache.set(rel, `data:${mimeOf(rel)};base64,${read(rel).toString('base64')}`);
        }
        return dataUriCache.get(rel);
    };
    let rawBytes = 0;
    let packedBytes = 0;
    let gzCount = 0;
    let rawCount = 0;

    for (const [rel, abs] of files) {
        let data = fs.readFileSync(abs);
        rawBytes += data.length;

        // CSS 里的 url() 在 <style> 内联后会相对于文档解析，必须在构建期重写为 data URI。
        if (rel.endsWith('.css')) {
            data = Buffer.from(rewriteCss(data.toString('utf8'), rel, exists, read), 'utf8');
        }

        // JS 里 url-loader 产出的资源 URL（n.p + "static/assets/..."）同样会在样式/图片中
        // 变成相对请求；这里直接替换成 data URI，确保样式表里的背景图也能离线加载。
        if (rel.endsWith('.js')) {
            const source = data.toString('utf8');
            const rewritten = source.replace(
                /n\.p\s*\+\s*(["'])(static\/[^"']+)\1/g,
                (match, quote, assetRel) => exists(assetRel) ? JSON.stringify(dataUriOf(assetRel)) : match
            );
            if (rewritten !== source) {
                try {
                    // 校验替换后的脚本仍是合法 JS，避免把字符串表达式改坏。
                    new Function(rewritten);
                } catch (error) {
                    throw new Error(`[single-html] ${rel} 资源内联后语法错误: ${error.message}`);
                }
                data = Buffer.from(rewritten, 'utf8');
            }
        }

        if (data.length >= 512) {
            const gz = zlib.gzipSync(data, {level: 9});
            if (gz.length < data.length) {
                entries[rel] = [1, gz.toString('base64')];
                packedBytes += gz.length;
                gzCount++;
                continue;
            }
        }
        entries[rel] = [0, data.toString('base64')];
        packedBytes += data.length;
        rawCount++;
    }

    return {entries, rawBytes, packedBytes, gzCount, rawCount};
}

function readPages(files) {
    const pages = {};
    for (const page of PAGES) {
        if (!files.has(page.file)) {
            console.error(`[single-html] 缺少入口页面：${page.file}`);
            process.exit(1);
        }
        pages[page.id] = fs.readFileSync(files.get(page.file), 'utf8');
    }
    return pages;
}

// 保证 JSON 放进 <script> 时不会提前闭合。
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c');

const SHELL_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google" content="notranslate">
<link rel="icon" href="__FAVICON_URI__">
<title>RemixWarp · 单文件版</title>
<style>
  :root {
    --rw-bar: #1d1f27;
    --rw-bar-border: #31343f;
    --rw-accent: #75c1c4;
    --rw-text: #e8eaf0;
    --rw-dim: #9aa0b0;
    --rw-bg: #121318;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    height: 100%;
    background: var(--rw-bg);
    color: var(--rw-text);
    font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
    overflow: hidden;
  }
  #rw-bar {
    height: 48px;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 0 16px;
    background: var(--rw-bar);
    border-bottom: 1px solid var(--rw-bar-border);
    position: relative;
    z-index: 10;
  }
  #rw-brand {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: .2px;
    white-space: nowrap;
  }
  #rw-brand small {
    margin-left: 8px;
    padding: 2px 6px;
    border: 1px solid var(--rw-bar-border);
    border-radius: 4px;
    color: var(--rw-dim);
    font-size: 11px;
    font-weight: 500;
  }
  #rw-tabs { display: flex; gap: 4px; flex: 0 0 auto; }
  .rw-tab {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--rw-dim);
    font-size: 13px;
    padding: 7px 14px;
    border-radius: 7px;
    cursor: pointer;
    transition: background .15s, color .15s;
    white-space: nowrap;
  }
  .rw-tab:hover { color: var(--rw-text); background: rgba(255,255,255,.06); }
  .rw-tab[aria-selected="true"] {
    color: #101216;
    background: var(--rw-accent);
    font-weight: 700;
  }
  #rw-meta {
    margin-left: auto;
    color: var(--rw-dim);
    font-size: 11px;
    line-height: 1.4;
    text-align: right;
    white-space: nowrap;
  }
  #rw-stage { position: absolute; inset: 48px 0 0 0; background: var(--rw-bg); }
  .rw-bare #rw-stage { inset: 0; }
  #rw-frame {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
  }
  #rw-loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
    justify-content: center;
    background: var(--rw-bg);
    color: var(--rw-dim);
    font-size: 13px;
    z-index: 5;
    transition: opacity .2s;
  }
  #rw-loading[hidden] { display: none; }
  .rw-spinner {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 4px solid var(--rw-accent);
    border-right-color: transparent;
    animation: rw-spin 1s linear infinite;
  }
  @keyframes rw-spin { to { transform: rotate(360deg); } }
  #rw-toast {
    position: absolute;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    background: rgba(0,0,0,.82);
    border: 1px solid var(--rw-bar-border);
    color: var(--rw-text);
    font-size: 12px;
    padding: 8px 14px;
    border-radius: 8px;
    max-width: 80%;
    text-align: center;
    z-index: 20;
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s;
  }
  #rw-toast[data-show="1"] { opacity: 1; }
  @media (max-width: 780px) {
    #rw-meta { display: none; }
    #rw-bar { gap: 8px; padding: 0 8px; overflow-x: auto; }
    .rw-tab { padding: 7px 10px; }
  }
</style>
</head>
<body class="__BODY_CLASS__">
<header id="rw-bar">
  <div id="rw-brand">RemixWarp<small>单文件版</small></div>
  <nav id="rw-tabs" role="tablist"></nav>
  <div id="rw-meta"></div>
</header>
<main id="rw-stage">
  <div id="rw-loading"><div class="rw-spinner"></div><div id="rw-loading-text">正在从内联资源中启动…</div></div>
  <div id="rw-toast"></div>
</main>

<script type="application/json" id="rw-assets">__ASSETS_JSON__</script>
<script type="application/json" id="rw-pages">__PAGES_JSON__</script>
<script>
(function () {
  'use strict';

  var ASSETS = JSON.parse(document.getElementById('rw-assets').textContent);
  var PAGES = JSON.parse(document.getElementById('rw-pages').textContent);
  var TABS = __TABS_JSON__;
  var BARE = __RW_BARE__;
  var ASSET_COUNT = __ASSET_COUNT__;
  var RAW_BYTES = __RAW_BYTES__;
  var BUILD_COMMIT = '__BUILD_COMMIT__';

  var MIME = __MIME_JSON__;
  function mimeOf(file) {
    var dot = file.lastIndexOf('.');
    if (dot === -1) return 'application/octet-stream';
    return MIME[file.slice(dot).toLowerCase()] || 'application/octet-stream';
  }

  var assetCache = new Map();
  var textCache = new Map();

  function base64ToBytes(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function stripQuery(value) {
    return value.split('#')[0].split('?')[0];
  }

  function toKey(raw) {
    if (typeof raw !== 'string') return null;
    var value = raw.trim();
    if (!value || value.charAt(0) === '#') return null;
    if (/^(data:|blob:|javascript:|mailto:|tel:|about:)/i.test(value)) return null;

    if (/^(https?:)?\\/\\//i.test(value)) {
      var abs;
      try {
        abs = new URL(value, location.href);
      } catch (e) {
        return null;
      }
      var sameOrigin = abs.origin === location.origin ||
        (location.protocol === 'file:' && abs.protocol === 'file:');
      if (!sameOrigin) return null;
      var baseDir = location.pathname.replace(/[^/]*$/, '');
      var pathname = abs.pathname;
      if (baseDir && baseDir !== '/' && pathname.indexOf(baseDir) === 0) {
        pathname = pathname.slice(baseDir.length);
      }
      value = pathname;
    }

    value = stripQuery(value).replace(/\\\\/g, '/').replace(/^\\.?\\//, '').replace(/^\\/+/, '');
    if (!value) return null;
    try {
      value = decodeURIComponent(value);
    } catch (e) {
      // 保留原始路径
    }
    return value;
  }

  function findKey(raw) {
    var key = toKey(raw);
    if (!key) return null;
    if (Object.prototype.hasOwnProperty.call(ASSETS, key)) return key;
    if (Object.prototype.hasOwnProperty.call(ASSETS, 'static/' + key)) return 'static/' + key;
    var withoutStatic = key.replace(/^static\\//, '');
    if (Object.prototype.hasOwnProperty.call(ASSETS, withoutStatic)) return withoutStatic;
    return null;
  }

  function getBlobUrl(raw) {
    var key = findKey(raw);
    if (!key) return Promise.reject(new Error('not embedded: ' + raw));
    if (assetCache.has(key)) return assetCache.get(key);
    var pending = Promise.resolve().then(function () {
      var entry = ASSETS[key];
      var bytes = base64ToBytes(entry[1]);
      if (entry[0] === 1) {
        if (typeof DecompressionStream === 'undefined') {
          throw new Error('当前浏览器不支持 DecompressionStream，无法解压内联资源');
        }
        var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        return new Response(stream).arrayBuffer().then(function (buffer) {
          return new Blob([buffer], {type: mimeOf(key)});
        });
      }
      return new Blob([bytes], {type: mimeOf(key)});
    }).then(function (blob) {
      return URL.createObjectURL(blob);
    });
    assetCache.set(key, pending);
    return pending;
  }

  function getText(raw) {
    var key = findKey(raw);
    if (!key) return Promise.reject(new Error('not embedded: ' + raw));
    if (textCache.has(key)) return textCache.get(key);
    var pending = getBlobUrl(key).then(function (url) {
      return fetch(url).then(function (response) { return response.text(); });
    });
    textCache.set(key, pending);
    return pending;
  }

  function isLocalUrl(url) {
    return !!findKey(url);
  }

  // ---- 运行时页面转换：外部 script / stylesheet 变成内联资源 ----
  function transformPage(html) {
    var styles = [];
    var scripts = [];
    var seenStyle = Object.create(null);
    var seenScript = Object.create(null);

    html = html.replace(/<link\\b[^>]*>/gi, function (tag) {
      var relMatch = /rel\\s*=\\s*["']([^"']+)["']/i.exec(tag);
      var rel = relMatch ? relMatch[1].toLowerCase() : '';
      if (rel.indexOf('manifest') !== -1) return '';
      if (rel.indexOf('icon') !== -1) {
        var iconHref = /href\\s*=\\s*["']([^"']+)["']/i.exec(tag);
        // 本地图标已由外壳的 data URI 提供；外链图标保留。
        if (!iconHref || isLocalUrl(iconHref[1])) return '';
      }
      if (rel.indexOf('stylesheet') !== -1) {
        var hrefMatch = /href\\s*=\\s*["']([^"']+)["']/i.exec(tag);
        if (hrefMatch && isLocalUrl(hrefMatch[1])) {
          var href = hrefMatch[1];
          if (!seenStyle[href]) {
            seenStyle[href] = true;
            styles.push(href);
          }
          return '';
        }
      }
      return tag;
    });

    html = html.replace(/<script\\b([^>]*?)\\bsrc\\s*=\\s*(["'])([^"']+)\\2([^>]*)>\\s*<\\/script>/gi, function (tag, pre, quote, src) {
      if (!isLocalUrl(src)) return tag;
      if (!seenScript[src]) {
        seenScript[src] = true;
        scripts.push(src);
      }
      return '';
    });

    var boot = '<script>(' + RW_BOOTSTRAP.toString() + ')();<\\/script>';
    html = html.replace(/<head([^>]*)>/i, function (match) { return match + boot; });
    var runner = '<script>__RW_BOOT__(' + JSON.stringify(styles) + ',' + JSON.stringify(scripts) + ');<\\/script>';
    if (/<\\/body>/i.test(html)) {
      html = html.replace(/<\\/body>/i, runner + '</body>');
    } else {
      html += runner;
    }
    return html;
  }

  function buildPageFromAsset(key) {
    return getText(key).then(transformPage);
  }

  // ---- 注入到每个 iframe 里的运行时补丁 ----
  function RW_BOOTSTRAP() {
    'use strict';
    var EMB = null;
    try { EMB = window.__EMBED__ || (window.top && window.top.__EMBED__); } catch (e) { EMB = null; }
    if (!EMB) {
      try { EMB = window.parent && window.parent.__EMBED__; } catch (e2) { EMB = null; }
    }
    if (!EMB) return;

    window.__EMBED__ = EMB;

    var origAppend = Node.prototype.appendChild;
    var origInsertBefore = Node.prototype.insertBefore;

    function attachScript(node, parent) {
      EMB.getBlobUrl(node.getAttribute('src')).then(function (url) {
        node.setAttribute('src', url);
        origAppend.call(parent, node);
      }, function () {
        // 资源未内联时保持原样，交给浏览器/网络处理
        origAppend.call(parent, node);
      });
    }

    function handleNode(node, parent) {
      if (!node || node.nodeType !== 1) return false;
      var tag = node.tagName;
      if (tag === 'SCRIPT') {
        var src = node.getAttribute('src');
        if (src && EMB.findKey(src)) {
          attachScript(node, parent);
          return true;
        }
        return false;
      }
      if (tag === 'LINK') {
        var href = node.getAttribute('href');
        if (!href || !EMB.findKey(href)) return false;
        var rel = (node.getAttribute('rel') || '').toLowerCase();
        if (rel.indexOf('stylesheet') !== -1) {
          EMB.getText(href).then(function (css) {
            var style = document.createElement('style');
            style.textContent = css;
            origAppend.call(parent || document.head, style);
          }, function () {
            origAppend.call(parent || document.head, node);
          });
          return true;
        }
        if (rel.indexOf('prefetch') !== -1 || rel.indexOf('preload') !== -1 ||
            rel.indexOf('modulepreload') !== -1) {
          // 资源已经在文件内部，无需网络预取
          return true;
        }
        EMB.getBlobUrl(href).then(function (url) {
          node.setAttribute('href', url);
          origAppend.call(parent || document.head, node);
        }, function () {
          origAppend.call(parent || document.head, node);
        });
        return true;
      }
      if (tag === 'IFRAME') {
        var frameSrc = node.getAttribute('src');
        if (frameSrc && EMB.findKey(frameSrc)) {
          EMB.buildPageFromAsset(frameSrc).then(function (html) {
            node.removeAttribute('src');
            node.setAttribute('srcdoc', html);
            origAppend.call(parent, node);
          }, function () {
            origAppend.call(parent, node);
          });
          return true;
        }
      }
      return false;
    }

    Node.prototype.appendChild = function (node) {
      if (handleNode(node, this)) return node;
      return origAppend.call(this, node);
    };

    Node.prototype.insertBefore = function (node, reference) {
      if (handleNode(node, this)) return node;
      return origInsertBefore.call(this, node, reference);
    };

    // <img src> 常在不插入 DOM 的情况下被立即使用（Canvas/WebGL 贴图），单独拦截 setter。
    try {
      var imageDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      if (imageDescriptor && imageDescriptor.set) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
          configurable: true,
          enumerable: imageDescriptor.enumerable,
          get: function () { return imageDescriptor.get.call(this); },
          set: function (value) {
            if (typeof value === 'string' && EMB.findKey(value)) {
              var self = this;
              EMB.getBlobUrl(value).then(function (url) {
                imageDescriptor.set.call(self, url);
              }, function () {
                imageDescriptor.set.call(self, value);
              });
            } else {
              imageDescriptor.set.call(this, value);
            }
          }
        });
      }
    } catch (e) { /* 某些浏览器不允许改写 */ }

    // iframe 挂载后再设置 src 的情况（React 等）
    try {
      var frameDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
      if (frameDescriptor && frameDescriptor.set) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
          configurable: true,
          enumerable: frameDescriptor.enumerable,
          get: function () { return frameDescriptor.get.call(this); },
          set: function (value) {
            if (typeof value === 'string' && EMB.findKey(value)) {
              var self = this;
              EMB.buildPageFromAsset(value).then(function (html) {
                self.removeAttribute('src');
                self.setAttribute('srcdoc', html);
              }, function () {
                frameDescriptor.set.call(self, value);
              });
            } else {
              frameDescriptor.set.call(this, value);
            }
          }
        });
      }
    } catch (e) { /* ignore */ }

    // fetch
    if (window.fetch) {
      var origFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        try {
          var raw = typeof input === 'string' ? input : (input && input.url);
          if (raw && EMB.findKey(raw)) {
            return EMB.getBlobUrl(raw).then(function (url) {
              if (typeof input === 'string') return origFetch(url, init);
              return origFetch(new Request(url, input), init);
            }, function () {
              return origFetch(input, init);
            });
          }
        } catch (e) { /* fall through */ }
        return origFetch(input, init);
      };
    }

    // Web Worker：构建产物里有 extension-worker 与 rj-deserialize worker，
    // 它们以相对路径创建。Worker 构造是同步的，这里用“排队代理”等待资源解压。
    try {
      var RealWorker = window.Worker;
      if (RealWorker) {
        var ProxyWorker = function (url, options) {
          var self = this;
          this.onmessage = null;
          this.onerror = null;
          this.onmessageerror = null;
          this.__listeners = Object.create(null);
          this.__queue = [];
          this.__worker = null;
          this.__terminated = false;
          this.postMessage = function (message, transfer) {
            if (self.__worker) self.__worker.postMessage(message, transfer);
            else self.__queue.push([message, transfer]);
          };
          this.terminate = function () {
            self.__terminated = true;
            self.__queue = [];
            if (self.__worker) self.__worker.terminate();
          };
          this.addEventListener = function (type, listener) {
            (self.__listeners[type] || (self.__listeners[type] = [])).push(listener);
          };
          this.removeEventListener = function (type, listener) {
            var list = self.__listeners[type];
            if (!list) return;
            var index = list.indexOf(listener);
            if (index !== -1) list.splice(index, 1);
          };
          this.dispatchEvent = function (event) {
            var list = self.__listeners[event.type] || [];
            for (var i = 0; i < list.length; i++) {
              try { list[i].call(self, event); } catch (e) { /* ignore */ }
            }
            return true;
          };

          var attach = function (worker) {
            self.__worker = worker;
            worker.onmessage = function (event) {
              if (self.onmessage) self.onmessage(event);
              self.dispatchEvent(event);
            };
            worker.onerror = function (event) {
              if (self.onerror) self.onerror(event);
              self.dispatchEvent(event);
            };
            worker.onmessageerror = function (event) {
              if (self.onmessageerror) self.onmessageerror(event);
              self.dispatchEvent(event);
            };
            for (var i = 0; i < self.__queue.length; i++) {
              worker.postMessage(self.__queue[i][0], self.__queue[i][1]);
            }
            self.__queue = [];
          };

          var key = EMB.findKey(url);
          if (!key) {
            attach(new RealWorker(url, options));
            return;
          }
          EMB.getBlobUrl(key).then(function (mappedUrl) {
            if (self.__terminated) return;
            attach(new RealWorker(mappedUrl, options));
          }, function () {
            if (self.__terminated) return;
            attach(new RealWorker(url, options));
          });
        };
        ProxyWorker.prototype = RealWorker.prototype;
        window.Worker = ProxyWorker;
      }
    } catch (e) { /* ignore */ }

    // XMLHttpRequest
    try {
      var XHR = window.XMLHttpRequest;
      var origOpen = XHR.prototype.open;
      var origSend = XHR.prototype.send;
      XHR.prototype.open = function (method, url) {
        if (EMB.findKey(url)) {
          this.__rwPendingOpen = arguments;
          return;
        }
        this.__rwPendingOpen = null;
        return origOpen.apply(this, arguments);
      };
      XHR.prototype.send = function (body) {
        var self = this;
        if (this.__rwPendingOpen) {
          var args = this.__rwPendingOpen;
          this.__rwPendingOpen = null;
          EMB.getBlobUrl(args[1]).then(function (url) {
            var next = Array.prototype.slice.call(args);
            next[1] = url;
            origOpen.apply(self, next);
            origSend.call(self, body);
          }, function () {
            origOpen.apply(self, args);
            origSend.call(self, body);
          });
          return;
        }
        return origSend.call(this, body);
      };
    } catch (e) { /* ignore */ }

    // 当前 iframe 内的启动器：按顺序注入样式与入口脚本
    window.__RW_BOOT__ = function (styles, scripts) {
      var chain = Promise.resolve();
      styles.forEach(function (href) {
        chain = chain.then(function () {
          return EMB.getText(href).catch(function () { return ''; }).then(function (css) {
            if (!css) return;
            var style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
          });
        });
      });
      scripts.forEach(function (src) {
        chain = chain.then(function () {
          return EMB.getBlobUrl(src).catch(function () { return null; }).then(function (url) {
            if (!url) {
              console.warn('[single-html] 缺少内联资源：' + src);
              return;
            }
            return new Promise(function (resolve) {
              var script = document.createElement('script');
              script.src = url;
              script.onload = resolve;
              script.onerror = function () {
                console.error('[single-html] 脚本执行失败：' + src);
                resolve();
              };
              document.head.appendChild(script);
            });
          });
        });
      });
      return chain;
    };

    // 站内页面跳转（index.html/editor.html/...）改为父界面切标签
    document.addEventListener('click', function (event) {
      var node = event.target;
      while (node && node !== document) {
        if (node.tagName === 'A' && node.getAttribute('href')) break;
        node = node.parentNode;
      }
      if (!node || node === document) return;
      var href = node.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) return;
      var match = /(?:^|\\/)(editor|index|fullscreen|embed|addons|credits)\\.html(?:[?#].*)?$/i.exec(href);
      var name = match ? match[1].toLowerCase() : null;
      if (!match && (href === '/' || href === './' || href === '')) name = 'index';
      if (!name) return;
      var target = {editor: 'editor', index: 'player', fullscreen: 'fullscreen', embed: 'embed', addons: 'addons', credits: 'credits'}[name];
      if (target && window.top && window.top.__SWITCH__) {
        event.preventDefault();
        window.top.__SWITCH__(target);
      }
    }, true);
  }

  window.__EMBED__ = {
    findKey: findKey,
    isLocalUrl: isLocalUrl,
    getBlobUrl: getBlobUrl,
    getText: getText,
    buildPageFromAsset: buildPageFromAsset,
    transformPage: transformPage
  };

  // ---- 外壳界面 ----
  var stage = document.getElementById('rw-stage');
  var loading = document.getElementById('rw-loading');
  var loadingText = document.getElementById('rw-loading-text');
  var toast = document.getElementById('rw-toast');
  var tabsEl = document.getElementById('rw-tabs');
  var metaEl = document.getElementById('rw-meta');
  var current = null;

  function humanSize(bytes) {
    if (!bytes) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var index = 0;
    var value = bytes;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    return (Math.round(value * 10) / 10) + ' ' + units[index];
  }

  if (metaEl) {
    metaEl.textContent = 'develop · ' + BUILD_COMMIT.slice(0, 7) +
      ' · ' + ASSET_COUNT + ' 个内联资源 · ' + humanSize(RAW_BYTES);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.setAttribute('data-show', '1');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.removeAttribute('data-show');
    }, 4000);
  }

  function activate(id) {
    if (!PAGES[id]) id = 'editor';
    if (current === id && document.getElementById('rw-frame')) return;
    current = id;
    if (tabsEl) {
      Array.prototype.forEach.call(tabsEl.children, function (button) {
        button.setAttribute('aria-selected', button.getAttribute('data-tab') === id ? 'true' : 'false');
      });
    }

    Array.prototype.slice.call(stage.querySelectorAll('iframe')).forEach(function (frame) {
      frame.parentNode.removeChild(frame);
    });

    loading.hidden = false;
    loadingText.textContent = '正在从内联资源中启动…';
    var page = TABS.filter(function (item) { return item.id === id; })[0];
    var html = PAGES[id];
    if (!html) {
      loading.hidden = true;
      showToast('缺少页面：' + id);
      return;
    }

    var frame = document.createElement('iframe');
    frame.id = 'rw-frame';
    frame.title = page ? page.label : id;
    frame.setAttribute('allow', 'camera; microphone; clipboard-write; clipboard-read; fullscreen; autoplay; display-capture; gamepad');
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('srcdoc', transformPage(html));
    frame.addEventListener('load', function () {
      loading.hidden = true;
    });
    stage.appendChild(frame);

    // srcdoc 内脚本异步执行，兜底隐藏 loading
    clearTimeout(activate.timer);
    activate.timer = setTimeout(function () { loading.hidden = true; }, 15000);
  }

  // 裸编辑器版本不提供任何切换控件，站内跳转也不再切换页面。
  window.__SWITCH__ = BARE ? function () {} : activate;

  if (tabsEl) TABS.forEach(function (item) {
    var button = document.createElement('button');
    button.className = 'rw-tab';
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('data-tab', item.id);
    button.setAttribute('aria-selected', 'false');
    button.textContent = item.label;
    button.addEventListener('click', function () { activate(item.id); });
    tabsEl.appendChild(button);
  });

  window.addEventListener('error', function (event) {
    if (event && event.message) showToast('运行错误：' + event.message);
  });

  activate('editor');
})();
</script>
</body>
</html>
`;

function gitCommit() {
    try {
        const head = fs.readFileSync(path.join(ROOT, '.git', 'HEAD'), 'utf8').trim();
        if (head.startsWith('ref: ')) {
            const ref = head.slice(5).trim();
            const refFile = path.join(ROOT, '.git', ref);
            if (fs.existsSync(refFile)) return fs.readFileSync(refFile, 'utf8').trim();
        }
        return head;
    } catch (e) {
        return process.env.GIT_COMMIT || 'unknown';
    }
}

// build/ 被清理时，直接从已生成的单文件里复用内联资源，避免重新构建。
function loadExistingSingle() {
    if (!fs.existsSync(OUT_FILE)) return null;
    const html = fs.readFileSync(OUT_FILE, 'utf8');
    const grab = id => {
        const match = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`).exec(html);
        return match ? JSON.parse(match[1]) : null;
    };
    const entries = grab('rw-assets');
    const pages = grab('rw-pages');
    if (!entries || !pages) return null;

    const faviconMatch = /<link rel="icon" href="(data:[^"]*)"/.exec(html);
    const commitMatch = /var BUILD_COMMIT = '([^']+)'/.exec(html);
    let rawBytes = 0;
    let packedBytes = 0;
    let gzCount = 0;
    let rawCount = 0;
    for (const [flag, base64] of Object.values(entries)) {
        const compressed = Buffer.from(base64, 'base64');
        packedBytes += compressed.length;
        if (flag === 1) {
            gzCount++;
            rawBytes += zlib.gunzipSync(compressed).length;
        } else {
            rawCount++;
            rawBytes += compressed.length;
        }
    }
    return {
        entries,
        pages,
        rawBytes,
        packedBytes,
        gzCount,
        rawCount,
        skipped: 0,
        faviconUri: faviconMatch ? faviconMatch[1] : '',
        commit: commitMatch ? commitMatch[1] : gitCommit()
    };
}

function main() {
    let entries;
    let pages;
    let rawBytes;
    let packedBytes;
    let gzCount;
    let rawCount;
    let skipped;
    let faviconUri;
    let commit;

    if (fs.existsSync(BUILD_DIR)) {
        const collected = collectFiles();
        skipped = collected.skipped;
        pages = readPages(collected.files);

        // 入口 HTML 以页面形式内联，不再重复放进资源表。
        const pageFiles = new Set(PAGES.map(page => page.file));
        const assetFiles = new Map([...collected.files].filter(([rel]) => !pageFiles.has(rel)));
        ({entries, rawBytes, packedBytes, gzCount, rawCount} = buildPayload(assetFiles));

        const faviconFile = path.join(BUILD_DIR, 'favicon.ico');
        faviconUri = fs.existsSync(faviconFile)
            ? `data:image/x-icon;base64,${fs.readFileSync(faviconFile).toString('base64')}`
            : '';
        commit = gitCommit();
    } else {
        const existing = loadExistingSingle();
        if (!existing) {
            console.error('[single-html] build/ 不存在，且无法从 RemixWarp-Single.html 复用资源；请先执行 npm run cf-build');
            process.exit(1);
        }
        ({entries, pages, rawBytes, packedBytes, gzCount, rawCount, skipped, faviconUri, commit} = existing);
        console.log('[single-html] build/ 不存在，复用 RemixWarp-Single.html 中的内联资源');
    }

    const tabs = PAGES.map(page => ({id: page.id, file: page.file, label: page.label}));

    const render = bare => {
        let html = SHELL_TEMPLATE
            .split('__FAVICON_URI__').join(faviconUri)
            .split('__ASSETS_JSON__').join(safeJson(entries))
            .split('__PAGES_JSON__').join(safeJson(pages))
            .split('__TABS_JSON__').join(JSON.stringify(tabs))
            .split('__BODY_CLASS__').join(bare ? 'rw-bare' : '')
            .split('__RW_BARE__').join(bare ? 'true' : 'false')
            .split('__ASSET_COUNT__').join(String(Object.keys(entries).length))
            .split('__RAW_BYTES__').join(String(rawBytes))
            .split('__MIME_JSON__').join(JSON.stringify(MIME))
            .split('__BUILD_COMMIT__').join(commit);
        if (bare) {
            // 裸编辑器版本：移除顶部外壳与标签栏，只保留全屏编辑器。
            html = html.replace(/<header id="rw-bar">[\s\S]*?<\/header>\s*/, '');
        }
        return html;
    };

    const shell = render(false);
    const bare = render(true);

    fs.writeFileSync(OUT_FILE, shell);
    fs.writeFileSync(BARE_OUT_FILE, bare);

    console.log('[single-html] 完成: ' + path.relative(ROOT, OUT_FILE));
    console.log('[single-html] 完成: ' + path.relative(ROOT, BARE_OUT_FILE));
    console.log(`[single-html] 资源 ${Object.keys(entries).length} 个（gzip ${gzCount} / 原始 ${rawCount}）`);
    console.log(`[single-html] 原始 ${(rawBytes / 1024 / 1024).toFixed(1)} MB -> 负载 ${(packedBytes / 1024 / 1024).toFixed(1)} MB`);
    console.log('[single-html] 忽略预压缩副本 ' + skipped + ' 个 (.gz/.br)');
    console.log(`[single-html] 输出大小 ${(fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1)} MB / 裸编辑器 ${(fs.statSync(BARE_OUT_FILE).size / 1024 / 1024).toFixed(1)} MB`);
}

main();

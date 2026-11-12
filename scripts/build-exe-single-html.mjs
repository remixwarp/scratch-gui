#!/usr/bin/env node
/**
 * 用官方 EXE 自带的渲染产物（dist-renderer-webpack/editor）生成一个纯编辑器单 HTML5。
 *
 * - 只保留编辑器本身：没有标题栏、标签页、加载圈、任何提示文字。
 * - 所有脚本/分块/worker/monaco/iframe 页面全部内联，运行时不产生本地网络请求。
 * - 静态图片/字体/音频在构建期改写为 data URI（JS 里本来就以 n.p+"static/assets/..." 引用）。
 *
 * 用法：node scripts/build-exe-single-html.mjs
 * 输入目录可用 RW_EDITOR_DIR 覆盖，默认 /tmp/rw-asar/dist-renderer-webpack/editor
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
    '.wasm': 'application/wasm',
    '.hex': 'text/plain;charset=utf-8'
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

// 这些是编辑器运行必需的文件；static 资源会被改写进 JS，因此不进 payload。
function shouldInclude(rel) {
    if (rel.startsWith('gui/')) {
        if (rel === 'gui/gui.html') return false;
        if (rel.startsWith('gui/static/assets/')) return false;
        return true;
    }
    if (rel.startsWith('addons/')) {
        if (rel.startsWith('addons/static/')) return false;
        return true;
    }
    if (rel.startsWith('monaco/')) return true;
    if (rel === 'monaco-editor-iframe.html') return true;
    return false;
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

// JS 里所有静态资源都是 `n.p+"static/assets/..."`，直接换成 data URI，
// 这样 <img>、CSS url()、fetch、new Audio 都不再依赖运行时路径。
function rewriteJsAssets(rel, source) {
    const root = rel.startsWith('addons/') ? 'addons/' : (rel.startsWith('gui/') ? 'gui/' : '');
    let count = 0;
    let missing = 0;
    const rewritten = source.replace(
        /([A-Za-z_$][\w$]*)\.p\s*\+\s*(["'])(static\/assets\/[^"']+)\2/g,
        (match, pub, quote, assetRel) => {
            const uri = dataUriOf(root + assetRel);
            if (!uri) {
                missing++;
                return match;
            }
            count++;
            return JSON.stringify(uri);
        }
    );
    stats.rewrittenAssets += count;
    stats.missingAssets += missing;
    if (rewritten !== source && rewritten.length < 4 * 1024 * 1024) {
        try {
            new Function(rewritten);
        } catch (error) {
            throw new Error(`[exe-html] ${rel} 资源内联后语法错误: ${error.message}`);
        }
    }
    return rewritten;
}

// CSS 文件里的 url() 相对路径同样改写成 data URI。
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

// iframe 页面里注入的引导脚本：附着到顶层 EMB，设置基准目录。
function iframeBootScript(base) {
    return `<script>(function(){window.__RW_BASE__=${JSON.stringify(base)};var EMB=null;try{EMB=window.parent.__RW_EMBED__||window.top.__RW_EMBED__}catch(e){}if(!EMB)return;(${RW_INSTALL.toString()})(EMB,window.__RW_BASE__);})();</script>`;
}

function prepareMonacoPage() {
    const abs = allFiles.get('monaco-editor-iframe.html');
    if (!abs) throw new Error('[exe-html] 缺少 monaco-editor-iframe.html');
    let html = fs.readFileSync(abs, 'utf8');
    html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
    html = html.replace(/var MONACO_LOCAL_BASE = 'monaco\/vs';/, "var MONACO_LOCAL_BASE = 'rwmonaco/vs';");
    const extra = `<script>window.MonacoEnvironment={getWorkerUrl:function(moduleId,label){return 'rwmonaco-worker/'+encodeURIComponent(label)+'.js';}};</script>` + iframeBootScript('');
    html = html.replace(/<head([^>]*)>/i, match => match + extra);
    return html;
}

function prepareAddonsPage() {
    const abs = allFiles.get('addons/addons.html');
    if (!abs) throw new Error('[exe-html] 缺少 addons/addons.html');
    let html = fs.readFileSync(abs, 'utf8');
    // srcdoc 内的 blob/data 资源会被 CSP 拦截，去掉该 meta。
    html = html.replace(/<meta[^>]+Content-Security-Policy[^>]*>\s*/i, '');
    html = html.replace(/<head([^>]*)>/i, match => match + iframeBootScript('addons/'));
    return html;
}

const MONACO_PAGE = prepareMonacoPage();
const ADDONS_PAGE = prepareAddonsPage();

// 顶层编辑器页面：彻底移除 splash（加载圈）与错误 alert。
function prepareTopPage() {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{height:100%;margin:0;overflow:hidden}#app{height:100%}</style>
</head>
<body>
<div id="app"></div>
<script type="application/json" id="rw-assets">__ASSETS__</script>
<script>__TOP_BOOT__</script>
</body>
</html>`;
}

function buildPayload() {
    const entries = Object.create(null);
    const included = [];
    let rawBytes = 0;
    let packedBytes = 0;

    for (const [rel, abs] of allFiles) {
        if (!shouldInclude(rel)) continue;
        if (/\.(map|gz|br)$/.test(rel)) continue;
        let data = fs.readFileSync(abs);
        if (rel.endsWith('.js')) {
            data = Buffer.from(rewriteJsAssets(rel, data.toString('utf8')), 'utf8');
        } else if (rel.endsWith('.css')) {
            data = Buffer.from(rewriteCssUrls(rel, data.toString('utf8')), 'utf8');
        } else if (rel === 'monaco-editor-iframe.html') {
            data = Buffer.from(MONACO_PAGE, 'utf8');
        } else if (rel === 'addons/addons.html') {
            data = Buffer.from(ADDONS_PAGE, 'utf8');
        }
        rawBytes += data.length;
        included.push(rel);

        if (data.length >= 1024) {
            const gz = zlib.gzipSync(data, {level: 9});
            if (gz.length < data.length) {
                entries[rel] = [1, gz.toString('base64')];
                packedBytes += gz.length;
                continue;
            }
        }
        entries[rel] = [0, data.toString('base64')];
        packedBytes += data.length;
    }
    return {entries, included, rawBytes, packedBytes};
}

// ---- 注入到每个文档里的运行时（顶层与 iframe 共用） ----
function RW_INSTALL(EMB, BASE) {
    'use strict';
    if (window.__RW_INSTALLED__) return;
    window.__RW_INSTALLED__ = true;
    window.__RW_BASE__ = BASE || '';

    var origAppend = Node.prototype.appendChild;
    var origInsertBefore = Node.prototype.insertBefore;

    function keyOf(raw) {
        return EMB.findKey(raw, window.__RW_BASE__);
    }

    function appendReal(parent, node) {
        return origAppend.call(parent, node);
    }

    function handleNode(node, parent) {
        if (!node || node.nodeType !== 1) return false;
        var tag = node.tagName;
        if (tag === 'SCRIPT') {
            var src = node.getAttribute('src');
            if (!src) return false;
            var key = keyOf(src);
            if (!key) return false;
            EMB.getBlobUrl(key).then(function (url) {
                node.setAttribute('src', url);
                appendReal(parent, node);
            }, function () {
                appendReal(parent, node);
            });
            return true;
        }
        if (tag === 'LINK') {
            var href = node.getAttribute('href');
            if (!href) return false;
            var rel = (node.getAttribute('rel') || '').toLowerCase();
            if (rel.indexOf('prefetch') !== -1 || rel.indexOf('preload') !== -1 ||
                rel.indexOf('modulepreload') !== -1) {
                return true;
            }
            var linkKey = keyOf(href);
            if (!linkKey) return false;
            EMB.getBlobUrl(linkKey).then(function (url) {
                node.setAttribute('href', url);
                appendReal(parent, node);
            }, function () {
                appendReal(parent, node);
            });
            return true;
        }
        if (tag === 'IFRAME') {
            var frameSrc = node.getAttribute('src');
            if (!frameSrc) return false;
            var page = EMB.pageFor(frameSrc);
            if (!page) return false;
            node.removeAttribute('src');
            node.setAttribute('srcdoc', page);
            appendReal(parent, node);
            return true;
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

    // SVG <image xlink:href>、普通 <img src> 等属性赋值：优先使用启动前就
    // 预解压好的 blob 地址，保证同步替换、不产生本地 404。
    function syncUrl(raw) {
        if (typeof raw !== 'string') return null;
        var key = keyOf(raw);
        return key ? EMB.getSyncBlob(key) : null;
    }

    var origSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
        var lower = String(name).toLowerCase();
        if (lower === 'src' || lower === 'href' || lower === 'xlink:href') {
            var mapped = syncUrl(value);
            if (mapped) return origSetAttribute.call(this, name, mapped);
        }
        return origSetAttribute.call(this, name, value);
    };

    var origSetAttributeNS = Element.prototype.setAttributeNS;
    Element.prototype.setAttributeNS = function (ns, name, value) {
        var lower = String(name).toLowerCase();
        if (lower === 'href' || lower === 'xlink:href') {
            var mapped = syncUrl(value);
            if (mapped) return origSetAttributeNS.call(this, ns, name, mapped);
        }
        return origSetAttributeNS.call(this, ns, name, value);
    };

    try {
        var imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        if (imgDesc && imgDesc.set) {
            Object.defineProperty(HTMLImageElement.prototype, 'src', {
                configurable: true,
                enumerable: imgDesc.enumerable,
                get: function () { return imgDesc.get.call(this); },
                set: function (value) {
                    var sync = syncUrl(value);
                    if (sync) {
                        imgDesc.set.call(this, sync);
                        return;
                    }
                    var key = typeof value === 'string' ? keyOf(value) : null;
                    if (key) {
                        var self = this;
                        EMB.getBlobUrl(key).then(function (url) {
                            imgDesc.set.call(self, url);
                        }, function () {
                            imgDesc.set.call(self, value);
                        });
                    } else {
                        imgDesc.set.call(this, value);
                    }
                }
            });
        }
    } catch (e) { /* ignore */ }

    try {
        var frameDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
        if (frameDesc && frameDesc.set) {
            Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
                configurable: true,
                enumerable: frameDesc.enumerable,
                get: function () { return frameDesc.get.call(this); },
                set: function (value) {
                    var page = typeof value === 'string' ? EMB.pageFor(value) : null;
                    if (page) {
                        this.removeAttribute('src');
                        this.setAttribute('srcdoc', page);
                    } else {
                        frameDesc.set.call(this, value);
                    }
                }
            });
        }
    } catch (e) { /* ignore */ }

    if (window.fetch) {
        var origFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
            try {
                var raw = typeof input === 'string' ? input : (input && input.url);
                if (raw && /\/api\/warptheme\//.test(raw)) {
                    return Promise.resolve(new Response('{"themes":[]}', {
                        status: 200,
                        headers: {'Content-Type': 'application/json'}
                    }));
                }
                var key = raw ? keyOf(raw) : null;
                if (key) {
                    return EMB.getBlobUrl(key).then(function (url) {
                        if (typeof input === 'string') return origFetch(url, init);
                        return origFetch(new Request(url, input), init);
                    });
                }
            } catch (e) { /* ignore */ }
            return origFetch(input, init);
        };
    }

    // Web Worker：排队代理，等待资源解压后再创建真实 Worker。
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

                var attachDummy = function () {
                    try {
                        var dummy = new RealWorker(URL.createObjectURL(new Blob(['self.onmessage=function(){}'], {type: 'text/javascript'})));
                        attach(dummy);
                    } catch (e) { /* ignore */ }
                };

                var urlText = String(url);
                if (urlText.indexOf('rwmonaco-worker/') === 0) {
                    EMB.monacoWorkerSource(urlText).then(function (source) {
                        if (self.__terminated) return;
                        try {
                            attach(new RealWorker(URL.createObjectURL(new Blob([source], {type: 'text/javascript'})), options));
                        } catch (e) {
                            attachDummy();
                        }
                    }, attachDummy);
                    return;
                }

                var key = keyOf(urlText);
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

    try {
        var XHR = window.XMLHttpRequest;
        var origOpen = XHR.prototype.open;
        var origSend = XHR.prototype.send;
        XHR.prototype.open = function (method, url) {
            var key = keyOf(url);
            if (key) {
                this.__rwPending = Array.prototype.slice.call(arguments);
                return;
            }
            this.__rwPending = null;
            return origOpen.apply(this, arguments);
        };
        XHR.prototype.send = function (body) {
            var self = this;
            if (this.__rwPending) {
                var args = this.__rwPending;
                this.__rwPending = null;
                EMB.getBlobUrl(keyOf(args[1])).then(function (url) {
                    args[1] = url;
                    origOpen.apply(self, args);
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

    // 编辑器依赖的桌面预加载 API：浏览器里给出无副作用的替身。
    if (!window.EditorPreload) {
        var resolved = function (value) { return Promise.resolve(value); };
        window.EditorPreload = {
            isInitiallyFullscreen: function () { return false; },
            getInitialFile: function () { return resolved(null); },
            getAdvancedCustomizations: function () { return resolved({}); },
            getDesktopSettings: function () { return {updateCheckerAllowed: false}; },
            getAboutInfo: function () { return {version: '', commit: ''}; },
            getPreferredMediaDevices: function () { return resolved([]); },
            getFile: function () { return resolved(null); },
            showOpenFilePicker: function () { return resolved(null); },
            showSaveFilePicker: function () { return resolved(null); },
            setLocale: function (locale) {
                return {
                    locale: locale || 'en',
                    strings: {'prompt.ok': 'OK', 'prompt.cancel': 'Cancel'}
                };
            },
            setChanged: function () {},
            setIsFullScreen: function () {},
            setExportForPackager: function () {},
            exportAddonSettings: function () { return resolved(); },
            openedFile: function () {},
            closedFile: function () {},
            openNewWindow: function () {},
            openPackager: function () {}
        };
    }
}

function buildTopBoot() {
    const parts = [];
    parts.push(`(function(){
  'use strict';
  var ASSETS = JSON.parse(document.getElementById('rw-assets').textContent);
  var MIME = ${JSON.stringify(MIME)};
  var cache = new Map();
  var textCache = new Map();
  function mimeOf(file){var i=file.lastIndexOf('.');return i===-1?'application/octet-stream':(MIME[file.slice(i).toLowerCase()]||'application/octet-stream');}
  function bytesOf(b64){var bin=atob(b64),n=bin.length,out=new Uint8Array(n);for(var i=0;i<n;i++)out[i]=bin.charCodeAt(i);return out;}
  function decompress(entry){
    if(entry[0]===0) return Promise.resolve(bytesOf(entry[1]));
    if(typeof DecompressionStream==='undefined') return Promise.reject(new Error('DecompressionStream unsupported'));
    var stream=new Blob([bytesOf(entry[1])]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer().then(function(buf){return new Uint8Array(buf);});
  }
  function blobUrlOf(key){
    if(cache.has(key)) return cache.get(key);
    var task=Promise.resolve().then(function(){
      return decompress(ASSETS[key]);
    }).then(function(bytes){
      return URL.createObjectURL(new Blob([bytes],{type:mimeOf(key)}));
    });
    cache.set(key,task);
    return task;
  }
  function textOf(key){
    if(textCache.has(key)) return textCache.get(key);
    var task=blobUrlOf(key).then(function(url){return fetch(url).then(function(r){return r.text();});});
    textCache.set(key,task);
    return task;
  }
  function normalize(raw){
    var s=String(raw).trim();
    if(!s) return null;
    if(/^(data:|blob:|javascript:|about:|mailto:|tel:)/i.test(s)) return null;
    if(s.indexOf('rwmonaco/')===0) return 'monaco/'+s.slice('rwmonaco/'.length);
    if(s.indexOf('rwmonaco-worker/')===0) return null;
    if(/^tw-editor:/i.test(s)){
      var tm=/^tw-editor:\\/\\/\\.?\\/?(.*)$/i.exec(s);
      if(!tm) return null;
      s=tm[1];
    } else if(/^file:/i.test(s)||/^(https?:)?\\/\\//i.test(s)){
      try{
        var u=new URL(s,location.href);
        if(u.protocol!=='file:'&&u.origin!==location.origin) return null;
        s=u.pathname;
      }catch(e){return null;}
    }
    s=s.split('#')[0].split('?')[0].replace(/\\\\/g,'/');
    try{s=decodeURIComponent(s);}catch(e){}
    s=s.replace(/^\\.?\\//,'').replace(/^\\/+/,'');
    return s||null;
  }
  function has(key){return Object.prototype.hasOwnProperty.call(ASSETS,key);}
  function findKey(raw,base){
    var key=normalize(raw);
    if(!key) return null;
    var list=[];
    if(base) list.push(base+key);
    list.push(key,'gui/'+key,'addons/'+key);
    if(key.indexOf('vs/')===0) list.push('monaco/'+key);
    for(var i=0;i<list.length;i++){if(has(list[i])) return list[i];}
    return null;
  }
`);

    const inline = value => JSON.stringify(value).replace(/</g, '\\u003c');
    parts.push(`  var PAGES = {
    monaco: ${inline(MONACO_PAGE)},
    addons: ${inline(ADDONS_PAGE)}
  };
  var workerCache = new Map();
  var syncBlobs = Object.create(null);
  function preload(prefix){
    var keys=Object.keys(ASSETS).filter(function(k){return k.indexOf(prefix)===0;});
    return Promise.all(keys.map(function(key){
      return blobUrlOf(key).then(function(url){syncBlobs[key]=url;},function(){});
    }));
  }
  function getSyncBlob(key){
    return syncBlobs[key]||null;
  }
  function monacoWorkerSource(url){
    if(workerCache.has(url)) return workerCache.get(url);
    var label=decodeURIComponent(url.slice('rwmonaco-worker/'.length).replace(/\\.js$/,''));
    var map={typescript:'language/typescript/tsWorker.js',javascript:'language/typescript/tsWorker.js',json:'language/json/jsonWorker.js',css:'language/css/cssWorker.js',scss:'language/css/cssWorker.js',less:'language/css/cssWorker.js',html:'language/html/htmlWorker.js',handlebars:'language/html/htmlWorker.js',razor:'language/html/htmlWorker.js'};
    var mod=map[label];
    var task=textOf('monaco/vs/base/worker/workerMain.js').then(function(main){
      if(!mod) return main;
      return textOf('monaco/vs/'+mod).then(function(extra){return main+'\\n;'+extra;});
    });
    workerCache.set(url,task);
    return task;
  }
  var EMB={
    findKey:findKey,
    getBlobUrl:blobUrlOf,
    getSyncBlob:getSyncBlob,
    preload:preload,
    getText:textOf,
    monacoWorkerSource:monacoWorkerSource,
    pageFor:function(src){
      var s=String(src);
      if(/monaco-editor-iframe/i.test(s)) return PAGES.monaco;
      if(/^tw-editor:\\/\\//i.test(s)) return (s.indexOf('addons/')!==-1)?PAGES.addons:null;
      return null;
    }
  };
  window.__RW_EMBED__=EMB;
  (${RW_INSTALL.toString()})(EMB,'gui/');
  function start(){
    var entry=document.createElement('script');
    entry.src='index.js';
    document.body.appendChild(entry);
  }
  preload('gui/static/blocks-media/').then(start,start);
})();`);

    return parts.join('');
}

function main() {
    if (!fs.existsSync(EDITOR_DIR)) {
        console.error(`[exe-html] 找不到渲染产物目录：${EDITOR_DIR}`);
        process.exit(1);
    }
    const payload = buildPayload();
    if (!payload.entries['gui/index.js']) {
        console.error('[exe-html] payload 缺少 gui/index.js');
        process.exit(1);
    }
    const assetsJson = JSON.stringify(payload.entries).replace(/</g, '\\u003c');
    const boot = buildTopBoot();
    const html = prepareTopPage()
        .replace('__ASSETS__', () => assetsJson)
        .replace('__TOP_BOOT__', () => boot);
    fs.writeFileSync(OUT_FILE, html);

    console.log('[exe-html] 输出:', OUT_FILE);
    console.log('[exe-html] 文件数:', payload.included.length, '| 原始:', (payload.rawBytes / 1048576).toFixed(2), 'MB', '| gzip:', (payload.packedBytes / 1048576).toFixed(2), 'MB');
    console.log('[exe-html] 最终 HTML:', (Buffer.byteLength(html) / 1048576).toFixed(2), 'MB', '| 内联静态资源:', stats.rewrittenAssets, '| 缺失:', stats.missingAssets);
}

main();

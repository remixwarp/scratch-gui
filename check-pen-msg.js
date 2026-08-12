const path = 'E:/RemixWarp/scratch-gui/node_modules/@remixwarp/scratch-l10n/locales/editor-msgs.js';
const fs = require('fs');
const babel = require('@babel/core');
const src = fs.readFileSync(path, 'utf8');
const out = babel.transformSync(src, {
    presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
    compact: false,
    code: true
}).code;
const Module = require('module');
const m = new Module(path);
m.filename = path;
m.paths = module.paths;
m._compile(out, path);
const msgs = m.exports.default || m.exports;
const zh = msgs['zh-cn'];
console.log('locales:', Object.keys(msgs).slice(0, 10));
if (zh) {
    console.log('typeof pen:', typeof zh.pen);
    console.log('typeof pen.categoryName:', typeof zh['pen.categoryName']);
}

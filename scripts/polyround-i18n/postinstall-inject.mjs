// CF Pages fresh install 时 node_modules 会被完整重装，scratch-paint /
// scratch-l10n 会回到上游原始版本（没有 polyRound 的 defineMessages 和
// 翻译 key）。这个 postinstall 钩子把仓库里存好的文件拷回去。
// 这是 scratch-gui 自维护的补丁，不依赖任何额外包管理器特性。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// import.meta.dirname 是 Node 20.11+ 才引入的；CF Pages 目前是 Node 18，
// 所以用通用的 fileURLToPath(import.meta.url) 推算。
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');

const copies = [
    {
        from: 'scripts/polyround-i18n/scratch-paint/containers/poly-round-mode.jsx',
        to:   'node_modules/scratch-paint/src/containers/poly-round-mode.jsx'
    },
    {
        from: 'scripts/polyround-i18n/scratch-l10n/editor/paint-editor/en.json',
        to:   'node_modules/@remixwarp/scratch-l10n/editor/paint-editor/en.json'
    },
    {
        from: 'scripts/polyround-i18n/scratch-l10n/editor/paint-editor/zh-cn.json',
        to:   'node_modules/@remixwarp/scratch-l10n/editor/paint-editor/zh-cn.json'
    },
    {
        from: 'scripts/polyround-i18n/scratch-l10n/editor/paint-editor/geng.json',
        to:   'node_modules/@remixwarp/scratch-l10n/editor/paint-editor/geng.json'
    },
    {
        from: 'scripts/polyround-i18n/scratch-l10n/editor/paint-editor/gdzx.json',
        to:   'node_modules/@remixwarp/scratch-l10n/editor/paint-editor/gdzx.json'
    },
    {
        from: 'scripts/polyround-i18n/scratch-l10n/editor/paint-editor/wenyan.json',
        to:   'node_modules/@remixwarp/scratch-l10n/editor/paint-editor/wenyan.json'
    },
    {
        from: 'scripts/polyround-i18n/scratch-l10n/editor/paint-editor/wyw.json',
        to:   'node_modules/@remixwarp/scratch-l10n/editor/paint-editor/wyw.json'
    },
];

let ok = 0;
let skip = 0;
let fail = 0;
for (const {from, to} of copies) {
    const absFrom = path.join(root, from);
    const absTo   = path.join(root, to);
    if (!fs.existsSync(absFrom)) {
        console.warn(`[polyround-i18n] skip (source missing): ${from}`);
        skip++;
        continue;
    }
    try {
        fs.mkdirSync(path.dirname(absTo), {recursive: true});
        fs.copyFileSync(absFrom, absTo);
        console.log(`[polyround-i18n] injected ${path.relative(root, from)} -> ${path.relative(root, to)}`);
        ok++;
    } catch (e) {
        console.error(`[polyround-i18n] FAIL ${to}: ${e.message}`);
        fail++;
    }
}
console.log(`[polyround-i18n] done: ok=${ok} skip=${skip} fail=${fail}`);
if (fail > 0) process.exit(1);

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
    // scratch-translate-extension-languages 包的 upstream tarball 在某些
    // 安装路径（bun / 新版 npm）下 languages.json 会被写成空文件，
    // 导致 scratch3_text2speech 扩展一加载就把整个 GUI 炸掉（线上表现为
    // splash 页 "TypeError: e is not a function"）。这里在 postinstall
    // 里用仓库内保存的正确版本覆盖回去，保证 CF Pages / 本地构建一致。
    {
        from: 'scripts/scratch-translate-extension-languages.json',
        to:   'node_modules/scratch-translate-extension-languages/languages.json'
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

// ---- 第二步：合成 paint-editor-msgs.js ----
// remixwarp/scratch-l10n v5aea3b58 里 paint-editor-msgs.js 是 upstream build 产物，
// 不包含我们 inject json 里新增的 polyRound 翻译 key（mode-tools 上方文字 + 自由窗口）。
// 但 GUI 真正 import 的是 `locales/paint-editor-msgs.js`（不是 editor/paint-editor/*.json），
// react-intl 从 Redux state.locales.messages 读 messages，messages 由
//   for (const locale of Object.keys(paintEditorMessages))
//       Object.assign(editorMessages[locale], paintEditorMessages[locale])
// 合成。所以 paint-editor-msgs.js 缺的 key → react-intl 永远 fallback 到
// defineMessages.defaultMessage（英文），切 zh-cn 也还是英文。
//
// 解决：postinstall 里把 inject json 里的 polyRound 等新增 key 按 locale merge 进
// node_modules/@remixwarp/scratch-l10n/locales/paint-editor-msgs.js。

const PAINT_EDITOR_MSGS_ABS = path.join(root,
    'node_modules/@remixwarp/scratch-l10n/locales/paint-editor-msgs.js');
const PAINT_JSON_DIR_ABS = path.join(root,
    'node_modules/@remixwarp/scratch-l10n/editor/paint-editor');
const polyRoundLocales = ['en', 'zh-cn', 'geng', 'gdzx', 'wenyan', 'wyw'];

try {
    if (!fs.existsSync(PAINT_EDITOR_MSGS_ABS)) {
        console.warn('[polyround-i18n] paint-editor-msgs.js 不存在，跳过 merge');
    } else {
        // 1. 读原始 paint-editor-msgs.js，提取 { "en": {...}, "zh-cn": {...} }
        const rawMsgs = fs.readFileSync(PAINT_EDITOR_MSGS_ABS, 'utf8');
        const msgsMatch = rawMsgs.match(/export\s+default\s+([\s\S]*)/);
        if (!msgsMatch) {
            console.warn('[polyround-i18n] paint-editor-msgs.js 格式异常，跳过 merge');
        } else {
            const msgsObj = eval('(' + msgsMatch[1].trim() + ')');
            let added = 0;
            // 2. 遍历 inject json（已在第一步 copyFileSync 到 node_modules 里）
            for (const loc of polyRoundLocales) {
                const jsonPath = path.join(PAINT_JSON_DIR_ABS, `${loc}.json`);
                if (!fs.existsSync(jsonPath)) continue;
                const extra = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                if (!msgsObj[loc]) msgsObj[loc] = {};
                for (const [k, v] of Object.entries(extra)) {
                    if (!(k in msgsObj[loc])) {
                        msgsObj[loc][k] = v;
                        added++;
                    }
                }
            }
            if (added > 0) {
                // 3. 写回 paint-editor-msgs.js（用 ESM export default + 2-space indent）
                const serialized = JSON.stringify(msgsObj, null, 2);
                const newContent = `// GENERATED FILE (patched by polyround-i18n postinstall)\nexport default ${serialized};\n`;
                fs.writeFileSync(PAINT_EDITOR_MSGS_ABS, newContent);
                console.log(`[polyround-i18n] merged ${added} polyRound keys into paint-editor-msgs.js`);
            } else {
                console.log('[polyround-i18n] paint-editor-msgs.js 已包含所有新增 key，跳过');
            }
        }
    }
} catch (e) {
    console.error(`[polyround-i18n] paint-editor-msgs merge FAIL: ${e.message}`);
    fail++;
}

console.log(`[polyround-i18n] done: ok=${ok} skip=${skip} fail=${fail}`);
if (fail > 0) process.exit(1);

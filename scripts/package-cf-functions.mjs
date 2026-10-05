/**
 * Cloudflare Pages Functions 打包脚本。
 * 把项目根的 functions/ 目录复制到 build/functions/，并生成 build/_routes.json
 * 让 CF Pages 部署时自动带上同源代理（/__rwck-proxy/* / /api/*）。
 *
 * 用法：在 webpack build 完成后跑一次
 *   node scripts/package-cf-functions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BUILD = path.join(ROOT, 'build');

const routes = {
    version: 1,
    include: ['/__rwck-proxy/*', '/api/*']
};

function cpDir(src, dst) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dst, {recursive: true});
    for (const ent of fs.readdirSync(src, {withFileTypes: true})) {
        const s = path.join(src, ent.name);
        const d = path.join(dst, ent.name);
        if (ent.isDirectory()) cpDir(s, d);
        else fs.copyFileSync(s, d);
    }
}

if (!fs.existsSync(BUILD)) {
    console.warn('[package-cf-functions] build/ 不存在，先跑 webpack build');
    process.exit(0);
}

const funcSrc = path.join(ROOT, 'functions');
const funcDst = path.join(BUILD, 'functions');
if (fs.existsSync(funcDst)) fs.rmSync(funcDst, {recursive: true, force: true});
cpDir(funcSrc, funcDst);

fs.writeFileSync(path.join(BUILD, '_routes.json'), JSON.stringify(routes, null, 2));
fs.writeFileSync(path.join(ROOT, '_routes.json'), JSON.stringify(routes, null, 2));

console.log('[package-cf-functions] ✔ build/functions/ 已生成:');
if (fs.existsSync(funcDst)) {
    for (const f of fs.readdirSync(funcDst, {recursive: true})) {
        if (fs.statSync(path.join(funcDst, f)).isFile()) console.log('   - functions/' + f);
    }
}
console.log('[package-cf-functions] ✔ build/_routes.json 已生成');

/**
 * Cloudflare Pages Functions 冲突清理脚本。
 *
 * CF Pages 对 Functions 的识别逻辑：
 *   - 项目根的 functions/        → 被当作 Pages Function 源码上传
 *   - build output 里的 functions/ → 同样被识别为 Pages Function，会跟项目根的重复！
 *   - 项目根的 _routes.json       → 被当作 Pages Function 路由表
 *   - build output 里的 _routes.json → 也会被识别，跟项目根的冲突！
 *
 * 所以本脚本**不是复制**，而是：
 *   1) 删除 build/functions/
 *   2) 删除 build/_routes.json
 *   3) 确保项目根 _routes.json 存在
 *   4) 确保项目根 functions/ 存在
 *
 * CF Pages 自己会把项目根的 functions/ 和 _routes.json 跟 build output 一起部署。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BUILD = path.join(ROOT, 'build');

const routes = {
    version: 1,
    include: ['/__rwck-proxy/*', '/api/*']
};

if (!fs.existsSync(BUILD)) {
    console.warn('[cf-functions-prep] build/ 不存在，先跑 webpack build');
    process.exit(0);
}

// 1) 删除 build/functions/（CF Pages 会把项目根的 functions/ 单独处理）
const buildFunc = path.join(BUILD, 'functions');
if (fs.existsSync(buildFunc)) {
    fs.rmSync(buildFunc, {recursive: true, force: true});
    console.log('[cf-functions-prep] ✘ 已删除 build/functions/（避免和项目根 functions/ 冲突）');
}

// 2) 删除 build/_routes.json（同样要避免跟项目根重复）
const buildRoutes = path.join(BUILD, '_routes.json');
if (fs.existsSync(buildRoutes)) {
    fs.rmSync(buildRoutes, {force: true});
    console.log('[cf-functions-prep] ✘ 已删除 build/_routes.json（避免和项目根 _routes.json 冲突）');
}

// 3) 确保项目根 functions/ 存在
const rootFunc = path.join(ROOT, 'functions');
if (!fs.existsSync(rootFunc)) {
    console.error('[cf-functions-prep] ✘ 项目根 functions/ 不存在！');
    process.exit(1);
}

// 4) 确保项目根 _routes.json 存在且内容正确
const rootRoutes = path.join(ROOT, '_routes.json');
fs.writeFileSync(rootRoutes, JSON.stringify(routes, null, 2));

console.log('[cf-functions-prep] ✔ 项目根 functions/:');
function walk(dir) {
    for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else console.log('   - ' + path.relative(ROOT, p));
    }
}
walk(rootFunc);
console.log('[cf-functions-prep] ✔ 项目根 _routes.json:');
console.log(fs.readFileSync(rootRoutes, 'utf8'));

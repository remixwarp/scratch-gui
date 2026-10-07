/**
 * Cloudflare Pages Functions 准备脚本。
 *
 * CF Pages 规则：项目根的 functions/ 目录会被自动识别。
 * 这里什么都不用做——我们不生成 _routes.json，纯靠文件路由匹配。
 *   functions/api/project-proxy.js   →  /api/project-proxy
 *
 * 保留这个脚本只是为了在 build 脚本里有个稳定的钩子点，
 * 方便以后加逻辑（比如注入版本号、压缩 Worker 等）。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FUNC_DIR = path.join(ROOT, 'functions');

if (fs.existsSync(FUNC_DIR)) {
    const list = [];
    function walk(d) {
        for (const ent of fs.readdirSync(d, {withFileTypes: true})) {
            const p = path.join(d, ent.name);
            if (ent.isDirectory()) walk(p);
            else list.push(path.relative(ROOT, p));
        }
    }
    walk(FUNC_DIR);
    console.log('[cf-functions-prep] 项目根 functions/ 就绪:');
    for (const f of list) console.log('   - ' + f);
    console.log('[cf-functions-prep] 未使用 _routes.json，纯靠文件路由自动匹配。');
} else {
    console.warn('[cf-functions-prep] 项目根 functions/ 不存在');
}

import fs from 'fs';
import path from 'path';
import vm from 'node:vm';
import JSZip from '@turbowarp/jszip';
import {loadRJProject} from './deserialize.js';

const html = fs.readFileSync(path.resolve('..', 'static', 'convert.html'), 'utf8');
const anchor = 'window.convertToRJ = convertToRJ;';
const ai = html.indexOf(anchor);
const start = html.lastIndexOf('<script>', ai) + '<script>'.length;
const end = html.indexOf('</script>', ai);
const sandbox = {window: {JSZip}, JSZip, console};
vm.createContext(sandbox);
vm.runInContext(html.slice(start, end), sandbox);
const convertToRJ = sandbox.window.convertToRJ;

const fixture = path.resolve('..', process.argv[2] || 'src/addons/addons/santa/christmas-default-project.sb3');
const sb3 = await JSZip.loadAsync(fs.readFileSync(fixture));
const projectJson = JSON.parse(await sb3.file('project.json').async('string'));
const projectFiles = {};
for (const n of Object.keys(sb3.files)) {
    if (sb3.files[n].dir) continue;
    projectFiles[n] = await sb3.files[n].async('uint8array');
}

const res = await convertToRJ({projectJson, projectFiles, title: 'X', onStep: () => {}});
console.log('convert.html 输出:', res.filename, res.content.length, 'bytes');

const rjZip = await JSZip.loadAsync(res.content);
console.log('条目:', Object.keys(rjZip.files).join(', '));

const stages = [];
const out = await loadRJProject(res.content, {onProgress: p => stages.push(`${p.stage}=${p.percent ?? '-'}`)});
console.log('阶段:', stages.join(' '));

// 模拟 scratch-vm 的资源查找：每个造型/声音都要能从 zipView 拿到字节
let ok = 0;
let miss = 0;
const check = async (list, kind) => {
    for (const item of list) {
        const md5ext = item.md5ext || `${item.assetId}.${(item.dataFormat || '').toLowerCase()}`;
        let e = out.zipView.file(md5ext);
        if (!e) {
            const m = out.zipView.file(new RegExp(`^([^/]*/)?${md5ext}$`));
            e = m.length ? m[0] : null;
        }
        const orig = projectFiles[md5ext];
        if (!e || !orig) {
            miss++;
            console.log(`  ✗ ${kind} ${md5ext} (zipView=${!!e} 原始=${!!orig})`);
            continue;
        }
        const data = await e.async('uint8array');
        if (Buffer.compare(Buffer.from(data), Buffer.from(orig)) !== 0) {
            miss++;
            console.log(`  ✗ ${kind} ${md5ext} 字节不一致`);
            continue;
        }
        ok++;
    }
};
for (const t of out.projectJSON.targets) {
    await check(t.costumes || [], 'costume');
    await check(t.sounds || [], 'sound');
}
for (const f of out.projectJSON.customFonts || []) {
    await check([f], 'font');
}
console.log(`资源: 命中 ${ok} · 失败 ${miss}`);
console.log('targets:', out.projectJSON.targets.length, 'projectVersion:', out.projectJSON.projectVersion);
console.log('monitors:', (out.projectJSON.monitors || []).length);
console.log(miss === 0 ? 'RESULT: OK' : 'RESULT: FAIL');

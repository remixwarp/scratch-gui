import fs from 'fs';
import path from 'path';
import vm from 'node:vm';
import JSZip from '@turbowarp/jszip';
import {loadRJProject} from './deserialize.js';
import {createRJProgressReporter} from './progress.js';

const html = fs.readFileSync(path.resolve('..', 'static', 'convert.html'), 'utf8');
const ai = html.indexOf('window.convertToRJ = convertToRJ;');
const start = html.lastIndexOf('<script>', ai) + '<script>'.length;
const end = html.indexOf('</script>', ai);
const sandbox = {window: {JSZip}, JSZip, console};
vm.createContext(sandbox);
vm.runInContext(html.slice(start, end), sandbox);
const convertToRJ = sandbox.window.convertToRJ;

const fixture = path.resolve('..', 'src/addons/addons/santa/christmas-default-project.sb3');
const sb3 = await JSZip.loadAsync(fs.readFileSync(fixture));
const projectJson = JSON.parse(await sb3.file('project.json').async('string'));
const projectFiles = {};
for (const n of Object.keys(sb3.files)) {
    if (sb3.files[n].dir) continue;
    projectFiles[n] = await sb3.files[n].async('uint8array');
}

// 模拟 convert.html 选中 RemixWarp (.rj) —— meta 应被保留（不被改写成 'RemixWarp'）
const rj = await convertToRJ({projectJson, projectFiles, title: 'T', onStep: () => {}});
const out = await loadRJProject(rj.content, {onProgress: () => {}});
console.log('meta 原样:', JSON.stringify(out.projectJSON.meta));

// 模拟一个 meta.platform.name = 'RemixWarp'（大小写不同）的作品，检查归一化
const tainted = JSON.parse(JSON.stringify(out.projectJSON));
tainted.meta.platform = {name: 'RemixWarp', url: 'https://github.com/RemixWarp'};
const fakeVM = {runtime: {platform: {name: 'remixwarp', url: 'https://remixwarp.pages.dev/'}}};
const {loadRJIntoVM} = await import('./deserialize.js');

// 直接复用内部逻辑：把 fakeVM 传进去，fast path 会因为 vm.deserializeProject 不存在而走 fallback，
// 这里只验证归一化函数是否被正确调用（用 vm.loadProject 拦截）
let captured = null;
fakeVM.loadProject = async buf => {
    const z = await JSZip.loadAsync(buf);
    captured = JSON.parse(await z.file('project.json').async('string'));
};
const tmpZip = new JSZip();
tmpZip.file('manifest.json', JSON.stringify({
    magic: 'RemixWarp-RJ-Project', format: 'rj', formatVersion: 1,
    targetCount: 0, monitors: [], project: {meta: tainted.meta}, files: {targets: [], blocks: [], assets: []}
}));
tmpZip.file('tables/targets.json', JSON.stringify({count: 0, items: []}));
tmpZip.file('tables/costumes.json', JSON.stringify({count: 0, items: []}));
const buf = await tmpZip.generateAsync({type: 'uint8array'});
await loadRJIntoVM(fakeVM, buf, {});
console.log('归一化后 platform:', JSON.stringify(captured && captured.meta && captured.meta.platform));
console.log(`platform.name === runtime.platform.name:`,
    captured && captured.meta.platform.name === 'remixwarp' ? 'true（不会触发未知平台弹窗）' : 'FALSE');

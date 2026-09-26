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
const res = await convertToRJ({projectJson, projectFiles, title: 'X', onStep: () => {}});

const seen = [];
const report = p => seen.push({phase: p.phase, percent: p.percent, detail: p.detail});
const reporter = createRJProgressReporter('zh-cn', report);
await loadRJProject(res.content, {onProgress: reporter});
reporter({stage: 'writingToEditor'});

// 模拟红色ux → Loader：检查百分比单调、文案非空
let last = 0;
let bad = 0;
for (const s of seen) {
    if (typeof s.percent !== 'number') {
        console.log('  ✗ 缺少 percent:', s.phase);
        bad++;
        continue;
    }
    if (!s.detail) {
        console.log('  ✗ 缺少文案:', s.phase);
        bad++;
    }
    if (s.percent < last) {
        console.log(`  ✗ 进度回退: ${s.phase} ${last} → ${s.percent}`);
        bad++;
    }
    last = s.percent;
    console.log(`  ${String(s.percent).padStart(3)}%  ${s.detail}`);
}
// readFile 阶段（上传器在 onload 里上报，2%）
console.log(`\nreadFile(2%) → manifest(${seen[0] ? seen[0].percent : '?'}) 单调:`, 2 <= (seen[0] ? seen[0].percent : 0));
console.log(bad === 0 ? 'RESULT: OK' : 'RESULT: FAIL');

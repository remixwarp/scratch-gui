// 合并 geng-data 分批文件并写入 generated-translations.json
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'geng-data');
const genPath = path.join(__dirname, '..', 'src', 'lib', 'tw-translations', 'generated-translations.json');
const gen = JSON.parse(fs.readFileSync(genPath, 'utf8'));
const geng = {};
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js')).sort()) {
    const mod = require(path.join(dir, f));
    Object.assign(geng, mod);
    console.log(f, Object.keys(mod).length);
}
const wenyanKeys = Object.keys(gen.wenyan);
const missing = wenyanKeys.filter(k => !(k in geng));
const extra = Object.keys(geng).filter(k => !(k in gen.wenyan));
console.log('geng total:', Object.keys(geng).length);
console.log('wenyan total:', wenyanKeys.length);
console.log('missing:', missing.length);
console.log('extra (not in wenyan):', extra.length);
if (missing.length > 0) {
    console.log('FIRST 20 MISSING:', missing.slice(0, 20).join('\n'));
    process.exit(1);
}
gen.geng = {};
for (const k of wenyanKeys) gen.geng[k] = geng[k];
fs.writeFileSync(genPath, JSON.stringify(gen, null, 2));
console.log('DONE: geng segment updated to', Object.keys(gen.geng).length, 'keys');

const fs = require('fs');
const p = 'src/community/translations/zh-cn.json';
console.log('exists:', fs.existsSync(p));
if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    console.log('size:', buf.length);
    console.log('first bytes:', Array.from(buf.slice(0, 8)).map(b => b.toString(16)).join(' '));
    try {
        JSON.parse(buf.toString('utf8'));
        console.log('valid JSON (utf8)');
    } catch (e) {
        console.log('INVALID utf8 JSON:', e.message);
    }
}

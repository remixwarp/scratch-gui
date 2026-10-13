const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const fs = require('fs');
const crypto = require('crypto');

const PATH = '/workspace/src/lib/rwck/rwck-publish-panel.jsx';
let src = fs.readFileSync(PATH, 'utf8');
const HAN_MIN2 = /[\u4e00-\u9fff]{2,}/;
const uiSet = new Set();
const seenId = new Map();
function makeId(zh) {
  return 'rwck.ui.' + crypto.createHash('md5').update(zh).digest('hex').slice(0, 8);
}
function FMNode(id, defMsg) {
  const opening = t.jsxOpeningElement(
    t.jsxIdentifier('FormattedMessage'),
    [t.jsxAttribute(t.jsxIdentifier('id'), t.stringLiteral(id)),
     t.jsxAttribute(t.jsxIdentifier('defaultMessage'), t.stringLiteral(defMsg))],
    true);
  return t.jsxElement(opening, null, [], true, []);
}

const ast = parser.parse(src, {
  sourceType:'module',
  plugins:['jsx','classProperties','optionalChaining','objectRestSpread',
           'asyncGenerators','dynamicImport','topLevelAwait','exportDefaultFrom'],
});

// 1.1 react-intl import
let ex = ast.program.body.find(n => t.isImportDeclaration(n) && n.source.value === 'react-intl');
if (!ex) {
  ast.program.body.unshift(t.importDeclaration([
    t.importSpecifier(t.identifier('FormattedMessage'), t.identifier('FormattedMessage')),
    t.importSpecifier(t.identifier('injectIntl'), t.identifier('injectIntl')),
  ], t.stringLiteral('react-intl')));
} else {
  const names = new Set(ex.specifiers.map(s => s.local.name));
  if (!names.has('FormattedMessage')) ex.specifiers.push(t.importSpecifier(t.identifier('FormattedMessage'), t.identifier('FormattedMessage')));
  if (!names.has('injectIntl'))       ex.specifiers.push(t.importSpecifier(t.identifier('injectIntl'), t.identifier('injectIntl')));
}

// 1.2 injectIntl 包裹 export default
ast.program.body.forEach((n, i) => {
  if (t.isExportDefaultDeclaration(n)) {
    const decl = n.declaration;
    let innerId;
    if (t.isIdentifier(decl)) innerId = decl;
    else if (t.isClassDeclaration(decl) && decl.id) {
      innerId = decl.id;
      const clsVar = t.variableDeclaration('const', [t.variableDeclarator(
        t.identifier(decl.id.name),
        t.classExpression(null, decl.superClass, decl.body)
      )]);
      ast.program.body.splice(i, 1);
      ast.program.body.splice(i, 0, clsVar);
    } else return;
    const wrap = t.exportDefaultDeclaration(t.callExpression(t.identifier('injectIntl'), [innerId]));
    ast.program.body.splice(ast.program.body.indexOf(n), 1, wrap);
  }
});

traverse(ast, {
  JSXText(path) {
    const val = path.node.value.trim();
    if (!val || !HAN_MIN2.test(val) || /[{}]/.test(val)) return;
    uiSet.add(val);
    const id = makeId(val); seenId.set(val, id);
    path.replaceWith(t.jsxExpressionContainer(FMNode(id, val)));
  },
  JSXAttribute(path) {
    const v = path.node.value;
    if (!t.isStringLiteral(v)) return;
    const val = v.value;
    if (!HAN_MIN2.test(val)) return;
    uiSet.add(val);
    const id = makeId(val); seenId.set(val, id);
    path.node.value = t.jsxExpressionContainer(FMNode(id, val));
  },
  StringLiteral(path) {
    const val = path.node.value;
    if (!HAN_MIN2.test(val)) return;
    if (/^https?:\/\//.test(val)) return;
    if (/\.jsx?$/.test(val)) return;
    // 明显带代码片段的（api id / category / 正则 / 路径）跳过
    if (/[a-zA-Z]/.test(val) && /[api\w\-.+\/]/.test(val)) return;
    let skip = false, cur = path.parentPath;
    while (cur && !skip) {
      if (t.isObjectExpression(cur.node)) {
        const keys = cur.node.properties.map(p => {
          if (t.isObjectProperty(p)) {
            if (t.isIdentifier(p.key)) return p.key.name;
            if (t.isStringLiteral(p.key)) return p.key.value;
          }
          return null;
        }).filter(Boolean);
        if (keys.some(k => ['id','category','icon','key','name','url','description','defaultMessage','tab'].includes(k))) skip = true;
      }
      cur = cur.parentPath;
    }
    if (skip) return;
    uiSet.add(val);
    const id = makeId(val); seenId.set(val, id);
    const call = t.callExpression(
      t.memberExpression(
        t.memberExpression(t.thisExpression(), t.identifier('props')),
        t.identifier('intl')),
      [t.objectExpression([
        t.objectProperty(t.identifier('id'), t.stringLiteral(id)),
        t.objectProperty(t.identifier('defaultMessage'), t.stringLiteral(val)),
      ])]);
    path.replaceWith(call);
  },
});

// generate
const gen = generate(ast, { retainLines: false, compact: false, quotes: 'single' }, src);
let out = gen.code;
try {
  parser.parse(out, {sourceType:'module', plugins:['jsx','classProperties','optionalChaining','objectRestSpread',
    'asyncGenerators','dynamicImport','topLevelAwait','exportDefaultFrom']});
  console.log('✅ parse OK');
} catch(e) {
  console.log('❌ parse FAIL:', e.message);
  const m = e.message.match(/(\d+):(\d+)/);
  if (m) {
    const lines = out.split('\n'); const ln = parseInt(m[1]);
    for (let i=Math.max(0,ln-4); i<Math.min(lines.length,ln+4); i++)
      console.log(String(i+1).padStart(4), lines[i]);
  }
  process.exit(1);
}

fs.writeFileSync(PATH, out, 'utf8');

// 合并翻译包
const sorted = Array.from(uiSet).sort((a,b)=>a.length-b.length);
console.log(`\n✅ Phase 1 rwck-publish-panel.jsx 收集 ${sorted.length} 条`);
const LANG = '/workspace/src/lib/tw-translations/generated-translations.json';
const lang = JSON.parse(fs.readFileSync(LANG, 'utf8'));
lang['zh-cn'] = lang['zh-cn'] || {}; lang['en'] = lang['en'] || {};
for (const zh of sorted) {
  const id = seenId.get(zh);
  lang['zh-cn'][id] = zh;
  lang['en'][id]    = zh;
}
fs.writeFileSync(LANG, JSON.stringify(lang, null, 2), 'utf8');
console.log(`✅ generated-translations.json 合并 +${sorted.length}`);

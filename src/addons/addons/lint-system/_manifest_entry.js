const manifest = {
    editorOnly: true,
    name: '实时 Lint 系统',
    description: '实时 Lint 系统：代码规范检查、实时错误提示、Quick Fix 和重构建议。在积木上直接显示警告/错误高亮，提供一键修复功能。',
    credits: [{name: '笑小朗', link: ''}],
    userscripts: [{url: 'userscript.js'}],
    userstyles: [{url: 'userstyle.css'}],
    info: [{text: '实时检查代码规范问题，在积木上显示高亮标记，提供 Quick Fix 和重构建议。', id: 'ls-usage'}],
    tags: ['editor', 'lint', 'remixwarp', 'new'],
    enabledByDefault: false
};
export default manifest;

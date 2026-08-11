export default {
    name: '脚本标签页',
    description: '在工作区顶部添加可切换的脚本标签页，每个标签保存一个视图状态（滚动位置/缩放/角色），方便在大型项目中快速切换查看不同脚本区域。',
    credits: [{name: '笑小朗', link: ''}],
    tags: ['editor', 'remixwarp', 'new'],
    enabledByDefault: true,
    version: '1.0.0',
    userscripts: [{
        url: 'userscript.js',
        matches: ['projects']
    }],
    userstyles: [{
        url: 'userstyle.css',
        matches: ['projects']
    }],
    settings: [{
        id: 'maxTabs',
        name: '最大标签数',
        type: 'integer',
        default: 20,
        min: 1,
        max: 50
    }]
};

import {
    Command,
    LayoutPanelLeft,
    PanelBottom,
    Settings,
    Keyboard,
    GitBranch,
    Sparkles,
    Handshake,
    Code,
    Package,
    Play,
    Square,
    Zap,
    Bug,
    HelpCircle,
    Folder,
    Puzzle,
    RotateCcw,
    Info,
    FileText,
    CircleAlert,
    Terminal,
    PanelTopClose
} from 'lucide-react';
import {AESettings} from './settings.js';
import {togglePanelViaEvent} from './mw-panels-store.js';
import {
    openAssetsModal,
    openProjectMetadataModal,
    openSuperRefactorModal,
    openGitModal,
    openAIAgentModal,
    openDebuggerModal,
    openExtensionManagerModal,
    openSettingsModal,
    openShortcutManagerModal,
    openHelp,
    openReadme
} from '../reducers/modals.js';
import {openCollaborationModal} from '../reducers/collaboration.js';

// 分类顺序与双语显示名
export const CATEGORY_LABELS = {
    view: '视图 View',
    project: '项目 Project',
    editor: '编辑器 Editor',
    tools: '工具 Tools',
    settings: '设置 Settings',
    help: '帮助 Help'
};

export const CATEGORY_ORDER = ['view', 'project', 'editor', 'tools', 'settings', 'help'];

/**
 * 生成命令列表。每个命令包含：
 * - label:   英文命令名
 * - labelZh: 中文命令名（可直接用中文搜索）
 * - descZh:  中文说明（显示在命令下方）
 * - keywords: 额外的中英文搜索关键词
 * - category: 所属分类
 * - icon:    lucide 图标
 * - run:     执行函数（接收 ctx）
 * - state:   可选，返回当前开关状态（用于显示勾选标记）
 * @returns {Array} 命令数组
 */
export const getCommands = () => [
    {
        id: 'showCommandPalette',
        label: 'Show Command Palette',
        labelZh: '打开命令面板',
        descZh: '打开命令面板，输入命令名、拼音或中文关键词快速执行任意操作',
        keywords: 'help 帮助 command 命令 palette 面板 搜索 search 快捷键',
        category: 'view',
        icon: Command,
        run: () => {}
    },
    {
        id: 'toggleVSCodeLayout',
        label: 'Toggle VS Code Layout',
        labelZh: '切换 VS Code 布局',
        descZh: '开启或关闭 VS Code 风格布局（活动栏、菜单栏、状态栏），修改后需刷新页面',
        keywords: 'layout 布局 vscode 切换 风格 硬核 活动栏',
        category: 'view',
        icon: LayoutPanelLeft,
        state: () => AESettings.get('EnableVSCodeLayout'),
        run: () => {
            AESettings.set('EnableVSCodeLayout', !AESettings.get('EnableVSCodeLayout'));
            window.location.reload();
        }
    },
    {
        id: 'toggleStatusBar',
        label: 'Toggle Status Bar',
        labelZh: '切换状态栏',
        descZh: '显示或隐藏编辑器底部的状态栏（分支、光标位置、错误数等信息）',
        keywords: 'status 状态栏 status bar 底部 信息 显示 隐藏',
        category: 'view',
        icon: PanelBottom,
        state: () => AESettings.get('EnableStatusBar'),
        run: () => {
            AESettings.set('EnableStatusBar', !AESettings.get('EnableStatusBar'));
            window.location.reload();
        }
    },
    {
        id: 'showProblems',
        label: 'Toggle Problems Panel',
        labelZh: '开关问题面板',
        descZh: '打开或关闭底部的问题面板，显示编译错误与运行时错误',
        keywords: 'problems 问题 面板 panel 错误 error 编译 诊断',
        category: 'view',
        icon: CircleAlert,
        run: () => togglePanelViaEvent('problems')
    },
    {
        id: 'showConsole',
        label: 'Toggle Console Panel',
        labelZh: '开关控制台面板',
        descZh: '打开或关闭底部的控制台面板，显示 console 输出与运行日志',
        keywords: 'console 控制台 面板 panel 日志 log 输出 终端',
        category: 'view',
        icon: Terminal,
        run: () => togglePanelViaEvent('console')
    },
    {
        id: 'closePanels',
        label: 'Close Panel',
        labelZh: '关闭底部面板',
        descZh: '关闭当前打开的底部面板',
        keywords: 'close 关闭 面板 panel 隐藏 hide',
        category: 'view',
        icon: PanelTopClose,
        run: () => togglePanelViaEvent()
    },
    {
        id: 'reloadEditor',
        label: 'Reload Editor',
        labelZh: '刷新编辑器',
        descZh: '重新加载整个编辑器页面，用于让布局等设置生效',
        keywords: 'reload 刷新 重启 restart 重新加载 页面',
        category: 'view',
        icon: RotateCcw,
        run: () => window.location.reload()
    },
    {
        id: 'greenFlag',
        label: 'Run Project (Green Flag)',
        labelZh: '运行项目（绿旗）',
        descZh: '点击绿旗开始运行当前项目',
        keywords: 'run 运行 green flag 绿旗 开始 start 启动 play 执行',
        category: 'project',
        icon: Play,
        run: ctx => ctx.vm.runtime.greenFlag()
    },
    {
        id: 'stopAll',
        label: 'Stop All',
        labelZh: '停止全部',
        descZh: '立即停止项目中所有正在运行的脚本',
        keywords: 'stop 停止 all 全部 暂停 halt 终止 结束',
        category: 'project',
        icon: Square,
        run: ctx => ctx.vm.runtime.stopAll()
    },
    {
        id: 'toggleTurbo',
        label: 'Toggle Turbo Mode',
        labelZh: '切换加速模式',
        descZh: '开启或关闭加速模式，让积木脚本以最快速度运行',
        keywords: 'turbo 加速 turbo mode 极速 fast 模式 快',
        category: 'project',
        icon: Zap,
        state: ctx => !!(ctx.vm.runtime && ctx.vm.runtime.turboMode),
        run: ctx => ctx.vm.setTurboMode(!ctx.vm.runtime.turboMode)
    },
    {
        id: 'openAssets',
        label: 'Open Assets',
        labelZh: '打开资源管理器',
        descZh: '浏览项目中的造型、声音、精灵等所有资源',
        keywords: 'assets 资源 素材 库 造型 声音 精灵 管理',
        category: 'project',
        icon: Folder,
        run: ctx => ctx.dispatch(openAssetsModal())
    },
    {
        id: 'openProjectInfo',
        label: 'Open Project Info',
        labelZh: '打开项目信息',
        descZh: '查看和编辑项目名称、作者、描述等元数据',
        keywords: 'metadata 元数据 项目 信息 title 标题 名称 info 描述',
        category: 'project',
        icon: Info,
        run: ctx => ctx.dispatch(openProjectMetadataModal())
    },
    {
        id: 'openRefactor',
        label: 'Open Code Editor',
        labelZh: '打开代码编辑器',
        descZh: '用 Monaco 代码编辑器查看和编辑脚本，支持语法高亮、多文件切换',
        keywords: 'code 代码 editor 编辑器 monaco 脚本 script 重构 refactor 高级',
        category: 'editor',
        icon: Code,
        run: ctx => ctx.dispatch(openSuperRefactorModal())
    },
    {
        id: 'openGit',
        label: 'Open Git Panel',
        labelZh: '打开 Git 面板',
        descZh: '查看项目的版本历史、分支并提交更改',
        keywords: 'git 版本控制 提交 commit 分支 branch 历史 history 代码库',
        category: 'tools',
        icon: GitBranch,
        run: ctx => ctx.dispatch(openGitModal())
    },
    {
        id: 'openAIAgent',
        label: 'Open AI Agent',
        labelZh: '打开 AI Agent',
        descZh: '与 AI 助手对话，帮助你编写脚本、扩展和解决问题',
        keywords: 'ai agent 智能体 助手 对话 chat 问答 人工智能',
        category: 'tools',
        icon: Sparkles,
        run: ctx => ctx.dispatch(openAIAgentModal())
    },
    {
        id: 'openCollaboration',
        label: 'Open Live Collaboration',
        labelZh: '打开实时协作',
        descZh: '与多人实时协作编辑同一个项目',
        keywords: 'collaboration 协作 实时 多人 online 合作 联机',
        category: 'tools',
        icon: Handshake,
        run: ctx => ctx.dispatch(openCollaborationModal())
    },
    {
        id: 'toggleBackpack',
        label: 'Toggle Backpack',
        labelZh: '开关书包',
        descZh: '打开或关闭书包面板，存放常用积木、造型与声音素材',
        keywords: 'backpack 书包 背包 素材 收藏 存放',
        category: 'tools',
        icon: Package,
        run: ctx => ctx.dispatch({type: 'scratch-gui/backpack/TOGGLE_BACKPACK'})
    },
    {
        id: 'openDebugger',
        label: 'Open Debugger',
        labelZh: '打开调试器',
        descZh: '打开调试器面板，监控变量与脚本运行性能',
        keywords: 'debug 调试 debugger 监视 性能 performance 变量 排查',
        category: 'tools',
        icon: Bug,
        run: ctx => ctx.dispatch(openDebuggerModal())
    },
    {
        id: 'openExtensionManager',
        label: 'Open Extension Manager',
        labelZh: '打开扩展管理器',
        descZh: '管理已加载的扩展与自定义扩展',
        keywords: 'extension 扩展 plugin 插件 管理 manager 加载',
        category: 'tools',
        icon: Puzzle,
        run: ctx => ctx.dispatch(openExtensionManagerModal())
    },
    {
        id: 'openSettings',
        label: 'Open Advanced Settings',
        labelZh: '打开高级设置',
        descZh: '打开高级设置弹窗，可配置布局、编辑器、样式、快捷键等全部选项',
        keywords: 'settings 设置 高级 options 选项 配置 首选项 preference 参数',
        category: 'settings',
        icon: Settings,
        run: ctx => ctx.dispatch(openSettingsModal())
    },
    {
        id: 'openShortcuts',
        label: 'Open Shortcut Manager',
        labelZh: '打开快捷键设置',
        descZh: '查看并修改所有键盘快捷键的绑定',
        keywords: 'shortcut 快捷键 keys 键盘 bindings 绑定 按键 组合键',
        category: 'settings',
        icon: Keyboard,
        run: ctx => ctx.dispatch(openShortcutManagerModal())
    },
    {
        id: 'openHelp',
        label: 'Open Help',
        labelZh: '打开帮助',
        descZh: '打开帮助文档与使用说明',
        keywords: 'help 帮助 使用说明 docs 文档 tutorial 教程 guide 指南',
        category: 'help',
        icon: HelpCircle,
        run: ctx => ctx.dispatch(openHelp())
    },
    {
        id: 'openReadme',
        label: 'Open README',
        labelZh: '打开 README',
        descZh: '查看当前项目的 README 说明文档',
        keywords: 'readme 说明 文档 介绍 intro 项目说明',
        category: 'help',
        icon: FileText,
        run: ctx => ctx.dispatch(openReadme())
    }
];

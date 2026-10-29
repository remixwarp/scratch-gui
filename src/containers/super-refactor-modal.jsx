import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {
    ChevronDown,
    ChevronRight,
    File,
    FileAudio,
    FileCode,
    FileImage,
    FileText,
    Folder,
    FolderOpen,
    Settings
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from '@turbowarp/jszip';
import {closeSuperRefactorModal} from '../reducers/modals';
import {LoadingState} from '../reducers/project-state';
import Modal from './windowed-modal.jsx';
import Button from '../components/button/button.jsx';
import VM from 'scratch-vm';
import {hasCurrentRJ, getCurrentRJZip, getCurrentRJRaw} from '../lib/rj/rj-store.js';
import {mapLimit} from '../lib/rj/rj-shared.js';
import {
    RFD_DEFAULT_TEXT,
    RFD_LEGEND_ITEMS,
    appendRfdFlow,
    clearRfdConnections,
    connectRfdHotspots,
    isRjfFileName,
    renderRfdSvg
} from '../lib/super-refactor-rfd.js';
import './super-refactor-modal.css';

// 超级重构窗口的界面文案（走 react-intl，便于翻译）
const messages = defineMessages({
    title: {
        id: 'mw.superRefactor.title',
        defaultMessage: '超级重构',
        description: 'Title of the super refactor window'
    },
    settingsTitle: {
        id: 'mw.superRefactor.settingsTitle',
        defaultMessage: '超级重构设置',
        description: 'Title of the super refactor settings window'
    },
    fileCount: {
        id: 'mw.superRefactor.fileCount',
        defaultMessage: '共 {count} 个文件',
        description: 'Total number of files in the project'
    },
    filteredFileCount: {
        id: 'mw.superRefactor.filteredFileCount',
        defaultMessage: '{filtered} / {total} 个文件',
        description: 'Number of files matching the search out of the total'
    },
    searchPlaceholder: {
        id: 'mw.superRefactor.searchPlaceholder',
        defaultMessage: '搜索文件...',
        description: 'Placeholder of the file search input'
    },
    clearSearch: {
        id: 'mw.superRefactor.clearSearch',
        defaultMessage: '清除',
        description: 'Button that clears the file search'
    },
    noMatchingFiles: {
        id: 'mw.superRefactor.noMatchingFiles',
        defaultMessage: '没有找到匹配的文件',
        description: 'Shown when the file search has no results'
    },
    createButtonTitle: {
        id: 'mw.superRefactor.createButtonTitle',
        defaultMessage: '在选中文件所在目录新建文件',
        description: 'Tooltip of the new file button'
    },
    refresh: {
        id: 'mw.superRefactor.refresh',
        defaultMessage: '刷新',
        description: 'Button that reloads the file list'
    },
    refreshed: {
        id: 'mw.superRefactor.refreshed',
        defaultMessage: '已刷新！',
        description: 'Status message after refreshing the file list'
    },
    applyToProject: {
        id: 'mw.superRefactor.applyToProject',
        defaultMessage: '应用到作品',
        description: 'Button that applies the edited file to the project'
    },
    cannotApply: {
        id: 'mw.superRefactor.cannotApply',
        defaultMessage: '不可应用',
        description: 'Shown when the current file cannot be applied to the project'
    },
    downloadProject: {
        id: 'mw.superRefactor.downloadProject',
        defaultMessage: '下载项目',
        description: 'Button that downloads the project'
    },
    close: {
        id: 'mw.superRefactor.close',
        defaultMessage: '关闭',
        description: 'Button that closes the super refactor window'
    },
    rename: {
        id: 'mw.superRefactor.rename',
        defaultMessage: '重命名',
        description: 'Context menu item that renames a file'
    },
    typeImage: {
        id: 'mw.superRefactor.typeImage',
        defaultMessage: '图片',
        description: 'File type label for images'
    },
    typeSound: {
        id: 'mw.superRefactor.typeSound',
        defaultMessage: '声音',
        description: 'File type label for sounds'
    },
    typeFile: {
        id: 'mw.superRefactor.typeFile',
        defaultMessage: '文件',
        description: 'File type label for other files'
    },
    modeEdit: {
        id: 'mw.superRefactor.modeEdit',
        defaultMessage: '编辑',
        description: 'Flow chart mode: edit only'
    },
    modePreview: {
        id: 'mw.superRefactor.modePreview',
        defaultMessage: '预览',
        description: 'Flow chart mode: preview only'
    },
    modeEditPreview: {
        id: 'mw.superRefactor.modeEditPreview',
        defaultMessage: '编辑+预览',
        description: 'Flow chart mode: edit and preview side by side'
    },
    showCode: {
        id: 'mw.superRefactor.showCode',
        defaultMessage: '显示代码',
        description: 'Button that switches to the code view'
    },
    showPreview: {
        id: 'mw.superRefactor.showPreview',
        defaultMessage: '显示预览',
        description: 'Button that switches to the preview view'
    },
    svgPreviewError: {
        id: 'mw.superRefactor.svgPreviewError',
        defaultMessage: '无法预览SVG',
        description: 'Shown when the SVG file has no content to preview'
    },
    imagePreviewError: {
        id: 'mw.superRefactor.imagePreviewError',
        defaultMessage: '无法预览图片',
        description: 'Shown when the image file has no content to preview'
    },
    unsupportedEdit: {
        id: 'mw.superRefactor.unsupportedEdit',
        defaultMessage: '此文件类型不支持编辑',
        description: 'Shown when the selected file type cannot be edited'
    },
    mdEmpty: {
        id: 'mw.superRefactor.mdEmpty',
        defaultMessage: '暂无内容',
        description: 'Shown when a Markdown file is empty'
    },
    rootDirectory: {
        id: 'mw.superRefactor.rootDirectory',
        defaultMessage: '（根目录）',
        description: 'Label of the project root when creating a new file'
    },
    // 新建文件
    createMenuTitle: {
        id: 'mw.superRefactor.createMenuTitle',
        defaultMessage: '新建文件',
        description: 'Title of the new file dialog'
    },
    createMenuTargetDir: {
        id: 'mw.superRefactor.createMenuTargetDir',
        defaultMessage: '将在当前目录 {dir} 下创建',
        description: 'Directory where the new file will be created'
    },
    createTypeSvgDesc: {
        id: 'mw.superRefactor.createType.svgDesc',
        defaultMessage: '可缩放矢量图形，适合角色造型与图标，支持代码与预览切换',
        description: 'Description of the SVG option in the new file dialog'
    },
    createTypeJsonDesc: {
        id: 'mw.superRefactor.createType.jsonDesc',
        defaultMessage: '结构化数据文件，适合配置、作品数据与 .rj 分片',
        description: 'Description of the JSON option in the new file dialog'
    },
    createTypeMdDesc: {
        id: 'mw.superRefactor.createType.mdDesc',
        defaultMessage: '文档说明文件，支持 Markdown 渲染预览',
        description: 'Description of the Markdown option in the new file dialog'
    },
    createTypeRfdDesc: {
        id: 'mw.superRefactor.createType.rfdDesc',
        defaultMessage: '流程图描述文件，支持代码编辑与图形预览',
        description: 'Description of the RFD option in the new file dialog'
    },
    createDefaultSvgName: {
        id: 'mw.superRefactor.createDefault.svgName',
        defaultMessage: '新建图形',
        description: 'Default file name for a new SVG file'
    },
    createDefaultJsonName: {
        id: 'mw.superRefactor.createDefault.jsonName',
        defaultMessage: '新建数据',
        description: 'Default file name for a new JSON file'
    },
    createDefaultMdName: {
        id: 'mw.superRefactor.createDefault.mdName',
        defaultMessage: '新建文档',
        description: 'Default file name for a new Markdown file'
    },
    createDefaultRfdName: {
        id: 'mw.superRefactor.createDefault.rfdName',
        defaultMessage: 'Remix Jit Flowchart',
        description: 'Default file name for a new RJF file'
    },
    createDefaultMdContent: {
        id: 'mw.superRefactor.createDefault.mdContent',
        defaultMessage: '# 新文档\n\n在这里编写 Markdown 内容。\n',
        description: 'Default content of a new Markdown file'
    },
    // 应用 / 下载的提示消息
    readOnlyShard: {
        id: 'mw.superRefactor.message.readOnlyShard',
        defaultMessage: '.rj 分片文件为只读预览，请用「保存 .rj」重新生成',
        description: 'Shown when trying to apply a read-only .rj shard'
    },
    projectUpdated: {
        id: 'mw.superRefactor.message.projectUpdated',
        defaultMessage: '✓ 项目已更新！',
        description: 'Status message after applying project.json'
    },
    updateFailed: {
        id: 'mw.superRefactor.message.updateFailed',
        defaultMessage: '✗ 更新失败: {reason}',
        description: 'Status message when applying project.json fails'
    },
    svgUpdated: {
        id: 'mw.superRefactor.message.svgUpdated',
        defaultMessage: '✓ SVG造型已更新！',
        description: 'Status message after applying an SVG costume'
    },
    costumeNotFound: {
        id: 'mw.superRefactor.message.costumeNotFound',
        defaultMessage: '✗ 未找到对应的造型或目标',
        description: 'Status message when the target costume cannot be found'
    },
    onlyJsonSvgApplicable: {
        id: 'mw.superRefactor.message.onlyJsonSvg',
        defaultMessage: '只有 project.json 和 SVG 可以应用到作品',
        description: 'Status message when the file cannot be applied'
    },
    formatError: {
        id: 'mw.superRefactor.message.formatError',
        defaultMessage: '✗ 格式错误: {reason}',
        description: 'Status message when the content cannot be parsed'
    },
    shardApplied: {
        id: 'mw.superRefactor.message.shardApplied',
        defaultMessage: '✓ 分片已应用到作品！',
        description: 'Status message after applying a .rj shard'
    },
    applyFailed: {
        id: 'mw.superRefactor.message.applyFailed',
        defaultMessage: '✗ 应用失败: {reason}',
        description: 'Status message when applying a .rj shard fails'
    },
    writtenToRj: {
        id: 'mw.superRefactor.message.writtenToRj',
        defaultMessage: '✓ 已写入 .rj 作品，下载时会一并打包',
        description: 'Status message after writing a new file into the .rj archive'
    },
    writtenToProject: {
        id: 'mw.superRefactor.message.writtenToProject',
        defaultMessage: '✓ 已写入作品，下载项目时会一并打包',
        description: 'Status message after saving a new file for the sb3 project'
    },
    rjDownloadedWithExtras: {
        id: 'mw.superRefactor.message.rjDownloadedWithExtras',
        defaultMessage: '已下载 .rj 文件（含新建文件）！',
        description: 'Status message after downloading a .rj file including new files'
    },
    rjDownloaded: {
        id: 'mw.superRefactor.message.rjDownloaded',
        defaultMessage: '已下载 .rj 文件！',
        description: 'Status message after downloading the .rj file'
    },
    rjDownloadFailed: {
        id: 'mw.superRefactor.message.rjDownloadFailed',
        defaultMessage: '下载 .rj 失败',
        description: 'Status message when downloading the .rj file fails'
    },
    sb3DownloadedWithExtras: {
        id: 'mw.superRefactor.message.sb3DownloadedWithExtras',
        defaultMessage: '已下载作品（含新建文件）！',
        description: 'Status message after downloading the sb3 project including new files'
    },
    projectDownloaded: {
        id: 'mw.superRefactor.message.projectDownloaded',
        defaultMessage: '已下载项目文件！',
        description: 'Status message after downloading project.json'
    },
    jsonDownloadError: {
        id: 'mw.superRefactor.message.jsonDownloadError',
        defaultMessage: 'JSON格式错误，无法下载',
        description: 'Status message when project.json is invalid'
    },
    readFailed: {
        id: 'mw.superRefactor.message.readFailed',
        defaultMessage: '读取失败: {reason}',
        description: 'Shown as the content of a file that could not be read from the .rj archive'
    },
    // 设置窗口
    settingsFileList: {
        id: 'mw.superRefactor.settings.fileList',
        defaultMessage: '文件列表显示',
        description: 'Settings section: file list display mode'
    },
    settingTreeView: {
        id: 'mw.superRefactor.settings.treeView',
        defaultMessage: '树状结构（新版）',
        description: 'Settings: tree file view'
    },
    settingListView: {
        id: 'mw.superRefactor.settings.listView',
        defaultMessage: '平铺列表（旧版）',
        description: 'Settings: flat file list view'
    },
    settingsEditorVersion: {
        id: 'mw.superRefactor.settings.editorVersion',
        defaultMessage: '编辑器版本',
        description: 'Settings section: editor version'
    },
    settingMonacoEditor: {
        id: 'mw.superRefactor.settings.monacoEditor',
        defaultMessage: '新版编辑器（Monaco）',
        description: 'Settings: use the Monaco editor'
    },
    settingBuiltinEditor: {
        id: 'mw.superRefactor.settings.builtinEditor',
        defaultMessage: '旧版编辑器（内置）',
        description: 'Settings: use the built-in editor'
    },
    settingsMonacoOptions: {
        id: 'mw.superRefactor.settings.monacoOptions',
        defaultMessage: '新版编辑器选项',
        description: 'Settings section: Monaco editor options'
    },
    settingMinimap: {
        id: 'mw.superRefactor.settings.minimap',
        defaultMessage: '侧边代码预览（小地图）',
        description: 'Monaco option: minimap'
    },
    settingFolding: {
        id: 'mw.superRefactor.settings.folding',
        defaultMessage: '代码折叠',
        description: 'Monaco option: code folding'
    },
    settingFoldingControls: {
        id: 'mw.superRefactor.settings.foldingControls',
        defaultMessage: '折叠控件',
        description: 'Monaco option: where folding controls are shown'
    },
    settingFoldingAlways: {
        id: 'mw.superRefactor.settings.foldingAlways',
        defaultMessage: '始终显示',
        description: 'Monaco option value: always show folding controls'
    },
    settingFoldingMouseover: {
        id: 'mw.superRefactor.settings.foldingMouseover',
        defaultMessage: '悬停显示',
        description: 'Monaco option value: show folding controls on hover'
    },
    settingBreadcrumbs: {
        id: 'mw.superRefactor.settings.breadcrumbs',
        defaultMessage: '顶部面包屑导航',
        description: 'Monaco option: breadcrumbs'
    },
    settingStickyScroll: {
        id: 'mw.superRefactor.settings.stickyScroll',
        defaultMessage: '吸顶滚动（固定当前作用域）',
        description: 'Monaco option: sticky scroll'
    },
    settingLineNumbers: {
        id: 'mw.superRefactor.settings.lineNumbers',
        defaultMessage: '显示行号',
        description: 'Monaco option: line numbers'
    },
    settingIndentGuides: {
        id: 'mw.superRefactor.settings.indentGuides',
        defaultMessage: '缩进参考线',
        description: 'Monaco option: indentation guides'
    },
    settingHighlightActiveLine: {
        id: 'mw.superRefactor.settings.highlightActiveLine',
        defaultMessage: '高亮当前行',
        description: 'Monaco option: highlight the active line'
    },
    settingSmoothScrolling: {
        id: 'mw.superRefactor.settings.smoothScrolling',
        defaultMessage: '平滑滚动',
        description: 'Monaco option: smooth scrolling'
    },
    settingMouseWheelZoom: {
        id: 'mw.superRefactor.settings.mouseWheelZoom',
        defaultMessage: 'Ctrl + 滚轮缩放字号',
        description: 'Monaco option: zoom the font with Ctrl and the mouse wheel'
    },
    settingFontSize: {
        id: 'mw.superRefactor.settings.fontSize',
        defaultMessage: '字号',
        description: 'Monaco option: font size'
    },
    settingTabSize: {
        id: 'mw.superRefactor.settings.tabSize',
        defaultMessage: 'Tab 宽度',
        description: 'Monaco option: tab size'
    },
    settingWhitespace: {
        id: 'mw.superRefactor.settings.whitespace',
        defaultMessage: '空白字符',
        description: 'Monaco option: render whitespace'
    },
    settingWhitespaceNone: {
        id: 'mw.superRefactor.settings.whitespaceNone',
        defaultMessage: '不显示',
        description: 'Monaco option value: never render whitespace'
    },
    settingWhitespaceSelection: {
        id: 'mw.superRefactor.settings.whitespaceSelection',
        defaultMessage: '选中区域',
        description: 'Monaco option value: render whitespace in the selection only'
    },
    settingWhitespaceAll: {
        id: 'mw.superRefactor.settings.whitespaceAll',
        defaultMessage: '全部',
        description: 'Monaco option value: always render whitespace'
    },
    settingResetDefaults: {
        id: 'mw.superRefactor.settings.resetDefaults',
        defaultMessage: '恢复默认',
        description: 'Button that restores the default Monaco options'
    },
    done: {
        id: 'mw.superRefactor.done',
        defaultMessage: '完成',
        description: 'Button that closes the settings window'
    },
    // .rfd 流程图
    rfdDisplayTitle: {
        id: 'mw.superRefactor.rfd.displayTitle',
        defaultMessage: '调整预览中显示的内容范围',
        description: 'Tooltip of the flow chart display range selector'
    },
    rfdDisplayBoth: {
        id: 'mw.superRefactor.rfd.displayBoth',
        defaultMessage: '点ID 连接点',
        description: 'Flow chart display: show point IDs and hotspots'
    },
    rfdDisplayId: {
        id: 'mw.superRefactor.rfd.displayId',
        defaultMessage: '点ID',
        description: 'Flow chart display: show point IDs only'
    },
    rfdDisplayHotspot: {
        id: 'mw.superRefactor.rfd.displayHotspot',
        defaultMessage: '连接点',
        description: 'Flow chart display: show hotspots only'
    },
    rfdDisplayNone: {
        id: 'mw.superRefactor.rfd.displayNone',
        defaultMessage: '均不显示',
        description: 'Flow chart display: show neither point IDs nor hotspots'
    },
    rfdAddFlow: {
        id: 'mw.superRefactor.rfd.addFlow',
        defaultMessage: '新增流程',
        description: 'Button that appends a new flow to the .rfd file'
    },
    rfdClearConnections: {
        id: 'mw.superRefactor.rfd.clearConnections',
        defaultMessage: '清除连线',
        description: 'Button that removes all connections from the .rfd file'
    },
    rfdDownloadSvg: {
        id: 'mw.superRefactor.rfd.downloadSvg',
        defaultMessage: '下载 SVG',
        description: 'Button that downloads the rendered flow chart as SVG'
    },
    rfdPendingHint: {
        id: 'mw.superRefactor.rfd.pendingHint',
        defaultMessage: '再点一个热点完成连线',
        description: 'Hint shown after selecting the start hotspot of a connection'
    },
    rfdPreviewError: {
        id: 'mw.superRefactor.rfd.previewError',
        defaultMessage: '无法预览流程图，请检查 .rfd 内容',
        description: 'Shown when the .rfd content cannot be rendered'
    },
    rfdLegend: {
        id: 'mw.superRefactor.rfd.legend',
        defaultMessage: '描述',
        description: 'Title of the .rfd syntax legend panel'
    },
    legendOval: {
        id: 'mw.superRefactor.rfd.legend.oval',
        defaultMessage: '椭圆 · 开始 / 结束',
        description: 'Legend: oval shape'
    },
    legendRect: {
        id: 'mw.superRefactor.rfd.legend.rect',
        defaultMessage: '矩形 · 处理 / 语句',
        description: 'Legend: rectangle shape'
    },
    legendDiamond: {
        id: 'mw.superRefactor.rfd.legend.diamond',
        defaultMessage: '菱形 · 判断',
        description: 'Legend: diamond shape'
    },
    legendPara: {
        id: 'mw.superRefactor.rfd.legend.para',
        defaultMessage: '平行四边形 · 输入 / 输出',
        description: 'Legend: parallelogram shape'
    },
    legendComment: {
        id: 'mw.superRefactor.rfd.legend.comment',
        defaultMessage: '虚线框 · 注释',
        description: 'Legend: comment box'
    },
    legendAssignSingle: {
        id: 'mw.superRefactor.rfd.legend.assignSingle',
        defaultMessage: '命名为 1，并连接到 2',
        description: 'Legend: assign a point ID and connect to one target'
    },
    legendAssignMulti: {
        id: 'mw.superRefactor.rfd.legend.assignMulti',
        defaultMessage: '命名为 1，同时连接 2、3、4…',
        description: 'Legend: assign a point ID and connect to several targets'
    },
    legendPorts: {
        id: 'mw.superRefactor.rfd.legend.ports',
        defaultMessage: '左 / 右 / 下 / 上，: 后为 ID，- 后为目标 ID',
        description: 'Legend: port and connection marks'
    },
    legendSeparator: {
        id: 'mw.superRefactor.rfd.legend.separator',
        defaultMessage: '流程分隔（三个减号或空行）',
        description: 'Legend: flow separator'
    },
    legendEscape: {
        id: 'mw.superRefactor.rfd.legend.escape',
        defaultMessage: '自动连接；反斜杠转义 \\\\, \\\\: \\\\-',
        description: 'Legend: automatic connection and escaping'
    }
});

// 与 RFD_LEGEND_ITEMS 的顺序一一对应
const RFD_LEGEND_MESSAGE_KEYS = [
    'legendOval',
    'legendRect',
    'legendDiamond',
    'legendPara',
    'legendComment',
    'legendAssignSingle',
    'legendAssignMulti',
    'legendPorts',
    'legendSeparator',
    'legendEscape'
];

// 超过该字节数的文件不做逐 token 语法高亮与逐行行号渲染，避免打开卡顿
const LARGE_CONTENT_THRESHOLD = 150000;

// 超级重构窗口的界面偏好（文件树/旧版列表、编辑器版本、Monaco 选项）
const SUPER_REFACTOR_SETTINGS_KEY = 'mw-super-refactor-settings';

// 超级重构里新建的文件不属于 sb3 / .rj 结构，按作品 id 存在本地
const EXTRA_STORAGE_PREFIX = 'mw-super-refactor-extra:';

// 未保存的新作品 projectId 固定为 '0'，用页面级随机 token 区分不同的新作品，
// 避免上一个新作品里建的文件被下一个新作品复用
const createNewProjectToken = () =>
    `new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let newProjectToken = createNewProjectToken();
const isUnsavedProjectId = id => id === null || typeof id === 'undefined' ||
    String(id) === '' || String(id) === '0';

// .rj 包内属于格式本身的路径，其余条目视为用户新建的文件
const RJ_STANDARD_PREFIXES = ['tables/', 'targets/', 'blocks/', 'assets/'];
const isStandardRJPath = path => path === 'manifest.json' ||
    RJ_STANDARD_PREFIXES.some(prefix => path.startsWith(prefix));

// 「+」新建菜单的四种文件类型
const CREATE_FILE_TYPES = [
    {ext: 'svg', label: 'SVG', desc: messages.createTypeSvgDesc},
    {ext: 'json', label: 'JSON', desc: messages.createTypeJsonDesc},
    {ext: 'md', label: 'Markdown', desc: messages.createTypeMdDesc},
    {ext: 'rjf', label: 'RJF', desc: messages.createTypeRfdDesc}
];

const CREATE_FILE_DEFAULTS = {
    svg: {
        prefix: messages.createDefaultSvgName,
        content: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">\n' +
            '    <rect x="10" y="10" width="80" height="80" fill="#4d97ff"/>\n' +
            '</svg>\n'
    },
    json: {
        prefix: messages.createDefaultJsonName,
        content: '{}'
    },
    md: {
        prefix: messages.createDefaultMdName,
        content: messages.createDefaultMdContent
    },
    rjf: {
        prefix: messages.createDefaultRfdName,
        content: '# Remix Jit Flowchart.rjf\n\n' + RFD_DEFAULT_TEXT
    }
};

const splitFileName = name => {
    const path = String(name || '');
    const slash = path.lastIndexOf('/');
    return {
        dir: slash === -1 ? '' : path.substring(0, slash + 1),
        base: slash === -1 ? path : path.substring(slash + 1)
    };
};

const filePrefixOf = name => splitFileName(name).base.replace(/\.[^.]+$/, '');

const DEFAULT_EDITOR_OPTIONS = {
    minimap: true,
    folding: true,
    foldingControls: 'always',
    breadcrumbs: true,
    stickyScroll: true,
    lineNumbers: true,
    indentationGuides: true,
    highlightActiveLine: true,
    smoothScrolling: true,
    mouseWheelZoom: true,
    fontSize: 13,
    tabSize: 4,
    renderWhitespace: 'selection'
};

const loadSuperRefactorSettings = () => {
    try {
        const raw = localStorage.getItem(SUPER_REFACTOR_SETTINGS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
};

// ---------------------------------------------------------------------------
// .rj 分片视图辅助函数：当前作品是 .rj 时，文件面板直接列出 .rj 内部
// 真实的分片文件（manifest / tables / targets / blocks / assets），
// 而不是把已加载的 VM 重新序列化成 sb3 视图。
// ---------------------------------------------------------------------------
const RJ_IMAGE_EXTS = ['png', 'bmp', 'jpeg', 'jpg', 'gif', 'webp'];
const RJ_IMAGE_MIME = {
    png: 'image/png',
    bmp: 'image/bmp',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp'
};

const rjExtOf = path => {
    const idx = path.lastIndexOf('.');
    return idx === -1 ? '' : path.substring(idx + 1).toLowerCase();
};

// 展示顺序：清单 → 名称表 → 角色数据 → 积木 → 二次加载缓存 → 资源 → 其它
const rjPathRank = path => {
    if (path === 'manifest.json') return 0;
    if (path.indexOf('tables/') === 0) return 1;
    if (path.indexOf('targets/') === 0) return 2;
    if (path.indexOf('blocks/prebuilt/') === 0) return 4;
    if (path.indexOf('blocks/') === 0) return 3;
    if (path.indexOf('assets/') === 0) return 5;
    return 6;
};

const rjNumericSuffix = path => {
    const m = path.match(/(\d+)\.json$/);
    return m ? parseInt(m[1], 10) : -1;
};

const rjPathCompare = (a, b) => {
    const rankDiff = rjPathRank(a) - rjPathRank(b);
    if (rankDiff !== 0) return rankDiff;
    const na = rjNumericSuffix(a);
    const nb = rjNumericSuffix(b);
    if (na !== -1 && nb !== -1 && na !== nb) return na - nb;
    return a < b ? -1 : (a > b ? 1 : 0);
};

const uint8ArrayToDataURL = (u8, mime) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取图片数据失败'));
    reader.readAsDataURL(new Blob([u8], {type: mime}));
});

class SuperRefactorModalContainer extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClose',
            'handleFileChange',
            'selectFile',
            'handleRefresh',
            'applyChanges',
            'downloadProject',
            'saveBlobAs',
            'getProjectFiles',
            'toggleViewMode',
            'handleEditorScroll',
            'handleEditorKeyDown',
            'handleMonacoMessage',
            'sendToMonacoIframe',
            'handleWindowResize',
            'openSettings',
            'closeSettings',
            'setFileViewMode',
            'setEditorVersion',
            'setEditorOption',
            'resetEditorOptions',
            'toggleFolder',
            'openCreateMenu',
            'closeCreateMenu',
            'handleCreateFileOfType',
            'startRenameFile',
            'handleRenameValueChange',
            'handleRenameKeyDown',
            'commitRename',
            'openFileContextMenu',
            'closeFileContextMenu',
            'renderFileLabel',
            'setRfdMode',
            'handleRfdDisplayChange',
            'toggleRfdLegend',
            'handleRfdPreviewClick',
            'handleRfdAddFlow',
            'handleRfdClearConnections',
            'handleRfdDownloadSvg',
            'updateRfdContent',
            'saveExtraFiles',
            'loadStoredExtraFiles',
            'withStoredExtraFiles'
        ]);

        const savedSettings = loadSuperRefactorSettings();

        this.state = {
            files: [],
            currentFile: 0,
            content: '',
            message: '',
            searchQuery: '',
            filteredFiles: [],
            viewMode: 'code', // code or preview for SVG
            wordWrap: true, // 自动换行
            // 文件面板显示方式：tree = 新版树状结构，list = 旧版平铺列表
            fileViewMode: savedSettings.fileViewMode === 'list' ? 'list' : 'tree',
            // 编辑器版本：新版 Monaco / 旧版内置编辑器（默认新版）
            useMonacoEditor: savedSettings.useMonacoEditor !== false,
            editorOptions: Object.assign({}, DEFAULT_EDITOR_OPTIONS, savedSettings.editorOptions || {}),
            monacoIframeReady: false, // iframe 中的 Monaco 是否就绪
            monacoIframeKey: 0, // 重新打开窗口时强制重建 iframe
            settingsVisible: false, // 设置自由窗口是否打开
            collapsedFolders: {}, // 树状结构中已折叠的文件夹路径
            // .rfd 流程图：编辑 / 预览 / 编辑+预览，以及描述面板、热点连线的显示范围
            rfdMode: 'both',
            rfdLegendOpen: true,
            rfdDisplay: 'both', // both | id | hotspot | none
            rfdPending: null, // 已点选的起点热点 {blockId, side}
            // 新建文件的类型选择弹窗、文件重命名、右键菜单
            createMenuVisible: false,
            renamingFileId: null,
            renameValue: '',
            fileContextMenu: null, // {x, y, fileId}
            modalWidth: Math.min(1100, window.innerWidth - 60),
            modalHeight: Math.min(700, window.innerHeight - 80)
        };
        
        this.monacoIframeRef = React.createRef();
        this.modalRootRef = React.createRef();
        this._monacoReadySource = null;
    }

    componentDidMount () {
        this.loadProjectFiles();
        this.applyThemeToWindow();
        window.addEventListener('resize', this.handleWindowResize);
        window.addEventListener('message', this.handleMonacoMessage);
    }

    componentDidUpdate (prevProps) {
        // 关闭主窗口时同步收起设置窗口，重新打开时按已保存的偏好渲染
        if (prevProps.visible === true && this.props.visible === false && this.state.settingsVisible) {
            this.setState({settingsVisible: false});
        }
        if (prevProps.visible === false && this.props.visible === true) {
            // 重新打开时重建 Monaco iframe，确保内容是最新文件
            this.setState(prevState => ({
                monacoIframeReady: false,
                monacoIframeKey: prevState.monacoIframeKey + 1
            }));
            // 期间可能切换过作品，重新读取当前作品的文件列表
            this.loadProjectFiles();
        }

        if (prevProps.theme !== this.props.theme) {
            this.applyThemeToWindow();
        }

        // 切换作品：本地新建文件按作品隔离，需要重新读取
        if (prevProps.projectId !== this.props.projectId) {
            this.handleProjectSwitch(
                prevProps.projectId,
                this.props.projectId,
                prevProps.loadingState === LoadingState.CREATING_NEW
            );
        }
        
        // 主题变化时更新 Monaco iframe
        if (this.state.useMonacoEditor && this.state.monacoIframeReady) {
            const isDarkTheme = this.props.theme && typeof this.props.theme.isDark === 'function' ? this.props.theme.isDark() : false;
            this.sendToMonacoIframe({
                type: 'monaco-set-theme',
                theme: isDarkTheme ? 'vs-dark' : 'vs-light'
            });
        }
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.handleWindowResize);
        window.removeEventListener('message', this.handleMonacoMessage);
    }

    handleWindowResize () {
        this.setState({
            modalWidth: Math.min(1100, window.innerWidth - 60),
            modalHeight: Math.min(700, window.innerHeight - 80)
        });
    }

    applyThemeToWindow () {
        const {theme} = this.props;
        const isDarkTheme = theme && typeof theme.isDark === 'function' ? theme.isDark() : false;
        

        
        // 延迟执行以确保窗口已创建
        setTimeout(() => {
            const windowElements = document.querySelectorAll(
                '#superRefactorModal, #superRefactorSettingsModal'
            );
            windowElements.forEach(windowElement => {
                if (isDarkTheme) {
                    windowElement.classList.add('dark-theme');
                    windowElement.style.background = '#1E1E1E';
                    windowElement.style.color = '#e0e0e0';

                    // 标题栏也变成纯黑，避免窗口顶部仍是灰色
                    const headerElement = windowElement.querySelector('.addon-window-header');
                    if (headerElement) {
                        headerElement.style.background = '#1E1E1E';
                        headerElement.style.borderBottomColor = '#3a3a3a';
                    }

                    // 同时也设置内部元素的样式
                    const contentElement = windowElement.querySelector('.addon-window-content');
                    if (contentElement) {
                        contentElement.style.background = '#1E1E1E';
                        contentElement.style.color = '#e0e0e0';
                    }
                    const modalContentElement = windowElement.querySelector('.modal-window-content');
                    if (modalContentElement) {
                        modalContentElement.style.background = '#1E1E1E';
                    }

                    // 设置输入框和文本区域的样式（文本编辑器区域保持原有深色）
                    const inputs = windowElement.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.style.background = input.tagName === 'TEXTAREA' ? '#1e1e1e' : '#1E1E1E';
                        input.style.color = '#e0e0e0';
                        input.style.borderColor = '#555555';
                    });

                } else {
                    windowElement.classList.remove('dark-theme');
                    windowElement.style.background = '';
                    windowElement.style.color = '';

                    const headerElement = windowElement.querySelector('.addon-window-header');
                    if (headerElement) {
                        headerElement.style.background = '';
                        headerElement.style.borderBottomColor = '';
                    }
                    
                    // 移除内部元素的样式
                    const contentElement = windowElement.querySelector('.addon-window-content');
                    if (contentElement) {
                        contentElement.style.background = '';
                        contentElement.style.color = '';
                    }
                    const modalContentElement = windowElement.querySelector('.modal-window-content');
                    if (modalContentElement) {
                        modalContentElement.style.background = '';
                    }
                    
                    // 移除输入框和文本区域的样式
                    const inputs = windowElement.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.style.background = '';
                        input.style.color = '';
                        input.style.borderColor = '';
                    });
                }
            });
        }, 100);
    }

    // 从项目中获取所有文件（JSON、图片、声音等）
    getProjectFiles () {
        const files = [];
        
        if (!this.props.vm) return files;
        
        const runtime = this.props.vm.runtime;
        if (!runtime) return files;

        // 1. 项目JSON
        const projectJson = this.props.vm.toJSON();
        if (projectJson) {
            files.push({
                id: 'project.json',
                name: 'project.json',
                type: 'json',
                content: projectJson,
                size: projectJson.length
            });
        }

        // 2. 获取所有角色的造型和声音
        const targets = runtime.targets || [];
        targets.forEach((target, targetIndex) => {
            const targetName = target.getName ? target.getName() : `target_${targetIndex}`;
            const isStage = target.isStage;

            // 获取造型
            const costumes = target.getCostumes ? target.getCostumes() : [];
            costumes.forEach((costume, costumeIndex) => {
                if (costume.asset) {
                    const ext = costume.asset.dataFormat || 'png';
                    const fileName = isStage 
                        ? `stage/${costume.name}.${ext}`
                        : `${targetName}/costumes/${costume.name}.${ext}`;
                    
                    // 处理不同类型的资产
                    let content = null;
                    let type = 'image';
                    
                    if (ext.toLowerCase() === 'svg') {
                        // SVG 文件应该是文本
                        type = 'svg';
                        if (typeof costume.asset.data === 'string') {
                            content = costume.asset.data;
                        } else if (costume.asset.data) {
                            // 如果是 ArrayBuffer，尝试转换为字符串
                            try {
                                content = new TextDecoder('utf-8').decode(costume.asset.data);
                            } catch (e) {
                                console.error('转换 SVG 失败:', e);
                            }
                        }
                    } else {
                        // 其他图片格式
                        type = 'image';
                        if (costume.asset.data) {
                            // 确保是 Base64 字符串
                            if (typeof costume.asset.data === 'string' && costume.asset.data.startsWith('data:')) {
                                content = costume.asset.data;
                            } else {
                                console.error('图片资产格式不支持预览:', costume.asset.data);
                            }
                        }
                    }
                    
                    files.push({
                        id: `target:${target.id}:costume:${costumeIndex}:asset:${costume.asset.id}`,
                        name: fileName,
                        type: type,
                        content: content,
                        size: content ? content.length : 0,
                        assetType: costume.asset.assetType ? costume.asset.assetType.name : 'image',
                        costume: costume,
                        targetId: target.id,
                        costumeIndex: costumeIndex,
                        isStage: isStage
                    });
                }
            });

            // 获取声音
            const sounds = target.getSounds ? target.getSounds() : [];
            sounds.forEach((sound, soundIndex) => {
                if (sound.asset) {
                    const ext = sound.asset.dataFormat || 'wav';
                    const fileName = isStage
                        ? `stage/sounds/${sound.name}.${ext}`
                        : `${targetName}/sounds/${sound.name}.${ext}`;
                    
                    files.push({
                        id: `target:${target.id}:sound:${soundIndex}:asset:${sound.asset.id}`,
                        name: fileName,
                        type: 'sound',
                        content: sound.asset.data,
                        size: sound.asset.data ? sound.asset.data.length : 0,
                        assetType: sound.asset.assetType ? sound.asset.assetType.name : 'sound',
                        targetId: target.id,
                        isStage: isStage
                    });
                }
            });
        });

        return files;
    }

    async loadProjectFiles () {
        // 当前打开的是 .rj：直接展示 .rj 内部真实的分片文件结构，
        // 而不是把已加载的 VM 重新序列化成 sb3 视图。
        if (hasCurrentRJ()) {
            try {
                await this.loadRJFiles();
                return;
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('读取 .rj 分片失败，回退到 sb3 视图：', e);
            }
        }

        const files = this.withStoredExtraFiles(this.getProjectFiles());
        
        if (files.length > 0) {
            let content = files[0].content;
            // 如果是JSON文件，自动格式化显示
            if (files[0].type === 'json') {
                content = this.formatJSON(content);
            }
            
            this.setState({
                files: files,
                filteredFiles: files,
                currentFile: 0,
                content: content
            });
        }
    }

    /**
     * 列出当前 .rj 内部的真实分片文件（只读预览）：
     *   manifest.json、tables/*.json、targets/*.json、
     *   blocks/*.json、blocks/prebuilt/*.json、assets/*
     */
    async loadRJFiles () {
        const zip = await getCurrentRJZip();
        if (!zip) throw new Error('.rj 数据不可用');

        const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir);
        paths.sort(rjPathCompare);

        const buildFile = async path => {
            const entry = zip.file(path);
            if (!entry) return null;
            const ext = rjExtOf(path);
            // 包内不属于 .rj 格式结构的条目 = 之前新建并写到作品里的文件，
            // 读出来后按可编辑的新建文件复用
            const custom = !isStandardRJPath(path);
            const flags = custom ? {readOnly: false, custom: true} : {readOnly: true};
            try {
                if (ext === 'json') {
                    const text = await entry.async('string');
                    return {id: path, name: path, type: 'json', content: text, size: text.length, ...flags};
                }
                if (ext === 'svg') {
                    const text = await entry.async('string');
                    return {id: path, name: path, type: 'svg', content: text, size: text.length, ...flags};
                }
                if (RJ_IMAGE_EXTS.indexOf(ext) !== -1) {
                    const u8 = await entry.async('uint8array');
                    const dataURL = await uint8ArrayToDataURL(u8, RJ_IMAGE_MIME[ext] || 'image/png');
                    return {id: path, name: path, type: 'image', content: dataURL, size: u8.byteLength, ...flags};
                }
                if (ext === 'wav' || ext === 'mp3') {
                    const u8 = await entry.async('uint8array');
                    return {id: path, name: path, type: 'sound', content: u8, size: u8.byteLength, ...flags};
                }
                const text = await entry.async('string');
                return {id: path, name: path, type: 'text', content: text, size: text.length, ...flags};
            } catch (e) {
                return {
                    id: path,
                    name: path,
                    type: 'text',
                    content: this.t(messages.readFailed, {reason: e.message}),
                    size: 0,
                    ...flags
                };
            }
        };

        // 分批并行读取，避免超大作品一次性解压全部资源把内存打爆
        const results = await mapLimit(paths, 8, buildFile);
        const files = this.withStoredExtraFiles(results.filter(Boolean));

        if (files.length > 0) {
            let content = files[0].content;
            if (files[0].type === 'json') {
                content = this.formatJSON(content);
            }
            this.setState({
                files,
                filteredFiles: files,
                currentFile: 0,
                content
            });
        }
    }

    handleClose () {
        this.props.onClose();
    }

    // 界面文案统一从这里取，便于翻译
    t (descriptor, values) {
        return this.props.intl.formatMessage(descriptor, values);
    }

    handleRefresh () {
        this.loadProjectFiles();
        this.setState({ message: this.t(messages.refreshed) });
        setTimeout(() => this.setState({ message: '' }), 2000);
    }

    // 作品切换：进入新作品换 token，新作品保存出真实 id 后迁移本地文件
    handleProjectSwitch (prevId, nextId, savedNewProject) {
        const prevUnsaved = isUnsavedProjectId(prevId);
        const nextUnsaved = isUnsavedProjectId(nextId);
        if (prevUnsaved && !nextUnsaved) {
            // 只有「新作品保存后拿到 id」才迁移；打开已有作品不能继承新作品里建的文件
            if (savedNewProject) this.migrateSessionExtrasToProject(nextId);
        } else if (!prevUnsaved && nextUnsaved) {
            newProjectToken = createNewProjectToken();
        }
    }

    handleFileChange (e) {
        const content = e.target.value;
        const files = [...this.state.files];
        files[this.state.currentFile].content = content;
        this.setState({files, content}, () => {
            if (files[this.state.currentFile].custom) this.saveExtraFiles();
        });
    }

    // -----------------------------------------------------------------------
    // 新建 / 重命名文件
    // -----------------------------------------------------------------------
    getExtraStorageKey () {
        const projectId = this.props.projectId;
        if (isUnsavedProjectId(projectId)) {
            // 新作品用本次页面会话的 token，换作品后不会读到别的作品里建的文件
            return `${EXTRA_STORAGE_PREFIX}${newProjectToken}`;
        }
        return `${EXTRA_STORAGE_PREFIX}project:${projectId}`;
    }

    // 新作品保存出真实 id 后，把本次新作品里建的文件迁到该作品名下
    migrateSessionExtrasToProject (projectId) {
        if (isUnsavedProjectId(projectId)) return;
        try {
            const fromKey = `${EXTRA_STORAGE_PREFIX}${newProjectToken}`;
            const toKey = `${EXTRA_STORAGE_PREFIX}project:${projectId}`;
            const raw = localStorage.getItem(fromKey);
            if (!raw || localStorage.getItem(toKey)) return;
            localStorage.setItem(toKey, raw);
            localStorage.removeItem(fromKey);
        } catch (e) {
            // localStorage 不可用时忽略
        }
    }

    // 新建的文件不属于 sb3 / .rj 结构，按作品 id 存到本地，刷新后仍能找回
    loadStoredExtraFiles () {
        const normalize = list => {
            if (!Array.isArray(list)) return [];
            return list
                .filter(item => item && typeof item.name === 'string')
                .map((item, index) => {
                    const content = typeof item.content === 'string' ? item.content : '';
                    return {
                        id: `extra:${item.name}:${index}`,
                        name: item.name,
                        // 旧版本只存 .rfd，没有 type 字段
                        type: typeof item.type === 'string' ? item.type : 'rfd',
                        content,
                        size: content.length,
                        custom: true
                    };
                });
        };
        try {
            const raw = localStorage.getItem(this.getExtraStorageKey());
            if (raw) return normalize(JSON.parse(raw));
            // 兼容旧版本的 .rfd 存储键（只对已保存的作品生效，新作品不再复用）
            if (isUnsavedProjectId(this.props.projectId)) return [];
            const legacy = localStorage.getItem(`mw-super-refactor-rfd:${this.props.projectId}`);
            return legacy ? normalize(JSON.parse(legacy)) : [];
        } catch (e) {
            return [];
        }
    }

    withStoredExtraFiles (files) {
        const list = Array.isArray(files) ? files.slice() : [];
        const existing = {};
        list.forEach(file => {
            existing[file.name] = true;
        });
        this.loadStoredExtraFiles().forEach(file => {
            if (!existing[file.name]) list.push(file);
        });
        return list;
    }

    saveExtraFiles () {
        try {
            const stored = this.state.files
                .filter(file => file.custom)
                .map(file => ({name: file.name, type: file.type, content: file.content}));
            localStorage.setItem(this.getExtraStorageKey(), JSON.stringify(stored));
        } catch (e) {
            // 隐私模式下 localStorage 可能不可用，忽略即可
        }
    }

    filterFiles (files, query) {
        const keyword = String(query || '').toLowerCase();
        return files.filter(file => file.name.toLowerCase().includes(keyword));
    }

    // 新建文件的目录：与当前选中文件同目录
    getCurrentDirectory () {
        const current = this.state.files[this.state.currentFile];
        return splitFileName(current ? current.name : '').dir;
    }

    openCreateMenu () {
        this.setState({createMenuVisible: true});
    }

    closeCreateMenu () {
        this.setState({createMenuVisible: false});
    }

    // 按类型在当前目录下创建文件，随后文件名变成输入框等待用户命名
    handleCreateFileOfType (ext) {
        const defaults = CREATE_FILE_DEFAULTS[ext];
        if (!defaults) return;

        const files = this.state.files;
        const dir = this.getCurrentDirectory();
        const usedNames = {};
        files.forEach(file => {
            usedNames[file.name] = true;
        });
        const basePrefix = this.t(defaults.prefix);
        let prefix = basePrefix;
        let name = `${dir}${prefix}.${ext}`;
        let seq = 2;
        while (usedNames[name]) {
            prefix = `${basePrefix}${seq}`;
            name = `${dir}${prefix}.${ext}`;
            seq++;
        }

        const content = defaults.content.id ?
            this.t(defaults.content) : defaults.content;
        const newFile = {
            id: `extra:${name}:${Date.now()}`,
            name,
            type: ext,
            content,
            size: content.length,
            custom: true
        };
        const nextFiles = files.concat(newFile).map(file => Object.assign({}, file, {
            selected: file.id === newFile.id
        }));

        this.setState({
            files: nextFiles,
            filteredFiles: nextFiles,
            searchQuery: '',
            currentFile: nextFiles.findIndex(file => file.id === newFile.id),
            content,
            rfdPending: null,
            createMenuVisible: false,
            renamingFileId: newFile.id,
            renameValue: prefix
        }, () => {
            this.saveExtraFiles();
            if (this.state.useMonacoEditor && this.state.monacoIframeReady) this.sendMonacoInit();
        });
    }

    startRenameFile (fileId) {
        const file = this.state.files.find(item => item.id === fileId);
        if (!file) return;
        this.setState({
            fileContextMenu: null,
            renamingFileId: fileId,
            renameValue: filePrefixOf(file.name)
        });
    }

    handleRenameValueChange (e) {
        this.setState({renameValue: e.target.value});
    }

    handleRenameKeyDown (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.commitRename();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.setState({renamingFileId: null, renameValue: ''});
        }
    }

    // 失焦或回车提交：只改前缀，目录与扩展名保持不变
    commitRename () {
        const {renamingFileId, renameValue, files} = this.state;
        if (!renamingFileId) return;
        const index = files.findIndex(file => file.id === renamingFileId);
        if (index === -1) {
            this.setState({renamingFileId: null, renameValue: ''});
            return;
        }

        const file = files[index];
        const {dir, base} = splitFileName(file.name);
        const dotIndex = base.lastIndexOf('.');
        const ext = dotIndex > 0 ? base.substring(dotIndex + 1) : '';
        const prefix = renameValue.replace(/[\\/]/g, '').trim();
        if (!prefix || prefix === filePrefixOf(file.name)) {
            this.setState({renamingFileId: null, renameValue: ''});
            return;
        }

        const usedNames = {};
        files.forEach(item => {
            if (item.id !== file.id) usedNames[item.name] = true;
        });
        const suffix = ext ? `.${ext}` : '';
        let name = `${dir}${prefix}${suffix}`;
        let seq = 2;
        while (usedNames[name]) {
            name = `${dir}${prefix}-${seq}${suffix}`;
            seq++;
        }

        // 记住原始路径：project.json / .rj 分片改名后仍要写回原位
        const nextFiles = files.map(item => (item.id === file.id
            ? Object.assign({}, item, {name, originalName: item.originalName || item.name})
            : item));
        this.setState({
            files: nextFiles,
            filteredFiles: this.filterFiles(nextFiles, this.state.searchQuery),
            renamingFileId: null,
            renameValue: ''
        }, () => {
            if (file.custom) this.saveExtraFiles();
        });
    }

    openFileContextMenu (e, fileId) {
        e.preventDefault();
        e.stopPropagation();
        const root = this.modalRootRef.current;
        let x = e.clientX;
        let y = e.clientY;
        if (root) {
            const rect = root.getBoundingClientRect();
            x = Math.max(4, Math.min(e.clientX - rect.left, rect.width - 130));
            y = Math.max(4, Math.min(e.clientY - rect.top, rect.height - 50));
        }
        this.setState({fileContextMenu: {x, y, fileId}});
    }

    closeFileContextMenu () {
        this.setState({fileContextMenu: null});
    }

    // 文件名（重命名时变成前缀输入框 + 固定扩展名）
    // showPath：扁平列表显示完整路径，树状结构只显示文件名
    renderFileLabel (file, colors, showPath) {
        const {dir, base} = splitFileName(file.name);
        if (this.state.renamingFileId !== file.id) {
            return (
                <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {showPath ? file.name : base}
                </span>
            );
        }

        const dotIndex = base.lastIndexOf('.');
        const ext = dotIndex > 0 ? base.substring(dotIndex) : '';
        return (
            <span style={{display: 'inline-flex', alignItems: 'center', gap: '2px', minWidth: 0}}>
                {showPath && dir && (
                    <span style={{flexShrink: 0, fontSize: '11px', color: colors.textSecondary}}>{dir}</span>
                )}
                <input
                    autoFocus
                    value={this.state.renameValue}
                    onClick={e => e.stopPropagation()}
                    onChange={this.handleRenameValueChange}
                    onBlur={this.commitRename}
                    onKeyDown={this.handleRenameKeyDown}
                    onFocus={e => e.target.select()}
                    style={{
                        width: '110px',
                        minWidth: 0,
                        padding: '1px 4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: colors.text,
                        background: colors.editorBg,
                        border: '1px solid #4d97ff',
                        borderRadius: '3px',
                        outline: 'none'
                    }}
                />
                <span style={{flexShrink: 0, fontSize: '11px', color: colors.textSecondary}}>{ext}</span>
            </span>
        );
    }

    // -----------------------------------------------------------------------
    // .rfd 流程图
    // -----------------------------------------------------------------------
    setRfdMode (rfdMode) {
        if (rfdMode === this.state.rfdMode) return;
        this.setState({rfdMode, rfdPending: null});
    }

    handleRfdDisplayChange (e) {
        const rfdDisplay = e.target.value;
        const canConnect = rfdDisplay === 'both' || rfdDisplay === 'hotspot';
        this.setState({rfdDisplay, rfdPending: canConnect ? this.state.rfdPending : null});
    }

    toggleRfdLegend () {
        this.setState(prevState => ({rfdLegendOpen: !prevState.rfdLegendOpen}));
    }

    // 写回 .rfd 文本：同步内存文件、本地存储和 Monaco 内容
    updateRfdContent (nextText, done) {
        const files = [...this.state.files];
        if (!files[this.state.currentFile]) return;
        files[this.state.currentFile].content = nextText;
        this.setState({files, content: nextText}, () => {
            this.saveExtraFiles();
            if (this.state.useMonacoEditor && this.state.monacoIframeReady) {
                this.sendToMonacoIframe({type: 'monaco-set-content', content: nextText});
            }
            if (done) done();
        });
    }

    // 点热点连线：第一次点起点，第二次点终点后写回文本
    handleRfdPreviewClick (e) {
        const target = e.target;
        if (!target || typeof target.getAttribute !== 'function') return;
        const blockId = target.getAttribute('data-block-id');
        const side = target.getAttribute('data-side');
        if (!blockId || !side) return;

        const pending = this.state.rfdPending;
        if (!pending) {
            this.setState({rfdPending: {blockId, side}});
            return;
        }
        if (pending.blockId === blockId && pending.side === side) {
            this.setState({rfdPending: null});
            return;
        }

        const nextText = connectRfdHotspots(this.state.content, pending, {blockId, side});
        if (!nextText) {
            this.setState({rfdPending: {blockId, side}});
            return;
        }
        this.updateRfdContent(nextText, () => this.setState({rfdPending: null}));
    }

    handleRfdAddFlow () {
        this.setState({rfdPending: null});
        this.updateRfdContent(appendRfdFlow(this.state.content));
    }

    handleRfdClearConnections () {
        this.setState({rfdPending: null});
        this.updateRfdContent(clearRfdConnections(this.state.content));
    }

    handleRfdDownloadSvg () {
        const {svg} = renderRfdSvg(this.state.content, {
            dark: false,
            showHotspot: false,
            showId: true
        });
        const blob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const currentName = this.state.files[this.state.currentFile]
            ? this.state.files[this.state.currentFile].name
            : 'flow';
        a.download = `${currentName.replace(/\.(rjf|rfd)$/i, '') || 'flow'}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    handleEditorScroll (e) {
        const lineNumbers = e.target.parentElement.previousElementSibling;
        const syntaxHighlight = e.target.previousElementSibling;
        
        if (lineNumbers) {
            lineNumbers.scrollTop = e.target.scrollTop;
        }
        
        if (syntaxHighlight) {
            syntaxHighlight.scrollTop = e.target.scrollTop;
            syntaxHighlight.scrollLeft = e.target.scrollLeft;
        }
    }

    handleEditorKeyDown (e) {
        // 支持Tab键缩进
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const value = e.target.value;
            
            const newValue = value.substring(0, start) + '    ' + value.substring(end);
            e.target.value = newValue;
            e.target.selectionStart = e.target.selectionEnd = start + 4;
            
            this.handleFileChange({target: e.target});
        }
    }

    // 切换到 Monaco 编辑器（iframe 方式）
    setEditorVersion (useMonacoEditor) {
        if (useMonacoEditor === this.state.useMonacoEditor) return;
        this.setState(prevState => ({
            useMonacoEditor,
            monacoIframeReady: false,
            monacoIframeKey: useMonacoEditor ? prevState.monacoIframeKey + 1 : prevState.monacoIframeKey
        }), () => this.saveSettings());
    }

    openSettings () {
        this.setState({settingsVisible: true});
    }

    closeSettings () {
        this.setState({settingsVisible: false});
    }

    saveSettings () {
        try {
            localStorage.setItem(SUPER_REFACTOR_SETTINGS_KEY, JSON.stringify({
                fileViewMode: this.state.fileViewMode,
                useMonacoEditor: this.state.useMonacoEditor,
                editorOptions: this.state.editorOptions
            }));
        } catch (e) {
            // 隐私模式下 localStorage 可能不可用，忽略即可
        }
    }

    setFileViewMode (fileViewMode) {
        if (fileViewMode === this.state.fileViewMode) return;
        this.setState({fileViewMode}, () => this.saveSettings());
    }

    setEditorOption (key, value) {
        this.setState(prevState => ({
            editorOptions: Object.assign({}, prevState.editorOptions, {[key]: value})
        }), () => {
            this.saveSettings();
            this.sendMonacoOptions();
        });
    }

    resetEditorOptions () {
        this.setState({editorOptions: Object.assign({}, DEFAULT_EDITOR_OPTIONS)}, () => {
            this.saveSettings();
            this.sendMonacoOptions();
        });
    }

    // 把界面选项转换成 Monaco 的 updateOptions 参数
    getMonacoOptionPayload () {
        const options = this.state.editorOptions;
        return {
            minimap: {
                enabled: !!options.minimap,
                renderCharacters: true,
                maxColumn: 120
            },
            breadcrumbs: {
                enabled: !!options.breadcrumbs,
                showFileKind: true,
                showSymbol: true
            },
            stickyScroll: {enabled: !!options.stickyScroll},
            guides: {
                indentation: !!options.indentationGuides,
                highlightActiveIndentation: !!options.indentationGuides
            },
            folding: !!options.folding,
            foldingHighlight: !!options.folding,
            showFoldingControls: options.folding ? options.foldingControls : 'never',
            lineNumbers: options.lineNumbers ? 'on' : 'off',
            renderLineHighlight: options.highlightActiveLine ? 'all' : 'none',
            smoothScrolling: !!options.smoothScrolling,
            mouseWheelZoom: !!options.mouseWheelZoom,
            fontSize: Number(options.fontSize) || DEFAULT_EDITOR_OPTIONS.fontSize,
            tabSize: Number(options.tabSize) || DEFAULT_EDITOR_OPTIONS.tabSize,
            renderWhitespace: options.renderWhitespace || 'selection',
            wordWrap: this.state.wordWrap ? 'on' : 'off'
        };
    }

    sendMonacoOptions () {
        if (!this.state.useMonacoEditor || !this.state.monacoIframeReady) return;
        this.sendToMonacoIframe({
            type: 'monaco-set-options',
            options: this.getMonacoOptionPayload()
        });
    }

    // 向 Monaco iframe 发送初始化消息
    sendMonacoInit () {
        if (!this.state.useMonacoEditor) return;
        const {content, wordWrap} = this.state;
        const currentFileObj = this.state.files[this.state.currentFile];
        let language = 'plaintext';
        if (currentFileObj) {
            if (currentFileObj.type === 'json') language = 'json';
            else if (currentFileObj.type === 'svg') language = 'xml';
            else if (currentFileObj.type === 'md') language = 'markdown';
            else if (currentFileObj.name.endsWith('.js') || currentFileObj.name.endsWith('.jsx')) language = 'javascript';
            else if (currentFileObj.name.endsWith('.ts') || currentFileObj.name.endsWith('.tsx')) language = 'typescript';
            else if (currentFileObj.name.endsWith('.css')) language = 'css';
            else if (currentFileObj.name.endsWith('.html')) language = 'html';
        }
        const isDarkTheme = this.props.theme && typeof this.props.theme.isDark === 'function' ? this.props.theme.isDark() : false;

        this.sendToMonacoIframe({
            type: 'monaco-init',
            content: content || '',
            language: language,
            theme: isDarkTheme ? 'vs-dark' : 'vs-light',
            wordWrap: wordWrap ? 'on' : 'off',
            options: this.getMonacoOptionPayload()
        });
    }

    // 向 Monaco iframe 发送消息
    sendToMonacoIframe (data) {
        if (this.monacoIframeRef.current && this.monacoIframeRef.current.contentWindow) {
            this.monacoIframeRef.current.contentWindow.postMessage(data, '*');
        }
    }

    // 处理来自 Monaco iframe 的消息
    handleMonacoMessage (event) {
        const data = event.data;
        if (!data || !data.type) return;

        switch (data.type) {
            case 'monaco-ready': {
                // 不同 iframe 实例（切换文件类型/切换编辑器版本）会重新就绪，
                // 用 message source 区分，避免同一个 iframe 重复初始化。
                const iframeWindow = this.monacoIframeRef.current &&
                    this.monacoIframeRef.current.contentWindow;
                if (iframeWindow && event.source !== iframeWindow) break;
                if (this._monacoReadySource === event.source) break;
                this._monacoReadySource = event.source;
                this.setState({ monacoIframeReady: true }, () => {
                    this.sendMonacoInit();
                });
                break;
            }

            case 'monaco-content-change':
                if (data.content !== undefined) {
                    const files = [...this.state.files];
                    if (files[this.state.currentFile]) {
                        files[this.state.currentFile].content = data.content;
                    }
                    this.setState({ content: data.content, files }, () => {
                        if (files[this.state.currentFile] && files[this.state.currentFile].custom) {
                            this.saveExtraFiles();
                        }
                    });
                }
                break;
        }
    }

    formatJSON (jsonString) {
        if (typeof jsonString !== 'string') return jsonString;
        // vm.toJSON() 输出的已经是格式化 JSON，直接复用，避免大项目重复 parse/stringify
        if (/\n\s{2}/.test(jsonString)) return jsonString;
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return jsonString;
        }
    }

    compressJSON (jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed);
        } catch (e) {
            return jsonString;
        }
    }

    highlightSyntax (code, type) {
        if (!code) return '';
        // 大文件跳过高亮，避免生成大量 span 节点导致界面卡顿
        if (code.length > LARGE_CONTENT_THRESHOLD) {
            return String(code)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        const vsCodeColors = {
            background: '#1e1e1e',
            foreground: '#cccccc',
            comment: '#6a9955',
            keyword: '#569cd6',
            string: '#ce9178',
            number: '#b5cea8',
            functionName: '#dcdcaa',
            className: '#4ec9b0',
            attributeName: '#9cdcfe',
            tagName: '#569cd6',
            operator: '#d4d4d4',
            punctuation: '#808080',
            property: '#9cdcfe',
            meta: '#858585'
        };
        
        const escapeHtml = str => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        if (type === 'json') {
            let processed = escapeHtml(code);
            processed = processed.replace(/"([^"]+)"(?=\s*:)/g, `<span style="color: ${vsCodeColors.property};">"$1"</span>`);
            processed = processed.replace(/:\s*("[^"]*")/g, `<span style="color: ${vsCodeColors.punctuation};">:</span> <span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/:\s*(\d+\.?\d*)/g, `<span style="color: ${vsCodeColors.punctuation};">:</span> <span style="color: ${vsCodeColors.number};">$1</span>`);
            processed = processed.replace(/:\s*(true|false|null)/g, `<span style="color: ${vsCodeColors.punctuation};">:</span> <span style="color: ${vsCodeColors.keyword};">$1</span>`);
            processed = processed.replace(/\{|\}|\[|\]/g, `<span style="color: ${vsCodeColors.punctuation};">$&</span>`);
            processed = processed.replace(/,/g, `<span style="color: ${vsCodeColors.punctuation};">,</span>`);
            return processed;
        } else if (type === 'svg' || type === 'xml') {
            let processed = escapeHtml(code);
            
            processed = processed.replace(/(#[0-9a-fA-F]{3,6})/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\))/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            
            processed = processed.replace(/\b(\d+\.?\d*)\b/g, `<span style="color: ${vsCodeColors.number};">$1</span>`);
            
            processed = processed.replace(/&lt;(\w+)([^&gt;]*)&gt;/g, (match, tagName, attributes) => {
                const attrRegex = /([\w:-]+)(\s*=\s*)("[^"]*"|'[^']*'|\w+)?/g;
                let processedAttributes = attributes.replace(attrRegex, (m, name, eq, val) => {
                    let result = `<span style="color: ${vsCodeColors.attributeName};">${name}</span>`;
                    if (eq) {
                        result += `<span style="color: ${vsCodeColors.punctuation};">${eq}</span>`;
                        if (val) {
                            result += `<span style="color: ${vsCodeColors.string};">${val}</span>`;
                        }
                    }
                    return result;
                });
                
                return `<span style="color: ${vsCodeColors.tagName};">&lt;${tagName}${processedAttributes}&gt;</span>`;
            });
            
            processed = processed.replace(/&lt;\/(\w+)&gt;/g, `<span style="color: ${vsCodeColors.tagName};">&lt;/$1&gt;</span>`);
            processed = processed.replace(/&lt;\?([^&gt;]+)\?&gt;/g, `<span style="color: ${vsCodeColors.meta};">$&</span>`);
            processed = processed.replace(/&lt;\!\-\-([\s\S]*?)\-\-&gt;/g, `<span style="color: ${vsCodeColors.comment};">$&</span>`);
            
            return processed;
        } else if (type === 'html') {
            let processed = escapeHtml(code);
            
            processed = processed.replace(/&lt;(\w+)([^&gt;]*)&gt;/g, (match, tagName, attributes) => {
                const attrRegex = /([\w:-]+)(\s*=\s*)("[^"]*"|'[^']*'|\w+)?/g;
                let processedAttributes = attributes.replace(attrRegex, (m, name, eq, val) => {
                    let result = `<span style="color: ${vsCodeColors.attributeName};">${name}</span>`;
                    if (eq) {
                        result += `<span style="color: ${vsCodeColors.punctuation};">${eq}</span>`;
                        if (val) {
                            result += `<span style="color: ${vsCodeColors.string};">${val}</span>`;
                        }
                    }
                    return result;
                });
                
                return `<span style="color: ${vsCodeColors.tagName};">&lt;${tagName}${processedAttributes}&gt;</span>`;
            });
            
            processed = processed.replace(/&lt;\/(\w+)&gt;/g, `<span style="color: ${vsCodeColors.tagName};">&lt;/$1&gt;</span>`);
            processed = processed.replace(/&lt;\!\-\-([\s\S]*?)\-\-&gt;/g, `<span style="color: ${vsCodeColors.comment};">$&</span>`);
            
            const jsxRegex = /(\{[\s\S]*?\})/g;
            processed = processed.replace(jsxRegex, (match) => {
                let jsContent = match.slice(1, -1);
                jsContent = this.highlightSyntax(jsContent, 'jsx');
                return `<span style="color: ${vsCodeColors.punctuation};">{</span>${jsContent}<span style="color: ${vsCodeColors.punctuation};">}</span>`;
            });
            
            return processed;
        } else if (type === 'jsx' || type === 'javascript') {
            let processed = escapeHtml(code);
            
            const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'new', 'class', 'extends', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'with', 'delete', 'void', 'this', 'super', 'static', 'get', 'set', 'type', 'interface', 'implements', 'private', 'protected', 'public', 'abstract', 'declare', 'namespace', 'module', 'require', 'yield', 'enum', 'package', 'as', 'async', 'of', 'from'];
            
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
                processed = processed.replace(regex, `<span style="color: ${vsCodeColors.keyword};">$1</span>`);
            });
            
            processed = processed.replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, `<span style="color: ${vsCodeColors.keyword};">$1</span>`);
            processed = processed.replace(/\b(\d+\.?\d*)\b/g, `<span style="color: ${vsCodeColors.number};">$1</span>`);
            processed = processed.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(\/\/.*$)/gm, `<span style="color: ${vsCodeColors.comment};">$1</span>`);
            processed = processed.replace(/\/\*[\s\S]*?\*\//g, `<span style="color: ${vsCodeColors.comment};">$&</span>`);
            processed = processed.replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, `<span style="color: ${vsCodeColors.className};">$1</span>`);
            processed = processed.replace(/\b([a-z][a-zA-Z0-9]*)\s*(?=\()/g, `<span style="color: ${vsCodeColors.functionName};">$1</span>`);
            processed = processed.replace(/(\{|\}|\[|\]|\(|\))/g, `<span style="color: ${vsCodeColors.punctuation};">$1</span>`);
            processed = processed.replace(/(\+|\-|\*|\/|%|=|==|===|!=|!==|>|<|>=|<=|&&|\|\||!|\?:|\.)/g, `<span style="color: ${vsCodeColors.operator};">$1</span>`);
            
            return processed;
        } else if (type === 'css') {
            let processed = escapeHtml(code);
            
            processed = processed.replace(/(#[0-9a-fA-F]{3,6})/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            processed = processed.replace(/(rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\))/g, `<span style="color: ${vsCodeColors.string};">$1</span>`);
            
            processed = processed.replace(/\b([a-z-]+)\s*(?=:)/g, `<span style="color: ${vsCodeColors.property};">$1</span>`);
            processed = processed.replace(/:\s*([^;]+)/g, (match, value) => {
                let result = `<span style="color: ${vsCodeColors.punctuation};">:</span> `;
                const valueParts = value.trim().split(/(\b[\w-]+\b|\d+\.?\d*)/g);
                valueParts.forEach(part => {
                    if (/^(auto|none|inherit|initial|unset|revert|revert-layer)$/.test(part)) {
                        result += `<span style="color: ${vsCodeColors.keyword};">${part}</span>`;
                    } else if (/^\d+/.test(part)) {
                        result += `<span style="color: ${vsCodeColors.number};">${part}</span>`;
                    } else if (/^[a-z-]+$/.test(part)) {
                        result += `<span style="color: ${vsCodeColors.string};">${part}</span>`;
                    } else {
                        result += part;
                    }
                });
                return result;
            });
            
            processed = processed.replace(/\/\*[\s\S]*?\*\//g, `<span style="color: ${vsCodeColors.comment};">$&</span>`);
            processed = processed.replace(/\{\s*$/gm, `<span style="color: ${vsCodeColors.punctuation};">{</span>`);
            processed = processed.replace(/^\s*\}/gm, `<span style="color: ${vsCodeColors.punctuation};">}</span>`);
            processed = processed.replace(/;/g, `<span style="color: ${vsCodeColors.punctuation};">;</span>`);
            
            return processed;
        }
        
        return escapeHtml(code);
    }

    getLineNumbers (code) {
        // 大文件只生成一个占位，避免每行一个 div 导致 DOM 爆炸
        if ((code || '').length > LARGE_CONTENT_THRESHOLD) {
            return '<div style="padding: 0 10px; text-align: right; color: #666; font-size: 13px; line-height: 1.5;">…</div>';
        }
        const lines = (code || '').split('\n').length;
        let numbers = '';
        for (let i = 1; i <= lines; i++) {
            numbers += `<div style="padding: 0 10px; text-align: right; color: #666; font-size: 13px; line-height: 1.5;">${i}</div>`;
        }
        return numbers;
    }

    selectFile (index) {
        const {filteredFiles} = this.state;
        const selected = filteredFiles[index];
        if (!selected || !selected.id) return;

        // 用唯一 id 匹配，避免重名文件（多角色同名/同名造型）时选错
        const selectedId = selected.id;

        const files = this.state.files.map((file, i) => ({
            ...file,
            selected: file.id === selectedId
        }));

        const fullIndex = files.findIndex(f => f.id === selectedId);
        if (fullIndex === -1) return;

        let content = files[fullIndex].content;

        // 如果是JSON文件，自动格式化显示
        if (files[fullIndex].type === 'json') {
            content = this.formatJSON(content);
        }

        this.setState({
            files,
            currentFile: fullIndex,
            content: content,
            rfdPending: null
        }, () => {
            // 文件切换后更新 Monaco iframe
            if (this.state.useMonacoEditor && this.state.monacoIframeReady) {
                this.sendMonacoInit();
            }
        });
    }

    handleSearchChange (e) {
        const query = e.target.value.toLowerCase();
        const {files} = this.state;

        const filtered = files.filter(file =>
            file.name.toLowerCase().includes(query)
        );

        this.setState({
            searchQuery: e.target.value,
            filteredFiles: filtered
        });
    }

    clearSearch () {
        this.setState({
            searchQuery: '',
            filteredFiles: this.state.files
        });
    }

    // 应用修改到VM
    applyChanges () {
        const {files, currentFile} = this.state;
        const file = files[currentFile];
        if (!file) return;

        // .rj 分片文件：把修改写回 .rj 压缩包后重新载入 VM。
        // 分片不是 sb3 形态，无法像 project.json 那样直接 loadProject。
        if (file.readOnly) {
            if (hasCurrentRJ() && (file.type === 'json' || file.type === 'svg')) {
                this.applyRJShard(file);
                return;
            }
            this.setState({message: this.t(messages.readOnlyShard)});
            setTimeout(() => this.setState({message: ''}), 3000);
            return;
        }

        // 新建的本地文件：写入作品压缩包（.rj 立即写入；sb3 在下载项目时打包）
        if (file.custom) {
            this.applyCustomFile(file);
            return;
        }

        try {
            if ((file.originalName || file.name) === 'project.json') {
                // 压缩JSON回一行
                const compressedContent = this.compressJSON(file.content);
                const newData = JSON.parse(compressedContent);
                
                if (this.props.vm) {
                    this.props.vm.loadProject(newData).then(() => {
                        this.setState({ message: this.t(messages.projectUpdated) });
                        setTimeout(() => this.setState({ message: '' }), 3000);
                    }).catch(err => {
                        this.setState({ message: this.t(messages.updateFailed, {reason: err.message}) });
                        setTimeout(() => this.setState({ message: '' }), 5000);
                    });
                }
            } else if (file.type === 'svg' && file.costume && file.targetId) {
                // 更新SVG造型 - 使用存储的 targetId 和 costumeIndex 直接定位
                if (this.props.vm) {
                    const runtime = this.props.vm.runtime;
                    if (runtime) {
                        // 直接通过 targetId 找到对应的目标
                        const target = runtime.targets.find(t => t.id === file.targetId);
                        if (target) {
                            // 使用存储的 costumeIndex 或 asset.id 匹配
                            const spriteCostumes = target.sprite ? target.sprite.costumes : target.getCostumes();
                            let costumeIndex = file.costumeIndex;
                            if (typeof costumeIndex !== 'number' || !spriteCostumes[costumeIndex]) {
                                // fallback: 用 asset.id 查找
                                costumeIndex = spriteCostumes.findIndex(c => c.asset && c.asset.id === file.costume.asset.id);
                            }
                            if (typeof costumeIndex === 'number' && costumeIndex !== -1) {
                                // 把 SVG 文本转成 UTF-8 ArrayBuffer (scratch-storage Asset 期望的 data 类型)
                                const svgText = file.content;
                                const svgBytes = new TextEncoder().encode(svgText);
                                const svgArrayBuffer = svgBytes.buffer.slice(svgBytes.byteOffset, svgBytes.byteOffset + svgBytes.byteLength);

                                // 直接更新 costume asset
                                const costume = spriteCostumes[costumeIndex];
                                if (costume && costume.asset) {
                                    // 关键: setData 的第二个参数是 format，不传就会抛
                                    //   "Data provided without specifying its format"
                                    // 对 SVG 造型来说 dataFormat 固定是 'svg'
                                    if (typeof costume.asset.setData === 'function') {
                                        costume.asset.setData(svgArrayBuffer, 'svg');
                                    } else {
                                        // 直接赋值的兜底 — 同步更新 data / dataFormat / assetId
                                        costume.asset.data = svgArrayBuffer;
                                        // 如果旧 asset 已有 dataFormat 属性，强制写回 'svg'
                                        if ('dataFormat' in costume.asset) {
                                            costume.asset.dataFormat = 'svg';
                                        }
                                        // 让 scratch-storage 重新 hash 出新的 assetId / md5
                                        if (typeof costume.asset.update === 'function') {
                                            costume.asset.update();
                                        }
                                    }
                                }

                                // 强制设置 editingTarget 并尝试用 updateSvg 触发渲染更新
                                const originalEditingTarget = this.props.vm.editingTarget;
                                this.props.vm.editingTarget = target;
                                try {
                                    if (typeof target.setCostume === 'function') {
                                        target.setCostume(costumeIndex);
                                    }
                                    // 调用 updateSvg 以触发完整的更新流程 (可选, 有的 VM 版本没有)
                                    if (typeof this.props.vm.updateSvg === 'function') {
                                        this.props.vm.updateSvg(
                                            costumeIndex,
                                            svgText,
                                            file.costume.rotationCenterX,
                                            file.costume.rotationCenterY
                                        );
                                    }
                                } finally {
                                    this.props.vm.editingTarget = originalEditingTarget;
                                }

                                // 刷新舞台
                                if (typeof this.props.vm.refreshSvg === 'function') {
                                    this.props.vm.refreshSvg(costumeIndex);
                                } else if (target.renderer && typeof target.renderer.updateDrawable === 'function') {
                                    target.renderer.updateDrawable();
                                }

                                this.setState({ message: this.t(messages.svgUpdated) });
                                setTimeout(() => this.setState({ message: '' }), 3000);
                                return;
                            }
                        }
                    }
                }
                this.setState({ message: this.t(messages.costumeNotFound) });
                setTimeout(() => this.setState({ message: '' }), 5000);
            } else {
                this.setState({ message: this.t(messages.onlyJsonSvgApplicable) });
                setTimeout(() => this.setState({ message: '' }), 3000);
            }
        } catch (e) {
            this.setState({ message: this.t(messages.formatError, {reason: e.message}) });
            setTimeout(() => this.setState({ message: '' }), 5000);
        }
    }

    // 把 .rj 分片的修改写回压缩包，并用 .rj 加载器重新载入作品
    async applyRJShard (file) {
        if (!this.props.vm) return;
        try {
            // JSON 先校验，避免把损坏的分片写回后整个作品无法载入
            if (file.type === 'json') JSON.parse(file.content);

            const zip = await getCurrentRJZip();
            if (!zip) throw new Error('.rj 数据不可用');

            zip.file(file.originalName || file.name, file.content);
            const buffer = await zip.generateAsync({
                type: 'arraybuffer',
                compression: 'DEFLATE'
            });

            const {loadRJIntoVMProgressive} = await import('../lib/rj/rj-lazy-loader.js');
            await loadRJIntoVMProgressive(this.props.vm, buffer, {});

            this.setState({message: this.t(messages.shardApplied)});
            setTimeout(() => this.setState({message: ''}), 3000);
        } catch (e) {
            this.setState({message: this.t(messages.applyFailed, {reason: e.message})});
            setTimeout(() => this.setState({message: ''}), 5000);
        }
    }

    // 触发浏览器下载
    saveBlobAs (blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 新建的本地文件写入作品压缩包
    async applyCustomFile (file) {
        if (hasCurrentRJ()) {
            try {
                const zip = await getCurrentRJZip();
                if (zip) {
                    zip.file(file.name, file.content);
                    this.saveExtraFiles();
                    this.setState({message: this.t(messages.writtenToRj)});
                    setTimeout(() => this.setState({message: ''}), 3000);
                    return;
                }
            } catch (e) {
                // 写入压缩包失败时退回仅本地保存
            }
        }
        this.saveExtraFiles();
        this.setState({message: this.t(messages.writtenToProject)});
        setTimeout(() => this.setState({message: ''}), 3000);
    }

    // 下载项目
    async downloadProject () {
        const customFiles = this.state.files.filter(file => file.custom);

        // .rj 模式：有新建文件时从 zip 重新生成，保证新文件一并打包
        if (hasCurrentRJ()) {
            try {
                if (customFiles.length > 0) {
                    const zip = await getCurrentRJZip();
                    if (zip) {
                        customFiles.forEach(file => zip.file(file.name, file.content));
                        const blob = await zip.generateAsync({type: 'blob', compression: 'DEFLATE'});
                        this.saveBlobAs(blob, 'project.rj');
                        this.setState({message: this.t(messages.rjDownloadedWithExtras)});
                        setTimeout(() => this.setState({message: ''}), 3000);
                        return;
                    }
                }
                // 没有新建文件时直接下载当前 .rj 原始文件，保持分片结构不变
                const raw = getCurrentRJRaw();
                if (raw) {
                    this.saveBlobAs(new Blob([raw], {type: 'application/octet-stream'}), 'project.rj');
                    this.setState({message: this.t(messages.rjDownloaded)});
                    setTimeout(() => this.setState({message: ''}), 3000);
                }
            } catch (e) {
                this.setState({message: this.t(messages.rjDownloadFailed)});
                setTimeout(() => this.setState({message: ''}), 5000);
            }
            return;
        }

        // sb3：有新建文件时打包成完整作品，新文件作为额外条目写入
        if (customFiles.length > 0 && this.props.vm && typeof this.props.vm.saveProjectSb3 === 'function') {
            try {
                const buffer = await this.props.vm.saveProjectSb3('arraybuffer');
                const zip = await JSZip.loadAsync(buffer);
                customFiles.forEach(file => zip.file(file.name, file.content));
                const blob = await zip.generateAsync({
                    type: 'blob',
                    compression: 'DEFLATE',
                    mimeType: 'application/x.scratch.sb3'
                });
                this.saveBlobAs(blob, 'project.sb3');
                this.setState({message: this.t(messages.sb3DownloadedWithExtras)});
                setTimeout(() => this.setState({message: ''}), 3000);
                return;
            } catch (e) {
                // 打包失败时继续按原来的方式下载 project.json
            }
        }

        const {files} = this.state;
        const projectFile = files.find(f => (f.originalName || f.name) === 'project.json');

        if (projectFile) {
            try {
                const data = JSON.parse(projectFile.content);
                this.saveBlobAs(
                    new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}),
                    'project.json'
                );
                this.setState({message: this.t(messages.projectDownloaded)});
                setTimeout(() => this.setState({message: ''}), 3000);
            } catch (e) {
                this.setState({message: this.t(messages.jsonDownloadError)});
                setTimeout(() => this.setState({message: ''}), 5000);
            }
        }
    }

    // 获取文件图标（复用编辑器图标库 lucide-react）
    getFileIcon (type) {
        switch (type) {
            case 'json': return <FileCode size={14} />;
            case 'rfd': case 'rjf': return <FileCode size={14} />;
            case 'md': return <FileText size={14} />;
            case 'image': return <FileImage size={14} />;
            case 'svg': return <FileImage size={14} />;
            case 'sound': return <FileAudio size={14} />;
            default: return <File size={14} />;
        }
    }

    // 切换预览/代码模式
    toggleViewMode () {
        this.setState(prevState => ({
            viewMode: prevState.viewMode === 'preview' ? 'code' : 'preview'
        }));
    }

    // -----------------------------------------------------------------------
    // 文件树（.rj / .sb3 的文件名本身就是用 / 分隔的路径）
    // -----------------------------------------------------------------------
    buildFileTree (files) {
        const root = {name: '', path: '', folders: new Map(), files: []};

        files.forEach((file, index) => {
            const parts = String(file.name || '').split('/').filter(part => part.length > 0);
            let node = root;

            for (let i = 0; i < parts.length - 1; i++) {
                const folderName = parts[i];
                const folderPath = parts.slice(0, i + 1).join('/');
                let child = node.folders.get(folderName);
                if (!child) {
                    child = {name: folderName, path: folderPath, folders: new Map(), files: []};
                    node.folders.set(folderName, child);
                }
                node = child;
            }

            node.files.push({
                name: parts.length > 0 ? parts[parts.length - 1] : String(file.name || ''),
                file,
                index
            });
        });

        return root;
    }

    toggleFolder (path) {
        this.setState(prevState => ({
            collapsedFolders: Object.assign({}, prevState.collapsedFolders, {
                [path]: !prevState.collapsedFolders[path]
            })
        }));
    }

    renderFileTreeNodes (node, depth, forceExpand, currentFileObj, colors) {
        const rows = [];

        const folders = Array.from(node.folders.values()).sort((a, b) => {
            const rankDiff = rjPathRank(a.path) - rjPathRank(b.path);
            if (rankDiff !== 0) return rankDiff;
            return a.name.localeCompare(b.name);
        });

        folders.forEach(folder => {
            const collapsed = !forceExpand && !!this.state.collapsedFolders[folder.path];
            rows.push(
                <div
                    key={`folder:${folder.path}`}
                    onClick={() => this.toggleFolder(folder.path)}
                    title={folder.path}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: `6px 10px 6px ${10 + (depth * 14)}px`,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: colors.textSecondary,
                        userSelect: 'none'
                    }}
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    {collapsed ? <Folder size={14} /> : <FolderOpen size={14} />}
                    <span style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {folder.name}
                    </span>
                </div>
            );

            if (!collapsed) {
                rows.push(...this.renderFileTreeNodes(
                    folder, depth + 1, forceExpand, currentFileObj, colors
                ));
            }
        });

        const indent = 10 + (depth * 14) + (node.path ? 16 : 0);
        node.files.forEach(leaf => {
            const {file, index} = leaf;
            const isSelected = !!(currentFileObj && file.id === currentFileObj.id);
            rows.push(
                <div
                    key={`file:${file.id}:${index}`}
                    onClick={() => this.selectFile(index)}
                    onContextMenu={e => this.openFileContextMenu(e, file.id)}
                    title={file.name}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: `7px 10px 7px ${indent}px`,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        background: isSelected ? '#4d97ff' : 'transparent',
                        color: isSelected ? 'white' : colors.text,
                        borderBottom: `1px solid ${colors.border}`,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                    }}
                >
                    <span style={{display: 'flex', alignItems: 'center', flexShrink: 0}}>
                        {this.getFileIcon(file.type)}
                    </span>
                    <span style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center'
                    }}>{this.renderFileLabel(file, colors)}</span>
                </div>
            );
        });

        return rows;
    }

    renderFileTree (colors) {
        const {filteredFiles, currentFile, files, searchQuery} = this.state;
        const currentFileObj = files[currentFile];

        if (filteredFiles.length === 0) {
            return (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '13px'
                }}>
                    {this.t(messages.noMatchingFiles)}
                </div>
            );
        }

        const root = this.buildFileTree(filteredFiles);
        // 搜索时强制展开所有目录，保证命中的文件可见
        const forceExpand = searchQuery.length > 0;

        return this.renderFileTreeNodes(root, 0, forceExpand, currentFileObj, colors);
    }

    // -----------------------------------------------------------------------
    // 设置自由窗口
    // -----------------------------------------------------------------------
    renderSettingRadio (name, label, checked, onSelect) {
        return (
            <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 0',
                fontSize: '13px',
                cursor: 'pointer'
            }}>
                <input
                    type="radio"
                    name={name}
                    checked={checked}
                    onChange={onSelect}
                    style={{cursor: 'pointer'}}
                />
                <span>{label}</span>
            </label>
        );
    }

    renderSettingToggle (label, checked, onChange) {
        return (
            <label key={label} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '7px 0',
                fontSize: '13px',
                cursor: 'pointer'
            }}>
                <span>{label}</span>
                <input
                    type="checkbox"
                    checked={!!checked}
                    onChange={e => onChange(e.target.checked)}
                    style={{width: '16px', height: '16px', cursor: 'pointer'}}
                />
            </label>
        );
    }

    renderSettingSelect (label, value, options, onChange, colors) {
        return (
            <label key={label} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '7px 0',
                fontSize: '13px'
            }}>
                <span>{label}</span>
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{
                        padding: '4px 8px',
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: '3px',
                        background: colors.inputBg,
                        color: colors.text,
                        fontSize: '12px'
                    }}
                >
                    {options.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </label>
        );
    }

    renderSettingsWindow () {
        const {theme} = this.props;
        const isDarkTheme = theme && typeof theme.isDark === 'function' ? theme.isDark() : false;
        const colors = {
            background: isDarkTheme ? '#1E1E1E' : '#ffffff',
            text: isDarkTheme ? '#e0e0e0' : '#333333',
            textSecondary: isDarkTheme ? '#a0a0a0' : '#666666',
            border: isDarkTheme ? '#444444' : '#cccccc',
            headerBg: isDarkTheme ? '#1E1E1E' : '#f5f5f5',
            inputBg: isDarkTheme ? '#1E1E1E' : '#ffffff',
            inputBorder: isDarkTheme ? '#555555' : '#cccccc'
        };
        const {fileViewMode, useMonacoEditor, editorOptions} = this.state;

        const sectionStyle = {
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '14px',
            background: colors.headerBg
        };
        const sectionTitleStyle = {
            fontSize: '13px',
            fontWeight: 'bold',
            marginBottom: '4px',
            color: colors.text
        };

        return (
            <Modal
                id="superRefactorSettingsModal"
                contentLabel={this.t(messages.settingsTitle)}
                visible={!!this.props.visible && this.state.settingsVisible}
                className={`super-refactor-modal ${isDarkTheme ? 'dark-theme' : ''}`}
                onRequestClose={this.closeSettings}
                showHeader
                width={460}
                height={Math.min(620, window.innerHeight - 100)}
            >
                <div style={{
                    height: 'calc(100% - 40px)',
                    overflow: 'auto',
                    padding: '16px 20px',
                    boxSizing: 'border-box',
                    background: colors.background,
                    color: colors.text
                }}>
                    <div style={sectionStyle}>
                        <div style={sectionTitleStyle}>{this.t(messages.settingsFileList)}</div>
                        {this.renderSettingRadio('tree-file-view', this.t(messages.settingTreeView),
                            fileViewMode === 'tree', () => this.setFileViewMode('tree'))}
                        {this.renderSettingRadio('tree-file-view', this.t(messages.settingListView),
                            fileViewMode === 'list', () => this.setFileViewMode('list'))}
                    </div>

                    <div style={sectionStyle}>
                        <div style={sectionTitleStyle}>{this.t(messages.settingsEditorVersion)}</div>
                        {this.renderSettingRadio('editor-version', this.t(messages.settingMonacoEditor),
                            useMonacoEditor, () => this.setEditorVersion(true))}
                        {this.renderSettingRadio('editor-version', this.t(messages.settingBuiltinEditor),
                            !useMonacoEditor, () => this.setEditorVersion(false))}
                    </div>

                    {useMonacoEditor && (
                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>{this.t(messages.settingsMonacoOptions)}</div>
                            {this.renderSettingToggle(this.t(messages.settingMinimap),
                                editorOptions.minimap,
                                value => this.setEditorOption('minimap', value))}
                            {this.renderSettingToggle(this.t(messages.settingFolding),
                                editorOptions.folding,
                                value => this.setEditorOption('folding', value))}
                            {editorOptions.folding && this.renderSettingSelect(this.t(messages.settingFoldingControls),
                                editorOptions.foldingControls,
                                [
                                    {value: 'always', label: this.t(messages.settingFoldingAlways)},
                                    {value: 'mouseover', label: this.t(messages.settingFoldingMouseover)}
                                ],
                                value => this.setEditorOption('foldingControls', value),
                                colors)}
                            {this.renderSettingToggle(this.t(messages.settingBreadcrumbs),
                                editorOptions.breadcrumbs,
                                value => this.setEditorOption('breadcrumbs', value))}
                            {this.renderSettingToggle(this.t(messages.settingStickyScroll),
                                editorOptions.stickyScroll,
                                value => this.setEditorOption('stickyScroll', value))}
                            {this.renderSettingToggle(this.t(messages.settingLineNumbers),
                                editorOptions.lineNumbers,
                                value => this.setEditorOption('lineNumbers', value))}
                            {this.renderSettingToggle(this.t(messages.settingIndentGuides),
                                editorOptions.indentationGuides,
                                value => this.setEditorOption('indentationGuides', value))}
                            {this.renderSettingToggle(this.t(messages.settingHighlightActiveLine),
                                editorOptions.highlightActiveLine,
                                value => this.setEditorOption('highlightActiveLine', value))}
                            {this.renderSettingToggle(this.t(messages.settingSmoothScrolling),
                                editorOptions.smoothScrolling,
                                value => this.setEditorOption('smoothScrolling', value))}
                            {this.renderSettingToggle(this.t(messages.settingMouseWheelZoom),
                                editorOptions.mouseWheelZoom,
                                value => this.setEditorOption('mouseWheelZoom', value))}
                            {this.renderSettingSelect(this.t(messages.settingFontSize),
                                String(editorOptions.fontSize),
                                [
                                    {value: '12', label: '12'},
                                    {value: '13', label: '13'},
                                    {value: '14', label: '14'},
                                    {value: '16', label: '16'},
                                    {value: '18', label: '18'},
                                    {value: '20', label: '20'}
                                ],
                                value => this.setEditorOption('fontSize', Number(value)),
                                colors)}
                            {this.renderSettingSelect(this.t(messages.settingTabSize),
                                String(editorOptions.tabSize),
                                [
                                    {value: '2', label: '2'},
                                    {value: '4', label: '4'},
                                    {value: '8', label: '8'}
                                ],
                                value => this.setEditorOption('tabSize', Number(value)),
                                colors)}
                            {this.renderSettingSelect(this.t(messages.settingWhitespace),
                                editorOptions.renderWhitespace,
                                [
                                    {value: 'none', label: this.t(messages.settingWhitespaceNone)},
                                    {value: 'selection', label: this.t(messages.settingWhitespaceSelection)},
                                    {value: 'all', label: this.t(messages.settingWhitespaceAll)}
                                ],
                                value => this.setEditorOption('renderWhitespace', value),
                                colors)}
                            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '6px'}}>
                                <button
                                    onClick={this.resetEditorOptions}
                                    style={{
                                        padding: '4px 10px',
                                        background: 'transparent',
                                        color: colors.textSecondary,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    {this.t(messages.settingResetDefaults)}
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                        <Button onClick={this.closeSettings}>
                            {this.t(messages.done)}
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    // 纯文本编辑区：沿用超级重构当前选用的编辑器（Monaco / 内置）
    renderTextEditorPane (colors, keyPrefix) {
        const {content, wordWrap} = this.state;
        if (this.state.useMonacoEditor) {
            return (
                <iframe
                    key={`${keyPrefix}-${this.state.monacoIframeKey}`}
                    ref={this.monacoIframeRef}
                    src="/monaco-editor-iframe.html"
                    style={{
                        flex: 1,
                        minHeight: 0,
                        width: '100%',
                        border: 'none',
                        background: colors.editorBg,
                        pointerEvents: 'auto'
                    }}
                    frameBorder="0"
                />
            );
        }
        return (
            <textarea
                value={content}
                onChange={this.handleFileChange}
                onKeyDown={this.handleEditorKeyDown}
                spellCheck="false"
                style={{
                    flex: 1,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '15px',
                    fontFamily: "Consolas, 'Courier New', monospace",
                    fontSize: '13px',
                    lineHeight: '1.5',
                    resize: 'none',
                    outline: 'none',
                    border: 'none',
                    background: colors.editorBg,
                    color: colors.text,
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    wordWrap: wordWrap ? 'break-word' : 'normal',
                    overflow: 'auto'
                }}
            />
        );
    }

    // .rfd 的预览区：直接渲染 SVG，点击热点可以连线
    renderRfdPreview (colors, isDarkTheme) {
        const {content, rfdDisplay, rfdPending} = this.state;
        const showHotspot = rfdDisplay === 'both' || rfdDisplay === 'hotspot';
        const showId = rfdDisplay === 'both' || rfdDisplay === 'id';
        let rendered = {svg: '', width: 0, height: 0};
        try {
            rendered = renderRfdSvg(content, {
                dark: isDarkTheme,
                showHotspot,
                showId,
                pending: rfdPending
            });
        } catch (e) {
            rendered = {svg: '', width: 0, height: 0};
        }

        const toolbarButtonStyle = {
            padding: '4px 8px',
            background: colors.buttonBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px',
            whiteSpace: 'nowrap'
        };

        return (
            <div style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    padding: '6px 10px',
                    borderBottom: `1px solid ${colors.border}`,
                    background: colors.headerBg,
                    flexShrink: 0
                }}>
                    <select
                        value={rfdDisplay}
                        onChange={this.handleRfdDisplayChange}
                        title={this.t(messages.rfdDisplayTitle)}
                        style={{
                            padding: '4px 6px',
                            background: colors.inputBg,
                            color: colors.text,
                            border: `1px solid ${colors.inputBorder}`,
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '10px'
                        }}
                    >
                        <option value="both">{this.t(messages.rfdDisplayBoth)}</option>
                        <option value="id">{this.t(messages.rfdDisplayId)}</option>
                        <option value="hotspot">{this.t(messages.rfdDisplayHotspot)}</option>
                        <option value="none">{this.t(messages.rfdDisplayNone)}</option>
                    </select>
                    <button onClick={this.handleRfdAddFlow} style={toolbarButtonStyle}>
                        {this.t(messages.rfdAddFlow)}
                    </button>
                    <button onClick={this.handleRfdClearConnections} style={toolbarButtonStyle}>
                        {this.t(messages.rfdClearConnections)}
                    </button>
                    <button onClick={this.handleRfdDownloadSvg} style={toolbarButtonStyle}>
                        {this.t(messages.rfdDownloadSvg)}
                    </button>
                    {rfdPending && (
                        <span style={{fontSize: '11px', color: colors.textSecondary}}>
                            {this.t(messages.rfdPendingHint)}
                        </span>
                    )}
                </div>
                <div style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    padding: '20px',
                    background: isDarkTheme ? '#1b1b1b' : '#fafbfc'
                }}>
                    {rendered.svg ? (
                        <div
                            onClick={this.handleRfdPreviewClick}
                            style={{display: 'inline-block'}}
                            dangerouslySetInnerHTML={{__html: rendered.svg}}
                        />
                    ) : (
                        <div style={{color: colors.textSecondary, fontSize: '13px'}}>
                            {this.t(messages.rfdPreviewError)}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // .rfd 的语法描述，编辑和预览模式下都保留
    renderRfdLegend (colors) {
        const {rfdLegendOpen} = this.state;
        return (
            <div style={{
                flexShrink: 0,
                borderTop: `1px solid ${colors.border}`,
                background: colors.background
            }}>
                <button
                    onClick={this.toggleRfdLegend}
                    style={{
                        display: 'block',
                        width: '100%',
                        padding: '6px 14px',
                        background: 'transparent',
                        color: colors.textSecondary,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        textAlign: 'left'
                    }}
                >
                    {this.t(messages.rfdLegend)} {rfdLegendOpen ? '▾' : '▸'}
                </button>
                {rfdLegendOpen && (
                    <div style={{
                        padding: '0 14px 10px',
                        maxHeight: '30vh',
                        overflow: 'auto',
                        fontSize: '12px',
                        lineHeight: 1.9,
                        color: colors.textSecondary
                    }}>
                        {RFD_LEGEND_ITEMS.map((item, index) => (
                            <div key={item.code} style={{display: 'flex', gap: '10px'}}>
                                <code style={{
                                    flexShrink: 0,
                                    minWidth: '90px',
                                    fontFamily: 'monospace',
                                    color: colors.text
                                }}>
                                    {item.code}
                                </code>
                                <span>{this.t(messages[RFD_LEGEND_MESSAGE_KEYS[index]])}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    renderRfdEditor (colors, isDarkTheme) {
        const {rfdMode} = this.state;
        const codePane = (
            <div style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column'
            }}>
                {this.renderTextEditorPane(colors, 'monaco-rfd')}
            </div>
        );

        let body;
        if (rfdMode === 'edit') {
            body = codePane;
        } else if (rfdMode === 'preview') {
            body = this.renderRfdPreview(colors, isDarkTheme);
        } else {
            body = (
                <div style={{flex: 1, minHeight: 0, display: 'flex'}}>
                    {codePane}
                    <div style={{width: '1px', background: colors.border, flexShrink: 0}} />
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {this.renderRfdPreview(colors, isDarkTheme)}
                    </div>
                </div>
            );
        }

        return (
            <div style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${colors.border}`,
                borderRadius: '0 0 4px 4px',
                overflow: 'hidden',
                background: colors.editorBg
            }}>
                {body}
                {this.renderRfdLegend(colors)}
            </div>
        );
    }

    // Markdown 预览：复用项目里已有的 react-markdown + remark-gfm
    renderMarkdownPreview (colors, isDarkTheme) {
        const {content} = this.state;
        const codeBg = isDarkTheme ? '#2a2a2a' : '#f5f5f5';
        const borderColor = isDarkTheme ? '#3c3c3c' : '#dddddd';
        const components = {
            h1: ({children}) => (
                <h1 style={{
                    fontSize: '1.8em',
                    borderBottom: `2px solid ${borderColor}`,
                    paddingBottom: '8px',
                    margin: '0.6em 0'
                }}>{children}</h1>
            ),
            h2: ({children}) => (
                <h2 style={{
                    fontSize: '1.5em',
                    borderBottom: `1px solid ${borderColor}`,
                    paddingBottom: '6px',
                    margin: '0.6em 0'
                }}>{children}</h2>
            ),
            h3: ({children}) => <h3 style={{fontSize: '1.25em', margin: '0.6em 0'}}>{children}</h3>,
            p: ({children}) => <p style={{margin: '0.8em 0', lineHeight: 1.7}}>{children}</p>,
            code: ({inline, children}) => inline ? (
                <code style={{
                    background: codeBg,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.92em'
                }}>{children}</code>
            ) : (
                <code style={{fontFamily: 'monospace'}}>{children}</code>
            ),
            pre: ({children}) => (
                <pre style={{
                    background: codeBg,
                    padding: '12px',
                    borderRadius: '6px',
                    overflow: 'auto'
                }}>{children}</pre>
            ),
            ul: ({children}) => <ul style={{margin: '0.8em 0', paddingLeft: '24px'}}>{children}</ul>,
            ol: ({children}) => <ol style={{margin: '0.8em 0', paddingLeft: '24px'}}>{children}</ol>,
            li: ({children}) => <li style={{margin: '4px 0'}}>{children}</li>,
            blockquote: ({children}) => (
                <blockquote style={{
                    borderLeft: '4px solid #4c97ff',
                    margin: '0.8em 0',
                    padding: '8px 16px',
                    background: isDarkTheme ? '#233044' : '#f5f9ff',
                    color: colors.textSecondary
                }}>{children}</blockquote>
            ),
            a: ({href, children}) => (
                <a href={href} style={{color: '#4d97ff'}} target="_blank" rel="noopener noreferrer">{children}</a>
            ),
            table: ({children}) => (
                <table style={{borderCollapse: 'collapse', margin: '0.8em 0'}}>{children}</table>
            ),
            th: ({children}) => (
                <th style={{
                    border: `1px solid ${borderColor}`,
                    padding: '6px 10px',
                    background: codeBg
                }}>{children}</th>
            ),
            td: ({children}) => (
                <td style={{border: `1px solid ${borderColor}`, padding: '6px 10px'}}>{children}</td>
            ),
            hr: () => <hr style={{border: 'none', borderTop: `1px solid ${borderColor}`, margin: '1em 0'}} />
        };

        return (
            <div style={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                padding: '20px 24px',
                border: `1px solid ${colors.border}`,
                borderRadius: '0 0 4px 4px',
                background: colors.background,
                color: colors.text,
                fontSize: '13px',
                lineHeight: 1.7
            }}>
                {content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                        {content}
                    </ReactMarkdown>
                ) : (
                    <div style={{color: colors.textSecondary}}>{this.t(messages.mdEmpty)}</div>
                )}
            </div>
        );
    }

    render () {
        const {visible, theme} = this.props;
        const {files, currentFile, content, message, searchQuery, filteredFiles, viewMode, wordWrap, fileViewMode} = this.state;
        const currentFileObj = files[currentFile];
        const currentFileName = currentFileObj ? currentFileObj.name : '';
        // 重命名后仍按原始路径判断是否可以应用
        const currentOriginalName = currentFileObj ? (currentFileObj.originalName || currentFileObj.name) : '';
        const currentFileType = currentFileObj ? currentFileObj.type : '';
        // 大文件使用纯文本编辑器，避免高亮/行号 DOM 过多导致卡顿
        const largeContent = typeof content === 'string' && content.length > LARGE_CONTENT_THRESHOLD;

        // 判断是否为深色主题
        const isDarkTheme = theme && typeof theme.isDark === 'function' ? theme.isDark() : false;
        
        // 主题颜色
        const colors = {
            background: isDarkTheme ? '#1E1E1E' : '#ffffff',
            text: isDarkTheme ? '#e0e0e0' : '#333333',
            textSecondary: isDarkTheme ? '#a0a0a0' : '#666666',
            border: isDarkTheme ? '#3a3a3a' : '#cccccc',
            headerBg: isDarkTheme ? '#1E1E1E' : '#f5f5f5',
            inputBg: isDarkTheme ? '#1E1E1E' : '#ffffff',
            inputBorder: isDarkTheme ? '#555555' : '#cccccc',
            buttonBg: isDarkTheme ? '#1E1E1E' : '#f5f5f5',
            buttonHover: isDarkTheme ? '#1a1a1a' : '#e0e0e0',
            // 文本编辑器区域保持原有深色，不跟随窗口变成纯黑
            editorBg: isDarkTheme ? '#1e1e1e' : '#ffffff'
        };

        // 是否可以编辑
        const canEdit = currentFileType === 'json' || currentFileType === 'svg' ||
            currentFileType === 'rjf' || currentFileType === 'rfd' || currentFileType === 'md';
        // 是否可以应用（.rj 的 JSON 分片可写回压缩包后重新载入；新建的本地文件写入作品压缩包）
        const canApply = (!!currentFileObj && !!currentFileObj.custom) ||
            currentOriginalName === 'project.json' ||
            (currentFileType === 'svg' && !!currentFileObj &&
                (!!currentFileObj.costume || (currentFileObj.readOnly && hasCurrentRJ()))) ||
            (hasCurrentRJ() && currentFileType === 'json');
        // 是否是SVG文件
        const isSvg = currentFileType === 'svg';
        // 是否是 Markdown 文件
        const isMd = currentFileType === 'md' || /\.md$/i.test(currentFileName);
        // 是否是 .rfd 流程图描述文件
        const isRfd = currentFileType === 'rjf' || currentFileType === 'rfd' || isRjfFileName(currentFileName);
        // 是否显示切换按钮
        const showToggleButton = isSvg || isMd;

        // 底部按钮区样式（内联样式，避免 CSS Modules 作用域影响）
        const footerStyle = {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            flexShrink: 0,
            marginTop: '10px',
            paddingTop: '10px',
            paddingBottom: '12px',
            borderTop: `1px solid ${colors.border}`
        };
        const footerButtonStyle = {
            display: 'inline-flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            minHeight: '34px',
            padding: '7px 14px',
            boxSizing: 'border-box',
            border: `1px solid ${isDarkTheme ? '#4a4a4a' : '#b9b9b9'}`,
            borderRadius: '4px',
            background: colors.buttonBg,
            color: colors.text,
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            touchAction: 'manipulation'
        };
        const footerSettingsStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: '36px',
            height: '36px',
            padding: 0,
            boxSizing: 'border-box',
            border: `1px solid ${isDarkTheme ? '#4a4a4a' : '#b9b9b9'}`,
            borderRadius: '4px',
            background: colors.buttonBg,
            color: colors.textSecondary,
            cursor: 'pointer',
            touchAction: 'manipulation'
        };

        return (
            <Modal
                id="superRefactorModal"
                contentLabel={this.t(messages.title)}
                visible={!!visible}
                className={`super-refactor-modal ${isDarkTheme ? 'dark-theme' : ''}`}
                onRequestClose={this.handleClose}
                showHeader={false}
                width={this.state.modalWidth}
                height={this.state.modalHeight}
            >
                <div
                    ref={this.modalRootRef}
                    style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    padding: '20px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    position: 'relative',
                    background: colors.background,
                    color: colors.text
                }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                            {files.length > 0 && (
                                <div style={{
                                    fontSize: '12px',
                                    color: colors.textSecondary
                                }}>
                                    {this.t(messages.fileCount, {count: files.length})}
                                </div>
                            )}
                            {message && (
                                <div style={{
                                    padding: '8px 16px',
                                    background: message.includes('✓') ? '#4CAF50' : 
                                               message.includes('✗') ? '#f44336' : '#4d97ff',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                }}>
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        flex: 1,
                        gap: '10px',
                        marginTop: '15px',
                        minHeight: 0,
                        overflow: 'hidden'
                    }}>
                        {/* 文件列表 */}
                        <div style={{
                            width: '280px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            overflow: 'hidden',
                            background: colors.background,
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* 搜索框 */}
                            <div style={{
                                padding: '10px',
                                borderBottom: `1px solid ${colors.border}`,
                                background: colors.headerBg
                            }}>
                                <div style={{display: 'flex', gap: '5px'}}>
                                    <input
                                        type="text"
                                        placeholder={this.t(messages.searchPlaceholder)}
                                        value={searchQuery}
                                        onChange={this.handleSearchChange}
                                        style={{
                                            flex: 1,
                                            padding: '6px 10px',
                                            border: `1px solid ${colors.inputBorder}`,
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            background: colors.inputBg,
                                            color: colors.text
                                        }}
                                    />
                                    <button
                                        onClick={this.openCreateMenu}
                                        title={this.t(messages.createButtonTitle)}
                                        style={{
                                            flexShrink: 0,
                                            width: '30px',
                                            padding: '6px 0',
                                            background: colors.buttonBg,
                                            color: colors.text,
                                            border: `1px solid ${colors.inputBorder}`,
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '15px',
                                            lineHeight: 1
                                        }}
                                    >
                                        +
                                    </button>
                                    {searchQuery && (
                                        <button
                                            onClick={this.clearSearch}
                                            style={{
                                                padding: '6px 10px',
                                                background: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            {this.t(messages.clearSearch)}
                                        </button>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: colors.textSecondary,
                                    marginTop: '5px'
                                }}>
                                    {this.t(messages.filteredFileCount, {
                                        filtered: filteredFiles.length,
                                        total: files.length
                                    })}
                                </div>
                            </div>

                            {/* 文件列表：树状结构 / 旧版平铺列表 */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto'
                            }}>
                                {fileViewMode === 'tree' ? this.renderFileTree(colors) : (
                                    filteredFiles.length === 0 ? (
                                        <div style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontSize: '13px'
                                        }}>
                                            {this.t(messages.noMatchingFiles)}
                                        </div>
                                    ) : (
                                        filteredFiles.map((file, index) => {
                                            const isSelected = !!(currentFileObj && file.id === currentFileObj.id);

                                            return (
                                                <div
                                                key={index}
                                                onClick={() => this.selectFile(index)}
                                                onContextMenu={e => this.openFileContextMenu(e, file.id)}
                                                style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    background: isSelected ? '#4d97ff' : colors.background,
                                                    color: isSelected ? 'white' : colors.text,
                                                    borderBottom: `1px solid ${colors.border}`,
                                                    fontSize: '12px',
                                                    fontFamily: 'monospace',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                                title={file.name}
                                            >
                                                    <span style={{display: 'flex', alignItems: 'center', flexShrink: 0}}>
                        {this.getFileIcon(file.type)}
                    </span>
                                                    <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                        {this.renderFileLabel(file, colors, true)}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )
                                )}
                            </div>
                        </div>

                        {/* 编辑器/预览区 */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0
                        }}>
                            <div style={{
                                padding: '10px 15px',
                                background: colors.headerBg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '4px 4px 0 0',
                                borderBottom: 'none',
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color: colors.text
                            }}>
                                <span>{currentFileName}</span>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                    {currentFileObj && (
                                        <span style={{fontSize: '11px', color: colors.textSecondary}}>
                                            {currentFileObj.type === 'json' ? 'JSON' : 
                                             currentFileObj.type === 'svg' ? 'SVG' :
                                             currentFileObj.type === 'rjf' || currentFileObj.type === 'rfd' ? 'RJF' :
                                             currentFileObj.type === 'md' ? 'MD' :
                                             currentFileObj.type === 'image' ? this.t(messages.typeImage) : 
                                             currentFileObj.type === 'sound' ? this.t(messages.typeSound) :
                                             this.t(messages.typeFile)}
                                            {currentFileObj.size ? ` (${Math.round(currentFileObj.size / 1024)} KB)` : ''}
                                        </span>
                                    )}
                                    {isRfd ? (
                                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                            {[
                                                ['edit', this.t(messages.modeEdit)],
                                                ['preview', this.t(messages.modePreview)],
                                                ['both', this.t(messages.modeEditPreview)]
                                            ].map(([mode, label]) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => this.setRfdMode(mode)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: this.state.rfdMode === mode ? '#4d97ff' : colors.buttonBg,
                                                        color: this.state.rfdMode === mode ? 'white' : colors.text,
                                                        border: `1px solid ${colors.border}`,
                                                        borderRadius: '3px',
                                                        cursor: 'pointer',
                                                        fontSize: '10px',
                                                        fontWeight: this.state.rfdMode === mode ? 'bold' : 'normal'
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    ) : showToggleButton && (
                                        <button
                                            onClick={this.toggleViewMode}
                                            style={{
                                                padding: '4px 8px',
                                                background: viewMode === 'code' ? '#4d97ff' : colors.buttonBg,
                                                color: viewMode === 'code' ? 'white' : colors.text,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                fontWeight: viewMode === 'code' ? 'bold' : 'normal'
                                            }}
                                        >
                                            {viewMode === 'preview' ?
                                                this.t(messages.showCode) : this.t(messages.showPreview)}
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {isRfd ? (
                                this.renderRfdEditor(colors, isDarkTheme)
                            ) : isMd ? (
                                viewMode === 'code' ? (
                                    <div style={{
                                        flex: 1,
                                        minHeight: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '0 0 4px 4px',
                                        overflow: 'hidden'
                                    }}>
                                        {this.renderTextEditorPane(colors, 'monaco-md')}
                                    </div>
                                ) : (
                                    this.renderMarkdownPreview(colors, isDarkTheme)
                                )
                            ) : isSvg ? (
                                viewMode === 'code' ? (
                                    this.state.useMonacoEditor ? (
                                        // Monaco 编辑器 iframe
                                        <iframe
                                            key={`monaco-svg-${this.state.monacoIframeKey}`}
                                            ref={this.monacoIframeRef}
                                            src="/monaco-editor-iframe.html"
                                            style={{
                                                flex: 1,
                                                minHeight: 0,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '0 0 4px 4px',
                                                width: '100%',
                                                pointerEvents: 'auto'
                                            }}
                                            frameBorder="0"
                                        />
                                    ) : largeContent ? (
                                        <textarea
                                            value={content}
                                            onChange={this.handleFileChange}
                                            onKeyDown={this.handleEditorKeyDown}
                                            spellCheck="false"
                                            style={{
                                                flex: 1,
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                padding: '15px',
                                                fontFamily: "Consolas, 'Courier New', monospace",
                                                fontSize: '13px',
                                                lineHeight: '1.5',
                                                resize: 'none',
                                                outline: 'none',
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '0 0 4px 4px',
                                                background: colors.editorBg,
                                                color: colors.text,
                                                whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                wordWrap: wordWrap ? 'break-word' : 'normal',
                                                overflow: 'auto'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            flex: 1,
                                            display: 'flex',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0 0 4px 4px',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                background: colors.editorBg,
                                                borderRight: `1px solid ${colors.border}`,
                                                overflow: 'hidden'
                                            }} dangerouslySetInnerHTML={{ __html: this.getLineNumbers(content) }} />
                                            <div style={{
                                                flex: 1,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    padding: '15px',
                                                    fontFamily: "Consolas, 'Courier New', monospace",
                                                    fontSize: '13px',
                                                    lineHeight: '1.5',
                                                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                    wordWrap: wordWrap ? 'break-word' : 'normal',
                                                    overflow: 'auto',
                                                    pointerEvents: 'none',
                                                    color: colors.text
                                                }} dangerouslySetInnerHTML={{ __html: this.highlightSyntax(content, 'svg') }} />
                                                <textarea
                                                    value={content}
                                                    onChange={this.handleFileChange}
                                                    onKeyDown={this.handleEditorKeyDown}
                                                    onScroll={this.handleEditorScroll}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        bottom: 0,
                                                        padding: '15px',
                                                        fontFamily: "Consolas, 'Courier New', monospace",
                                                        fontSize: '13px',
                                                        lineHeight: '1.5',
                                                        resize: 'none',
                                                        outline: 'none',
                                                        background: 'transparent',
                                                        color: 'transparent',
                                                        caretColor: colors.text,
                                                        border: 'none',
                                                        whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                        wordWrap: wordWrap ? 'break-word' : 'normal',
                                                        overflow: 'auto'
                                                    }}
                                                    spellCheck="false"
                                                />
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '0 0 4px 4px',
                                        background: colors.headerBg,
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'auto',
                                            margin: '20px'
                                        }}>
                                            {content ? (
                                                <div style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '100%'
                                                }}>
                                                    <svg dangerouslySetInnerHTML={{ __html: content }} />
                                                </div>
                                            ) : (
                                                <div style={{color: '#999'}}>{this.t(messages.svgPreviewError)}</div>
                                            )}
                                        </div>
                                    </div>
                                )
                            ) : canEdit ? (
                                this.state.useMonacoEditor ? (
                                    // Monaco 编辑器 iframe
                                    <iframe
                                        key={`monaco-file-${this.state.monacoIframeKey}`}
                                        ref={this.monacoIframeRef}
                                        src="/monaco-editor-iframe.html"
                                        style={{
                                            flex: 1,
                                            minHeight: 0,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0 0 4px 4px',
                                            width: '100%',
                                            pointerEvents: 'auto'
                                        }}
                                        frameBorder="0"
                                    />
                                ) : largeContent ? (
                                    <textarea
                                        value={content}
                                        onChange={this.handleFileChange}
                                        onKeyDown={this.handleEditorKeyDown}
                                        spellCheck="false"
                                        style={{
                                            flex: 1,
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '15px',
                                            fontFamily: "Consolas, 'Courier New', monospace",
                                            fontSize: '13px',
                                            lineHeight: '1.5',
                                            resize: 'none',
                                            outline: 'none',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0 0 4px 4px',
                                            background: colors.inputBg,
                                            color: colors.text,
                                            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                            wordWrap: wordWrap ? 'break-word' : 'normal',
                                            overflow: 'auto'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '0 0 4px 4px',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        <div style={{
                                            width: '40px',
                                            background: colors.headerBg,
                                            borderRight: `1px solid ${colors.border}`,
                                            overflow: 'hidden'
                                        }} dangerouslySetInnerHTML={{ __html: this.getLineNumbers(content) }} />
                                        <div style={{
                                            flex: 1,
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                padding: '15px',
                                                fontFamily: "Consolas, 'Courier New', monospace",
                                                fontSize: '13px',
                                                lineHeight: '1.5',
                                                whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                wordWrap: wordWrap ? 'break-word' : 'normal',
                                                overflow: 'auto',
                                                pointerEvents: 'none',
                                                color: colors.text
                                            }} dangerouslySetInnerHTML={{ __html: this.highlightSyntax(content, 'json') }} />
                                            <textarea
                                                value={content}
                                                onChange={this.handleFileChange}
                                                onKeyDown={this.handleEditorKeyDown}
                                                onScroll={this.handleEditorScroll}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    padding: '15px',
                                                    fontFamily: "Consolas, 'Courier New', monospace",
                                                    fontSize: '13px',
                                                    lineHeight: '1.5',
                                                    resize: 'none',
                                                    outline: 'none',
                                                    background: 'transparent',
                                                    color: 'transparent',
                                                    caretColor: colors.text,
                                                    border: 'none',
                                                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                    wordWrap: wordWrap ? 'break-word' : 'normal',
                                                    overflow: 'auto'
                                                }}
                                                spellCheck="false"
                                            />
                                    </div>
                                </div>
                            )
                            ) : currentFileType === 'image' ? (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0 0 4px 4px',
                                    background: colors.headerBg,
                                    overflow: 'auto'
                                }}>
                                    {content ? (
                                        <img 
                                            src={content} 
                                            alt={currentFileName}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : (
                                        <div style={{color: '#999'}}>{this.t(messages.imagePreviewError)}</div>
                                    )}
                                </div>
                            ) : (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0 0 4px 4px',
                                    background: colors.headerBg,
                                    color: colors.textSecondary
                                }}>
                                    {this.t(messages.unsupportedEdit)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 按钮：固定在窗口底部 */}
                    <div
                        className="super-refactor-footer"
                        style={footerStyle}
                    >
                        <Button
                            className="super-refactor-footer-button"
                            style={footerButtonStyle}
                            onClick={this.handleRefresh}
                        >
                            {this.t(messages.refresh)}
                        </Button>
                        <Button
                            className="super-refactor-footer-button"
                            style={Object.assign({}, footerButtonStyle, {
                                opacity: canApply ? 1 : 0.5
                            })}
                            onClick={this.applyChanges}
                            disabled={!canApply}
                        >
                            {canApply ? this.t(messages.applyToProject) : this.t(messages.cannotApply)}
                        </Button>
                        <Button
                            className="super-refactor-footer-button"
                            style={footerButtonStyle}
                            onClick={this.downloadProject}
                        >
                            {this.t(messages.downloadProject)}
                        </Button>
                        <Button
                            className="super-refactor-footer-button"
                            style={footerButtonStyle}
                            onClick={this.handleClose}
                        >
                            {this.t(messages.close)}
                        </Button>
                        <button
                            className="super-refactor-footer-settings"
                            onClick={this.openSettings}
                            title={this.t(messages.settingsTitle)}
                            style={footerSettingsStyle}
                        >
                            <Settings size={17} />
                        </button>
                    </div>
                    {/* 新建文件：类型选择卡片 */}
                    {this.state.createMenuVisible && (
                        <div
                            onClick={this.closeCreateMenu}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 60
                            }}
                        >
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    width: '520px',
                                    maxWidth: '92%',
                                    background: colors.background,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '8px',
                                    padding: '18px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                                }}
                            >
                                <div style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '4px'}}>
                                    {this.t(messages.createMenuTitle)}
                                </div>
                                <div style={{fontSize: '12px', color: colors.textSecondary, marginBottom: '14px'}}>
                                    {this.t(messages.createMenuTargetDir, {
                                        dir: this.getCurrentDirectory() || this.t(messages.rootDirectory)
                                    })}
                                </div>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                    {CREATE_FILE_TYPES.map(item => (
                                        <button
                                            key={item.ext}
                                            onClick={() => this.handleCreateFileOfType(item.ext)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                padding: '12px',
                                                textAlign: 'left',
                                                background: colors.headerBg,
                                                color: colors.text,
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <span style={{display: 'flex', alignItems: 'baseline', gap: '6px'}}>
                                                <span style={{fontSize: '14px', fontWeight: 'bold'}}>{item.label}</span>
                                                <span style={{fontSize: '11px', color: '#4d97ff'}}>.{item.ext}</span>
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                color: colors.textSecondary,
                                                lineHeight: 1.5
                                            }}>
                                                {this.t(item.desc)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 文件右键菜单 */}
                    {this.state.fileContextMenu && (
                        <div
                            onClick={this.closeFileContextMenu}
                            onContextMenu={e => {
                                e.preventDefault();
                                this.closeFileContextMenu();
                            }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 70,
                                background: 'transparent'
                            }}
                        >
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    position: 'absolute',
                                    top: `${this.state.fileContextMenu.y}px`,
                                    left: `${this.state.fileContextMenu.x}px`,
                                    minWidth: '120px',
                                    background: colors.background,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '4px',
                                    padding: '4px',
                                    boxShadow: '0 6px 18px rgba(0,0,0,0.25)'
                                }}
                            >
                                <button
                                    onClick={() => this.startRenameFile(this.state.fileContextMenu.fileId)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '6px 10px',
                                        textAlign: 'left',
                                        background: 'transparent',
                                        border: 'none',
                                        color: colors.text,
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {this.t(messages.rename)}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 设置自由窗口（独立浮动窗口） */}
                {this.state.settingsVisible && this.renderSettingsWindow()}
            </Modal>
        );
    }
}

SuperRefactorModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM),
    theme: PropTypes.object,
    projectId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    loadingState: PropTypes.string,
    intl: PropTypes.object
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.superRefactorModal,
    vm: state.scratchGui.vm,
    theme: state.scratchGui.theme.theme,
    projectId: state.scratchGui.projectState.projectId,
    loadingState: state.scratchGui.projectState.loadingState
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeSuperRefactorModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(SuperRefactorModalContainer));
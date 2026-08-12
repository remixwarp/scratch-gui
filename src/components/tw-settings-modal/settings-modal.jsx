import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import Box from '../box/box.jsx';
import Modal from '../../containers/windowed-modal.jsx';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';
import {isAchievementsEnabled, setAchievementsEnabled} from '../../lib/achievements.js';
import Input from '../forms/input.jsx';
import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import DocumentationLink from '../tw-documentation-link/documentation-link.jsx';
import styles from './settings-modal.css';
import helpIcon from './help-icon.svg';
import {APP_NAME} from '../../lib/constants/brand.js';
import {AESettings} from '../../lib/settings.js';
import {
    getCustomDefaultSprite,
    setCustomDefaultSprite,
    clearCustomDefaultSprite,
    arrayBufferToBase64,
    computeRotationCenter
} from '../../lib/custom-default-sprite.js';
import storage from '../../lib/persistence/storage.js';
import {costumeUpload} from '../../lib/file-uploader.js';

import {STYLE_GROUPS, setStyleSetting} from '../../lib/mw-style-settings';
import StylePreview from './style-preview.jsx';
import SettingsStore from '../../addons/settings-store-singleton.js';
import MenuBarLayoutSetting from './menu-bar-layout.jsx';
import {DEFINITIONS as DEBUGGER_SETTINGS, getSetting as getDebuggerSetting,
    setSetting as setDebuggerSetting} from '../../lib/debugger/settings.js';
import {DEFINITIONS as VARIABLE_MANAGER_SETTINGS, getSetting as getVariableManagerSetting,
    setSetting as setVariableManagerSetting} from '../../lib/variable-manager/settings.js';
import {
    getAuthorName, getAuthorEmail, setAuthorName, setAuthorEmail,
    getDefaultBranch, setDefaultBranch, getAutoCommit, setAutoCommit
} from '../../lib/git/config.js';

import {Settings, Zap, Code, RotateCcw, ChevronDown, Blocks, Palette, PanelTop, Bug, GitBranch, Variable, Upload, Search, PanelsTopLeft} from 'lucide-react';

const BufferedInput = BufferedInputHOC(Input);

const messages = defineMessages({
    title: {
        defaultMessage: '项目设置',
        description: 'Title of settings modal',
        id: 'tw.settingsModal.title'
    },
    help: {
        defaultMessage: '点击获取帮助',
        description: 'Hover text of help icon in settings',
        id: 'tw.settingsModal.help'
    },
    headerFeatured: {
        defaultMessage: '推荐',
        description: 'Settings modal section',
        id: 'tw.settingsModal.featured'
    },
    headerRemoveLimits: {
        defaultMessage: '移除限制',
        description: 'Settings modal section',
        id: 'tw.settingsModal.removeLimits'
    },
    headerCloud: {
        defaultMessage: '云服务',
        description: 'Settings modal section',
        id: 'tw.settingsModal.cloud'
    },
    headerDangerZone: {
        defaultMessage: '危险区域',
        description: 'Settings modal section',
        id: 'tw.settingsModal.dangerZone'
    },
    headerExperimental: {
        defaultMessage: '实验性',
        id: 'mw.settings.experimental'
    },
    headerEditor: {
        defaultMessage: '编辑器',
        description: 'Settings modal section',
        id: 'tw.settingsModal.editor'
    },
    headerStage: {
        defaultMessage: '舞台',
        description: 'Settings modal section',
        id: 'tw.settingsModal.stage'
    },
    headerBlockPalette: {
        defaultMessage: '积木面板',
        description: 'Settings modal section',
        id: 'tw.settingsModal.blockPalette'
    },
    headerInterface: {
        defaultMessage: '界面',
        description: 'Settings modal section',
        id: 'tw.settingsModal.interface'
    },
    headerStyles: {
        defaultMessage: '样式',
        description: 'Settings modal section',
        id: 'tw.settingsModal.styles'
    },
    headerMenuBar: {
        defaultMessage: '菜单栏',
        description: 'Settings modal section',
        id: 'tw.settingsModal.menuBar'
    },
    headerDebugger: {
        defaultMessage: '调试器',
        description: 'Settings modal section',
        id: 'tw.settingsModal.debugger'
    },
    headerVersionControl: {
        defaultMessage: '版本控制',
        description: 'Settings modal section',
        id: 'tw.settingsModal.versionControl'
    },
    headerVariableManager: {
        defaultMessage: '变量管理器',
        description: 'Settings modal section',
        id: 'tw.settingsModal.variableManager'
    },
    // Editor page settings
    squareStageCorners: {
        defaultMessage: '方形舞台角',
        id: 'tw.settingsModal.squareStageCorners'
    },
    squareStageCornersHelp: {
        defaultMessage: '将舞台的四角变为直角而不是圆角。',
        id: 'tw.settingsModal.squareStageCornersHelp'
    },
    hideExtensionButton: {
        defaultMessage: '隐藏扩展按钮',
        id: 'tw.settingsModal.hideExtensionButton'
    },
    hideExtensionButtonHelp: {
        defaultMessage: '隐藏积木面板底部的扩展按钮。',
        id: 'tw.settingsModal.hideExtensionButtonHelp'
    },
    hideOperatorArrows: {
        defaultMessage: '隐藏运算符箭头',
        id: 'tw.settingsModal.hideOperatorArrows'
    },
    hideOperatorArrowsHelp: {
        defaultMessage: '在数字、字符串和逻辑类积木中隐藏运算符下拉箭头。',
        id: 'tw.settingsModal.hideOperatorArrowsHelp'
    },
    hideDeleteButton: {
        defaultMessage: '隐藏删除按钮',
        id: 'tw.settingsModal.hideDeleteButton'
    },
    hideDeleteButtonHelp: {
        defaultMessage: '隐藏选中积木时出现的删除按钮。',
        id: 'tw.settingsModal.hideDeleteButtonHelp'
    },
    hideBackpack: {
        defaultMessage: '隐藏背包',
        id: 'tw.settingsModal.hideBackpack'
    },
    hideBackpackHelp: {
        defaultMessage: '隐藏积木面板底部的背包按钮。',
        id: 'tw.settingsModal.hideBackpackHelp'
    },
    // Debugger settings labels (use existing i18n IDs)
    showPauseButton_label: {
        defaultMessage: '显示暂停按钮',
        id: 'mw.debugger.stagePauseButton'
    },
    showPauseButton_help: {
        defaultMessage: '在舞台上显示暂停按钮。',
        id: 'mw.debugger.stagePauseButtonHelp'
    },
    showStepButton_label: {
        defaultMessage: '显示单步执行按钮',
        id: 'mw.debugger.stageStepButton'
    },
    showStepButton_help: {
        defaultMessage: '在舞台上显示单步执行按钮。',
        id: 'mw.debugger.stageStepButtonHelp'
    },
    // Version control messages
    vcAuthorName: {
        defaultMessage: '作者名称',
        id: 'mw.settings.vc.authorName'
    },
    vcAuthorNameHelp: {
        defaultMessage: '作为提交作者，并在推送到私有仓库时用作用户名。',
        id: 'mw.settings.vc.authorNameHelp'
    },
    vcAuthorEmail: {
        defaultMessage: '作者邮箱',
        id: 'mw.settings.vc.authorEmail'
    },
    vcAuthorEmailHelp: {
        defaultMessage: '记录在您每次提交时的邮箱地址。',
        id: 'mw.settings.vc.authorEmailHelp'
    },
    vcDefaultBranch: {
        defaultMessage: '默认分支名称',
        id: 'mw.settings.vc.defaultBranch'
    },
    vcDefaultBranchHelp: {
        defaultMessage: '初始化新仓库时创建的分支。',
        id: 'mw.settings.vc.defaultBranchHelp'
    },
    vcAutoCommit: {
        defaultMessage: '保存项目时自动提交',
        id: 'mw.settings.vc.autoCommit'
    },
    vcAutoCommitHelp: {
        defaultMessage: '每次保存项目时创建一次提交，让您的历史记录保持最新。',
        id: 'mw.settings.vc.autoCommitHelp'
    },
    // Menu bar hints
    menuBarHint: {
        defaultMessage: '拖动以重新排序每组中的项目。取消勾选以隐藏。',
        id: 'mw.settingsModal.menuBarHint'
    },
    leftMenus: {
        defaultMessage: '左侧菜单',
        id: 'mw.settingsModal.leftMenus'
    },
    topRightButtons: {
        defaultMessage: '右上角按钮',
        id: 'mw.settingsModal.topRightButtons'
    },
    hatBlockCommentReminder: {
        defaultMessage: '帽子积木注释提醒',
        description: 'Hat block comment reminder label',
        id: 'tw.settingsModal.hatBlockCommentReminder'
    },
    hatBlockCommentReminderHelp: {
        defaultMessage: '当帽子积木下方连接的积木超过设定数量时，自动在旁边添加注释提醒您写注释。',
        description: 'Hat block comment reminder help',
        id: 'tw.settingsModal.hatBlockCommentReminderHelp'
    },
    hatReminderCheckInterval: {
        defaultMessage: '检测间隔（毫秒）',
        description: 'Hat reminder check interval label',
        id: 'tw.settingsModal.hatReminderCheckInterval'
    },
    hatReminderBlockThreshold: {
        defaultMessage: '积木数量阈值',
        description: 'Hat reminder block count threshold label',
        id: 'tw.settingsModal.hatReminderBlockThreshold'
    },
    hatReminderCommentText: {
        defaultMessage: '注释内容',
        description: 'Hat reminder comment text label',
        id: 'tw.settingsModal.hatReminderCommentText'
    },
    headerAE: {
        defaultMessage: 'AE 设置',
        description: 'AE Settings modal section',
        id: 'tw.settingsModal.ae'
    },
    autodisplayreadme: {
        defaultMessage: '自动显示 README',
        description: 'Auto Displat Readme label',
        id: 'tw.settingsModal.autodisplayreadme'
    },
    autodisplayreadmeHelp: {
        defaultMessage: '项目打开后，如果有一个名为 \'README\' 的角色，将自动显示该角色内的 README。',
        description: 'Auto Displat Readme label help',
        id: 'tw.settingsModal.autodisplayreadmeHelp'
    },
    enablehtmlsupportreadme: {
        defaultMessage: '启用 HTML 支持',
        description: 'Enable HTML Support in README label',
        id: 'tw.settingsModal.enablehtmlsupportreadme'
    },
    enablehtmlsupportreadmeHelp: {
        defaultMessage: '允许在 README 中使用 HTML 标签。',
        description: 'Enable HTML Support in README help',
        id: 'tw.settingsModal.enablehtmlsupportreadmeHelp'
    },
    skipcustomextwarn: {
        defaultMessage: '跳过自定义扩展警告（需刷新）',
        description: 'Skip custom extension warning label',
        id: 'tw.settingsModal.skipcustomextwarn'
    },
    skipcustomextwarnhelp: {
        defaultMessage: '项目加载时，无需依次同意每个自定义扩展请求。只需点击一次 \'全部同意\' 即可。',
        description: 'Skip custom extension warning help',
        id: 'tw.settingsModal.skipcustomextwarnhelp'
    },
    enableextensionpreview: {
        defaultMessage: '加载扩展时启用扩展预览（已弃用，需刷新）',
        description: 'extension preview label',
        id: 'tw.settingsModal.enableextensionpreview'
    },
    enableextensionpreviewhelp: {
        defaultMessage: '加载自定义扩展前，可以预览要加载的扩展。',
        description: 'extension preview help',
        id: 'tw.settingsModal.enableextensionpreviewhelp'
    },
    enablevscodelayout: {
        defaultMessage: '启用 VSCode 布局（需要刷新）',
        description: 'EnableVSCodeLayout label',
        id: 'tw.settingsModal.enablevscodelayout'
    },
    enablevscodelayouthelp: {
        defaultMessage: '将界面布局更改为类似 VSCode 的风格。',
        description: 'EnableVSCodeLayout help',
        id: 'tw.settingsModal.enablevscodelayouthelp'
    },
    enablecoblielayout: {
        defaultMessage: '启用移动布局（需要刷新）',
        description: 'EnableMobileLayout label',
        id: 'tw.settingsModal.enablecoblielayout'
    },
    enablecoblielayouthelp: {
        defaultMessage: '调整舞台和角色区域的位置，使其更适合移动设备编辑。',
        description: 'EnableMobileLayout help',
        id: 'tw.settingsModal.enablecoblielayouthelp'
    },
    enablemobiletouchdrag: {
        defaultMessage: '开启移动端模式',
        description: 'EnableMobileTouchDrag label',
        id: 'tw.settingsModal.enablemobiletouchdrag'
    },
    enablemobiletouchdraghelp: {
        defaultMessage: '开启后，所有可缩放的自由窗口（包括扩展、插件、AI窗口）都可以用手指在屏幕上进行触屏拖动。',
        description: 'EnableMobileTouchDrag help',
        id: 'tw.settingsModal.enablemobiletouchdraghelp'
    },
    aeWarning: {
        defaultMessage: '警告：部分高级设置可能需要刷新页面才能生效。如果设置未生效，请尝试刷新页面。',
        description: 'Warning about advanced settings',
        id: 'tw.settingsModal.aeWarning'
    },
    enableautoupdatecheck: {
        defaultMessage: '启用版本更新检查（需要刷新）',
        description: 'EnableAutoUpdateCheck label',
        id: 'tw.settingsModal.enableautoupdatecheck'
    },
    enableautoupdatecheckhelp: {
        defaultMessage: '打开后，每次进入编辑器时会自动检查版本更新并显示更新日志。',
        description: 'EnableAutoUpdateCheck help',
        id: 'tw.settingsModal.enableautoupdatecheckhelp'
    },
    enableblockcounter: {
        defaultMessage: '启用积木计数（需要刷新）',
        description: 'EnableBlockCounter label',
        id: 'tw.settingsModal.enableblockcounter'
    },
    enableblockcounterhelp: {
        defaultMessage: '打开后，舞台上会显示积木计数按钮。点击按钮可查看项目中各积木的使用数量统计。',
        description: 'EnableBlockCounter help',
        id: 'tw.settingsModal.enableblockcounterhelp'
    },
    enabledynamicstagebackground: {
        defaultMessage: '动态舞台背景色（需刷新）',
        description: 'EnableDynamicStageBackground label',
        id: 'tw.settingsModal.enabledynamicstagebackground'
    },
    enabledynamicstagebackgroundhelp: {
        defaultMessage: '打开后，切换深浅色主题时舞台背景色会随之变化：浅色模式为白色，深色模式为黑色。关闭后舞台背景始终为白色。',
        description: 'EnableDynamicStageBackground help',
        id: 'tw.settingsModal.enabledynamicstagebackgroundhelp'
    },
    enablestatusbar: {
        defaultMessage: '启用状态栏',
        description: 'EnableStatusBar label',
        id: 'tw.settingsModal.enablestatusbar'
    },
    enablestatusbarhelp: {
        defaultMessage: '在编辑器底部显示常驻状态栏，实时展示鼠标坐标、积木数、当前角色、FPS、运行状态和 AI 状态等信息。',
        description: 'EnableStatusBar help',
        id: 'tw.settingsModal.enablestatusbarhelp'
    },
    customdefaultsprite: {
        defaultMessage: '自定义默认角色（需刷新）',
        description: 'Custom default sprite label',
        id: 'tw.settingsModal.customdefaultsprite'
    },
    customdefaultspritehelp: {
        defaultMessage: '开启后可上传一张图片作为编辑器的默认角色，替代内置的轻盈狐。支持 SVG、PNG、JPG、BMP、WEBP、GIF 等造型可用的格式。上传后刷新编辑器即可生效。',
        description: 'Custom default sprite help',
        id: 'tw.settingsModal.customdefaultspritehelp'
    },
    customdefaultspriteupload: {
        defaultMessage: '上传角色图片',
        description: 'Custom default sprite upload button',
        id: 'tw.settingsModal.customdefaultspriteupload'
    },
    customdefaultspritename: {
        defaultMessage: '角色名称',
        description: 'Custom default sprite name input label',
        id: 'tw.settingsModal.customdefaultspritename'
    },
    customdefaultspritehint: {
        defaultMessage: '已上传自定义默认角色，请刷新编辑器页面以生效。',
        description: 'Custom default sprite refresh hint',
        id: 'tw.settingsModal.customdefaultspritehint'
    },
    customdefaultspriteuploaded: {
        defaultMessage: '已上传：{name}（{format}）',
        description: 'Custom default sprite uploaded status',
        id: 'tw.settingsModal.customdefaultspriteuploaded'
    },
    customdefaultspriteerror: {
        defaultMessage: '上传失败：{error}',
        description: 'Custom default sprite upload error',
        id: 'tw.settingsModal.customdefaultspriteerror'
    },
    customdefaultspritenameplaceholder: {
        defaultMessage: '输入角色名称',
        description: 'Custom default sprite name placeholder',
        id: 'tw.settingsModal.customdefaultspritenameplaceholder'
    }
});

const LearnMore = props => (
    <React.Fragment>
        {' '}
        <DocumentationLink {...props}>
            <FormattedMessage
                defaultMessage="Learn more."
                id="gui.alerts.cloudInfoLearnMore"
            />
        </DocumentationLink>
    </React.Fragment>
);

const Header = ({children}) => (
    <div className={styles.header}>
        {children}
        <div className={styles.divider} />
    </div>
);
Header.propTypes = {
    children: PropTypes.node
};

const SidebarItem = ({id, label, icon: Icon, isSelected, onClick}) => (
    <div
        className={classNames(styles.sidebarItem, {[styles.selected]: isSelected})}
        onClick={() => onClick(id)}
        title={label}
    >
        {Icon && <Icon className={styles.sidebarIcon} />}
        <span className={styles.sidebarLabel}>{label}</span>
    </div>
);

SidebarItem.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    onClick: PropTypes.func.isRequired,
    isSelected: PropTypes.bool
};

const SidebarGroupHeader = ({id, label, collapsed, onClick}) => (
    <button
        type="button"
        className={styles.sidebarGroupHeader}
        onClick={() => onClick(id)}
        aria-expanded={!collapsed}
    >
        <ChevronDown
            className={classNames(styles.sidebarGroupChevron, {[styles.collapsed]: collapsed})}
        />
        <span>{label}</span>
    </button>
);

SidebarGroupHeader.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    collapsed: PropTypes.bool,
    onClick: PropTypes.func.isRequired
};

class UnwrappedSetting extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickHelp'
        ]);
        this.state = {
            helpVisible: false
        };
    }
    componentDidUpdate (prevProps) {
        if (this.props.active && !prevProps.active) {
            // eslint-disable-next-line react/no-did-update-set-state
            this.setState({
                helpVisible: true
            });
        }
    }
    handleClickHelp () {
        this.setState(prevState => ({
            helpVisible: !prevState.helpVisible
        }));
    }
    render () {
        const {active, primary, secondary, help, slug, intl} = this.props;
        const {helpVisible} = this.state;

        return (
            <div
                className={classNames(styles.setting, {
                    [styles.active]: this.props.active
                })}
            >
                <div className={styles.label}>
                    {primary}
                    <button
                        className={styles.helpIcon}
                        onClick={this.handleClickHelp}
                        title={intl.formatMessage(messages.help)}
                    >
                        <img
                            src={helpIcon}
                            draggable={false}
                        />
                    </button>
                </div>
                {helpVisible && (
                    <div className={styles.detail}>
                        {help}
                        {slug && <LearnMore slug={slug} />}
                    </div>
                )}
                {secondary}
            </div>
        );
    }
}

UnwrappedSetting.propTypes = {
    intl: intlShape,
    active: PropTypes.bool,
    help: PropTypes.node,
    primary: PropTypes.node,
    secondary: PropTypes.node,
    slug: PropTypes.string
};

const Setting = injectIntl(UnwrappedSetting);

const BooleanSetting = ({ value, onChange, label, ...props }) => (
    <Setting
        {...props}
        active={value}
        primary={
            <label className={styles.label}>
                <FancyCheckbox
                    className={styles.checkbox}
                    checked={value}
                    onChange={onChange}
                />
                {label}
            </label>
        }
    />
);
BooleanSetting.propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.bool.isRequired,
    label: PropTypes.node.isRequired
};

const SquareStageCorners = ({value, onChange}) => (
    <BooleanSetting
        value={value}
        onChange={onChange}
        label="方形舞台角"
        help="将舞台的四角变为直角而不是圆角。"
    />
);
SquareStageCorners.propTypes = {
    value: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};

const HideExtensionButton = ({value, onChange}) => (
    <BooleanSetting
        value={value}
        onChange={onChange}
        label="隐藏扩展按钮"
        help="隐藏积木面板底部的扩展按钮。"
    />
);
HideExtensionButton.propTypes = {
    value: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};

const HideOperatorArrows = ({value, onChange}) => (
    <BooleanSetting
        value={value}
        onChange={onChange}
        label="隐藏运算符箭头"
        help="在数字、字符串和逻辑类积木中隐藏运算符下拉箭头。"
    />
);
HideOperatorArrows.propTypes = {
    value: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};

const HideDeleteButton = ({value, onChange}) => (
    <BooleanSetting
        value={value}
        onChange={onChange}
        label="隐藏删除按钮"
        help="隐藏选中积木时出现的删除按钮。"
    />
);
HideDeleteButton.propTypes = {
    value: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};

const HideBackpack = ({value, onChange}) => (
    <BooleanSetting
        value={value}
        onChange={onChange}
        label="隐藏背包"
        help="隐藏积木面板底部的背包按钮。"
    />
);
HideBackpack.propTypes = {
    value: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};

const DEBUGGER_LABEL_MAP = {
    stage_pause_button: {defaultMessage: '显示暂停按钮', id: 'mw.debugger.stagePauseButton'},
    stage_step_button: {defaultMessage: '显示单步执行按钮', id: 'mw.debugger.stageStepButton'},
    thread_glow: {defaultMessage: '线程光晕', id: 'mw.debugger.threadGlow'},
    log_clear_greenflag: {defaultMessage: '记录清除绿旗', id: 'mw.debugger.logClearGreenflag'},
    log_greenflag: {defaultMessage: '记录绿旗', id: 'mw.debugger.logGreenflag'},
    log_clone_create: {defaultMessage: '记录克隆创建', id: 'mw.debugger.logCloneCreate'},
    log_failed_clone_creation: {defaultMessage: '记录克隆创建失败', id: 'mw.debugger.logFailedCloneCreation'},
    log_broadcasts: {defaultMessage: '记录广播', id: 'mw.debugger.logBroadcasts'},
    fancy_graphs: {defaultMessage: '精美图表', id: 'mw.debugger.fancyGraphs'}
};

const DEBUGGER_HELP_MAP = {
    stage_pause_button: {defaultMessage: '在舞台上显示暂停按钮。', id: 'mw.debugger.stagePauseButtonHelp'},
    stage_step_button: {defaultMessage: '在舞台上显示单步执行按钮。', id: 'mw.debugger.stageStepButtonHelp'},
    thread_glow: {defaultMessage: '让当前正在执行的脚本块发光，方便调试。', id: 'mw.debugger.threadGlowHelp'},
    log_clear_greenflag: {defaultMessage: '当绿旗被清除时记录到日志。', id: 'mw.debugger.logClearGreenflagHelp'},
    log_greenflag: {defaultMessage: '当绿旗被点击时记录到日志。', id: 'mw.debugger.logGreenflagHelp'},
    log_clone_create: {defaultMessage: '当克隆被创建时记录到日志。', id: 'mw.debugger.logCloneCreateHelp'},
    log_failed_clone_creation: {defaultMessage: '当克隆创建失败时记录到日志。', id: 'mw.debugger.logFailedCloneCreationHelp'},
    log_broadcasts: {defaultMessage: '当广播被发送时记录到日志。', id: 'mw.debugger.logBroadcastsHelp'},
    fancy_graphs: {defaultMessage: '显示更精美的调试图表。', id: 'mw.debugger.fancyGraphsHelp'}
};

const DebuggerBooleanSetting = ({settingId, label, help, intl}) => {
    const [value, setValue] = React.useState(getDebuggerSetting(settingId));
    React.useEffect(() => {
        setValue(getDebuggerSetting(settingId));
    }, [settingId]);
    const handleChange = (e) => {
        setDebuggerSetting(settingId, e.target.checked);
        setValue(e.target.checked);
    };

    const labelMsg = DEBUGGER_LABEL_MAP[settingId] || {defaultMessage: label, id: label};
    const helpMsg = DEBUGGER_HELP_MAP[settingId] || (help ? {defaultMessage: help, id: help} : null);

    return (
        <Setting
            active={value}
            primary={
                <label className={styles.label}>
                    <FancyCheckbox
                        className={styles.checkbox}
                        checked={value}
                        onChange={handleChange}
                    />
                    {intl.formatMessage(labelMsg)}
                </label>
            }
            help={helpMsg ? intl.formatMessage(helpMsg) : undefined}
        />
    );
};
DebuggerBooleanSetting.propTypes = {
    settingId: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    help: PropTypes.string,
    intl: intlShape
};

const SimpleBooleanSetting = ({value, onChange, label, help, intl}) => (
    <Setting
        active={value}
        primary={
            <label className={styles.label}>
                <FancyCheckbox
                    className={styles.checkbox}
                    checked={value}
                    onChange={onChange}
                />
                {label}
            </label>
        }
        help={help}
    />
);
SimpleBooleanSetting.propTypes = {
    value: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    label: PropTypes.node,
    help: PropTypes.node,
    intl: intlShape
};

const AutoDisplayREADME = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.autodisplayreadme}
            />
        }
        help={
            <FormattedMessage
                {...messages.autodisplayreadmeHelp}
            />
        }
    />
);

const EnableHTMLSupportREADME = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.enablehtmlsupportreadme}
            />
        }
        help={
            <FormattedMessage
                {...messages.enablehtmlsupportreadmeHelp}
            />
        }
    />
);

const SkipCustomExtWarn = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.skipcustomextwarn}
            />
        }
        help={
            <FormattedMessage
                {...messages.skipcustomextwarnhelp}
            />
        }
    />
);

const EnableExtensionPreview = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.enableextensionpreview}
            />
        }
        help={
            <FormattedMessage
                {...messages.enableextensionpreviewhelp}
            />
        }
    />
);

const EnableVSCodeLayout = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.enablevscodelayout}
            />
        }
        help={
            <FormattedMessage
                {...messages.enablevscodelayouthelp}
            />
        }
    />
);

const EnableAchievements = props => (
    <BooleanSetting
        {...props}
        label="启用成就"
        help="启用后，可在工具菜单中打开成就窗口。"
    />
);

const EnableMobileLayout = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.enablecoblielayout}
            />
        }
        help={
            <FormattedMessage
                {...messages.enablecoblielayouthelp}
            />
        }
    />
);

const EnableMobileTouchDrag = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.enablemobiletouchdrag}
            />
        }
        help={
            <FormattedMessage
                {...messages.enablemobiletouchdraghelp}
            />
        }
    />
);

const EnableAutoUpdateCheck = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.enableautoupdatecheck}
            />
        }
        help={
            <FormattedMessage
                {...messages.enableautoupdatecheckhelp}
            />
        }
    />
);

const EnableBlockCounter = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.enableblockcounter}
            />
        }
        help={
            <FormattedMessage
                {...messages.enableblockcounterhelp}
            />
        }
    />
);

const EnableDynamicStageBackground = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.enabledynamicstagebackground}
            />
        }
        help={
            <FormattedMessage
                {...messages.enabledynamicstagebackgroundhelp}
            />
        }
    />
);

const EnableStatusBar = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                {...messages.enablestatusbar}
            />
        }
        help={
            <FormattedMessage
                {...messages.enablestatusbarhelp}
            />
        }
    />
);

// 自定义默认角色：开关 + 上传按钮 + 命名输入框 + 刷新提示
class CustomDefaultSprite extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleToggle',
            'handleNameChange',
            'handleUploadClick',
            'handleFileChange',
            'setFileInput'
        ]);
        const config = getCustomDefaultSprite();
        this.state = {
            enabled: config ? !!config.enabled : false,
            hasImage: !!config,
            spriteName: config ? (config.spriteName || '') : '',
            uploadedInfo: config ? {name: config.spriteName, format: config.dataFormat} : null,
            error: null,
            uploading: false
        };
    }
    handleToggle (e) {
        const checked = e.target.checked;
        const config = getCustomDefaultSprite();
        if (config) {
            setCustomDefaultSprite({...config, enabled: checked});
        }
        this.setState({enabled: checked});
        notifySettingsChange();
    }
    handleNameChange (value) {
        this.setState({spriteName: value});
        const config = getCustomDefaultSprite();
        if (config) {
            setCustomDefaultSprite({...config, spriteName: value});
        }
    }
    handleUploadClick () {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }
    setFileInput (ref) {
        this.fileInput = ref;
    }
    handleFileChange (e) {
        const fileInput = e.target;
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        fileInput.value = null;
        this.setState({uploading: true, error: null});
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result;
            const fileType = file.type;
            // 使用 costumeUpload 处理所有造型格式（svg/png/jpg/bmp/webp/gif）
            const fakeVm = {
                runtime: {
                    storage: storage,
                    stageWidth: 480,
                    stageHeight: 360
                }
            };
            costumeUpload(
                arrayBuffer,
                fileType,
                fakeVm,
                vmCostumes => {
                    const costume = vmCostumes && vmCostumes[0];
                    if (!costume || !costume.asset) {
                        this.setState({uploading: false, error: '未获取到造型数据'});
                        return;
                    }
                    const asset = costume.asset;
                    const dataFormat = costume.dataFormat;
                    const assetId = asset.assetId;
                    const bytes = asset.data;
                    if (!bytes) {
                        this.setState({uploading: false, error: '造型数据为空'});
                        return;
                    }
                    // 计算旋转中心
                    computeRotationCenter(bytes, dataFormat).then(({rotationCenterX, rotationCenterY}) => {
                        try {
                            const dataBase64 = arrayBufferToBase64(bytes);
                            const spriteName = (this.state.spriteName || file.name.replace(/\.[^.]+$/, '')).trim();
                            setCustomDefaultSprite({
                                enabled: true,
                                spriteName: spriteName,
                                assetId: assetId,
                                dataFormat: dataFormat,
                                dataBase64: dataBase64,
                                rotationCenterX: rotationCenterX,
                                rotationCenterY: rotationCenterY
                            });
                            this.setState({
                                uploading: false,
                                enabled: true,
                                hasImage: true,
                                uploadedInfo: {name: spriteName, format: dataFormat},
                                error: null
                            });
                            notifySettingsChange();
                        } catch (err) {
                            this.setState({uploading: false, error: String(err)});
                        }
                    }).catch(err => {
                        this.setState({uploading: false, error: String(err)});
                    });
                },
                err => {
                    this.setState({uploading: false, error: String(err)});
                }
            );
        };
        reader.onerror = () => {
            this.setState({uploading: false, error: '读取文件失败'});
        };
        reader.readAsArrayBuffer(file);
    }
    render () {
        const {enabled, hasImage, spriteName, uploadedInfo, error, uploading} = this.state;
        return (
            <Setting
                active={enabled}
                primary={
                    <label className={styles.label}>
                        <FancyCheckbox
                            className={styles.checkbox}
                            checked={enabled}
                            onChange={this.handleToggle}
                        />
                        <FormattedMessage {...messages.customdefaultsprite} />
                    </label>
                }
                help={
                    <FormattedMessage {...messages.customdefaultspritehelp} />
                }
                secondary={
                    <div className={styles.customSpriteSecondary}>
                        {enabled && (
                            <React.Fragment>
                                <div className={styles.customSpriteRow}>
                                    <span className={styles.customSpriteNameLabel}>
                                        <FormattedMessage {...messages.customdefaultspritename} />
                                    </span>
                                    <BufferedInput
                                        className={styles.customSpriteNameInput}
                                        value={spriteName}
                                        placeholder={this.props.intl.formatMessage(
                                            messages.customdefaultspritenameplaceholder
                                        )}
                                        onSubmit={this.handleNameChange}
                                    />
                                </div>
                                <div className={styles.customSpriteRow}>
                                    <button
                                        className={styles.button}
                                        onClick={this.handleUploadClick}
                                        disabled={uploading}
                                        type="button"
                                    >
                                        <Upload size={14} />
                                        {uploading ? '...' : <FormattedMessage {...messages.customdefaultspriteupload} />}
                                    </button>
                                    <input
                                        ref={this.setFileInput}
                                        type="file"
                                        accept=".svg, .png, .bmp, .jpg, .jpeg, .jfif, .webp, .gif, image/svg+xml, image/png, image/jpeg, image/bmp, image/webp, image/gif"
                                        onChange={this.handleFileChange}
                                        style={{display: 'none'}}
                                    />
                                </div>
                                {uploadedInfo && (
                                    <div className={styles.customSpriteStatus}>
                                        <FormattedMessage
                                            {...messages.customdefaultspriteuploaded}
                                            values={{
                                                name: uploadedInfo.name,
                                                format: uploadedInfo.format
                                            }}
                                        />
                                    </div>
                                )}
                                {hasImage && (
                                    <div className={styles.customSpriteHint}>
                                        <FormattedMessage {...messages.customdefaultspritehint} />
                                    </div>
                                )}
                                {error && (
                                    <div className={styles.warning}>
                                        <FormattedMessage
                                            {...messages.customdefaultspriteerror}
                                            values={{error: error}}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        )}
                    </div>
                }
            />
        );
    }
}
CustomDefaultSprite.propTypes = {
    intl: intlShape
};

const AEBooleanSetting = BooleanSetting;

const settingDefinitions = {
    highQualityPen: {
        label: {
            defaultMessage: 'High Quality Pen',
            description: 'High quality pen setting',
            id: 'tw.settingsModal.highQualityPen'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: 'Allows pen projects to render at higher resolutions and disables some coordinate rounding in the editor. Not all projects benefit from this setting and it may impact performance.',
            description: 'High quality pen setting help',
            id: 'tw.settingsModal.highQualityPenHelp'
        },
        slug: 'high-quality-pen'
    },
    interpolation: {
        label: {
            defaultMessage: 'Interpolation',
            description: 'Interpolation setting',
            id: 'tw.settingsModal.interpolation'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: 'Makes projects appear smoother by interpolating sprite motion. Interpolation should not be used on 3D projects, raytracers, pen projects, and laggy projects as interpolation will make them run slower without making them appear smoother.',
            description: 'Interpolation setting help',
            id: 'tw.settingsModal.interpolationHelp'
        },
        slug: 'interpolation'
    },
    infiniteClones: {
        label: {
            defaultMessage: 'Infinite Clones',
            description: 'Infinite Clones setting',
            id: 'tw.settingsModal.infiniteClones'
        },
        help: {
            defaultMessage: 'Disables Scratch\'s 300 clone limit.',
            description: 'Infinite Clones setting help',
            id: 'tw.settingsModal.infiniteClonesHelp'
        },
        slug: 'infinite-clones'
    },
    removeFencing: {
        label: {
            defaultMessage: 'Remove Fencing',
            description: 'Remove Fencing setting',
            id: 'tw.settingsModal.removeFencing'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: 'Allows sprites to move offscreen, become as large or as small as they want, and makes touching blocks work offscreen.',
            description: 'Remove Fencing setting help',
            id: 'tw.settingsModal.removeFencingHelp'
        },
        slug: 'remove-fencing'
    },
    removeMiscLimits: {
        label: {
            defaultMessage: 'Remove Miscellaneous Limits',
            description: 'Remove Miscellaneous Limits setting',
            id: 'tw.settingsModal.removeMiscLimits'
        },
        help: {
            defaultMessage: 'Removes sound effect limits and pen size limits.',
            description: 'Remove Miscellaneous Limits setting help',
            id: 'tw.settingsModal.removeMiscLimitsHelp'
        },
        slug: 'remove-misc-limits'
    },
    disableCompiler: {
        label: {
            defaultMessage: 'Disable Compiler',
            description: 'Disable Compiler setting',
            id: 'tw.settingsModal.disableCompiler'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: 'Disables the {APP_NAME} compiler. You may want to enable this while editing projects so that scripts update immediately. Otherwise, you should never enable this.',
            description: 'Disable Compiler help',
            id: 'tw.settingsModal.disableCompilerHelp'
        },
        slug: 'disable-compiler'
    },
    warpTimer: {
        label: {
            defaultMessage: 'Warp Timer',
            description: 'Warp Timer setting',
            id: 'tw.settingsModal.warpTimer'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: 'Makes scripts check if they are stuck in a long or infinite loop and run at a low framerate instead of getting stuck until the loop finishes. This fixes most crashes but has a significant performance impact, so it\'s only enabled by default in the editor.',
            description: 'Warp Timer help',
            id: 'tw.settingsModal.warpTimerHelp'
        },
        slug: 'warp-timer'
    },
    caseSensitiveLists: {
        label: {
            defaultMessage: 'Case Sensitive Lists',
            description: 'Case Sensitive Lists setting',
            id: 'tw.settingsModal.caseSensitiveLists'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: 'Makes lists case sensitive. This means that \'a\' and \'A\' are different values. This is not recommended for most projects but can improve speed massively for list heavy projects.',
            description: 'Case Sensitive Lists help',
            id: 'tw.settingsModal.caseSensitiveListsHelp'
        }
    },
    realLayerIndexes: {
        label: {
            defaultMessage: 'Real Layer Indexes',
            description: 'Real Layer Indexes label',
            id: 'tw.settingsModal.realLayerIndexes'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: 'Changes layer indexes to change the position in the render order array without limiting the number of layers to the number of drawables.',
            description: 'Real Layer Indexes help',
            id: 'tw.settingsModal.realLayerIndexesHelp'
        }
    },
    superRefactor: {
        label: {
            defaultMessage: '超级重构',
            description: 'Super Refactor setting',
            id: 'tw.settingsModal.superRefactor'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: '启用超级重构模式。启用后，您可以在代码编辑器中自由修改所有项目代码，点击编辑菜单中的超级重构按钮打开代码编辑器。',
            description: 'Super Refactor help',
            id: 'tw.settingsModal.superRefactorHelp'
        }
    },
    multiWorkspaces: {
        label: {
            defaultMessage: '多工作区',
            description: 'Multi Workspaces setting',
            id: 'tw.settingsModal.multiWorkspaces'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: '启用多工作区功能。启用后，您可以在代码编辑器中同时查看和编辑多个角色或舞台的代码，每个工作区显示为一个标签页。',
            description: 'Multi Workspaces help',
            id: 'tw.settingsModal.multiWorkspacesHelp'
        }
    },
    hatBlockCommentReminder: {
        label: {
            defaultMessage: '帽子积木注释提醒',
            description: 'Hat block comment reminder setting',
            id: 'tw.settingsModal.hatBlockCommentReminder'
        },
        help: {
            // eslint-disable-next-line max-len
            defaultMessage: '当帽子积木（事件分类）下方连接的积木超过设定数量时，会自动在旁边添加注释提醒。',
            description: 'Hat block comment reminder setting help',
            id: 'tw.settingsModal.hatBlockCommentReminderHelp'
        }
    }
};

const createBooleanSetting = (key, definition) => {
    const SettingComponent = props => (
        <BooleanSetting
            value={typeof props.value === 'undefined' ? false : props.value}
            onChange={props.onChange}
            label={<FormattedMessage {...definition.label} />}
            help={<FormattedMessage {...definition.help} />}
            slug={definition.slug}
        />
    );

    SettingComponent.propTypes = {
        value: PropTypes.bool,
        onChange: PropTypes.func.isRequired
    };

    SettingComponent.displayName = key;
    return SettingComponent;
};

const HighQualityPen = createBooleanSetting('HighQualityPen', settingDefinitions.highQualityPen);
const Interpolation = createBooleanSetting('Interpolation', settingDefinitions.interpolation);
const InfiniteClones = createBooleanSetting('InfiniteClones', settingDefinitions.infiniteClones);
const RemoveFencing = createBooleanSetting('RemoveFencing', settingDefinitions.removeFencing);
const RemoveMiscLimits = createBooleanSetting('RemoveMiscLimits', settingDefinitions.removeMiscLimits);
const WarpTimer = createBooleanSetting('WarpTimer', settingDefinitions.warpTimer);
const CaseSensitiveLists = createBooleanSetting('CaseSensitiveLists', settingDefinitions.caseSensitiveLists);
const RealLayerIndexes = createBooleanSetting('RealLayerIndexes', settingDefinitions.realLayerIndexes);
const SuperRefactor = createBooleanSetting('SuperRefactor', settingDefinitions.superRefactor);
const MultiWorkspaces = createBooleanSetting('MultiWorkspaces', settingDefinitions.multiWorkspaces);
const HatBlockCommentReminder = props => (
    <Setting
        active={props.value}
        primary={
            <label className={styles.label}>
                <FancyCheckbox
                    className={styles.checkbox}
                    checked={props.value}
                    onChange={props.onChange}
                />
                <FormattedMessage {...settingDefinitions.hatBlockCommentReminder.label} />
                <span
                    role="button"
                    tabIndex={0}
                    title="重置为默认值"
                    onClick={props.onReset}
                    onKeyDown={e => { if (e.key === 'Enter') props.onReset(); }}
                    style={{
                        cursor: 'pointer',
                        marginLeft: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        opacity: 0.6,
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
                >
                    <RotateCcw size={16} />
                </span>
            </label>
        }
        help={<FormattedMessage {...settingDefinitions.hatBlockCommentReminder.help} />}
        secondary={props.value ? (
            <div style={{marginTop: '8px', padding: '0 8px'}}>
                <div className={styles.label} style={{marginBottom: '4px'}}>
                    <FormattedMessage {...messages.hatReminderCheckInterval} />
                    <BufferedInput
                        value={props.checkInterval}
                        onSubmit={props.onCheckIntervalChange}
                        className={styles.customStageSizeInput}
                        type="number"
                        min="100"
                        max="10000"
                        step="100"
                    />
                </div>
                <div className={styles.label} style={{marginBottom: '4px'}}>
                    <FormattedMessage {...messages.hatReminderBlockThreshold} />
                    <BufferedInput
                        value={props.blockThreshold}
                        onSubmit={props.onBlockThresholdChange}
                        className={styles.customStageSizeInput}
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                    />
                </div>
                <div className={styles.label} style={{marginBottom: '4px'}}>
                    <FormattedMessage {...messages.hatReminderCommentText} />
                    <BufferedInput
                        value={props.commentText}
                        onSubmit={props.onCommentTextChange}
                        className={styles.customStageSizeInput}
                        style={{flex: 1}}
                    />
                </div>
            </div>
        ) : null}
    />
);
HatBlockCommentReminder.propTypes = {
    value: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    checkInterval: PropTypes.number,
    onCheckIntervalChange: PropTypes.func.isRequired,
    blockThreshold: PropTypes.number,
    onBlockThresholdChange: PropTypes.func.isRequired,
    commentText: PropTypes.string,
    onCommentTextChange: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired
};

const DisableCompiler = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Disable Compiler"
                description="Disable Compiler setting"
                id="tw.settingsModal.disableCompiler"
            />
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Disables the {APP_NAME} compiler. You may want to enable this while editing projects so that scripts update immediately. Otherwise, you should never enable this."
                description="Disable Compiler help"
                id="tw.settingsModal.disableCompilerHelp"
                values={{
                    APP_NAME
                }}
            />
        }
        slug="disable-compiler"
    />
);

DisableCompiler.propTypes = {
    value: PropTypes.bool,
    onChange: PropTypes.func.isRequired
};

const CloudVariableServer = props => (
    <Setting
        primary={
            <div className={classNames(styles.label, styles['cloud-variable-server'])}>
                <FormattedMessage
                    defaultMessage="Cloud Variable Server"
                    description="Cloud Variable Server setting"
                    id="tw.settingsModal.cloudVariableServer"
                />
                <BufferedInput
                    value={props.cloudVariableServer}
                    onSubmit={props.onCloudVariableServerChange}
                    className={styles['cloud-variable-server-input']}
                    type="text"
                    placeholder="ws://localhost:8000"
                />
            </div>
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Changes the server used for cloud variables. The URL must start with ws:// or wss://."
                description="Cloud Variable Server setting help"
                id="tw.settingsModal.cloudVariableServerHelp"
            />
        }
    />
);

CloudVariableServer.propTypes = {
    cloudVariableServer: PropTypes.string,
    onCloudVariableServerChange: PropTypes.func
};

const CustomFPS = ({framerate, onChange, onCustomizeFramerate}) => (
    <BooleanSetting
        value={framerate !== 30}
        onChange={onChange}
        label={
            <FormattedMessage
                defaultMessage="60 FPS (Custom FPS)"
                description="FPS setting"
                id="tw.settingsModal.fps"
            />
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Runs scripts 60 times per second instead of 30. Most projects will not work properly with this enabled. You should try Interpolation with 60 FPS mode disabled if that is the case. {customFramerate}."
                description="FPS setting help"
                id="tw.settingsModal.fpsHelp"
                values={{
                    customFramerate: (
                        <a
                            onClick={onCustomizeFramerate}
                            tabIndex="0"
                        >
                            <FormattedMessage
                                defaultMessage="Click to use a framerate other than 30 or 60"
                                description="FPS settings help"
                                id="tw.settingsModal.fpsHelp.customFramerate"
                            />
                        </a>
                    )
                }}
            />
        }
        slug="custom-fps"
    />
);

CustomFPS.propTypes = {
    framerate: PropTypes.number,
    onChange: PropTypes.func,
    onCustomizeFramerate: PropTypes.func
};

const CustomStageSize = ({
    customStageSizeEnabled,
    stageWidth,
    onStageWidthChange,
    stageHeight,
    onStageHeightChange
}) => (
    <Setting
        active={customStageSizeEnabled}
        primary={
            <div className={classNames(styles.label, styles.customStageSize)}>
                <FormattedMessage
                    defaultMessage="Custom Stage Size:"
                    description="Custom Stage Size option"
                    id="tw.settingsModal.customStageSize"
                />
                <BufferedInput
                    value={stageWidth}
                    onSubmit={onStageWidthChange}
                    className={styles.customStageSizeInput}
                    type="number"
                    min="0"
                    max="1024"
                    step="1"
                />
                <span>{'×'}</span>
                <BufferedInput
                    value={stageHeight}
                    onSubmit={onStageHeightChange}
                    className={styles.customStageSizeInput}
                    type="number"
                    min="0"
                    max="1024"
                    step="1"
                />
            </div>
        }
        secondary={
            (stageWidth >= 1000 || stageHeight >= 1000) && (
                <div className={styles.warning}>
                    <FormattedMessage
                        // eslint-disable-next-line max-len
                        defaultMessage="Using a custom stage size this large is not recommended! Instead, use a lower size with the same aspect ratio and let fullscreen mode upscale it to match the user's display."
                        description="Warning about using stages that are too large in settings modal"
                        id="tw.settingsModal.largeStageWarning"
                    />
                    <LearnMore slug="custom-stage-size" />
                </div>
            )
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Changes the size of the Scratch stage from 480x360 to something else. Try 640x360 to make the stage widescreen. Very few projects will handle this properly."
                description="Custom Stage Size option"
                id="tw.settingsModal.customStageSizeHelp"
            />
        }
        slug="custom-stage-size"
    />
);
CustomStageSize.propTypes = {
    customStageSizeEnabled: PropTypes.bool,
    stageWidth: PropTypes.number,
    onStageWidthChange: PropTypes.func,
    stageHeight: PropTypes.number,
    onStageHeightChange: PropTypes.func
};

const StoreProjectOptions = ({
    onStoreProjectOptions,
    storeThemeInProject,
    onStoreThemeInProjectChange
}) => (
    <div className={styles.setting}>
        <div>
            <button
                onClick={onStoreProjectOptions}
                className={styles.button}
            >
                <FormattedMessage
                    defaultMessage="Store settings in project"
                    description="Button in settings modal"
                    id="tw.settingsModal.storeProjectOptions"
                />
            </button>
            <p>
                <FormattedMessage
                    // eslint-disable-next-line max-len
                    defaultMessage="Stores the selected settings in the project so they will be automatically applied when {APP_NAME} loads this project. Warp timer and disable compiler will not be saved."
                    description="Help text for the store settings in project button"
                    id="tw.settingsModal.storeProjectOptionsHelp"
                    values={{
                        APP_NAME
                    }}
                />
            </p>

            <label className={styles.label}>
                <FancyCheckbox
                    className={styles.checkbox}
                    checked={storeThemeInProject}
                    onChange={onStoreThemeInProjectChange}
                />
                <FormattedMessage
                    defaultMessage="Store theme in project"
                    description="Checkbox under the store settings in project button"
                    id="mw.settingsModal.storeThemeInProject"
                />
            </label>
            <p>
                <FormattedMessage
                    // eslint-disable-next-line max-len
                    defaultMessage='When enabled, clicking "Store settings in project" will also store the current {APP_NAME} theme so it can be applied when this project is loaded.'
                    description="Help text for the store theme in project checkbox"
                    id="mw.settingsModal.storeThemeInProjectHelp"
                    values={{
                        APP_NAME
                    }}
                />
            </p>
        </div>
    </div>
);
StoreProjectOptions.propTypes = {
    onStoreProjectOptions: PropTypes.func,
    storeThemeInProject: PropTypes.bool,
    onStoreThemeInProjectChange: PropTypes.func
};

const AEsettings = new AESettings();

// Function to notify other components when settings change
const notifySettingsChange = () => {
    window.dispatchEvent(new CustomEvent('ae-settings-changed'));
};

const STYLE_OPTIONS = {
    'tab-style': [
        {value: 'mistwarp', labelId: 'mw.settingsModal.tabStyle.mistwarp', label: 'MistWarp'},
        {value: 'turbowarp', labelId: 'mw.settingsModal.tabStyle.turbowarp', label: 'TurboWarp'},
        {value: 'scratchbox', labelId: 'mw.settingsModal.tabStyle.scratchbox', label: 'ScratchBox'}
    ],
    'tab-looks': [
        {value: 'default', labelId: 'mw.settingsModal.tabLooks.default', label: '默认'},
        {value: 'icon-only', labelId: 'mw.settingsModal.tabLooks.iconOnly', label: '仅图标'},
        {value: 'text-only', labelId: 'mw.settingsModal.tabLooks.textOnly', label: '仅文字'}
    ],
    'window-style': [
        {value: 'mistwarp', labelId: 'mw.settingsModal.windowStyle.mistwarp', label: 'MistWarp'},
        {value: 'macos', labelId: 'mw.settingsModal.windowStyle.macos', label: 'macOS'},
        {value: 'windows10', labelId: 'mw.settingsModal.windowStyle.windows10', label: 'Windows 10'}
    ]
};

const getOptionCss = (groupId, value) => {
    const group = STYLE_GROUPS.find(g => g.id === groupId);
    if (!group) return null;
    const option = group.options.find(o => o.value === value);
    return option ? option.css : null;
};

const StyleOption = ({groupId, option, selected, onSelect, intl}) => (
    <button
        type="button"
        className={classNames(styles.styleOption, {[styles.styleOptionSelected]: selected})}
        onClick={() => onSelect(option.value)}
    >
        <div className={styles.stylePreview}>
            <StylePreview
                type={groupId === 'window-style' ? 'window' : 'tabs'}
                variant={option.value}
                css={getOptionCss(groupId, option.value)}
                intl={intl}
            />
        </div>
        <span className={styles.styleOptionLabel}>
            {option.label}
        </span>
    </button>
);
StyleOption.propTypes = {
    groupId: PropTypes.string.isRequired,
    option: PropTypes.shape({
        value: PropTypes.string,
        label: PropTypes.string,
        labelId: PropTypes.string
    }).isRequired,
    selected: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    intl: intlShape
};

const StyleSelect = ({groupId, label, value, onChange, intl}) => (
    <div className={styles.setting}>
        <div className={styles.label}>{label}</div>
        <div className={styles.stylePicker}>
            {STYLE_OPTIONS[groupId].map(option => (
                <StyleOption
                    key={option.value}
                    groupId={groupId}
                    option={option}
                    selected={value === option.value}
                    onSelect={onChange}
                    intl={intl}
                />
            ))}
        </div>
    </div>
);
StyleSelect.propTypes = {
    groupId: PropTypes.string.isRequired,
    label: PropTypes.node,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    intl: intlShape
};

const TabStyleSelect = props => (
    <StyleSelect
        groupId="tab-style"
        label="标签页样式"
        value={props.value}
        onChange={props.onChange}
        intl={props.intl}
    />
);
TabStyleSelect.propTypes = {value: PropTypes.string, onChange: PropTypes.func, intl: intlShape};

const TabLooksSelect = props => (
    <StyleSelect
        groupId="tab-looks"
        label="标签页外观"
        value={props.value}
        onChange={props.onChange}
        intl={props.intl}
    />
);
TabLooksSelect.propTypes = {value: PropTypes.string, onChange: PropTypes.func, intl: intlShape};

const WindowStyleSelect = props => (
    <StyleSelect
        groupId="window-style"
        label="窗口样式"
        value={props.value}
        onChange={props.onChange}
        intl={props.intl}
    />
);
WindowStyleSelect.propTypes = {value: PropTypes.string, onChange: PropTypes.func, intl: intlShape};

// ============ 布局（Layout）选择：Scratch 布局 vs VS Code 布局 ============
// 选择布局时联动以下设置：
//   Scratch 布局：标签页样式=TurboWarp、关闭多工作区、关闭状态栏、关闭 VS Code 布局、关闭角色文件列表视图
//   VS Code 布局 ：标签页样式=TurboWarp、开启多工作区、开启状态栏、开启 VS Code 布局、开启角色文件列表视图
export const applyLayout = (vscode) => {
    // 1. 标签页样式 → TurboWarp
    try { setStyleSetting('tab-style', 'turbowarp'); } catch (e) { /* ignore */ }

    // 2. 多工作区（mw:multi-workspaces）
    try {
        localStorage.setItem('mw:multi-workspaces', vscode ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('mw-settings-changed', {
            detail: {key: 'multi-workspaces', value: vscode}
        }));
    } catch (e) { /* ignore */ }

    // 3. 状态栏（EnableStatusBar）
    try { AEsettings.set('EnableStatusBar', vscode); } catch (e) { /* ignore */ }

    // 4. VS Code 布局（EnableVSCodeLayout）
    try { AEsettings.set('EnableVSCodeLayout', vscode); } catch (e) { /* ignore */ }

    // 5. 角色文件列表视图（sprite-folders addon）
    try { SettingsStore.setAddonEnabled('sprite-folders', vscode); } catch (e) { /* ignore */ }

    // 6. 通知其它组件设置已变更
    try { notifySettingsChange(); } catch (e) { /* ignore */ }

    // 7. 布局切换涉及 VS Code 布局与 addon，需要强制刷新编辑器界面才能完整生效。
    //    先尝试 location.reload()，再用 href 强制导航兜底，确保 iframe/嵌入环境也能刷新。
    setTimeout(() => {
        try {
            window.location.reload();
        } catch (e) { /* ignore */ }
        // 兜底：若 reload 未生效（例如某些嵌入环境），强制重新导航
        setTimeout(() => {
            try {
                window.location.href = window.location.href;
            } catch (e2) { /* ignore */ }
        }, 800);
    }, 500);
};

const LayoutOption = ({vscode, selected, onSelect}) => (
    <button
        type="button"
        className={classNames(styles.layoutOption, {[styles.layoutOptionSelected]: selected})}
        onClick={() => onSelect(vscode)}
    >
        <div className={styles.layoutPreview}>
            {vscode ? (
                <svg width="80" height="48" viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="18" height="47" rx="2" fill="#e9f2ff" stroke="#7aa6ff"/>
                    <rect x="5" y="5" width="9" height="5" rx="1" fill="#4C97FF"/>
                    <rect x="5" y="14" width="9" height="5" rx="1" fill="#b8d3ff"/>
                    <rect x="5" y="23" width="9" height="5" rx="1" fill="#b8d3ff"/>
                    <rect x="5" y="32" width="9" height="5" rx="1" fill="#b8d3ff"/>
                    <rect x="22" y="0.5" width="57" height="15" rx="2" fill="#f0f3f7" stroke="#c5ccd6"/>
                    <rect x="22" y="19" width="57" height="28" rx="2" fill="#f7f9fc" stroke="#c5ccd6"/>
                </svg>
            ) : (
                <svg width="80" height="48" viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="79" height="47" rx="2" fill="#f0f3f7" stroke="#c5ccd6"/>
                    <rect x="0.5" y="0.5" width="79" height="9" rx="2" fill="#e6ebf2"/>
                    <circle cx="9" cy="5" r="2" fill="#ff6b6b"/>
                    <circle cx="16" cy="5" r="2" fill="#ffd93d"/>
                    <circle cx="23" cy="5" r="2" fill="#6bcb77"/>
                    <rect x="5" y="14" width="22" height="7" rx="1.5" fill="#4C97FF"/>
                    <rect x="5" y="25" width="70" height="7" rx="1.5" fill="#b8d3ff"/>
                    <rect x="5" y="36" width="48" height="7" rx="1.5" fill="#b8d3ff"/>
                </svg>
            )}
        </div>
        <span className={styles.layoutOptionLabel}>
            {vscode ? 'VS Code 布局' : 'Scratch 布局'}
        </span>
        <span className={styles.layoutOptionDesc}>
            {vscode ? '左侧活动栏 + 右侧多标签工作区' : '经典 Scratch 界面布局'}
        </span>
    </button>
);
LayoutOption.propTypes = {
    vscode: PropTypes.bool.isRequired,
    selected: PropTypes.bool,
    onSelect: PropTypes.func.isRequired
};

const LayoutSelect = props => {
    const currentVscode = !!AEsettings.get('EnableVSCodeLayout');
    return (
        <div className={styles.setting}>
            <div className={styles.label}>{'选择布局后会自动切换相关设置'}</div>
            <div className={styles.layoutPicker}>
                <LayoutOption
                    vscode={false}
                    selected={!currentVscode}
                    onSelect={() => applyLayout(false)}
                />
                <LayoutOption
                    vscode
                    selected={currentVscode}
                    onSelect={() => applyLayout(true)}
                />
            </div>
        </div>
    );
};
LayoutSelect.propTypes = {
    intl: intlShape
};

// 设备布局（移动端 / PC 端），套用欢迎界面里的设置
const applyDeviceLayout = (device) => {
    if (device === 'mobile') {
        // 同欢迎界面 chooseDevice('mobile')：同时开启移动端布局与实验性移动端模式
        AESettings.set('EnableMobileLayout', true);
        AESettings.set('EnableMobileTouchDrag', true);
    } else {
        AESettings.set('EnableMobileLayout', false);
        AESettings.set('EnableMobileTouchDrag', false);
    }
    // 与欢迎界面一致，强制刷新使布局生效
    setTimeout(() => {
        try {
            const win = window;
            // 仅当编辑器窗口处于可卸载状态时刷新
            win.location.reload(true);
        } catch (e) {
            console.warn('Failed to reload editor for device layout:', e);
        }
    }, 500);
};

const DeviceLayoutOption = ({device, selected, onSelect}) => (
    <button
        type="button"
        className={classNames(styles.layoutOption, {[styles.layoutOptionSelected]: selected})}
        onClick={() => onSelect(device)}
    >
        <div className={styles.layoutPreview}>
            {device === 'mobile' ? (
                <svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="2" width="32" height="44" rx="4" fill="#3c3c3c" stroke="#888" strokeWidth="1.5" />
                    <rect x="8" y="7" width="24" height="30" rx="2" fill="#1e88e5" />
                    <circle cx="20" cy="42" r="2" fill="#888" />
                    <rect x="17" y="4" width="6" height="1.5" rx="0.75" fill="#888" />
                </svg>
            ) : (
                <svg width="56" height="40" viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="4" width="52" height="32" rx="3" fill="#3c3c3c" stroke="#888" strokeWidth="1.5" />
                    <rect x="6" y="8" width="20" height="24" rx="1" fill="#1e88e5" />
                    <rect x="30" y="8" width="18" height="11" rx="1" fill="#43a047" />
                    <rect x="30" y="22" width="18" height="10" rx="1" fill="#fb8c00" />
                </svg>
            )}
        </div>
        <span className={styles.layoutOptionLabel}>
            {device === 'mobile' ? '移动端布局' : 'PC 端布局'}
        </span>
        <span className={styles.layoutOptionDesc}>
            {device === 'mobile' ?
                '启用移动布局 + 触屏拖动模式' :
                '标准桌面布局，关闭移动相关设置'}
        </span>
    </button>
);
DeviceLayoutOption.propTypes = {
    device: PropTypes.oneOf(['mobile', 'pc']).isRequired,
    selected: PropTypes.bool,
    onSelect: PropTypes.func
};

const DeviceLayoutSelect = () => {
    const mobileEnabled = !!AESettings.get('EnableMobileLayout');
    const touchDragEnabled = !!AESettings.get('EnableMobileTouchDrag');
    const currentMobile = mobileEnabled && touchDragEnabled;
    return (
        <div className={styles.setting}>
            <div className={styles.label}>{'设备布局'}</div>
            <div className={styles.layoutPicker}>
                <DeviceLayoutOption
                    device="mobile"
                    selected={currentMobile}
                    onSelect={() => applyDeviceLayout('mobile')}
                />
                <DeviceLayoutOption
                    device="pc"
                    selected={!currentMobile}
                    onSelect={() => applyDeviceLayout('pc')}
                />
            </div>
        </div>
    );
};

const pageConfigurations = {
    layout: {
        sections: [
            {
                headerMessage: null,
                settings: [
                    {
                        component: LayoutSelect,
                        props: () => ({})
                    },
                    {
                        component: DeviceLayoutSelect,
                        props: () => ({})
                    }
                ]
            }
        ]
    },
    general: {
        sections: [
            {
                headerMessage: 'headerFeatured',
                settings: [
                    {
                        component: CustomFPS,
                        props: props => ({
                            framerate: props.framerate,
                            onChange: props.onFramerateChange,
                            onCustomizeFramerate: props.onCustomizeFramerate
                        })
                    },
                    {
                        component: Interpolation,
                        props: props => ({
                            value: props.interpolation,
                            onChange: props.onInterpolationChange
                        })
                    },
                    {
                        component: HighQualityPen,
                        props: props => ({
                            value: props.highQualityPen,
                            onChange: props.onHighQualityPenChange
                        })
                    },
                    {
                        component: WarpTimer,
                        props: props => ({
                            value: props.warpTimer,
                            onChange: props.onWarpTimerChange
                        })
                    }
                ]
            },
            {
                headerMessage: 'headerRemoveLimits',
                settings: [
                    {
                        component: InfiniteClones,
                        props: props => ({
                            value: props.infiniteClones,
                            onChange: props.onInfiniteClonesChange
                        })
                    },
                    {
                        component: RemoveFencing,
                        props: props => ({
                            value: props.removeFencing,
                            onChange: props.onRemoveFencingChange
                        })
                    },
                    {
                        component: RemoveMiscLimits,
                        props: props => ({
                            value: props.removeLimits,
                            onChange: props.onRemoveLimitsChange
                        })
                    },
                    {
                        component: DisableCompiler,
                        props: props => ({
                            value: props.disableCompiler,
                            onChange: props.onDisableCompilerChange
                        })
                    }
                ]
            },
            {
                headerMessage: 'headerCloud',
                settings: [
                    {
                        component: CloudVariableServer,
                        props: props => ({
                            cloudVariableServer: props.cloudVariableServer,
                            onCloudVariableServerChange: props.onCloudVariableServerChange
                        })
                    }
                ]
            },
            {
                headerMessage: 'headerDangerZone',
                settings: [
                    {
                        component: CustomStageSize,
                        props: props => props,
                        condition: props => !props.isEmbedded
                    },
                    {
                        component: StoreProjectOptions,
                        props: props => props,
                        condition: props => !props.isEmbedded
                    }
                ]
            }
        ]
    },
    experimental: {
        sections: [
            {
                headerMessage: 'headerExperimental',
                settings: [
                    {
                        component: RealLayerIndexes,
                        props: props => ({
                            value: props.realLayerIndexes,
                            onChange: props.onRealLayerIndexesChange
                        })
                    },
                    {
                        component: CaseSensitiveLists,
                        props: props => ({
                            value: props.caseSensitiveLists,
                            onChange: props.onCaseSensitiveListsChange
                        })
                    },
                    {
                        component: SuperRefactor,
                        props: props => ({
                            value: props.superRefactor,
                            onChange: props.onSuperRefactorChange
                        })
                    },
                    {
                        component: MultiWorkspaces,
                        props: props => ({
                            value: props.multiWorkspaces,
                            onChange: props.onMultiWorkspacesChange
                        })
                    },
                    {
                        component: HatBlockCommentReminder,
                        props: props => ({
                            value: props.hatBlockCommentReminder,
                            onChange: props.onHatBlockCommentReminderChange,
                            checkInterval: props.hatReminderCheckInterval,
                            onCheckIntervalChange: props.onHatReminderCheckIntervalChange,
                            blockThreshold: props.hatReminderBlockThreshold,
                            onBlockThresholdChange: props.onHatReminderBlockThresholdChange,
                            commentText: props.hatReminderCommentText,
                            onCommentTextChange: props.onHatReminderCommentTextChange,
                            onReset: props.onHatReminderReset
                        })
                    },
                    {
                        component: EnableMobileTouchDrag,
                        props: props => ({
                            value: AEsettings.get('EnableMobileTouchDrag') || false,
                            onChange: (e) => { AEsettings.set("EnableMobileTouchDrag", e.target.checked); notifySettingsChange(); location.reload(); }
                        })
                    },
                    {
                        component: EnableAutoUpdateCheck,
                        props: props => ({
                            value: AEsettings.get('enableAutoUpdateCheck') || false,
                            onChange: (e) => { AEsettings.set("enableAutoUpdateCheck", e.target.checked); notifySettingsChange(); location.reload(); }
                        })
                    },
                    {
                        component: EnableBlockCounter,
                        props: props => ({
                            value: AEsettings.get('EnableBlockCounter') || false,
                            onChange: (e) => { AEsettings.set("EnableBlockCounter", e.target.checked); notifySettingsChange(); location.reload(); }
                        })
                    },
                    {
                        component: EnableDynamicStageBackground,
                        props: props => ({
                            value: AEsettings.get('EnableDynamicStageBackground') || false,
                            onChange: (e) => { AEsettings.set("EnableDynamicStageBackground", e.target.checked); notifySettingsChange(); location.reload(); }
                        })
                    },
                    {
                        component: EnableStatusBar,
                        props: props => ({
                            value: AEsettings.get('EnableStatusBar') || false,
                            onChange: (e) => { AEsettings.set("EnableStatusBar", e.target.checked); notifySettingsChange(); }
                        })
                    },
                    {
                        component: EnableAchievements,
                        props: () => ({
                            value: isAchievementsEnabled(),
                            onChange: e => setAchievementsEnabled(e.target.checked)
                        })
                    },
                    {
                        component: CustomDefaultSprite,
                        props: () => ({})
                    }
                ]
            }
        ]
    },
    ae: {
        sections: [
            {
                headerMessage: 'headerAE',
                settings: [
                    {
                        component: AutoDisplayREADME,
                        props: props => ({
                            value: AEsettings.get('enableREADMEAutoDisplay') || false,
                            onChange: (e) => { 
                                AEsettings.set("enableREADMEAutoDisplay", e.target.checked); 
                                notifySettingsChange(); 
                                // 显示刷新提示并刷新页面
                                location.reload();
                            }
                        })
                    },
                    {
                        component: EnableHTMLSupportREADME,
                        props: props => ({
                            value: AEsettings.get('enableHTMLSupportInREADME') || false,
                            onChange: (e) => { 
                                AEsettings.set("enableHTMLSupportInREADME", e.target.checked); 
                                notifySettingsChange(); 
                                // 显示刷新提示并刷新页面
                                location.reload();
                            }
                        })
                    },
                    {
                        component: SkipCustomExtWarn,
                        props: props => ({
                            value: AEsettings.get('skipExtWarn') || false,
                            onChange: (e) => { AEsettings.set("skipExtWarn", e.target.checked); notifySettingsChange(); location.reload(); }
                        })
                    },
                    {
                        component: EnableExtensionPreview,
                        props: props => ({
                            value: AEsettings.get('EnableExtensionPreview') || false,
                            onChange: (e) => { AEsettings.set("EnableExtensionPreview", e.target.checked); notifySettingsChange(); location.reload(); }
                        })
                    },
                    {
                        component: EnableVSCodeLayout,
                        props: props => ({
                            value: AEsettings.get('EnableVSCodeLayout') || false,
                            onChange: (e) => { AEsettings.set("EnableVSCodeLayout", e.target.checked); notifySettingsChange(); location.reload(); }
                        })
                    },
                    {
                        component: EnableMobileLayout,
                        props: props => ({
                            value: AEsettings.get('EnableMobileLayout') || false,
                            onChange: (e) => { AEsettings.set("EnableMobileLayout", e.target.checked); notifySettingsChange(); location.reload(); }
                        })
                    }
                ]
            },
            {
                settings: [
                    {
                        component: () => (
                            <div style={{
                                backgroundColor: '#ffebee',
                                color: '#c62828',
                                padding: '12px',
                                borderRadius: '6px',
                                marginTop: '20px',
                                border: '1px solid #ffcdd2'
                            }}>
                                警告：部分高级设置可能需要刷新页面才能生效。如果设置未生效，请尝试刷新页面。
                            </div>
                        ),
                        props: () => ({})
                    }
                ]
            }
        ]
    },
    editor: {
        sections: [
            {
                headerMessage: 'headerStage',
                settings: [
                    {
                        component: DebuggerBooleanSetting,
                        props: () => ({
                            settingId: 'stage_pause_button',
                            label: '显示暂停按钮',
                            help: '在舞台上显示暂停按钮。'
                        })
                    },
                    {
                        component: DebuggerBooleanSetting,
                        props: () => ({
                            settingId: 'stage_step_button',
                            label: '显示单步执行按钮',
                            help: '在舞台上显示单步执行按钮。'
                        })
                    },
                    {
                        component: SquareStageCorners,
                        props: props => ({
                            value: props.squareStageCorners,
                            onChange: props.onSquareStageCornersChange,
                            intl: props.intl
                        })
                    }
                ]
            },
            {
                headerMessage: 'headerBlockPalette',
                settings: [
                    {
                        component: HideExtensionButton,
                        props: props => ({
                            value: props.hideExtensionButton,
                            onChange: props.onHideExtensionButtonChange,
                            intl: props.intl
                        })
                    },
                    {
                        component: HideOperatorArrows,
                        props: props => ({
                            value: props.hideOperatorArrows,
                            onChange: props.onHideOperatorArrowsChange,
                            intl: props.intl
                        })
                    }
                ]
            },
            {
                headerMessage: 'headerInterface',
                settings: [
                    {
                        component: HideDeleteButton,
                        props: props => ({
                            value: props.hideDeleteButton,
                            onChange: props.onHideDeleteButtonChange,
                            intl: props.intl
                        })
                    },
                    {
                        component: HideBackpack,
                        props: props => ({
                            value: props.hideBackpack,
                            onChange: props.onHideBackpackChange,
                            intl: props.intl
                        })
                    }
                ]
            }
        ]
    },
    styles: {
        sections: [
            {
                headerMessage: 'headerStyles',
                settings: [
                    {
                        component: TabStyleSelect,
                        props: props => ({
                            value: props.tabStyle,
                            onChange: props.onTabStyleChange,
                            intl: props.intl
                        })
                    },
                    {
                        component: TabLooksSelect,
                        props: props => ({
                            value: props.tabLooks,
                            onChange: props.onTabLooksChange,
                            intl: props.intl
                        })
                    },
                    {
                        component: WindowStyleSelect,
                        props: props => ({
                            value: props.windowStyle,
                            onChange: props.onWindowStyleChange,
                            intl: props.intl
                        })
                    }
                ]
            }
        ]
    },
    menuBar: {
        sections: [
            {
                headerMessage: 'headerMenuBar',
                settings: [
                    {
                        component: MenuBarLayoutSetting,
                        props: () => ({})
                    }
                ]
            }
        ]
    },
    debugger: {
        sections: [
            {
                headerMessage: 'headerDebugger',
                settings: []
            }
        ]
    },
    versionControl: {
        sections: [
            {
                headerMessage: 'headerVersionControl',
                settings: []
            }
        ]
    },
    variableManager: {
        sections: [
            {
                headerMessage: 'headerVariableManager',
                settings: []
            }
        ]
    }
};

const UnwrappedPageRenderer = ({config, intl, ...props}) => (
    <Box className={styles.body}>
        {config.sections.map((section, sectionIdx) => (
            <React.Fragment key={sectionIdx}>
                {section.headerMessage && (
                    <Header>
                        {intl.formatMessage(messages[section.headerMessage])}
                    </Header>
                )}
                {section.settings.map((setting, settingIdx) => {
                    if (setting.condition && !setting.condition(props)) {
                        return null;
                    }

                    const SettingComponent = setting.component;
                    const settingProps = setting.props(props);

                    return (<SettingComponent
                        key={settingIdx}
                        {...settingProps}
                        intl={intl}
                    />);
                })}
            </React.Fragment>
        ))}
    </Box>
);

UnwrappedPageRenderer.propTypes = {
    config: PropTypes.object.isRequired,
    intl: intlShape.isRequired
};

const PageRenderer = injectIntl(UnwrappedPageRenderer);

const GeneralPage = props => (<PageRenderer
    config={pageConfigurations.general}
    {...props}
/>);
const ExperimentalPage = props => (<PageRenderer
    config={pageConfigurations.experimental}
    {...props}
/>);

const AEPAGE = props => (<PageRenderer
    config={pageConfigurations.ae}
    {...props}
/>);

const EditorPage = props => (<PageRenderer
    config={pageConfigurations.editor}
    {...props}
/>);
const StylesPage = props => (<PageRenderer
    config={pageConfigurations.styles}
    {...props}
/>);
const MenuBarPage = props => (<PageRenderer
    config={pageConfigurations.menuBar}
    {...props}
/>);
const LayoutPage = props => (<PageRenderer
    config={pageConfigurations.layout}
    {...props}
/>);

const STAGE_CONTROL_SETTINGS = ['stage_pause_button', 'stage_step_button'];

const UnwrappedDebuggerPage = ({intl}) => (
    <Box className={styles.body}>
        <Header>{intl.formatMessage(messages.headerDebugger)}</Header>
        {DEBUGGER_SETTINGS.filter(setting => !STAGE_CONTROL_SETTINGS.includes(setting.id)).map(setting => (
            <DebuggerBooleanSetting
                key={setting.id}
                settingId={setting.id}
                label={setting.label}
                help={setting.help}
                intl={intl}
            />
        ))}
    </Box>
);
UnwrappedDebuggerPage.propTypes = {
    intl: intlShape.isRequired
};
const DebuggerPage = injectIntl(UnwrappedDebuggerPage);

const TextSetting = ({label, help, value, onSubmit, placeholder, intl}) => (
    <div className={styles.setting}>
        <div className={styles.textSettingLabel}>{label}</div>
        <BufferedInput
            className={styles.textInput}
            type="text"
            value={value}
            placeholder={placeholder}
            onSubmit={onSubmit}
        />
        {help && <p className={styles.detail}>{help}</p>}
    </div>
);
TextSetting.propTypes = {
    label: PropTypes.node,
    help: PropTypes.node,
    value: PropTypes.string,
    onSubmit: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    intl: intlShape
};

class UnwrappedVersionControlPage extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleNameChange',
            'handleEmailChange',
            'handleBranchChange',
            'handleAutoCommitChange'
        ]);
        this.state = {
            authorName: getAuthorName(),
            authorEmail: getAuthorEmail(),
            defaultBranch: getDefaultBranch(),
            autoCommit: getAutoCommit()
        };
    }
    handleNameChange (value) {
        setAuthorName(value);
        this.setState({authorName: getAuthorName()});
    }
    handleEmailChange (value) {
        setAuthorEmail(value);
        this.setState({authorEmail: getAuthorEmail()});
    }
    handleBranchChange (value) {
        setDefaultBranch(value);
        this.setState({defaultBranch: getDefaultBranch()});
    }
    handleAutoCommitChange (e) {
        const value = e.target.checked;
        setAutoCommit(value);
        this.setState({autoCommit: value});
    }
    render () {
        const {intl} = this.props;
        return (
            <Box className={styles.body}>
                <Header>{intl.formatMessage(messages.headerVersionControl)}</Header>
                <TextSetting
                    label={<FormattedMessage {...messages.vcAuthorName} />}
                    help={<FormattedMessage {...messages.vcAuthorNameHelp} />}
                    value={this.state.authorName}
                    onSubmit={this.handleNameChange}
                    placeholder="User"
                    intl={intl}
                />
                <TextSetting
                    label={<FormattedMessage {...messages.vcAuthorEmail} />}
                    help={<FormattedMessage {...messages.vcAuthorEmailHelp} />}
                    value={this.state.authorEmail}
                    onSubmit={this.handleEmailChange}
                    placeholder="user@example.com"
                    intl={intl}
                />
                <TextSetting
                    label={<FormattedMessage {...messages.vcDefaultBranch} />}
                    help={<FormattedMessage {...messages.vcDefaultBranchHelp} />}
                    value={this.state.defaultBranch}
                    onSubmit={this.handleBranchChange}
                    placeholder="main"
                    intl={intl}
                />
                <BooleanSetting
                    value={this.state.autoCommit}
                    onChange={this.handleAutoCommitChange}
                    label={<FormattedMessage {...messages.vcAutoCommit} />}
                    help={<FormattedMessage {...messages.vcAutoCommitHelp} />}
                />
            </Box>
        );
    }
}
UnwrappedVersionControlPage.propTypes = {
    intl: intlShape.isRequired
};
const VersionControlPage = injectIntl(UnwrappedVersionControlPage);

class VmSetting extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleBooleanChange', 'handleSelectChange', 'handleNumberChange']);
        this.state = {value: getVariableManagerSetting(props.definition.id)};
    }
    commit (value) {
        setVariableManagerSetting(this.props.definition.id, value);
        this.setState({value: getVariableManagerSetting(this.props.definition.id)});
    }
    handleBooleanChange (e) {
        this.commit(e.target.checked);
    }
    handleSelectChange (e) {
        this.commit(e.target.value);
    }
    handleNumberChange (value) {
        this.commit(value);
    }
    render () {
        const {definition, intl} = this.props;
        const {value} = this.state;
        const labelMsg = typeof definition.label === 'string' ?
            {id: definition.label, defaultMessage: definition.label} :
            definition.label;
        const helpMsg = definition.help ?
            (typeof definition.help === 'string' ?
                {id: definition.help, defaultMessage: definition.help} :
                definition.help) :
            null;
        const translatedLabel = intl.formatMessage(labelMsg);
        const translatedHelp = helpMsg ? intl.formatMessage(helpMsg) : undefined;
        if (definition.type === 'boolean') {
            return (
                <BooleanSetting
                    value={value}
                    onChange={this.handleBooleanChange}
                    label={translatedLabel}
                    help={translatedHelp}
                />
            );
        }
        if (definition.type === 'select') {
            return (
                <Setting
                    help={translatedHelp}
                    primary={
                        <div className={styles.label}>
                            <span className={styles.settingText}>{translatedLabel}</span>
                            <select
                                className={styles.select}
                                value={value}
                                onChange={this.handleSelectChange}
                            >
                                {definition.options.map(option => {
                                    const optionLabel = typeof option.label === 'string' ?
                                        intl.formatMessage({id: option.label, defaultMessage: option.label}) :
                                        intl.formatMessage(option.label);
                                    return (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {optionLabel}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    }
                />
            );
        }
        return (
            <Setting
                help={translatedHelp}
                primary={
                    <div className={styles.label}>
                        <span className={styles.settingText}>{translatedLabel}</span>
                        <BufferedInput
                            className={styles.numberInput}
                            type="number"
                            value={value}
                            min={definition.min}
                            max={definition.max}
                            step={definition.step}
                            onSubmit={this.handleNumberChange}
                        />
                    </div>
                }
            />
        );
    }
}
VmSetting.propTypes = {
    definition: PropTypes.shape({
        id: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        label: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({
                id: PropTypes.string,
                defaultMessage: PropTypes.string
            })
        ]),
        help: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({
                id: PropTypes.string,
                defaultMessage: PropTypes.string
            })
        ]),
        min: PropTypes.number,
        max: PropTypes.number,
        step: PropTypes.number,
        options: PropTypes.array
    }).isRequired,
    intl: intlShape.isRequired
};

const UnwrappedVariableManagerPage = ({intl}) => (
    <Box className={styles.body}>
        <Header>{intl.formatMessage(messages.headerVariableManager)}</Header>
        {VARIABLE_MANAGER_SETTINGS.map(definition => (
            <VmSetting
                key={definition.id}
                definition={definition}
                intl={intl}
            />
        ))}
    </Box>
);
UnwrappedVariableManagerPage.propTypes = {
    intl: intlShape.isRequired
};
const VariableManagerPage = injectIntl(UnwrappedVariableManagerPage);

const SettingsRouter = ({view, ...handlers}) => {
    switch (view) {
    case 'general':
        return <GeneralPage {...handlers} />;
    case 'layout':
        return <LayoutPage {...handlers} />;
    case 'editor':
        return <EditorPage {...handlers} />;
    case 'styles':
        return <StylesPage {...handlers} />;
    case 'menuBar':
        return <MenuBarPage {...handlers} />;
    case 'debugger':
        return <DebuggerPage {...handlers} />;
    case 'versionControl':
        return <VersionControlPage {...handlers} />;
    case 'variableManager':
        return <VariableManagerPage {...handlers} />;
    case 'experimental':
        return <ExperimentalPage {...handlers} />;
    case 'ae':
        return <AEPAGE {...handlers} />;
    default:
        return null;
    }
};

SettingsRouter.propTypes = {
    view: PropTypes.string.isRequired,
    onStoreProjectOptions: PropTypes.func
};

// 设置项搜索索引：每项包含显示标签、搜索关键字、所属分类 id、分类显示名
// 用于在设置面板搜索框中快速定位设置项
const SETTINGS_SEARCH_INDEX = [
    // 常规
    {label: '帧率', keywords: '帧率 framerate fps 速度', category: 'general'},
    {label: '高质量画笔', keywords: '高质量画笔 high quality pen 画笔 渲染', category: 'general'},
    {label: '插值', keywords: '插值 interpolation 平滑', category: 'general'},
    {label: '无限克隆', keywords: '无限克隆 infinite clones 克隆体', category: 'general'},
    {label: '移除边界', keywords: '移除边界 remove fencing 围栏 限制', category: 'general'},
    {label: '移除限制', keywords: '移除限制 remove limits 限制', category: 'general'},
    {label: 'Warp 计时器', keywords: 'warp timer 计时器 无限制', category: 'general'},
    {label: '舞台尺寸', keywords: '舞台尺寸 stage size 宽度 高度', category: 'general'},
    {label: '编译器', keywords: '编译器 compiler 禁用', category: 'general'},
    {label: '大小写敏感列表', keywords: '大小写敏感 case sensitive lists 列表', category: 'general'},
    {label: '优化动画', keywords: '优化动画 optimize animations 动画', category: 'general'},
    {label: '调试模式', keywords: '调试模式 debug mode 调试', category: 'general'},
    {label: 'FPS 计数器', keywords: 'fps 计数器 fps counter 帧率显示', category: 'general'},
    {label: '多工作区', keywords: '多工作区 multi workspaces 标签', category: 'general'},
    {label: '帽子积木注释提醒', keywords: '帽子积木 注释 提醒 hat block comment', category: 'general'},
    {label: '云变量服务器', keywords: '云变量 服务器 cloud variable server', category: 'general'},
    {label: '成就系统', keywords: '成就 achievement 勋章', category: 'general'},
    // 编辑器
    {label: '方形舞台角', keywords: '方形舞台角 square stage corners 直角', category: 'editor'},
    {label: '隐藏扩展按钮', keywords: '隐藏扩展按钮 hide extension button', category: 'editor'},
    {label: '隐藏运算符箭头', keywords: '隐藏运算符箭头 hide operator arrows 运算符', category: 'editor'},
    {label: '隐藏删除按钮', keywords: '隐藏删除按钮 hide delete button', category: 'editor'},
    {label: '隐藏背包', keywords: '隐藏背包 hide backpack 背包', category: 'editor'},
    {label: '默认角色', keywords: '默认角色 default sprite 自定义', category: 'editor'},
    // 样式
    {label: '标签样式', keywords: '标签样式 tab style 外观', category: 'styles'},
    {label: '标签外观', keywords: '标签外观 tab looks 样式', category: 'styles'},
    {label: '窗口样式', keywords: '窗口样式 window style 风格', category: 'styles'},
    {label: '自定义主题', keywords: '自定义主题 custom theme 颜色 配色', category: 'styles'},
    // 菜单栏
    {label: '菜单栏布局', keywords: '菜单栏布局 menu bar layout 位置', category: 'menuBar'},
    // 版本控制
    {label: 'Git 作者', keywords: 'git 作者 author 名字 邮箱', category: 'versionControl'},
    {label: '默认分支', keywords: '默认分支 default branch git 分支', category: 'versionControl'},
    {label: '自动提交', keywords: '自动提交 auto commit git', category: 'versionControl'},
    // 变量管理器
    {label: '变量管理器', keywords: '变量管理器 variable manager 变量 列表', category: 'variableManager'},
    // 调试器
    {label: '调试器设置', keywords: '调试器 debugger 断点 设置', category: 'debugger'},
    // 实验性
    {label: '实验性功能', keywords: '实验性 experimental 高级', category: 'experimental'},
    // AE 设置
    {label: 'AE 设置', keywords: 'ae 设置 addons 插件 高级编辑器', category: 'ae'}
];

// 简单模糊匹配：支持中文子串 + 英文大小写不敏感 + 子序列匹配
const fuzzyMatchSettings = (query, target) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const t = (target || '').toLowerCase();
    if (!q) return true;
    if (t.includes(q)) return true;
    // 子序列匹配（适用于英文缩写）
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) qi++;
    }
    return qi === q.length;
};

class SettingsModalComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleNavigate', 'handleStoreProjectOptions', 'handleToggleGroup',
            'handleSearchChange', 'handleSearchResultClick', 'handleSearchClear',
            'handleSearchButtonClick', 'handleSearchInputRef']);

        this.state = {
            currentView: 'general',
            collapsedGroups: {},
            searchQuery: ''
        };
    }

    handleNavigate (category) {
        this.setState({currentView: category});
    }

    handleSearchChange (e) {
        this.setState({searchQuery: e.target.value});
    }

    handleSearchClear () {
        this.setState({searchQuery: ''});
    }

    handleSearchButtonClick () {
        if (this.state.searchQuery) {
            this.setState({searchQuery: ''});
        } else if (this._searchInputRef) {
            this._searchInputRef.focus();
        }
    }

    handleSearchInputRef (el) {
        this._searchInputRef = el;
    }

    handleSearchResultClick (category) {
        this.setState({currentView: category, searchQuery: ''});
    }

    getSearchResults (query) {
        if (!query || !query.trim()) return [];
        const q = query.trim();
        return SETTINGS_SEARCH_INDEX.filter(item =>
            fuzzyMatchSettings(q, `${item.label} ${item.keywords} ${item.category}`)
        );
    }

    getCategoryLabel (categoryId, sidebarGroups) {
        for (const group of sidebarGroups) {
            for (const item of group.items) {
                if (item.id === categoryId) return item.label;
            }
        }
        return categoryId;
    }

    renderSearchResults (query, sidebarGroups, currentView) {
        const results = this.getSearchResults(query);
        if (results.length === 0) {
            return (
                <div className={styles.searchEmpty}>
                    {this.props.intl.formatMessage({
                        id: 'tw.settingsModal.searchNoResults',
                        defaultMessage: '未找到匹配的设置项'
                    })}
                </div>
            );
        }
        return (
            <div className={styles.searchResults}>
                <div className={styles.searchResultsHeader}>
                    {this.props.intl.formatMessage({
                        id: 'tw.settingsModal.searchResultsCount',
                        defaultMessage: '找到 {count} 项'
                    }, {count: results.length})}
                </div>
                {results.map((item, idx) => (
                    <button
                        key={`${item.category}-${idx}`}
                        className={classNames(styles.searchResultItem, {
                            [styles.searchResultItemActive]: currentView === item.category
                        })}
                        onClick={() => this.handleSearchResultClick(item.category)}
                    >
                        <span className={styles.searchResultLabel}>{item.label}</span>
                        <span className={styles.searchResultCategory}>
                            {this.getCategoryLabel(item.category, sidebarGroups)}
                        </span>
                    </button>
                ))}
            </div>
        );
    }

    handleToggleGroup (groupId) {
        this.setState(prevState => ({
            collapsedGroups: {
                ...prevState.collapsedGroups,
                [groupId]: !prevState.collapsedGroups[groupId]
            }
        }));
    }

    handleStoreProjectOptions () {
        this.props.onStoreProjectOptions();
    }

    render () {
        const {intl} = this.props;
        const {currentView, searchQuery} = this.state;

        const sidebarGroups = [
            {
                id: 'general',
                label: intl.formatMessage({id: 'mw.settings.groupGeneral', defaultMessage: '常规'}),
                items: [
                    {
                        id: 'general',
                        label: intl.formatMessage({id: 'mw.settings.general', defaultMessage: '常规'}),
                        icon: Settings
                    }
                ]
            },
            {
                id: 'appearance',
                label: intl.formatMessage({id: 'mw.settings.groupAppearance', defaultMessage: '外观'}),
                items: [
                    {
                        id: 'layout',
                        label: intl.formatMessage({id: 'mw.settings.layout', defaultMessage: '布局'}),
                        icon: PanelsTopLeft
                    },
                    {
                        id: 'editor',
                        label: intl.formatMessage({id: 'mw.settings.editor', defaultMessage: '编辑器'}),
                        icon: Blocks
                    },
                    {
                        id: 'styles',
                        label: intl.formatMessage({id: 'mw.settings.styles', defaultMessage: '样式'}),
                        icon: Palette
                    },
                    {
                        id: 'menuBar',
                        label: intl.formatMessage({id: 'mw.settings.menuBar', defaultMessage: '菜单栏'}),
                        icon: PanelTop
                    }
                ]
            },
            {
                id: 'tools',
                label: intl.formatMessage({id: 'mw.settings.groupTools', defaultMessage: '工具'}),
                items: [
                    {
                        id: 'versionControl',
                        label: intl.formatMessage({
                            id: 'mw.settings.versionControl',
                            defaultMessage: '版本控制'
                        }),
                        icon: GitBranch
                    },
                    {
                        id: 'variableManager',
                        label: intl.formatMessage({
                            id: 'mw.settings.variableManager',
                            defaultMessage: '变量管理器'
                        }),
                        icon: Variable
                    },
                    {
                        id: 'debugger',
                        label: intl.formatMessage({id: 'mw.settings.debugger', defaultMessage: '调试器'}),
                        icon: Bug
                    }
                ]
            },
            {
                id: 'advanced',
                label: intl.formatMessage({id: 'mw.settings.groupAdvanced', defaultMessage: '高级'}),
                items: [
                    {
                        id: 'experimental',
                        label: intl.formatMessage({id: 'mw.settings.experimental', defaultMessage: '实验性'}),
                        icon: Zap
                    },
                    {
                        id: 'ae',
                        label: intl.formatMessage({id: 'tw.settingsModal.ae', defaultMessage: 'AE 设置'}),
                        icon: Code
                    }
                ]
            }
        ];

        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={this.props.onClose}
                contentLabel={intl.formatMessage(messages.title)}
                id="settingsModal"
                width={950}
                minWidth={600}
                maxWidth={2400}
                height={700}
                minHeight={500}
                maxHeight={2000}
            >
                <Box className={styles.sidebarLayout}>
                    <div className={styles.sidebar}>
                        <div className={styles.searchContainer}>
                            <input
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={this.handleSearchChange}
                                placeholder={intl.formatMessage({
                                    id: 'tw.settingsModal.searchPlaceholder',
                                    defaultMessage: '搜索设置项…'
                                })}
                                aria-label={intl.formatMessage({
                                    id: 'tw.settingsModal.searchPlaceholder',
                                    defaultMessage: '搜索设置项…'
                                })}
                                ref={this.handleSearchInputRef}
                                spellCheck="false"
                            />
                            <div
                                className={classNames(styles.searchButton, {
                                    [styles.isClear]: searchQuery
                                })}
                                onClick={this.handleSearchButtonClick}
                            />
                        </div>
                        <div className={styles.sidebarItems}>
                            {searchQuery.trim() ? (
                                this.renderSearchResults(searchQuery, sidebarGroups, currentView)
                            ) : (
                                sidebarGroups.map(group => {
                                    const collapsed = !!this.state.collapsedGroups[group.id];
                                    return (
                                        <div
                                            key={group.id}
                                            className={styles.sidebarGroup}
                                        >
                                            <SidebarGroupHeader
                                                id={group.id}
                                                label={group.label}
                                                collapsed={collapsed}
                                                onClick={this.handleToggleGroup}
                                            />
                                            {!collapsed && group.items.map(cat => (
                                                <SidebarItem
                                                    key={cat.id}
                                                    id={cat.id}
                                                    label={cat.label}
                                                    icon={cat.icon}
                                                    onClick={this.handleNavigate}
                                                    isSelected={currentView === cat.id}
                                                />
                                            ))}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    <div className={styles.contentArea}>
                        <SettingsRouter
                            view={currentView}
                            {...this.props}
                            onStoreProjectOptions={this.handleStoreProjectOptions}
                        />
                    </div>
                </Box>
            </Modal>
        );
    }
}

SettingsModalComponent.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func,
    isEmbedded: PropTypes.bool,
    framerate: PropTypes.number,
    onFramerateChange: PropTypes.func,
    onCustomizeFramerate: PropTypes.func,
    highQualityPen: PropTypes.bool,
    onHighQualityPenChange: PropTypes.func,
    interpolation: PropTypes.bool,
    onInterpolationChange: PropTypes.func,
    infiniteClones: PropTypes.bool,
    onInfiniteClonesChange: PropTypes.func,
    removeFencing: PropTypes.bool,
    onRemoveFencingChange: PropTypes.func,
    removeLimits: PropTypes.bool,
    onRemoveLimitsChange: PropTypes.func,
    warpTimer: PropTypes.bool,
    onWarpTimerChange: PropTypes.func,
    disableCompiler: PropTypes.bool,
    onDisableCompilerChange: PropTypes.func,
    caseSensitiveLists: PropTypes.bool,
    onCaseSensitiveListsChange: PropTypes.func,
    realLayerIndexes: PropTypes.bool,
    onRealLayerIndexesChange: PropTypes.func,
    customStageSizeEnabled: PropTypes.bool,
    stageWidth: PropTypes.number,
    onStageWidthChange: PropTypes.func,
    stageHeight: PropTypes.number,
    onStageHeightChange: PropTypes.func,
    onStoreProjectOptions: PropTypes.func,
    storeThemeInProject: PropTypes.bool,
    onStoreThemeInProjectChange: PropTypes.func,
    optimizeAnimations: PropTypes.bool,
    onOptimizeAnimationsChange: PropTypes.func,
    debugMode: PropTypes.bool,
    onDebugModeChange: PropTypes.func,
    showFPSCounter: PropTypes.bool,
    onShowFPSCounterChange: PropTypes.func,
    multiWorkspaces: PropTypes.bool,
    onMultiWorkspacesChange: PropTypes.func,
    hatBlockCommentReminder: PropTypes.bool,
    onHatBlockCommentReminderChange: PropTypes.func,
    hatReminderCheckInterval: PropTypes.number,
    onHatReminderCheckIntervalChange: PropTypes.func,
    hatReminderBlockThreshold: PropTypes.number,
    onHatReminderBlockThresholdChange: PropTypes.func,
    hatReminderCommentText: PropTypes.string,
    onHatReminderCommentTextChange: PropTypes.func,
    onHatReminderReset: PropTypes.func,
    cloudVariableServer: PropTypes.string,
    onCloudVariableServerChange: PropTypes.func,
    squareStageCorners: PropTypes.bool,
    onSquareStageCornersChange: PropTypes.func,
    hideExtensionButton: PropTypes.bool,
    onHideExtensionButtonChange: PropTypes.func,
    hideOperatorArrows: PropTypes.bool,
    onHideOperatorArrowsChange: PropTypes.func,
    hideDeleteButton: PropTypes.bool,
    onHideDeleteButtonChange: PropTypes.func,
    hideBackpack: PropTypes.bool,
    onHideBackpackChange: PropTypes.func,
    tabStyle: PropTypes.string,
    onTabStyleChange: PropTypes.func,
    tabLooks: PropTypes.string,
    onTabLooksChange: PropTypes.func,
    windowStyle: PropTypes.string,
    onWindowStyleChange: PropTypes.func,
};

export default injectIntl(SettingsModalComponent);
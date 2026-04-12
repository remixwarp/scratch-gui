import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import Box from '../box/box.jsx';
import Modal from '../../containers/windowed-modal.jsx';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';
import Input from '../forms/input.jsx';
import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import DocumentationLink from '../tw-documentation-link/documentation-link.jsx';
import styles from './settings-modal.css';
import helpIcon from './help-icon.svg';
import {APP_NAME} from '../../lib/constants/brand.js';
import {AESettings} from '../../lib/settings.js';

import {Settings, Zap, Code} from 'lucide-react';

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
    headerDangerZone: {
        defaultMessage: '危险区域',
        description: 'Settings modal section',
        id: 'tw.settingsModal.dangerZone'
    },
    headerExperimental: {
        defaultMessage: '实验性',
        id: 'mw.settings.experimental'
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
    aeWarning: {
        defaultMessage: '警告：部分高级设置可能需要刷新页面才能生效。如果设置未生效，请尝试刷新页面。',
        description: 'Warning about advanced settings',
        id: 'tw.settingsModal.aeWarning'
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

const pageConfigurations = {
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
                            onChange: (e) => { AEsettings.set("enableREADMEAutoDisplay", e.target.checked); notifySettingsChange(); }
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

const SettingsRouter = ({view, ...handlers}) => {
    switch (view) {
    case 'general':
        return <GeneralPage {...handlers} />;
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

class SettingsModalComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleNavigate', 'handleStoreProjectOptions']);

        this.state = {
            currentView: 'general'
        };
    }

    handleNavigate (category) {
        this.setState({currentView: category});
    }

    handleStoreProjectOptions () {
        this.props.onStoreProjectOptions();
    }

    render () {
        const {intl} = this.props;
        const {currentView} = this.state;

        const categories = [
            {
                id: 'general',
                label: intl.formatMessage({id: 'mw.settings.general', defaultMessage: 'General'}),
                icon: Settings
            },
            {
                id: 'experimental',
                label: intl.formatMessage({id: 'mw.settings.experimental', defaultMessage: 'Experimental'}),
                icon: Zap
            },
            {
                id: 'ae',
                label: intl.formatMessage({id: 'tw.settingsModal.ae', defaultMessage: 'AE Settings'}),
                icon: Code
            }
        ];

        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={this.props.onClose}
                contentLabel={intl.formatMessage(messages.title)}
                id="settingsModal"
            >
                <Box className={styles.sidebarLayout}>
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarItems}>
                            {categories.map(cat => (
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
    onMultiWorkspacesChange: PropTypes.func
};

export default injectIntl(SettingsModalComponent);
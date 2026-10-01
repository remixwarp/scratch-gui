/**
 * Copyright (C) 2021 Thomas Weber
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { FormattedMessage, defineMessages, injectIntl, intlShape } from 'react-intl';
import { getIsLoading } from '../reducers/project-state.js';
// import DOMElementRenderer from '../containers/dom-element-renderer.jsx';
import AppStateHOC from '../lib/components/app-state-hoc.jsx';
import ErrorBoundaryHOC from '../lib/components/error-boundary-hoc.jsx';
import TWProjectMetaFetcherHOC from '../lib/components/tw-project-meta-fetcher-hoc.jsx';
import TWStateManagerHOC from '../lib/components/tw-state-manager-hoc.jsx';
import SBFileUploaderHOC from '../lib/components/sb-file-uploader-hoc.jsx';
import TWPackagerIntegrationHOC from '../lib/components/tw-packager-integration-hoc.jsx';
import SettingsStore from '../addons/settings-store-singleton';
import CustomPlugins from '../addons/custom-plugins';
import '../lib/api/fix-history.js';
import GUI from './render-gui.jsx';
import MenuBar from '../components/menu-bar/menu-bar.jsx';
import SecurityBanner from '../components/tw-security-banner/security-banner.jsx';
import ProjectInput from '../components/tw-project-input/project-input.jsx';
import FeaturedProjects from '../components/tw-featured-projects/featured-projects.jsx';
import Description from '../components/tw-description/description.jsx';
import BrowserModal from '../components/browser-modal/browser-modal.jsx';
import CloudVariableBadge from '../containers/tw-cloud-variable-badge.jsx';
import { isBrowserSupported } from '../lib/utils/tw-environment-support-prober';
import AddonChannels from '../addons/channels';
import { loadServiceWorker } from './load-service-worker';
import { initPrefetch } from '../community/prefetch-editor.js';
import runAddons from '../addons/entry';
import { APP_NAME, FEEDBACK_URL, GITHUB_URL } from '../lib/constants/brand.js';
import { AESettings } from '../lib/settings.js';
import {initFrostedGlass} from '../lib/bl-frosted-glass.js';
import {
    STAGE_DISPLAY_SCALE_METADATA,
    STAGE_DISPLAY_SIZES
} from '../lib/constants/layout-constants.js';

import styles from './interface.css';

// Import window manager dynamically
let WindowManager = null;
let settingsWindow = null;

const loadWindowManager = async () => {
    if (!WindowManager) {
        try {
            const module = await import('../addons/window-system/window-manager.js');
            WindowManager = module.default;
        } catch (e) {
            console.warn('Window manager not available, falling back to new window:', e);
            return null;
        }
    }
    return WindowManager;
};

/* 毛玻璃：插件设置页是**独立同源应用**，跑在 iframe 里，主文档注入的
   <style id="bl-frosted-glass-window"> 完全够不着它（CSS 不跨文档边界）。
   而 settings.css 里 `body { background-color: $page-background }` 是整个
   页面的大实底（深色 #111111 / 浅色 #ffffff），加上 .addon / .switch /
   .tag-button 等一批实色，构成"插件设置窗口里还有纯色"的根因。
   这里把等价的一小套玻璃规则注入**子文档**，用与主文档相同的算法取色：
     · 深色 → 纯黑 rgba(0,0,0,α)，浅色 → 纯白 rgba(255,255,255,α)
     · --input-background / --page-background 的值即当前主题的实底色
   只处理"页面底板 + 成片行块"，不动按钮/开关/标签这类控件色。 */
const FROSTED_GLASS_STORAGE_KEY = 'bl:frosted-glass';

const readFrostedGlassSettings = () => {
    try {
        const raw = window.localStorage.getItem(FROSTED_GLASS_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.enabled) return null;
        return {
            blurRadius: typeof parsed.blurRadius === 'number' ? parsed.blurRadius : 12,
            opacity: typeof parsed.opacity === 'number' ? parsed.opacity : 0.25,
            themeBoost: typeof parsed.themeBoost === 'number' ? parsed.themeBoost : 0.15
        };
    } catch (e) {
        return null;
    }
};

const isDarkColorScheme = doc => {
    const style = getComputedStyle(doc.documentElement);
    const scheme = style.getPropertyValue('--color-scheme').trim();
    if (scheme === 'dark') return true;
    if (scheme === 'light') return false;
    // 兜底：从 body 实际背景色判断亮度（BT.709 亮度权重）
    try {
        const bg = getComputedStyle(doc.body).backgroundColor;
        const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) {
            const r = Number(m[1]);
            const g = Number(m[2]);
            const b = Number(m[3]);
            return ((0.2126 * r) + (0.7152 * g) + (0.0722 * b)) < 128;
        }
    } catch (e) { /* ignore */ }
    return true;
};

const applyFrostedGlassToAddonsIframe = iframe => {
    const settings = readFrostedGlassSettings();
    const doc = iframe && iframe.contentDocument;
    if (!doc) return;

    const STYLE_ID = 'bl-frosted-glass-addons';
    const existing = doc.getElementById(STYLE_ID);
    if (!settings) {
        if (existing) existing.remove();
        return;
    }

    const {blurRadius, opacity, themeBoost} = settings;
    const dark = isDarkColorScheme(doc);
    const [r, g, b] = dark ? [0, 0, 0] : [255, 255, 255];
    // 与主模块同一套深色补偿（themeBoost 为"深浅比值"，可调）
    const alpha = dark ? Math.min(0.72, opacity + themeBoost) : opacity;
    const glass = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    const glassTint = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.55).toFixed(3)})`;
    const cardGlass = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.4).toFixed(3)})`;
    const blur = Math.round(blurRadius);

    const css = `
/* 页面底板 — settings.css 的 body 实底，改成玻璃 */
html, body {
    background-color: transparent !important;
    background: transparent !important;
}
/* settings.css 的 .container 是 flex 铺满的页面根，本身无背景，无需处理。
   标题栏 .header 铺 $ui-secondary（深色 #1e1e1e）→ 玻璃 */
.header {
    background-color: ${cardGlass} !important;
    background: ${cardGlass} !important;
}
/* 搜索框外壳与输入框 */
.search-container {
    background-color: ${cardGlass} !important;
    background: ${cardGlass} !important;
}
.search-input {
    background-color: transparent !important;
    background: transparent !important;
}
/* 插件卡片 .addon（无背景）+ .addon-dirty（铺 $ui-tertiary #2e2e2e）
   → 卡片统一给淡玻璃底，保持卡片边界可辨 */
.addon {
    background-color: ${glassTint} !important;
    background: ${glassTint} !important;
}
.addon-dirty {
    background-color: ${glass} !important;
    background: ${glass} !important;
}
/* 标签筛选条与标签胶囊 */
.tag-filter {
    background-color: ${cardGlass} !important;
    background: ${cardGlass} !important;
}
.tag-button {
    background-color: ${cardGlass} !important;
    background: ${cardGlass} !important;
}
/* 设置行里的输入框（数值/文本）铺 $input-background → 玻璃 */
.setting input {
    background-color: ${cardGlass} !important;
    background: ${cardGlass} !important;
}
.reset-setting-button {
    background-color: ${cardGlass} !important;
    background: ${cardGlass} !important;
}
/* 下拉分段控件的未选中档（铺 $ui-secondary）→ 玻璃；
   .select-option.selected 铺 $looks-secondary 品牌色，保留 */
.select-option {
    background-color: ${cardGlass} !important;
    background: ${cardGlass} !important;
}
.select-option.selected {
    background: var(--looks-secondary) !important;
    background-color: var(--looks-secondary) !important;
}
/* 悬浮提示条 .dirty-inner 铺 $ui-tertiary → 玻璃 */
.dirty-inner {
    background: ${glass} !important;
    background-color: ${glass} !important;
    backdrop-filter: blur(${blur}px) saturate(150%) !important;
    -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
}
/* 自定义插件区块的虚线框内无实底，无需处理。
   明确不动的：.switch 开关（控件）、.tag-* 彩色徽标（语义色）、
   .button（按钮）、.notice（提示色块，用 rgba 半透明青绿）、
   .clear-tags-button（红色圆形按钮）。 */
`;
    let styleEl = existing;
    if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = STYLE_ID;
        doc.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
};

const createSettingsContent = (addonId) => {
    const container = settingsWindow.getContentElement();
    container.style.padding = '0';
    container.style.overflow = 'hidden';

    // Create iframe to load the settings page
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '0 0 8px 8px'; // Match window border radius

    // Construct the settings URL
    const path = process.env.ROUTING_STYLE === 'wildcard' ? 'addons' : 'addons.html';
    const url = `${process.env.ROOT}${path}${typeof addonId === 'string' ? `#${addonId}` : ''}`;

    iframe.src = url;

    iframe.addEventListener('load', () => {
        applyFrostedGlassToAddonsIframe(iframe);
    });

    container.appendChild(iframe);
};

const navigateToAddon = (addonId) => {
    if (settingsWindow) {
        const iframe = settingsWindow.getContentElement().querySelector('iframe');
        if (iframe) {
            try {
                const newUrl = iframe.src.split('#')[0] + '#' + addonId;
                iframe.src = newUrl;
            } catch (e) {
                console.warn('Could not navigate to addon:', e);
            }
        }
    }
};

const messages = defineMessages({
    defaultTitle: {
        defaultMessage: 'Refactoring freedom',
        description: 'Title of homepage',
        id: 'tw.guiDefaultTitle'
    }
});

const WrappedMenuBar = compose(
    SBFileUploaderHOC,
    TWPackagerIntegrationHOC
)(MenuBar);

if (AddonChannels.reloadChannel) {
    AddonChannels.reloadChannel.addEventListener('message', () => {
        location.reload();
    });
}

if (AddonChannels.changeChannel) {
    AddonChannels.changeChannel.addEventListener('message', async e => {
        await CustomPlugins.refreshFromDB();
        SettingsStore.setStoreWithVersionCheck(e.data);
    });
}

runAddons();

const Footer = () => (
    <footer className={styles.footer}>
        <div className={styles.footerContent}>
            <div className={styles.footerText}>
                <FormattedMessage
                    // eslint-disable-next-line max-len
                    defaultMessage="{APP_NAME} is not affiliated with TurboWarp, Scratch, the Scratch Team, or the Scratch Foundation."
                    description="Disclaimer that {APP_NAME} is not connected to Scratch"
                    id="tw.footer.disclaimer"
                    values={{
                        APP_NAME
                    }}
                />
            </div>

            <div className={styles.footerText}>
                <FormattedMessage
                    // eslint-disable-next-line max-len
                    defaultMessage="Scratch is a project of the Scratch Foundation. It is available for free at {scratchDotOrg}."
                    description="A disclaimer that Scratch requires when referring to Scratch. {scratchDotOrg} is a link with text 'https://scratch.org/'"
                    id="tw.footer.scratchDisclaimer"
                    values={{
                        scratchDotOrg: (
                            <a
                                href="https://scratch.org/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {'https://scratch.org/'}
                            </a>
                        )
                    }}
                />
            </div>

            <div className={styles.footerColumns}>
                <div className={styles.footerSection}>
                    <a href="credits.html">
                        <FormattedMessage
                            defaultMessage="Credits"
                            description="Credits link in footer"
                            id="tw.footer.credits"
                        />
                    </a>
                    <a href="donate.html">
                        <FormattedMessage
                            defaultMessage="Donate"
                            description="Donation link in footer"
                            id="tw.footer.donate"
                        />
                    </a>
                    <a href="rw.html">
                        <FormattedMessage
                            defaultMessage="Dev Chat Log"
                            description="Link in footer to developer chat logs"
                            id="tw.footer.devChatLog"
                        />
                    </a>
                    <a href="https://surge-editor.pages.dev" target="_blank" rel="noopener noreferrer">
                        <FormattedMessage
                            defaultMessage="SurgeEditor"
                            description="Link in footer to SurgeEditor site"
                            id="tw.footer.surgeEditor"
                        />
                    </a>
                </div>
                <div className={styles.footerSection}>
                    <a href="https://packager.02engine.org/">
                        <FormattedMessage
                            defaultMessage="02Engine Packager"
                            description="Link in footer to 02Engine packager service"
                            id="tw.footer.packager"
                        />
                    </a>
                    <a href="https://remixwarp.pages.dev/convert" target="_blank" rel="noopener noreferrer">
                        <FormattedMessage
                            defaultMessage="兼容性转换"
                            description="Link in footer to Gandi / RemixWarp compatibility converter"
                            id="tw.footer.compatibilityConvert"
                        />
                    </a>
                    <a href="https://rw-do-cs.pages.dev/embedding">
                        <FormattedMessage
                            defaultMessage="Embedding"
                            description="Link in footer to embedding documentation for embedding link"
                            id="tw.footer.embed"
                        />
                    </a>
                    <a href="https://rw-do-cs.pages.dev/website/url-parameters/">
                        <FormattedMessage
                            defaultMessage="URL Parameters"
                            description="Link in footer to URL parameters documentation"
                            id="tw.footer.parameters"
                        />
                    </a>
                    <a href="https://rw-do-cs.pages.dev">
                        <FormattedMessage
                            defaultMessage="Documentation"
                            description="Link in footer to additional documentation"
                            id="tw.footer.documentation"
                        />
                    </a>
                </div>
                <div className={styles.footerSection}>
                    <a href={FEEDBACK_URL}>
                        <FormattedMessage
                            defaultMessage="Feedback & Bugs"
                            description="Link to feedback/bugs page"
                            id="tw.feedback"
                        />
                    </a>
                    <a href={GITHUB_URL}>
                        <FormattedMessage
                            defaultMessage="Source Code"
                            description="Link to source code"
                            id="tw.code"
                        />
                    </a>
                    <a href="privacy.html">
                        <FormattedMessage
                            defaultMessage="Privacy Policy"
                            description="Link to privacy policy"
                            id="tw.privacy"
                        />
                    </a>
                </div>
            </div>
        </div>
    </footer>
);

class Interface extends React.Component {
    constructor(props) {
        super(props);
        this.handleUpdateProjectTitle = this.handleUpdateProjectTitle.bind(this);
        this.handleClickAddonSettings = this.handleClickAddonSettings.bind(this);
    }
    async handleClickAddonSettings(addonId) {
        const { intl } = this.props;
        const windowManager = await loadWindowManager();

        if (!windowManager) {
            const path = process.env.ROUTING_STYLE === 'wildcard' ? 'addons' : 'addons.html';
            const url = `${process.env.ROOT}${path}${typeof addonId === 'string' ? `#${addonId}` : ''}`;
            window.open(url);
            return;
        }

        if (settingsWindow && settingsWindow.isVisible) {
            settingsWindow.bringToFront();
            if (typeof addonId === 'string') {
                navigateToAddon(addonId);
            }
            return;
        }

        // Make the addon (plugin) settings window wider on first open, but keep
        // it within the viewport so it never overflows on smaller screens.
        const settingsWidth = Math.min(1100, Math.max(window.innerWidth - 48, 600));
        settingsWindow = windowManager.createWindow({
            title: intl.formatMessage({
                defaultMessage: 'Addon Settings',
                description: 'Title of the addon settings window',
                id: 'tw.addonSettings.title'
            }),
            width: settingsWidth,
            height: 700,
            minWidth: 600,
            minHeight: 400,
            x: Math.max(0, (window.innerWidth - settingsWidth) / 2),
            y: Math.max(50, (window.innerHeight - 700) / 2),
            onClose: () => {
                settingsWindow = null;
            }
        });

        createSettingsContent(addonId);
        settingsWindow.show();
    }
    componentDidMount() {
        window.handleClickAddonSettings = this.handleClickAddonSettings;

        // 启动后应用毛玻璃效果（若用户已在设置中开启），并监听主题切换自动重算
        initFrostedGlass();

        const settings = new AESettings();
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('mobile')) {
            settings.set('EnableMobileLayout', true);
        }
        
        if (urlParams.has('touch')) {
            settings.set('EnableMobileTouchDrag', true);
        }
        
        if (urlParams.has('mobile-full')) {
            settings.set('EnableMobileLayout', true);
            settings.set('EnableMobileTouchDrag', true);
        }

        // While the project/player page is open, prefetch the editor's heavy
        // JS bundles in the background so navigating into the editor is fast.
        if (this.props.isPlayerOnly) {
            initPrefetch();
        }
    }
    componentDidUpdate(prevProps) {
        if (prevProps.isLoading && !this.props.isLoading) {
            loadServiceWorker();
        }
    }
    handleUpdateProjectTitle(title, isDefault) {
        if (isDefault || !title) {
            document.title = `${APP_NAME} - ${this.props.intl.formatMessage(messages.defaultTitle)}`;
        } else {
            document.title = `${title} - ${APP_NAME}`;
        }
    }
    render() {
        const {
            /* eslint-disable no-unused-vars */
            intl,
            hasCloudVariables,
            description,
            isFullScreen,
            isLoading,
            isPlayerOnly,
            isRtl,
            projectId,
            /* eslint-enable no-unused-vars */
            ...props
        } = this.props;
        const isHomepage = isPlayerOnly && !isFullScreen;
        const isEditor = !isPlayerOnly;
        // The player renders the "full" stage at 85% scale. Keep the
        // surrounding information column at that rendered width so it
        // remains aligned with the stage instead of appearing offset.
        const playerStageWidth = Math.round(
            props.customStageSize.width * STAGE_DISPLAY_SCALE_METADATA[STAGE_DISPLAY_SIZES.full].scale
        ) + 2;
        return (
            <div
                className={classNames(styles.container, {
                    [styles.playerOnly]: isHomepage,
                    [styles.editor]: isEditor
                })}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                <SecurityBanner />
                {isHomepage ? (
                    <div className={styles.menu}>
                        <WrappedMenuBar
                            canChangeLanguage
                            canManageFiles
                            canChangeTheme
                            enableSeeInside
                            onClickAddonSettings={this.handleClickAddonSettings}
                        />
                    </div>
                ) : null}
                <div
                    className={styles.center}
                    style={isPlayerOnly ? ({
                        // + 2 accounts for 1px border on each side of the stage
                        width: `${playerStageWidth}px`
                    }) : null}
                >
                    <GUI
                        onClickAddonSettings={this.handleClickAddonSettings}
                        onUpdateProjectTitle={this.handleUpdateProjectTitle}
                        backpackVisible
                        backpackHost="_local_"
                        {...props}
                    />
                    {isHomepage ? (
                        <React.Fragment>
                            {isBrowserSupported() ? null : (
                                <BrowserModal isRtl={isRtl} />
                            )}
                            <div className={styles.section}>
                                <ProjectInput />
                            </div>
                            {(
                                // eslint-disable-next-line max-len
                                description.instructions === 'unshared' || description.credits === 'unshared'
                            ) && (
                                    <div className={classNames(styles.infobox, styles.unsharedUpdate)}>
                                        <p>
                                            <FormattedMessage
                                                defaultMessage="Unshared projects are no longer visible."
                                                description="Appears on unshared projects"
                                                id="tw.unshared2.1"
                                            />
                                        </p>
                                        <p>
                                            <FormattedMessage
                                                defaultMessage="For more information, visit: {link}"
                                                description="Appears on unshared projects"
                                                id="tw.unshared.2"
                                                values={{
                                                    link: (
                                                        <a
                                                            href="https://rw-do-cs.pages.dev/unshared-projects"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {'https://rw-do-cs.pages.dev/unshared-projects'}
                                                        </a>
                                                    )
                                                }}
                                            />
                                        </p>
                                        <p>
                                            <FormattedMessage
                                                // eslint-disable-next-line max-len
                                                defaultMessage="If the project was shared recently, this message may appear incorrectly for a few minutes."
                                                description="Appears on unshared projects"
                                                id="tw.unshared.cache"
                                            />
                                        </p>
                                        <p>
                                            <FormattedMessage
                                                // eslint-disable-next-line max-len
                                                defaultMessage="If this project is actually shared, please report a bug."
                                                description="Appears on unshared projects"
                                                id="tw.unshared.bug"
                                            />
                                        </p>
                                    </div>
                                )}
                            {hasCloudVariables && projectId !== '0' && (
                                <div className={styles.section}>
                                    <CloudVariableBadge />
                                </div>
                            )}
                            {description.instructions || description.credits ? (
                                <div className={styles.section}>
                                    <Description
                                        instructions={description.instructions}
                                        credits={description.credits}
                                        projectId={projectId}
                                    />
                                </div>
                            ) : null}
                            <div className={styles.section}>
                                <p>
                                    <FormattedMessage
                                        // eslint-disable-next-line max-len
                                        defaultMessage="{APP_NAME} is a Scratch mod that compiles projects to JavaScript to make them run really fast. Try it out by inputting a project ID or URL above."
                                        description="Description of TurboWarp on the homepage"
                                        id="tw.home.description"
                                        values={{
                                            APP_NAME
                                        }}
                                    />
                                </p>
                            </div>
                        </React.Fragment>
                    ) : null}
                </div>
                {isHomepage && <Footer />}
            </div>
        );
    }
}

Interface.propTypes = {
    intl: intlShape,
    hasCloudVariables: PropTypes.bool,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    description: PropTypes.shape({
        credits: PropTypes.string,
        instructions: PropTypes.string
    }),
    isFullScreen: PropTypes.bool,
    isLoading: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    isRtl: PropTypes.bool,
    projectId: PropTypes.string
};

const mapStateToProps = state => ({
    hasCloudVariables: state.scratchGui.tw.hasCloudVariables,
    customStageSize: state.scratchGui.customStageSize,
    description: state.scratchGui.tw.description,
    isFullScreen: state.scratchGui.mode.isFullScreen,
    isLoading: getIsLoading(state.scratchGui.projectState.loadingState),
    isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
    isRtl: state.locales.isRtl,
    projectId: state.scratchGui.projectState.projectId
});

const mapDispatchToProps = () => ({});

const ConnectedInterface = injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(Interface));

const WrappedInterface = compose(
    AppStateHOC,
    ErrorBoundaryHOC('TW Interface'),
    TWProjectMetaFetcherHOC,
    TWStateManagerHOC,
    TWPackagerIntegrationHOC
)(ConnectedInterface);

export default WrappedInterface;

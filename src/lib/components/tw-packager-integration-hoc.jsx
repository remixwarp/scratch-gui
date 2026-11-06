import React from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import log from '../utils/log';
import { getIsShowingProject } from '../../reducers/project-state';
import windowManager from '../../addons/window-system/window-manager';

const PACKAGER_URL = 'https://packager.02engine.org';
const PACKAGER_ORIGIN = PACKAGER_URL;

// 打包器备选项：三者均为 TurboWarp Packager(p4 协议)页面。
// 通过 import_from 让打包器向编辑器发起 ready-for-import 握手，
// 编辑器再把当前作品 saveProjectSb3() 后回传 finish-import 完成自动导入。
// 标题按需求分别为 02Engine / zx34 / wangba。
const PACKAGER_TABS = [
    {id: '02Engine', label: '02Engine', url: null},
    {id: 'zx34', label: 'zx34', url: 'https://rw-sc-packager.pages.dev/'},
    {id: 'wangba', label: 'wangba', url: 'https://wb-packer-yesshape.pages.dev/'}
];

// 每个备选项页面的 origin，用于校验 postMessage 消息来源。
const getTabOrigin = tab => {
    try {
        return new URL(tab.url || PACKAGER_URL).origin;
    } catch (err) {
        return PACKAGER_ORIGIN;
    }
};

const PACKAGER_ORIGINS = PACKAGER_TABS.map(getTabOrigin);

// 所有备选项都必须带 import_from：缺了这个参数打包器不会发起 p4 导入握手，
// 编辑器内的当前作品也就无法自动导入到内嵌打包器。
const getTabUrl = tab => {
    const base = tab.url || `${PACKAGER_URL}/`;
    const separator = base.indexOf('?') === -1 ? '?' : '&';
    return `${base}${separator}import_from=${location.origin}`;
};

let packagerWindow = null;

const PackagerIntegrationHOC = function (WrappedComponent) {
    class PackagerIntegrationComponent extends React.Component {
        constructor(props) {
            super(props);
            this.handleClickPackager = this.handleClickPackager.bind(this);
            this.handleMessage = this.handleMessage.bind(this);
        }
        componentDidMount() {
            window.addEventListener('message', this.handleMessage);
        }
        componentWillUnmount() {
            window.removeEventListener('message', this.handleMessage);
        }
        handleClickPackager() {
            if (!this.props.canOpenPackager) {
                return;
            }

            if (packagerWindow && packagerWindow.isVisible) {
                packagerWindow.bringToFront();
                return;
            }

            packagerWindow = windowManager.createWindow({
                title: this.props.intl.formatMessage({
                    defaultMessage: 'Packager',
                    description: 'Title of the packager window',
                    id: 'tw.packager.title'
                }),
                width: 700,
                height: 700,
                minWidth: 600,
                minHeight: 400,
                x: Math.max(50, (window.innerWidth - 700) / 2),
                y: Math.max(50, (window.innerHeight - 700) / 2),
                onClose: () => {
                    packagerWindow = null;
                }
            });

            const container = packagerWindow.getContentElement();
            container.style.padding = '0';
            container.style.overflow = 'hidden';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';

            // 贴顶部的备选项按钮栏 —— 复用扩展编辑器的 tab 按钮样式
            const tabBar = document.createElement('div');
            tabBar.style.cssText = `
                display: flex;
                flex-shrink: 0;
                border-bottom: 1px solid var(--ui-black-transparent, rgba(0, 0, 0, 0.12));
                background: var(--ui-secondary, #f5f5f5);
                padding: 0;
                margin: 0;
            `;

            const contentArea = document.createElement('div');
            contentArea.style.cssText = `
                flex: 1;
                min-height: 0;
                overflow: hidden;
            `;

            const iframe = document.createElement('iframe');
            iframe.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 0 0 8px 8px;
                background: var(--ui-modal-background, #ffffff);
            `;
            contentArea.appendChild(iframe);
            container.appendChild(tabBar);
            container.appendChild(contentArea);

            let currentTab = PACKAGER_TABS[0].id;
            const buttons = {};

            const styleTab = (tab, btn) => {
                const active = currentTab === tab.id;
                btn.className = active ? 'active' : '';
                btn.style.cssText = `
                    flex: 1;
                    padding: 12px;
                    border: none;
                    background: ${active ?
        'var(--ui-modal-background, #ffffff)' :
        'var(--ui-secondary, #f5f5f5)'};
                    border-bottom: ${active ?
        '3px solid var(--looks-secondary, #0066cc)' :
        '1px solid var(--ui-black-transparent, rgba(0, 0, 0, 0.12))'};
                    color: var(--ui-modal-foreground, var(--text-primary, #1f2937));
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                `;
            };

            const selectTab = tab => {
                currentTab = tab.id;
                PACKAGER_TABS.forEach(t => styleTab(t, buttons[t.id]));
                iframe.src = getTabUrl(tab);
            };

            PACKAGER_TABS.forEach(tab => {
                const btn = document.createElement('button');
                btn.textContent = tab.label;
                btn.onmouseover = () => {
                    if (currentTab !== tab.id) {
                        btn.style.background = 'var(--looks-transparent, rgba(0, 102, 204, 0.12))';
                    }
                };
                btn.onmouseout = () => {
                    if (currentTab !== tab.id) {
                        btn.style.background = 'var(--ui-secondary, #f5f5f5)';
                    }
                };
                btn.onclick = () => selectTab(tab);
                buttons[tab.id] = btn;
                tabBar.appendChild(btn);
            });

            selectTab(PACKAGER_TABS[0]);
            packagerWindow.show();
        }
        handleMessage(e) {
            // 三个备选项的域都允许，否则新嵌入的打包器发来的握手会被丢弃。
            if (PACKAGER_ORIGINS.indexOf(e.origin) === -1) {
                return;
            }

            if (!this.props.canOpenPackager) {
                return;
            }

            const packagerData = e.data && e.data.p4;
            if (!packagerData || packagerData.type !== 'ready-for-import') {
                return;
            }

            // The packager needs to know that we will be importing something so it can display a loading screen
            e.source.postMessage({
                p4: {
                    type: 'start-import'
                }
            }, e.origin);

            this.props.vm.saveProjectSb3('arraybuffer')
                .then(buffer => {
                    const name = `${this.props.reduxProjectTitle}.sb3`;
                    e.source.postMessage({
                        p4: {
                            type: 'finish-import',
                            data: buffer,
                            name
                        }
                    }, e.origin, [buffer]);
                })
                .catch(err => {
                    log.error(err);
                    e.source.postMessage({
                        p4: {
                            type: 'cancel-import'
                        }
                    }, e.origin);
                });
        }
        render() {
            const {
                /* eslint-disable no-unused-vars */
                canOpenPackager,
                /* eslint-enable no-unused-vars */
                ...props
            } = this.props;
            return (
                <WrappedComponent
                    onClickPackager={this.handleClickPackager}
                    {...props}
                />
            );
        }
    }
    PackagerIntegrationComponent.propTypes = {
        canOpenPackager: PropTypes.bool,
        reduxProjectTitle: PropTypes.string,
        vm: PropTypes.shape({
            saveProjectSb3: PropTypes.func
        })
    };
    const mapStateToProps = state => ({
        canOpenPackager: getIsShowingProject(state.scratchGui.projectState.loadingState),
        reduxProjectTitle: state.scratchGui.projectTitle,
        vm: state.scratchGui.vm
    });
    const mapDispatchToProps = () => ({});
    return connect(
        mapStateToProps,
        mapDispatchToProps
    )(injectIntl(PackagerIntegrationComponent));
};

export {
    PackagerIntegrationHOC as default
};

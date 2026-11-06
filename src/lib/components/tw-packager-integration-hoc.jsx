import React from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import log from '../utils/log';
import { getIsShowingProject } from '../../reducers/project-state';
import windowManager from '../../addons/window-system/window-manager';

const PACKAGER_URL = 'https://packager.02engine.org';
const PACKAGER_ORIGIN = PACKAGER_URL;

// 打包器备选项：第一个沿用当前内嵌打包器（支持 import_from 导入当前作品），
// 其余为外部打包器页面。标题按需求分别为 02Engine / zx34 / wangba。
const PACKAGER_TABS = [
    {id: '02Engine', label: '02Engine', url: null},
    {id: 'zx34', label: 'zx34', url: 'https://rw-sc-packager.pages.dev/'},
    {id: 'wangba', label: 'wangba', url: 'https://wb-packer-yesshape.pages.dev/'}
];

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
            const tabUrl = tab => tab.url || `${PACKAGER_URL}/?import_from=${location.origin}`;

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
                iframe.src = tabUrl(tab);
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
            if (e.origin !== PACKAGER_ORIGIN) {
                return;
            }

            if (!this.props.canOpenPackager) {
                return;
            }

            const packagerData = e.data.p4;
            if (packagerData.type !== 'ready-for-import') {
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

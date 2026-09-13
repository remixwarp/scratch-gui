import PropTypes from 'prop-types';
import {useEffect, useRef, useState} from 'react';
import WindowManager from '../../addons/window-system/window-manager';

const WebEmbedWindow = ({visible, onClose}) => {
    const windowRef = useRef(null);
    const containersRef = useRef(new Map()); // tabId -> {iframe, container, url}
    const [selectedTab, setSelectedTab] = useState(null);
    const [tabs, setTabs] = useState([]); // [{id, label}]
    const [urlBarCollapsed, setUrlBarCollapsed] = useState(false);
    const themePrimaryRef = useRef('');

    // 初始化主题色读取（从 CSS 变量或 ScratchBlocks）
    const readThemePrimary = () => {
        try {
            const v = getComputedStyle(document.documentElement).getPropertyValue('--motion-primary').trim();
            if (v) return v;
        } catch (e) { /* ignore */ }
        try {
            const ScratchBlocks = window.ScratchBlocks || window.Blockly;
            if (ScratchBlocks && ScratchBlocks.Colors && ScratchBlocks.Colors.motion) {
                return ScratchBlocks.Colors.motion.primary;
            }
        } catch (e) { /* ignore */ }
        return '#4c97ff'; // 兜底默认值
    };

    // 从 URL 提取短 label（去掉协议 + 路径）
    const urlToLabel = (url) => {
        try {
            const u = new URL(url);
            return u.hostname;
        } catch (e) {
            return url.length > 24 ? url.slice(0, 21) + '…' : url;
        }
    };

    // 创建一个 tab 的 DOM（URL 栏 + iframe + 可折叠）
    const createTabDOM = (tabId, initialUrl) => {
        const themeColor = readThemePrimary();
        const container = document.createElement('div');
        container.style.cssText = 'display:flex;flex-direction:column;height:100%;width:100%;background:#fff;';

        // URL 栏（可折叠）
        const bar = document.createElement('div');
        bar.dataset.role = 'urlbar';
        bar.style.cssText = `display:flex;gap:6px;padding:8px;border-bottom:1px solid rgba(0,0,0,0.08);background:#fafafa;`;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入 URL，例如 https://example.com';
        input.value = initialUrl || '';
        input.style.cssText = 'flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px;font-size:13px;outline:none;';
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') loadCurrent();
        });

        // 折叠/展开按钮（主题色）
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = urlBarCollapsed ? '▸' : '▾';
        toggleBtn.title = urlBarCollapsed ? '展开地址栏' : '收起地址栏';
        toggleBtn.style.cssText = `padding:0 10px;border:1px solid ${themeColor};border-radius:6px;background:#fff;color:${themeColor};cursor:pointer;font-size:12px;min-width:32px;`;
        toggleBtn.addEventListener('click', () => {
            const hidden = bar.style.display === 'none';
            if (hidden) {
                bar.style.display = '';
                toggleBtn.textContent = '▾';
                toggleBtn.title = '收起地址栏';
            } else {
                bar.style.display = 'none';
                toggleBtn.textContent = '▸';
                toggleBtn.title = '展开地址栏';
            }
        });

        // 加载按钮（箭头 + 主题色背景）
        const btn = document.createElement('button');
        btn.textContent = '→';
        btn.title = '加载网页';
        btn.style.cssText = `padding:0 14px;border:none;border-radius:6px;background:${themeColor};color:#fff;font-size:16px;cursor:pointer;`;
        btn.addEventListener('click', loadCurrent);

        bar.appendChild(input);
        bar.appendChild(btn);
        bar.appendChild(toggleBtn);

        // iframe
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'flex:1;width:100%;border:0;background:#fff;';
        iframe.allow = 'fullscreen; autoplay; clipboard-read; clipboard-write;';

        container.appendChild(bar);
        container.appendChild(iframe);

        containersRef.current.set(tabId, {iframe, container, input});
        if (initialUrl) iframe.src = initialUrl;

        return container;
    };

    const loadCurrent = () => {
        const info = containersRef.current.get(selectedTab);
        if (!info) return;
        let url = info.input.value.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        info.iframe.src = url;
        // 更新 label
        setTabs(prev => prev.map(t => t.id === selectedTab ? {...t, label: urlToLabel(url)} : t));
        // 更新 tab bar label
        const tabEl = tabsBarRef.current && tabsBarRef.current.querySelector(`[data-tab-id="${selectedTab}"] .tab-label`);
        if (tabEl) tabEl.textContent = urlToLabel(url);
    };

    const tabsBarRef = useRef(null);

    const renderTabBar = () => {
        if (!tabsBarRef.current) return;
        tabsBarRef.current.innerHTML = '';
        const themeColor = readThemePrimary();
        tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.dataset.tabId = tab.id;
            tabEl.style.cssText = `display:flex;align-items:center;gap:4px;padding:6px 10px;cursor:pointer;border-bottom:2px solid ${selectedTab === tab.id ? themeColor : 'transparent'};font-size:12px;background:${selectedTab === tab.id ? '#fff' : '#f0f0f0'};border-top-left-radius:6px;border-top-right-radius:6px;user-select:none;`;
            tabEl.onclick = () => setSelectedTab(tab.id);

            const label = document.createElement('span');
            label.className = 'tab-label';
            label.textContent = tab.label;
            tabEl.appendChild(label);

            // 关闭按钮（第一个 tab 不可关）
            if (tabs.length > 1) {
                const close = document.createElement('span');
                close.textContent = '×';
                close.style.cssText = 'margin-left:6px;color:#888;font-size:14px;cursor:pointer;';
                close.title = '关闭标签';
                close.onclick = (e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                };
                tabEl.appendChild(close);
            }

            tabsBarRef.current.appendChild(tabEl);
        });

        // + 新建 tab
        const plus = document.createElement('div');
        plus.textContent = '+';
        plus.style.cssText = 'padding:6px 10px;cursor:pointer;font-size:14px;color:#666;';
        plus.title = '新建标签';
        plus.onclick = () => addTab('');
        tabsBarRef.current.appendChild(plus);
    };

    const addTab = (initialUrl) => {
        const id = 'tab-' + Date.now();
        setTabs(prev => [...prev, {id, label: urlToLabel(initialUrl || '新标签页')}]);
        // 稍后切换
        setTimeout(() => setSelectedTab(id), 0);
    };

    const removeTab = (tabId) => {
        setTabs(prev => {
            const next = prev.filter(t => t.id !== tabId);
            if (containersRef.current.has(tabId)) {
                const info = containersRef.current.get(tabId);
                info.iframe && info.iframe.remove();
                containersRef.current.delete(tabId);
            }
            if (selectedTab === tabId && next.length > 0) {
                const idx = prev.findIndex(t => t.id === tabId);
                const neighbor = next[Math.min(idx, next.length - 1)];
                setSelectedTab(neighbor.id);
            }
            return next;
        });
    };

    useEffect(() => {
        if (tabs.length > 0 && !selectedTab) setSelectedTab(tabs[0].id);
        renderTabBar();

        // 切换 iframe 显示
        containersRef.current.forEach((info, tabId) => {
            info.container.style.display = (tabId === selectedTab) ? '' : 'none';
            if (tabId === selectedTab && !info.container.parentNode) {
                const content = windowRef.current && windowRef.current._content;
                if (content) content.appendChild(info.container);
            }
        });
    }, [tabs, selectedTab]);

    useEffect(() => {
        if (visible && !windowRef.current) {
            const themeColor = readThemePrimary();

            const win = WindowManager.createWindow({
                id: 'web-embed',
                title: '网页内嵌',
                width: 880,
                height: 620,
                minWidth: 480,
                minHeight: 320,
                resizable: true,
                maximizable: true,
                closable: true,
                onClose: () => {
                    // 不销毁，只是隐藏——用户再次打开时已有内容保留
                    windowRef.current = null;
                }
            });

            windowRef.current = win;

            // 根容器
            const root = document.createElement('div');
            win._content = root; // 暴露给上面的 useEffect 用
            root.style.cssText = 'display:flex;flex-direction:column;height:100%;width:100%;background:#fff;';

            // Tab 栏
            const tabBar = document.createElement('div');
            tabBar.style.cssText = 'display:flex;align-items:center;gap:0;padding:0 6px;background:#e8e8e8;border-bottom:1px solid rgba(0,0,0,0.08);flex-shrink:0;min-height:32px;';
            tabsBarRef.current = tabBar;
            root.appendChild(tabBar);

            win.setContent(root);
            win.show();

            // 默认开一个 tab
            setTabs([{id: 'tab-default', label: '新标签页'}]);
            setSelectedTab('tab-default');

            // 创建 default tab DOM 并 append
            const defaultTabDom = createTabDOM('tab-default', '');
            defaultTabDom.style.display = 'none';
            root.appendChild(defaultTabDom);
            containersRef.current.set('tab-default', {
                iframe: defaultTabDom.querySelector('iframe'),
                container: defaultTabDom,
                input: defaultTabDom.querySelector('input')
            });
            // 显示
            setTimeout(() => {
                defaultTabDom.style.display = '';
                renderTabBar();
            }, 0);
        } else if (!visible && windowRef.current) {
            windowRef.current.close();
            windowRef.current = null;
            containersRef.current.clear();
            setTabs([]);
            setSelectedTab(null);
        }

        return () => {
            if (windowRef.current) {
                windowRef.current.close();
                windowRef.current = null;
            }
        };
    }, [visible]);

    // 当 addTab 时创建 DOM
    useEffect(() => {
        if (!windowRef.current || !tabsBarRef.current) return;
        // 为新 tab 创建 DOM（如果还没）
        const root = windowRef.current._content;
        tabs.forEach(tab => {
            if (!containersRef.current.has(tab.id)) {
                const dom = createTabDOM(tab.id, '');
                dom.style.display = 'none';
                root.appendChild(dom);
                containersRef.current.set(tab.id, {
                    iframe: dom.querySelector('iframe'),
                    container: dom,
                    input: dom.querySelector('input')
                });
            }
        });
    }, [tabs]);

    return null;
};

WebEmbedWindow.propTypes = {
    onClose: PropTypes.func,
    visible: PropTypes.bool
};

export default WebEmbedWindow;

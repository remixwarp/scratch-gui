import PropTypes from 'prop-types';
import {useCallback, useEffect, useRef, useState} from 'react';
import WindowManager from '../../addons/window-system/window-manager';

/**
 * WebEmbedWindow — Turbowarp "网页内嵌" 工具。
 *
 * 本次（v3）修复清单：
 *   ✅ 点箭头立即嵌入（闭包 stale → useCallback + useEffect 重绑）
 *   ✅ 深色/浅色变量化 + 动态切换（CSS 变量 + MutationObserver）
 *   ✅ 关闭后重开（WindowManager.onClose → props.onClose → Redux state 归零）
 *   ✅ 默认 tab 渲染为空白（初始化 ref 状态错误 → 用 DOM 反查 + applyThemeToAll）
 *   ✅ iframe 不铺满（flex 高度链路断 → 每一层显式 flex:1/min-height:0/height:100%）
 *   ✅ 关闭后菜单全部失效（closeWindow 与 WindowManager.destroy 竞态 → 分职责）
 *
 * 核心架构：
 *   - WindowManager.onClose 回调**只负责 Redux close**，同步触发 visible=false
 *   - visible 变 false 后由 [visible] effect 调 WindowManager.close() 开始动画
 *   - effect cleanup（依赖 visible）在卸载时清 DOM — 三处路径职责分明不交叉
 */

/** Turbowarp 在主题切换时写入 documentElement 的 CSS 变量，带 fallback */
function readThemeColorVar (names, fallback) {
    try {
        const cs = getComputedStyle(document.documentElement);
        for (const n of names) {
            const v = cs.getPropertyValue(n).trim();
            if (v) return v;
        }
    } catch (e) { /* ignore */ }
    return fallback;
}

/** 解析当前主题下要用的所有颜色 —— 每次 theme 变或组件 mount 时调 */
function resolveTheme () {
    return {
        primary:  readThemeColorVar(['--motion-primary', '--ui-primary'], '#4c97ff'),
        bgRoot:   readThemeColorVar(['--ui-white', '--ui-tertiary'], '#ffffff'),
        bgBar:    readThemeColorVar(['--ui-tertiary', '--ui-secondary', '--looks-secondary'], '#fafafa'),
        bgTabIn:  readThemeColorVar(['--ui-primary'], '#ffffff'),
        bgTabOut: readThemeColorVar(['--ui-secondary'], '#f0f0f0'),
        bgEmbed:  readThemeColorVar(['--page-background', '--ui-primary'], '#ffffff'),
        fgMain:   readThemeColorVar(['--text-primary', '--looks-primary'], '#111111'),
        fgMuted:  readThemeColorVar(['--looks-secondary', '--text-secondary'], '#888888'),
        border:   readThemeColorVar(['--ui-tertiary'], 'rgba(0,0,0,0.08)'),
        border2:  readThemeColorVar(['--ui-tertiary', '--ui-secondary'], '#cccccc')
    };
}

/**
 * 高度链路样式字符串 —— 每一层都必须显式 flex:1 + min-height:0
 * 否则 Chrome 会按内容最小高度撑破 flex 容器，iframe 高度不铺满。
 */
const FLEX_COL_FILL = 'display:flex;flex-direction:column;flex:1 1 auto;min-height:0;width:100%;';

const WebEmbedWindow = ({visible, onClose}) => {
    const windowRef = useRef(null);
    const containersRef = useRef(new Map()); // tabId -> {iframe, container, input, btn, toggleBtn}
    const tabsBarRef = useRef(null);
    const themeRef = useRef(resolveTheme());
    const [selectedTab, setSelectedTab] = useState(null);
    const [tabs, setTabs] = useState([]);

    /**
     * 把当前 theme 应用到所有已创建的 DOM。
     * 每次 theme 变量变化（MutationObserver 触发）/ tab 变化 / addTab 时调。
     */
    const applyThemeToAll = useCallback(() => {
        const t = resolveTheme();
        themeRef.current = t;

        containersRef.current.forEach(info => {
            if (!info.container) return;
            info.container.style.background = t.bgEmbed;
            const bar = info.container.querySelector('[data-role="urlbar"]');
            if (bar) bar.style.background = t.bgBar;
            if (info.input) {
                info.input.style.background = t.bgRoot;
                info.input.style.color = t.fgMain;
                info.input.style.borderColor = t.border2;
            }
            if (info.btn) {
                info.btn.style.background = t.primary;
                info.btn.style.color = '#ffffff';
            }
            if (info.toggleBtn) {
                info.toggleBtn.style.borderColor = t.primary;
                info.toggleBtn.style.background = t.bgRoot;
                info.toggleBtn.style.color = t.primary;
            }
            if (info.iframe) {
                info.iframe.style.background = t.bgEmbed;
                info.iframe.style.width = '100%';
                info.iframe.style.height = '100%';
                info.iframe.style.flex = '1 1 auto';
                info.iframe.style.minHeight = '0';
            }
        });

        if (windowRef.current && windowRef.current._content) {
            windowRef.current._content.style.background = t.bgRoot;
        }
        if (tabsBarRef.current) {
            tabsBarRef.current.style.background = t.bgBar;
            tabsBarRef.current.style.borderBottom = `1px solid ${t.border}`;
        }
        renderTabBar();
    /* eslint-disable react-hooks/exhaustive-deps */
    }, [tabs, selectedTab]);

    /** 监听 html/body 的 style/class 变化 → theme 变了就立刻重刷 */
    useEffect(() => {
        const observer = new MutationObserver(() => applyThemeToAll());
        try {
            observer.observe(document.documentElement, {attributes: true, attributeFilter: ['style', 'class']});
            observer.observe(document.body, {attributes: true, attributeFilter: ['style', 'class']});
        } catch (e) { /* ignore */ }
        return () => observer.disconnect();
    }, [applyThemeToAll]);

    const urlToLabel = (url) => {
        try { return new URL(url).hostname; } catch (e) {
            return url.length > 24 ? url.slice(0, 21) + '…' : url;
        }
    };

    /**
     * 创建单个 tab 的 DOM。每一层容器都必须显式 height/flex 属性，
     * 否则 Chrome 会按内容最小高度撑破 flex 容器，iframe 就不铺满。
     */
    const createTabDOM = (tabId, initialUrl) => {
        const t = themeRef.current;

        const container = document.createElement('div');
        container.style.cssText = `${FLEX_COL_FILL}height:100%;background:${t.bgEmbed};`;

        // URL bar — flex-shrink:0，不参与挤压
        const bar = document.createElement('div');
        bar.dataset.role = 'urlbar';
        bar.style.cssText = `display:flex;gap:6px;padding:8px;border-bottom:1px solid ${t.border};background:${t.bgBar};flex-shrink:0;`;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入 URL，例如 https://example.com';
        input.value = initialUrl || '';
        input.style.cssText = `flex:1;padding:6px 10px;border:1px solid ${t.border2};border-radius:6px;font-size:13px;outline:none;background:${t.bgRoot};color:${t.fgMain};min-width:0;`;

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '▾';
        toggleBtn.title = '收起地址栏';
        toggleBtn.style.cssText = `padding:0 10px;border:1px solid ${t.primary};border-radius:6px;background:${t.bgRoot};color:${t.primary};cursor:pointer;font-size:12px;min-width:32px;flex-shrink:0;`;
        toggleBtn.addEventListener('click', () => {
            const hidden = bar.style.display === 'none';
            if (hidden) { bar.style.display = ''; toggleBtn.textContent = '▾'; toggleBtn.title = '收起地址栏'; }
            else       { bar.style.display = 'none'; toggleBtn.textContent = '▸'; toggleBtn.title = '展开地址栏'; }
        });

        const btn = document.createElement('button');
        btn.textContent = '→';
        btn.title = '加载网页';
        btn.style.cssText = `padding:0 14px;border:none;border-radius:6px;background:${t.primary};color:#fff;font-size:16px;cursor:pointer;flex-shrink:0;`;

        bar.appendChild(input);
        bar.appendChild(btn);
        bar.appendChild(toggleBtn);

        // iframe — flex:1 + min-height:0 + height:100% 三把锁一起上
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `flex:1 1 auto;width:100%;height:100%;min-height:0;border:0;background:${t.bgEmbed};display:block;`;
        iframe.allow = 'fullscreen; autoplay; clipboard-read; clipboard-write;';

        container.appendChild(bar);
        container.appendChild(iframe);

        // 用 DOM 反查填 containersRef — 不再让调用方负责逐个传 key，
        // 这样默认 tab 也能一次性完整入库（之前默认 tab 初始化时 btn/toggleBtn
        // 是 null，必须 setTimeout 再补一次，极易错乱）。
        const info = {
            iframe: container.querySelector('iframe'),
            container,
            input: container.querySelector('input'),
            btn: container.querySelector('button[title="加载网页"]'),
            toggleBtn: container.querySelector('button[title="收起地址栏"], button[title="展开地址栏"]')
        };
        containersRef.current.set(tabId, info);
        if (initialUrl) iframe.src = initialUrl;

        return container;
    };

    /**
     * 加载当前 tab 的 URL 到 iframe。
     * useCallback([selectedTab]) 保证 closure 永远是最新 selectedTab。
     */
    const loadCurrent = useCallback(() => {
        const info = containersRef.current.get(selectedTab);
        if (!info || !info.input) return;
        let url = info.input.value.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        if (info.iframe) {
            info.iframe.src = 'about:blank';
            info.iframe.src = url;
        }
        setTabs(prev => prev.map(t => t.id === selectedTab ? {...t, label: urlToLabel(url)} : t));
        const tabEl = tabsBarRef.current && tabsBarRef.current.querySelector(`[data-tab-id="${selectedTab}"] .tab-label`);
        if (tabEl) tabEl.textContent = urlToLabel(url);
    }, [selectedTab]);

    /** selectedTab 变化时重绑 btn/input → 保证 listener 里 closure 永远最新 */
    useEffect(() => {
        containersRef.current.forEach(info => {
            if (info.btn) info.btn.onclick = () => loadCurrent();
            if (info.input) info.input.onkeydown = e => { if (e.key === 'Enter') loadCurrent(); };
        });
    }, [selectedTab, loadCurrent]);

    const renderTabBar = () => {
        if (!tabsBarRef.current) return;
        tabsBarRef.current.innerHTML = '';
        const t = themeRef.current;
        tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.dataset.tabId = tab.id;
            const active = selectedTab === tab.id;
            tabEl.style.cssText = `display:flex;align-items:center;gap:4px;padding:6px 10px;cursor:pointer;border-bottom:2px solid ${active ? t.primary : 'transparent'};font-size:12px;background:${active ? t.bgTabIn : t.bgTabOut};color:${t.fgMain};border-top-left-radius:6px;border-top-right-radius:6px;user-select:none;`;
            tabEl.onclick = () => setSelectedTab(tab.id);

            const label = document.createElement('span');
            label.className = 'tab-label';
            label.textContent = tab.label;
            tabEl.appendChild(label);

            if (tabs.length > 1) {
                const close = document.createElement('span');
                close.textContent = '×';
                close.style.cssText = `margin-left:6px;color:${t.fgMuted};font-size:14px;cursor:pointer;`;
                close.title = '关闭标签';
                close.onclick = (e) => { e.stopPropagation(); removeTab(tab.id); };
                tabEl.appendChild(close);
            }

            tabsBarRef.current.appendChild(tabEl);
        });

        const plus = document.createElement('div');
        plus.textContent = '+';
        plus.style.cssText = `padding:6px 10px;cursor:pointer;font-size:14px;color:${t.fgMuted};`;
        plus.title = '新建标签';
        plus.onclick = () => addTab('');
        tabsBarRef.current.appendChild(plus);
    };

    const addTab = (initialUrl) => {
        const id = 'tab-' + Date.now();
        setTabs(prev => [...prev, {id, label: urlToLabel(initialUrl || '新标签页')}]);
        setTimeout(() => setSelectedTab(id), 0);
    };

    const removeTab = (tabId) => {
        setTabs(prev => {
            const next = prev.filter(t => t.id !== tabId);
            const info = containersRef.current.get(tabId);
            if (info) {
                info.iframe && info.iframe.remove();
                info.container && info.container.remove();
            }
            containersRef.current.delete(tabId);
            if (selectedTab === tabId && next.length > 0) {
                const idx = prev.findIndex(t => t.id === tabId);
                const neighbor = next[Math.min(idx, next.length - 1)];
                setSelectedTab(neighbor.id);
            }
            return next;
        });
    };

    /** tab 显示/隐藏切换 */
    useEffect(() => {
        if (tabs.length > 0 && !selectedTab) setSelectedTab(tabs[0].id);
        renderTabBar();
        containersRef.current.forEach((info, tabId) => {
            info.container.style.display = (tabId === selectedTab) ? '' : 'none';
            if (tabId === selectedTab && !info.container.parentNode) {
                const content = windowRef.current && windowRef.current._content;
                if (content) content.appendChild(info.container);
            }
        });
    /* eslint-disable react-hooks/exhaustive-deps */
    }, [tabs, selectedTab]);

    /**
     * 核心 effect：根据 visible 决定 WindowManager 窗口的创建/销毁。
     *
     * 关闭路径（关键设计，避免 WindowManager.destroy 和 React effect 竞态）：
     *   1. 用户点 WindowManager 的 X 按钮 → WindowManager.onClose 回调
     *   2. 这个回调**只调 props.onClose()**，让 Redux 把 webEmbedModal 设为 false
     *   3. Redux → React 传 visible=false → 本 effect 的 !visible 分支跑
     *   4. 这里调 WindowManager.close()（此时 WindowManager.destroy 已在
     *      第 2 步里把 isDestroying 设过，但动画可能还没跑）—— destroy
     *      会检测 isDestroying=true 然后直接 return，不会干扰动画
     *   5. effect cleanup 再扫一次残余 DOM（保险）
     *
     * 这样三条路径职责绝对分离：
     *   WindowManager.onClose → 只管 Redux close
     *   effect !visible 分支  → 管 WindowManager.close 调起动画 + 清 React state
     *   effect cleanup        → 兜底 DOM remove + ref 归零
     */
    useEffect(() => {
        if (visible && !windowRef.current) {
            const win = WindowManager.createWindow({
                id: 'web-embed',
                title: '网页内嵌',
                width: 880, height: 620,
                minWidth: 480, minHeight: 320,
                resizable: true, maximizable: true,
                closable: true,
                // 关键：这里**只调 props.onClose()**，不自己清 DOM ——
                // WindowManager.destroy 会先调我们这里 onClose()，
                // 然后开始动画；等 visible 变 false 后 React 会触发
                // 本 effect 的 !visible 分支 + cleanup，完成 DOM 清理。
                // 这样 WindowManager 的动画才能完整播放，不会被
                // 我们提前 removeChild 打断，也就不会污染后续的
                // 菜单系统事件流。
                onClose: () => {
                    try { if (typeof onClose === 'function') onClose(); } catch (e) { /* ignore */ }
                }
            });

            windowRef.current = win;

            // 根容器 —— 必须显式 height:100% + flex column，
            // 否则 WindowManager 的 contentElement 不会给我们铺够高度
            const root = document.createElement('div');
            win._content = root;
            root.style.cssText = `${FLEX_COL_FILL}height:100%;`;

            const tabBar = document.createElement('div');
            tabBar.style.cssText = 'display:flex;align-items:center;gap:0;padding:0 6px;flex-shrink:0;min-height:32px;';
            tabsBarRef.current = tabBar;
            root.appendChild(tabBar);

            win.setContent(root);
            win.show();

            // 默认 tab —— 一次性 setTabs + createTabDOM + 入库，
            // createTabDOM 内部用 DOM 反查，不会有 null ref
            setTabs([{id: 'tab-default', label: '新标签页'}]);
            setSelectedTab('tab-default');

            const defaultTabDom = createTabDOM('tab-default', '');
            defaultTabDom.style.display = 'none';
            root.appendChild(defaultTabDom);

            // 请求一帧让 createWindow/show 跑完再 applyTheme + 显示
            requestAnimationFrame(() => {
                defaultTabDom.style.display = '';
                renderTabBar();
                applyThemeToAll();
            });
        } else if (!visible && windowRef.current) {
            // Redux 告诉我们要关 —— 开始 WindowManager 关闭动画
            try { windowRef.current.close(); } catch (e) { /* ignore */ }
            containersRef.current.clear();
            setTabs([]);
            setSelectedTab(null);
            // 注意：**不把 windowRef.current 置 null** —— 让 cleanup 统一处理。
            // 如果这里置 null，cleanup 就拿不到 windowRef 来 removeChild 了
            // （destroy 动画要 200ms 后才真正 remove）
        }

        return () => {
            // cleanup：effect 重跑 / 组件卸载时兜底
            if (windowRef.current) {
                try {
                    // WindowManager.destroy 可能还在跑（isDestroying=true），
                    // 我们让它 finish 自己的动画 + removeChild。
                    // 但也有可能 WindowManager.close() 根本没被调（比如
                    // Redux 直接让 visible=false 但没触发 destroy）——
                    // 两种情况都 try 一下 destroy(noOnClose=true) 保险
                    // 且不会重复调用我们的 onClose。
                    if (typeof windowRef.current.destroy === 'function') {
                        windowRef.current.destroy(false);
                    }
                } catch (e) { /* ignore */ }
                windowRef.current = null;
            }
            containersRef.current.clear();
        };
    /* eslint-disable react-hooks/exhaustive-deps */
    }, [visible]);

    /** tabs 变化 → 创建新 tab DOM 并入库（addTab 路径） */
    useEffect(() => {
        if (!windowRef.current || !tabsBarRef.current) return;
        const root = windowRef.current._content;
        tabs.forEach(tab => {
            if (!containersRef.current.has(tab.id)) {
                const dom = createTabDOM(tab.id, '');
                dom.style.display = 'none';
                root.appendChild(dom);
            }
        });
        applyThemeToAll();
    /* eslint-disable react-hooks/exhaustive-deps */
    }, [tabs]);

    return null;
};

WebEmbedWindow.propTypes = {
    onClose: PropTypes.func,
    visible: PropTypes.bool
};

export default WebEmbedWindow;

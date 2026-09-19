import PropTypes from 'prop-types';
import {useCallback, useEffect, useRef, useState} from 'react';
import WindowManager from '../../addons/window-system/window-manager';

/**
 * WebEmbedWindow — Turbowarp "网页内嵌" 工具。
 *
 * 三个关键修复（原来这三个问题全是硬编码/闭包导致）：
 *
 *  1. "点箭头不立即嵌入" — 原实现里 createTabDOM 绑到 btn/input 的
 *     click/keydown listener 闭包闭到了首次 render 时的 selectedTab=null，
 *     loadCurrent 里 if (!info) return 直接短路。修法：
 *       - loadCurrent 用 useCallback([selectedTab]) 让 closure 永远是新的
 *       - selectedTab 变化时 useEffect 里重新把最新的 loadCurrent 绑回每个 DOM
 *       - iframe.src 先置空再赋新 URL，强制浏览器重新加载（某些代理/CDN
 *         场景下只改 src 不触发 load）
 *
 *  2. "深色模式下背景还是白色" — 原实现所有颜色硬写 #fff / #fafafa /
 *     #e8e8e8 / rgba(0,0,0,0.08)。修法：全部从 Turbowarp 在主题切换时
 *     写入 documentElement 的 CSS 变量读取。
 *
 *  3. "深浅色切换要动态生效" — 原实现完全没监听 theme 变化。修法：
 *     MutationObserver 挂到 <html> 和 <body> 的 style/class 属性上，
 *     一旦 Turbowarp 改了主题变量，applyThemeToAll() 重新解析 CSS
 *     变量并给所有 DOM 节点刷一遍颜色。
 *
 * 设计：
 *   - 窗口结构仍用纯 DOM 搭（WindowManager 的集成方式不能动）
 *   - 所有 DOM 节点颜色都在 createTabDOM / renderTabBar 里从 theme
 *     对象读（theme 对象由 resolveTheme() 从 CSS 变量解析）
 *   - 每次 theme 变化 / selectedTab 变化 / addTab / removeTab 都会
 *     统一调用 applyThemeToAll() 把颜色刷一遍
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

const WebEmbedWindow = ({visible, onClose}) => {
    const windowRef = useRef(null);
    const containersRef = useRef(new Map()); // tabId -> {iframe, container, input, btn, toggleBtn}
    const tabsBarRef = useRef(null);
    const themeRef = useRef(resolveTheme());
    const [selectedTab, setSelectedTab] = useState(null);
    const [tabs, setTabs] = useState([]);

    /**
     * 关闭窗口的统一入口 —— WindowManager 的 X 按钮、visible=false 的 effect
     * 清理逻辑都走这里。关键：必须调 props.onClose() 让 Redux 的
     * webEmbedModal 归零，这样下次用户点菜单按钮时 visible 才会从 false
     * 跳回 true，触发 [visible] effect 重新 createWindow。
     */
    const closeWindow = useCallback(() => {
        if (windowRef.current) {
            try { windowRef.current.close(); } catch (e) { /* ignore */ }
            windowRef.current = null;
        }
        containersRef.current.clear();
        setTabs([]);
        setSelectedTab(null);
        if (typeof onClose === 'function') onClose();
    }, [onClose]);

    /** 把当前 theme 应用到所有已创建的 DOM — 每次 theme 变 / tab 变时调用 */
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
            if (info.iframe) info.iframe.style.background = t.bgEmbed;
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

    const createTabDOM = (tabId, initialUrl) => {
        const t = themeRef.current;

        const container = document.createElement('div');
        container.style.cssText = `display:flex;flex-direction:column;height:100%;width:100%;background:${t.bgEmbed};`;

        const bar = document.createElement('div');
        bar.dataset.role = 'urlbar';
        bar.style.cssText = `display:flex;gap:6px;padding:8px;border-bottom:1px solid ${t.border};background:${t.bgBar};`;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入 URL，例如 https://example.com';
        input.value = initialUrl || '';
        input.style.cssText = `flex:1;padding:6px 10px;border:1px solid ${t.border2};border-radius:6px;font-size:13px;outline:none;background:${t.bgRoot};color:${t.fgMain};`;

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '▾';
        toggleBtn.title = '收起地址栏';
        toggleBtn.style.cssText = `padding:0 10px;border:1px solid ${t.primary};border-radius:6px;background:${t.bgRoot};color:${t.primary};cursor:pointer;font-size:12px;min-width:32px;`;
        toggleBtn.addEventListener('click', () => {
            const hidden = bar.style.display === 'none';
            if (hidden) { bar.style.display = ''; toggleBtn.textContent = '▾'; toggleBtn.title = '收起地址栏'; }
            else       { bar.style.display = 'none'; toggleBtn.textContent = '▸'; toggleBtn.title = '展开地址栏'; }
        });

        const btn = document.createElement('button');
        btn.textContent = '→';
        btn.title = '加载网页';
        btn.style.cssText = `padding:0 14px;border:none;border-radius:6px;background:${t.primary};color:#fff;font-size:16px;cursor:pointer;`;

        bar.appendChild(input);
        bar.appendChild(btn);
        bar.appendChild(toggleBtn);

        const iframe = document.createElement('iframe');
        iframe.style.cssText = `flex:1;width:100%;border:0;background:${t.bgEmbed};`;
        iframe.allow = 'fullscreen; autoplay; clipboard-read; clipboard-write;';

        container.appendChild(bar);
        container.appendChild(iframe);

        containersRef.current.set(tabId, {iframe, container, input, btn, toggleBtn});
        if (initialUrl) iframe.src = initialUrl;

        return container;
    };

    /**
     * 加载当前 tab 的 URL 到 iframe。
     *  - useCallback([selectedTab]) 保证 closure 里永远是最新 selectedTab
     *  - iframe 先置空再赋新 URL — 某些代理/CDN 场景下只改 src 不重加载
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

    /**
     * 每当 selectedTab 变化，把每个 tab 的 btn/input 都重新绑定最新的
     * loadCurrent。原实现里 listener 只绑一次（在 createTabDOM 里），
     * 之后 selectedTab 变了但 closure 还是旧的 —— 这就是 "点箭头没反应" 的根因。
     */
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
        containersRef.current.forEach((info, tabId) => {
            info.container.style.display = (tabId === selectedTab) ? '' : 'none';
            if (tabId === selectedTab && !info.container.parentNode) {
                const content = windowRef.current && windowRef.current._content;
                if (content) content.appendChild(info.container);
            }
        });
    /* eslint-disable react-hooks/exhaustive-deps */
    }, [tabs, selectedTab]);

    useEffect(() => {
        if (visible && !windowRef.current) {
            const win = WindowManager.createWindow({
                id: 'web-embed',
                title: '网页内嵌',
                width: 880, height: 620,
                minWidth: 480, minHeight: 320,
                resizable: true, maximizable: true,
                closable: true,
                // 用户点 WindowManager 的 X 按钮 —— 走统一 closeWindow
                onClose: () => closeWindow()
            });

            windowRef.current = win;

            const root = document.createElement('div');
            win._content = root;
            root.style.cssText = 'display:flex;flex-direction:column;height:100%;width:100%;';

            const tabBar = document.createElement('div');
            tabBar.style.cssText = 'display:flex;align-items:center;gap:0;padding:0 6px;flex-shrink:0;min-height:32px;';
            tabsBarRef.current = tabBar;
            root.appendChild(tabBar);

            win.setContent(root);
            win.show();

            setTabs([{id: 'tab-default', label: '新标签页'}]);
            setSelectedTab('tab-default');

            const defaultTabDom = createTabDOM('tab-default', '');
            defaultTabDom.style.display = 'none';
            root.appendChild(defaultTabDom);
            containersRef.current.set('tab-default', {
                iframe: defaultTabDom.querySelector('iframe'),
                container: defaultTabDom,
                input: defaultTabDom.querySelector('input'),
                btn: null,
                toggleBtn: null
            });
            setTimeout(() => {
                defaultTabDom.style.display = '';
                const fix = containersRef.current.get('tab-default');
                fix.btn = defaultTabDom.querySelector('button[title="加载网页"]');
                fix.toggleBtn = defaultTabDom.querySelector('button[title="收起地址栏"], button[title="展开地址栏"]');
                containersRef.current.set('tab-default', fix);
                renderTabBar();
                applyThemeToAll();
            }, 0);
        } else if (!visible && windowRef.current) {
            // Redux 要求关闭（onClose 被 dispatch 或 visible 变 false）
            // —— 不调用 props.onClose 因为它本身就是触发者
            if (windowRef.current) {
                try { windowRef.current.close(); } catch (e) { /* ignore */ }
                windowRef.current = null;
            }
            containersRef.current.clear();
            setTabs([]);
            setSelectedTab(null);
        }

        return () => {
            // effect 重跑 / 组件卸载 —— 只清 DOM 不回调 onClose，避免循环
            if (windowRef.current) {
                try { windowRef.current.close(); } catch (e) { /* ignore */ }
                windowRef.current = null;
            }
            containersRef.current.clear();
        };
    /* eslint-disable react-hooks/exhaustive-deps */
    }, [visible]);

    useEffect(() => {
        if (!windowRef.current || !tabsBarRef.current) return;
        const root = windowRef.current._content;
        tabs.forEach(tab => {
            if (!containersRef.current.has(tab.id)) {
                const dom = createTabDOM(tab.id, '');
                dom.style.display = 'none';
                root.appendChild(dom);
                containersRef.current.set(tab.id, {
                    iframe: dom.querySelector('iframe'),
                    container: dom,
                    input: dom.querySelector('input'),
                    btn: dom.querySelector('button[title="加载网页"]'),
                    toggleBtn: dom.querySelector('button[title="收起地址栏"], button[title="展开地址栏"]')
                });
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

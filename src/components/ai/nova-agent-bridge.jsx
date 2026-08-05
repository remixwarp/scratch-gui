import React from 'react';
import Agent, {
    registerSettingsWindow,
    registerUpdateSettingsWindow
} from '../../addons/addons/02agent/index.tsx';
import {
    createSettingsWindow,
    updateSettingsWindow
} from '../../addons/addons/02agent/components/SettingsWindow.tsx';
import zhMessages from './nova-l10n-zh-cn.js';
import enMessages from './nova-l10n-en.js';

// 注册设置窗口（与 userscript.js 中的逻辑一致）
let _registered = false;
const ensureRegistered = () => {
    if (_registered) return;
    _registered = true;
    registerSettingsWindow(createSettingsWindow);
    registerUpdateSettingsWindow(updateSettingsWindow);
};

// 简单的 msg 函数：根据当前语言查找 l10n 消息
const getLocale = () => {
    try {
        const lang = (window.navigator.language || 'zh-CN').toLowerCase();
        if (lang.startsWith('zh')) return 'zh';
        return 'en';
    } catch (_) {
        return 'zh';
    }
};

const msg = (key, params) => {
    const locale = getLocale();
    const messages = locale === 'zh' ? zhMessages : enMessages;
    let text = messages[key] || enMessages[key] || key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
    }
    return text;
};

const NovaAgentBridge = ({vm, containerRef}) => {
    const [workspace, setWorkspace] = React.useState(null);
    const [dimensions, setDimensions] = React.useState({width: 800, height: 600});
    const [editorThemeMode, setEditorThemeMode] = React.useState('light');

    React.useEffect(() => {
        ensureRegistered();
    }, []);

    // 获取 Blockly workspace
    React.useEffect(() => {
        let disposed = false;
        const getWs = () => {
            if (window.ScratchBlocks?.getMainWorkspace) {
                return window.ScratchBlocks.getMainWorkspace();
            }
            if (window.Blockly?.getMainWorkspace) {
                return window.Blockly.getMainWorkspace();
            }
            return null;
        };

        // 尝试立即获取
        const ws = getWs();
        if (ws && !disposed) {
            setWorkspace(ws);
            return;
        }

        // 轮询等待 Blockly 加载
        const timer = setInterval(() => {
            const w = getWs();
            if (w && !disposed) {
                setWorkspace(w);
                clearInterval(timer);
            }
        }, 500);

        return () => {
            disposed = true;
            clearInterval(timer);
        };
    }, []);

    // 监听容器尺寸变化
    React.useEffect(() => {
        if (!containerRef?.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const {width, height} = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({width: Math.round(width), height: Math.round(height)});
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [containerRef]);

    // 监听主题变化
    React.useEffect(() => {
        const checkTheme = () => {
            try {
                const theme = document.documentElement?.getAttribute?.('data-theme');
                if (theme === 'dark') {
                    setEditorThemeMode('dark');
                }
            } catch (_) { /* noop */ }
        };
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
        return () => observer.disconnect();
    }, []);

    // 确保 Blockly 全局变量可用（02agent 的 tools.ts 依赖）
    React.useEffect(() => {
        if (window.ScratchBlocks && !window.Blockly) {
            window.Blockly = window.ScratchBlocks;
        }
    }, [workspace]);

    if (!vm) {
        return (
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888'}}>
                等待 Scratch VM 就绪...
            </div>
        );
    }

    return (
        <Agent
            vm={vm}
            workspace={workspace}
            editorThemeMode={editorThemeMode}
            windowWidth={dimensions.width}
            windowHeight={dimensions.height}
            msg={msg}
        />
    );
};

export default NovaAgentBridge;

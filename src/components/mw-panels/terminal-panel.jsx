import React, {useEffect, useRef} from 'react';
import {injectIntl} from 'react-intl';

// 与插件设置里的 Terminal 插件保持一致的 xterm 版本，降低兼容风险
const XTERM_JS = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js';
const XTERM_CSS = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css';
const FIT_ADDON_JS = 'https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.6.0/lib/xterm-addon-fit.min.js';

const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`加载失败: ${src}`));
    document.head.appendChild(s);
});

const loadCss = (href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
};

// ---------------------------------------------------------------------------
// 内置命令（面向用户，不连接任何后端）
// 在 Terminal 插件原有命令（clear/help/echo/date）基础上扩展更多命令
// ---------------------------------------------------------------------------
const COMMANDS = {
    help: {
        desc: '显示帮助信息',
        run: (term) => {
            term.writeln('可用命令：');
            Object.keys(COMMANDS).sort().forEach(name => {
                term.writeln(`  ${name.padEnd(10)} - ${COMMANDS[name].desc}`);
            });
            term.writeln('');
            term.writeln('提示：↑/↓ 浏览历史，输入后按回车执行。');
        }
    },
    clear: {desc: '清空终端', run: (term) => term.clear()},
    cls: {desc: '清空终端', run: (term) => term.clear()},
    echo: {
        desc: '回显输入的文本',
        run: (term, args) => term.writeln(args.join(' '))
    },
    date: {
        desc: '显示当前日期与时间',
        run: (term) => term.writeln(new Date().toString())
    },
    whoami: {
        desc: '显示当前用户',
        run: (term) => term.writeln('remixwarp-user')
    },
    version: {
        desc: '显示 RemixWarp 版本',
        run: (term) => term.writeln('RemixWarp 1.0.3')
    },
    about: {
        desc: '关于 RemixWarp',
        run: (term) => {
            term.writeln('\x1b[1;34mRemixWarp\x1b[0m — 基于 Scratch 的增强编辑器');
            term.writeln('集成命令面板、终端与 VS Code 风格布局。');
        }
    },
    ls: {
        desc: '列出当前目录（占位）',
        run: (term) => {
            term.writeln('projects/');
            term.writeln('assets/');
            term.writeln('README.md');
        }
    },
    theme: {
        desc: '显示或切换主题（theme <dark|light>）',
        run: (term, args) => {
            const mode = (args[0] || '').toLowerCase();
            if (mode === 'dark' || mode === 'light') {
                window.dispatchEvent(new CustomEvent('mw-theme-set', {detail: mode}));
                term.writeln(`已请求切换到 ${mode} 主题。`);
            } else {
                const dark = window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                term.writeln(`当前系统主题偏好：${dark ? 'dark' : 'light'}`);
                term.writeln('用法：theme <dark|light>');
            }
        }
    }
};

const TerminalPanel = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        let term = null;
        let fitAddon = null;
        let disposed = false;
        let history = [];
        let historyIndex = -1;
        let currentLine = '';

        // 容器尺寸为 0 时（面板拖动/展开过程中）不要 fit，避免 xterm 抛错
        const safeFit = () => {
            if (!term || !fitAddon) return;
            const el = containerRef.current;
            if (!el) return;
            if (el.clientWidth < 2 || el.clientHeight < 2) return;
            try {
                fitAddon.fit();
            } catch (e) { /* 布局未稳定时忽略 */ }
        };

        const prompt = () => term.write('\x1b[32mremixwarp$\x1b[0m ');

        const execute = (line) => {
            const trimmed = line.trim();
            if (trimmed) {
                history.push(trimmed);
                if (history.length > 100) history.shift();
            }
            historyIndex = history.length;
            const parts = trimmed.length ? trimmed.split(/\s+/) : [];
            const cmd = parts[0] ? parts[0].toLowerCase() : '';
            const args = parts.slice(1);
            if (!cmd) return;
            const handler = COMMANDS[cmd];
            if (handler) {
                handler.run(term, args);
            } else {
                term.writeln(`\x1b[31m命令未找到: ${cmd}\x1b[0m`);
                term.writeln("输入 'help' 查看可用命令。");
            }
        };

        const init = async () => {
            try {
                loadCss(XTERM_CSS);
                await loadScript(XTERM_JS);
                await loadScript(FIT_ADDON_JS);
                if (disposed || !containerRef.current || !window.Terminal) return;

                term = new window.Terminal({
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#d4d4d4',
                        cursor: '#4d97ff',
                        cursorAccent: '#1e1e1e',
                        selection: 'rgba(77, 151, 255, 0.3)',
                        black: '#1e1e1e',
                        red: '#cd3131',
                        green: '#0dbc79',
                        yellow: '#e5e510',
                        blue: '#2472c8',
                        magenta: '#bc3fbc',
                        cyan: '#11a8cd',
                        white: '#e5e5e5',
                        brightBlack: '#666666',
                        brightRed: '#f14c4c',
                        brightGreen: '#23d18b',
                        brightYellow: '#f5f543',
                        brightBlue: '#3b8eea',
                        brightMagenta: '#d670d6',
                        brightCyan: '#29b8db',
                        brightWhite: '#ffffff'
                    },
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: 13,
                    lineHeight: 1.2,
                    cursorBlink: true,
                    cursorStyle: 'block'
                });
                fitAddon = new window.FitAddon.FitAddon();
                term.loadAddon(fitAddon);
                term.open(containerRef.current);

                term.writeln('\x1b[1;34m=== RemixWarp Terminal ===\x1b[0m');
                term.writeln('\x1b[32m终端就绪。\x1b[0m');
                term.writeln('输入命令后按回车执行。');
                term.writeln('');

                // 等待布局稳定后再 fit + 显示提示符，避免尺寸为 0 导致异常
                requestAnimationFrame(() => {
                    if (disposed) return;
                    safeFit();
                    prompt();
                });

                term.onData(data => {
                    if (disposed) return;
                    switch (data) {
                        case '\r': // Enter
                            term.writeln('');
                            execute(currentLine);
                            currentLine = '';
                            prompt();
                            break;
                        case '\u007F': // Backspace
                            if (currentLine.length > 0) {
                                currentLine = currentLine.slice(0, -1);
                                term.write('\b \b');
                            }
                            break;
                        case '\u001B[A': // 上箭头：历史前一条
                            if (history.length > 0) {
                                historyIndex = Math.max(0, historyIndex - 1);
                                term.write('\r\x1b[K');
                                prompt();
                                term.write(history[historyIndex]);
                                currentLine = history[historyIndex];
                            }
                            break;
                        case '\u001B[B': // 下箭头：历史后一条
                            if (history.length > 0) {
                                historyIndex = Math.min(history.length, historyIndex + 1);
                                term.write('\r\x1b[K');
                                prompt();
                                const val = history[historyIndex] || '';
                                term.write(val);
                                currentLine = val;
                            }
                            break;
                        default:
                            // 只接受可打印字符（排除方向键等已处理的控制序列）
                            if (data >= ' ' || data === '\t') {
                                if (data === '\t') break; // Tab 暂不补全
                                currentLine += data;
                                term.write(data);
                            }
                    }
                });

                const ro = new ResizeObserver(safeFit);
                ro.observe(containerRef.current);
                term._mwRO = ro;
            } catch (e) {
                if (containerRef.current) {
                    containerRef.current.textContent = `终端加载失败：${e.message}`;
                }
            }
        };
        init();

        return () => {
            disposed = true;
            try {
                if (term) {
                    if (term._mwRO) term._mwRO.disconnect();
                    term.dispose();
                }
            } catch (e) { /* noop */ }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                background: '#1e1e1e',
                overflow: 'hidden',
                padding: '6px',
                boxSizing: 'border-box'
            }}
        />
    );
};

export default injectIntl(TerminalPanel);

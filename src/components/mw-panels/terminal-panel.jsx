import React, {useEffect, useRef, useState, useCallback} from 'react';

// 不再依赖 CDN 的 xterm：国内访问 jsdelivr 经常失败导致终端空白，
// 且 xterm DOM 渲染器在字体测量时机不佳时会出现字符间多余空格。
// 这里用纯 DOM + React 实现一个轻量终端，渲染稳定、无字体测量问题、
// 无外部网络依赖。

const COMMANDS = {
    help: {
        desc: '显示帮助信息',
        run: (ctx) => {
            ctx.writeln('可用命令：', 'info');
            Object.keys(COMMANDS).sort().forEach(name => {
                ctx.writeln(`  ${name.padEnd(10)} - ${COMMANDS[name].desc}`, 'info');
            });
            ctx.writeln('');
            ctx.writeln('提示：↑/↓ 浏览历史，输入后按回车执行。', 'info');
        }
    },
    clear: {desc: '清空终端', run: (ctx) => ctx.clear()},
    cls: {desc: '清空终端', run: (ctx) => ctx.clear()},
    echo: {desc: '回显输入的文本', run: (ctx, args) => ctx.writeln(args.join(' '), 'info')},
    date: {desc: '显示当前日期与时间', run: (ctx) => ctx.writeln(new Date().toString(), 'info')},
    whoami: {desc: '显示当前用户', run: (ctx) => ctx.writeln('remixwarp-user', 'info')},
    version: {desc: '显示 RemixWarp 版本', run: (ctx) => ctx.writeln('RemixWarp 1.0.3', 'info')},
    about: {
        desc: '关于 RemixWarp',
        run: (ctx) => {
            ctx.writeln('RemixWarp — 基于 Scratch 的增强编辑器', 'ok');
            ctx.writeln('集成命令面板、终端与 VS Code 风格布局。', 'info');
        }
    },
    ls: {
        desc: '列出当前目录（占位）',
        run: (ctx) => {
            ctx.writeln('projects/');
            ctx.writeln('assets/');
            ctx.writeln('README.md');
        }
    },
    theme: {
        desc: '显示或切换主题（theme <dark|light>）',
        run: (ctx, args) => {
            const mode = (args[0] || '').toLowerCase();
            if (mode === 'dark' || mode === 'light') {
                window.dispatchEvent(new CustomEvent('mw-theme-set', {detail: mode}));
                ctx.writeln(`已请求切换到 ${mode} 主题。`, 'ok');
            } else {
                const dark = window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                ctx.writeln(`当前系统主题偏好：${dark ? 'dark' : 'light'}`);
                ctx.writeln('用法：theme <dark|light>');
            }
        }
    }
};

const lineColor = cls => {
    switch (cls) {
    case 'error': return '#f14c4c';
    case 'ok': return '#4ec9b0';
    case 'cmd': return '#569cd6';
    default: return '#d4d4d4';
    }
};

const TerminalPanel = () => {
    const [lines, setLines] = useState([]);
    const [input, setInput] = useState('');
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const idRef = useRef(0);
    const historyRef = useRef([]);
    const historyIndexRef = useRef(0);

    const scrollToBottom = useCallback(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, []);

    const appendLines = useCallback(newLines => {
        setLines(prev => {
            const next = [...prev, ...newLines];
            if (next.length > 500) next.splice(0, next.length - 500);
            return next;
        });
    }, []);

    const runCommand = useCallback(rawLine => {
        const trimmed = rawLine.trim();
        if (trimmed) {
            historyRef.current.push(trimmed);
            if (historyRef.current.length > 100) historyRef.current.shift();
        }
        historyIndexRef.current = historyRef.current.length;

        const parts = trimmed.length ? trimmed.split(/\s+/) : [];
        const cmd = parts[0] ? parts[0].toLowerCase() : '';
        const args = parts.slice(1);

        const ctx = {
            writeln: (text = '', cls = 'info') => {
                idRef.current += 1;
                appendLines([{id: `line-${idRef.current}`, text: String(text), cls}]);
            },
            clear: () => setLines([])
        };

        // 回显输入命令（与下方输入行的 prompt 保持一致）
        ctx.writeln(`remixwarp$ ${rawLine}`, 'cmd');

        if (!cmd) return;
        const handler = COMMANDS[cmd];
        if (handler) {
            handler.run(ctx, args);
        } else {
            ctx.writeln(`命令未找到: ${cmd}`, 'error');
            ctx.writeln("输入 'help' 查看可用命令。", 'error');
        }
    }, [appendLines]);

    // 初次挂载：打印 banner 并自动聚焦输入框
    useEffect(() => {
        const banner = [
            {id: `line-${++idRef.current}`, text: '=== RemixWarp Terminal ===', cls: 'ok'},
            {id: `line-${++idRef.current}`, text: '终端就绪。', cls: 'ok'},
            {id: `line-${++idRef.current}`, text: '输入命令后按回车执行。', cls: 'info'},
            {id: `line-${++idRef.current}`, text: '', cls: 'info'}
        ];
        setLines(banner);
        if (inputRef.current) inputRef.current.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [lines, scrollToBottom]);

    const handleKeyDown = e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runCommand(input);
            setInput('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const h = historyRef.current;
            if (h.length > 0) {
                historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
                setInput(h[historyIndexRef.current] || '');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const h = historyRef.current;
            if (h.length > 0) {
                historyIndexRef.current = Math.min(h.length, historyIndexRef.current + 1);
                setInput(h[historyIndexRef.current] || '');
            }
        }
    };

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#1e1e1e',
                color: '#d4d4d4',
                boxSizing: 'border-box',
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: 13,
                lineHeight: 1.4
            }}
            onClick={() => inputRef.current && inputRef.current.focus()}
        >
            <div
                ref={listRef}
                style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflowY: 'auto',
                    padding: '6px 8px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                }}
            >
                {lines.map(line => (
                    <div
                        key={line.id}
                        style={{color: lineColor(line.cls)}}
                    >
                        {line.text}
                    </div>
                ))}
            </div>
            <div
                style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px 8px 6px',
                    borderTop: '1px solid #333'
                }}
            >
                <span style={{color: '#4ec9b0', marginRight: 6, flex: '0 0 auto'}}>remixwarp$</span>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    autoComplete="off"
                    style={{
                        flex: '1 1 auto',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#d4d4d4',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        padding: 0
                    }}
                />
            </div>
        </div>
    );
};

export default TerminalPanel;

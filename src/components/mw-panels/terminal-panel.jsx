import React, {useEffect, useRef, useState, useCallback} from 'react';

// 纯 DOM 终端，无 CDN 依赖。
// 命令可读取/编辑当前作品文件，范式与「超级重构」一致：
//   读取  -> vm.toJSON() 把当前作品序列化成 project.json
//   应用  -> vm.loadProject(newData) 把修改后的数据重新加载回作品

const getVm = () => {
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const state = store.getState();
            return state.scratchGui && state.scratchGui.vm;
        }
    } catch (e) {
        // ignore
    }
    return null;
};

const getProject = () => {
    const vm = getVm();
    if (!vm) return null;
    try {
        return JSON.parse(vm.toJSON());
    } catch (e) {
        return null;
    }
};

const applyProject = project => {
    const vm = getVm();
    if (!vm) return Promise.reject(new Error('无法获取 VM'));
    return vm.loadProject(project);
};

// 大文件输出超过该长度则截断，避免卡死终端
const MAX_OUTPUT = 8000;
const truncate = text => (text.length > MAX_OUTPUT ?
    text.slice(0, MAX_OUTPUT) + '\n... (输出已截断)' : text);

const targetLabel = t => (t.isStage ? 'stage' : t.name);

// cat / read 共用的文件查看逻辑
const catFile = (ctx, args) => {
    const path = args[0];
    if (!path) {
        ctx.writeln('用法：cat <project.json | 角色名 | 角色名/script>', 'error');
        return;
    }
    const project = getProject();
    if (!project) {
        ctx.writeln('无法读取当前作品', 'error');
        return;
    }
    if (path === 'project.json') {
        ctx.writeln(truncate(JSON.stringify(project, null, 2)), 'info');
        return;
    }
    let targetName = path;
    let isScript = false;
    if (targetName.endsWith('/script')) {
        isScript = true;
        targetName = targetName.slice(0, -7);
    }
    const target = (project.targets || []).find(t => targetLabel(t) === targetName);
    if (!target) {
        ctx.writeln(`未找到：${path}`, 'error');
        return;
    }
    const content = isScript ? (target.blocks || {}) : target;
    ctx.writeln(truncate(JSON.stringify(content, null, 2)), 'info');
};

const COMMANDS = {
    help: {
        desc: '显示帮助信息',
        run: (ctx) => {
            ctx.writeln('可用命令：', 'info');
            Object.keys(COMMANDS).sort().forEach(name => {
                ctx.writeln(`  ${name.padEnd(12)} - ${COMMANDS[name].desc}`, 'info');
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
    // ---- 作品文件相关（模仿超级重构读取/修改当前项目）----
    ls: {
        desc: '列出当前作品的文件（project.json + 各角色/舞台）',
        run: (ctx) => {
            const project = getProject();
            if (!project) {
                ctx.writeln('无法读取当前作品', 'error');
                return;
            }
            ctx.writeln('project.json', 'info');
            (project.targets || []).forEach(t => {
                const blocks = Object.keys(t.blocks || {}).length;
                const costumes = (t.costumes || []).length;
                const sounds = (t.sounds || []).length;
                ctx.writeln(`  ${targetLabel(t)}/`, 'info');
                ctx.writeln(`    script/   (${blocks} 个积木)`, 'info');
                ctx.writeln(`    costumes/ (${costumes})`, 'info');
                ctx.writeln(`    sounds/   (${sounds})`, 'info');
            });
        }
    },
    cat: {
        desc: '查看文件：cat project.json | cat <角色> | cat <角色>/script',
        run: (ctx, args) => catFile(ctx, args)
    },
    read: {
        desc: 'cat 的别名，同上',
        run: (ctx, args) => catFile(ctx, args)
    },
    vars: {
        desc: '列出当前作品中的所有变量（含全局与角色级）',
        run: (ctx) => {
            const project = getProject();
            if (!project) {
                ctx.writeln('无法读取当前作品', 'error');
                return;
            }
            const seen = new Set();
            (project.targets || []).forEach(t => {
                const scope = t.isStage ? '全局' : t.name;
                const vars = t.variables || {};
                Object.keys(vars).forEach(id => {
                    const v = vars[id];
                    if (Array.isArray(v)) {
                        const key = `${scope}:${v[0]}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            ctx.writeln(`[${scope}] ${v[0]} = ${JSON.stringify(v[1])}`, 'info');
                        }
                    }
                });
            });
            if (seen.size === 0) ctx.writeln('（无变量）', 'info');
        }
    },
    rename: {
        desc: '重命名角色：rename <旧角色名> <新角色名>',
        run: (ctx, args) => {
            if (args.length < 2) {
                ctx.writeln('用法：rename <旧角色名> <新角色名>', 'error');
                return;
            }
            const oldName = args[0];
            const newName = args.slice(1).join(' ');
            const project = getProject();
            if (!project) {
                ctx.writeln('无法读取当前作品', 'error');
                return;
            }
            const target = (project.targets || []).find(t => !t.isStage && t.name === oldName);
            if (!target) {
                ctx.writeln(`未找到角色：${oldName}`, 'error');
                return;
            }
            target.name = newName;
            applyProject(project)
                .then(() => ctx.writeln(`已将角色「${oldName}」重命名为「${newName}」`, 'ok'))
                .catch(e => ctx.writeln('应用失败：' + e.message, 'error'));
        }
    },
    'rename-var': {
        desc: '重命名变量：rename-var <旧变量名> <新变量名>',
        run: (ctx, args) => {
            if (args.length < 2) {
                ctx.writeln('用法：rename-var <旧变量名> <新变量名>', 'error');
                return;
            }
            const oldName = args[0];
            const newName = args.slice(1).join(' ');
            const project = getProject();
            if (!project) {
                ctx.writeln('无法读取当前作品', 'error');
                return;
            }
            let renamed = 0;
            (project.targets || []).forEach(t => {
                const vars = t.variables || {};
                Object.keys(vars).forEach(id => {
                    if (Array.isArray(vars[id]) && vars[id][0] === oldName) {
                        vars[id][0] = newName;
                        renamed++;
                    }
                });
            });
            if (renamed === 0) {
                ctx.writeln(`未找到变量：${oldName}`, 'error');
                return;
            }
            applyProject(project)
                .then(() => ctx.writeln(`已重命名变量 ${renamed} 处`, 'ok'))
                .catch(e => ctx.writeln('应用失败：' + e.message, 'error'));
        }
    },
    rm: {
        desc: '删除角色：rm <角色名>',
        run: (ctx, args) => {
            const name = args[0];
            if (!name) {
                ctx.writeln('用法：rm <角色名>', 'error');
                return;
            }
            const project = getProject();
            if (!project) {
                ctx.writeln('无法读取当前作品', 'error');
                return;
            }
            const before = (project.targets || []).length;
            project.targets = (project.targets || []).filter(t => t.isStage || t.name !== name);
            if (project.targets.length === before) {
                ctx.writeln(`未找到角色：${name}`, 'error');
                return;
            }
            applyProject(project)
                .then(() => ctx.writeln(`已删除角色「${name}」`, 'ok'))
                .catch(e => ctx.writeln('应用失败：' + e.message, 'error'));
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
            {id: `line-${++idRef.current}`, text: '终端就绪。输入 \'ls\' 查看作品文件，输入 \'help\' 查看命令。', cls: 'ok'},
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
                    wordBreak: 'break-word',
                    // 允许选中复制终端输出（覆盖编辑器全局 user-select:none）
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    MozUserSelect: 'text',
                    msUserSelect: 'text',
                    cursor: 'text'
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

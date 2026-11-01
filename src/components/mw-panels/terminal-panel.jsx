import React, {useEffect, useRef, useState, useCallback} from 'react';
import {makeT} from '../mw/mw-l10n.js';

// 纯 DOM 终端，无 CDN 依赖。
// 命令可读取/编辑当前作品文件，范式与「超级重构」一致：
//   读取  -> vm.toJSON() 把当前作品序列化成 project.json
//   应用  -> vm.loadProject(newData) 把修改后的数据重新加载回作品


// ---- 终端界面文案（en / zh-cn / geng / wenyan）----
const T = makeT({
    errNoVm: {en: 'Cannot access the VM', 'zh-cn': '无法获取 VM', geng: '拿不到 VM 嗷', wenyan: '不得虚机'},
    outputTruncated: {en: '... (output truncated)', 'zh-cn': '... (输出已截断)', geng: '... (输出太长砍了)', wenyan: '…（输出已裁）'},
    catUsage: {en: 'Usage: cat <project.json | sprite name | sprite name/script>', 'zh-cn': '用法：cat <project.json | 角色名 | 角色名/script>', geng: '用法：cat <project.json | 角色名 | 角色名/script>', wenyan: '用法：cat <project.json | 角色名 | 角色名/script>'},
    cannotReadProject: {en: 'Cannot read the current project', 'zh-cn': '无法读取当前作品', geng: '读不到当前作品嗷', wenyan: '不得读当前之作'},
    notFound: {en: 'Not found: {path}', 'zh-cn': '未找到：{path}', geng: '找不到：{path}', wenyan: '未得：{path}'},
    helpDesc: {en: 'Show help', 'zh-cn': '显示帮助信息', geng: '看帮助嗷', wenyan: '示其助'},
    availableCommands: {en: 'Available commands:', 'zh-cn': '可用命令：', geng: '能用的命令：', wenyan: '可用之令：'},
    historyHint: {en: "Tip: press ↑/↓ to browse history, press Enter to run.", 'zh-cn': '提示：↑/↓ 浏览历史，输入后按回车执行。', geng: '提示：↑/↓ 翻历史，回车就跑。', wenyan: '示：↑/↓ 览其史，录毕按回车行之。'},
    clearDesc: {en: 'Clear the terminal', 'zh-cn': '清空终端', geng: '清屏嗷', wenyan: '涤其端'},
    echoDesc: {en: 'Echo the input text', 'zh-cn': '回显输入的文本', geng: '你说啥它说啥', wenyan: '复述所录之言'},
    dateDesc: {en: 'Show current date and time', 'zh-cn': '显示当前日期与时间', geng: '看看现在几点', wenyan: '示今之日期时刻'},
    whoamiDesc: {en: 'Show current user', 'zh-cn': '显示当前用户', geng: '我是谁嗷', wenyan: '示今之用者'},
    versionDesc: {en: 'Show the RemixWarp version', 'zh-cn': '显示 RemixWarp 版本', geng: '看看版本号', wenyan: '示 RemixWarp 之版'},
    aboutDesc: {en: 'About RemixWarp', 'zh-cn': '关于 RemixWarp', geng: '关于 RemixWarp 嗷', wenyan: 'RemixWarp 之本末'},
    aboutLine1: {en: 'RemixWarp — an enhanced editor based on Scratch', 'zh-cn': 'RemixWarp — 基于 Scratch 的增强编辑器', geng: 'RemixWarp — Scratch 的增强版编辑器嗷', wenyan: 'RemixWarp — 本乎 Scratch 之增补编辑器'},
    aboutLine2: {en: 'With command palette, terminal and VS Code style layout.', 'zh-cn': '集成命令面板、终端与 VS Code 风格布局。', geng: '带命令面板、终端和 VS Code 风格布局。', wenyan: '兼命令之panel、终端与 VS Code 之布局。'},
    lsDesc: {en: 'List files of the current project (project.json + sprites/stage)', 'zh-cn': '列出当前作品的文件（project.json + 各角色/舞台）', geng: '列作品文件（project.json + 角色/舞台）', wenyan: '列当前作品之牍（project.json 并诸角色/舞台）'},
    blocksCount: {en: '({count} blocks)', 'zh-cn': '({count} 个积木)', geng: '({count} 块积木嗷)', wenyan: '（积木 {count} 枚）'},
    readDesc: {en: 'Read a file: cat project.json | cat <sprite> | cat <sprite>/script', 'zh-cn': '查看文件：cat project.json | cat <角色> | cat <角色>/script', geng: '看文件：cat project.json | cat <角色> | cat <角色>/script', wenyan: '观牍：cat project.json | cat <角色> | cat <角色>/script'},
    readAliasDesc: {en: 'Alias of cat, same as above', 'zh-cn': 'cat 的别名，同上', geng: 'cat 的别名，一样嗷', wenyan: 'cat 之别名，同上'},
    varsDesc: {en: 'List all variables in the project (global and sprite-level)', 'zh-cn': '列出当前作品中的所有变量（含全局与角色级）', geng: '列出作品里所有变量（全局的和角色的都有）', wenyan: '列当前作品诸变数（兼全局与角色）'},
    noVars: {en: '(no variables)', 'zh-cn': '（无变量）', geng: '（一个变量都没有嗷）', wenyan: '（无变数）'},
    scopeGlobal: {en: 'global', 'zh-cn': '全局', geng: '全局的', wenyan: '通天下'},
    renameDesc: {en: 'Rename a sprite: rename <old name> <new name>', 'zh-cn': '重命名角色：rename <旧角色名> <新角色名>', geng: '改角色名：rename <旧角色名> <新角色名>', wenyan: '改角色之名：rename <旧名> <新名>'},
    renameUsage: {en: 'Usage: rename <old sprite name> <new sprite name>', 'zh-cn': '用法：rename <旧角色名> <新角色名>', geng: '用法：rename <旧角色名> <新角色名>', wenyan: '用法：rename <旧角色名> <新角色名>'},
    spriteNotFound: {en: 'Sprite not found: {name}', 'zh-cn': '未找到角色：{name}', geng: '没这个角色：{name}', wenyan: '未得角色：{name}'},
    spriteRenamed: {en: 'Renamed sprite "{old}" to "{new}"', 'zh-cn': '已将角色「{old}」重命名为「{new}」', geng: '角色「{old}」改名成「{new}」咯', wenyan: '角色「{old}」已改名「{new}」'},
    renameVarDesc: {en: 'Rename a variable: rename-var <old name> <new name>', 'zh-cn': '重命名变量：rename-var <旧变量名> <新变量名>', geng: '改变量名：rename-var <旧变量名> <新变量名>', wenyan: '改变数之名：rename-var <旧名> <新名>'},
    renameVarUsage: {en: 'Usage: rename-var <old variable name> <new variable name>', 'zh-cn': '用法：rename-var <旧变量名> <新变量名>', geng: '用法：rename-var <旧变量名> <新变量名>', wenyan: '用法：rename-var <旧变数名> <新变数名>'},
    varNotFound: {en: 'Variable not found: {name}', 'zh-cn': '未找到变量：{name}', geng: '没这个变量：{name}', wenyan: '未得变数：{name}'},
    varRenamed: {en: 'Renamed variable at {count} place(s)', 'zh-cn': '已重命名变量 {count} 处', geng: '变量改名完成，共 {count} 处', wenyan: '变数已更名，凡 {count} 处'},
    applyFailed: {en: 'Failed to apply: {message}', 'zh-cn': '应用失败：{message}', geng: '没应用上：{message}', wenyan: '行之未成：{message}'},
    rmDesc: {en: 'Delete a sprite: rm <sprite name>', 'zh-cn': '删除角色：rm <角色名>', geng: '删角色：rm <角色名>', wenyan: '除角色：rm <角色名>'},
    rmUsage: {en: 'Usage: rm <sprite name>', 'zh-cn': '用法：rm <角色名>', geng: '用法：rm <角色名>', wenyan: '用法：rm <角色名>'},
    spriteDeleted: {en: 'Deleted sprite "{name}"', 'zh-cn': '已删除角色「{name}」', geng: '角色「{name}」删掉咯', wenyan: '角色「{name}」已除'},
    themeDesc: {en: 'Show or switch theme (theme <dark|light>)', 'zh-cn': '显示或切换主题（theme <dark|light>）', geng: '看或换主题（theme <dark|light>）', wenyan: '示或易其题（theme <dark|light>）'},
    themeSwitched: {en: 'Switched to {mode} theme.', 'zh-cn': '已请求切换到 {mode} 主题。', geng: '换到 {mode} 主题咯。', wenyan: '已请易为 {mode} 之题。'},
    themePreference: {en: 'Current system theme preference: {mode}', 'zh-cn': '当前系统主题偏好：{mode}', geng: '系统主题偏好：{mode}', wenyan: '今系统所好之题：{mode}'},
    themeUsage: {en: 'Usage: theme <dark|light>', 'zh-cn': '用法：theme <dark|light>', geng: '用法：theme <dark|light>', wenyan: '用法：theme <dark|light>'},
    cmdNotFound: {en: 'Command not found: {cmd}', 'zh-cn': '命令未找到: {cmd}', geng: '没这命令: {cmd}', wenyan: '未得其令: {cmd}'},
    cmdHelpHint: {en: "Type 'help' to see available commands.", 'zh-cn': "输入 'help' 查看可用命令。", geng: "输个 'help' 看看有啥命令。", wenyan: "录 'help' 以观可用之令。"},
    ready: {en: "Terminal ready. Type 'ls' to view project files, 'help' for commands.", 'zh-cn': "终端就绪。输入 'ls' 查看作品文件，输入 'help' 查看命令。", geng: "终端就绪嗷。输 'ls' 看作品文件，输 'help' 看命令。", wenyan: "终端备矣。录 'ls' 观作品之牍，录 'help' 观其令。"},
    openTerminalTitle: {en: ' - Open the terminal window', 'zh-cn': ' - 打开终端窗口', geng: ' - 开个终端嗷', wenyan: ' - 启终端之窗'},
});

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
    if (!vm) return Promise.reject(new Error(T('errNoVm')));
    return vm.loadProject(project);
};

// 大文件输出超过该长度则截断，避免卡死终端
const MAX_OUTPUT = 8000;
const truncate = text => (text.length > MAX_OUTPUT ?
    text.slice(0, MAX_OUTPUT) + '\n' + T('outputTruncated') : text);

const targetLabel = t => (t.isStage ? 'stage' : t.name);

// cat / read 共用的文件查看逻辑
const catFile = (ctx, args) => {
    const path = args[0];
    if (!path) {
        ctx.writeln(T('catUsage'), 'error');
        return;
    }
    const project = getProject();
    if (!project) {
        ctx.writeln(T('cannotReadProject'), 'error');
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
        ctx.writeln(T('notFound').replace('{path}', path), 'error');
        return;
    }
    const content = isScript ? (target.blocks || {}) : target;
    ctx.writeln(truncate(JSON.stringify(content, null, 2)), 'info');
};

const COMMANDS = {
    help: {
        desc: T('helpDesc'),
        run: (ctx) => {
            ctx.writeln(T('availableCommands'), 'info');
            Object.keys(COMMANDS).sort().forEach(name => {
                ctx.writeln(`  ${name.padEnd(12)} - ${COMMANDS[name].desc}`, 'info');
            });
            ctx.writeln('');
            ctx.writeln(T('historyHint'), 'info');
        }
    },
    clear: {desc: T('clearDesc'), run: (ctx) => ctx.clear()},
    cls: {desc: T('clearDesc'), run: (ctx) => ctx.clear()},
    echo: {desc: T('echoDesc'), run: (ctx, args) => ctx.writeln(args.join(' '), 'info')},
    date: {desc: T('dateDesc'), run: (ctx) => ctx.writeln(new Date().toString(), 'info')},
    whoami: {desc: T('whoamiDesc'), run: (ctx) => ctx.writeln('remixwarp-user', 'info')},
    version: {desc: T('versionDesc'), run: (ctx) => ctx.writeln('RemixWarp 1.0.3', 'info')},
    about: {
        desc: T('aboutDesc'),
        run: (ctx) => {
            ctx.writeln(T('aboutLine1'), 'ok');
            ctx.writeln(T('aboutLine2'), 'info');
        }
    },
    // ---- 作品文件相关（模仿超级重构读取/修改当前项目）----
    ls: {
        desc: T('lsDesc'),
        run: (ctx) => {
            const project = getProject();
            if (!project) {
                ctx.writeln(T('cannotReadProject'), 'error');
                return;
            }
            ctx.writeln('project.json', 'info');
            (project.targets || []).forEach(t => {
                const blocks = Object.keys(t.blocks || {}).length;
                const costumes = (t.costumes || []).length;
                const sounds = (t.sounds || []).length;
                ctx.writeln(`  ${targetLabel(t)}/`, 'info');
                ctx.writeln(`    script/   ${T('blocksCount').replace('{count}', blocks)}`, 'info');
                ctx.writeln(`    costumes/ (${costumes})`, 'info');
                ctx.writeln(`    sounds/   (${sounds})`, 'info');
            });
        }
    },
    cat: {
        desc: T('readDesc'),
        run: (ctx, args) => catFile(ctx, args)
    },
    read: {
        desc: T('readAliasDesc'),
        run: (ctx, args) => catFile(ctx, args)
    },
    vars: {
        desc: T('varsDesc'),
        run: (ctx) => {
            const project = getProject();
            if (!project) {
                ctx.writeln(T('cannotReadProject'), 'error');
                return;
            }
            const seen = new Set();
            (project.targets || []).forEach(t => {
                const scope = t.isStage ? T('scopeGlobal') : t.name;
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
            if (seen.size === 0) ctx.writeln(T('noVars'), 'info');
        }
    },
    rename: {
        desc: T('renameDesc'),
        run: (ctx, args) => {
            if (args.length < 2) {
                ctx.writeln(T('renameUsage'), 'error');
                return;
            }
            const oldName = args[0];
            const newName = args.slice(1).join(' ');
            const project = getProject();
            if (!project) {
                ctx.writeln(T('cannotReadProject'), 'error');
                return;
            }
            const target = (project.targets || []).find(t => !t.isStage && t.name === oldName);
            if (!target) {
                ctx.writeln(T('spriteNotFound').replace('{name}', oldName), 'error');
                return;
            }
            target.name = newName;
            applyProject(project)
                .then(() => ctx.writeln(T('spriteRenamed').replace('{old}', oldName).replace('{new}', newName), 'ok'))
                .catch(e => ctx.writeln(T('applyFailed').replace('{message}', e.message), 'error'));
        }
    },
    'rename-var': {
        desc: T('renameVarDesc'),
        run: (ctx, args) => {
            if (args.length < 2) {
                ctx.writeln(T('renameVarUsage'), 'error');
                return;
            }
            const oldName = args[0];
            const newName = args.slice(1).join(' ');
            const project = getProject();
            if (!project) {
                ctx.writeln(T('cannotReadProject'), 'error');
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
                ctx.writeln(T('varNotFound').replace('{name}', oldName), 'error');
                return;
            }
            applyProject(project)
                .then(() => ctx.writeln(T('varRenamed').replace('{count}', renamed), 'ok'))
                .catch(e => ctx.writeln(T('applyFailed').replace('{message}', e.message), 'error'));
        }
    },
    rm: {
        desc: T('rmDesc'),
        run: (ctx, args) => {
            const name = args[0];
            if (!name) {
                ctx.writeln(T('rmUsage'), 'error');
                return;
            }
            const project = getProject();
            if (!project) {
                ctx.writeln(T('cannotReadProject'), 'error');
                return;
            }
            const before = (project.targets || []).length;
            project.targets = (project.targets || []).filter(t => t.isStage || t.name !== name);
            if (project.targets.length === before) {
                ctx.writeln(T('spriteNotFound').replace('{name}', name), 'error');
                return;
            }
            applyProject(project)
                .then(() => ctx.writeln(T('spriteDeleted').replace('{name}', name), 'ok'))
                .catch(e => ctx.writeln(T('applyFailed').replace('{message}', e.message), 'error'));
        }
    },
    theme: {
        desc: T('themeDesc'),
        run: (ctx, args) => {
            const mode = (args[0] || '').toLowerCase();
            if (mode === 'dark' || mode === 'light') {
                window.dispatchEvent(new CustomEvent('mw-theme-set', {detail: mode}));
                ctx.writeln(T('themeSwitched').replace('{mode}', mode), 'ok');
            } else {
                const dark = window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                ctx.writeln(T('themePreference').replace('{mode}', dark ? 'dark' : 'light'));
                ctx.writeln(T('themeUsage'));
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
            ctx.writeln(T('cmdNotFound').replace('{cmd}', cmd), 'error');
            ctx.writeln(T('cmdHelpHint'), 'error');
        }
    }, [appendLines]);

    // 初次挂载：打印 banner 并自动聚焦输入框
    useEffect(() => {
        const banner = [
            {id: `line-${++idRef.current}`, text: '=== RemixWarp Terminal ===', cls: 'ok'},
            {id: `line-${++idRef.current}`, text: T('ready'), cls: 'ok'},
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
            onClick={e => {
                // 正在用鼠标拖选文本时不抢焦点，否则选区会被输入框夺走
                const sel = window.getSelection();
                if (sel && sel.toString().length > 0) return;
                if (inputRef.current) inputRef.current.focus();
            }}
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
                    cursor: 'text',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    MozUserSelect: 'text',
                    msUserSelect: 'text'
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

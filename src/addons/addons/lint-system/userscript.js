// Lint System addon — 实时 Lint + Quick Fix + 重构建议
// ID 11: Lint 系统 + 实时错误提示 + Quick Fix + 重构建议

import WindowManager from '../../window-system/window-manager.js';

export default async function ({ addon, console: _console }) {
    const Blockly = await addon.tab.traps.getBlockly();
    const vm = addon.tab.traps.vm;

    // ========== Lint 规则定义 ==========
    const RULES = [
        {
            id: 'empty-script',
            name: '空脚本',
            severity: 'warning',
            category: 'logic',
            check(block, ctx) {
                // 帽子积木下面没有任何积木
                if (block.topLevel && !block.nextConnection) return true;
                if (block.nextConnection && !block.nextConnection.targetBlock()) return true;
                return false;
            },
            message: (block) => `脚本 "${getBlockLabel(block)}" 没有连接任何积木，建议删除`,
            quickFix: null
        },
        {
            id: 'empty-if-branch',
            name: '空分支',
            severity: 'error',
            category: 'logic',
            check(block, ctx) {
                const op = block.opcode || block.type;
                if (!['control_if', 'control_if_else'].includes(op)) return false;
                const inputs = block.inputList || [];
                for (const input of inputs) {
                    if (input.name === 'SUBSTACK' || input.name === 'SUBSTACK2') {
                        const conn = input.connection;
                        if (conn && !conn.targetBlock()) return true;
                    }
                }
                return false;
            },
            message: () => '条件分支为空，请添加积木或删除此分支',
            quickFix: {
                label: '删除空分支',
                action: (block) => {
                    if (block.opcode === 'control_if') {
                        block.dispose(true);
                    }
                }
            }
        },
        {
            id: 'dead-code',
            name: '死代码',
            severity: 'error',
            category: 'logic',
            check(block, ctx) {
                // 在 forever 或 stop 后面的积木
                const parent = block.getParent ? block.getParent() : null;
                if (!parent) return false;
                const op = parent.opcode || parent.type;
                if (op === 'control_forever') {
                    // 检查是否在 forever 之后
                    const next = parent.nextConnection;
                    if (next) {
                        let target = next.targetBlock();
                        while (target) {
                            if (target.id === block.id) return true;
                            target = target.getNextBlock ? target.getNextBlock() : null;
                        }
                    }
                    return false;
                }
                if (op === 'control_stop') {
                    const next = parent.nextConnection;
                    if (next) {
                        let target = next.targetBlock();
                        while (target) {
                            if (target.id === block.id) return true;
                            target = target.getNextBlock ? target.getNextBlock() : null;
                        }
                    }
                    return false;
                }
                return false;
            },
            message: () => '此积木在 forever/stop 之后，永远不会执行',
            quickFix: {
                label: '删除死代码',
                action: (block) => block.dispose(true)
            }
        },
        {
            id: 'long-script',
            name: '过长脚本',
            severity: 'warning',
            category: 'complexity',
            check(block, ctx) {
                if (!block.topLevel) return false;
                let count = 1;
                let next = block.getNextBlock ? block.getNextBlock() : null;
                while (next) { count++; next = next.getNextBlock ? next.getNextBlock() : null; }
                block.__scriptLength = count;
                return count > 30;
            },
            message: (block) => `脚本长度 ${block.__scriptLength || '?'} 积木，超过建议上限 30，建议拆分为自定义积木`,
            quickFix: null
        },
        {
            id: 'magic-number-repeat',
            name: '魔法数字',
            severity: 'warning',
            category: 'style',
            check(block, ctx) {
                const op = block.opcode || block.type;
                if (op !== 'control_repeat') return false;
                const fields = block.inputList || [];
                for (const input of fields) {
                    const f = (input.fieldRow || []).find(f => f.name === 'TIMES');
                    if (f && f.value && parseInt(f.value) > 50) {
                        block.__magicValue = f.value;
                        return true;
                    }
                }
                return false;
            },
            message: (block) => `重复次数 ${block.__magicValue} 过大，建议使用变量或循环`,
            quickFix: null
        },
        {
            id: 'empty-procedure-def',
            name: '空的积木定义',
            severity: 'warning',
            category: 'logic',
            check(block, ctx) {
                const op = block.opcode || block.type;
                if (op !== 'procedures_definition') return false;
                // 检查是否有积木体
                const inputs = block.inputList || [];
                for (const input of inputs) {
                    if (input.name === 'custom_block') {
                        const conn = input.connection;
                        if (conn && !conn.targetBlock()) return true;
                        return false;
                    }
                }
                return false;
            },
            message: () => '自定义积木定义为空，没有功能实现',
            quickFix: null
        },
        {
            id: 'deep-nesting',
            name: '嵌套过深',
            severity: 'warning',
            category: 'complexity',
            check(block, ctx) {
                const nesting = getNestingDepth(block);
                if (nesting > 5) {
                    block.__nestingDepth = nesting;
                    return true;
                }
                return false;
            },
            message: (block) => `嵌套深度 ${block.__nestingDepth || '?'} 层，超过建议上限 5 层，建议提取为自定义积木`,
            quickFix: null
        },
        {
            id: 'unused-variable',
            name: '未使用的变量',
            severity: 'info',
            category: 'cleanup',
            check(block, ctx) {
                const op = block.opcode || block.type;
                if (['data_variable'].includes(op)) {
                    // 仅报告，实际检查在全局分析中完成
                    return false;
                }
                return false;
            }
        },
        {
            id: 'missing-hat',
            name: '缺少帽子积木',
            severity: 'warning',
            category: 'logic',
            check(block, ctx) {
                if (!block.topLevel) return false;
                const op = block.opcode || block.type;
                // 不是帽子积木的顶层积木
                const hatOps = ['event_whenflagclicked', 'event_whenkeypressed', 'event_whenthisspriteclicked',
                    'event_whenbackdropswitchesto', 'event_whengreaterthan', 'event_whenbroadcastreceived',
                    'control_start_as_clone', 'procedures_definition'];
                if (!hatOps.includes(op) && !op.startsWith('event_when') && !op.startsWith('hat_')) {
                    return true;
                }
                return false;
            },
            message: () => '顶层积木不是帽子积木（如"当绿旗被点击"），不会自动执行',
            quickFix: null
        },
        {
            id: 'duplicate-script',
            name: '重复脚本',
            severity: 'info',
            category: 'refactor',
            check(block, ctx) {
                if (!block.topLevel) return false;
                const sig = buildScriptSignature(block);
                if (!sig) return false;
                if (!ctx._scriptSigs) ctx._scriptSigs = {};
                if (ctx._scriptSigs[sig] && ctx._scriptSigs[sig] !== block.id) {
                    block.__duplicateOf = ctx._scriptSigs[sig];
                    return true;
                }
                ctx._scriptSigs[sig] = block.id;
                return false;
            },
            message: (block) => `此脚本与 ${getBlockLabelById(block.__duplicateOf)} 高度相似，建议提取为自定义积木`,
            quickFix: null
        },
        {
            id: 'orphan-broadcast',
            name: '无人接收的广播',
            severity: 'warning',
            category: 'logic',
            check(block, ctx) {
                const op = block.opcode || block.type;
                if (!['event_broadcast', 'event_broadcastandwait'].includes(op)) return false;
                const msg = getBroadcastMessage(block);
                if (!msg) return false;
                if (!ctx._broadcastsReceived) ctx._broadcastsReceived = new Set();
                // 需要分析所有积木后才知道
                return false;
            }
        },
        {
            id: 'large-clone-count',
            name: '大量克隆',
            severity: 'warning',
            category: 'performance',
            check(block, ctx) {
                const op = block.opcode || block.type;
                if (op !== 'control_create_clone_of') return false;
                // 检查是否在循环内
                const nesting = getNestingDepth(block);
                if (nesting > 0) {
                    block.__cloneNesting = nesting;
                    return true;
                }
                return false;
            },
            message: (block) => `克隆积木在循环内（嵌套 ${block.__cloneNesting} 层），可能创建大量克隆导致性能问题`,
            quickFix: null
        },
        {
            id: 'forever-no-wait',
            name: '无限循环无等待',
            severity: 'warning',
            category: 'performance',
            check(block, ctx) {
                const op = block.opcode || block.type;
                if (op !== 'control_forever') return false;
                // 检查 forever 内部是否有等待类积木
                const inputs = block.inputList || [];
                for (const input of inputs) {
                    if (input.name === 'SUBSTACK') {
                        const conn = input.connection;
                        if (conn) {
                            const inner = conn.targetBlock();
                            if (inner && !hasWaitBlock(inner)) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            },
            message: () => '无限循环内没有等待积木，可能导致页面卡死',
            quickFix: null
        }
    ];

    // ========== 辅助函数 ==========
    function getBlockLabel(block) {
        try {
            if (block.getCategory) return block.getCategory();
            const op = (block.opcode || block.type || 'unknown').replace(/_/g, ' ');
            // 尝试获取 Blockly 的输入文本
            const inputs = block.inputList || [];
            for (const inp of inputs) {
                if (inp.fieldRow && inp.fieldRow.length > 0) {
                    const text = inp.fieldRow.map(f => f.value || f.text || '').join(' ');
                    if (text.trim()) return text.trim().slice(0, 30);
                }
            }
            return op;
        } catch (e) { return 'unknown'; }
    }

    function getBlockLabelById(blockId) {
        try {
            const ws = Blockly.getMainWorkspace();
            if (!ws) return '未知积木';
            const block = ws.getBlockById(blockId);
            if (!block) return '未知积木';
            return getBlockLabel(block);
        } catch (e) { return '未知积木'; }
    }

    function getNestingDepth(block) {
        let depth = 0;
        let current = block.getSurroundParent ? block.getSurroundParent() : null;
        while (current) {
            depth++;
            current = current.getSurroundParent ? current.getSurroundParent() : null;
        }
        return depth;
    }

    function hasWaitBlock(block) {
        const waitOps = ['control_wait', 'control_wait_until', 'event_broadcastandwait'];
        let stack = [block];
        let visited = new Set();
        while (stack.length > 0) {
            const b = stack.pop();
            if (!b || visited.has(b.id)) continue;
            visited.add(b.id);
            const op = b.opcode || b.type;
            if (waitOps.includes(op)) return true;
            // 递归检查子积木
            if (b.getChildren) {
                const children = b.getChildren(false) || [];
                stack.push(...children);
            }
            const next = b.getNextBlock ? b.getNextBlock() : null;
            if (next) stack.push(next);
        }
        return false;
    }

    function buildScriptSignature(block) {
        const parts = [];
        let current = block;
        for (let i = 0; i < 10 && current; i++) {
            parts.push(current.opcode || current.type);
            current = current.getNextBlock ? current.getNextBlock() : null;
        }
        return parts.join('|');
    }

    function getBroadcastMessage(block) {
        const inputs = block.inputList || [];
        for (const inp of inputs) {
            if (inp.fieldRow) {
                for (const f of inp.fieldRow) {
                    if (f.name === 'BROADCAST_OPTION' && f.value) {
                        return f.value;
                    }
                }
            }
        }
        return null;
    }

    function getAllBlocks(ws) {
        const blocks = [];
        const topBlocks = ws.getTopBlocks(false) || [];
        for (const top of topBlocks) {
            let current = top;
            while (current) {
                blocks.push(current);
                // 递归子积木
                if (current.getChildren) {
                    const children = current.getChildren(false) || [];
                    for (const child of children) {
                        collectBlocks(child, blocks);
                    }
                }
                current = current.getNextBlock ? current.getNextBlock() : null;
            }
        }
        return blocks;
    }

    function collectBlocks(block, arr) {
        arr.push(block);
        if (block.getChildren) {
            const children = block.getChildren(false) || [];
            for (const child of children) {
                collectBlocks(child, arr);
            }
        }
        const next = block.getNextBlock ? block.getNextBlock() : null;
        if (next) collectBlocks(next, arr);
    }

    // ========== 积木文本转换（发送给 AI）==========
    // 获取值块（reporter/shadow）的显示文本
    function getValueBlockText(block) {
        if (!block) return '';
        try {
            // 优先用 toString（对 reporter 通常返回正确值，如 "10"、"你好"）
            if (typeof block.toString === 'function') {
                const ts = block.toString();
                if (ts && ts !== block.type && ts !== block.opcode && ts.trim()) {
                    return ts;
                }
            }
            // 兜底：用 getBlockDisplayText（已区分 reporter/非 reporter）
            return getBlockDisplayText(block);
        } catch (e) { return ''; }
    }

    // 判断是否是 reporter（值块：圆形/椭圆形积木，如数字、字符串、变量等）
    function isReporterBlock(block) {
        if (!block) return false;
        // Blockly reporter 特征：有 outputShape_（1=圆形，2=椭圆形），没有 previousConnection
        if (block.outputShape_ !== undefined && block.outputShape_ !== 0) return true;
        // Scratch reporter 通常没有 previousConnection（不能连接到前面的积木）
        if (!block.previousConnection && block.outputConnection) return true;
        return false;
    }

    function getBlockDisplayText(block) {
        if (!block) return '';
        try {
            // reporter 值块：用 toString() 获取完整值（如 "10"、"你好"、"x"）
            if (isReporterBlock(block)) {
                if (typeof block.toString === 'function') {
                    const ts = block.toString();
                    if (ts && ts !== block.type && ts !== block.opcode && ts.trim()) return ts;
                }
                return getValueBlockText(block);
            }
            // 非 reporter 积木（语句/帽子/C型）：始终用 getBlockSimpleText 手动拼接
            // 因为 Blockly 的 toString() 对这类积木经常缺失部分字段值
            return getBlockSimpleText(block);
        } catch (e) {
            return getBlockSimpleText(block);
        }
    }

    // 获取字段的显示文本（优先用 getText，兜底用 getValue + 选项查找）
    function getFieldDisplayText(field) {
        try {
            // 1. 优先用 Blockly 的 getText() — 返回用户看到的显示文字
            if (typeof field.getText === 'function') {
                const t = field.getText();
                if (t && typeof t === 'string' && t.trim()) return t.trim();
            }
            // 2. 对于 FieldDropdown：用 getValue() 查选项表得到显示文本
            if (typeof field.getValue === 'function' && typeof field.getOptions === 'function') {
                const val = field.getValue();
                if (val !== undefined && val !== null) {
                    const options = field.getOptions();
                    if (options && Array.isArray(options)) {
                        const found = options.find(opt => opt[1] === val);
                        if (found && found[0]) return found[0];
                    }
                }
            }
            // 3. 兜底：直接用属性
            if (field.text_ && typeof field.text_ === 'string' && field.text_.trim()) return field.text_.trim();
            if (field.value !== undefined && field.value !== null) {
                return String(field.value).trim();
            }
            if (field.text && typeof field.text === 'string' && field.text.trim()) return field.text.trim();
            return '';
        } catch (e) { return ''; }
    }

    // 手动拼接积木完整文本（标题 + 所有字段/输入值）
    function getBlockSimpleText(block) {
        const parts = [];
        try {
            const inputs = block.inputList || [];
            for (const input of inputs) {
                // 1. 字段行：积木标题文字、下拉菜单
                if (input.fieldRow && input.fieldRow.length > 0) {
                    for (const field of input.fieldRow) {
                        const v = getFieldDisplayText(field);
                        if (v && v.trim()) {
                            parts.push(v.trim());
                        }
                    }
                }
                // 2. 输入连接：如果有 targetBlock（输入值 / 变量 / 嵌套积木）
                if (input.connection && input.connection.targetBlock) {
                    const inner = input.connection.targetBlock();
                    if (inner) {
                        // SUBSTACK/SUBSTACK2 是嵌套语句（C 型积木），不显示在同一行
                        if (input.name === 'SUBSTACK' || input.name === 'SUBSTACK2') continue;
                        // 其他是 value input：数字输入、字符串输入、变量、列表项选择等
                        const innerText = getBlockDisplayText(inner);
                        if (innerText) {
                            parts.push(`[${innerText}]`);
                        }
                    }
                }
            }
        } catch (e) {}
        if (parts.length === 0) {
            return (block.opcode || block.type || '积木').replace(/_/g, ' ');
        }
        return parts.join(' ');
    }

    function blockToReadableText(block, indent = 0) {
        if (!block) return '';
        const prefix = '  '.repeat(indent);
        let text = prefix + getBlockDisplayText(block);

        // 遍历嵌套子积木（SUBSTACK / SUBSTACK2）
        for (const input of block.inputList || []) {
            if (input.name === 'SUBSTACK' || input.name === 'SUBSTACK2') {
                const conn = input.connection;
                if (conn) {
                    const inner = conn.targetBlock();
                    if (inner) {
                        text += '\n' + blockToReadableText(inner, indent + 1);
                    }
                }
            }
        }

        // 遍历同层后续积木
        const next = block.getNextBlock ? block.getNextBlock() : null;
        if (next) {
            text += '\n' + blockToReadableText(next, indent);
        }
        return text;
    }

    // 找到积木的顶层父积木（如果在嵌套结构中，如 if/else/count 内部）
    function getTopLevelBlock(block) {
        if (!block) return block;
        try {
            let current = block;
            // 向上遍历：如果积木是某个父积木的 SUBSTACK 输入中的第一个积木
            while (true) {
                const prev = current.previousConnection ? current.previousConnection() : null;
                // 如果有前一个连接，说明是链条中的中间积木，向上追溯
                if (prev) {
                    const prevBlock = prev.sourceBlock();
                    if (prevBlock) {
                        current = prevBlock;
                        continue;
                    }
                }
                break;
            }
            // 现在 current 是链条顶端，但可能仍在某个 C 型积木的 SUBSTACK 内
            // 继续向上找：检查 current 是否是某个父积木 SUBSTACK 输入的 targetBlock
            while (true) {
                // 遍历所有可能包含此积木的父积木
                const ws = Blockly.getMainWorkspace();
                if (!ws) break;
                let foundParent = null;
                const allBlocks = getAllBlocks(ws);
                for (const b of allBlocks) {
                    if (!b.inputList) continue;
                    for (const input of b.inputList) {
                        if (input.name === 'SUBSTACK' || input.name === 'SUBSTACK2') {
                            const conn = input.connection;
                            if (conn && conn.targetBlock() === current) {
                                foundParent = b;
                                break;
                            }
                        }
                    }
                    if (foundParent) break;
                }
                if (foundParent) {
                    current = foundParent;
                } else {
                    break;
                }
            }
            return current;
        } catch (e) {
            return block;
        }
    }

    // ========== AI 请求（复用 02agent 逻辑）==========
    // ai-api-models-test.md 中确认可用的模型（短名称）
    const AI_VALID_MODELS = new Set([
        'deepseek-r1-distill-qwen-32b',
        'gemma-2b-it-lora',
        'gemma-7b-it',
        'gemma-7b-it-lora',
        'llama-3.1-8b-instruct-fast',
        'llama-3.1-8b-instruct-fp8',
        'llama-3.2-1b-instruct',
        'llama-3.2-3b-instruct',
        'llama-3.3-70b-instruct-fp8-fast',
        'llama-4-scout-17b-16e-instruct',
        'mistral-7b-instruct-v0.1',
        'mistral-7b-instruct-v0.2',
        'mistral-7b-instruct-v0.2-lora'
    ]);

    // 来自 ai-api-models-test.md 的官方配置
    const AI_DEFAULT_CONFIG = {
        baseUrl: 'https://aiapi.remix.de5.net/v1/chat/completions',
        apiKey: 'sk-remixworld',
        model: 'llama-3.3-70b-instruct-fp8-fast', // 最强可用模型
        provider: 'custom'
    };

    function normalizeModelName(model) {
        if (!model) return AI_DEFAULT_CONFIG.model;
        // 如果是长名称 (@cf/... / @hf/...)，提取短名称
        if (model.startsWith('@cf/') || model.startsWith('@hf/')) {
            const parts = model.split('/');
            const short = parts[parts.length - 1];
            if (AI_VALID_MODELS.has(short)) return short;
        }
        if (AI_VALID_MODELS.has(model)) return model;
        // 模型不在白名单，回退到默认
        return AI_DEFAULT_CONFIG.model;
    }

    function isValidRemixAPI(baseUrl, apiKey) {
        if (!baseUrl || !apiKey) return false;
        const u = baseUrl.toLowerCase();
        // 只有 RemixWorld API (aiapi.remix.de5.net) 的 key 是 sk-remixworld
        // 其他 API 使用对应各自的 key
        if (u.includes('aiapi.remix.de5.net')) {
            return apiKey === 'sk-remixworld';
        }
        // 其他 API 只要有 key 就认为用户有意配置
        return !!apiKey;
    }

    function getCurrentAIConfig() {
        // 优先从 novatheai 的 localStorage 读取（它使用 aiapi.remix.de5.net）
        try {
            const agentsRaw = localStorage.getItem('AI_ASSISTANT_AGENTS');
            if (agentsRaw) {
                const agents = JSON.parse(agentsRaw);
                const currentModelId = JSON.parse(localStorage.getItem('AI_ASSISTANT_CURRENT_AGENT_ID') || '""');
                for (const agent of agents) {
                    const model = (agent.models || []).find(m => m.id === currentModelId);
                    if (model && agent.baseUrl && agent.apiKey && isValidRemixAPI(agent.baseUrl, agent.apiKey)) {
                        return {
                            baseUrl: agent.baseUrl,
                            apiKey: agent.apiKey,
                            model: normalizeModelName(model.modelId),
                            provider: agent.provider || 'custom'
                        };
                    }
                }
            }
        } catch (e) {}
        // 再尝试 02agent（但需校验 key 是否匹配 endpoint）
        try {
            const agentsRaw = localStorage.getItem('AI_ASSISTANT_AGENTS_02');
            if (agentsRaw) {
                const agents = JSON.parse(agentsRaw);
                const currentModelId = JSON.parse(localStorage.getItem('AI_ASSISTANT_CURRENT_AGENT_ID_02') || '""');
                for (const agent of agents) {
                    const model = (agent.models || []).find(m => m.id === currentModelId);
                    if (model && agent.baseUrl && agent.apiKey && isValidRemixAPI(agent.baseUrl, agent.apiKey)) {
                        return {
                            baseUrl: agent.baseUrl,
                            apiKey: agent.apiKey,
                            model: normalizeModelName(model.modelId),
                            provider: agent.provider || 'custom'
                        };
                    }
                }
            }
        } catch (e) {}
        // 最终回退：ai-api-models-test.md 官方指定的配置
        return AI_DEFAULT_CONFIG;
    }

    async function sendAIChatRequest(messages, onDelta, signal) {
        const config = getCurrentAIConfig();
        const url = config.baseUrl.endsWith('/chat/completions')
            ? config.baseUrl
            : `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                stream: true
            }),
            signal
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`AI 请求失败 (${response.status}): ${errText.slice(0, 200) || response.statusText}`);
        }

        // 先读取完整响应文本，再决定用 SSE 解析还是完整 JSON 解析
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let rawText = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            rawText += decoder.decode(value, { stream: true });
        }

        let fullText = '';

        // 尝试 1：作为 SSE 流解析（data: {...} 行）
        if (rawText.includes('data:')) {
            const lines = rawText.split('\n');
            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line.startsWith('data:')) continue;
                const payload = line.slice(5).trim();
                if (payload === '[DONE]') continue;
                try {
                    const parsed = JSON.parse(payload);
                    if (parsed.error) throw new Error(parsed.error.message || 'AI 返回错误');
                    const choice = parsed.choices?.[0];
                    if (!choice) continue;

                    // 流式：从 delta 中取
                    const delta = choice.delta;
                    if (delta) {
                        if (typeof delta.content === 'string' && delta.content) {
                            fullText += delta.content;
                            onDelta?.(delta.content, fullText);
                        }
                        const reasoningDelta = delta.reasoning_content || delta.reasoning || delta.reasoning_text;
                        if (reasoningDelta && typeof reasoningDelta === 'string') {
                            onDelta?.(null, fullText, reasoningDelta);
                        }
                    }

                    // 非流式消息（服务器可能不拆 delta）
                    if (!delta && choice.message) {
                        const msg = choice.message;
                        if (typeof msg.content === 'string' && msg.content) {
                            fullText = msg.content;
                            onDelta?.(null, fullText);
                        }
                    }
                } catch (e) {
                    if (e instanceof SyntaxError) continue;
                    throw e;
                }
            }
        }

        // 尝试 2：作为完整 JSON 解析（stream=false 时服务器直接返回完整响应）
        if (!fullText) {
            try {
                const parsed = JSON.parse(rawText.trim());
                if (parsed.error) throw new Error(parsed.error.message || 'AI 返回错误');
                const content = parsed.choices?.[0]?.message?.content;
                if (typeof content === 'string' && content) {
                    fullText = content;
                    onDelta?.(null, fullText);
                }
            } catch (e) {
                // JSON 解析失败，忽略
                if (!(e instanceof SyntaxError)) throw e;
            }
        }

        // 尝试 3：剥离 <think> 标签（deepseek-r1 等推理模型）
        if (fullText) {
            const thinkStart = fullText.indexOf('<think>');
            const thinkEnd = fullText.indexOf('</think>');
            if (thinkStart !== -1 && thinkEnd !== -1 && thinkEnd > thinkStart) {
                const thinking = fullText.slice(thinkStart + 7, thinkEnd).trim();
                const rest = fullText.slice(thinkEnd + 8).trim();
                if (thinking) onDelta?.(null, rest, thinking);
                fullText = rest || fullText;
            }
        }

        return fullText;
    }

    // ========== Lint 引擎 ==========
    class LintEngine {
        constructor() {
            this.results = [];
            this.lastRun = 0;
        }

        run() {
            const ws = Blockly.getMainWorkspace();
            if (!ws) return [];

            const results = [];
            const ctx = {};
            const allBlocks = getAllBlocks(ws);

            for (const block of allBlocks) {
                for (const rule of RULES) {
                    try {
                        if (rule.check(block, ctx)) {
                            results.push({
                                ruleId: rule.id,
                                ruleName: rule.name,
                                severity: rule.severity,
                                category: rule.category,
                                blockId: block.id,
                                message: typeof rule.message === 'function' ? rule.message(block) : rule.message,
                                quickFix: rule.quickFix
                            });
                        }
                    } catch (e) {
                        // 忽略单个规则检查错误
                    }
                }
            }

            this.results = results;
            this.lastRun = Date.now();
            return results;
        }

        getSummary() {
            const errors = this.results.filter(r => r.severity === 'error').length;
            const warnings = this.results.filter(r => r.severity === 'warning').length;
            const infos = this.results.filter(r => r.severity === 'info').length;
            return { errors, warnings, infos, total: this.results.length };
        }
    }

    // ========== 积木高亮 ==========
    class BlockHighlighter {
        constructor() {
            this.markers = new Map();
            this.visible = true;
        }

        highlight(results) {
            this.clear();
            if (!this.visible) return;

            const ws = Blockly.getMainWorkspace();
            if (!ws) return;

            const severityColors = {
                error: '#FF6680',
                warning: '#FFBF00',
                info: '#5CB1D6'
            };

            for (const r of results) {
                try {
                    const block = ws.getBlockById(r.blockId);
                    if (!block) continue;
                    const svg = block.getSvgRoot();
                    if (!svg) continue;

                    const color = severityColors[r.severity] || '#FFBF00';

                    // 添加彩色边框
                    svg.setAttribute('filter', `drop-shadow(0 0 2px ${color})`);
                    const path = svg.querySelector('path.blocklyPath');
                    if (path) {
                        path.setAttribute('stroke', color);
                        path.setAttribute('stroke-width', '2');
                    }

                    // 添加角标
                    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    marker.setAttribute('cx', '8');
                    marker.setAttribute('cy', '8');
                    marker.setAttribute('r', '4');
                    marker.setAttribute('fill', color);
                    marker.setAttribute('stroke', '#fff');
                    marker.setAttribute('stroke-width', '1');
                    marker.setAttribute('class', 'rw-lint-marker');
                    marker.style.pointerEvents = 'none';
                    svg.appendChild(marker);

                    this.markers.set(r.blockId, { svg, path, marker });
                } catch (e) {
                    // 忽略
                }
            }

            // 更新积木渲染
            ws.render();
        }

        clear() {
            for (const [_, { svg, path, marker }] of this.markers) {
                try {
                    svg.removeAttribute('filter');
                    if (path) {
                        path.removeAttribute('stroke');
                        path.removeAttribute('stroke-width');
                    }
                    if (marker && marker.parentNode) {
                        marker.parentNode.removeChild(marker);
                    }
                } catch (e) {}
            }
            this.markers.clear();
        }

        setVisible(v) {
            this.visible = v;
            if (!v) this.clear();
        }
    }

    // ========== AI 按钮注入器（hook renderDraw_ 方案，参考 cat-blocks）==========
    class AIBtnInjector {
        constructor() {
            this.hooked = false;
            this.blocks = new Map(); // blockId -> block（仅用于追踪）
        }

        install() {
            if (this.hooked) return;
            this.hooked = true;

            const self = this;
            // hook renderDraw_：每次积木渲染时都会调用
            const originalRenderDraw = Blockly.BlockSvg.prototype.renderDraw_;
            Blockly.BlockSvg.prototype.renderDraw_ = function (...args) {
                const r = originalRenderDraw.call(this, ...args);
                try {
                    self.addAIBtnToBlock(this);
                } catch (e) {
                    // 忽略
                }
                return r;
            };

            // hook dispose：积木销毁时清理追踪
            const originalDispose = Blockly.BlockSvg.prototype.dispose;
            Blockly.BlockSvg.prototype.dispose = function (...args) {
                self.blocks.delete(this.id);
                return originalDispose.call(this, ...args);
            };

            // 触发所有已存在积木重新渲染
            const ws = Blockly.getMainWorkspace();
            if (ws) {
                const allBlocks = ws.getAllBlocks(false) || [];
                for (const block of allBlocks) {
                    try { block.render(); } catch (e) {}
                }
            }
        }

        addAIBtnToBlock(block) {
            try {
                // === 关键过滤：只给"完整积木"添加按钮，不给值块/shadow 添加 ===
                // 1. 跳过 shadow block（数字、字符串、颜色等输入框的内部值块）
                if (block.isShadow && block.isShadow()) return;
                // 2. 跳过 reporter 值块（没有 previousConnection 但有 outputConnection）
                //    这些是嵌套在其他积木输入中的小积木：数字、字符串、变量、下拉选项等
                if (!block.previousConnection && block.outputConnection) return;
                // 3. 必须有 previousConnection（语句/C型积木）或 startHat_（Hat 积木）
                //    排除既无连接也无 hat 的孤立碎片积木
                const isStatement = !!block.previousConnection;
                const isHat = !!block.startHat_;
                if (!isStatement && !isHat) return;

                const svgGroup = block.svgGroup_;
                if (!svgGroup) return;

                // 已存在则不重复添加
                if (svgGroup.querySelector('.rw-ai-btn')) return;

                const SVG_NS = 'http://www.w3.org/2000/svg';

                // 创建按钮容器组
                const group = document.createElementNS(SVG_NS, 'g');
                group.setAttribute('class', 'rw-ai-btn');
                group.style.cursor = 'pointer';
                group.style.pointerEvents = 'auto';

                // 根据积木类型定位：放在积木左上角外侧
                const offsetX = -22;
                const offsetY = isHat ? 8 : 2;
                group.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);

                // 背景圆
                const circle = document.createElementNS(SVG_NS, 'circle');
                circle.setAttribute('cx', '9');
                circle.setAttribute('cy', '9');
                circle.setAttribute('r', '9');
                circle.setAttribute('fill', '#4C97FF');
                circle.setAttribute('stroke', '#fff');
                circle.setAttribute('stroke-width', '1.5');
                group.appendChild(circle);

                // 火花图标（4-point star）
                const star = document.createElementNS(SVG_NS, 'path');
                star.setAttribute('d', 'M9,2 L10.4,7.6 L16,9 L10.4,10.4 L9,16 L7.6,10.4 L2,9 L7.6,7.6 Z');
                star.setAttribute('fill', 'white');
                group.appendChild(star);

                // 透明度（hover 时变化）
                group.style.opacity = '0.55';
                group.style.transition = 'opacity 0.15s';

                // hover 效果
                group.addEventListener('mouseenter', () => {
                    group.style.opacity = '1';
                    circle.setAttribute('fill', '#5CB1D6');
                });
                group.addEventListener('mouseleave', () => {
                    group.style.opacity = '0.55';
                    circle.setAttribute('fill', '#4C97FF');
                });

                // 点击打开 AI 弹窗
                group.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    aiPopup.open(block);
                });

                // 阻止拖拽
                group.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
                group.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                }, { passive: true });

                svgGroup.appendChild(group);
                this.blocks.set(block.id, block);
            } catch (e) {
                // 忽略
            }
        }

        inject() {
            this.install();
        }

        clear() {
            // 清理所有按钮元素
            const ws = Blockly.getMainWorkspace();
            if (!ws) return;
            for (const [blockId] of this.blocks) {
                const block = ws.getBlockById(blockId);
                if (block && block.svgGroup_) {
                    const btn = block.svgGroup_.querySelector('.rw-ai-btn');
                    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
                }
            }
            this.blocks.clear();
        }
    }

    // ========== Lint 面板 ==========
    class LintPanel {
        constructor(engine, highlighter) {
            this.engine = engine;
            this.highlighter = highlighter;
            this.window = null;
            this.filter = 'all';
        }

        createUI() {
            const win = WindowManager.createWindow({
                id: 'rw-lint-system',
                title: 'Lint 系统',
                width: 380,
                height: 500,
                onClose: () => {}
            });

            if (!win) return null;

            // WindowManager 用 .addon-window-content 作为内容容器
            const content = win.element.querySelector('.addon-window-content') || win.contentElement;
            if (!content) return null;
            content.className = 'rw-lint-content';
            content.innerHTML = this.buildHTML();
            content.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';

            this.bindEvents(content);
            this.window = win;
            return win;
        }

        buildHTML() {
            const summary = this.engine.getSummary();
            return `
                <div class="rw-lint-toolbar">
                    <div class="rw-lint-summary">
                        <span class="rw-lint-badge error">${summary.errors} 错误</span>
                        <span class="rw-lint-badge warning">${summary.warnings} 警告</span>
                        <span class="rw-lint-badge info">${summary.infos} 提示</span>
                    </div>
                    <div class="rw-lint-actions">
                        <button class="rw-lint-btn" data-action="refresh" title="重新检查">刷新</button>
                        <button class="rw-lint-btn" data-action="toggle-highlight" title="切换高亮">高亮</button>
                    </div>
                </div>
                <div class="rw-lint-filter">
                    <button class="rw-lint-filter-btn active" data-filter="all">全部</button>
                    <button class="rw-lint-filter-btn" data-filter="error">错误</button>
                    <button class="rw-lint-filter-btn" data-filter="warning">警告</button>
                    <button class="rw-lint-filter-btn" data-filter="info">提示</button>
                </div>
                <div class="rw-lint-list" id="rwLintList">
                    <div class="rw-lint-loading">正在分析...</div>
                </div>
            `;
        }

        bindEvents(content) {
            // 刷新按钮
            const refreshBtn = content.querySelector('[data-action="refresh"]');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.refresh());
            }

            // 高亮切换按钮
            const toggleBtn = content.querySelector('[data-action="toggle-highlight"]');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    this.highlighter.visible = !this.highlighter.visible;
                    toggleBtn.textContent = this.highlighter.visible ? '高亮' : '关高亮';
                    if (this.highlighter.visible) {
                        this.highlighter.highlight(this.engine.results);
                    } else {
                        this.highlighter.clear();
                    }
                });
            }

            // 过滤器按钮
            const filterBtns = content.querySelectorAll('.rw-lint-filter-btn');
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.filter = btn.dataset.filter;
                    this.renderList();
                });
            });
        }

        refresh() {
            const summary = this.engine.getSummary();
            const content = this.window ? this.window.element.querySelector('.rw-lint-content') : null;
            if (content) {
                const badges = content.querySelector('.rw-lint-summary');
                if (badges) {
                    badges.innerHTML = `
                        <span class="rw-lint-badge error">${summary.errors} 错误</span>
                        <span class="rw-lint-badge warning">${summary.warnings} 警告</span>
                        <span class="rw-lint-badge info">${summary.infos} 提示</span>
                    `;
                }
            }
            this.renderList();
        }

        renderList() {
            const listEl = document.getElementById('rwLintList');
            if (!listEl) return;

            let items = this.engine.results;
            if (this.filter !== 'all') {
                items = items.filter(r => r.severity === this.filter);
            }

            if (items.length === 0) {
                listEl.innerHTML = this.filter === 'all'
                    ? '<div class="rw-lint-empty">没有发现问题</div>'
                    : `<div class="rw-lint-empty">没有 ${this.filter} 级别的问题</div>`;
                return;
            }

            const severityIcons = { error: 'E', warning: 'W', info: 'I' };
            const severityLabels = { error: '错误', warning: '警告', info: '提示' };

            listEl.innerHTML = items.map((item, i) => `
                <div class="rw-lint-item ${item.severity}" data-block-id="${item.blockId}" data-index="${i}">
                    <div class="rw-lint-item-icon">${severityIcons[item.severity]}</div>
                    <div class="rw-lint-item-body">
                        <div class="rw-lint-item-rule">${item.ruleName}</div>
                        <div class="rw-lint-item-msg">${item.message}</div>
                        <div class="rw-lint-item-meta">
                            <span class="rw-lint-item-severity">${severityLabels[item.severity]}</span>
                            ${item.quickFix ? `<button class="rw-lint-fix-btn" data-action="fix" data-index="${i}">${item.quickFix.label}</button>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            // 绑定点击事件
            listEl.querySelectorAll('.rw-lint-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.rw-lint-fix-btn')) return;
                    const blockId = el.dataset.blockId;
                    this.navigateToBlock(blockId);
                });
            });

            // 绑定 Quick Fix 按钮
            listEl.querySelectorAll('.rw-lint-fix-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.dataset.index);
                    const item = items[index];
                    if (item && item.quickFix && item.quickFix.action) {
                        this.applyQuickFix(item);
                    }
                });
            });
        }

        navigateToBlock(blockId) {
            const ws = Blockly.getMainWorkspace();
            if (!ws) return;
            const block = ws.getBlockById(blockId);
            if (!block) return;
            ws.centerOnBlock(blockId);
            // 闪烁效果
            try {
                const svg = block.getSvgRoot();
                if (svg) {
                    svg.style.transition = 'transform 0.1s';
                    svg.style.transform = 'scale(1.1)';
                    setTimeout(() => { svg.style.transform = 'scale(1)'; }, 150);
                }
            } catch (e) {}
        }

        applyQuickFix(item) {
            try {
                const ws = Blockly.getMainWorkspace();
                if (!ws) return;
                const block = ws.getBlockById(item.blockId);
                if (!block) return;
                if (item.quickFix.action) {
                    item.quickFix.action(block, ws);
                }
                // 重新 lint
                this.engine.run();
                this.highlighter.highlight(this.engine.results);
                this.renderList();
                this.refresh();
            } catch (e) {
                console.error('[LintSystem] Quick fix failed:', e);
            }
        }
    }

    // ========== AI 聊天弹窗 ==========
    class AIChatPopup {
        constructor() {
            this.window = null;
            this.currentBlock = null;
            this.messages = [];
            this.abortController = null;
        }

        open(block) {
            // 找到顶层积木，确保发送整个积木链条
            this.currentBlock = getTopLevelBlock(block) || block;
            this.originalBlock = block;
            this.messages = [];
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
            this.createUI();
            if (this.window) {
                this.window.show();
            }
        }

        createUI() {
            if (this.window) {
                try { this.window.close(); } catch (e) {}
                this.window = null;
            }

            const win = WindowManager.createWindow({
                id: 'rw-lint-ai-chat',
                title: 'AI 积木助手',
                width: 420,
                height: 480,
                onClose: () => {
                    if (this.abortController) {
                        this.abortController.abort();
                        this.abortController = null;
                    }
                    this.window = null;
                }
            });

            if (!win) return;
            this.window = win;

            // WindowManager 用 .addon-window-content 作为内容容器
            const content = win.element.querySelector('.addon-window-content') || win.contentElement;
            if (!content) return;
            content.className = 'rw-lint-ai-content';
            const isTopLevel = this.originalBlock && this.currentBlock && this.originalBlock !== this.currentBlock;
            const labelText = isTopLevel ? '积木链条（已从子积木扩展到顶层）：' : '当前积木链条：';

            content.innerHTML = `
                <div class="rw-ai-block-info">
                    <div class="rw-ai-block-label">${labelText}</div>
                    <pre class="rw-ai-block-text"></pre>
                </div>
                <div class="rw-ai-chat-area" id="rwAiChatArea">
                    <div class="rw-ai-chat-empty">向 AI 询问关于这段积木的问题，例如：
                        <br/>• 这段积木做了什么？
                        <br/>• 有什么潜在问题吗？
                        <br/>• 如何优化这段代码？
                    </div>
                </div>
                <div class="rw-ai-input-area">
                    <input type="text" id="rwAiInput" placeholder="输入问题后按 Enter 发送..." class="rw-ai-input" />
                    <button id="rwAiSendBtn" class="rw-ai-send-btn">发送</button>
                </div>
            `;

            // 填充积木文本
            const blockText = this.currentBlock ? blockToReadableText(this.currentBlock) : '(无积木)';
            content.querySelector('.rw-ai-block-text').textContent = blockText;

            // 绑定事件
            const input = content.querySelector('#rwAiInput');
            const sendBtn = content.querySelector('#rwAiSendBtn');
            const sendAction = () => this.sendMessage(input.value.trim());
            sendBtn.addEventListener('click', sendAction);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAction();
                }
            });
            setTimeout(() => input.focus(), 100);
        }

        async sendMessage(question) {
            if (!question || !this.currentBlock) return;
            if (this.abortController) return; // 正在请求中

            const input = document.getElementById('rwAiInput');
            const sendBtn = document.getElementById('rwAiSendBtn');
            const chatArea = document.getElementById('rwAiChatArea');

            if (input) input.value = '';
            if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '请求中'; }

            // 移除空提示
            if (chatArea) {
                const empty = chatArea.querySelector('.rw-ai-chat-empty');
                if (empty) empty.remove();
            }

            // 添加用户消息
            this.appendMessage('user', question);

            // 构造 API messages（发送完整积木链条）
            const blockText = blockToReadableText(this.currentBlock);
            const blockInfo = this.currentBlock ? `类型: ${this.currentBlock.opcode || this.currentBlock.type || 'unknown'}` : '';
            const systemPrompt = `你是 Scratch 编程助手。用户选中了一段积木脚本，请回答关于这段积木的问题。

${blockInfo}

以下是完整的积木代码（缩进表示嵌套的子积木，同层级表示顺序执行的后续积木）：

${blockText}

请用中文回答，简洁明了。如果用户问的是优化建议，请给出具体的改进方案。如果代码中有问题，请指出并说明原因。`;

            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...this.messages,
                { role: 'user', content: question }
            ];
            this.messages.push({ role: 'user', content: question });

            // 添加 AI 消息占位
            const assistantEl = this.appendMessage('assistant', '');
            let assistantText = '';

            this.abortController = new AbortController();

            try {
                await sendAIChatRequest(apiMessages, (delta, full, reasoning) => {
                    if (full !== undefined) {
                        assistantText = full;
                        if (assistantEl) {
                            const textEl = assistantEl.querySelector('.rw-ai-msg-text');
                            if (textEl) {
                                textEl.textContent = full;
                                textEl.style.display = '';
                            }
                        }
                    }
                    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
                }, this.abortController.signal);

                this.messages.push({ role: 'assistant', content: assistantText });
            } catch (e) {
                if (e.name === 'AbortError') {
                    if (assistantEl) {
                        const textEl = assistantEl.querySelector('.rw-ai-msg-text');
                        if (textEl) textEl.textContent = assistantText + '\n\n(已取消)';
                    }
                } else {
                    if (assistantEl) {
                        const textEl = assistantEl.querySelector('.rw-ai-msg-text');
                        if (textEl) textEl.textContent = `请求失败: ${e.message}`;
                    }
                }
            } finally {
                if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '发送'; }
                this.abortController = null;
                if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
            }
        }

        appendMessage(role, text) {
            const chatArea = document.getElementById('rwAiChatArea');
            if (!chatArea) return null;

            const msgEl = document.createElement('div');
            msgEl.className = `rw-ai-msg ${role}`;

            const label = document.createElement('div');
            label.className = 'rw-ai-msg-label';
            label.textContent = role === 'user' ? '我' : 'AI';

            const textEl = document.createElement('div');
            textEl.className = 'rw-ai-msg-text';
            textEl.textContent = text;
            if (!text) {
                textEl.innerHTML = '<span class="rw-ai-typing">思考中...</span>';
            }

            msgEl.appendChild(label);
            msgEl.appendChild(textEl);
            chatArea.appendChild(msgEl);
            chatArea.scrollTop = chatArea.scrollHeight;

            return msgEl;
        }

        close() {
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
            if (this.window) {
                try { this.window.close(); } catch (e) {}
                this.window = null;
            }
        }
    }

    // 全局 AI 弹窗实例（供 AIBtnInjector 引用）
    const aiPopup = new AIChatPopup();

    // ========== 重构建议引擎 ==========
    class RefactorEngine {
        run() {
            const suggestions = [];
            const ws = Blockly.getMainWorkspace();
            if (!ws) return suggestions;

            const allBlocks = getAllBlocks(ws);

            // 检测重复脚本
            const sigMap = new Map();
            for (const block of allBlocks) {
                if (!block.topLevel) continue;
                const sig = buildScriptSignature(block);
                if (!sig || sig.split('|').length < 3) continue;
                if (sigMap.has(sig)) {
                    sigMap.get(sig).push(block);
                } else {
                    sigMap.set(sig, [block]);
                }
            }
            for (const [sig, blocks] of sigMap) {
                if (blocks.length >= 2) {
                    suggestions.push({
                        type: 'extract-procedure',
                        title: '提取自定义积木',
                        description: `发现了 ${blocks.length} 个高度相似的脚本，建议提取为自定义积木以减少重复代码`,
                        blocks: blocks.map(b => b.id),
                        severity: 'medium'
                    });
                }
            }

            // 检测深层嵌套（>6层）
            for (const block of allBlocks) {
                const depth = getNestingDepth(block);
                if (depth > 6) {
                    suggestions.push({
                        type: 'reduce-nesting',
                        title: '简化嵌套',
                        description: `积木嵌套深度 ${depth} 层，建议使用"提前返回"或提取子逻辑`,
                        blocks: [block.id],
                        severity: 'medium'
                    });
                    break;
                }
            }

            // 检测过长脚本（>40块）
            for (const block of allBlocks) {
                if (!block.topLevel) continue;
                let count = 1;
                let next = block.getNextBlock ? block.getNextBlock() : null;
                while (next) { count++; next = next.getNextBlock ? next.getNextBlock() : null; }
                if (count > 40) {
                    suggestions.push({
                        type: 'split-script',
                        title: '拆分脚本',
                        description: `脚本包含 ${count} 个积木，建议拆分为多个逻辑独立的脚本或自定义积木`,
                        blocks: [block.id],
                        severity: 'low'
                    });
                }
            }

            return suggestions;
        }
    }

    // ========== 主 Addon 类 ==========
    class LintSystemAddon {
        constructor() {
            this.engine = new LintEngine();
            this.highlighter = new BlockHighlighter();
            this.injector = new AIBtnInjector();
            this.panel = new LintPanel(this.engine, this.highlighter);
            this.refactorEngine = new RefactorEngine();
            this.debounceTimer = null;
            this.injectTimer = null;
            this.initialized = false;
        }

        async init() {
            if (this.initialized) return;
            this.initialized = true;

            // 注册 Blockly 变更监听
            const ws = Blockly.getMainWorkspace();
            if (ws) {
                ws.addChangeListener(() => this.onBlockChange());
                // 安装 AI 按钮 hook（hook renderDraw_）
                this.injector.inject();
            } else {
                // 等待 workspace 准备好
                const checkWs = () => {
                    const ws2 = Blockly.getMainWorkspace();
                    if (ws2) {
                        ws2.addChangeListener(() => this.onBlockChange());
                        this.injector.inject();
                        this.runLint();
                    } else {
                        setTimeout(checkWs, 500);
                    }
                };
                setTimeout(checkWs, 500);
            }

            // 首次 lint
            setTimeout(() => {
                this.runLint();
            }, 1000);
        }

        onBlockChange() {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.runLint(), 500);
            // 新积木创建后会自动触发 renderDraw_，hook 会自动添加按钮
        }

        runLint() {
            const results = this.engine.run();
            this.highlighter.highlight(results);
            if (this.panel.window) {
                this.panel.renderList();
                this.panel.refresh();
            }
        }

        show() {
            if (!this.panel.window) {
                this.panel.createUI();
                this.runLint();
            }
            if (this.panel.window) {
                this.panel.window.show();
                this.panel.renderList();
                this.panel.refresh();
            }
        }

        hide() {
            if (this.panel.window) {
                this.panel.window.hide();
            }
        }

        toggle() {
            if (this.panel.window && this.panel.window.element && this.panel.window.element.parentNode) {
                if (this.panel.window.element.style.display === 'none') {
                    this.show();
                } else {
                    this.hide();
                }
            } else {
                this.show();
            }
        }

        refresh() {
            this.runLint();
        }
    }

    // ========== 启动 ==========
    const addonInstance = new LintSystemAddon();
    addonInstance.init();

    // 全局 API
    window.RWLintSystem = {
        toggle: () => addonInstance.toggle(),
        show: () => addonInstance.show(),
        hide: () => addonInstance.hide(),
        refresh: () => addonInstance.refresh(),
        getResults: () => addonInstance.engine.results,
        getSuggestions: () => addonInstance.refactorEngine.run()
    };

    // AI 弹窗全局 API
    window.RWAIBlockChat = {
        open: (block) => aiPopup.open(block),
        close: () => aiPopup.close()
    };

    console.log('[LintSystem] Lint 系统 + AI 积木助手已加载，点击积木左侧蓝色按钮向 AI 提问');
}
// Project Health Dashboard addon
// 提供复杂度分析 + 代码规范检查 + 依赖图 + 项目健康度仪表盘
// 通过 VM.toJSON() 获取项目数据，分析后渲染到 WindowManager 自由窗口中
// 暴露 window.RWHealthDashboard.toggle()/.show()/.hide()/.refresh()

import WindowManager from '../../window-system/window-manager.js';

// Scratch 积木类别 → 颜色映射（用于图表与依赖图节点）
const CATEGORY_COLORS = {
    motion: '#4C97FF',
    looks: '#9966FF',
    sound: '#CF63CF',
    event: '#FFBF00',
    control: '#FFAB19',
    sensing: '#5CB1D6',
    operator: '#59C059',
    data: '#FF8C1A',
    procedures: '#FF6680',
    argument: '#FF6680',
    video: '#868DA5',
    pen: '#0FBD8C',
    music: '#999999',
    text2speech: '#59C059',
    translate: '#CF63CF',
    makeymakey: '#FF8C1A',
    microbit: '#FFBF00',
    ev3: '#FF6680',
    wedo2: '#4C97FF',
    boost: '#59C059'
};

const getCategoryColor = opcode => {
    if (!opcode) return '#888888';
    const prefix = (opcode.split('_') || [])[0];
    return CATEGORY_COLORS[prefix] || '#888888';
};

// 加载 Chart.js（已加载则跳过；与 simple-project-analyzer 共享）
const loadChartJS = () => new Promise((resolve) => {
    if (window.Chart) {
        resolve();
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.js';
    script.onload = () => resolve();
    script.onerror = () => resolve(); // 即使加载失败也不阻断 UI
    document.head.appendChild(script);
});

// ============================================================================
// 分析器：负责从 projectJSON 计算各项指标
// ============================================================================
class ProjectAnalyzer {
    constructor(projectJSON) {
        this.project = projectJSON || { targets: [] };
        this.targets = this.project.targets || [];
        this.sprites = this.targets.filter(t => !t.isStage);
        this.stage = this.targets.find(t => t.isStage);
    }

    // 获取某个 target 的所有积木（剔除 shadow）
    getBlocks(target) {
        const out = {};
        const blocks = (target && target.blocks) || {};
        Object.keys(blocks).forEach(id => {
            const b = blocks[id];
            if (b && b.opcode && !b.shadow) out[id] = b;
        });
        return out;
    }

    // 找到所有顶层积木（没有 parent 或 parent 是顶层 procedures_definition 的子积木）
    getTopBlocks(target) {
        const blocks = this.getBlocks(target);
        const childSet = new Set();
        Object.values(blocks).forEach(b => {
            if (b.next) childSet.add(b.next);
            if (b.inputs) {
                Object.values(b.inputs).forEach(inp => {
                    if (Array.isArray(inp)) {
                        inp.forEach(item => {
                            if (typeof item === 'string' && blocks[item]) childSet.add(item);
                        });
                    }
                });
            }
        });
        return Object.keys(blocks).filter(id => !childSet.has(id)).map(id => blocks[id]);
    }

    // 获取积木链（从某个 block 开始向下收集所有 next）
    getBlockChain(target, startBlock) {
        const blocks = (target && target.blocks) || {};
        const chain = [];
        let cur = startBlock;
        const guard = new Set();
        while (cur && !guard.has(cur)) {
            guard.add(cur);
            chain.push(cur);
            cur = cur.next ? blocks[cur.next] : null;
        }
        return chain;
    }

    // 复杂度分析
    analyzeComplexity() {
        const result = {
            totalScripts: 0,
            totalBlocks: 0,
            longestScript: 0,
            totalNestingDepth: 0,
            maxNestingDepth: 0,
            totalComplexity: 0, // McCabe 风格复杂度总和
            maxComplexity: 0,
            perSprite: []
        };

        this.targets.forEach(target => {
            const blocks = this.getBlocks(target);
            const topBlocks = this.getTopBlocks(target);
            const scripts = topBlocks.filter(b => b.opcode !== 'procedures_definition');
            const spriteInfo = {
                name: target.name,
                isStage: !!target.isStage,
                blockCount: Object.keys(blocks).length,
                scriptCount: scripts.length,
                longestScript: 0,
                maxDepth: 0,
                complexity: 0,
                scripts: []
            };
            result.totalBlocks += Object.keys(blocks).length;
            result.totalScripts += scripts.length;

            scripts.forEach(script => {
                const chain = this.getBlockChain(target, script);
                const len = chain.length;
                let depth = 0;
                let maxDepth = 0;
                let complexity = 1; // 基础复杂度
                const stack = [];

                chain.forEach(b => {
                    // 嵌套深度跟踪：control_if / control_if_else / control_repeat /
                    // control_forever / control_repeat_until 都会增加嵌套
                    const isContainer = [
                        'control_if', 'control_if_else',
                        'control_repeat', 'control_forever',
                        'control_repeat_until'
                    ].includes(b.opcode);
                    if (isContainer) {
                        stack.push(b.opcode);
                        depth++;
                        if (depth > maxDepth) maxDepth = depth;
                        // 容器增加 McCabe 复杂度
                        if (b.opcode === 'control_if_else') complexity += 2;
                        else if (b.opcode === 'control_if') complexity += 1;
                        else if (b.opcode === 'control_repeat_until') complexity += 1;
                    }
                    // 简单出栈（基于 next 链粗略估计）
                    // 注：Scratch 的 SUBSTACK 结构通过 inputs 引用，这里我们简化处理
                });

                spriteInfo.scripts.push({
                    length: len,
                    maxDepth,
                    complexity,
                    startOpcode: script.opcode
                });
                spriteInfo.longestScript = Math.max(spriteInfo.longestScript, len);
                spriteInfo.maxDepth = Math.max(spriteInfo.maxDepth, maxDepth);
                spriteInfo.complexity += complexity;

                result.longestScript = Math.max(result.longestScript, len);
                result.maxNestingDepth = Math.max(result.maxNestingDepth, maxDepth);
                result.totalNestingDepth += maxDepth;
                result.maxComplexity = Math.max(result.maxComplexity, complexity);
                result.totalComplexity += complexity;
            });

            result.perSprite.push(spriteInfo);
        });

        result.avgScriptLength = result.totalScripts > 0
            ? result.totalBlocks / result.totalScripts : 0;
        result.avgComplexity = result.totalScripts > 0
            ? result.totalComplexity / result.totalScripts : 0;
        return result;
    }

    // 代码规范检查（lint 规则）
    runLint() {
        const issues = [];
        this.targets.forEach(target => {
            const blocks = (target.blocks) || {};
            const blockList = Object.values(blocks).filter(b => b && b.opcode && !b.shadow);

            // 1. 空脚本（顶层积木但 next 链为空）
            const topBlocks = this.getTopBlocks(target);
            topBlocks.forEach(tb => {
                if (!tb.next && tb.opcode !== 'procedures_definition') {
                    issues.push({
                        severity: 'info',
                        rule: 'empty-script',
                        sprite: target.name,
                        message: `空脚本：${tb.opcode} 没有后续积木`
                    });
                }
            });

            // 2. 空的 if / repeat_until 分支
            blockList.forEach(b => {
                if (['control_if', 'control_if_else', 'control_repeat',
                    'control_repeat_until', 'control_forever'].includes(b.opcode)) {
                    const inputs = b.inputs || {};
                    const substack = inputs.SUBSTACK;
                    const substack2 = inputs.SUBSTACK2;
                    if (substack && Array.isArray(substack)) {
                        // 检查 SUBSTACK 是否指向空或仅一个 placeholder
                        const realBlock = substack.find(item =>
                            typeof item === 'string' && blocks[item]
                        );
                        if (!realBlock) {
                            issues.push({
                                severity: 'warning',
                                rule: 'empty-branch',
                                sprite: target.name,
                                message: `空分支：${b.opcode} 的 SUBSTACK 为空`
                            });
                        }
                    }
                    if (substack2 && Array.isArray(substack2)) {
                        const realBlock2 = substack2.find(item =>
                            typeof item === 'string' && blocks[item]
                        );
                        if (!realBlock2) {
                            issues.push({
                                severity: 'warning',
                                rule: 'empty-branch',
                                sprite: target.name,
                                message: `空分支：${b.opcode} 的 SUBSTACK2（else）为空`
                            });
                        }
                    }
                }
            });

            // 3. 过长脚本（>30 积木）
            topBlocks.filter(b => b.opcode !== 'procedures_definition').forEach(tb => {
                const chain = this.getBlockChain(target, tb);
                if (chain.length > 30) {
                    issues.push({
                        severity: 'warning',
                        rule: 'long-script',
                        sprite: target.name,
                        message: `脚本过长：${chain.length} 个积木（建议 < 30）`
                    });
                }
            });

            // 4. 死代码：forever 或 stop all 之后还有积木
            topBlocks.forEach(tb => {
                const chain = this.getBlockChain(target, tb);
                let stopIdx = -1;
                for (let i = 0; i < chain.length; i++) {
                    if (chain[i].opcode === 'control_forever' ||
                        chain[i].opcode === 'control_stop_all' ||
                        chain[i].opcode === 'control_stop_this_script') {
                        stopIdx = i;
                        break;
                    }
                }
                if (stopIdx >= 0 && stopIdx < chain.length - 1) {
                    issues.push({
                        severity: 'warning',
                        rule: 'dead-code',
                        sprite: target.name,
                        message: `死代码：${chain[stopIdx].opcode} 之后还有 ${chain.length - stopIdx - 1} 个积木`
                    });
                }
            });

            // 5. 未使用的变量
            if (target.variables) {
                const varIds = Object.keys(target.variables);
                const usedVarIds = new Set();
                blockList.forEach(b => {
                    if (b.opcode === 'data_setvariableto' || b.opcode === 'data_changevariableby') {
                        const inp = b.inputs && b.inputs.VARIABLE;
                        if (inp && Array.isArray(inp) && inp[1]) {
                            const ref = inp[1][2]; // [name, type, id]
                            if (ref) usedVarIds.add(ref);
                        }
                    }
                    if (b.opcode === 'data_variable') {
                        const inp = b.inputs && b.inputs.VARIABLE;
                        if (inp && Array.isArray(inp) && inp[1]) {
                            const ref = inp[1][2];
                            if (ref) usedVarIds.add(ref);
                        }
                    }
                });
                varIds.forEach(id => {
                    if (!usedVarIds.has(id)) {
                        const v = target.variables[id];
                        const name = Array.isArray(v) ? v[0] : id;
                        issues.push({
                            severity: 'info',
                            rule: 'unused-variable',
                            sprite: target.name,
                            message: `未使用的变量：${name}`
                        });
                    }
                });
            }

            // 6. 魔法数字 repeat（重复次数为字面量且 > 50）
            blockList.forEach(b => {
                if (b.opcode !== 'control_repeat') return;
                const inp = b.inputs && b.inputs.TIMES;
                if (!inp || !Array.isArray(inp) || !Array.isArray(inp[1])) return;
                const inner = inp[1];
                // inner = [shadowBlockId, type, value]
                // type 7 = math_number, 8 = math_positive_number, 10 = math_integer
                if (inner[1] === 7 || inner[1] === 8 || inner[1] === 10) {
                    const num = parseInt(inner[2], 10);
                    if (!isNaN(num) && num > 50) {
                        issues.push({
                            severity: 'info',
                            rule: 'magic-number',
                            sprite: target.name,
                            message: `魔法数字：重复 ${num} 次（建议用变量替代）`
                        });
                    }
                }
            });

            // 7. 空自定义积木定义
            const procDefs = blockList.filter(b => b.opcode === 'procedures_definition');
            procDefs.forEach(pd => {
                const inputs = pd.inputs || {};
                const customBlock = inputs.custom_block;
                if (customBlock && Array.isArray(customBlock)) {
                    const ref = customBlock.find(item =>
                        typeof item === 'string' && blocks[item]
                    );
                    if (ref) {
                        const prototype = blocks[ref];
                        if (!prototype.next) {
                            issues.push({
                                severity: 'info',
                                rule: 'empty-procedure',
                                sprite: target.name,
                                message: `空的自定义积木定义：没有实现体`
                            });
                        }
                    }
                }
            });
        });

        // 统计
        const summary = {
            total: issues.length,
            errors: issues.filter(i => i.severity === 'error').length,
            warnings: issues.filter(i => i.severity === 'warning').length,
            infos: issues.filter(i => i.severity === 'info').length
        };
        return { issues, summary };
    }

    // 依赖图分析
    analyzeDependencies() {
        const nodes = []; // { id, type, name, color }
        const edges = []; // { from, to, type, label }

        // 节点：每个 sprite + stage
        this.targets.forEach(t => {
            nodes.push({
                id: t.name,
                type: t.isStage ? 'stage' : 'sprite',
                name: t.name,
                color: t.isStage ? '#868DA5' : '#4C97FF'
            });
        });

        // 收集广播发送方与接收方
        const broadcastSenders = {}; // broadcastName -> [spriteName]
        const broadcastReceivers = {}; // broadcastName -> [spriteName]
        const broadcasts = new Set();

        this.targets.forEach(target => {
            const blocks = this.getBlocks(target);
            Object.values(blocks).forEach(b => {
                if (b.opcode === 'event_broadcast' || b.opcode === 'event_broadcastandwait') {
                    const inp = b.inputs && b.inputs.BROADCAST_INPUT;
                    if (inp && Array.isArray(inp) && inp[1] && Array.isArray(inp[1])) {
                        const name = inp[1][2];
                        if (name) {
                            broadcasts.add(name);
                            if (!broadcastSenders[name]) broadcastSenders[name] = [];
                            if (!broadcastSenders[name].includes(target.name)) {
                                broadcastSenders[name].push(target.name);
                            }
                        }
                    }
                }
                if (b.opcode === 'event_whenbroadcastreceived') {
                    const fields = b.fields || {};
                    const f = fields.BROADCAST_OPTION;
                    if (f && Array.isArray(f) && f[0]) {
                        const name = f[0];
                        broadcasts.add(name);
                        if (!broadcastReceivers[name]) broadcastReceivers[name] = [];
                        if (!broadcastReceivers[name].includes(target.name)) {
                            broadcastReceivers[name].push(target.name);
                        }
                    }
                }
            });
        });

        // 添加边：广播发送方 → 接收方
        const broadcastEdges = [];
        broadcasts.forEach(name => {
            const senders = broadcastSenders[name] || [];
            const receivers = broadcastReceivers[name] || [];
            senders.forEach(s => {
                receivers.forEach(r => {
                    if (s !== r) {
                        broadcastEdges.push({
                            from: s,
                            to: r,
                            type: 'broadcast',
                            label: name
                        });
                    }
                });
            });
        });

        // 克隆关系：control_create_clone_of 指向其他 sprite
        this.targets.forEach(target => {
            const blocks = this.getBlocks(target);
            Object.values(blocks).forEach(b => {
                if (b.opcode === 'control_create_clone_of') {
                    const inp = b.inputs && b.inputs.CLONE_OPTION;
                    if (inp && Array.isArray(inp) && inp[1] && Array.isArray(inp[1])) {
                        const targetName = inp[1][1] === 11 ? inp[1][2] : null; // type 11 = sprite-only menu
                        if (targetName && targetName !== '_myself_') {
                            edges.push({
                                from: target.name,
                                to: targetName,
                                type: 'clone',
                                label: 'clone'
                            });
                        } else if (targetName === '_myself_') {
                            // self clone, 不加边
                        }
                    }
                }
            });
        });

        // 自定义积木：定义 → 调用
        const procDefMap = {}; // procCode -> spriteName
        this.targets.forEach(target => {
            const blocks = (target.blocks) || {};
            Object.values(blocks).forEach(b => {
                if (b.opcode === 'procedures_prototype') {
                    const fields = b.fields || {};
                    const mutation = b.mutation || {};
                    const procCode = mutation.proccode || (fields.proccode && fields.proccode[0]);
                    if (procCode) {
                        procDefMap[procCode] = target.name;
                    }
                }
            });
        });
        this.targets.forEach(target => {
            const blocks = (target.blocks) || {};
            Object.values(blocks).forEach(b => {
                if (b.opcode === 'procedures_call') {
                    const mutation = b.mutation || {};
                    const procCode = mutation.proccode;
                    if (procCode && procDefMap[procCode] && procDefMap[procCode] !== target.name) {
                        edges.push({
                            from: target.name,
                            to: procDefMap[procCode],
                            type: 'call',
                            label: procCode.length > 12 ? procCode.slice(0, 12) + '…' : procCode
                        });
                    }
                }
            });
        });

        // 合并广播边到 edges
        broadcastEdges.forEach(e => edges.push(e));

        return { nodes, edges, broadcasts: Array.from(broadcasts) };
    }

    // 综合健康度评分
    calculateHealthScore(complexity, lint, deps) {
        let score = 100;
        const factors = [];

        // 1. 积木数过多扣分（>300 每多 100 扣 5 分）
        if (complexity.totalBlocks > 300) {
            const penalty = Math.min(20, Math.floor((complexity.totalBlocks - 300) / 100) * 5);
            score -= penalty;
            factors.push({ name: '积木规模', penalty, reason: `总积木数 ${complexity.totalBlocks}` });
        }

        // 2. 过长脚本扣分
        if (complexity.longestScript > 30) {
            const penalty = Math.min(15, Math.floor((complexity.longestScript - 30) / 10) * 5);
            score -= penalty;
            factors.push({ name: '脚本过长', penalty, reason: `最长脚本 ${complexity.longestScript} 积木` });
        }

        // 3. 嵌套过深扣分
        if (complexity.maxNestingDepth > 4) {
            const penalty = Math.min(15, (complexity.maxNestingDepth - 4) * 5);
            score -= penalty;
            factors.push({ name: '嵌套过深', penalty, reason: `最大嵌套 ${complexity.maxNestingDepth}` });
        }

        // 4. 警告与错误扣分
        const warnPenalty = Math.min(20, lint.summary.warnings * 2);
        const errorPenalty = Math.min(20, lint.summary.errors * 5);
        score -= warnPenalty + errorPenalty;
        if (warnPenalty > 0) factors.push({ name: '警告', penalty: warnPenalty, reason: `${lint.summary.warnings} 个` });
        if (errorPenalty > 0) factors.push({ name: '错误', penalty: errorPenalty, reason: `${lint.summary.errors} 个` });

        // 5. 依赖过密扣分（边数 > 30 扣分）
        if (deps.edges.length > 30) {
            const penalty = Math.min(10, Math.floor((deps.edges.length - 30) / 10) * 2);
            score -= penalty;
            factors.push({ name: '依赖过密', penalty, reason: `${deps.edges.length} 条依赖边` });
        }

        score = Math.max(0, Math.min(100, score));
        let level = 'A';
        if (score < 60) level = 'D';
        else if (score < 70) level = 'C';
        else if (score < 85) level = 'B';

        return { score, level, factors };
    }

    // 统计信息
    getStats() {
        const stats = {
            spriteCount: this.sprites.length,
            totalBlocks: 0,
            scriptCount: 0,
            variableCount: 0,
            listCount: 0,
            costumeCount: 0,
            soundCount: 0,
            extensionCount: (this.project.extensions || []).length
        };
        this.targets.forEach(t => {
            const blocks = (t.blocks) || {};
            stats.totalBlocks += Object.keys(blocks).filter(id => blocks[id] && blocks[id].opcode && !blocks[id].shadow).length;
            stats.scriptCount += this.getTopBlocks(t).filter(b => b.opcode !== 'procedures_definition').length;
            if (t.variables) stats.variableCount += Object.keys(t.variables).length;
            if (t.lists) stats.listCount += Object.keys(t.lists).length;
            if (t.costumes) stats.costumeCount += t.costumes.length;
            if (t.sounds) stats.soundCount += t.sounds.length;
        });
        return stats;
    }
}

// ============================================================================
// 渲染器：把分析结果渲染为 DOM
// ============================================================================
class DashboardRenderer {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.complexity = null;
        this.lint = null;
        this.deps = null;
        this.health = null;
        this.stats = null;
        this.activeTab = 'overview';
        this.chartInstances = {};
    }

    run() {
        this.stats = this.analyzer.getStats();
        this.complexity = this.analyzer.analyzeComplexity();
        this.lint = this.analyzer.runLint();
        this.deps = this.analyzer.analyzeDependencies();
        this.health = this.analyzer.calculateHealthScore(this.complexity, this.lint, this.deps);
    }

    destroyCharts() {
        Object.values(this.chartInstances).forEach(c => {
            try { c.destroy(); } catch (e) { /* ignore */ }
        });
        this.chartInstances = {};
    }

    render(container) {
        container.innerHTML = '';
        const root = document.createElement('div');
        root.className = 'rw-phd-root';

        // 顶部 tabs
        const tabBar = document.createElement('div');
        tabBar.className = 'rw-phd-tabbar';
        const tabs = [
            { id: 'overview', label: '概览', icon: '◎' },
            { id: 'complexity', label: '复杂度', icon: '◆' },
            { id: 'lint', label: '规范检查', icon: '!' },
            { id: 'deps', label: '依赖图', icon: '⇄' }
        ];
        tabs.forEach(t => {
            const btn = document.createElement('button');
            btn.className = `rw-phd-tab ${this.activeTab === t.id ? 'active' : ''}`;
            btn.innerHTML = `<span class="rw-phd-tab-icon">${t.icon}</span><span>${t.label}</span>`;
            btn.addEventListener('click', () => {
                this.activeTab = t.id;
                this.render(container);
            });
            tabBar.appendChild(btn);
        });
        root.appendChild(tabBar);

        const panel = document.createElement('div');
        panel.className = 'rw-phd-panel';
        if (this.activeTab === 'overview') {
            this.renderOverview(panel);
        } else if (this.activeTab === 'complexity') {
            this.renderComplexity(panel);
        } else if (this.activeTab === 'lint') {
            this.renderLint(panel);
        } else if (this.activeTab === 'deps') {
            this.renderDeps(panel);
        }
        root.appendChild(panel);

        container.appendChild(root);
    }

    // 概览页：健康度分数条 + 统计卡片网格
    renderOverview(panel) {
        const h = this.health;
        const s = this.stats;

        const levelColor = h.score >= 85 ? '#59C059' :
            (h.score >= 70 ? '#FFBF00' : (h.score >= 60 ? '#FF8C1A' : '#FF6680'));
        const levelBg = h.score >= 85 ? 'rgba(89,192,89,0.15)' :
            (h.score >= 70 ? 'rgba(255,191,0,0.15)' : (h.score >= 60 ? 'rgba(255,140,26,0.15)' : 'rgba(255,102,128,0.15)'));
        const desc = h.score >= 85 ? '项目结构清晰' :
            (h.score >= 70 ? '可读性良好' : (h.score >= 60 ? '存在改进空间' : '需重构'));

        // 健康度分数条
        const scoreSection = document.createElement('div');
        scoreSection.className = 'rw-phd-section';
        scoreSection.innerHTML = `
            <h4 class="rw-phd-section-title">项目健康度</h4>
            <div class="rw-phd-score-row">
                <div class="rw-phd-score-info">
                    <div class="rw-phd-score-num" style="color:${levelColor}">${h.score}</div>
                    <div class="rw-phd-score-level" style="background:${levelBg};color:${levelColor}">${h.level} 级</div>
                </div>
                <div class="rw-phd-score-bar">
                    <div class="rw-phd-score-fill" style="width:${h.score}%;background:${levelColor}"></div>
                </div>
            </div>
            <div class="rw-phd-score-desc">等级 ${h.level} · ${desc}</div>
        `;
        panel.appendChild(scoreSection);

        // 项目统计
        const statsSection = document.createElement('div');
        statsSection.className = 'rw-phd-section';
        statsSection.innerHTML = `<h4 class="rw-phd-section-title">项目统计</h4>`;
        const statsGrid = document.createElement('div');
        statsGrid.className = 'rw-phd-stats-grid';
        const cards = [
            { label: '积木总数', value: s.totalBlocks },
            { label: '脚本数', value: s.scriptCount },
            { label: '角色数', value: s.spriteCount },
            { label: '变量数', value: s.variableCount },
            { label: '列表数', value: s.listCount },
            { label: '造型数', value: s.costumeCount },
            { label: '声音数', value: s.soundCount },
            { label: '扩展数', value: s.extensionCount }
        ];
        cards.forEach(c => {
            const card = document.createElement('div');
            card.className = 'rw-phd-stat';
            card.innerHTML = `
                <div class="rw-phd-stat-value">${c.value}</div>
                <div class="rw-phd-stat-label">${c.label}</div>
            `;
            statsGrid.appendChild(card);
        });
        statsSection.appendChild(statsGrid);
        panel.appendChild(statsSection);

        // 扣分项
        if (h.factors.length > 0) {
            const factorSection = document.createElement('div');
            factorSection.className = 'rw-phd-section';
            factorSection.innerHTML = `<h4 class="rw-phd-section-title">扣分项</h4>`;
            const ul = document.createElement('ul');
            ul.className = 'rw-phd-factor-list';
            h.factors.forEach(f => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="rw-phd-factor-name">${f.name}</span>
                    <span class="rw-phd-factor-reason">${f.reason}</span>
                    <span class="rw-phd-factor-penalty">-${f.penalty}</span>`;
                ul.appendChild(li);
            });
            factorSection.appendChild(ul);
            panel.appendChild(factorSection);
        }

        // 复杂度摘要
        const c = this.complexity;
        const summarySection = document.createElement('div');
        summarySection.className = 'rw-phd-section';
        summarySection.innerHTML = `
            <h4 class="rw-phd-section-title">复杂度摘要</h4>
            <div class="rw-phd-summary-grid">
                <div><span>最长脚本</span><b>${c.longestScript} 积木</b></div>
                <div><span>最大嵌套</span><b>${c.maxNestingDepth} 层</b></div>
                <div><span>平均脚本长度</span><b>${c.avgScriptLength.toFixed(1)} 积木</b></div>
                <div><span>总复杂度</span><b>${c.totalComplexity}</b></div>
            </div>
        `;
        panel.appendChild(summarySection);

        // 规范检查摘要
        const l = this.lint;
        const lintSection = document.createElement('div');
        lintSection.className = 'rw-phd-section';
        lintSection.innerHTML = `
            <h4 class="rw-phd-section-title">规范检查摘要</h4>
            <div class="rw-phd-lint-summary">
                <div class="rw-phd-lint-stat error">
                    <div class="rw-phd-lint-num">${l.summary.errors}</div>
                    <div class="rw-phd-lint-label">错误</div>
                </div>
                <div class="rw-phd-lint-stat warning">
                    <div class="rw-phd-lint-num">${l.summary.warnings}</div>
                    <div class="rw-phd-lint-label">警告</div>
                </div>
                <div class="rw-phd-lint-stat info">
                    <div class="rw-phd-lint-num">${l.summary.infos}</div>
                    <div class="rw-phd-lint-label">提示</div>
                </div>
            </div>
        `;
        panel.appendChild(lintSection);
    }

    // 复杂度页：每 sprite 表格 + 雷达图
    renderComplexity(panel) {
        const c = this.complexity;
        const section = document.createElement('div');
        section.className = 'rw-phd-section';
        section.innerHTML = `<h4 class="rw-phd-section-title">各角色复杂度</h4>`;
        const tableWrap = document.createElement('div');
        tableWrap.className = 'rw-phd-table-wrap';
        tableWrap.innerHTML = `
            <table class="rw-phd-table">
                <thead>
                    <tr>
                        <th>角色</th>
                        <th>积木数</th>
                        <th>脚本数</th>
                        <th>最长脚本</th>
                        <th>最大嵌套</th>
                        <th>复杂度</th>
                    </tr>
                </thead>
                <tbody>
                    ${c.perSprite.map(s => `
                        <tr>
                            <td>${s.name}${s.isStage ? ' (舞台)' : ''}</td>
                            <td>${s.blockCount}</td>
                            <td>${s.scriptCount}</td>
                            <td>${s.longestScript}</td>
                            <td>${s.maxDepth}</td>
                            <td>${s.complexity}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        section.appendChild(tableWrap);
        panel.appendChild(section);

        // 雷达图：5 个维度的对比
        const chartSection = document.createElement('div');
        chartSection.className = 'rw-phd-section';
        chartSection.innerHTML = `<h4 class="rw-phd-section-title">复杂度维度雷达图</h4>`;
        const canvasWrap = document.createElement('div');
        canvasWrap.className = 'rw-phd-chart-wrap';
        canvasWrap.style.height = '300px';
        const canvas = document.createElement('canvas');
        canvasWrap.appendChild(canvas);
        chartSection.appendChild(canvasWrap);
        panel.appendChild(chartSection);

        // 准备数据：取前 5 个非舞台 sprite 做雷达对比
        const topSprites = c.perSprite.filter(s => !s.isStage).slice(0, 5);
        if (topSprites.length > 0 && window.Chart) {
            const maxBC = Math.max(...topSprites.map(s => s.blockCount), 1);
            const maxSC = Math.max(...topSprites.map(s => s.scriptCount), 1);
            const maxLS = Math.max(...topSprites.map(s => s.longestScript), 1);
            const maxMD = Math.max(...topSprites.map(s => s.maxDepth), 1);
            const maxCx = Math.max(...topSprites.map(s => s.complexity), 1);
            const datasets = topSprites.map((s, i) => ({
                label: s.name,
                data: [
                    s.blockCount / maxBC,
                    s.scriptCount / maxSC,
                    s.longestScript / maxLS,
                    s.maxDepth / maxMD,
                    s.complexity / maxCx
                ],
                backgroundColor: `rgba(${75 + i * 40}, ${150 - i * 20}, ${255 - i * 30}, 0.2)`,
                borderColor: `rgb(${75 + i * 40}, ${150 - i * 20}, ${255 - i * 30})`,
                borderWidth: 2
            }));
            this.chartInstances.radar = new Chart(canvas.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: ['积木数', '脚本数', '最长脚本', '最大嵌套', '复杂度'],
                    datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { r: { beginAtZero: true, max: 1, ticks: { stepSize: 0.2 } } },
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
                }
            });
        } else if (!window.Chart) {
            canvasWrap.innerHTML = '<p class="rw-phd-empty">Chart.js 未加载，无法显示雷达图</p>';
        }
    }

    // 规范检查页：问题列表
    renderLint(panel) {
        const l = this.lint;
        const filter = document.createElement('div');
        filter.className = 'rw-phd-lint-filter';
        filter.innerHTML = `
            <button class="rw-phd-filter-btn active" data-filter="all">全部 (${l.summary.total})</button>
            <button class="rw-phd-filter-btn" data-filter="error">错误 (${l.summary.errors})</button>
            <button class="rw-phd-filter-btn" data-filter="warning">警告 (${l.summary.warnings})</button>
            <button class="rw-phd-filter-btn" data-filter="info">提示 (${l.summary.infos})</button>
        `;
        panel.appendChild(filter);

        const list = document.createElement('div');
        list.className = 'rw-phd-lint-list';

        const renderList = (sev) => {
            list.innerHTML = '';
            const items = l.issues.filter(i => sev === 'all' || i.severity === sev);
            if (items.length === 0) {
                list.innerHTML = '<div class="rw-phd-empty">无问题</div>';
                return;
            }
            items.forEach(i => {
                const item = document.createElement('div');
                item.className = `rw-phd-lint-item ${i.severity}`;
                item.innerHTML = `
                    <div class="rw-phd-lint-icon">${i.severity === 'error' ? '✕' : (i.severity === 'warning' ? '!' : 'i')}</div>
                    <div class="rw-phd-lint-body">
                        <div class="rw-phd-lint-msg">${i.message}</div>
                        <div class="rw-phd-lint-meta">[${i.rule}] · 角色: ${i.sprite}</div>
                    </div>
                `;
                list.appendChild(item);
            });
        };
        renderList('all');

        filter.querySelectorAll('.rw-phd-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filter.querySelectorAll('.rw-phd-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderList(btn.dataset.filter);
            });
        });

        panel.appendChild(list);
    }

    // 依赖图页：SVG 节点图
    renderDeps(panel) {
        const d = this.deps;
        const ctrl = document.createElement('div');
        ctrl.className = 'rw-phd-deps-ctrl';
        const legend = document.createElement('div');
        legend.className = 'rw-phd-legend';
        legend.innerHTML = `
            <span class="rw-phd-legend-item"><span class="rw-phd-legend-dot" style="background:#4C97FF"></span>角色</span>
            <span class="rw-phd-legend-item"><span class="rw-phd-legend-dot" style="background:#868DA5"></span>舞台</span>
            <span class="rw-phd-legend-item"><span class="rw-phd-legend-line" style="border-top:2px dashed #FFBF00"></span>广播</span>
            <span class="rw-phd-legend-item"><span class="rw-phd-legend-line" style="border-top:2px dotted #9966FF"></span>克隆</span>
            <span class="rw-phd-legend-item"><span class="rw-phd-legend-line" style="border-top:2px solid #FF6680"></span>调用自定义积木</span>
        `;
        ctrl.appendChild(legend);
        panel.appendChild(ctrl);

        const svgWrap = document.createElement('div');
        svgWrap.className = 'rw-phd-svg-wrap';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '360');
        svg.style.background = '#3a3a3a';
        svg.style.borderRadius = '6px';
        svgWrap.appendChild(svg);
        panel.appendChild(svgWrap);

        // 布局节点：圆形分布
        const W = svg.clientWidth || 600;
        const H = 360;
        const cx = W / 2;
        const cy = H / 2;
        const r = Math.min(W, H) / 2 - 50;
        const nodeMap = {}; // name -> { x, y }
        d.nodes.forEach((n, i) => {
            const angle = (i / d.nodes.length) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            nodeMap[n.name] = { x, y, ...n };
        });

        // 边颜色/样式
        const edgeStyle = {
            broadcast: { color: '#FFBF00', dash: '6,4', width: 1.5 },
            clone: { color: '#9966FF', dash: '2,3', width: 1.5 },
            call: { color: '#FF6680', dash: '0', width: 1.5 }
        };

        // 渲染边
        d.edges.forEach(e => {
            const from = nodeMap[e.from];
            const to = nodeMap[e.to];
            if (!from || !to) return;
            const st = edgeStyle[e.type] || edgeStyle.call;
            // 计算端点偏移（避免穿过节点圆心）
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const offset = 22;
            const x1 = from.x + (dx / dist) * offset;
            const y1 = from.y + (dy / dist) * offset;
            const x2 = to.x - (dx / dist) * offset;
            const y2 = to.y - (dy / dist) * offset;

            // 曲线
            const mx = (x1 + x2) / 2 + (dy / dist) * 15;
            const my = (y1 + y2) / 2 - (dx / dist) * 15;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`);
            path.setAttribute('stroke', st.color);
            path.setAttribute('stroke-width', st.width);
            path.setAttribute('stroke-dasharray', st.dash);
            path.setAttribute('fill', 'none');
            path.setAttribute('opacity', '0.75');
            svg.appendChild(path);

            // 箭头标记
            const angle = Math.atan2(y2 - my, x2 - mx);
            const arrowSize = 6;
            const ax1 = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
            const ay1 = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
            const ax2 = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
            const ay2 = y2 - arrowSize * Math.sin(angle + Math.PI / 6);
            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            arrow.setAttribute('points', `${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`);
            arrow.setAttribute('fill', st.color);
            arrow.setAttribute('opacity', '0.75');
            svg.appendChild(arrow);
        });

        // 渲染节点
        Object.values(nodeMap).forEach(n => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', n.x);
            circle.setAttribute('cy', n.y);
            circle.setAttribute('r', 20);
            circle.setAttribute('fill', n.color);
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '1.5');
            g.appendChild(circle);

            // 缩写
            const initials = (n.name || '?').slice(0, 2);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', n.x);
            text.setAttribute('y', n.y + 4);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-weight', 'bold');
            text.textContent = initials;
            g.appendChild(text);

            // 节点名标签
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', n.x);
            label.setAttribute('y', n.y + 34);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '10');
            label.setAttribute('fill', 'currentColor');
            label.setAttribute('opacity', '0.85');
            const labelText = n.name.length > 12 ? n.name.slice(0, 12) + '…' : n.name;
            label.textContent = labelText;
            g.appendChild(label);

            svg.appendChild(g);
        });

        // 边数统计
        const statsLine = document.createElement('div');
        statsLine.className = 'rw-phd-deps-stats';
        const broadcastCount = d.edges.filter(e => e.type === 'broadcast').length;
        const cloneCount = d.edges.filter(e => e.type === 'clone').length;
        const callCount = d.edges.filter(e => e.type === 'call').length;
        statsLine.innerHTML = `
            <span>节点 ${d.nodes.length}</span>
            <span>广播依赖 ${broadcastCount}</span>
            <span>克隆依赖 ${cloneCount}</span>
            <span>自定义积木调用 ${callCount}</span>
            <span>广播消息 ${d.broadcasts.length}</span>
        `;
        panel.appendChild(statsLine);
    }
}

// ============================================================================
// 主入口
// ============================================================================
export default async function ({ addon, msg, console }) {
    let dashboardWindow = null;
    let renderer = null;
    let refreshBtn = null;
    const WINDOW_ID = 'rw-project-health-dashboard';

    const isWindowAlive = () => dashboardWindow &&
        dashboardWindow.element && dashboardWindow.element.parentNode;

    const buildDashboard = async () => {
        let vm = null;
        try {
            vm = addon.tab.traps.vm;
        } catch (e) { /* ignore */ }
        if (!vm) return null;

        let projectJSON;
        try {
            projectJSON = JSON.parse(vm.toJSON());
        } catch (e) {
            return null;
        }

        const analyzer = new ProjectAnalyzer(projectJSON);
        renderer = new DashboardRenderer(analyzer);
        renderer.run();
        return renderer;
    };

    const refreshContent = async () => {
        if (!isWindowAlive()) return;
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '分析中...';
        }
        try {
            await loadChartJS();
            const r = await buildDashboard();
            // 在 buildDashboard 中已设置 renderer
            if (r && isWindowAlive() && dashboardWindow._rwRenderTarget) {
                if (renderer) renderer.destroyCharts();
                // 显示加载占位
                dashboardWindow._rwRenderTarget.innerHTML =
                    '<div class="rw-phd-loading">分析中...</div>';
                r.render(dashboardWindow._rwRenderTarget);
            }
        } catch (e) {
            console.error('Project Health Dashboard refresh error:', e);
            if (isWindowAlive() && dashboardWindow._rwRenderTarget) {
                dashboardWindow._rwRenderTarget.innerHTML =
                    '<div class="rw-phd-empty">分析失败，请重试</div>';
            }
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '刷新';
            }
        }
    };

    const createDashboardWindow = () => {
        dashboardWindow = WindowManager.createWindow({
            id: WINDOW_ID,
            title: '项目健康度仪表盘',
            width: 760,
            height: 560,
            minWidth: 520,
            minHeight: 420,
            className: 'rw-phd-window',
            onClose: () => {
                if (renderer) {
                    renderer.destroyCharts();
                    renderer = null;
                }
            }
        });

        const content = document.createElement('div');
        content.className = 'rw-phd-content';
        dashboardWindow.setContent(content);

        // 顶部工具栏（刷新按钮）
        const toolbar = document.createElement('div');
        toolbar.className = 'rw-phd-toolbar';
        refreshBtn = document.createElement('button');
        refreshBtn.className = 'rw-phd-refresh-btn';
        refreshBtn.textContent = '刷新';
        refreshBtn.addEventListener('click', refreshContent);
        toolbar.appendChild(refreshBtn);
        content.appendChild(toolbar);

        // 内容容器（渲染目标，独立于工具栏）
        const inner = document.createElement('div');
        inner.className = 'rw-phd-inner';
        inner.innerHTML = '<div class="rw-phd-loading">分析中...</div>';
        content.appendChild(inner);

        // 让 refreshContent / renderer 写入此处而非覆盖整个 content
        dashboardWindow._rwRenderTarget = inner;
    };

    const show = async () => {
        if (!isWindowAlive()) {
            createDashboardWindow();
        }
        dashboardWindow.show();
        await refreshContent();
    };

    const hide = () => {
        if (!isWindowAlive()) return;
        dashboardWindow.hide();
    };

    const toggle = async () => {
        if (!isWindowAlive()) {
            await show();
            return;
        }
        if (dashboardWindow.isVisible) {
            hide();
        } else {
            await show();
        }
    };

    // 暴露全局 API
    window.RWHealthDashboard = {
        toggle,
        show,
        hide,
        refresh: refreshContent
    };
}

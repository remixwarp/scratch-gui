// 面向用户的作品问题检测系统
// 扫描 vm.runtime.targets 的积木结构，返回一组问题对象。
// 每个问题：{severity, message, source, targetId, blockId}
// 传入可选的 formatMessage(messageId, values) 以进行本地化，缺省时使用默认文案。

const MESSAGE_IDS = {
    scriptNeverRuns: 'mw.panel.inspector.scriptNeverRuns',
    listUnused: 'mw.panel.inspector.listUnused',
    variableUnused: 'mw.panel.inspector.variableUnused',
    foreverNoWait: 'mw.panel.inspector.foreverNoWait',
    cloudDuplicate: 'mw.panel.inspector.cloudDuplicate',
    broadcastNoReceiver: 'mw.panel.inspector.broadcastNoReceiver',
    broadcastNeverSent: 'mw.panel.inspector.broadcastNeverSent',
    undefinedProcedure: 'mw.panel.inspector.undefinedProcedure',
    unusedProcedure: 'mw.panel.inspector.unusedProcedure',
    stageSource: 'mw.panel.inspector.stageSource',
    spriteSource: 'mw.panel.inspector.spriteSource'
};

const DEFAULT_MESSAGES = {
    scriptNeverRuns: '脚本永远不会运行：缺少帽子积木',
    listUnused: values => `列表“${values.name}”未被使用`,
    variableUnused: values => `变量“${values.name}”未被使用`,
    foreverNoWait: '无限循环内没有等待积木，可能导致程序卡死',
    cloudDuplicate: values => `云变量“${values.name}”重复定义`,
    broadcastNoReceiver: values => `广播“${values.msg}”发出了，但没有角色接收`,
    broadcastNeverSent: values => `广播“${values.msg}”有角色接收，但从未被发送`,
    undefinedProcedure: values => `调用了未定义的自制积木：${values.proccode}`,
    unusedProcedure: values => `自制积木“${values.proccode}”从未被调用`,
    stageSource: '舞台',
    spriteSource: '角色'
};

const makeFormatter = formatMessage => (id, values, defaultFn) => {
    if (typeof formatMessage === 'function') {
        return formatMessage({id}, values);
    }
    if (typeof defaultFn === 'function') {
        return defaultFn(values);
    }
    return defaultFn;
};

// 从 runtime 已注册的积木中收集帽子积木 opcode（含扩展帽子）
const collectHatOpcodes = runtime => {
    const hats = new Set();
    if (runtime && runtime._hats) {
        for (const opcode in runtime._hats) {
            hats.add(opcode);
        }
    }
    if (runtime && runtime._primitiveInfo) {
        for (const opcode in runtime._primitiveInfo) {
            const info = runtime._primitiveInfo[opcode];
            if (info && info.type === 'hat') hats.add(opcode);
        }
    }
    return hats;
};

const getBroadcastValue = block => {
    if (!block) return null;
    if (block.fields && block.fields.BROADCAST_OPTION) {
        return block.fields.BROADCAST_OPTION.value;
    }
    return null;
};

const collectBlockSubtree = (target, startBlockId, out) => {
    const blocks = target.blocks._blocks;
    const stack = [startBlockId];
    const seen = new Set();
    while (stack.length > 0) {
        const id = stack.pop();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const block = blocks[id];
        if (!block) continue;
        out.push(block);
        if (block.next) stack.push(block.next);
        if (block.inputs) {
            for (const key in block.inputs) {
                const input = block.inputs[key];
                if (input && input.block) stack.push(input.block);
            }
        }
    }
};

// 检查一个脚本（top-level 积木）是否真的能被运行
const checkScriptReachability = (target, problems, hatOpcodes, t) => {
    const scripts = target.blocks.getScripts();
    for (const scriptId of scripts) {
        const block = target.blocks.getBlock(scriptId);
        if (!block) continue;
        if (block.opcode === 'control_forever') continue;
        if (!hatOpcodes.has(block.opcode)) {
            problems.push({
                severity: 'warning',
                message: t(MESSAGE_IDS.scriptNeverRuns, {}, DEFAULT_MESSAGES.scriptNeverRuns),
                source: target.getName(),
                targetId: target.id,
                blockId: scriptId
            });
        }
    }
};

// 检查广播发送/接收是否匹配
const checkBroadcasts = (target, problems, sentMessages, receivedMessages) => {
    const blocks = target.blocks._blocks;
    for (const blockId in blocks) {
        const block = blocks[blockId];
        if (!block) continue;
        if (block.opcode === 'event_broadcast' || block.opcode === 'event_broadcastandwait') {
            const input = block.inputs && block.inputs.BROADCAST_INPUT;
            const menuBlock = input ? blocks[input.block] : null;
            const msg = getBroadcastValue(menuBlock);
            if (msg) sentMessages.add(msg);
        } else if (block.opcode === 'event_whenbroadcastreceived') {
            const msg = getBroadcastValue(block);
            if (msg) receivedMessages.add(msg);
        }
    }
};

// 检查自定义积木的定义与调用
const checkProcedures = (target, problems, definedProccodes, calledProccodes) => {
    const blocks = target.blocks._blocks;
    for (const blockId in blocks) {
        const block = blocks[blockId];
        if (!block) continue;
        if (block.opcode === 'procedures_call') {
            const proccode = block.mutation && block.mutation.proccode;
            if (proccode) calledProccodes.add(proccode);
        } else if (block.opcode === 'procedures_definition') {
            const input = block.inputs && block.inputs.custom_block;
            const proto = input ? blocks[input.block] : null;
            const proccode = proto && proto.mutation ? proto.mutation.proccode : null;
            if (proccode) definedProccodes.add(proccode);
        }
    }
};

// 检查未使用的变量/列表
const checkUnusedVariables = (target, problems, t) => {
    const blocks = target.blocks;
    if (!blocks || !blocks._blocks) return;
    const references = blocks.getAllVariableAndListReferences();
    if (!target.variables) return;
    for (const varId in target.variables) {
        const variable = target.variables[varId];
        if (!references[varId]) {
            const isList = variable.type === 'list';
            problems.push({
                severity: 'info',
                message: t(
                    isList ? MESSAGE_IDS.listUnused : MESSAGE_IDS.variableUnused,
                    {name: variable.name},
                    DEFAULT_MESSAGES[isList ? 'listUnused' : 'variableUnused']
                ),
                source: target.getName(),
                targetId: target.id
            });
        }
    }
};

// 检查无限循环内是否有等待积木（可能导致卡死）
const checkForeverLoops = (target, problems, t) => {
    const blocks = target.blocks._blocks;
    for (const blockId in blocks) {
        const block = blocks[blockId];
        if (!block || block.opcode !== 'control_forever') continue;
        const subtree = [];
        collectBlockSubtree(target, blockId, subtree);
        const hasWait = subtree.some(b => b !== block && (
            b.opcode === 'control_wait' ||
            b.opcode === 'control_wait_until' ||
            b.opcode === 'control_stop'));
        if (!hasWait) {
            problems.push({
                severity: 'warning',
                message: t(MESSAGE_IDS.foreverNoWait, {}, DEFAULT_MESSAGES.foreverNoWait),
                source: target.getName(),
                targetId: target.id,
                blockId
            });
        }
    }
};

// 检查云变量重名（同名的两个云变量）
const checkCloudVariables = (target, problems, cloudVarNames, t) => {
    if (!target.variables) return;
    for (const varId in target.variables) {
        const variable = target.variables[varId];
        if (!variable.isCloud) continue;
        if (cloudVarNames.has(variable.name)) {
            problems.push({
                severity: 'error',
                message: t(MESSAGE_IDS.cloudDuplicate, {name: variable.name}, DEFAULT_MESSAGES.cloudDuplicate),
                source: target.getName(),
                targetId: target.id
            });
        }
        cloudVarNames.add(variable.name);
    }
};

export const inspectProject = (vm, formatMessage) => {
    const problems = [];
    const t = makeFormatter(formatMessage);
    if (!vm || !vm.runtime || !vm.runtime.targets) {
        return problems;
    }
    const hatOpcodes = collectHatOpcodes(vm.runtime);
    const sentMessages = new Set();
    const receivedMessages = new Set();
    const definedProccodes = new Set();
    const calledProccodes = new Set();
    const cloudVarNames = new Set();

    for (const target of vm.runtime.targets) {
        if (!target || !target.blocks) continue;
        try {
            checkScriptReachability(target, problems, hatOpcodes, t);
            checkBroadcasts(target, problems, sentMessages, receivedMessages);
            checkProcedures(target, problems, definedProccodes, calledProccodes);
            checkUnusedVariables(target, problems, t);
            checkForeverLoops(target, problems, t);
            checkCloudVariables(target, problems, cloudVarNames, t);
        } catch (e) {
            // 单个目标出错不影响整体检测
        }
    }

    // 广播匹配
    for (const msg of sentMessages) {
        if (!receivedMessages.has(msg)) {
            problems.push({
                severity: 'warning',
                message: t(MESSAGE_IDS.broadcastNoReceiver, {msg}, DEFAULT_MESSAGES.broadcastNoReceiver),
                source: t(MESSAGE_IDS.stageSource, {}, DEFAULT_MESSAGES.stageSource)
            });
        }
    }
    for (const msg of receivedMessages) {
        if (!sentMessages.has(msg)) {
            problems.push({
                severity: 'info',
                message: t(MESSAGE_IDS.broadcastNeverSent, {msg}, DEFAULT_MESSAGES.broadcastNeverSent),
                source: t(MESSAGE_IDS.stageSource, {}, DEFAULT_MESSAGES.stageSource)
            });
        }
    }

    // 自定义积木匹配
    for (const proccode of calledProccodes) {
        if (!definedProccodes.has(proccode)) {
            problems.push({
                severity: 'error',
                message: t(MESSAGE_IDS.undefinedProcedure, {proccode}, DEFAULT_MESSAGES.undefinedProcedure),
                source: t(MESSAGE_IDS.spriteSource, {}, DEFAULT_MESSAGES.spriteSource)
            });
        }
    }
    for (const proccode of definedProccodes) {
        if (!calledProccodes.has(proccode)) {
            problems.push({
                severity: 'info',
                message: t(MESSAGE_IDS.unusedProcedure, {proccode}, DEFAULT_MESSAGES.unusedProcedure),
                source: t(MESSAGE_IDS.spriteSource, {}, DEFAULT_MESSAGES.spriteSource)
            });
        }
    }

    return problems;
};

export default inspectProject;

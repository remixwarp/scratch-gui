import PropTypes from 'prop-types';
import {useEffect} from 'react';
import {unlockAchievement} from '../../lib/achievements.js';

/*
 * 这里只记录 VM 能确证的事实：BLOCK_GLOW_ON 代表积木实际被调度执行；
 * 项目扫描仅用于资源数、变量/列表数和积木树深度等可静态验证的条件。
 */
const LOOP_OPCODES = new Set([
    'control_repeat',
    'control_repeat_until',
    'control_forever',
    'control_for_each',
    'control_while'
]);
const CONTROL_OPCODES = new Set([
    ...LOOP_OPCODES,
    'control_if',
    'control_if_else'
]);

const MOTION_OPCODES = new Set([
    'motion_movesteps',
    'motion_gotoxy',
    'motion_goto',
    'motion_glidesecstoxy',
    'motion_changexby',
    'motion_changeyby',
    'motion_setx',
    'motion_sety',
    'motion_turnright',
    'motion_turnleft',
    'motion_pointindirection',
    'motion_pointtowards',
    'motion_ifonedgebounce'
]);

const getTargets = runtime => (
    runtime && Array.isArray(runtime.targets) ? runtime.targets : []
);

const getBlockMap = target => {
    const blockMap = target && target.blocks && target.blocks._blocks;
    return blockMap && typeof blockMap === 'object' ? blockMap : {};
};

const getBlocks = target => Object.values(getBlockMap(target));

const getMaxControlDepth = blocks => {
    const byId = new Map(blocks.map(block => [block.id, block]));
    let maxDepth = 0;
    blocks.forEach(block => {
        let depth = 0;
        let current = block;
        const visited = new Set();
        while (current && current.parent && !visited.has(current.parent)) {
            visited.add(current.parent);
            current = byId.get(current.parent);
            if (current && CONTROL_OPCODES.has(current.opcode)) depth += 1;
        }
        maxDepth = Math.max(maxDepth, depth);
    });
    return maxDepth;
};

const getVariableAndListCount = targets => targets.reduce((total, target) => (
    total + Object.values((target && target.variables) || {})
        .filter(variable => variable && (variable.type === '' || variable.type === 'list')).length
), 0);

const getLiteral = (block, inputName, blockMap) => {
    const input = block && block.inputs && block.inputs[inputName];
    if (!input) return null;
    const inputBlock = blockMap[input.block] || blockMap[input.shadow];
    if (inputBlock && inputBlock.fields) {
        const field = Object.values(inputBlock.fields)[0];
        return Array.isArray(field) ? field[0] : field && field.value;
    }
    /*
     * Scratch 序列化的原始输入也可能直接保留在 input.block/shadow 中。
     * 只接受字符串和数字，避免把积木 ID 误认为字面量。
     */
    if (typeof input.block === 'string' || typeof input.block === 'number') {
        return input.block;
    }
    if (typeof input.shadow === 'string' || typeof input.shadow === 'number') {
        return input.shadow;
    }
    return null;
};

const getField = (block, fieldName) => {
    const field = block && block.fields && block.fields[fieldName];
    return Array.isArray(field) ? field[0] : field && field.value;
};

const inputUsesOpcode = (block, blockMap, predicate) => Object.values(block.inputs || {})
    .some(input => {
        const child = input && blockMap[input.block];
        return child && predicate(child);
    });

const hasAncestor = (block, blockMap, predicate) => {
    let current = block;
    const visited = new Set();
    while (current && current.parent && !visited.has(current.parent)) {
        visited.add(current.parent);
        current = blockMap[current.parent];
        if (current && predicate(current)) return true;
    }
    return false;
};

const getBlockLocation = (runtime, blockId) => {
    for (const target of getTargets(runtime)) {
        const block = getBlockMap(target)[blockId];
        if (block) return {block, blockMap: getBlockMap(target), target};
    }
    return null;
};

const isNumberAtLeast = (value, threshold) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= threshold;
};

const isMotion = block => block && MOTION_OPCODES.has(block.opcode);

const isChineseToEnglishTranslation = (block, blockMap) => {
    if (!block || !/^translate_/.test(block.opcode)) return false;
    const language = String(getLiteral(block, 'LANGUAGE', blockMap) ||
        getField(block, 'LANGUAGE') || '').toLowerCase();
    const words = String(getLiteral(block, 'WORDS', blockMap) ||
        getLiteral(block, 'WORD', blockMap) || '');
    return /[\u3400-\u9fff]/.test(words) &&
        (language === 'english' || language === '英文' || language === 'en');
};

const getMutationProcedureCode = block => (
    block && block.mutation && block.mutation.proccode
);

const getTopLevelScriptCount = blocks => blocks.filter(block => (
    block && !block.parent && !block.shadow && /^event_when|^control_start_as_clone/.test(block.opcode)
)).length;

const hasChineseProjectName = targets => targets.some(target => {
    const targetName = target && target.sprite && target.sprite.name;
    const variableNames = Object.values((target && target.variables) || {})
        .map(variable => variable && variable.name);
    const procedureNames = getBlocks(target)
        .filter(block => block.opcode === 'procedures_prototype')
        .map(getMutationProcedureCode);
    return [targetName, ...variableNames, ...procedureNames]
        .some(name => /[\u3400-\u9fff]/.test(String(name || '')));
});

const hasLoopWithBehavior = (blocks, blockMap) => blocks.some(block => (
    LOOP_OPCODES.has(block.opcode) &&
    blocks.some(child => child && child.id !== block.id &&
        hasAncestor(child, blockMap, ancestor => ancestor.id === block.id) &&
        (/^(motion_|looks_|sound_)/.test(child.opcode)))
));

const scanProject = runtime => {
    const targets = getTargets(runtime);
    const blocks = targets.flatMap(getBlocks);
    const maxDepth = getMaxControlDepth(blocks);
    const blockMaps = targets.map(getBlockMap);
    const sayBlockCount = blocks.filter(block => (
        block.opcode === 'looks_say' || block.opcode === 'looks_sayforsecs'
    )).length;
    const hasKeyInput = blocks.some(block => block.opcode === 'event_whenkeypressed');
    const hasMotion = blocks.some(block => /^motion_/.test(block.opcode));
    const hasLooks = blocks.some(block => /^looks_/.test(block.opcode));
    const hasSensing = blocks.some(block => /^sensing_/.test(block.opcode));
    const hasVariables = getVariableAndListCount(targets) > 0;
    const hasBroadcastPair = blocks.some(block => (
        block.opcode === 'event_broadcast' || block.opcode === 'event_broadcastandwait'
    )) && blocks.some(block => block.opcode === 'event_whenbroadcastreceived');
    const hasVariableWrite = blocks.some(block => (
        block.opcode === 'data_setvariableto' || block.opcode === 'data_changevariableby'
    ));
    const topLevelScriptCount = getTopLevelScriptCount(blocks);
    const commentCount = targets.reduce((count, target) => (
        count + Object.keys((target && target.comments) || {}).length
    ), 0);

    // 可由保存的项目数据精确证明的门槛。
    if (blocks.length >= 200) unlockAchievement('block-maniac');
    if (getVariableAndListCount(targets) >= 20) unlockAchievement('global-variable-network');
    if (maxDepth > 5) unlockAchievement('nested-hell');
    if (sayBlockCount >= 15) unlockAchievement('scratcher');

    /*
     * “同一自制积木被 10 个角色使用”是项目结构事实。proccode 是 Scratch
     * 自制积木的稳定标识；定义本身不计入调用方。
     */
    const usersByProcedure = new Map();
    targets.filter(target => target && !target.isStage).forEach(target => {
        getBlocks(target).filter(block => block.opcode === 'procedures_call')
            .forEach(block => {
                const procedureCode = getMutationProcedureCode(block);
                if (!procedureCode) return;
                const users = usersByProcedure.get(procedureCode) || new Set();
                users.add(target.id || (target.sprite && target.sprite.name));
                usersByProcedure.set(procedureCode, users);
            });
    });
    if (Array.from(usersByProcedure.values()).some(users => users.size >= 10)) {
        unlockAchievement('ultimate-reuse');
    }

    /*
     * 以下项目使用结构而非作者意图推断：每个条件都由已保存的积木、变量和脚本
     * 拓扑组成，避免把一次运行时瞬态误判为“完成的作品”。
     */
    const isClassicRemake = targets.filter(target => target && !target.isStage).length >= 2 &&
        hasKeyInput && hasMotion && hasLooks && hasVariables;
    if (isClassicRemake) unlockAchievement('classic-remake');
    if (isClassicRemake && hasChineseProjectName(targets)) unlockAchievement('classic-remake-cn');

    if (blocks.length >= 5 && blocks.length <= 30 && topLevelScriptCount >= 1 &&
        hasKeyInput && hasMotion && (hasLooks || hasSensing)) {
        unlockAchievement('extreme-compression');
    }

    if (targets.some((target, index) => hasLoopWithBehavior(getBlocks(target), blockMaps[index]))) {
        unlockAchievement('seamless-loop');
    }

    if (hasVariables && hasVariableWrite && hasBroadcastPair &&
        blocks.some(block => /^control_if/.test(block.opcode))) {
        unlockAchievement('state-machine');
    }

    const variableNames = targets.flatMap(target => Object.values((target && target.variables) || {}))
        .map(variable => String((variable && variable.name) || '').toLowerCase());
    const hasPhysicsVariable = variableNames.some(name => (
        /(speed|velocity|gravity|accel|速度|重力|加速)/.test(name)
    ));
    if (hasPhysicsVariable &&
        blocks.some(block => block.opcode === 'motion_changeyby') &&
        targets.some((target, index) => hasLoopWithBehavior(getBlocks(target), blockMaps[index]))) {
        unlockAchievement('physics-engine');
    }

    if (blocks.length >= 10 && blocks.length <= 75 && topLevelScriptCount >= 3 &&
        maxDepth <= 3 && commentCount >= Math.ceil(topLevelScriptCount / 2)) {
        unlockAchievement('code-cleanliness');
    }

    if (blocks.length >= 120 && getVariableAndListCount(targets) >= 10 && maxDepth >= 4) {
        unlockAchievement('give-up-treatment');
    }
};

const hasProjectList = runtime => getTargets(runtime).some(target => (
    Object.values((target && target.variables) || {})
        .some(variable => variable && variable.type === 'list')
));

const hasProjectCustomDefinition = runtime => getTargets(runtime).some(target => (
    getBlocks(target).some(block => block.opcode === 'procedures_definition')
));

const isVideoCondition = (block, blockMap) => (
    block && block.opcode === 'control_if' &&
    inputUsesOpcode(block, blockMap, child => /^videoSensing_/.test(child.opcode))
);

const AchievementTracker = ({vm}) => {
    useEffect(() => {
        const runtime = vm && vm.runtime;
        if (!runtime) return;

        let scanTimer = null;
        let createdCloneCount = 0;
        let listAddCount = 0;
        let ifElseCount = 0;
        let customCallCount = 0;
        let musicNoteCount = 0;
        let stampCount = 0;
        let sawBroadcastSend = false;
        let sawBroadcastReceive = false;
        let sawQuestion = false;
        let sawLeftRight = false;
        let sawMotionAfterLeftRight = false;
        let moveTenCount = 0;
        let sawCloneCreateInLoop = false;
        let sawCloneDelete = false;
        let sawTimer = false;
        const broadcastHistory = [];

        const scheduleScan = () => {
            if (scanTimer !== null) return;
            scanTimer = setTimeout(() => {
                scanTimer = null;
                scanProject(runtime);
            }, 0);
        };
        const onProjectRunStart = () => {
            unlockAchievement('first-steps');
            scheduleScan();
        };

        const onQuestion = () => {
            sawQuestion = true;
        };
        const onAnswer = () => {
            if (sawQuestion) unlockAchievement('ask-interact');
        };

        const onTargetCreated = target => {
            if (target && target.isOriginal === false) {
                createdCloneCount += 1;
                if (sawCloneCreateInLoop) unlockAchievement('clone-intro');
                if (createdCloneCount >= 300) unlockAchievement('memory-assassin');
            }
        };
        const onTargetRemoved = target => {
            if (target && target.isOriginal === false) {
                if (sawCloneDelete) unlockAchievement('clone-cleanup');
            }
        };

        const onBlockGlow = blockId => {
            const location = getBlockLocation(runtime, blockId);
            if (!location) return;
            const {block, blockMap, target} = location;
            const {opcode} = block;

            if (isMotion(block)) {
                if (sawLeftRight) sawMotionAfterLeftRight = true;
                if (sawMotionAfterLeftRight) unlockAchievement('spin-jump');
            }
            if (opcode === 'motion_movesteps' &&
                Number(getLiteral(block, 'STEPS', blockMap)) === 10) {
                moveTenCount += 1;
                if (moveTenCount > 10) unlockAchievement('movement-pro');
            }
            if (opcode === 'motion_movesteps' &&
                hasAncestor(block, blockMap, ancestor => LOOP_OPCODES.has(ancestor.opcode))) {
                unlockAchievement('object-ran');
            }
            if ((opcode === 'motion_turnleft' || opcode === 'motion_turnright') &&
                hasAncestor(block, blockMap, ancestor => LOOP_OPCODES.has(ancestor.opcode))) {
                unlockAchievement('dizzy');
            }
            if (opcode === 'motion_setrotationstyle' &&
                String(getField(block, 'STYLE')).toLowerCase() === 'left-right') {
                sawLeftRight = true;
            }
            if (opcode === 'event_whenkeypressed' &&
                String(getField(block, 'KEY_OPTION')).toLowerCase() === 'space') {
                unlockAchievement('keyboard-dancer');
            }
            if (opcode === 'looks_setsizeto' && isNumberAtLeast(getLiteral(block, 'SIZE', blockMap), 200)) {
                unlockAchievement('size-transform');
            }
            if (opcode === 'looks_changesizeby' &&
                Math.abs(Number(getLiteral(block, 'CHANGE', blockMap))) >= 100) {
                unlockAchievement('size-transform');
            }
            if (/^sound_/.test(opcode)) unlockAchievement('sound-control');
            if (opcode === 'data_addtolist') {
                listAddCount += 1;
                if (listAddCount >= 5 && hasProjectList(runtime)) unlockAchievement('list-expert');
            }
            if (opcode === 'control_if_else') {
                ifElseCount += 1;
                if (ifElseCount >= 3) unlockAchievement('condition-branch');
            }
            if (LOOP_OPCODES.has(opcode) &&
                hasAncestor(block, blockMap, ancestor => LOOP_OPCODES.has(ancestor.opcode))) {
                unlockAchievement('nested-loops');
            }
            if (isMotion(block) &&
                (inputUsesOpcode(block, blockMap, child => child.opcode === 'operator_random') ||
                hasAncestor(block, blockMap, ancestor => ancestor.opcode === 'operator_random'))) {
                unlockAchievement('random-walk');
            }
            if (opcode === 'motion_ifonedgebounce') unlockAchievement('collision-detect');
            if (opcode === 'pen_penDown') unlockAchievement('pen-trail');
            if (opcode === 'music_playNoteForBeats') {
                musicNoteCount += 1;
                if (musicNoteCount >= 5) unlockAchievement('music-producer');
            }
            if (isMotion(block) && hasAncestor(block, blockMap, ancestor => isVideoCondition(ancestor, blockMap))) {
                unlockAchievement('video-sensing');
            }
            if (opcode === 'procedures_call') {
                customCallCount += 1;
                if (customCallCount >= 3 && hasProjectCustomDefinition(runtime)) {
                    unlockAchievement('custom-function');
                }
            }
            if ((opcode === 'motion_gotoxy' || opcode === 'motion_setx' || opcode === 'motion_sety') &&
                inputUsesOpcode(block, blockMap, child => /^operator_/.test(child.opcode))) {
                unlockAchievement('coordinate-math');
            }
            if (opcode === 'operator_join') {
                const left = String(getLiteral(block, 'STRING1', blockMap) || '');
                const right = String(getLiteral(block, 'STRING2', blockMap) || '');
                if (left.length + right.length > 20) unlockAchievement('string-join');
            }
            if (opcode === 'sensing_timer' || opcode === 'sensing_resettimer') sawTimer = true;
            if (opcode === 'control_wait' && sawTimer &&
                isNumberAtLeast(getLiteral(block, 'DURATION', blockMap), 10)) {
                unlockAchievement('timer-challenge');
            }
            if (opcode === 'pen_stamp') {
                stampCount += 1;
                if (stampCount >= 50) unlockAchievement('stamp-master');
            }
            if (/^looks_(changeeffectby|seteffectto)$/.test(opcode)) {
                setTimeout(() => {
                    const effects = target && target.effects;
                    if (effects && Object.keys(effects).some(name => Math.abs(effects[name]) >= 100)) {
                        unlockAchievement('effects-maxed');
                    }
                }, 0);
            }
            if (opcode === 'control_create_clone_of' &&
                hasAncestor(block, blockMap, ancestor => LOOP_OPCODES.has(ancestor.opcode))) {
                sawCloneCreateInLoop = true;
            }
            if (opcode === 'control_delete_this_clone') sawCloneDelete = true;
            if (opcode === 'event_broadcast' || opcode === 'event_broadcastandwait') {
                sawBroadcastSend = true;
                const message = String(getField(block, 'BROADCAST_OPTION') ||
                    getLiteral(block, 'BROADCAST_INPUT', blockMap) || '');
                const now = Date.now();
                broadcastHistory.push({message, now});
                while (broadcastHistory.length && now - broadcastHistory[0].now > 1000) {
                    broadcastHistory.shift();
                }
                if (new Set(broadcastHistory.map(item => item.message)).size >= 10) {
                    unlockAchievement('broadcast-storm');
                }
            }
            if (opcode === 'event_whenbroadcastreceived') sawBroadcastReceive = true;
            if (sawBroadcastSend && sawBroadcastReceive) unlockAchievement('broadcast-pioneer');
            if (opcode === 'looks_say' || opcode === 'looks_sayforsecs') {
                const text = String(getLiteral(block, 'MESSAGE', blockMap) || '');
                if (text === 'Hello World!' || text === '你好，世界！') {
                    unlockAchievement('hi-hi-hi');
                }
                if (inputUsesOpcode(block, blockMap, child => isChineseToEnglishTranslation(child, blockMap))) {
                    unlockAchievement('translator');
                }
            }
        };

        scanProject(runtime);
        /*
         * BLOCK_GLOW_ON 与 PROJECT_RUN_START 是 VM 事件；项目变更/加载则由
         * runtime 发出。两个对象都可能在嵌入式或测试 VM 中不完整，所以逐项探测。
         */
        if (typeof vm.on === 'function') {
            vm.on('BLOCK_GLOW_ON', onBlockGlow);
            vm.on('PROJECT_RUN_START', onProjectRunStart);
        }
        if (typeof runtime.on === 'function') {
            runtime.on('PROJECT_CHANGED', scheduleScan);
            runtime.on('PROJECT_LOADED', scheduleScan);
            runtime.on('QUESTION', onQuestion);
            runtime.on('ANSWER', onAnswer);
            runtime.on('targetWasCreated', onTargetCreated);
            runtime.on('targetWasRemoved', onTargetRemoved);
        }
        return () => {
            if (scanTimer !== null) clearTimeout(scanTimer);
            if (typeof vm.off === 'function') {
                vm.off('BLOCK_GLOW_ON', onBlockGlow);
                vm.off('PROJECT_RUN_START', onProjectRunStart);
            }
            if (typeof runtime.off === 'function') {
                runtime.off('PROJECT_CHANGED', scheduleScan);
                runtime.off('PROJECT_LOADED', scheduleScan);
                runtime.off('QUESTION', onQuestion);
                runtime.off('ANSWER', onAnswer);
                runtime.off('targetWasCreated', onTargetCreated);
                runtime.off('targetWasRemoved', onTargetRemoved);
            }
        };
    }, [vm]);

    return null;
};

export default AchievementTracker;

AchievementTracker.propTypes = {
    vm: PropTypes.shape({
        on: PropTypes.func,
        off: PropTypes.func,
        runtime: PropTypes.object
    }).isRequired
};

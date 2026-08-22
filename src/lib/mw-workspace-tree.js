// VS Code 布局 —— 项目资源树（Explorer）数据模型
// 从 VM 读取精灵/舞台/造型/声音/变量/自制积木，生成层级化资源树。
// 仅做只读数据整理，不直接操作 VM 状态（切换/高亮由调用方处理）。

// 变量类型
export const VAR_SCALAR = '';
export const VAR_LIST = 'list';
export const VAR_BROADCAST = 'broadcast_msg';

/**
 * 从 target 的 blocks 中提取自制积木（procedures）列表。
 * @param {object} target VM target
 * @returns {Array<{id: string, name: string}>}
 */
const getProcedures = target => {
    const procedures = [];
    const blocks = target.blocks && target.blocks._blocks;
    if (!blocks) return procedures;
    for (const id in blocks) {
        const block = blocks[id];
        if (!block) continue;
        // procedures_prototype 携带 mutation.proccode（形如 "myBlock %s"）
        if (block.opcode === 'procedures_prototype' && block.mutation) {
            const procCode = block.mutation.proccode;
            if (procCode) {
                procedures.push({id, name: procCode.replace(/%\w+/g, '').trim() || procCode});
            }
        }
    }
    return procedures;
};

/**
 * 从 target 的 variables 中提取变量列表，区分标量/列表/消息。
 * @param {object} target VM target
 * @returns {{scalars: Array, lists: Array, broadcasts: Array}}
 */
const getVariables = target => {
    const scalars = [];
    const lists = [];
    const broadcasts = [];
    const variables = target.variables || {};
    for (const id in variables) {
        const variable = variables[id];
        if (!variable) continue;
        const item = {id, name: variable.name, isCloud: !!variable.isCloud};
        if (variable.type === VAR_LIST) {
            lists.push(item);
        } else if (variable.type === VAR_BROADCAST) {
            broadcasts.push(item);
        } else {
            scalars.push(item);
        }
    }
    return {scalars, lists, broadcasts};
};

/**
 * 生成项目资源树。
 * @param {object} vm scratch-vm 实例
 * @returns {{stage: object, sprites: Array}}
 */
export const buildWorkspaceTree = vm => {
    const empty = {stage: null, sprites: []};
    if (!vm || !vm.runtime || !vm.runtime.targets) return empty;

    const tree = {stage: null, sprites: []};
    const targets = vm.runtime.targets;

    targets.forEach(target => {
        const node = buildTargetNode(target);
        if (target.isStage) {
            tree.stage = node;
        } else {
            tree.sprites.push(node);
        }
    });

    return tree;
};

/**
 * 生成单个 target 的资源节点。
 * @param {object} target VM target
 * @returns {object}
 */
export const buildTargetNode = target => {
    const costumes = (target.getCostumes ? target.getCostumes() : []).map(costume => ({
        id: costume.assetId || costume.name,
        name: costume.name,
        dataFormat: costume.asset && costume.asset.dataFormat
    }));
    const sounds = (target.getSounds ? target.getSounds() : []).map(sound => ({
        id: sound.assetId || sound.name,
        name: sound.name,
        dataFormat: sound.asset && sound.asset.dataFormat
    }));
    const {scalars, lists, broadcasts} = getVariables(target);
    const procedures = getProcedures(target);

    return {
        id: target.id,
        name: target.getName() || target.id,
        isStage: target.isStage,
        costumes,
        sounds,
        scalars,
        lists,
        broadcasts,
        procedures
    };
};

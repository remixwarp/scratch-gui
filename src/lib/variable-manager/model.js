const VARIABLE_TYPE = '';
const LIST_TYPE = 'list';
const CLOUD_PREFIX = '☁ ';

// 错误只带 code，具体文案由界面层翻译（model 不掺文案）
const ERROR_CODES = {
    NAME_REQUIRED: 'nameRequired',
    NAME_TAKEN: 'nameTaken',
    MISSING: 'missing',
    WORKSPACE_NOT_READY: 'workspaceNotReady'
};

const fail = (code, message) => Object.assign(new Error(message), {code});

const getOriginalTargets = vm => (
    vm && vm.runtime ? vm.runtime.targets.filter(target => target.isOriginal) : []
);

const getEditingTarget = vm => (
    vm && vm.runtime ? vm.runtime.getEditingTarget() : null
);

const getOwnerForVariable = (vm, variableId) => getOriginalTargets(vm).find(target => (
    Object.prototype.hasOwnProperty.call(target.variables || {}, variableId)
));

const fieldReferencesVariable = (field, variableId) => {
    if (!field || typeof field !== 'object') return false;
    return field.id === variableId || field.value === variableId;
};

const countVariableUses = (vm, variableId, localTargetId) => {
    const targets = localTargetId ?
        getOriginalTargets(vm).filter(target => target.id === localTargetId) :
        getOriginalTargets(vm);
    let count = 0;
    for (const target of targets) {
        const blocks = target.blocks && target.blocks._blocks ? Object.values(target.blocks._blocks) : [];
        for (const block of blocks) {
            if (Object.values(block.fields || {}).some(field => fieldReferencesVariable(field, variableId))) {
                count++;
            }
        }
    }
    return count;
};

const monitorVisible = (vm, variableId) => {
    const state = vm && vm.runtime && vm.runtime.getMonitorState ? vm.runtime.getMonitorState() : null;
    if (!state) return false;
    const monitor = typeof state.get === 'function' ? state.get(variableId) : state[variableId];
    if (!monitor) return false;
    return typeof monitor.get === 'function' ? !!monitor.get('visible') : !!monitor.visible;
};

const collectVariables = vm => {
    if (!vm || !vm.runtime) return [];
    const editingTarget = getEditingTarget(vm);
    const stage = vm.runtime.getTargetForStage();
    const records = [];
    const addTarget = (target, scope) => {
        if (!target) return;
        for (const variable of Object.values(target.variables || {})) {
            if (variable.type !== VARIABLE_TYPE && variable.type !== LIST_TYPE) continue;
            records.push({
                id: variable.id,
                name: variable.name,
                type: variable.type === LIST_TYPE ? 'list' : 'variable',
                scope,
                targetId: target.id,
                targetName: target.getName ? target.getName() : target.sprite && target.sprite.name,
                isCloud: !!variable.isCloud,
                value: Array.isArray(variable.value) ? variable.value.slice() : variable.value,
                usageCount: countVariableUses(vm, variable.id, scope === 'local' ? target.id : null),
                monitorVisible: monitorVisible(vm, variable.id)
            });
        }
    };
    if (editingTarget && !editingTarget.isStage) addTarget(editingTarget, 'local');
    addTarget(stage, 'global');
    return records.sort((a, b) => a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()));
};

const normalizeName = (name, cloud) => {
    let normalized = String(name || '').trim();
    if (cloud) {
        normalized = normalized.replace(/^☁\s*/, '').trim();
        if (normalized) normalized = `${CLOUD_PREFIX}${normalized}`;
    }
    return normalized;
};

const validateName = (records, name, {cloud = false, excludeId = null, scope = 'global', type = 'variable'} = {}) => {
    const normalized = normalizeName(name, cloud);
    if (!normalized) return {ok: false, error: ERROR_CODES.NAME_REQUIRED};
    const duplicate = records.some(record => (
        record.id !== excludeId &&
        record.type === type &&
        record.scope === scope &&
        record.name.toLocaleLowerCase() === normalized.toLocaleLowerCase()
    ));
    if (duplicate) return {ok: false, error: ERROR_CODES.NAME_TAKEN};
    return {ok: true, name: normalized};
};

const markProjectChanged = vm => {
    if (vm && vm.runtime && typeof vm.runtime.emitProjectChanged === 'function') {
        vm.runtime.emitProjectChanged();
    }
};

const setVariableValue = (vm, record, value) => {
    const next = record.type === 'list' ? (Array.isArray(value) ? value : []) : value;
    const changed = vm.setVariableValue(record.targetId, record.id, next);
    if (!changed) throw fail(ERROR_CODES.MISSING, 'The variable no longer exists.');
    const owner = getOwnerForVariable(vm, record.id);
    const variable = owner && owner.variables[record.id];
    if (variable && record.type === 'list') variable._monitorUpToDate = false;
    markProjectChanged(vm);
};

const renameVariable = (workspace, records, record, name) => {
    const validation = validateName(records, name, {
        cloud: record.isCloud,
        excludeId: record.id,
        scope: record.scope,
        type: record.type
    });
    if (!validation.ok) throw fail(validation.error, validation.error);
    if (!workspace || typeof workspace.renameVariableById !== 'function') {
        throw fail(ERROR_CODES.WORKSPACE_NOT_READY, 'The code workspace is not ready.');
    }
    workspace.renameVariableById(record.id, validation.name);
    return validation.name;
};

const createVariable = (workspace, records, {name, type, scope, cloud}) => {
    const isCloud = !!cloud && scope === 'global' && type === 'variable';
    const validation = validateName(records, name, {cloud: isCloud, scope, type});
    if (!validation.ok) throw fail(validation.error, validation.error);
    if (!workspace || typeof workspace.createVariable !== 'function') {
        throw fail(ERROR_CODES.WORKSPACE_NOT_READY, 'The code workspace is not ready.');
    }
    return workspace.createVariable(
        validation.name,
        type === 'list' ? LIST_TYPE : VARIABLE_TYPE,
        null,
        scope === 'local',
        isCloud
    );
};

const deleteVariable = (workspace, variableId) => {
    if (!workspace || typeof workspace.deleteVariableById !== 'function') {
        throw fail(ERROR_CODES.WORKSPACE_NOT_READY, 'The code workspace is not ready.');
    }
    workspace.deleteVariableById(variableId);
};

const setMonitorVisible = (vm, record, visible) => {
    const blocks = vm && vm.runtime && vm.runtime.monitorBlocks;
    if (!blocks || !blocks._blocks || !blocks._blocks[record.id]) return false;
    blocks.changeBlock({
        id: record.id,
        element: 'checkbox',
        value: !!visible
    }, vm.runtime);
    markProjectChanged(vm);
    return true;
};

export {
    CLOUD_PREFIX,
    ERROR_CODES,
    LIST_TYPE,
    VARIABLE_TYPE,
    collectVariables,
    countVariableUses,
    createVariable,
    deleteVariable,
    getOriginalTargets,
    monitorVisible,
    normalizeName,
    renameVariable,
    setMonitorVisible,
    setVariableValue,
    validateName
};

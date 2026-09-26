import JSZip from '@turbowarp/jszip';

import {
    RJ_MAGIC,
    RJ_FORMAT_ID,
    RJ_FORMAT_VERSION,
    RJ_SB3_VERSION,
    MANIFEST_FILE,
    TARGETS_TABLE,
    COSTUMES_TABLE,
    SOUNDS_TABLE,
    VARIABLES_TABLE,
    MONITORS_TABLE,
    targetFile,
    blockFile,
    assetFile
} from './constants.js';

const APP_NAME = 'RemixWarp';

const decodeText = data => {
    if (typeof data === 'string') return data;
    if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        return new TextDecoder().decode(data);
    }
    return JSON.stringify(data);
};

const countKeys = obj => Object.keys(obj || {}).length;

const costumeFileName = costume => {
    if (costume.md5ext) return costume.md5ext;
    return `${costume.assetId}.${(costume.dataFormat || 'png').toLowerCase()}`;
};

const soundFileName = sound => {
    if (sound.md5ext) return sound.md5ext;
    return `${sound.assetId}.${(sound.dataFormat || 'wav').toLowerCase()}`;
};

/**
 * 角色名称表条目（含角色数量所需的统计信息）
 * @param {object} target sb3 target 对象
 * @param {number} index 序号
 * @returns {object} 条目
 */
const buildTargetTableEntry = (target, index) => {
    const isStage = !!target.isStage;
    const entry = {
        index,
        name: target.name,
        isStage,
        currentCostume: target.currentCostume,
        volume: target.volume,
        layerOrder: target.layerOrder,
        costumeCount: (target.costumes || []).length,
        soundCount: (target.sounds || []).length,
        variableCount: countKeys(target.variables),
        listCount: countKeys(target.lists),
        broadcastCount: countKeys(target.broadcasts),
        blockCount: countKeys(target.blocks),
        commentCount: countKeys(target.comments),
        targetFile: targetFile(index),
        blocksFile: blockFile(index)
    };
    if (isStage) {
        entry.tempo = target.tempo;
        entry.videoTransparency = target.videoTransparency;
        entry.videoState = target.videoState;
        entry.textToSpeechLanguage = target.textToSpeechLanguage;
    } else {
        entry.visible = target.visible;
        entry.x = target.x;
        entry.y = target.y;
        entry.size = target.size;
        entry.direction = target.direction;
        entry.draggable = target.draggable;
        entry.rotationStyle = target.rotationStyle;
    }
    return entry;
};

/**
 * 造型与背景名称表（舞台的造型即背景）
 * @param {Array<object>} targets sb3 targets
 * @returns {object} 名称表
 */
const buildCostumeTable = targets => {
    const items = [];
    targets.forEach((target, targetIndex) => {
        const isBackdrop = !!target.isStage;
        (target.costumes || []).forEach((costume, costumeIndex) => {
            const fileName = costumeFileName(costume);
            items.push({
                index: costumeIndex,
                targetIndex,
                targetName: target.name,
                isBackdrop,
                name: costume.name,
                assetId: costume.assetId,
                md5ext: fileName,
                dataFormat: costume.dataFormat,
                bitmapResolution: costume.bitmapResolution,
                rotationCenterX: costume.rotationCenterX,
                rotationCenterY: costume.rotationCenterY,
                file: assetFile(fileName)
            });
        });
    });
    const backdropCount = items.filter(i => i.isBackdrop).length;
    return {
        count: items.length,
        backdropCount,
        costumeCount: items.length - backdropCount,
        items
    };
};

/**
 * 声音名称表
 * @param {Array<object>} targets sb3 targets
 * @returns {object} 名称表
 */
const buildSoundTable = targets => {
    const items = [];
    targets.forEach((target, targetIndex) => {
        (target.sounds || []).forEach((sound, soundIndex) => {
            const fileName = soundFileName(sound);
            items.push({
                index: soundIndex,
                targetIndex,
                targetName: target.name,
                name: sound.name,
                assetId: sound.assetId,
                md5ext: fileName,
                dataFormat: sound.dataFormat,
                format: sound.format,
                rate: sound.rate,
                sampleCount: sound.sampleCount,
                file: assetFile(fileName)
            });
        });
    });
    return {count: items.length, items};
};

/**
 * 变量与列表（含广播消息）名称表
 * sb3 中变量为 `id -> [name, value(, isCloud)]`，列表为 `id -> [name, [values]]`
 * @param {Array<object>} targets sb3 targets
 * @returns {object} 名称表
 */
const buildVariableTable = targets => {
    const items = [];
    targets.forEach((target, targetIndex) => {
        const variables = target.variables || {};
        for (const id of Object.keys(variables)) {
            const value = variables[id];
            items.push({
                id,
                kind: 'variable',
                targetIndex,
                targetName: target.name,
                name: Array.isArray(value) ? value[0] : value,
                value: Array.isArray(value) ? value[1] : null,
                isCloud: Array.isArray(value) ? value[2] === true : false,
                isLocal: !target.isStage
            });
        }
        const lists = target.lists || {};
        for (const id of Object.keys(lists)) {
            const value = lists[id];
            const listValue = Array.isArray(value) && Array.isArray(value[1]) ? value[1] : [];
            items.push({
                id,
                kind: 'list',
                targetIndex,
                targetName: target.name,
                name: Array.isArray(value) ? value[0] : value,
                value: listValue,
                length: listValue.length,
                isCloud: false,
                isLocal: !target.isStage
            });
        }
        const broadcasts = target.broadcasts || {};
        for (const id of Object.keys(broadcasts)) {
            items.push({
                id,
                kind: 'broadcast',
                targetIndex,
                targetName: target.name,
                name: broadcasts[id],
                value: broadcasts[id],
                isCloud: false,
                isLocal: !target.isStage
            });
        }
    });
    const variableCount = items.filter(i => i.kind === 'variable').length;
    const listCount = items.filter(i => i.kind === 'list').length;
    const broadcastCount = items.filter(i => i.kind === 'broadcast').length;
    return {count: items.length, variableCount, listCount, broadcastCount, items};
};

/**
 * 把一个完整的 sb3 project.json 拆分成 .rj 需要的各个 json 分片。
 * 积木（blocks / comments）单独拆到 blocks/ 目录，方便并行加载。
 * @param {object} projectJSON 标准 sb3 project.json
 * @returns {object} {manifest, tables, targetFiles, blockFiles}
 */
export const splitProjectJSON = projectJSON => {
    const targets = projectJSON.targets || [];

    const targetTable = {
        count: targets.length,
        stageCount: targets.filter(t => t.isStage).length,
        spriteCount: targets.filter(t => !t.isStage).length,
        items: targets.map(buildTargetTableEntry)
    };
    const costumeTable = buildCostumeTable(targets);
    const soundTable = buildSoundTable(targets);
    const variableTable = buildVariableTable(targets);
    const monitors = projectJSON.monitors || [];

    // 除 targets / monitors 外的顶层字段原样保留，保证相对 sb3 无损
    const extras = {};
    for (const key of Object.keys(projectJSON)) {
        if (key === 'targets' || key === 'monitors') continue;
        extras[key] = projectJSON[key];
    }

    const targetFiles = targets.map((target, index) => {
        const withoutBlocks = {...target};
        delete withoutBlocks.blocks;
        delete withoutBlocks.comments;
        return {
            path: targetFile(index),
            content: {
                index,
                name: target.name,
                isStage: !!target.isStage,
                target: withoutBlocks
            }
        };
    });

    const blockFiles = targets.map((target, index) => ({
        path: blockFile(index),
        content: {
            index,
            name: target.name,
            isStage: !!target.isStage,
            blockCount: countKeys(target.blocks),
            commentCount: countKeys(target.comments),
            blocks: target.blocks || {},
            comments: target.comments || {}
        }
    }));

    const manifest = {
        magic: RJ_MAGIC,
        format: RJ_FORMAT_ID,
        formatVersion: RJ_FORMAT_VERSION,
        sb3Version: RJ_SB3_VERSION,
        app: APP_NAME,
        createdAt: new Date().toISOString(),
        title: null,
        targetCount: targets.length,
        costumeCount: costumeTable.count,
        backdropCount: costumeTable.backdropCount,
        soundCount: soundTable.count,
        variableCount: variableTable.variableCount,
        listCount: variableTable.listCount,
        broadcastCount: variableTable.broadcastCount,
        blockCount: targets.reduce((acc, t) => acc + countKeys(t.blocks), 0),
        monitorCount: monitors.length,
        assetCount: costumeTable.count + soundTable.count,
        monitors,
        project: extras,
        files: {
            targets: targetFiles.map(f => f.path),
            blocks: blockFiles.map(f => f.path),
            assets: []
        }
    };

    return {
        manifest,
        tables: {
            [TARGETS_TABLE]: targetTable,
            [COSTUMES_TABLE]: costumeTable,
            [SOUNDS_TABLE]: soundTable,
            [VARIABLES_TABLE]: variableTable,
            [MONITORS_TABLE]: {count: monitors.length, items: monitors}
        },
        targetFiles,
        blockFiles
    };
};

/**
 * 把拆分结果写进 zip，得到 .rj 容器
 * @param {object} parts splitProjectJSON 的结果
 * @param {object} assets 资源表 {文件名: Uint8Array}
 * @param {string} title 作品标题
 * @returns {JSZip} zip 对象
 */
export const buildRJZip = (parts, assets, title) => {
    const zip = new JSZip();
    const manifest = {...parts.manifest};
    if (title) manifest.title = title;

    const assetNames = Object.keys(assets).map(name => assetFile(name));
    manifest.files = {...manifest.files, assets: assetNames};

    zip.file(MANIFEST_FILE, JSON.stringify(manifest));

    for (const path of Object.keys(parts.tables)) {
        zip.file(path, JSON.stringify(parts.tables[path]));
    }
    for (const file of parts.targetFiles) {
        zip.file(file.path, JSON.stringify(file.content));
    }
    for (const file of parts.blockFiles) {
        zip.file(file.path, JSON.stringify(file.content));
    }
    for (const name of Object.keys(assets)) {
        zip.file(assetFile(name), assets[name]);
    }

    return zip;
};

/**
 * 保存当前作品为 .rj 字节内容
 * @param {object} vm scratch-vm 实例
 * @param {string} title 作品标题
 * @returns {Promise<Uint8Array>} .rj 文件内容
 */
export const saveProjectAsRJ = async (vm, title) => {
    if (!vm) {
        throw new Error('saveProjectAsRJ: 缺少 VM 实例');
    }

    let files;
    if (typeof vm.saveProjectSb3DontZip === 'function') {
        files = vm.saveProjectSb3DontZip();
    } else {
        const buffer = await vm.saveProjectSb3('arraybuffer');
        const zip = await JSZip.loadAsync(buffer);
        files = {};
        for (const name of Object.keys(zip.files)) {
            if (zip.files[name].dir) continue;
            files[name] = await zip.files[name].async('uint8array');
        }
    }

    const projectJSON = JSON.parse(decodeText(files['project.json']));
    const assets = {};
    for (const name of Object.keys(files)) {
        if (name === 'project.json') continue;
        assets[name] = files[name];
    }

    if (title) {
        projectJSON.meta = projectJSON.meta || {};
        if (!projectJSON.meta.name) projectJSON.meta.name = title;
    }

    const parts = splitProjectJSON(projectJSON);
    const zip = buildRJZip(parts, assets, title);

    return zip.generateAsync({
        type: 'uint8array',
        mimeType: 'application/octet-stream',
        compression: 'DEFLATE',
        compressionOptions: {level: 6}
    });
};

export {APP_NAME};

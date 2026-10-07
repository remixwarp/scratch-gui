/**
 * @fileoverview
 * .rj 容器 -> 标准 sb3 projectJSON 的「装配」核心逻辑。
 *
 * 这一层只做纯数据工作（读分片、JSON.parse、拼接、预处理二次加载缓存），
 * 不碰 DOM、不碰 scratch-vm 实例，因此可以被**主线程**复用，也可以被直接
 * 打进 **Web Worker** 里离线执行（见 rj-deserialize.worker.js）。把这段最重的
 * CPU 工作（zip 解包 + 几十上百个 JSON 分片解析 + 资源 DEFLATE 解压）挪到
 * 子线程，主线程就不会在打开大作品时卡死。
 *
 * 装配结果：
 *   - projectJSON：带 __prebuiltBlocks（若命中二次加载缓存）的标准 sb3
 *   - assetNames：所有资源文件的「裸名」列表（用于主线程侧构造异步资源视图）
 *   - manifest / tables / title：供 GUI 直接渲染名称表，无需再读一遍分片
 */

import {
    RJ_MAGIC,
    RJ_FORMAT_ID,
    RJ_FASTLOAD_VERSION,
    MANIFEST_FILE,
    TARGETS_TABLE,
    COSTUMES_TABLE,
    SOUNDS_TABLE,
    VARIABLES_TABLE,
    MONITORS_TABLE,
    targetFile,
    blockFile,
    prebuiltBlockFile,
    RJ_LOAD_STAGES
} from './constants.js';
import {readJSON, readAll} from './rj-shared.js';

const ASSET_PREFIX = 'assets/';

/**
 * 把一个已加载的 .rj zip 解析、装配成标准 sb3 projectJSON。
 * @param {JSZip} zip 已 JSZip.loadAsync 的 .rj 容器
 * @param {object} [options] 选项
 * @param {Function} [options.onProgress] 进度回调 ({stage, ...})
 * @param {number} [options.concurrency] 分片读取并发上限
 * @returns {Promise<object>} {projectJSON, assetNames, manifest, tables, title}
 */
export const assembleFromZip = async (zip, options = {}) => {
    const {onProgress} = options;
    const concurrency = options.concurrency || 16;
    const report = (stage, payload) => {
        if (typeof onProgress === 'function') {
            onProgress(Object.assign({stage}, payload));
        }
    };

    // ---------------------------------------------------------------
    // 阶段 0：容器清单
    // ---------------------------------------------------------------
    const manifest = await readJSON(zip, MANIFEST_FILE);
    if (!manifest || manifest.magic !== RJ_MAGIC || manifest.format !== RJ_FORMAT_ID) {
        throw new Error('这不是一个有效的 .rj 作品文件');
    }
    report(RJ_LOAD_STAGES.MANIFEST, {manifest});

    // ---------------------------------------------------------------
    // 阶段 1：角色名称表
    // ---------------------------------------------------------------
    const targetTable = await readJSON(zip, TARGETS_TABLE);
    const targetCount = targetTable && typeof targetTable.count === 'number' ?
        targetTable.count :
        (manifest.targetCount || ((manifest.files && manifest.files.targets) || []).length);
    report(RJ_LOAD_STAGES.TARGETS, {
        targetCount,
        targetTable,
        names: (targetTable.items || []).map(item => item.name)
    });

    // ---------------------------------------------------------------
    // 阶段 2：造型 / 背景名称表
    // ---------------------------------------------------------------
    const costumeTable = await readJSON(zip, COSTUMES_TABLE);
    report(RJ_LOAD_STAGES.COSTUMES, {
        costumeCount: costumeTable ? costumeTable.count : 0,
        backdropCount: costumeTable ? costumeTable.backdropCount : 0,
        costumeTable
    });

    // ---------------------------------------------------------------
    // 阶段 3：声音 / 变量 / 列表 / 监视器名称表
    // ---------------------------------------------------------------
    const [soundTable, variableTable, monitorTable] = await Promise.all([
        readJSON(zip, SOUNDS_TABLE, true),
        readJSON(zip, VARIABLES_TABLE, true),
        readJSON(zip, MONITORS_TABLE, true)
    ]);
    report(RJ_LOAD_STAGES.SOUNDS_AND_VARIABLES, {
        soundCount: soundTable ? soundTable.count : 0,
        variableCount: variableTable ? variableTable.variableCount : 0,
        listCount: variableTable ? variableTable.listCount : 0,
        soundTable,
        variableTable,
        monitorTable
    });

    const indices = [];
    for (let i = 0; i < targetCount; i++) {
        indices.push(i);
    }

    // ---------------------------------------------------------------
    // 阶段 4 + 6：并行读取全部 json 分片（角色数据 + 积木 + 二次加载缓存）
    // ---------------------------------------------------------------
    const jsonTasks = [];
    for (let i = 0; i < indices.length; i++) {
        jsonTasks.push({path: targetFile(i), kind: 'json', ref: {type: 'target', index: i}});
        jsonTasks.push({path: blockFile(i), kind: 'json', ref: {type: 'block', index: i}});
        // 二次加载加速缓存（已展开积木表）：命中则跳过 deserializeBlocks + 逐积木 createBlock
        jsonTasks.push({path: prebuiltBlockFile(i), kind: 'json', ref: {type: 'prebuilt', index: i}});
    }
    const jsonResults = await readAll(zip, jsonTasks, concurrency);

    const targetData = new Map();
    const blockData = new Map();
    const prebuiltData = new Map();
    for (let i = 0; i < jsonResults.length; i++) {
        const item = jsonResults[i];
        if (!item || !item.value) continue;
        if (item.ref.type === 'target') {
            targetData.set(item.ref.index, item.value);
        } else if (item.ref.type === 'block') {
            blockData.set(item.ref.index, item.value);
        } else {
            // prebuilt：仅当版本匹配时才采纳，否则回退到标准积木路径
            const value = item.value;
            if (value && value.version === RJ_FASTLOAD_VERSION && value.blocks) {
                prebuiltData.set(item.ref.index, value);
            }
        }
    }

    report(RJ_LOAD_STAGES.COSTUME_ASSETS, {
        loadedTargets: targetData.size,
        loadedCostumes: (costumeTable && costumeTable.items) ? costumeTable.items.length : 0,
        costumeTotal: (costumeTable && costumeTable.items) ? costumeTable.items.length : 0
    });
    report(RJ_LOAD_STAGES.SOUND_ASSETS, {
        loadedSounds: (soundTable && soundTable.items) ? soundTable.items.length : 0,
        soundTotal: (soundTable && soundTable.items) ? soundTable.items.length : 0,
        variableTable
    });
    report(RJ_LOAD_STAGES.BLOCKS, {
        loadedBlockFiles: blockData.size,
        blockCount: manifest.blockCount || 0
    });

    // ---------------------------------------------------------------
    // 组装：把所有分片还原成标准 sb3 的 project.json
    // ---------------------------------------------------------------
    const targets = indices.map(index => {
        const fileValue = targetData.get(index);
        const target = fileValue && fileValue.target ?
            {...fileValue.target} :
            {isStage: index === 0, name: `target${index}`};
        const blockEntry = blockData.get(index);
        target.blocks = blockEntry && blockEntry.blocks ? blockEntry.blocks : {};
        target.comments = blockEntry && blockEntry.comments ? blockEntry.comments : {};
        // 二次加载加速缓存：若本角色存在版本匹配的已展开积木表，直接交给
        // scratch-vm 的快速路径（跳过 deserializeBlocks + 逐积木 createBlock）。
        // 标准压缩积木（target.blocks）仍保留，缓存失效时 scratch-vm 会自动回退。
        const prebuilt = prebuiltData.get(index);
        if (prebuilt) {
            target.__prebuiltBlocks = prebuilt.blocks;
        }
        return target;
    });

    const monitors = (monitorTable && monitorTable.items) || manifest.monitors || [];

    const projectJSON = Object.assign({}, manifest.project || {}, {
        targets,
        monitors
    });
    // scratch-parser 在校验时会补上这个字段；这里直接走 deserializeProject，
    // 因此手动补上以保持一致。
    if (!projectJSON.projectVersion) projectJSON.projectVersion = 3;

    report(RJ_LOAD_STAGES.FINISHED, {
        targetCount: targets.length,
        projectJSON
    });

    // ---------------------------------------------------------------
    // 资源裸名列表（供主线程侧构造异步资源视图时使用）
    // ---------------------------------------------------------------
    const assetNames = [];
    const names = Object.keys(zip.files);
    for (let i = 0; i < names.length; i++) {
        const fullName = names[i];
        const entry = zip.files[fullName];
        if (entry.dir || fullName.indexOf(ASSET_PREFIX) !== 0) continue;
        assetNames.push(fullName.substring(ASSET_PREFIX.length));
    }

    return {
        projectJSON,
        assetNames,
        manifest,
        tables: {
            targets: targetTable,
            costumes: costumeTable,
            sounds: soundTable,
            variables: variableTable,
            monitors: monitorTable
        },
        title: manifest.title || null
    };
};

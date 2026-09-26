import JSZip from '@turbowarp/jszip';

import {
    RJ_MAGIC,
    RJ_FORMAT_ID,
    MANIFEST_FILE,
    TARGETS_TABLE,
    COSTUMES_TABLE,
    SOUNDS_TABLE,
    VARIABLES_TABLE,
    MONITORS_TABLE,
    RJ_LOAD_STAGES,
    targetFile,
    blockFile
} from './constants.js';

const PROJECT_JSON = 'project.json';
const ASSET_PREFIX = 'assets/';

/**
 * 同时解压的文件数量上限。一次性 Promise.all 上百个大资源会把上百 MB
 * 同时压进内存，导致 GC 抖动甚至崩溃；分批读取可以把峰值内存压下来。
 */
const DEFAULT_CONCURRENCY = 8;

/**
 * 让出主线程，让浏览器有机会绘制进度（大作品解析时不会「假死」）
 * @returns {Promise<void>} 下一个事件循环后 resolve
 */
const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * 受限并发的 map：分批执行，每批之间让出主线程。
 * @param {Array} items 输入
 * @param {number} limit 每批数量
 * @param {Function} mapper (item, index) => Promise
 * @returns {Promise<Array>} 与输入一一对应的结果
 */
const mapLimit = async (items, limit, mapper) => {
    const results = new Array(items.length);
    const size = limit > 0 ? limit : items.length;
    for (let start = 0; start < items.length; start += size) {
        const end = Math.min(start + size, items.length);
        const batch = [];
        for (let i = start; i < end; i++) {
            batch.push(Promise.resolve()
                .then(() => mapper(items[i], i))
                .then(value => {
                    results[i] = value;
                }));
        }
        if (end < items.length) {
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(batch);
            // eslint-disable-next-line no-await-in-loop
            await yieldToUI();
        } else {
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(batch);
        }
    }
    return results;
};

const readJSON = async (zip, path, optional) => {
    const entry = zip.file(path);
    if (!entry) {
        if (optional) return null;
        throw new Error(`.rj 文件缺少 ${path}`);
    }
    const text = await entry.async('string');
    return JSON.parse(text);
};

const readBinary = (zip, path) => {
    const entry = zip.file(path);
    if (!entry) return Promise.resolve(null);
    return entry.async('uint8array');
};

/**
 * 并行读取一批 zip 内的文件，单个文件失败不会中断其它读取
 * @param {JSZip} zip zip 对象
 * @param {Array<object>} tasks [{path, kind, ref}]
 * @param {number} concurrency 并发上限
 * @returns {Promise<Array<object>>} 与 tasks 一一对应的 [{path, value, ref}]
 */
const readAll = (zip, tasks, concurrency) => mapLimit(tasks, concurrency || DEFAULT_CONCURRENCY, task => {
    const reader = task.kind === 'json' ? readJSON : readBinary;
    return reader(zip, task.path, true)
        .then(value => ({path: task.path, value, ref: task.ref}))
        .catch(() => ({path: task.path, value: null, ref: task.ref}));
});

/**
 * 一次性建立「资源名 → zip 条目」的索引。
 *
 * 关键点：JSZip 的 zip.file(regex) 每次调用都会线性扫描全部条目。
 * 上百 MB 的作品通常有几百上千个资源，scratch-vm 每个资源都会做一次
 * 「精确查找 + 正则兜底」，于是退化成 O(n²)。这里只扫描一次，之后全部
 * 走 Map 的 O(1) 查找。
 *
 * @param {JSZip} zip 已加载的 .rj zip
 * @returns {{byName: Map<string, object>, all: Array<object>}} 资源索引
 */
const buildAssetIndex = zip => {
    const byName = new Map();
    const all = [];
    const names = Object.keys(zip.files);
    for (let i = 0; i < names.length; i++) {
        const fullName = names[i];
        const entry = zip.files[fullName];
        // 只索引 assets/ 下的条目：scratch-vm 只会向 zip 索要资源文件
        if (entry.dir || fullName.indexOf(ASSET_PREFIX) !== 0) continue;
        const bare = fullName.substring(ASSET_PREFIX.length);
        if (!byName.has(bare)) byName.set(bare, entry);
        if (!byName.has(fullName)) byName.set(fullName, entry);
        all.push({name: fullName, bare, entry});
    }
    return {byName, all};
};

/**
 * 构造一个「长得像 JSZip」的资源视图，直接喂给 scratch-vm。
 *
 * 这样 scratch-vm 直接从 .rj 的 assets/ 里按需解压资源，
 * 省掉了原来那次「全部解压 → 重新 DEFLATE 打包成 sb3 → 再全部解压」的
 * 三趟全量数据搬运，这也是大作品加载慢的最主要原因。
 *
 * @param {object} index buildAssetIndex 的结果
 * @returns {object} 具备 file(nameOrRegex) 的 JSZip 兼容视图
 */
const createAssetZipView = index => ({
    file (nameOrRegex) {
        if (typeof nameOrRegex === 'string') {
            return index.byName.get(nameOrRegex) || null;
        }
        if (nameOrRegex instanceof RegExp) {
            const matches = [];
            for (let i = 0; i < index.all.length; i++) {
                // scratch-vm 用的正则是 ^([^/]*/)?<文件名>$ ，对完整路径同样成立
                if (nameOrRegex.test(index.all[i].name)) {
                    matches.push(index.all[i].entry);
                }
            }
            return matches;
        }
        return null;
    }
});

/**
 * 读取并加载 .rj 作品文件。
 *
 * 完整加载流程（与 .rj 的分片结构一一对应）：
 *   1. 读取角色名称表与角色数量        → 渲染角色框
 *   2. 读取造型 / 背景名称表            → 渲染造型框 / 背景框
 *   3. 读取声音名称表、变量与列表名称表 → 渲染声音、变量、列表
 *   4. 读取造型表，并行加载多个角色中的多个造型
 *   5. 读取声音表与变量 / 列表表，并行载入声音与变量等
 *   6. 并行载入积木，并渲染
 *
 * 装配阶段只做「拼接」，不再重新压缩：返回 projectJSON + 一个按需解压的
 * 资源视图，交给 vm.deserializeProject 直接加载，因此数据模型与 sb3 完全
 * 一致，同时避免了整包重新 DEFLATE 的开销。
 *
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @param {object} options 选项
 * @param {Function} [options.onProgress] 进度回调 ({stage, ...})
 * @param {number} [options.concurrency] 并发上限
 * @returns {Promise<object>} {projectJSON, zipView, getArrayBuffer, manifest, tables, title}
 */
export const loadRJProject = async (input, options = {}) => {
    const {onProgress} = options;
    const concurrency = options.concurrency || DEFAULT_CONCURRENCY;
    const report = (stage, payload) => {
        if (typeof onProgress === 'function') {
            onProgress(Object.assign({stage}, payload));
        }
    };

    const zip = await JSZip.loadAsync(input);

    // ---------------------------------------------------------------
    // 阶段 0：容器清单
    // ---------------------------------------------------------------
    const manifest = await readJSON(zip, MANIFEST_FILE);
    if (!manifest || manifest.magic !== RJ_MAGIC || manifest.format !== RJ_FORMAT_ID) {
        throw new Error('这不是一个有效的 .rj 作品文件');
    }
    report(RJ_LOAD_STAGES.MANIFEST, {manifest});

    // ---------------------------------------------------------------
    // 阶段 1：读取角色名称表与角色数量 → 渲染角色框
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
    // 阶段 2：读取造型与背景名称表 → 渲染造型框 / 背景框
    // ---------------------------------------------------------------
    const costumeTable = await readJSON(zip, COSTUMES_TABLE);
    report(RJ_LOAD_STAGES.COSTUMES, {
        costumeCount: costumeTable ? costumeTable.count : 0,
        backdropCount: costumeTable ? costumeTable.backdropCount : 0,
        costumeTable
    });

    // ---------------------------------------------------------------
    // 阶段 3：读取声音名称表与变量 / 列表名称表 → 渲染声音、变量、列表
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
    // 阶段 4 + 6：并行读取全部 json 分片（角色数据 + 积木）
    // 角色数据与积木互不依赖，一起并行读取可以少等一轮。
    // ---------------------------------------------------------------
    const jsonTasks = [];
    for (let i = 0; i < indices.length; i++) {
        jsonTasks.push({path: targetFile(i), kind: 'json', ref: {type: 'target', index: i}});
        jsonTasks.push({path: blockFile(i), kind: 'json', ref: {type: 'block', index: i}});
    }
    const jsonResults = await readAll(zip, jsonTasks, concurrency);

    const targetData = new Map();
    const blockData = new Map();
    for (let i = 0; i < jsonResults.length; i++) {
        const item = jsonResults[i];
        if (!item || !item.value) continue;
        if (item.ref.type === 'target') {
            targetData.set(item.ref.index, item.value);
        } else {
            blockData.set(item.ref.index, item.value);
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
    // 资源索引：只建索引，不解压（解压交给 scratch-vm 按需进行）
    // ---------------------------------------------------------------
    const assetIndex = buildAssetIndex(zip);
    const zipView = createAssetZipView(assetIndex);

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

    /** 兜底用：按需生成一份标准 sb3 的 ArrayBuffer（会重新压缩，较慢） */
    let cachedArrayBuffer = null;
    const getArrayBuffer = async () => {
        if (cachedArrayBuffer) return cachedArrayBuffer;
        const sb3Zip = new JSZip();
        /* eslint-disable require-atomic-updates */
        sb3Zip.file(PROJECT_JSON, JSON.stringify(projectJSON));
        for (let i = 0; i < assetIndex.all.length; i++) {
            const item = assetIndex.all[i];
            const data = await item.entry.async('uint8array');
            if (data) sb3Zip.file(item.bare, data);
        }
        const buffer = await sb3Zip.generateAsync({
            type: 'arraybuffer',
            mimeType: 'application/x.scratch.sb3',
            compression: 'DEFLATE'
        });
        cachedArrayBuffer = buffer;
        return buffer;
        /* eslint-enable require-atomic-updates */
    };

    return {
        projectJSON,
        zipView,
        getArrayBuffer,
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

/**
 * 把作品 meta.platform.name 对齐到运行时自身的平台名（忽略大小写）。
 *
 * scratch-vm 的 checkPlatformCompatibility 是**大小写敏感**的字符串比较，
 * 只要名字对不上就会 emit PLATFORM_MISMATCH 并**阻塞等待用户确认**。
 * 而「未知平台」弹窗的 z-index(8000) 低于加载遮罩(9500)，被完全盖住，
 * 用户既看不见也点不到 —— 表现就是进度条停住、作品永远载入不完。
 * 这里把仅大小写不同的同名平台归一成运行时的写法，从根上避免这个死锁。
 *
 * @param {object} projectJSON 组装好的 project.json
 * @param {object} vm scratch-vm 实例
 * @returns {void}
 */
const normalizePlatformName = (projectJSON, vm) => {
    const runtimePlatform = vm && vm.runtime && vm.runtime.platform;
    if (!runtimePlatform || typeof runtimePlatform.name !== 'string') return;
    const meta = projectJSON && projectJSON.meta;
    const platform = meta && meta.platform;
    if (!platform || typeof platform.name !== 'string') return;
    if (platform.name === runtimePlatform.name) return;
    if (platform.name.toLowerCase() !== runtimePlatform.name.toLowerCase()) return;
    meta.platform = Object.assign({}, platform, {name: runtimePlatform.name});
};

/**
 * 把 .rj 作品直接装进 VM（快速路径）。
 *
 * 走 vm.deserializeProject(projectJSON, zipView)，资源由 scratch-vm 从
 * .rj 里按需解压，省掉「重新打包 sb3」这一整趟压缩 + 解压。
 * 万一快速路径失败，自动回退到标准 sb3 流程（vm.loadProject）。
 *
 * @param {object} vm scratch-vm 实例
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @param {object} options 同 loadRJProject
 * @returns {Promise<object>} loadRJProject 的结果
 */
export const loadRJIntoVM = async (vm, input, options = {}) => {
    if (!vm) {
        throw new Error('loadRJIntoVM: 缺少 VM 实例');
    }
    const result = await loadRJProject(input, options);
    normalizePlatformName(result.projectJSON, vm);

    if (typeof vm.deserializeProject === 'function') {
        try {
            // 所有 json 分片已读完，接下来把角色 / 积木写进编辑器（大作品最慢的一段），
            // 先上报一个阶段让它可见，之后由 VM 的素材进度接管 80% → 96%。
            if (typeof options.onProgress === 'function') {
                options.onProgress({stage: RJ_LOAD_STAGES.WRITING_TO_EDITOR});
            }
            await vm.deserializeProject(result.projectJSON, result.zipView);
            if (vm.runtime && typeof vm.runtime.handleProjectLoaded === 'function') {
                vm.runtime.handleProjectLoaded();
            }
            return result;
        } catch (error) {
            // 快速路径失败 → 回退到带校验的标准 sb3 流程
            // eslint-disable-next-line no-console
            console.warn('[rj] 快速加载失败，回退到标准 sb3 流程：', error);
        }
    }

    const arrayBuffer = await result.getArrayBuffer();
    await vm.loadProject(arrayBuffer);
    return result;
};

/**
 * 判断一段 zip 内容是否看起来像 .rj 作品文件
 * @param {ArrayBuffer|Uint8Array|Blob} input 文件内容
 * @returns {Promise<boolean>} 是否是 .rj
 */
export const isRJContent = async input => {
    try {
        const zip = await JSZip.loadAsync(input);
        const entry = zip.file(MANIFEST_FILE);
        if (!entry) return false;
        const manifest = JSON.parse(await entry.async('string'));
        return Boolean(manifest && manifest.magic === RJ_MAGIC && manifest.format === RJ_FORMAT_ID);
    } catch (e) {
        return false;
    }
};

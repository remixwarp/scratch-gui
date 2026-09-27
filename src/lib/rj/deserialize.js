import JSZip from '@turbowarp/jszip';

import {
    RJ_MAGIC,
    RJ_FORMAT_ID,
    MANIFEST_FILE,
    RJ_LOAD_STAGES
} from './constants.js';
import {assembleFromZip} from './rj-assemble.js';
import {yieldToUI, normalizePlatformName} from './rj-shared.js';
import {loadRJIntoVMViaWorker} from './rj-worker-client.js';
import {setCurrentRJ, clearCurrentRJ} from './rj-store.js';

const PROJECT_JSON = 'project.json';
const ASSET_PREFIX = 'assets/';

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
 * 读取并加载 .rj 作品文件（主线程回退路径）。
 *
 * 装配阶段只做「拼接」，不再重新压缩：返回 projectJSON + 一个按需解压的
 * 资源视图，交给 vm.deserializeProject 直接加载，因此数据模型与 sb3 完全
 * 一致，同时避免了整包重新 DEFLATE 的开销。
 *
 * 本函数把「读分片 + 装配 projectJSON」委托给 rj-assemble.js（与 Worker
 * 路径共用同一套逻辑），自身只负责基于真实 zip 构造资源视图与 sb3 兜底。
 *
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @param {object} options 选项
 * @param {Function} [options.onProgress] 进度回调 ({stage, ...})
 * @param {number} [options.concurrency] 并发上限
 * @returns {Promise<object>} {projectJSON, zipView, getArrayBuffer, manifest, tables, title}
 */
export const loadRJProject = async (input, options = {}) => {
    const zip = await JSZip.loadAsync(input);
    const assembled = await assembleFromZip(zip, options);

    // ---------------------------------------------------------------
    // 资源索引：只建索引，不解压（解压交给 scratch-vm 按需进行）
    // ---------------------------------------------------------------
    const assetIndex = buildAssetIndex(zip);
    const zipView = createAssetZipView(assetIndex);

    /** 兜底用：按需生成一份标准 sb3 的 ArrayBuffer（会重新压缩，较慢） */
    let cachedArrayBuffer = null;
    const getArrayBuffer = async () => {
        if (cachedArrayBuffer) return cachedArrayBuffer;
        const sb3Zip = new JSZip();
        /* eslint-disable require-atomic-updates */
        sb3Zip.file(PROJECT_JSON, JSON.stringify(assembled.projectJSON));
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
        projectJSON: assembled.projectJSON,
        zipView,
        getArrayBuffer,
        manifest: assembled.manifest,
        tables: assembled.tables,
        title: assembled.title
    };
};

/**
 * 主线程加载路径（Worker 失败时的回退）。
 * @param {object} vm scratch-vm 实例
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @param {object} options 选项
 * @returns {Promise<object>} 结果对象
 */
const loadRJIntoVMMainThread = async (vm, input, options = {}) => {
    const result = await loadRJProject(input, options);
    normalizePlatformName(result.projectJSON, vm);

    if (typeof vm.deserializeProject === 'function') {
        try {
            // 所有 json 分片已读完，接下来把角色 / 积木写进编辑器（大作品最慢的一段），
            // 先上报一个阶段让它可见，之后由 VM 的素材进度接管 80% → 96%。
            if (typeof options.onProgress === 'function') {
                options.onProgress({stage: RJ_LOAD_STAGES.WRITING_TO_EDITOR});
            }
            // 先让「正在写入编辑器」这一步的进度条画到屏幕上，再进入同步反序列化。
            // vm.deserializeProject 是同步且极重的（超大作品可能卡住主线程数秒），
            // 如果不先让浏览器绘制，用户只会看到进度停在 80% 然后整页失去响应，
            // 看起来就像「卡死」。这里连续让出两次事件循环：一次给 React 提交更新，
            // 一次给浏览器真正绘制。
            await yieldToUI();
            await yieldToUI();
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
 * 把 .rj 作品直接装进 VM。
 *
 * 优先走 **Web Worker 并行反序列化快速路径**（zip 解包 / 分片解析 / 资源解压
 * 全部在子线程完成，主线程不卡顿）；任何环节失败都会自动回退到下面的主线程
 * 加载路径，因此 Worker 不可用也绝不影响正常打开作品。
 *
 * @param {object} vm scratch-vm 实例
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @param {object} options 同 loadRJProject
 * @returns {Promise<object>} 结果对象
 */
export const loadRJIntoVM = async (vm, input, options = {}) => {
    if (!vm) {
        throw new Error('loadRJIntoVM: 缺少 VM 实例');
    }
    // 记录当前打开的 .rj 原始内容（「超级重构」等面板用它直接展示分片结构，
    // 而不是把 VM 重新序列化成 sb3 视图）。加载彻底失败时清除。
    setCurrentRJ(input);
    try {
        return await loadRJIntoVMViaWorker(vm, input, options);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[rj] Worker 并行反序列化失败，回退到主线程加载：', err);
    }
    try {
        return await loadRJIntoVMMainThread(vm, input, options);
    } catch (err) {
        clearCurrentRJ();
        throw err;
    }
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

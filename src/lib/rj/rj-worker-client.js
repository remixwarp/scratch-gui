/**
 * @fileoverview
 * 主线程侧的 .rj Worker 客户端。
 *
 * 负责：
 *   - 创建并驱动 rj-deserialize.worker.js
 *   - 把 worker 解包 / 装配得到的 projectJSON 交给 vm.deserializeProject
 *   - 用一个「长得像 JSZip」的异步资源视图替换真实的 zip：scratch-vm 想要的
 *     每个资源文件，都通过 postMessage 让 worker 在子线程里解压后回传，主线程
 *     只做零拷贝的转发，彻底避免大作品加载时主线程被 DEFLATE 解压拖垮。
 *
 * 任何一步失败都会 reject，由上层 loadRJIntoVM / loadRJIntoVMProgressive 自动
 * 回退到主线程加载路径，因此即便 Worker 不可用（极老浏览器 / 构建异常）也不会
 * 影响正常打开作品。
 */

// eslint-disable-next-line import/default
import RJDeserializeWorker from 'worker-loader!./rj-deserialize.worker.js';
import JSZip from '@turbowarp/jszip';
import {RJ_LOAD_STAGES} from './constants.js';
import {normalizePlatformName} from './rj-shared.js';

// 当前存活的 .rj Worker。延迟加载（切造型 / 播声音）需要的资源由它在子线程
// 按需解压；旧 Worker 在「下一次加载 .rj」时被终止（见 decodeRJViaWorker）。
let activeWorker = null;

/**
 * 建立一次 .rj Worker 会话：把文件交给子线程解码，解析后返回
 * {projectJSON, zipView, manifest, tables, title}。Worker 在解码成功后**继续存活**
 * （作为 activeWorker），以便编辑过程中按需在子线程解压资源。任何失败都会
 * terminate 该 Worker 并 reject。
 *
 * @param {object} vm scratch-vm 实例（仅用于对齐平台名）
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @param {object} [options] {concurrency, onProgress}
 * @returns {Promise<object>} 解码结果
 */
const createRJWorkerSession = (vm, input, options = {}) => new Promise((resolve, reject) => {
    let worker;
    try {
        worker = new RJDeserializeWorker();
    } catch (e) {
        reject(e);
        return;
    }

    // 终止上一个项目的 Worker：延迟资源请求只服务于当前已显示的项目，
    // 旧项目被替换后即可释放其子线程内存。
    if (activeWorker && activeWorker !== worker) {
        try {
            activeWorker.terminate();
        } catch (e) {
            // 忽略终止异常
        }
    }
    activeWorker = worker;

    const inflight = new Map(); // name -> {resolve, reject, promise}
    const assetNameSet = new Set();
    const assetBareNames = [];
    let terminated = false;

    // 主线程 zip 回退源：Worker 退出后（或被终止后），延迟加载（切造型 / 播声音）
    // 需要的资源改由主线程按需解压单个条目，避免请求永远挂起。
    let mainThreadZip = null;
    let mainThreadZipPromise = null;
    const getMainThreadZip = () => {
        if (mainThreadZipPromise) return mainThreadZipPromise;
        mainThreadZipPromise = JSZip.loadAsync(input)
            .then(z => {
                mainThreadZip = z;
                return z;
            })
            .catch(() => null);
        return mainThreadZipPromise;
    };

    const requestAsset = name => {
        if (inflight.has(name)) return inflight.get(name).promise;
        let resolveAsset;
        let rejectAsset;
        const promise = new Promise((res, rej) => {
            resolveAsset = res;
            rejectAsset = rej;
        });
        inflight.set(name, {resolve: resolveAsset, reject: rejectAsset, promise});
        worker.postMessage({type: 'getAsset', name});
        return promise;
    };

    const file = nameOrRegex => {
        // Worker 仍可用且资源已知：走 Worker 子线程解压（首屏当前造型由此加载）。
        if (typeof nameOrRegex === 'string') {
            if (assetNameSet.has(nameOrRegex)) {
                return {async: () => requestAsset(nameOrRegex)};
            }
            // 也兼容 scratch-vm 偶尔用全路径查询的情况
            if (assetNameSet.has(`assets/${nameOrRegex}`)) {
                return {async: () => requestAsset(`assets/${nameOrRegex}`)};
            }
        } else if (nameOrRegex instanceof RegExp) {
            const matches = assetBareNames.filter(n => nameOrRegex.test(n));
            if (matches.length) {
                return matches.map(n => ({async: () => requestAsset(n)}));
            }
        }
        // Worker 不可用（已终止 / 资源未知）→ 回退到主线程 zip 按需解压单个条目。
        if (mainThreadZip) {
            return mainThreadZip.file(nameOrRegex);
        }
        // 主线程 zip 尚未就绪：返回异步占位，待 zip 就绪后解析。
        return {
            async: async type => {
                const z = await getMainThreadZip();
                if (!z) return null;
                const entry = z.file(nameOrRegex);
                return entry ? entry.async(type) : null;
            }
        };
    };

    const cleanup = () => {
        if (!terminated) {
            terminated = true;
            try {
                worker.terminate();
            } catch (e) {
                // 忽略终止异常
            }
        }
    };

    worker.onmessage = event => {
        const msg = event.data || {};
        if (msg.type === 'progress') {
            if (typeof options.onProgress === 'function') {
                options.onProgress({stage: msg.stage, ...msg.payload});
            }
            return;
        }
        if (msg.type === 'asset') {
            const rec = inflight.get(msg.name);
            if (rec) {
                inflight.delete(msg.name);
                rec.resolve(msg.data || null);
            }
            return;
        }
        if (msg.type === 'error') {
            cleanup();
            reject(new Error(msg.message || 'rj worker error'));
            return;
        }
        if (msg.type === 'decoded') {
            assetBareNames.push(...(msg.assetNames || []));
            (msg.assetNames || []).forEach(n => assetNameSet.add(n));

            const zipView = {file};
            normalizePlatformName(msg.projectJSON, vm);
            // 仅解码：把 projectJSON + 子线程资源视图交回调用方（如渐进式加载器），
            // 由调用方决定如何安装。Worker 继续存活，服务后续的延迟资源请求。
            resolve({
                projectJSON: msg.projectJSON,
                zipView,
                manifest: msg.manifest,
                tables: msg.tables,
                title: msg.title
            });
            return;
        }
    };

    worker.onerror = err => {
        cleanup();
        reject(err instanceof Error ? err : new Error(String((err && err.message) || err)));
    };

    // 把输入交给 worker。为避免主线程对大文件做结构化克隆卡顿，传一份拷贝并转移其
    // 所有权；原始 input 保留用于失败回退。
    let payload = input;
    let transfer = null;
    if (!(input instanceof Blob)) {
        try {
            const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
            const copy = bytes.slice();
            payload = copy;
            transfer = [copy.buffer];
        } catch (e) {
            payload = input;
            transfer = null;
        }
    }
    worker.postMessage({type: 'decode', input: payload, options: {concurrency: options.concurrency}}, transfer || []);
});

/**
 * 仅解码 .rj（zip 解包 + 分片解析 + 资源索引全在子线程完成），返回
 * projectJSON 与一个由 Worker 支撑的「异步资源视图」。Worker 在成功后继续存活，
 * 用于编辑过程中按需解压资源（切造型 / 播声音）。调用方拿到结果后自行决定如何
 * 把作品装进 VM（例如渐进式逐角色安装）。失败则 reject（由上层回退主线程）。
 *
 * @param {object} vm scratch-vm 实例
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @param {object} [options] {concurrency, onProgress}
 * @returns {Promise<object>} {projectJSON, zipView, manifest, tables, title}
 */
export const decodeRJViaWorker = (vm, input, options = {}) => createRJWorkerSession(vm, input, options);

/**
 * 通过 Worker 把 .rj 作品装进 VM（并行反序列化快速路径，monolithic 安装）。
 * @param {object} vm scratch-vm 实例
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @param {object} [options] 同 loadRJProject（onProgress / concurrency）
 * @returns {Promise<object>} {projectJSON, manifest, tables, title}
 */
export const loadRJIntoVMViaWorker = (vm, input, options = {}) => createRJWorkerSession(vm, input, options)
    .then(({projectJSON, zipView, manifest, tables, title}) => {
        const run = async () => {
            if (typeof options.onProgress === 'function') {
                options.onProgress({stage: RJ_LOAD_STAGES.WRITING_TO_EDITOR});
            }
            // 连续让出两次事件循环，确保「正在写入编辑器」的进度先绘制出来，
            // 再进入同步反序列化，避免主线程看起来像卡死。
            await new Promise(yieldDone => setTimeout(yieldDone, 0));
            await new Promise(yieldDone => setTimeout(yieldDone, 0));

            await vm.deserializeProject(projectJSON, zipView);
            if (vm.runtime && typeof vm.runtime.handleProjectLoaded === 'function') {
                vm.runtime.handleProjectLoaded();
            }
        };
        return run()
            .then(() => ({projectJSON, manifest, tables, title}))
            .catch(err => {
                // 解码成功但安装失败：终止 Worker 并由上层回退主线程。
                if (activeWorker && typeof activeWorker.terminate === 'function') {
                    activeWorker.terminate();
                }
                throw err;
            });
    });

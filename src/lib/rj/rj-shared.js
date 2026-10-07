/**
 * @fileoverview
 * .rj 加载流程中与 DOM / VM 无关的「纯数据」辅助函数。
 * 这些函数既不依赖浏览器 DOM，也不依赖 scratch-vm 实例，因此既能在主线程
 * 使用，也能安全地被打进 Web Worker 包里（worker 内做并行反序列化时复用）。
 */

/**
 * 同时解压 / 读取的文件数量上限。一次性 Promise.all 上百个大资源会把上百 MB
 * 同时压进内存，导致 GC 抖动甚至崩溃；分批读取可以把峰值内存压下来。
 * 渐进式加载器会按 CPU 核数显式传入更高的并发（见 rj-lazy-loader.js），
 * 这里的默认值只在未显式指定时（如回退路径）生效。
 */
export const DEFAULT_CONCURRENCY = 16;

/**
 * 让出主线程，让浏览器有机会绘制进度（大作品解析时不会「假死」）
 * @returns {Promise<void>} 下一个事件循环后 resolve
 */
export const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * 受限并发的 map：分批执行，每批之间让出主线程。
 * @param {Array} items 输入
 * @param {number} limit 每批数量
 * @param {Function} mapper (item, index) => Promise
 * @returns {Promise<Array>} 与输入一一对应的结果
 */
export const mapLimit = async (items, limit, mapper) => {
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

export const readJSON = async (zip, path, optional) => {
    const entry = zip.file(path);
    if (!entry) {
        if (optional) return null;
        throw new Error(`.rj 文件缺少 ${path}`);
    }
    const text = await entry.async('string');
    return JSON.parse(text);
};

export const readBinary = (zip, path) => {
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
export const readAll = (zip, tasks, concurrency) => mapLimit(tasks, concurrency || DEFAULT_CONCURRENCY, task => {
    const reader = task.kind === 'json' ? readJSON : readBinary;
    return reader(zip, task.path, true)
        .then(value => ({path: task.path, value, ref: task.ref}))
        .catch(() => ({path: task.path, value: null, ref: task.ref}));
});

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
export const normalizePlatformName = (projectJSON, vm) => {
    const runtimePlatform = vm && vm.runtime && vm.runtime.platform;
    if (!runtimePlatform || typeof runtimePlatform.name !== 'string') return;
    const meta = projectJSON && projectJSON.meta;
    const platform = meta && meta.platform;
    if (!platform || typeof platform.name !== 'string') return;
    if (platform.name === runtimePlatform.name) return;
    if (platform.name.toLowerCase() !== runtimePlatform.name.toLowerCase()) return;
    meta.platform = Object.assign({}, platform, {name: runtimePlatform.name});
};

/**
 * @fileoverview
 * 保存「当前打开的 .rj 原始内容」。
 *
 * .rj 装进 VM 后，内存里是反序列化后的运行时对象（等价 sb3 形态），
 * 但我们不想丢失「这是一个 .rj、内部是分片结构」这一事实 —— 例如
 * 「超级重构」面板需要直接展示 .rj 内部真实的分片文件
 * （manifest.json / tables/ / targets/ / blocks/ / assets/），
 * 而不是把 VM 重新序列化成 sb3 视图。
 *
 * 这里用一个极简的模块级存储保存原始字节（以及懒加载的 JSZip 实例），
 * 加载新作品（无论是否 .rj）时由加载方负责更新或清空。
 */

import JSZip from '@turbowarp/jszip';

let currentRJRaw = null;
let currentRJZipPromise = null;

/**
 * 记录当前打开的 .rj 原始内容（ArrayBuffer / Uint8Array / Blob）
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @returns {void}
 */
export const setCurrentRJ = input => {
    currentRJRaw = input || null;
    currentRJZipPromise = null;
};

/**
 * 清空记录（例如打开了 sb3 / sb2 / 新建作品时）
 * @returns {void}
 */
export const clearCurrentRJ = () => {
    currentRJRaw = null;
    currentRJZipPromise = null;
};

/**
 * 当前打开的作品是否为 .rj（且原始内容仍可用）
 * @returns {boolean} 是否有记录
 */
export const hasCurrentRJ = () => !!currentRJRaw;

/**
 * 获取当前 .rj 原始内容
 * @returns {ArrayBuffer|Uint8Array|Blob|null} 原始内容
 */
export const getCurrentRJRaw = () => currentRJRaw;

/**
 * 获取当前 .rj 的 JSZip 实例（懒加载并缓存；同一份内容只解析一次）
 * @returns {Promise<JSZip|null>} zip 实例
 */
export const getCurrentRJZip = () => {
    if (!currentRJRaw) return Promise.resolve(null);
    if (!currentRJZipPromise) {
        currentRJZipPromise = JSZip.loadAsync(currentRJRaw);
    }
    return currentRJZipPromise;
};

/**
 * @fileoverview
 * .rj 反序列化的 Web Worker 实现。
 *
 * 主线程把 .rj 文件的二进制内容（或 Blob）丢进来，worker 在子线程里完成：
 *   1. JSZip.loadAsync —— 解包整个 .rj 容器（DEFLATE 解压 + 目录解析）
 *   2. 并行读取并 JSON.parse 所有分片（清单 / 名称表 / 角色 / 积木 / 二次加载缓存）
 *   3. 装配出标准 sb3 的 projectJSON（含 __prebuiltBlocks）
 *   4. 按需为 scratch-vm 解压单个资源文件（造型 / 声音 / 字体），回传 ArrayBuffer
 *
 * 这样打开大作品时，最重的 CPU 工作全部发生在子线程，主线程只负责把
 * projectJSON 交给 vm.deserializeProject（做廉价的 _blocks 赋值 + 创建角色 /
 * drawable），UI 不会卡死，也能吃满多核。
 *
 * 消息协议：
 *   主 -> worker: {type:'decode', input, options}        // 启动解包 + 装配
 *   主 -> worker: {type:'getAsset', name}                // 请求某个资源文件
 *   worker -> 主: {type:'progress', stage, payload}      // 进度（转发 onProgress）
 *   worker -> 主: {type:'decoded', projectJSON, assetNames, manifest, tables, title}
 *   worker -> 主: {type:'asset', name, data}             // 资源字节（Uint8Array 或 null）
 *   worker -> 主: {type:'error', message}                // 致命错误
 */

import JSZip from '@turbowarp/jszip';
import {assembleFromZip} from './rj-assemble.js';

const ASSET_PREFIX = 'assets/';

// 资源索引：裸名 / 全路径 -> zip 条目，避免在 worker 内反复线性扫描。
let byName = null;

const buildAssetIndex = zip => {
    const map = new Map();
    const names = Object.keys(zip.files);
    for (let i = 0; i < names.length; i++) {
        const fullName = names[i];
        const entry = zip.files[fullName];
        if (entry.dir || fullName.indexOf(ASSET_PREFIX) !== 0) continue;
        const bare = fullName.substring(ASSET_PREFIX.length);
        if (!map.has(bare)) map.set(bare, entry);
        if (!map.has(fullName)) map.set(fullName, entry);
    }
    return map;
};

const resolveAssetEntry = name => {
    if (!byName) return null;
    // scratch-vm 既可能用裸名（abc.png）也可能用全路径（assets/abc.png）来查。
    let entry = byName.get(name);
    if (entry) return entry;
    entry = byName.get(`${ASSET_PREFIX}${name}`);
    if (entry) return entry;
    // 兜底：正则（与 scratch-vm 的 `^([^/]*/)?<name>$` 查询等价）
    try {
        const m = new RegExp(`^([^/]*/)?${name}$`);
        for (let i = 0; i < byName.size; i++) {
            const [key, e] = Array.from(byName.entries())[i];
            if (m.test(key)) return e;
        }
    } catch (e) {
        // 非法正则，忽略
    }
    return null;
};

self.onmessage = async event => {
    const msg = event.data || {};
    if (msg.type === 'decode') {
        try {
            const zip = await JSZip.loadAsync(msg.input);
            const assembled = await assembleFromZip(zip, {
                concurrency: msg.options && msg.options.concurrency,
                onProgress: (stage, payload) => {
                    self.postMessage({type: 'progress', stage, payload});
                }
            });
            byName = buildAssetIndex(zip);
            self.postMessage({
                type: 'decoded',
                projectJSON: assembled.projectJSON,
                assetNames: assembled.assetNames,
                manifest: assembled.manifest,
                tables: assembled.tables,
                title: assembled.title
            });
        } catch (err) {
            self.postMessage({type: 'error', message: String((err && err.message) || err)});
        }
        return;
    }

    if (msg.type === 'getAsset') {
        try {
            const entry = resolveAssetEntry(msg.name);
            if (!entry) {
                self.postMessage({type: 'asset', name: msg.name, data: null});
                return;
            }
            const data = await entry.async('uint8array');
            self.postMessage({type: 'asset', name: msg.name, data});
        } catch (err) {
            self.postMessage({type: 'asset', name: msg.name, data: null});
        }
    }
};

/**
 * @fileoverview
 * .rj 作品的「渐进式（分块增量）加载器」。
 *
 * 与 deserialize.js 里「一次性 deserializeProject」的区别：
 *   - 读取装配阶段：把分片读取并发从 8 提到 24，并一次性并行读取全部 json 分片，
 *     更充分地利用磁盘读取 / CPU（见 Q2：调集全部资源提速）。
 *   - 写入编辑器阶段：不再用 scratch-vm 原生的「一次性把全部角色 addTarget 进
 *     运行时」的同步重活（超大作品会因此阻塞主线程数秒、界面卡死），而是临时把
 *     vm.installTargets 替换为「逐角色 addTarget、每添加一个就让出一次主线程」
 *     的版本再调用信任的 vm.deserializeProject。
 *
 * 这样：
 *   1) 复用了 scratch-vm 信任的反序列化逻辑（prebuilt-blocks 快速路径、monitors、
 *      broadcasts、变量作用域、extensionIDs 等全部保留，不会丢数据）；
 *   2) 角色一个一个出现在编辑器里（占位框 / 成品逐步可见，对应 Q1）；
 *   3) 每批之间让出主线程，浏览器能持续绘制，彻底消除「导入后界面卡死」（Q4）。
 *
 * 该文件是新机制的实现，不改动既有的 deserialize.js / worker 路径；调用方（gui.jsx
 * 、sb-file-uploader-hoc.jsx）可无缝切换到本加载器，并在异常时回退到原 loadRJIntoVM。
 */

import {loadRJProject} from './deserialize.js';
import {normalizePlatformName, yieldToUI} from './rj-shared.js';
import {RJ_LOAD_STAGES} from './constants.js';
import {setCurrentRJ, clearCurrentRJ} from './rj-store.js';

/** 分片读取并发上限：从默认的 8 提到 24，更充分地并行读取磁盘（Q2）。 */
const PROGRESSIVE_CONCURRENCY = 24;

/**
 * 把「标准 installTargets」改写成「逐角色 + 每批让出主线程」的版本。
 * 仅替换了 addTarget 循环里插入的 yield，其余收尾逻辑与原 installTargets 完全一致。
 * @param {object} vm scratch-vm 实例
 * @param {Array} targets 待安装的角色（含舞台）
 * @param {object} extensions 扩展信息 {extensionIDs, extensionURLs}
 * @param {boolean} wholeProject 是否整项目
 * @returns {Promise<void>} 所有角色安装完成
 */
const installTargetsProgressively = async (vm, targets, extensions, wholeProject) => {
    const runtime = vm.runtime;

    // 等异步扩展就绪 + 加载本项目用到的扩展（与原 installTargets 一致）
    await vm.extensionManager.allAsyncExtensionsLoaded();
    await vm._loadExtensions(extensions.extensionIDs, extensions.extensionURLs);

    const filteredTargets = targets.filter(target => !!target);

    const seenSpriteNames = new Set(
        runtime.targets
            .filter(target => target && target.isSprite && target.isSprite())
            .map(target => target.getName())
            .filter(name => name)
    );

    const total = filteredTargets.length;

    // 逐角色添加进运行时，每添加一个让出主线程 —— 这是消除卡死 + 逐步显示的关键。
    for (let i = 0; i < filteredTargets.length; i++) {
        const target = filteredTargets[i];
        runtime.addTarget(target);
        target.updateAllDrawableProperties();

        // 保证角色名唯一（与原 installTargets 一致）
        if (target.isSprite && target.isSprite()) {
            const name = target.getName();
            if (name && seenSpriteNames.has(name)) {
                vm.renameSprite(target.id, name);
            }
            seenSpriteNames.add(target.getName());
        }

        // 上报进度：编辑器里角色一个一个出现，用户看到「一步步导入」
        if (typeof vm._rjProgress === 'function') {
            vm._rjProgress({
                stage: RJ_LOAD_STAGES.WRITING_TO_EDITOR,
                done: i + 1,
                total
            });
        }

        // 让出主线程：浏览器有机会绘制，进度条 / 角色列表持续更新，不再假死。
        await yieldToUI();
    }

    // —— 以下收尾逻辑与原 installTargets 完全一致 ——
    runtime.executableTargets.sort((a, b) => a.layerOrder - b.layerOrder);
    filteredTargets.forEach(target => {
        delete target.layerOrder;
    });

    if (wholeProject && filteredTargets.length > 1) {
        // eslint-disable-next-line require-atomic-updates
        vm.editingTarget = filteredTargets[1];
    } else {
        // eslint-disable-next-line require-atomic-updates
        vm.editingTarget = filteredTargets[0];
    }

    if (wholeProject) {
        runtime.parseProjectOptions();
    }

    vm.emitTargetsUpdate(false /* Don't emit project change */);
    vm.emitWorkspaceUpdate();
    runtime.setEditingTarget(vm.editingTarget);
    if (runtime.ioDevices && runtime.ioDevices.cloud) {
        runtime.ioDevices.cloud.setStage(runtime.getTargetForStage());
    }

    // 首屏已可交互：后台并发补齐其余造型（与原 deserializeProject 一致）
    vm._backgroundPreloadCostumes(filteredTargets);
};

/**
 * 渐进式（分块增量）把 .rj 作品装进 VM。
 *
 * @param {object} vm scratch-vm 实例
 * @param {ArrayBuffer|Uint8Array|Blob} input .rj 文件内容
 * @param {object} options 选项
 * @param {Function} [options.onProgress] 进度回调 ({stage, ...})
 * @param {number} [options.concurrency] 分片读取并发上限（默认 24）
 * @returns {Promise<object>} {projectJSON, zipView}
 */
export const loadRJIntoVMProgressive = async (vm, input, options = {}) => {
    if (!vm) {
        throw new Error('loadRJIntoVMProgressive: 缺少 VM 实例');
    }

    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    const concurrency = options.concurrency || PROGRESSIVE_CONCURRENCY;

    // 记录当前打开的 .rj 原始内容（「超级重构」等面板依赖它）
    setCurrentRJ(input);

    // 1) 高并发并行读分片 + 装配成标准 sb3（保留 prebuilt-blocks 快速路径）
    onProgress({stage: RJ_LOAD_STAGES.MANIFEST});
    const {projectJSON, zipView, getArrayBuffer} = await loadRJProject(input, {
        concurrency,
        onProgress
    });
    normalizePlatformName(projectJSON, vm);

    // 2) 临时把 installTargets 换成「逐角色 + 让出主线程」版本，再调用信任的
    //    deserializeProject（它内部会 clear + sb3.deserialize + 我们的 installTargets）。
    const originalInstall = vm.installTargets;
    vm._rjProgress = onProgress;
    vm.installTargets = (targets, extensions, wholeProject) =>
        installTargetsProgressively(vm, targets, extensions, wholeProject);

    try {
        await vm.deserializeProject(projectJSON, zipView);
        if (vm.runtime && typeof vm.runtime.handleProjectLoaded === 'function') {
            vm.runtime.handleProjectLoaded();
        }
        return {projectJSON, zipView};
    } catch (error) {
        // 渐进路径失败 → 还原 installTargets 并回退到标准 sb3 流程
        // eslint-disable-next-line no-console
        console.warn('[rj] 渐进式加载失败，回退到标准 sb3 流程：', error);
        vm.installTargets = originalInstall;
        clearCurrentRJ();
        const arrayBuffer = await getArrayBuffer();
        await vm.loadProject(arrayBuffer);
        return {projectJSON, zipView};
    } finally {
        // 无论成功失败都还原，避免影响后续的普通加载 / Sprite 上传等流程。
        if (vm.installTargets !== originalInstall) {
            vm.installTargets = originalInstall;
        }
        vm._rjProgress = null;
    }
};

export default loadRJIntoVMProgressive;

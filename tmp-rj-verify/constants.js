/**
 * @fileoverview
 * RJ (RemixWarp 作品文件) 容器格式常量定义。
 *
 * .rj 仍然是一个 ZIP 容器，但内部不再是「一个巨大的 project.json + 一堆资源」，
 * 而是拆分成「索引表 + 分角色数据 + 分角色积木 + 资源」的多个 JSON 文件，
 * 这样可以：
 *   1. 先只读取体积很小的名称表就把角色框 / 造型框 / 背景框 / 声音 / 变量渲染出来；
 *   2. 再并行读取每个角色 / 每个造型 / 每个声音 / 每份积木，加快大作品的加载；
 *   3. 加载时把各分片重新拼装成标准 SB3（project.json + 资源），
 *      因此数据模型与 sb3 完全一致，不会丢失任何信息。
 */

/** 容器魔数，用于快速判断一个 zip 是否为本格式 */
export const RJ_MAGIC = 'RemixWarp-RJ-Project';

/** 格式标识 */
export const RJ_FORMAT_ID = 'rj';

/** 格式版本 */
export const RJ_FORMAT_VERSION = 1;

/** 该格式的 SB3 兼容版本 */
export const RJ_SB3_VERSION = 3;

/** 文件扩展名 */
export const RJ_EXTENSION = '.rj';

/** 目录 / 文件名常量 —— 解压之后「很多 json 文件」就来自这些目录 */
export const MANIFEST_FILE = 'manifest.json';
export const TABLE_DIR = 'tables';
export const TARGET_DIR = 'targets';
export const BLOCK_DIR = 'blocks';
export const ASSET_DIR = 'assets';

export const TARGETS_TABLE = `${TABLE_DIR}/targets.json`;
export const COSTUMES_TABLE = `${TABLE_DIR}/costumes.json`;
export const SOUNDS_TABLE = `${TABLE_DIR}/sounds.json`;
export const VARIABLES_TABLE = `${TABLE_DIR}/variables.json`;
export const MONITORS_TABLE = `${TABLE_DIR}/monitors.json`;

export const targetFile = index => `${TARGET_DIR}/${index}.json`;
export const blockFile = index => `${BLOCK_DIR}/${index}.json`;
export const assetFile = fileName => `${ASSET_DIR}/${fileName}`;

/** 加载阶段，用于进度回调 */
export const RJ_LOAD_STAGES = {
    MANIFEST: 'manifest',
    TARGETS: 'targets',
    COSTUMES: 'costumes',
    SOUNDS_AND_VARIABLES: 'soundsAndVariables',
    COSTUME_ASSETS: 'costumeAssets',
    SOUND_ASSETS: 'soundAssets',
    BLOCKS: 'blocks',
    /** 数据装配完成，正在把角色 / 积木写入编辑器 */
    WRITING_TO_EDITOR: 'writingToEditor',
    FINISHED: 'finished'
};

/**
 * 从文件名中提取作品标题
 * @param {string} filename 文件名
 * @returns {string} 标题，无法识别时返回空字符串
 */
export const getProjectTitleFromFilename = filename => {
    if (!filename) return '';
    const matches = filename.match(/^(.*)\.(?:sb[23]?|rj|html)$/);
    if (!matches) return '';
    return matches[1].substring(0, 100);
};

/**
 * 判断文件名是否为 .rj 作品文件
 * @param {string} filename 文件名
 * @returns {boolean} 是否是 .rj 文件
 */
export const isRJFilename = filename => typeof filename === 'string' && filename.toLowerCase().endsWith(RJ_EXTENSION);

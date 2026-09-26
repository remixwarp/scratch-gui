import {RJ_LOAD_STAGES} from './constants.js';

/**
 * .rj 各加载阶段的展示文案。
 * 把「现在到底在读硬盘里的什么东西」讲清楚。
 */
const TEXT = {
    [RJ_LOAD_STAGES.MANIFEST]: {
        en: 'Reading project manifest from disk …',
        zh: '正在从硬盘读取作品清单……'
    },
    [RJ_LOAD_STAGES.TARGETS]: {
        en: 'Reading sprite name table ({targetCount} sprites) …',
        zh: '正在读取角色名称表（{targetCount} 个角色）……'
    },
    [RJ_LOAD_STAGES.COSTUMES]: {
        en: 'Reading costume / backdrop name table ({costumeCount} items, {backdropCount} backdrops) …',
        zh: '正在读取造型 / 背景名称表（共 {costumeCount} 项，其中背景 {backdropCount} 个）……'
    },
    [RJ_LOAD_STAGES.SOUNDS_AND_VARIABLES]: {
        en: 'Reading sound ({soundCount}) & variable ({variableCount}) / list ({listCount}) tables …',
        zh: '正在读取声音（{soundCount}）、变量（{variableCount}）与列表（{listCount}）名称表……'
    },
    [RJ_LOAD_STAGES.COSTUME_ASSETS]: {
        en: 'Loading costumes in parallel ({loadedCostumes}/{costumeTotal}) …',
        zh: '正在并行加载各角色的造型（{loadedCostumes}/{costumeTotal}）……'
    },
    [RJ_LOAD_STAGES.SOUND_ASSETS]: {
        en: 'Loading sounds & variables in parallel ({loadedSounds}/{soundTotal}) …',
        zh: '正在并行加载声音与变量（{loadedSounds}/{soundTotal}）……'
    },
    [RJ_LOAD_STAGES.BLOCKS]: {
        en: 'Loading blocks in parallel ({blockCount} blocks) …',
        zh: '正在并行载入积木（共 {blockCount} 个）……'
    },
    [RJ_LOAD_STAGES.WRITING_TO_EDITOR]: {
        en: 'Writing targets and blocks into the editor …',
        zh: '正在把角色与积木写入编辑器……'
    },
    [RJ_LOAD_STAGES.FINISHED]: {
        en: 'Assembling project data and building the editor …',
        zh: '正在装配作品数据并写入编辑器……'
    }
};

/**
 * .rj 各阶段的进度百分比。
 * json 分片阶段最多走到 FINISHED_PERCENT，之后由 VM 真实的素材加载
 * 进度从 FINISHED_PERCENT 续到 ASSET_PHASE_END，最后补到 100%。
 */
const PERCENT = {
    [RJ_LOAD_STAGES.MANIFEST]: 4,
    [RJ_LOAD_STAGES.TARGETS]: 10,
    [RJ_LOAD_STAGES.COSTUMES]: 16,
    [RJ_LOAD_STAGES.SOUNDS_AND_VARIABLES]: 22,
    [RJ_LOAD_STAGES.COSTUME_ASSETS]: 40,
    [RJ_LOAD_STAGES.SOUND_ASSETS]: 56,
    [RJ_LOAD_STAGES.BLOCKS]: 70,
    [RJ_LOAD_STAGES.WRITING_TO_EDITOR]: 80,
    [RJ_LOAD_STAGES.FINISHED]: 76
};

/** json 分片阶段结束时的百分比 */
export const RJ_FINISHED_PERCENT = PERCENT[RJ_LOAD_STAGES.FINISHED];

/** VM 素材加载阶段的目标百分比（之后 PROJECT_LOADED 补到 100） */
export const RJ_ASSET_PHASE_END = 96;

/**
 * 把某个阶段的 progress 对象格式化成给用户看的文案
 * @param {string} locale 当前语言
 * @param {string} phase RJ_LOAD_STAGES 之一
 * @param {object} data onProgress 回调携带的字段
 * @returns {string|null} 文案，未知阶段返回 null
 */
export const formatRJPhase = (locale, phase, data) => {
    const info = TEXT[phase];
    if (!info) return null;
    const pattern = locale === 'zh-cn' ? info.zh : info.en;
    return String(pattern).replace(/\{(\w+)\}/g, (match, key) => {
        const value = data ? data[key] : null;
        return value === null || typeof value === 'undefined' ? match : value;
    });
};

/**
 * 生成一个可以直接塞给 loadRJIntoVM 的 onProgress 回调，
 * 把 .rj 的加载阶段翻译成文案 + 百分比后上报。
 * @param {string} locale 当前语言
 * @param {Function} emit 接收 {source, phase, detail, percent} 的回调
 * @returns {Function} onProgress 回调
 */
export const createRJProgressReporter = (locale, emit) => progress => {
    if (!progress || !progress.stage) return;
    emit({
        source: 'rj',
        phase: progress.stage,
        detail: formatRJPhase(locale, progress.stage, progress),
        percent: typeof PERCENT[progress.stage] === 'number' ? PERCENT[progress.stage] : null
    });
};

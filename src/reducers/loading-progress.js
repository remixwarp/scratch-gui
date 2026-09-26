/**
 * 加载进度状态。
 *
 * 让「载入作品」遮罩能显示当前到底在读什么、进度到百分之多少，
 * 并且可以被用户临时隐藏，以便直接观察编辑器逐步装配的过程。
 */

const SET_LOADING_PROGRESS = 'scratch-gui/loading-progress/SET_PROGRESS';
const SET_LOADING_OVERLAY_VISIBLE = 'scratch-gui/loading-progress/SET_OVERLAY_VISIBLE';
const RESET_LOADING_PROGRESS = 'scratch-gui/loading-progress/RESET';

const initialState = {
    /** 遮罩是否可见（用户可以点按钮暂时隐藏） */
    overlayVisible: true,
    /** 进度来源标识，例如 'rj'（.rj 分片加载） */
    source: null,
    /** 当前阶段标识 */
    phase: null,
    /** 展示给用户看的当前动作描述 */
    detail: null,
    /** 0-100 的进度，null 表示未知 */
    percent: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_LOADING_PROGRESS:
        return Object.assign({}, state, {
            source: typeof action.source === 'string' ? action.source : state.source,
            phase: action.phase,
            detail: typeof action.detail === 'string' ? action.detail : state.detail,
            percent: typeof action.percent === 'number' ? action.percent : state.percent
        });
    case SET_LOADING_OVERLAY_VISIBLE:
        return Object.assign({}, state, {overlayVisible: action.visible});
    case RESET_LOADING_PROGRESS:
        return initialState;
    default:
        return state;
    }
};

/**
 * 上报一次加载进度
 * @param {object} payload {source, phase, detail, percent}
 * @returns {object} action
 */
const setLoadingProgress = payload => ({
    type: SET_LOADING_PROGRESS,
    source: payload.source,
    phase: payload.phase,
    detail: payload.detail,
    percent: payload.percent
});

/**
 * 显示 / 隐藏加载遮罩
 * @param {boolean} visible 是否可见
 * @returns {object} action
 */
const setLoadingOverlayVisible = visible => ({
    type: SET_LOADING_OVERLAY_VISIBLE,
    visible
});

/**
 * 复位加载进度
 * @returns {object} action
 */
const resetLoadingProgress = () => ({type: RESET_LOADING_PROGRESS});

export {
    initialState as loadingProgressInitialState,
    setLoadingProgress,
    setLoadingOverlayVisible,
    resetLoadingProgress
};

export default reducer;

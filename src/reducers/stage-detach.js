const SET_STAGE_DETACHED = 'scratch-gui/stage-detach/SET_STAGE_DETACHED';
const TOGGLE_STAGE_DETACHED = 'scratch-gui/stage-detach/TOGGLE_STAGE_DETACHED';

const initialState = {
    isStageDetached: false
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_STAGE_DETACHED:
        return {...state, isStageDetached: action.isStageDetached};
    case TOGGLE_STAGE_DETACHED:
        return {...state, isStageDetached: !state.isStageDetached};
    default:
        return state;
    }
};

const setStageDetached = function (isStageDetached) {
    return {
        type: SET_STAGE_DETACHED,
        isStageDetached: isStageDetached
    };
};

const toggleStageDetached = function () {
    return {
        type: TOGGLE_STAGE_DETACHED
    };
};

export {
    reducer as default,
    initialState as stageDetachInitialState,
    setStageDetached,
    toggleStageDetached
};

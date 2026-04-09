const initialState = {
    previewExtData: []
};

const aePreviewExtData = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_PREVIEW_EXT_DATA':
            return {
                ...state,
                previewExtData: action.payload
            };
        default:
            return state;
    }
};

export default aePreviewExtData;
export const aePreviewExtDataInitialState = initialState;

export const setPreviewExtData = (data) => ({
    type: 'SET_PREVIEW_EXT_DATA',
    payload: data
});

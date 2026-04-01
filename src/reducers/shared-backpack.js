const initialState = {
    backpacks: [],
    selectedBackpackId: null,
    createDialogOpen: false
};

const sharedBackpackReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'scratch-gui/shared-backpack/SET_SHARED_BACKPACKS':
            return {
                ...state,
                backpacks: action.backpacks
            };
        case 'scratch-gui/shared-backpack/ADD_SHARED_BACKPACK':
            return {
                ...state,
                backpacks: [...state.backpacks, action.backpack]
            };
        case 'scratch-gui/shared-backpack/UPDATE_SHARED_BACKPACK':
            return {
                ...state,
                backpacks: state.backpacks.map(backpack => 
                    backpack.id === action.backpack.id ? action.backpack : backpack
                )
            };
        case 'scratch-gui/shared-backpack/REMOVE_SHARED_BACKPACK':
            return {
                ...state,
                backpacks: state.backpacks.filter(backpack => backpack.id !== action.backpackId),
                selectedBackpackId: state.selectedBackpackId === action.backpackId ? null : state.selectedBackpackId
            };
        case 'scratch-gui/shared-backpack/SELECT_SHARED_BACKPACK':
            return {
                ...state,
                selectedBackpackId: action.backpackId
            };
        case 'scratch-gui/shared-backpack/OPEN_CREATE_DIALOG':
            return {
                ...state,
                createDialogOpen: true
            };
        case 'scratch-gui/shared-backpack/CLOSE_CREATE_DIALOG':
            return {
                ...state,
                createDialogOpen: false
            };
        default:
            return state;
    }
};

export default sharedBackpackReducer;
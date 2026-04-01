import {connect} from 'react-redux';
import SharedBackpackComponent from '../components/backpack/shared-backpack.jsx';
import SharedBackpackCreateDialog from '../components/backpack/shared-backpack-create-dialog.jsx';
import sharedBackpackAPI from '../lib/api/shared-backpack.js';
import CollaborationService from '../lib/collaboration-service.js';

const mapStateToProps = state => {
    const collaborationState = state.scratchGui.collaboration;
    const currentUser = {
        id: collaborationState.peerId,
        username: collaborationState.username
    };
    
    return {
        backpacks: state.scratchGui.sharedBackpack.backpacks || [],
        currentUser,
        roomMembers: collaborationState.users || [],
        isCollaborating: collaborationState.isConnected,
        isHost: collaborationState.isHost
    };
};

const mapDispatchToProps = dispatch => ({
    onCreateSharedBackpack: async (name, initialPermissions) => {
        const collabService = CollaborationService.getInstance();
        if (!collabService.isConnected || !collabService.roomId) {
            console.error('Not in a collaboration room');
            return;
        }
        
        try {
            const backpack = await sharedBackpackAPI.createSharedBackpack({
                roomId: collabService.roomId,
                name,
                creatorId: collabService.peer.id,
                creatorName: collabService.username,
                initialPermissions
            });
            
            // 通知其他用户
            collabService.sendMessage('shared-backpack-create', {
                backpack
            });
            
            dispatch({
                type: 'scratch-gui/shared-backpack/ADD_SHARED_BACKPACK',
                backpack
            });
        } catch (error) {
            console.error('Error creating shared backpack:', error);
        }
    },
    onLoadSharedBackpacks: async () => {
        const collabService = CollaborationService.getInstance();
        if (!collabService.isConnected || !collabService.roomId) {
            return;
        }
        
        try {
            const backpacks = await sharedBackpackAPI.getSharedBackpacksByRoom(collabService.roomId);
            dispatch({
                type: 'scratch-gui/shared-backpack/SET_SHARED_BACKPACKS',
                backpacks
            });
        } catch (error) {
            console.error('Error loading shared backpacks:', error);
        }
    },
    onBackpackClick: (backpackId) => {
        dispatch({
            type: 'scratch-gui/shared-backpack/SELECT_SHARED_BACKPACK',
            backpackId
        });
    }
});

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
    ...ownProps,
    ...stateProps,
    ...dispatchProps,
    onCreate: () => {
        dispatch({
            type: 'scratch-gui/shared-backpack/OPEN_CREATE_DIALOG'
        });
    },
    onCloseCreateDialog: () => {
        dispatch({
            type: 'scratch-gui/shared-backpack/CLOSE_CREATE_DIALOG'
        });
    },
    onCreateBackpack: (name, initialPermissions) => {
        dispatchProps.onCreateSharedBackpack(name, initialPermissions);
        dispatch({
            type: 'scratch-gui/shared-backpack/CLOSE_CREATE_DIALOG'
        });
    }
});

const SharedBackpackContainer = connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
)(({ 
    backpacks, 
    currentUser, 
    roomMembers, 
    isCollaborating, 
    isHost, 
    onCreate, 
    onCloseCreateDialog, 
    onCreateBackpack, 
    onLoadSharedBackpacks, 
    onBackpackClick,
    ...props 
}) => {
    // 当进入协作模式时加载共享书包
    React.useEffect(() => {
        if (isCollaborating) {
            onLoadSharedBackpacks();
        }
    }, [isCollaborating, onLoadSharedBackpacks]);
    
    // 监听协作服务的共享书包事件
    React.useEffect(() => {
        const collabService = CollaborationService.getInstance();
        
        const handleBackpackCreated = (data) => {
            dispatch({
                type: 'scratch-gui/shared-backpack/ADD_SHARED_BACKPACK',
                backpack: data.backpack
            });
        };
        
        const handleBackpackUpdated = (data
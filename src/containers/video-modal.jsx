import { connect } from 'react-redux';
import { closeVideoModal } from '../reducers/modals.js';
import VideoModal from '../components/video-modal/video-modal.jsx';

const mapStateToProps = state => ({
    visible: state.scratchGui && state.scratchGui.modals && state.scratchGui.modals.videoModal,
    tutorial: state.scratchGui && state.scratchGui.modals && state.scratchGui.modals.videoModalData,
    vm: state.scratchGui && state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onClose: () => {
        dispatch(closeVideoModal());
    }
});

const VideoModalContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(VideoModal);

export default VideoModalContainer;
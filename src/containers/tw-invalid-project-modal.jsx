import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import InvalidProjectModal from '../components/tw-invalid-project-modal/invalid-project-modal.jsx';
import {closeInvalidProjectModal, openRestorePointModal} from '../reducers/modals';

const TWInvalidProjectModal = props => (
    <InvalidProjectModal {...props} />
);

TWInvalidProjectModal.propTypes = {
    onClickRestorePoints: PropTypes.func,
    onClose: PropTypes.func,
    error: PropTypes.any
};

const mapStateToProps = state => ({
    error: state.scratchGui.tw.projectError,
    // Only set when the project was made on an incompatible (non-whitelisted)
    // platform. Compatible platforms are handled silently and never recorded,
    // so this is exactly the set we want to surface in the failure message.
    platform: state.scratchGui.tw.platformMismatchDetails.platform
});

const mapDispatchToProps = dispatch => ({
    onClickRestorePoints: () => {
        dispatch(closeInvalidProjectModal());
        dispatch(openRestorePointModal());
    },
    onClose: () => dispatch(closeInvalidProjectModal())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(TWInvalidProjectModal);

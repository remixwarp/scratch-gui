import {connect} from 'react-redux';
import {compose} from 'redux';
import {injectIntl} from 'react-intl';
import React from 'react';
import PropTypes from 'prop-types';

import TutorialModal from '../components/tutorial-modal/tutorial-modal.jsx';
import {
    closeTutorialModal
} from '../reducers/modals';

const mapStateToProps = state => ({
    visible: state.scratchGui && state.scratchGui.modals && state.scratchGui.modals.tutorialModal
});

const mapDispatchToProps = dispatch => ({
    onClose: () => {
        dispatch(closeTutorialModal());
    }
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
    if (!stateProps.visible) return {visible: false};
    return {
        ...ownProps,
        ...stateProps,
        ...dispatchProps
    };
};

const TutorialModalContainer = props => (props.visible ? (
    <TutorialModal
        onClose={props.onClose}
    />
) : null);

TutorialModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
)(TutorialModalContainer);

import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {closeWebEmbedModal} from '../reducers/modals';
import WebEmbedWindow from '../components/web-embed-window/web-embed-window.jsx';

const WebEmbedModalContainer = ({visible, onClose}) => (
    <WebEmbedWindow visible={!!visible} onClose={onClose} />
);

WebEmbedModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func
};

const mapStateToProps = state => ({
    visible: !!state.scratchGui.modals.webEmbedModal
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeWebEmbedModal())
});

export default connect(mapStateToProps, mapDispatchToProps)(WebEmbedModalContainer);

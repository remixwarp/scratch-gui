import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeAIChatModal, MODAL_AI_CHAT} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import AIPanel from '../components/ai/ai-panel.jsx';

class AIChatModalContainer extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleClose']);
    }
    handleClose () {
        this.props.onClose();
    }
    render () {
        const {visible, isRtl} = this.props;
        
        return (
            <Modal
                id="aiChatModal"
                contentLabel={this.props.intl.formatMessage({defaultMessage: 'AI Chat', id: 'gui.aiModal.chatTitle'})}
                visible={!!visible}
                className="ai-modal"
                onRequestClose={this.handleClose}
                showHeader={true}
            >
                <AIPanel 
                    onRequestClose={this.handleClose} 
                    showHeader={false} 
                    type="chat"
                />
            </Modal>
        );
    }
}

AIChatModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func,
    intl: PropTypes.object,
    isRtl: PropTypes.bool
};

const mapStateToProps = state => {
    return {
        visible: !!state.scratchGui.modals.aiChatModal,
        isRtl: state.locales.isRtl
    };
};

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeAIChatModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(AIChatModalContainer));

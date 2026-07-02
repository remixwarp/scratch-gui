import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeAIChatModal, MODAL_AI_CHAT} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import AIPanel from '../components/ai/ai-panel.jsx';
import TurnstileVerifier from '../components/ai/turnstile-verifier.jsx';

class AIChatModalContainer extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleClose', 'handleVerify']);
        this.state = {
            turnstileToken: null
        };
    }
    handleClose () {
        this.setState({turnstileToken: null});
        this.props.onClose();
    }
    handleVerify (token) {
        this.setState({turnstileToken: token});
    }
    render () {
        const {visible, isRtl} = this.props;
        const {turnstileToken} = this.state;
        
        return (
            <Modal
                id="aiChatModal"
                contentLabel={this.props.intl.formatMessage({defaultMessage: 'AI Chat', id: 'gui.aiModal.chatTitle'})}
                visible={!!visible}
                className="ai-modal"
                onRequestClose={this.handleClose}
                showHeader={true}
            >
                {turnstileToken ? (
                    <AIPanel 
                        onRequestClose={this.handleClose} 
                        showHeader={false} 
                        type="chat"
                        turnstileToken={turnstileToken}
                    />
                ) : (
                    <TurnstileVerifier 
                        title="AI Chat"
                        onVerify={this.handleVerify}
                    />
                )}
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

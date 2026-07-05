import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeAIChatModal, MODAL_AI_CHAT} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import AIPanel from '../components/ai/ai-panel.jsx';
import TurnstileVerifier from '../components/ai/turnstile-verifier.jsx';
import {getSessionToken} from '../lib/constants/api-keys.js';

class AIChatModalContainer extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            verified: !!getSessionToken()
        };
        bindAll(this, ['handleClose', 'handleVerified']);
    }
    handleClose () {
        this.props.onClose();
    }
    handleVerified () {
        this.setState({verified: true});
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
                {this.state.verified ? (
                    <AIPanel
                        onRequestClose={this.handleClose}
                        showHeader={false}
                        type="chat"
                    />
                ) : (
                    <TurnstileVerifier onSuccess={this.handleVerified} />
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

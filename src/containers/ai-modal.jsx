import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeAIModal, MODAL_AI} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import AIPanel from '../components/ai/ai-panel.jsx';
import TurnstileVerifier from '../components/ai/turnstile-verifier.jsx';
import {getSessionToken} from '../lib/constants/api-keys.js';

class AIModalContainer extends React.Component {
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
        const {visible, isRtl, aiModalProps} = this.props;
        const type = aiModalProps?.type || 'chat';
        const title = type === 'chat'
            ? this.props.intl.formatMessage({defaultMessage: 'AI Chat', id: 'gui.aiModal.chatTitle'})
            : this.props.intl.formatMessage({defaultMessage: 'AI Agent', id: 'gui.aiModal.agentTitle'});

        return (
            <Modal
                id="aiModal"
                contentLabel={title}
                visible={!!visible}
                className="ai-modal"
                onRequestClose={this.handleClose}
                showHeader={true}
            >
                {this.state.verified ? (
                    <AIPanel
                        onRequestClose={this.handleClose}
                        showHeader={false}
                        type={type}
                    />
                ) : (
                    <TurnstileVerifier onSuccess={this.handleVerified} />
                )}
            </Modal>
        );
    }
}

AIModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func,
    intl: PropTypes.object,
    isRtl: PropTypes.bool,
    aiModalProps: PropTypes.object
};

const mapStateToProps = state => {
    const aiModalState = state.scratchGui.modals.aiModal;
    return {
        visible: !!aiModalState,
        aiModalProps: typeof aiModalState === 'object' ? aiModalState : null,
        isRtl: state.locales.isRtl
    };
};

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeAIModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(AIModalContainer));

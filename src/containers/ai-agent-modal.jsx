import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeAIAgentModal, MODAL_AI_AGENT} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import AIPanel from '../components/ai/ai-panel.jsx';
import TurnstileVerifier from '../components/ai/turnstile-verifier.jsx';
import {getSessionToken} from '../lib/constants/api-keys.js';

class AIAgentModalContainer extends React.Component {
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
        const {visible, isRtl, vm} = this.props;

        return (
            <Modal
                id="aiAgentModal"
                contentLabel={this.props.intl.formatMessage({defaultMessage: 'AI Agent', id: 'gui.aiModal.agentTitle'})}
                visible={!!visible}
                className="ai-modal"
                onRequestClose={this.handleClose}
                showHeader={false}
            >
                {this.state.verified ? (
                    <AIPanel
                        onRequestClose={this.handleClose}
                        showHeader={true}
                        type="agent"
                        vm={vm}
                    />
                ) : (
                    <TurnstileVerifier onSuccess={this.handleVerified} />
                )}
            </Modal>
        );
    }
}

AIAgentModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func,
    intl: PropTypes.object,
    isRtl: PropTypes.bool,
    vm: PropTypes.object
};

const mapStateToProps = state => {
    return {
        visible: !!state.scratchGui.modals.aiAgentModal,
        isRtl: state.locales.isRtl,
        vm: state.scratchGui.vm
    };
};

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeAIAgentModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(AIAgentModalContainer));

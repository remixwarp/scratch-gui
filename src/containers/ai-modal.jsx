import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeAIModal, MODAL_AI} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import AIPanel from '../components/ai/ai-panel.jsx';

class AIModalContainer extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleClose']);
    }
    handleClose () {
        this.props.onClose();
    }
    render () {
        const {visible, isRtl, aiModalProps} = this.props;
        const title = this.props.intl.formatMessage({defaultMessage: 'AI Chat', id: 'gui.aiModal.chatTitle'});

        return (
            <Modal
                id="aiModal"
                contentLabel={title}
                visible={!!visible}
                className="ai-modal"
                onRequestClose={this.handleClose}
                showHeader={true}
            >
                <AIPanel
                    onRequestClose={this.handleClose}
                    showHeader={false}
                />
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

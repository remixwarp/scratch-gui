import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeAIModal} from '../reducers/modals';
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
        const {visible, isRtl} = this.props;
        return (
            <Modal
                id="aiModal"
                contentLabel={this.props.intl.formatMessage({defaultMessage: 'AI辅助编程', id: 'gui.aiModal.title'})}
                visible={!!visible}
                className="ai-modal"
                onRequestClose={this.handleClose}
                showHeader={true}
            >
                <AIPanel onRequestClose={this.handleClose} showHeader={false} />
            </Modal>
        );
    }
}

AIModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func,
    intl: PropTypes.object,
    isRtl: PropTypes.bool
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.aiModal,
    isRtl: state.locales.isRtl
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeAIModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(AIModalContainer));

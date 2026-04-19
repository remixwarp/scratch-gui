import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {closeBaiduAIModal, MODAL_BAIDU_AI} from '../reducers/modals';
import Modal from './windowed-modal.jsx';
import BaiduAIPanel from '../components/ai/baidu-ai-panel.jsx';

class BaiduAIModalContainer extends React.Component {
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
                id="baiduAIModal"
                contentLabel={this.props.intl.formatMessage({defaultMessage: '百度AI', id: 'gui.aiModal.baiduTitle'})}
                visible={!!visible}
                className="ai-modal"
                onRequestClose={this.handleClose}
                showHeader={true}
            >
                <BaiduAIPanel 
                    onRequestClose={this.handleClose} 
                    showHeader={false}
                />
            </Modal>
        );
    }
}

BaiduAIModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func,
    intl: PropTypes.object,
    isRtl: PropTypes.bool
};

const mapStateToProps = state => {
    return {
        visible: !!state.scratchGui.modals.baiduAIModal,
        isRtl: state.locales.isRtl
    };
};

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeBaiduAIModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(BaiduAIModalContainer));
import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import log from '../lib/utils/log';
import CustomGalleryModalComponent from '../components/custom-gallery-modal/custom-gallery-modal.jsx';
import {closeCustomGalleryModal} from '../reducers/modals';
import {addCustomSource} from './extension-library.jsx';

class CustomGalleryModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleOk',
            'handleCancel'
        ]);
    }

    handleOk (gallery) {
        this.props.onClose();

        if (!gallery || !gallery.url) {
            log.warn('Invalid gallery URL');
            return;
        }

        // 注册后扩展库弹窗会自动重新加载该库并显示状态灯
        addCustomSource({
            name: gallery.name || 'Custom',
            url: gallery.url,
            unsandboxed: gallery.unsandboxed === true
        });
    }

    handleCancel () {
        this.props.onClose();
    }

    render () {
        if (!this.props.visible) {
            return null;
        }

        return (
            <CustomGalleryModalComponent
                onOk={this.handleOk}
                onCancel={this.handleCancel}
            />
        );
    }
}

CustomGalleryModal.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.customGalleryModal
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeCustomGalleryModal())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(CustomGalleryModal);
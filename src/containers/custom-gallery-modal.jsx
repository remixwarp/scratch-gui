import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import log from '../lib/utils/log';
import CustomGalleryModalComponent from '../components/custom-gallery-modal/custom-gallery-modal.jsx';
import {closeCustomGalleryModal} from '../reducers/modals';
import {updateGallery} from './extension-library.jsx';

class CustomGalleryModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleOk',
            'handleCancel'
        ]);
    }

    handleOk (extension) {
        this.props.onClose();
        
        if (!extension || !extension.id || !extension.name || !extension.extensionURL) {
            log.warn('Invalid extension data');
            return;
        }
        
        const processedExtension = {
            name: extension.name,
            nameTranslations: extension.nameTranslations || {},
            description: extension.description || '',
            descriptionTranslations: extension.descriptionTranslations || {},
            extensionId: extension.id,
            extensionURL: extension.extensionURL,
            iconURL: extension.iconURL || 'https://extensions.bilup.org/images/unknown.svg',
            tags: ['custom'],
            credits: extension.credits || [],
            incompatibleWithScratch: true,
            featured: true
        };
        
        updateGallery([processedExtension]);
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
    onClose: PropTypes.func.isRequired,
    onGalleryLoaded: PropTypes.func
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
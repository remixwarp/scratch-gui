import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';
import styles from './custom-gallery-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Add Custom Extension',
        description: 'Title for custom extension modal',
        id: 'tw.customExtensionGallery.title'
    },
    extensionId: {
        defaultMessage: 'Extension ID',
        description: 'Extension ID field label',
        id: 'tw.customExtensionGallery.extensionId'
    },
    name: {
        defaultMessage: 'Name',
        description: 'Extension name field label',
        id: 'tw.customExtensionGallery.nameLabel'
    },
    description: {
        defaultMessage: 'Description',
        description: 'Extension description field label',
        id: 'tw.customExtensionGallery.descriptionLabel'
    },
    extensionUrl: {
        defaultMessage: 'Extension URL',
        description: 'Extension JS file URL field label',
        id: 'tw.customExtensionGallery.extensionUrl'
    },
    iconUrl: {
        defaultMessage: 'Icon URL (optional)',
        description: 'Extension icon URL field label',
        id: 'tw.customExtensionGallery.iconUrl'
    },
    author: {
        defaultMessage: 'Author',
        description: 'Extension author field label',
        id: 'tw.customExtensionGallery.author'
    },
    ok: {
        defaultMessage: 'Add',
        description: 'Button to confirm',
        id: 'tw.customExtensionGallery.add'
    },
    cancel: {
        defaultMessage: 'Cancel',
        description: 'Button to cancel',
        id: 'tw.simpleDialog.cancel'
    }
});

const placeholderMessages = defineMessages({
    extensionId: {
        id: 'tw.customExtensionGallery.placeholder.extensionId',
        defaultMessage: 'my-extension',
        description: 'Placeholder for extension ID input'
    },
    name: {
        id: 'tw.customExtensionGallery.placeholder.name',
        defaultMessage: 'My Extension',
        description: 'Placeholder for extension name input'
    },
    description: {
        id: 'tw.customExtensionGallery.placeholder.description',
        defaultMessage: 'Adds cool features',
        description: 'Placeholder for extension description input'
    },
    author: {
        id: 'tw.customExtensionGallery.placeholder.author',
        defaultMessage: 'Author Name',
        description: 'Placeholder for extension author input'
    }
});

class CustomGalleryModalComponent extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            extensionId: '',
            name: '',
            description: '',
            extensionUrl: '',
            iconUrl: '',
            author: ''
        };
    }
    
    handleChange = field => e => {
        this.setState({[field]: e.target.value});
    };
    
    handleKeyPress = e => {
        if (e.key === 'Escape') {
            this.props.onCancel();
        }
    };
    
    handleAdd = () => {
        const {extensionId, name, description, extensionUrl, iconUrl, author} = this.state;
        
        if (!extensionId || !name || !extensionUrl) {
            return;
        }
        
        const extension = {
            id: extensionId,
            name: name,
            nameTranslations: {},
            description: description || '',
            descriptionTranslations: {},
            extensionURL: extensionUrl,
            iconURL: iconUrl || 'https://extensions.bilup.org/images/unknown.svg',
            tags: ['custom'],
            credits: author ? [author] : [],
            featured: true,
            incompatibleWithScratch: true
        };
        
        this.props.onOk(extension);
    };
    
    render () {
        const {intl} = this.props;
        
        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={this.props.onCancel}
                contentLabel={intl.formatMessage(messages.title)}
                id="customGalleryModal"
            >
                <Box className={styles.body} onKeyPress={this.handleKeyPress}>
                    <div className={styles.field}>
                        <label className={styles.label}>
                            <FormattedMessage {...messages.extensionId} />
                        </label>
                        <input
                            className={styles.input}
                            type="text"
                            value={this.state.extensionId}
                            onChange={this.handleChange('extensionId')}
                            placeholder={intl.formatMessage(placeholderMessages.extensionId)}
                        />
                    </div>
                    
                    <div className={styles.field}>
                        <label className={styles.label}>
                            <FormattedMessage {...messages.name} />
                        </label>
                        <input
                            className={styles.input}
                            type="text"
                            value={this.state.name}
                            onChange={this.handleChange('name')}
                            placeholder={intl.formatMessage(placeholderMessages.name)}
                        />
                    </div>
                    
                    <div className={styles.field}>
                        <label className={styles.label}>
                            <FormattedMessage {...messages.description} />
                        </label>
                        <input
                            className={styles.input}
                            type="text"
                            value={this.state.description}
                            onChange={this.handleChange('description')}
                            placeholder={intl.formatMessage(placeholderMessages.description)}
                        />
                    </div>
                    
                    <div className={styles.field}>
                        <label className={styles.label}>
                            <FormattedMessage {...messages.extensionUrl} />
                        </label>
                        <input
                            className={styles.input}
                            type="text"
                            value={this.state.extensionUrl}
                            onChange={this.handleChange('extensionUrl')}
                            placeholder="https://example.com/extension.js"
                        />
                    </div>
                    
                    <div className={styles.field}>
                        <label className={styles.label}>
                            <FormattedMessage {...messages.iconUrl} />
                        </label>
                        <input
                            className={styles.input}
                            type="text"
                            value={this.state.iconUrl}
                            onChange={this.handleChange('iconUrl')}
                            placeholder="https://example.com/icon.png"
                        />
                    </div>
                    
                    <div className={styles.field}>
                        <label className={styles.label}>
                            <FormattedMessage {...messages.author} />
                        </label>
                        <input
                            className={styles.input}
                            type="text"
                            value={this.state.author}
                            onChange={this.handleChange('author')}
                            placeholder={intl.formatMessage(placeholderMessages.author)}
                        />
                    </div>
                    
                    <div className={styles.buttonRow}>
                        <button
                            className={styles.cancelButton}
                            onClick={this.props.onCancel}
                            type="button"
                        >
                            <FormattedMessage {...messages.cancel} />
                        </button>
                        <button
                            className={styles.okButton}
                            onClick={this.handleAdd}
                            type="button"
                        >
                            <FormattedMessage {...messages.ok} />
                        </button>
                    </div>
                </Box>
            </Modal>
        );
    }
}

CustomGalleryModalComponent.propTypes = {
    intl: intlShape,
    onOk: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

export default injectIntl(CustomGalleryModalComponent);

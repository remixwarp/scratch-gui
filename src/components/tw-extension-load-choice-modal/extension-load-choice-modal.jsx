import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import Box from '../box/box.jsx';
import Modal from '../../containers/windowed-modal.jsx';
import styles from '../tw-custom-extension-modal/custom-extension-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Load Extension',
        description: 'Title of extension load choice modal',
        id: 'tw.extensionLoadChoice.title'
    },
    extensionName: {
        defaultMessage: 'Extension: {name}',
        description: 'Shows the extension name being loaded',
        id: 'tw.extensionLoadChoice.extensionName'
    },
    loadFromURL: {
        defaultMessage: 'Load from URL',
        description: 'Button to load extension from URL',
        id: 'tw.extensionLoadChoice.loadFromURL'
    },
    loadFromFile: {
        defaultMessage: 'Load from File',
        description: 'Button to load extension from local file',
        id: 'tw.extensionLoadChoice.loadFromFile'
    },
    orText: {
        defaultMessage: 'or',
        description: 'Separator between options',
        id: 'tw.extensionLoadChoice.or'
    }
});

const ExtensionLoadChoiceModal = props => (
    <Modal
        className={styles.modalContent}
        onRequestClose={props.onClose}
        contentLabel={props.intl.formatMessage(messages.title)}
        id="extensionLoadChoiceModal"
    >
        <Box className={styles.body}>
            <p className={styles.extensionName}>
                <FormattedMessage
                    {...messages.extensionName}
                    values={{name: props.extensionName}}
                />
            </p>
            
            <div className={styles.buttonRow}>
                <button
                    className={styles.loadButton}
                    onClick={props.onLoadFromURL}
                >
                    <FormattedMessage {...messages.loadFromURL} />
                </button>
            </div>
            
            <p style={{textAlign: 'center', margin: '10px 0', color: '#888'}}>
                <FormattedMessage {...messages.orText} />
            </p>
            
            <div className={styles.buttonRow}>
                <button
                    className={styles.loadButton}
                    onClick={props.onLoadFromFile}
                >
                    <FormattedMessage {...messages.loadFromFile} />
                </button>
            </div>
            
            <div className={styles.buttonRow}>
                <button
                    className={styles.cancelButton}
                    onClick={props.onClose}
                >
                    <FormattedMessage
                        defaultMessage="Cancel"
                        id="tw.customExtensionModal.cancel"
                    />
                </button>
            </div>
        </Box>
    </Modal>
);

ExtensionLoadChoiceModal.propTypes = {
    intl: intlShape,
    extensionName: PropTypes.string.isRequired,
    onLoadFromURL: PropTypes.func.isRequired,
    onLoadFromFile: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

export default injectIntl(ExtensionLoadChoiceModal);

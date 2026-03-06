import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import {APP_NAME} from '../../lib/constants/brand.js';
import Modal from '../../containers/windowed-modal.jsx';
import styles from './unknown-platform-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Unknown Platform',
        description: 'Title of modal that appears when loading a project made with another mod',
        id: 'tw.unknownPlatform.title'
    },
    compatibleTitle: {
        defaultMessage: 'Compatible Platform',
        description: 'Title of modal when loading a project from a compatible editor',
        id: 'tw.unknownPlatform.compatibleTitle'
    }
});

// List of platforms that are fully compatible (支持多种命名变体)
const COMPATIBLE_PLATFORMS = [
    // Scratch variants
    {names: ['scratch', 'Scratch'], url: 'https://scratch.mit.edu/'},
    // TurboWarp variants
    {names: ['turbowarp', 'TurboWarp', 'Turbowarp'], url: 'https://turbowarp.org/'},
    // 02Engine variants
    {names: ['02engine', '02Engine', 'O2Engine'], url: 'https://02engine.02studio.xyz/'},
    // AstraEditor variants
    {names: ['astraeditor', 'AstraEditor', 'Astra Editor'], url: 'https://www.astras.top/'},
    // Bilup variants
    {names: ['bilup', 'Bilup', 'Bilup Editor'], url: 'https://editor.bilup.org/'}
];

const isCompatiblePlatform = platform => {
    if (!platform || !platform.name) {
        return false;
    }
    const platformName = platform.name.toLowerCase();
    return COMPATIBLE_PLATFORMS.some(p => 
        p.names.some(name => name.toLowerCase() === platformName || 
            platformName.includes(name.toLowerCase()))
    );
};

const platformToString = platform => {
    if (!platform) {
        return '(?)';
    }
    if (platform.name && platform.url) {
        return `${platform.name} (${platform.url})`;
    } else if (platform.name) {
        return `${platform.name}`;
    } else if (platform.url) {
        return `${platform.url}`;
    }
    return '(?)';
};

const UnknownPlatformModal = props => {
    const isCompatible = isCompatiblePlatform(props.platform);
    
    return (
        <Modal
            className={styles.modalContent}
            onRequestClose={props.onClose}
            contentLabel={props.intl.formatMessage(isCompatible ? messages.compatibleTitle : messages.title)}
            id="unknownPlatformModal"
        >
            <div className={styles.body}>
                <p>
                    <FormattedMessage
                        defaultMessage="The project was made using a different platform:"
                        // eslint-disable-next-line max-len
                        description="Text in modal that appears when loading a project made with another mod. Followed by some information about the other mod."
                        id="tw.unknownPlatform.1"
                    />
                </p>

                <p className={styles.details}>
                    {platformToString(props.platform)}
                </p>

                {isCompatible ? (
                    <p>
                        <FormattedMessage
                            // eslint-disable-next-line max-len
                            defaultMessage="This platform is fully compatible with {APP_NAME}. The project should work correctly without any issues."
                            // eslint-disable-next-line max-len
                            description="Text in modal when loading a project from a compatible editor."
                            id="tw.unknownPlatform.compatible"
                            values={{
                                APP_NAME
                            }}
                        />
                    </p>
                ) : (
                    <p>
                        <FormattedMessage
                            // eslint-disable-next-line max-len
                            defaultMessage="Compatibility with {APP_NAME} is not guaranteed. You can continue at your own risk, but we may not be able to help if you encounter any problems."
                            // eslint-disable-next-line max-len
                            description="Text in modal that appears when loading a project made with another mod."
                            id="tw.unknownPlatform.2"
                            values={{
                                APP_NAME
                            }}
                        />
                    </p>
                )}

                <button
                    className={styles.button}
                    onClick={props.onClose}
                    disabled={!props.canClose}
                >
                    {isCompatible ? (
                        <FormattedMessage
                            defaultMessage="Continue"
                            description="Button to continue loading a project from a compatible platform"
                            id="tw.unknownPlatform.continueCompatible"
                        />
                    ) : (
                        <FormattedMessage
                            defaultMessage="I understand"
                            description="Button in modal that appears when loading a project made with another mod. Allows ignoring the warning."
                            id="tw.unknownPlatform.continue"
                        />
                    )}
                </button>
            </div>
        </Modal>
    );
};

UnknownPlatformModal.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func.isRequired,
    canClose: PropTypes.bool,
    platform: PropTypes.shape({
        name: PropTypes.string,
        url: PropTypes.string
    })
};

export default injectIntl(UnknownPlatformModal);

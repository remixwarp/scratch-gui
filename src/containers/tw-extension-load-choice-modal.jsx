import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import log from '../lib/utils/log';
import ExtensionLoadChoiceModalComponent from '../components/tw-extension-load-choice-modal/extension-load-choice-modal.jsx';
import {closeExtensionLoadChoiceModal} from '../reducers/modals';
import {manuallyTrustExtension} from './tw-security-manager.jsx';
import {getPersistedUnsandboxed, setPersistedUnsandboxed} from '../lib/persistence/tw-unsandboxed.js';

class ExtensionLoadChoiceModal extends React.Component {
    constructor (props) {
        super(props);

        bindAll(this, [
            'handleClose',
            'handleLoadFromURL',
            'handleLoadFromFile'
        ]);
    }

    handleLoadFromURL () {
        const {onlineURL, extensionId} = this.props;
        if (!onlineURL) {
            alert('No online URL available for this extension');
            return;
        }
        
        this.handleClose();
        
        const unsandboxed = getPersistedUnsandboxed();
        if (unsandboxed) {
            manuallyTrustExtension(onlineURL);
        }
        
        this.props.vm.extensionManager.loadExtensionURL(onlineURL)
            .then(() => {
                if (typeof this.props.onCategorySelected === 'function') {
                    this.props.onCategorySelected(extensionId);
                }
            })
            .catch(err => {
                log.error(err);
                alert(err);
            });
    }

    handleLoadFromFile () {
        const {localURL, extensionId} = this.props;
        if (!localURL) {
            alert('No local file available for this extension');
            return;
        }
        
        this.handleClose();
        
        const unsandboxed = getPersistedUnsandboxed();
        setPersistedUnsandboxed(unsandboxed);
        if (unsandboxed) {
            manuallyTrustExtension(localURL);
        }
        
        this.props.vm.extensionManager.loadExtensionURL(localURL)
            .then(() => {
                if (typeof this.props.onCategorySelected === 'function') {
                    this.props.onCategorySelected(extensionId);
                }
            })
            .catch(err => {
                log.error(err);
                alert(err);
            });
    }

    handleClose () {
        this.props.onClose();
    }

    render () {
        return (
            <ExtensionLoadChoiceModalComponent
                extensionName={this.props.extensionName}
                onLoadFromURL={this.handleLoadFromURL}
                onLoadFromFile={this.handleLoadFromFile}
                onClose={this.handleClose}
            />
        );
    }
}

ExtensionLoadChoiceModal.propTypes = {
    onClose: PropTypes.func,
    vm: PropTypes.shape({
        extensionManager: PropTypes.shape({
            loadExtensionURL: PropTypes.func
        })
    }),
    extensionId: PropTypes.string,
    extensionName: PropTypes.string,
    localURL: PropTypes.string,
    onlineURL: PropTypes.string,
    onCategorySelected: PropTypes.func
};

const mapStateToProps = (state, ownProps) => ({
    vm: state.scratchGui.vm,
    onCategorySelected: ownProps.onCategorySelected
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeExtensionLoadChoiceModal())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ExtensionLoadChoiceModal);

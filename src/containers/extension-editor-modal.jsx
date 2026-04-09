import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {closeExtensionEditorModal, MODAL_EXTENSION_EDITOR} from '../reducers/modals';
import ExtensionEditorWindow from '../components/extension-editor-window/extension-editor-window.jsx';

class ExtensionEditorModalContainer extends React.Component {
    constructor (props) {
        super(props);
    }
    render () {
        const {visible, onClose} = this.props;
        
        return (
            <ExtensionEditorWindow 
                visible={!!visible} 
                onClose={onClose} 
            />
        );
    }
}

ExtensionEditorModalContainer.propTypes = {
    visible: PropTypes.bool,
    onClose: PropTypes.func
};

const mapStateToProps = state => {
    return {
        visible: !!state.scratchGui.modals.extensionEditorModal
    };
};

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeExtensionEditorModal())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ExtensionEditorModalContainer);
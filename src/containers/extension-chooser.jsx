import { connect } from 'react-redux';
import ExtensionChooserComponent from '../components/extension-chooser/extension-chooser.jsx';
import { closeExtensionChooser, openExtensionLibrary, openCustomExtensionModal } from '../reducers/modals';

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => {
        dispatch(closeExtensionChooser());
    },
    onOpenExtensionLibrary: () => {
        dispatch(openExtensionLibrary());
    },
    onOpenCustomExtensionModal: () => {
        dispatch(openCustomExtensionModal());
    },
    dispatch
});

const ExtensionChooser = connect(
    mapStateToProps,
    mapDispatchToProps
)(ExtensionChooserComponent);

export default ExtensionChooser;

import {connect} from 'react-redux';
import {closeBilmeModal} from '../reducers/modals';
import {setTheme} from '../reducers/theme';
import {applyTheme} from '../lib/themes/themePersistance';
import BilmeModal from '../components/bl-bilme/bilme-modal.jsx';

const mapStateToProps = state => ({
    visible: state.scratchGui.modals[state.scratchGui.modals.MODAL_WARPTHEME]
});

const mapDispatchToProps = dispatch => ({
    onClose: () => {
        dispatch(closeBilmeModal());
    },
    onThemeApply: themeData => {
        // Apply the theme data
        console.log('Applying theme:', themeData);
        // Here you would typically convert the theme data to the format expected by your theme system
        // For now, we'll just log it
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BilmeModal);

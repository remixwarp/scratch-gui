import {connect} from 'react-redux';
import {closeBilmeModal, MODAL_WARPTHEME} from '../reducers/modals';
import {setTheme} from '../reducers/theme';
import {applyTheme} from '../lib/themes/themePersistance';
import {CustomTheme} from '../lib/themes/custom-themes';
import BilmeModal from '../components/bl-bilme/bilme-modal.jsx';

const mapStateToProps = state => ({
    visible: state.scratchGui.modals[MODAL_WARPTHEME]
});

const mapDispatchToProps = dispatch => ({
    onClose: () => {
        dispatch(closeBilmeModal());
    },
    onThemeApply: async themeData => {
        try {
            console.log('Applying theme:', themeData);
            
            // 创建自定义主题
            const customTheme = CustomTheme.import(themeData);
            
            // 应用主题
            applyTheme(customTheme);
            
            // 分发主题更新
            dispatch(setTheme(customTheme));
            
            // 关闭模态窗口
            dispatch(closeBilmeModal());
            
            console.log('Theme applied successfully');
        } catch (error) {
            console.error('Error applying theme:', error);
        }
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BilmeModal);

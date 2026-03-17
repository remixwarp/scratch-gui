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
            
            // 验证主题数据格式
            if (!themeData || typeof themeData !== 'object') {
                throw new Error('Invalid theme data format');
            }
            
            // 处理 Bilme API 返回的主题数据格式：{ themes: [{ accent, gui, blocks, ... }] }
            let themeConfig = themeData;
            if (themeData.themes && Array.isArray(themeData.themes) && themeData.themes.length > 0) {
                themeConfig = themeData.themes[0];
                console.log('Using theme config from themes array:', themeConfig);
            }
            
            // 验证主题配置
            if (!themeConfig || typeof themeConfig !== 'object') {
                throw new Error('Invalid theme config format');
            }
            
            // 检查是否缺少必要属性，如果缺少则设置默认值
            if (!themeConfig.name) {
                themeConfig.name = 'Bilme Theme';
                console.log('Added default name: Bilme Theme');
            }
            
            if (!themeConfig.gui) {
                themeConfig.gui = 'light'; // 默认使用 light GUI
                console.log('Added default gui: light');
            }
            
            if (!themeConfig.blocks) {
                themeConfig.blocks = 'three'; // 默认使用 three blocks
                console.log('Added default blocks: three');
            }
            
            // 确保 accent 数据格式正确
            if (themeConfig.accent && typeof themeConfig.accent === 'object' && Array.isArray(themeConfig.accent.colors)) {
                console.log('Processing gradient theme');
            }
            
            // 创建自定义主题
            const customTheme = CustomTheme.import(themeConfig);
            console.log('Custom theme created:', customTheme);
            
            // 应用主题
            applyTheme(customTheme);
            console.log('Theme applied to DOM');
            
            // 分发主题更新
            dispatch(setTheme(customTheme));
            console.log('Theme update dispatched');
            
            // 关闭模态窗口
            dispatch(closeBilmeModal());
            
            console.log('Theme applied successfully');
        } catch (error) {
            console.error('Error applying theme:', error);
            console.error('Error stack:', error.stack);
            // 显示错误提示
            alert(`主题应用失败: ${error.message}`);
        }
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BilmeModal);

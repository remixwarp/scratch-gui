import {connect} from 'react-redux';
import {closeBilmeModal, MODAL_WARPTHEME} from '../reducers/modals';
import {setTheme} from '../reducers/theme';
import {applyTheme} from '../lib/themes/themePersistance';
import {CustomTheme, customThemeManager} from '../lib/themes/custom-themes';
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
            
            if (!themeData || typeof themeData !== 'object') {
                throw new Error('Invalid theme data format');
            }
            
            let themeConfig = themeData;
            if (themeData.themes && Array.isArray(themeData.themes) && themeData.themes.length > 0) {
                themeConfig = themeData.themes[0];
                console.log('Using theme config from themes array:', themeConfig);
            }
            
            if (!themeConfig || typeof themeConfig !== 'object') {
                throw new Error('Invalid theme config format');
            }
            
            if (!themeConfig.name) {
                themeConfig.name = 'Bilme Theme';
                console.log('Added default name: Bilme Theme');
            }
            
            if (!themeConfig.gui) {
                themeConfig.gui = 'light';
                console.log('Added default gui: light');
            }
            
            if (!themeConfig.blocks) {
                themeConfig.blocks = 'three';
                console.log('Added default blocks: three');
            }
            
            if (themeConfig.accent && typeof themeConfig.accent === 'object' && Array.isArray(themeConfig.accent.colors)) {
                console.log('Processing gradient theme');
            }
            
            const customTheme = CustomTheme.import(themeConfig);
            console.log('Custom theme created:', customTheme);
            
            applyTheme(customTheme);
            console.log('Theme applied to DOM');
            
            dispatch(setTheme(customTheme));
            console.log('Theme update dispatched');
            
            dispatch(closeBilmeModal());
            
            console.log('Theme applied successfully');
        } catch (error) {
            console.error('Error applying theme:', error);
            console.error('Error stack:', error.stack);
            alert(`主题应用失败: ${error.message}`);
        }
    },
    onPixelThemeApply: async theme => {
        try {
            console.log('[DEBUG] onPixelThemeApply called for:', theme.name, 'UUID:', theme.uuid);
            
            dispatch(closeBilmeModal());
            
            // 在线主题库已移除，直接使用传入的主题数据（不再从 theme.bilup.org 拉取）。
            const themeData = theme;
            
            console.log('[DEBUG] Importing pixel theme data');
            const results = customThemeManager.importThemes(themeData, false);
            
            let message = '导入完成！\n';
            message += `已导入: ${results.imported} 个主题\n`;
            if (results.skipped > 0) {
                message += `跳过: ${results.skipped} 个主题（已存在）\n`;
            }
            if (results.errors.length > 0) {
                message += `错误: ${results.errors.length} 个\n${results.errors.join('\n')}`;
            }
            
            alert(message);
            
            if (results.imported > 0) {
                const updatedThemes = customThemeManager.getAllThemes();
                const latestTheme = updatedThemes[updatedThemes.length - 1];
                if (latestTheme) {
                    console.log('[DEBUG] Applying imported theme:', latestTheme.name);
                    dispatch(setTheme(latestTheme));
                }
            }
        } catch (error) {
            console.error('Error applying pixel theme:', error);
            console.error('Error stack:', error.stack);
            alert(`像素主题导入失败: ${error.message}`);
        }
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BilmeModal);

import {connect} from 'react-redux';
import {closeWarpthemeModal, MODAL_WARPTHEME_STORE} from '../reducers/modals';
import {setTheme} from '../reducers/theme';
import {applyTheme} from '../lib/themes/themePersistance';
import {CustomTheme, customThemeManager} from '../lib/themes/custom-themes';
import WarpthemeModal from '../components/bl-bilme/warptheme-modal.jsx';

const mapStateToProps = state => ({
    visible: state.scratchGui.modals[MODAL_WARPTHEME_STORE]
});

const mapDispatchToProps = dispatch => ({
    onClose: () => {
        dispatch(closeWarpthemeModal());
    },
    onThemeApply: async themeData => {
        try {
            console.log('Applying WarpTheme:', themeData);
            
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
                themeConfig.name = 'WarpTheme';
                console.log('Added default name: WarpTheme');
            }
            
            if (!themeConfig.gui) {
                themeConfig.gui = 'light';
                console.log('Added default gui: light');
            }
            
            if (!themeConfig.blocks) {
                themeConfig.blocks = 'three';
                console.log('Added default blocks: three');
            }
            
            const customTheme = CustomTheme.import(themeConfig);
            console.log('Custom theme created:', customTheme);
            
            applyTheme(customTheme);
            console.log('Theme applied to DOM');
            
            dispatch(setTheme(customTheme));
            console.log('Theme update dispatched');
            
            dispatch(closeWarpthemeModal());
            
            console.log('Theme applied successfully');
        } catch (error) {
            console.error('Error applying WarpTheme:', error);
            console.error('Error stack:', error.stack);
            alert(`主题应用失败: ${error.message}`);
        }
    },
    onPixelThemeApply: async theme => {
        try {
            console.log('[DEBUG] onPixelThemeApply called for:', theme.name, 'UUID:', theme.uuid);
            
            dispatch(closeWarpthemeModal());
            
            // 尝试使用导出API获取完整的像素主题数据（不使用平台参数）
            // 通过同源代理 /api/warptheme/* 避免跨域 CORS 失败
            const response = await fetch(
                `/api/warptheme/api/theme/export?uuid=${theme.uuid}`
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                console.warn('Export API failed, trying fallback:', errorText);
                
                // 如果导出API失败，尝试直接使用主题列表中的数据
                const themeData = {
                    themes: [{
                        name: theme.name,
                        colors: theme.colors,
                        gui: 'light',
                        blocks: 'three'
                    }]
                };
                
                console.log('[DEBUG] Importing pixel theme from list data');
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
                
                return;
            }
            
            const themeData = await response.json();
            
            console.log('[DEBUG] Importing pixel theme data from export API');
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
)(WarpthemeModal);

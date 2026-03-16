import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl, intlShape } from 'react-intl';
import UpdateLogModalComponent from '../components/update-log/update-log-modal.jsx';
import {
    checkForUpdate,
    shouldShowUpdateLog,
    getCurrentVersion,
    getCurrentDate,
    markVersionAsSeen
} from '../lib/version-manager.js';
import { ACCENT_MAP } from '../lib/themes/accents';

const UpdateLogModalContainer = ({ intl, theme }) => {
    const [visible, setVisible] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [themeColors, setThemeColors] = useState({});

    useEffect(() => {
        // 从主题中提取颜色
        if (theme) {
            let guiColors = {};
            
            // 检查theme是否有getGuiColors方法（Theme实例）
            if (typeof theme.getGuiColors === 'function') {
                guiColors = theme.getGuiColors();
                console.log('=== 从Theme实例获取颜色 ===');
                console.log('主题accent:', theme.accent);
                console.log('主题gui:', theme.gui);
                console.log('主题blocks:', theme.blocks);
            } 
            // 或者直接从accent配置获取
            else if (theme.accent) {
                const accentName = theme.accent.toLowerCase();
                const accentConfig = ACCENT_MAP[accentName];
                if (accentConfig && accentConfig.accent && accentConfig.accent.guiColors) {
                    guiColors = accentConfig.accent.guiColors;
                    console.log('=== 从accent配置获取颜色 ===');
                    console.log('主题accent:', theme.accent);
                }
            }
            
            console.log('获取的颜色:', guiColors);
            
            // 尝试不同的颜色键名，确保能获取到主色调
            let primaryColor = guiColors['motion-primary'] || 
                              guiColors['looks-secondary'] || 
                              guiColors['extensions-primary'] || 
                              guiColors['accent-primary'] ||
                              '#9966ff';
            
            let secondaryColor = guiColors['motion-tertiary'] || 
                                guiColors['looks-tertiary'] || 
                                guiColors['extensions-tertiary'] || 
                                guiColors['accent-secondary'] ||
                                '#8a4fff';
            
            setThemeColors({
                'motion-primary': primaryColor,
                'motion-tertiary': secondaryColor
            });
            
            console.log('=== 主题色提取结果 ===');
            console.log('主色调:', primaryColor);
            console.log('次色调:', secondaryColor);
        }
    }, [theme]);

    useEffect(() => {
        const checkUpdate = async () => {
            try {
                setIsLoading(true);
                
                const currentVersion = getCurrentVersion();
                console.log('=== 检查更新 ===');
                console.log('当前版本:', currentVersion);
                console.log('上次查看版本:', localStorage.getItem('remixwarp_last_seen_version'));
                console.log('不再显示:', localStorage.getItem('remixwarp_dont_show_updates'));
                
                // 检查是否应该显示更新日志
                if (shouldShowUpdateLog(currentVersion)) {
                    console.log('✓ 满足显示条件');
                    
                    // 获取版本历史
                    const versionHistory = localStorage.getItem('remixwarp_version_history');
                    let versions = [];
                    
                    if (versionHistory) {
                        try {
                            versions = JSON.parse(versionHistory);
                            console.log('版本历史数量:', versions.length);
                        } catch (e) {
                            console.error('解析版本历史失败:', e);
                            versions = [];
                        }
                    }
                    
                    // 如果没有版本历史，创建一个默认版本
                    if (versions.length === 0) {
                        console.log('创建默认版本记录');
                        versions = [{
                            version: currentVersion,
                            date: getCurrentDate(),
                            changes: [
                                { type: 'feature', text: '新增：版本更新日志功能' },
                                { type: 'improvement', text: '优化：提升编辑器性能' }
                            ],
                            createdAt: new Date().toISOString()
                        }];
                        
                        // 保存到 localStorage
                        localStorage.setItem('remixwarp_version_history', JSON.stringify(versions));
                    }
                    
                    // 按版本号排序（从新到旧）
                    versions.sort((a, b) => {
                        const v1 = a.version.split('.').map(Number);
                        const v2 = b.version.split('.').map(Number);
                        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
                            const num1 = v1[i] || 0;
                            const num2 = v2[i] || 0;
                            if (num1 !== num2) return num2 - num1;
                        }
                        return 0;
                    });
                    
                    console.log('显示的版本:', versions.map(v => v.version));
                    
                    setUpdateInfo({
                        versions
                    });
                    setVisible(true);
                } else {
                    console.log('✗ 不满足显示条件');
                }
            } catch (error) {
                console.error('检查更新失败:', error);
            } finally {
                setIsLoading(false);
            }
        };

        // 延迟检查，确保应用完全加载
        const timer = setTimeout(() => {
            checkUpdate();
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setVisible(false);
        // 标记当前版本为已查看（最新版本）
        if (updateInfo && updateInfo.versions && updateInfo.versions.length > 0) {
            markVersionAsSeen();
            console.log('已标记版本为已查看:', updateInfo.versions[0].version);
        }
    };

    // 如果没有更新信息或不应该显示，返回 null
    if (!visible || !updateInfo || !updateInfo.versions || updateInfo.versions.length === 0) {
        return null;
    }

    return (
        <UpdateLogModalComponent
            visible={visible}
            onClose={handleClose}
            versions={updateInfo.versions}
            themeColors={themeColors}
        />
    );
};

UpdateLogModalContainer.propTypes = {
    intl: intlShape.isRequired,
    theme: PropTypes.object
};

const mapStateToProps = state => ({
    theme: state.scratchGui.theme.theme
});

const mapDispatchToProps = () => ({});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(UpdateLogModalContainer));

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl, intlShape } from 'react-intl';
import UpdateLogModalComponent from '../components/update-log/update-log-modal.jsx';
import {
    checkForUpdate,
    getCurrentVersion,
    getLastSeenVersion,
    markVersionAsSeen,
    storeCurrentUrl,
    hasUrlChanged,
    translateChanges
} from '../lib/version-manager.js';
import { ACCENT_MAP } from '../lib/themes/accents';

const UpdateLogModalContainer = ({ intl, theme, locale }) => {
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
                
                console.log('=== 检查更新 ===');
                console.log('当前 URL:', window.location.href);
                console.log('上次查看版本:', getLastSeenVersion());
                console.log('当前存储版本:', getCurrentVersion());
                console.log('不再显示:', localStorage.getItem('remixwarp_dont_show_updates'));
                
                // 使用新的 checkForUpdate 函数获取更新信息
                const info = await checkForUpdate(locale);
                
                if (info && info.hasUpdate && info.versions && info.versions.length > 0) {
                    console.log('获取到更新信息:', info.versions.length, '个版本');
                    console.log('显示的版本:', info.versions.map(v => v.version));
                    console.log('当前 URL:', info.url);
                    console.log('URL 是否变化:', info.isUrlChanged);

                    // 根据语言设置翻译更新内容
                    const translatedVersions = info.versions.map(version => ({
                        ...version,
                        changes: translateChanges(version.changes, locale)
                    }));

                    setUpdateInfo({
                        versions: translatedVersions,
                        currentVersion: info.currentVersion,
                        lastVersion: info.lastVersion
                    });
                    setVisible(true);
                } else {
                    console.log('没有获取到更新信息或无需显示更新');
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
    }, [locale]);

    const handleClose = () => {
        setVisible(false);
        // 标记当前版本为已查看
        markVersionAsSeen();
        console.log('已标记版本为已查看');
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
            locale={locale}
        />
    );
};

UpdateLogModalContainer.propTypes = {
    intl: intlShape.isRequired,
    theme: PropTypes.object,
    locale: PropTypes.string
};

const mapStateToProps = state => ({
    theme: state.scratchGui.theme.theme,
    locale: state.locales.locale
});

const mapDispatchToProps = () => ({});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(UpdateLogModalContainer));

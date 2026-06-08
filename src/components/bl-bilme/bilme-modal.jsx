import PropTypes from 'prop-types';
import React, {useState, useEffect, useMemo} from 'react';
import {defineMessages, injectIntl, intlShape, FormattedMessage} from 'react-intl';
import {Search, Heart, Download, ExternalLink} from 'lucide-react';

import Modal from '../../containers/windowed-modal.jsx';
import Box from '../box/box.jsx';
import Spinner from '../spinner/spinner.jsx';

import styles from './bilme-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Bilme Marketplace',
        description: 'Title of the Bilme marketplace modal',
        id: 'bl.bilme.title'
    },
    searchPlaceholder: {
        defaultMessage: 'Search themes...',
        description: 'Placeholder text for search input',
        id: 'bl.bilme.searchPlaceholder'
    },
    sortBy: {
        defaultMessage: 'Sort by',
        description: 'Label for sort dropdown',
        id: 'bl.bilme.sortBy'
    },
    newest: {
        defaultMessage: 'Newest',
        description: 'Sort option for newest themes',
        id: 'bl.bilme.newest'
    },
    likes: {
        defaultMessage: 'Most Liked',
        description: 'Sort option for most liked themes',
        id: 'bl.bilme.likes'
    },
    name: {
        defaultMessage: 'Name',
        description: 'Sort option for alphabetical by name',
        id: 'bl.bilme.name'
    },
    allPlatforms: {
        defaultMessage: 'All Platforms',
        description: 'Filter option for all platforms',
        id: 'bl.bilme.allPlatforms'
    },
    RemixWarp: {
        defaultMessage: 'RemixWarp',
        description: 'Platform filter for RemixWarp',
        id: 'bl.bilme.RemixWarp'
    },
    allColors: {
        defaultMessage: 'All Colors',
        description: 'Filter option for all colors',
        id: 'bl.bilme.allColors'
    },
    red: {
        defaultMessage: 'Red',
        description: 'Color filter for red',
        id: 'bl.bilme.red'
    },
    orange: {
        defaultMessage: 'Orange',
        description: 'Color filter for orange',
        id: 'bl.bilme.orange'
    },
    yellow: {
        defaultMessage: 'Yellow',
        description: 'Color filter for yellow',
        id: 'bl.bilme.yellow'
    },
    green: {
        defaultMessage: 'Green',
        description: 'Color filter for green',
        id: 'bl.bilme.green'
    },
    blue: {
        defaultMessage: 'Blue',
        description: 'Color filter for blue',
        id: 'bl.bilme.blue'
    },
    purple: {
        defaultMessage: 'Purple',
        description: 'Color filter for purple',
        id: 'bl.bilme.purple'
    },
    login: {
        defaultMessage: 'Sign In',
        description: 'Button to sign in',
        id: 'bl.bilme.login'
    },
    logout: {
        defaultMessage: 'Sign Out',
        description: 'Button to sign out',
        id: 'bl.bilme.logout'
    },
    createTheme: {
        defaultMessage: 'Create Theme',
        description: 'Button to create a new theme',
        id: 'bl.bilme.createTheme'
    },
    noThemes: {
        defaultMessage: 'No themes found',
        description: 'Message shown when no themes match filters',
        id: 'bl.bilme.noThemes'
    },
    loading: {
        defaultMessage: 'Loading themes...',
        description: 'Loading message',
        id: 'bl.bilme.loading'
    },
    error: {
        defaultMessage: 'Failed to load themes',
        description: 'Error message when themes fail to load',
        id: 'bl.bilme.error'
    },
    likesCount: {
        defaultMessage: '{count} likes',
        description: 'Label for like count',
        id: 'bl.bilme.likesCount'
    },
    downloadsCount: {
        defaultMessage: '{count} downloads',
        description: 'Label for download count',
        id: 'bl.bilme.downloadsCount'
    },
    applyTheme: {
        defaultMessage: 'Apply',
        description: 'Button to apply a theme',
        id: 'bl.bilme.applyTheme'
    },
    downloadTheme: {
        defaultMessage: 'Download Theme',
        description: 'Button to download a theme',
        id: 'bl.bilme.downloadTheme'
    },
    openInBilme: {
        defaultMessage: 'Open in Bilme',
        description: 'Button to open theme in Bilme website',
        id: 'bl.bilme.openInBilme'
    }
});

const COLORS = [
    {id: 'all', label: 'All Colors'},
    {id: 'red', label: 'Red'},
    {id: 'orange', label: 'Orange'},
    {id: 'yellow', label: 'Yellow'},
    {id: 'green', label: 'Green'},
    {id: 'blue', label: 'Blue'},
    {id: 'purple', label: 'Purple'}
];

const PLATFORMS = [
    {id: 'all', label: 'All Platforms'},
    {id: 'RemixWarp', label: 'RemixWarp'},
];

// Helper functions for color analysis
const hexToRgb = hex => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const rgbToHue = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    if (max !== min) {
        if (max === r) {
            hue = (g - b) / (max - min) + (g < b ? 6 : 0);
        } else if (max === g) {
            hue = (b - r) / (max - min) + 2;
        } else {
            hue = (r - g) / (max - min) + 4;
        }
        hue *= 60;
    }
    return hue < 0 ? hue + 360 : hue;
};

const rgbToSaturation = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;
    if (max === min) return 0;
    return lightness > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
};

const rgbToLightness = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return (max + min) / 2;
};

const colorMatchesCategory = (hexColor, category) => {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return false;
    
    const hue = rgbToHue(rgb.r, rgb.g, rgb.b);
    const saturation = rgbToSaturation(rgb.r, rgb.g, rgb.b);
    const lightness = rgbToLightness(rgb.r, rgb.g, rgb.b);
    
    // Skip very dark or very light/unsaturated colors
    if (lightness < 0.15 || lightness > 0.95 || saturation < 0.1) {
        return false;
    }
    
    switch (category.toLowerCase()) {
    case 'red':
        return (hue >= 345 || hue < 15) && saturation > 0.2;
    case 'orange':
        return hue >= 15 && hue < 45 && saturation > 0.2;
    case 'yellow':
        return hue >= 45 && hue < 65 && saturation > 0.3;
    case 'green':
        return hue >= 65 && hue < 155 && saturation > 0.2;
    case 'blue':
        return hue >= 155 && hue < 260 && saturation > 0.2;
    case 'purple':
        return hue >= 260 && hue < 300 && saturation > 0.2;
    case 'pink':
        return hue >= 300 && hue < 345 && saturation > 0.2;
    default:
        return false;
    }
};

const themeHasColor = (theme, colorName) => {
    if (!theme.colors) return false;
    
    try {
        let gradientColors = null;
        if (theme.colors.gradient && Array.isArray(theme.colors.gradient)) {
            gradientColors = theme.colors.gradient;
        } else if (theme.colors.accent && theme.colors.accent.colors && Array.isArray(theme.colors.accent.colors)) {
            gradientColors = theme.colors.accent.colors;
        }
        
        if (gradientColors) {
            return gradientColors.some(c => colorMatchesCategory(c.color, colorName));
        }
    } catch (e) {
        console.debug('Failed to parse gradient data:', e);
    }
    return false;
};

const BilmeModal = props => {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [colorFilter, setColorFilter] = useState('all');
    const [popupPosition, setPopupPosition] = useState({top: 0, left: 0, visible: false, theme: null});

    // Fetch themes from Bilme API
    useEffect(() => {
        const fetchThemes = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('https://theme.bilup.org/api/themes');
                if (!response.ok) throw new Error('Failed to fetch themes');
                const data = await response.json();
                setThemes(data.themes || []);
            } catch (err) {
                console.error('Error fetching themes:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchThemes();
    }, []);

    // Filter and sort themes
    const filteredThemes = useMemo(() => {
        let result = [...themes];
        
        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(theme =>
                theme.name.toLowerCase().includes(query) ||
                theme.description?.toLowerCase().includes(query) ||
                theme.authorName.toLowerCase().includes(query)
            );
        }
        
        // Filter by platform
        if (platformFilter !== 'all') {
            result = result.filter(theme => theme.platform === platformFilter);
        }
        
        // Filter by color
        if (colorFilter !== 'all') {
            result = result.filter(theme => themeHasColor(theme, colorFilter));
        }
        
        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
            case 'likes':
                return b.likes - a.likes;
            case 'name':
                return a.name.localeCompare(b.name);
            case 'newest':
            default:
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });
        
        return result;
    }, [themes, searchQuery, platformFilter, colorFilter, sortBy]);

    const handleCreateTheme = () => {
        window.open('https://theme.bilup.org', '_blank');
    };

    const handleOpenInBilme = theme => {
        const slug = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        window.open(`https://theme.bilup.org/themes/${theme.author}/${slug}`, '_blank');
    };

    const handleDownloadTheme = async theme => {
        try {
            const response = await fetch(
                `https://theme.bilup.org/api/theme/export?uuid=${theme.uuid}&platform=bilup`
            );
            
            if (!response.ok) {
                throw new Error(`Failed to fetch theme: ${response.status}`);
            }
            
            const themeData = await response.json();
            
            // 设置必要的默认值
            if (!themeData.name) {
                themeData.name = theme.name;
            }
            if (!themeData.gui) {
                themeData.gui = 'light';
            }
            if (!themeData.blocks) {
                themeData.blocks = 'three';
            }
            
            // 创建下载链接
            const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${theme.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading theme:', error);
            alert(`下载主题失败: ${error.message}`);
        }
    };

    const isPixelTheme = themeName => {
        const pixelKeywords = ['像素主题', '像素', 'RW', 'pixel', 'Pixel Theme'];
        const lowerName = themeName.toLowerCase();
        return pixelKeywords.some(keyword => lowerName.includes(keyword.toLowerCase()));
    };

    const handleMouseEnter = (e, theme) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const popupWidth = 900;
        const popupHeight = 24 * 4 + 4 * 3 + 8 * 2; // 4 segments * 24px + 3 gaps * 4px + 2 padding * 4px
        
        let left = rect.left + rect.width / 2 - popupWidth / 2;
        let top = rect.top - popupHeight - 8;
        
        // 确保弹出框在视口内
        left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));
        top = Math.max(10, top);
        
        // 判断是否是深色主题
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark' || 
                           document.documentElement.classList.contains('theme-dark');
        
        setPopupPosition({top, left, visible: true, theme, isDarkTheme});
    };

    const handleMouseLeave = () => {
        setPopupPosition(prev => ({...prev, visible: false}));
    };

    const handleApplyTheme = async theme => {
        try {
            console.log('Applying theme:', theme.name, 'UUID:', theme.uuid);
            
            // 检测是否为像素主题
            if (isPixelTheme(theme.name)) {
                console.log('Detected pixel theme, opening pixel editor');
                if (props.onPixelThemeApply) {
                    props.onPixelThemeApply(theme);
                } else {
                    console.error('[ERROR] onPixelThemeApply is not defined!');
                    alert('像素主题导入功能不可用');
                }
                return;
            }
            
            if (props.onThemeApply) {
                
                const response = await fetch(
                    `https://theme.bilup.org/api/theme/export?uuid=${theme.uuid}&platform=bilup`
                );
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch theme: ${response.status} ${response.statusText} - ${errorText}`);
                }
                
                const themeData = await response.json();
                console.log('Theme data received:', themeData);
                
                // 验证主题数据格式
                if (!themeData || typeof themeData !== 'object') {
                    throw new Error('Invalid theme data format');
                }
                
                // 检查是否缺少必要属性，如果缺少则从原始主题数据中获取
                if (!themeData.name) {
                    themeData.name = theme.name;
                    console.log('Added missing name from theme object');
                }
                
                if (!themeData.gui) {
                    themeData.gui = 'light'; // 默认使用 light GUI
                    console.log('Added default gui: light');
                }
                
                if (!themeData.blocks) {
                    themeData.blocks = 'three'; // 默认使用 three blocks
                    console.log('Added default blocks: three');
                }
                
                console.log('Final theme data:', themeData);
                
                props.onThemeApply(themeData);
            }
        } catch (err) {
            console.error('Error applying theme:', err);
            console.error('Error stack:', err.stack);
            // 显示错误提示
            alert(`主题应用失败: ${err.message}`);
        }
    };

    const getGradientStyle = theme => {
        if (!theme.colors?.gradient) return {};
    
        // 检查是否为像素主题
        if (isPixelTheme(theme.name)) {
            // 尝试从主题数据中提取像素数据
            let pixelData = null;
            
            // 检查是否有伪装的像素数据
            if (theme.colors.gradient && theme.colors.gradient.length > 0) {
                const firstColor = theme.colors.gradient[0].color;
                if (firstColor && typeof firstColor === 'string' && firstColor.startsWith('PIXEL:')) {
                    // 解析像素数据
                    try {
                        const pixelString = firstColor.substring(6);
                        pixelData = pixelString.split(';').map(row => row.split(','));
                    } catch (e) {
                        console.error('Failed to parse pixel data:', e);
                    }
                }
            }
            
            // 如果有像素数据，生成像素预览
            if (pixelData && pixelData.length > 0) {
                // 创建Canvas来生成预览图
                const canvas = document.createElement('canvas');
                // 预览图高度为24px（编辑器菜单栏高度），按比例计算宽度
                const previewHeight = 24;
                const scale = previewHeight / pixelData.length;
                const previewWidth = Math.floor(pixelData[0].length * scale);
                
                canvas.width = previewWidth;
                canvas.height = previewHeight;
                const ctx = canvas.getContext('2d');
                
                // 绘制像素数据
                for (let y = 0; y < pixelData.length; y++) {
                    for (let x = 0; x < pixelData[y].length; x++) {
                        const color = pixelData[y][x];
                        if (color) {
                            ctx.fillStyle = color;
                            ctx.fillRect(Math.floor(x * scale), Math.floor(y * scale), Math.ceil(scale), Math.ceil(scale));
                        }
                    }
                }
                
                return {
                    background: `url(${canvas.toDataURL('image/png')})`,
                    backgroundSize: 'auto 100%',
                    backgroundPosition: 'left center',
                    backgroundRepeat: 'repeat-x'
                };
            }
            
            // 回退到简单的像素风格背景
            let primaryColor = '#ff6b6b';
            if (theme.colors.gradient && theme.colors.gradient.length > 0) {
                primaryColor = theme.colors.gradient[0].color?.startsWith('PIXEL:') ? '#ff6b6b' : theme.colors.gradient[0].color;
            }
            
            return {
                background: `
                    repeating-linear-gradient(
                        0deg,
                        ${primaryColor} 0px,
                        ${primaryColor} 2px,
                        rgba(0,0,0,0.3) 2px,
                        rgba(0,0,0,0.3) 4px
                    ),
                    repeating-linear-gradient(
                        90deg,
                        ${primaryColor} 0px,
                        ${primaryColor} 2px,
                        rgba(0,0,0,0.3) 2px,
                        rgba(0,0,0,0.3) 4px
                    )
                `,
                backgroundSize: '8px 8px'
            };
        }
    
        const sortedColors = [...theme.colors.gradient].sort((a, b) => a.position - b.position);
        const gradientStops = sortedColors.map(c => `${c.color} ${c.position}%`).join(', ');
    
        const direction = theme.colors.gradientDirection || 135;
    
        return {
            background: `linear-gradient(${direction}deg, ${gradientStops})`
        };
    };

    return (
        <Modal
            className={styles.modalContent}
            contentLabel={props.intl.formatMessage(messages.title)}
            id="bilmeModal"
            fullScreen
            onRequestClose={props.onClose}
            visible={props.visible}
        >
            <Box className={styles.container}>
                {/* Filters */}
                <div className={styles.filters}>
                    <div className={styles.searchBox}>
                        <Search
                            size={18}
                            className={styles.searchIcon}
                        />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={props.intl.formatMessage(messages.searchPlaceholder)}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className={styles.filterGroup}>
                        <select
                            className={styles.select}
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                        >
                            <option value="newest">{props.intl.formatMessage(messages.newest)}</option>
                            <option value="likes">{props.intl.formatMessage(messages.likes)}</option>
                            <option value="name">{props.intl.formatMessage(messages.name)}</option>
                        </select>
                        
                        <select
                            className={styles.select}
                            value={platformFilter}
                            onChange={e => setPlatformFilter(e.target.value)}
                        >
                            {PLATFORMS.map(p => (
                                <option
                                    key={p.id}
                                    value={p.id}
                                >
                                    {p.id === 'all' ? props.intl.formatMessage(messages.allPlatforms) :
                                        props.intl.formatMessage(messages.RemixWarp)}
                                </option>
                            ))}
                        </select>
                        
                        <select
                            className={styles.select}
                            value={colorFilter}
                            onChange={e => setColorFilter(e.target.value)}
                        >
                            {COLORS.map(c => (
                                <option
                                    key={c.id}
                                    value={c.id}
                                >
                                    {c.id === 'all' ? props.intl.formatMessage(messages.allColors) :
                                        c.id === 'red' ? props.intl.formatMessage(messages.red) :
                                            c.id === 'orange' ? props.intl.formatMessage(messages.orange) :
                                                c.id === 'yellow' ? props.intl.formatMessage(messages.yellow) :
                                                    c.id === 'green' ? props.intl.formatMessage(messages.green) :
                                                        c.id === 'blue' ? props.intl.formatMessage(messages.blue) :
                                                            props.intl.formatMessage(messages.purple)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Themes Grid */}
                <div className={styles.themesGrid}>
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <Spinner large />
                            <p className={styles.loadingText}>
                                <FormattedMessage {...messages.loading} />
                            </p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorContainer}>
                            <p className={styles.errorText}>
                                <FormattedMessage {...messages.error} />
                            </p>
                        </div>
                    ) : filteredThemes.length === 0 ? (
                        <div className={styles.noThemesContainer}>
                            <p className={styles.noThemesText}>
                                <FormattedMessage {...messages.noThemes} />
                            </p>
                        </div>
                    ) : (
                        filteredThemes.map(theme => (
                            <div
                                key={theme.uuid}
                                className={styles.themeCard}
                                data-name={theme.name}
                                data-platform={theme.platform}
                                onMouseEnter={isPixelTheme(theme.name) ? e => handleMouseEnter(e, theme) : undefined}
                                onMouseLeave={isPixelTheme(theme.name) ? handleMouseLeave : undefined}
                            >
                                <div
                                    className={styles.themeHeader}
                                >
                                    {/* 像素主题预览 */}
                                    {isPixelTheme(theme.name) ? (
                                        <div className={styles.pixelPreviewWrapper}>
                                            <div 
                                                className={styles.pixelPreview}
                                                style={getGradientStyle(theme)}
                                            />
                                        </div>
                                    ) : (
                                        <div style={getGradientStyle(theme)} className={styles.gradientPreview} />
                                    )}
                                    
                                    {isPixelTheme(theme.name) && (
                                        <div className={styles.pixelBadge}>
                                            <svg t="1780839989942" className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                                                <path d="M983.04 0H40.96A40.917333 40.917333 0 0 0 0 40.96v942.08a40.917333 40.917333 0 0 0 40.96 40.96h942.08a40.96 40.96 0 0 0 40.96-40.96V40.96a40.96 40.96 0 0 0-40.96-40.96z m-51.2 931.84H92.16V92.16h839.68v839.68z" fill="white" opacity="0.9"></path>
                                                <path d="M512 151.552h367.018667v367.018667H512V151.552zM151.552 512h367.018667v367.018667H151.552V512z" fill="#ff6b6b"></path>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.themeContent}>
                                    <h3 className={styles.themeName}>{theme.name}</h3>
                                    <p className={styles.themeAuthor}>by {theme.authorName}</p>
                                    {theme.description && (
                                        <p className={styles.themeDescription}>{theme.description}</p>
                                    )}
                                    <div className={styles.themeStats}>
                                        <div className={styles.stat}>
                                            <Heart size={14} />
                                            <span>{theme.likes}</span>
                                        </div>
                                        <div className={styles.stat}>
                                            <Download size={14} />
                                            <span>{theme.downloads}</span>
                                        </div>
                                    </div>
                                    <div className={styles.themeActions}>
                                        <button
                                            className={styles.applyBtn}
                                            onClick={() => handleApplyTheme(theme)}
                                        >
                                            <FormattedMessage {...messages.applyTheme} />
                                        </button>
                                        <button
                                            className={styles.downloadBtn}
                                            onClick={() => handleDownloadTheme(theme)}
                                            title={props.intl.formatMessage(messages.downloadTheme)}
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            className={styles.openBtn}
                                            onClick={() => handleOpenInBilme(theme)}
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <button
                    className={styles.floatingCreateBtn}
                    onClick={handleCreateTheme}
                    title={props.intl.formatMessage(messages.createTheme)}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                {popupPosition.visible && popupPosition.theme && (
                    <div 
                        className={styles.pixelPreviewPopup}
                        style={{
                            top: popupPosition.top,
                            left: popupPosition.left,
                            opacity: popupPosition.visible ? 1 : 0,
                            visibility: popupPosition.visible ? 'visible' : 'hidden',
                            background: popupPosition.isDarkTheme ? '#111111' : '#ffffff',
                            border: popupPosition.isDarkTheme ? '1px solid #333333' : '1px solid #e0e0e0'
                        }}
                    >
                        <div className={styles.previewSegment} style={getGradientStyle(popupPosition.theme)} />
                        <div className={styles.previewSegment} style={getGradientStyle(popupPosition.theme)} />
                        <div className={styles.previewSegment} style={getGradientStyle(popupPosition.theme)} />
                        <div className={styles.previewSegment} style={getGradientStyle(popupPosition.theme)} />
                    </div>
                )}
            </Box>
        </Modal>
    );
};

BilmeModal.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func.isRequired,
    onThemeApply: PropTypes.func,
    visible: PropTypes.bool
};

export default injectIntl(BilmeModal);
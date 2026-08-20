import PropTypes from 'prop-types';
import React, {useState, useEffect, useMemo, useRef} from 'react';
import ReactDOM from 'react-dom';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {Search, Heart, Download, ExternalLink} from 'lucide-react';

import Modal from '../../containers/windowed-modal.jsx';
import Box from '../box/box.jsx';
import Spinner from '../spinner/spinner.jsx';

import styles from './bilme-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'WarpTheme Store',
        description: 'Title of the WarpTheme store modal',
        id: 'bl.warptheme.title'
    },
    searchPlaceholder: {
        defaultMessage: 'Search themes...',
        description: 'Placeholder text for search input',
        id: 'bl.warptheme.searchPlaceholder'
    },
    newest: {
        defaultMessage: 'Newest',
        description: 'Sort option for newest themes',
        id: 'bl.warptheme.newest'
    },
    likes: {
        defaultMessage: 'Most Liked',
        description: 'Sort option for most liked themes',
        id: 'bl.warptheme.likes'
    },
    name: {
        defaultMessage: 'Name',
        description: 'Sort option for alphabetical by name',
        id: 'bl.warptheme.name'
    },
    allPlatforms: {
        defaultMessage: 'All Platforms',
        description: 'Filter option for all platforms',
        id: 'bl.warptheme.allPlatforms'
    },
    RemixWarp: {
        defaultMessage: 'RemixWarp',
        description: 'Platform filter for RemixWarp',
        id: 'bl.warptheme.RemixWarp'
    },
    allColors: {
        defaultMessage: 'All Colors',
        description: 'Filter option for all colors',
        id: 'bl.warptheme.allColors'
    },
    red: {
        defaultMessage: 'Red',
        description: 'Color filter for red',
        id: 'bl.warptheme.red'
    },
    orange: {
        defaultMessage: 'Orange',
        description: 'Color filter for orange',
        id: 'bl.warptheme.orange'
    },
    yellow: {
        defaultMessage: 'Yellow',
        description: 'Color filter for yellow',
        id: 'bl.warptheme.yellow'
    },
    green: {
        defaultMessage: 'Green',
        description: 'Color filter for green',
        id: 'bl.warptheme.green'
    },
    blue: {
        defaultMessage: 'Blue',
        description: 'Color filter for blue',
        id: 'bl.warptheme.blue'
    },
    purple: {
        defaultMessage: 'Purple',
        description: 'Color filter for purple',
        id: 'bl.warptheme.purple'
    },
    createTheme: {
        defaultMessage: 'Create Theme',
        description: 'Button to create a new theme',
        id: 'bl.warptheme.createTheme'
    },
    noThemes: {
        defaultMessage: 'No themes found',
        description: 'Message shown when no themes match filters',
        id: 'bl.warptheme.noThemes'
    },
    loading: {
        defaultMessage: 'Loading themes...',
        description: 'Loading message',
        id: 'bl.warptheme.loading'
    },
    error: {
        defaultMessage: 'Failed to load themes',
        description: 'Error message when themes fail to load',
        id: 'bl.warptheme.error'
    },
    likesCount: {
        defaultMessage: '{count} likes',
        description: 'Label for like count',
        id: 'bl.warptheme.likesCount'
    },
    downloadsCount: {
        defaultMessage: '{count} downloads',
        description: 'Label for download count',
        id: 'bl.warptheme.downloadsCount'
    },
    applyTheme: {
        defaultMessage: 'Apply',
        description: 'Button to apply a theme',
        id: 'bl.warptheme.applyTheme'
    },
    downloadTheme: {
        defaultMessage: 'Download Theme',
        description: 'Button to download a theme',
        id: 'bl.warptheme.downloadTheme'
    },
    openInWarpTheme: {
        defaultMessage: 'Open in WarpTheme',
        description: 'Button to open theme in WarpTheme website',
        id: 'bl.warptheme.openInWarpTheme'
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

const getGradientStyle = theme => {
    if (!theme || !theme.colors) {
        return {background: '#808080'};
    }
    
    try {
        if (theme.colors.gradient && Array.isArray(theme.colors.gradient)) {
            const gradient = theme.colors.gradient;
            const stops = gradient.map((stop, index) => {
                const position = index / (gradient.length - 1) * 100;
                return `${stop.color} ${position}%`;
            }).join(', ');
            return {
                background: `linear-gradient(to right, ${stops})`
            };
        } else if (theme.colors.accent && theme.colors.accent.colors && Array.isArray(theme.colors.accent.colors)) {
            const colors = theme.colors.accent.colors;
            const stops = colors.map((stop, index) => {
                const position = index / (colors.length - 1) * 100;
                return `${stop.color} ${position}%`;
            }).join(', ');
            return {
                background: `linear-gradient(to right, ${stops})`
            };
        }
    } catch (e) {
        console.debug('Failed to get gradient style:', e);
    }
    
    return {background: '#808080'};
};

const WarpthemeModal = props => {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [colorFilter, setColorFilter] = useState('all');
    const [popupPosition, setPopupPosition] = useState({top: 0, left: 0, visible: false, theme: null, isDarkTheme: false});

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        const fetchThemes = async () => {
            if (!isMounted.current) return;
            setLoading(true);
            setError(null);
            try {
                // Use the same-origin proxy (server/worker /api/warptheme/*) so we
                // don't hit a CORS failure against warptheme.mistium.com.
                const response = await fetch('/api/warptheme/api/themes');
                if (!response.ok) throw new Error(`主题服务返回 ${response.status}`);
                // The upstream may return HTML/error pages on failure; only parse
                // when we actually got JSON to avoid a hard SyntaxError crash.
                const contentType = response.headers.get('content-type') || '';
                const text = await response.text();
                let data = {themes: []};
                if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
                    data = JSON.parse(text);
                } else {
                    throw new Error('主题服务返回了非 JSON 内容');
                }
                if (isMounted.current) {
                    setThemes(data.themes || []);
                }
            } catch (err) {
                // Degrade gracefully: show an empty gallery with a friendly
                // message instead of crashing the modal.
                console.warn('WarpTheme 主题加载失败：', err.message);
                if (isMounted.current) {
                    setThemes([]);
                    setError(err.message || '主题加载失败');
                }
            } finally {
                if (isMounted.current) {
                    setLoading(false);
                }
            }
        };

        fetchThemes();

        return () => {
            isMounted.current = false;
        };
    }, []);

    const filteredThemes = useMemo(() => {
        let result = [...themes];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(theme =>
                theme.name.toLowerCase().includes(query) ||
                theme.description?.toLowerCase().includes(query) ||
                theme.authorName.toLowerCase().includes(query)
            );
        }
        
        if (platformFilter !== 'all') {
            result = result.filter(theme => theme.platform === platformFilter);
        }
        
        if (colorFilter !== 'all') {
            result = result.filter(theme => themeHasColor(theme, colorFilter));
        }
        
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
        window.open('https://warptheme.mistium.com', '_blank');
    };

    const handleOpenInWarpTheme = theme => {
        const slug = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        window.open(`https://warptheme.mistium.com/themes/${theme.author}/${slug}`, '_blank');
    };

    const handleDownloadTheme = async theme => {
        try {
            const response = await fetch(
                `/api/warptheme/api/theme/export?uuid=${theme.uuid}&platform=remixwarp`
            );
            
            if (!response.ok) {
                throw new Error(`Failed to fetch theme: ${response.status}`);
            }
            
            const themeData = await response.json();
            
            if (!themeData.name) {
                themeData.name = theme.name;
            }
            if (!themeData.author) {
                themeData.author = theme.author;
            }
            
            const blob = new Blob([JSON.stringify(themeData, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${theme.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.theme`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading theme:', err);
            alert(props.intl.formatMessage({defaultMessage: 'Failed to download theme', id: 'bl.warptheme.downloadError'}));
        }
    };

    const handleApplyTheme = theme => {
        if (isPixelTheme(theme.name)) {
            props.onPixelThemeApply(theme);
        } else {
            props.onThemeApply(theme);
        }
    };

    const isPixelTheme = themeName => {
        const pixelKeywords = ['像素主题', '像素', 'RW', 'pixel', 'Pixel Theme'];
        const lowerName = themeName.toLowerCase();
        return pixelKeywords.some(keyword => lowerName.includes(keyword.toLowerCase()));
    };

    const handleMouseEnter = (e, theme) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const isDarkTheme = document.body.classList.contains('dark') || document.body.classList.contains('tw-dark');
        
        setPopupPosition({
            top: rect.top - 100,
            left: rect.left + rect.width / 2 - 450,
            visible: true,
            theme: theme,
            isDarkTheme: isDarkTheme
        });
    };

    const handleMouseLeave = () => {
        setPopupPosition(prev => ({...prev, visible: false}));
    };

    const getGradientStyle = theme => {
        if (!theme || !theme.colors) {
            return {background: '#808080'};
        }

        if (!theme.colors.gradient) {
            return {background: '#808080'};
        }

        if (isPixelTheme(theme.name)) {
            let pixelData = null;

            if (theme.colors.gradient && theme.colors.gradient.length > 0) {
                const firstColor = theme.colors.gradient[0].color;
                if (firstColor && typeof firstColor === 'string' && firstColor.startsWith('PIXEL:')) {
                    try {
                        const pixelString = firstColor.substring(6);
                        pixelData = pixelString.split(';').map(row => row.split(','));
                    } catch (e) {
                        console.error('Failed to parse pixel data:', e);
                    }
                }
            }

            if (pixelData && pixelData.length > 0) {
                const canvas = document.createElement('canvas');
                const previewHeight = 24;
                const scale = previewHeight / pixelData.length;
                const previewWidth = Math.floor(pixelData[0].length * scale);

                canvas.width = previewWidth;
                canvas.height = previewHeight;
                const ctx = canvas.getContext('2d');

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

        try {
            if (theme.colors.gradient && Array.isArray(theme.colors.gradient)) {
                const gradient = theme.colors.gradient;
                const stops = gradient.map((stop, index) => {
                    const position = index / (gradient.length - 1) * 100;
                    return `${stop.color} ${position}%`;
                }).join(', ');
                return {
                    background: `linear-gradient(to right, ${stops})`
                };
            } else if (theme.colors.accent && theme.colors.accent.colors && Array.isArray(theme.colors.accent.colors)) {
                const colors = theme.colors.accent.colors;
                const stops = colors.map((stop, index) => {
                    const position = index / (colors.length - 1) * 100;
                    return `${stop.color} ${position}%`;
                }).join(', ');
                return {
                    background: `linear-gradient(to right, ${stops})`
                };
            }
        } catch (e) {
            console.debug('Failed to get gradient style:', e);
        }

        return {background: '#808080'};
    };

    return (
        <Modal
            className={styles.modalContent}
            contentLabel={props.intl.formatMessage(messages.title)}
            id="warpthemeModal"
            fullScreen
            onRequestClose={props.onClose}
            visible={props.visible}
        >
            <Box className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>
                            {props.intl.formatMessage(messages.title)}
                        </h2>
                    </div>
                    <div className={styles.headerRight}>
                        <button
                            className={styles.createBtn}
                            onClick={handleCreateTheme}
                            title={props.intl.formatMessage(messages.createTheme)}
                        >
                            {props.intl.formatMessage(messages.createTheme)}
                        </button>
                    </div>
                </div>

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
                                {props.intl.formatMessage(messages.loading)}
                            </p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorContainer}>
                            <p className={styles.errorText}>
                                {props.intl.formatMessage(messages.error)}
                            </p>
                            <p className={styles.errorDetails}>{error}</p>
                        </div>
                    ) : filteredThemes.length === 0 ? (
                        <div className={styles.noThemesContainer}>
                            <p className={styles.noThemesText}>
                                {props.intl.formatMessage(messages.noThemes)}
                            </p>
                        </div>
                    ) : filteredThemes.map(theme => (
                            <div
                                key={theme.uuid}
                                className={styles.themeCard}
                                onMouseEnter={isPixelTheme(theme.name) ? e => handleMouseEnter(e, theme) : undefined}
                                onMouseLeave={isPixelTheme(theme.name) ? handleMouseLeave : undefined}
                            >
                                <div className={styles.themeHeader}>
                                    <div className={styles.gradientPreview} style={getGradientStyle(theme)} />
                                    {isPixelTheme(theme.name) && (
                                        <div className={styles.pixelIcon}>
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                                <rect x="3" y="3" width="6" height="6" rx="1"/>
                                                <rect x="15" y="3" width="6" height="6" rx="1"/>
                                                <rect x="3" y="15" width="6" height="6" rx="1"/>
                                                <rect x="15" y="15" width="6" height="6" rx="1"/>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                
                                <div className={styles.themeContent}>
                                    <h3 className={styles.themeName}>
                                        {isPixelTheme(theme.name) && <span className={styles.pixelBadge}>[像素主题]</span>}
                                        {theme.name}
                                    </h3>
                                    <p className={styles.themeAuthor}>by {theme.authorName}</p>
                                    <p className={styles.themeDescription}>{theme.description}</p>
                                </div>
                                
                                <div className={styles.themeStats}>
                                    <span className={styles.stat}>
                                        <Heart size={14} />
                                        <span>
                                            {props.intl.formatMessage(messages.likesCount, {count: theme.likes})}
                                        </span>
                                    </span>
                                    <span className={styles.stat}>
                                        <Download size={14} />
                                        <span>
                                            {props.intl.formatMessage(messages.downloadsCount, {count: theme.downloads})}
                                        </span>
                                    </span>
                                </div>
                                
                                <div className={styles.themeActions}>
                                    <button
                                        className={styles.applyBtn}
                                        onClick={() => handleApplyTheme(theme)}
                                    >
                                        {props.intl.formatMessage(messages.applyTheme)}
                                    </button>
                                    <button
                                        className={styles.downloadBtn}
                                        onClick={() => handleDownloadTheme(theme)}
                                        title={props.intl.formatMessage(messages.downloadTheme)}
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        className={styles.openBtn}
                                        onClick={() => handleOpenInWarpTheme(theme)}
                                        title={props.intl.formatMessage(messages.openInWarpTheme)}
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>

                {popupPosition.visible && popupPosition.theme && ReactDOM.createPortal(
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
                    </div>,
                    document.body
                )}
            </Box>
        </Modal>
    );
};

WarpthemeModal.propTypes = {
    intl: intlShape.isRequired,
    onClose: PropTypes.func.isRequired,
    onThemeApply: PropTypes.func.isRequired,
    visible: PropTypes.bool
};

export default injectIntl(WarpthemeModal);

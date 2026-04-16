import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';
import classNames from 'classnames';
import {PixelUtils, customThemeManager} from '../../lib/themes/custom-themes';
import {applyTheme} from '../../lib/themes/themePersistance';
import {setTheme} from '../../reducers/theme';
import WindowManager from '../../addons/window-system/window-manager';
import showAlert from '../../addons/window-system/alert';
import styles from './settings-menu.css';

const PixelEditorApp = injectIntl(props => {
    const {intl} = props;
    const [name, setName] = React.useState(props.initialName || '');
    const [description, setDescription] = React.useState(props.initialDescription || '');
    const [pixelData, setPixelData] = React.useState(props.initialPixelData || (() => {
        // 初始化像素数据为背景色
        const data = [];
        for (let y = 0; y < 24; y++) {
            const row = [];
            for (let x = 0; x < 900; x++) {
                row.push('#75c1c4');
            }
            data.push(row);
        }
        return data;
    })());
    const [primaryColor, setPrimaryColor] = React.useState(props.initialPrimaryColor || '#ff6b6b');
    const [currentColor, setCurrentColor] = React.useState('#000000');
    const [backgroundColor, setBackgroundColor] = React.useState('#75c1c4');
    const [pixelSize, setPixelSize] = React.useState(props.initialPixelSize || 10);
    const [isPreviewActive, setIsPreviewActive] = React.useState(false);
    const [gridSize, setGridSize] = React.useState({width: 900, height: 24});
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [scrollOffset, setScrollOffset] = React.useState({x: 0, y: 0});
    const [showImagePreview, setShowImagePreview] = React.useState(false);
    const [previewImage, setPreviewImage] = React.useState(null);
    const [pixelatedImage, setPixelatedImage] = React.useState(null);
    const [imageColumn, setImageColumn] = React.useState(0);
    const [selectedPosition, setSelectedPosition] = React.useState('left');
    const [hasClearedCanvas, setHasClearedCanvas] = React.useState(false);

    // 添加滚动事件监听器
    React.useEffect(() => {
        const container = document.querySelector(`.${styles.pixelCanvasContainer}`);
        if (container) {
            const handleScroll = () => {
                setScrollOffset({x: container.scrollLeft, y: container.scrollTop});
            };
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [styles.pixelCanvasContainer]);

    // 处理图片导入
    const handleImageImport = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 计算像素化后的尺寸
                const maxWidth = gridSize.width;
                const maxHeight = gridSize.height;
                const aspectRatio = img.width / img.height;
                let pixelWidth = maxWidth;
                let pixelHeight = Math.floor(pixelWidth / aspectRatio);
                
                if (pixelHeight > maxHeight) {
                    pixelHeight = maxHeight;
                    pixelWidth = Math.floor(pixelHeight * aspectRatio);
                }

                // 创建画布进行像素化处理
                const canvas = document.createElement('canvas');
                canvas.width = pixelWidth;
                canvas.height = pixelHeight;
                const ctx = canvas.getContext('2d');
                
                // 缩小绘制以获得像素化效果
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);

                // 获取像素数据
                const imageData = ctx.getImageData(0, 0, pixelWidth, pixelHeight);
                const data = imageData.data;
                const newPixelData = Array(gridSize.height).fill().map(() => Array(gridSize.width).fill(backgroundColor));

                // 转换为像素数据
                const actualPixelData = Array(pixelHeight).fill().map(() => Array(pixelWidth).fill(backgroundColor));
                for (let y = 0; y < pixelHeight; y++) {
                    for (let x = 0; x < pixelWidth; x++) {
                        const index = (y * pixelWidth + x) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        const a = data[index + 3];
                        
                        if (a > 128) { // 忽略透明像素
                            const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                            actualPixelData[y][x] = hex;
                        }
                    }
                }

                setPixelatedImage(actualPixelData);
                setPreviewImage(canvas.toDataURL('image/png'));
                setShowImagePreview(true);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    // 处理图片位置选择
    const handleImagePosition = (position) => {
        if (!pixelatedImage) return;

        // 复制现有的像素数据，而不是创建新的空白数据
        const newPixelData = JSON.parse(JSON.stringify(pixelData));
        const pixelWidth = pixelatedImage[0].length;
        const pixelHeight = pixelatedImage.length;

        let startX = 0;
        switch (position) {
            case 'left':
                startX = imageColumn;
                break;
            case 'center':
                startX = Math.floor((gridSize.width - pixelWidth) / 2);
                break;
            case 'right':
                startX = gridSize.width - pixelWidth;
                break;
        }

        // 确保startX不会为负数，且不会超过画布宽度
        startX = Math.max(0, Math.min(startX, gridSize.width - pixelWidth));

        // 垂直位置默认从顶部开始
        const startY = 0;

        // 将像素化的图片复制到现有的像素数据中
        for (let y = 0; y < pixelHeight && y + startY < gridSize.height; y++) {
            for (let x = 0; x < pixelWidth && x + startX < gridSize.width; x++) {
                // 只在像素不是透明的情况下覆盖
                if (pixelatedImage[y][x] !== backgroundColor) {
                    newPixelData[y + startY][x + startX] = pixelatedImage[y][x];
                }
            }
        }

        setPixelData(newPixelData);
        setShowImagePreview(false);
        setPreviewImage(null);
        setPixelatedImage(null);
        setImageColumn(0); // 重置插入列值
        setHasClearedCanvas(true); // 标记画布已清空
    };

    const handlePixelClick = (e, x, y) => {
        e.stopPropagation();
        const newPixelData = JSON.parse(JSON.stringify(pixelData));
        newPixelData[y][x] = currentColor;
        setPixelData(newPixelData);
    };

    const handlePixelMouseDown = (e, x, y) => {
        e.stopPropagation();
        setIsDrawing(true);
        handlePixelClick(e, x, y);
    };

    const handlePixelMouseOver = (e, x, y) => {
        e.stopPropagation();
        if (isDrawing) {
            handlePixelClick(e, x, y);
        }
    };

    const handleMouseUp = React.useCallback((e) => {
        if (e) e.stopPropagation();
        setIsDrawing(false);
    }, []);

    const handleClear = React.useCallback(() => {
        const newPixelData = Array(gridSize.height).fill().map(() => Array(gridSize.width).fill(backgroundColor));
        setPixelData(newPixelData);
        setHasClearedCanvas(true);
    }, [gridSize, backgroundColor]);

    const handleResizeGrid = React.useCallback((width, height) => {
        const newWidth = Math.max(2, Math.min(1000, width));
        const newHeight = Math.max(2, Math.min(50, height));
        setGridSize({width: newWidth, height: newHeight});
        
        // Resize pixel data
        const newPixelData = Array(newHeight).fill().map((_, y) => {
            return Array(newWidth).fill().map((_, x) => {
                if (y < pixelData.length && x < pixelData[y].length) {
                    return pixelData[y][x];
                }
                return '#ffffff';
            });
        });
        setPixelData(newPixelData);
    }, [pixelData]);

    const handlePreview = React.useCallback(async () => {
        if (isPreviewActive) {
            setIsPreviewActive(false);
            if (props.onPreview) {
                props.onPreview('', '', [], '');
            }
            return;
        }

        if (!name.trim()) {
            await showAlert(intl.formatMessage({defaultMessage: 'Please enter a theme name first', id: 'tw.customThemes.error.themeNameRequired'}));
            return;
        }

        if (props.onPreview) {
            props.onPreview(
                name,
                description,
                pixelData,
                primaryColor
            );
            setIsPreviewActive(true);
        }
    }, [isPreviewActive, name, description, pixelData, primaryColor, props.onPreview, intl]);

    const handleKeyDown = React.useCallback(e => {
        if (e.key === 'Escape' && props.onCancel) props.onCancel();
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && props.onCreate) {
            props.onCreate(name, description, pixelData, primaryColor);
        }
    }, [name, description, pixelData, primaryColor, props.onCancel, props.onCreate]);

    React.useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleKeyDown, handleMouseUp]);

    return (
        <div className={styles.pixelEditorContainer}>
            {showImagePreview && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        maxWidth: '500px',
                        width: '100%'
                    }}>
                        <h3 style={{marginTop: 0, marginBottom: '16px'}}>
                            <FormattedMessage
                                defaultMessage="Image Preview"
                                id="tw.customThemes.pixelCreator.imagePreview"
                            />
                        </h3>
                        <div style={{marginBottom: '16px', textAlign: 'center'}}>
                            {previewImage && (
                                <img 
                                    src={previewImage} 
                                    alt="Preview" 
                                    style={{maxWidth: '100%', maxHeight: '300px'}}
                                />
                            )}
                        </div>
                        <p style={{marginBottom: '16px'}}>
                            <FormattedMessage
                                defaultMessage="将像素化的图片移动到："
                                id="tw.customThemes.pixelCreator.movePixelImage"
                            />
                        </p>
                        <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px'}}>
                            <button
                                type="button"
                                className={classNames(styles.paletteBtn, selectedPosition === 'left' && styles.paletteBtnActive)}
                                onClick={() => {
                                    setSelectedPosition('left');
                                    if (pixelatedImage) {
                                        handleImagePosition('left');
                                    }
                                }}
                            >
                                <FormattedMessage
                                    defaultMessage="Left"
                                    id="tw.customThemes.pixelCreator.left"
                                />
                            </button>
                            <button
                                type="button"
                                className={classNames(styles.paletteBtn, selectedPosition === 'center' && styles.paletteBtnActive)}
                                onClick={() => {
                                    setSelectedPosition('center');
                                    if (pixelatedImage) {
                                        handleImagePosition('center');
                                    }
                                }}
                            >
                                <FormattedMessage
                                    defaultMessage="Center"
                                    id="tw.customThemes.pixelCreator.center"
                                />
                            </button>
                            <button
                                type="button"
                                className={classNames(styles.paletteBtn, selectedPosition === 'right' && styles.paletteBtnActive)}
                                onClick={() => {
                                    setSelectedPosition('right');
                                    if (pixelatedImage) {
                                        handleImagePosition('right');
                                    }
                                }}
                            >
                                <FormattedMessage
                                    defaultMessage="Right"
                                    id="tw.customThemes.pixelCreator.right"
                                />
                            </button>
                        </div>
                        <div style={{marginBottom: '16px'}}>
                            <p style={{fontSize: '12px', margin: '0 0 8px 0'}}>
                                输入的是列数，对应图片最左侧一列的列数
                            </p>
                            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                <label style={{background: '#000', color: '#fff', padding: '2px 8px', borderRadius: '4px'}}>
                                    <FormattedMessage
                                        defaultMessage="插入列"
                                        id="tw.customThemes.pixelCreator.insertColumn"
                                    />
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max={gridSize.width - 1}
                                    value={imageColumn}
                                    onChange={e => setImageColumn(parseInt(e.target.value) || 0)}
                                    className={styles.gradientInput}
                                    style={{flex: 1}}
                                />
                                <button
                                    type="button"
                                    className={styles.paletteBtn}
                                    onClick={() => {
                                        // 应用按钮点击后，将图片插入到指定位置
                                        if (pixelatedImage) {
                                            handleImagePosition(selectedPosition);
                                        }
                                    }}
                                >
                                    √
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            className={styles.paletteBtn}
                            onClick={() => {
                                setShowImagePreview(false);
                                setPreviewImage(null);
                                setPixelatedImage(null);
                            }}
                            style={{marginTop: '16px', width: '100%'}}
                        >
                            <FormattedMessage
                                defaultMessage="Cancel"
                                id="tw.customThemes.createDialog.cancel"
                            />
                        </button>
                    </div>
                </div>
            )}
            <div className={styles.pixelEditorMain}>
                <div className={styles.pixelEditorLeft}>
                    <div className={styles.gradientCreatorSection}>
                        <h3 className={styles.gradientSectionTitle}>
                            <FormattedMessage
                                defaultMessage="Theme Details"
                                id="tw.customThemes.pixelCreator.themeDetails"
                            />
                        </h3>
                        <div className={styles.formField}>
                            <label>
                                <FormattedMessage
                                    defaultMessage="Name"
                                    id="tw.customThemes.pixelDialog.name"
                                />
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={intl.formatMessage({
                                    defaultMessage: 'My Pixel Theme',
                                    id: 'tw.customThemes.placeholder.pixelName'
                                })}
                                className={styles.gradientInput}
                                maxLength={50}
                            />
                        </div>
                        <div className={styles.formField}>
                            <label>
                                <FormattedMessage
                                    defaultMessage="Description (optional)"
                                    id="tw.customThemes.createDialog.description"
                                />
                            </label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder={intl.formatMessage({defaultMessage: 'A custom pixel art theme', id: 'tw.customThemes.placeholder.pixelDescription'})}
                                className={styles.gradientTextarea}
                                maxLength={200}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className={styles.gradientCreatorSection}>
                        <h3 className={styles.gradientSectionTitle}>
                            <FormattedMessage
                                defaultMessage="Grid Settings"
                                id="tw.customThemes.pixelCreator.gridSettings"
                            />
                        </h3>
                        <div className={styles.formField}>
                            <label>
                                <FormattedMessage
                                    defaultMessage="Width"
                                    id="tw.customThemes.pixelCreator.gridWidth"
                                />
                            </label>
                            <input
                                type="number"
                                min="2"
                                max="30"
                                value={gridSize.width}
                                onChange={e => handleResizeGrid(parseInt(e.target.value), gridSize.height)}
                                className={styles.gradientInput}
                            />
                        </div>
                        <div className={styles.formField}>
                            <label>
                                <FormattedMessage
                                    defaultMessage="Height"
                                    id="tw.customThemes.pixelCreator.gridHeight"
                                />
                            </label>
                            <input
                                type="number"
                                min="2"
                                max="30"
                                value={gridSize.height}
                                onChange={e => handleResizeGrid(gridSize.width, parseInt(e.target.value))}
                                className={styles.gradientInput}
                            />
                        </div>

                    </div>
                </div>

                <div className={styles.pixelEditorRight}>
                    <div className={styles.gradientCreatorSection}>
                        <div style={{marginBottom: '16px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                <h3 className={styles.gradientSectionTitle}>
                                    <FormattedMessage
                                        defaultMessage="Pixel Editor"
                                        id="tw.customThemes.pixelCreator.pixelEditor"
                                    />
                                </h3>
                                <div style={{display: 'flex', gap: '8px'}}>
                                    <button
                                        type="button"
                                        className={styles.paletteBtn}
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    handleImageImport(file);
                                                }
                                            };
                                            input.click();
                                        }}
                                    >
                                        <FormattedMessage
                                            defaultMessage="Import Image"
                                            id="tw.customThemes.pixelCreator.importImage"
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.paletteBtn}
                                        onClick={handleClear}
                                    >
                                        <FormattedMessage
                                            defaultMessage="Clear Canvas"
                                            id="tw.customThemes.pixelCreator.clearCanvas"
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.paletteBtn}
                                        onClick={() => {
                                            const container = document.querySelector(`.${styles.pixelCanvasContainer}`);
                                            if (container) {
                                                container.scrollLeft += 25 * pixelSize;
                                            }
                                        }}
                                    >
                                        <FormattedMessage
                                            defaultMessage="Next Block"
                                            id="tw.customThemes.pixelCreator.nextBlock"
                                        />
                                    </button>
                                </div>
                            </div>
                            <p style={{fontSize: '12px', color: '#666', margin: 0}}>
                                首先要清空画布之后才能开始编辑。输入主题名称才可以创建或预览。
                            </p>
                        </div>

                        <div className={styles.pixelCanvasContainer}>
                            <div 
                                className={styles.pixelCanvas}
                                style={{
                                    width: `${gridSize.width * pixelSize}px`,
                                    height: `${gridSize.height * pixelSize}px`,
                                    position: 'relative',
                                    background: backgroundColor,
                                    marginBottom: '16px',
                                    border: 'none',
                                    borderRadius: 0
                                }}
                            >
                                {React.useMemo(() => {
                                    // 计算可见区域
                                    const container = document.querySelector(`.${styles.pixelCanvasContainer}`);
                                    if (!container) return null;

                                    const containerRect = container.getBoundingClientRect();
                                    const canvasRect = container.firstChild.getBoundingClientRect();

                                    const startX = Math.max(0, Math.floor((containerRect.left - canvasRect.left) / pixelSize));
                                    const endX = Math.min(gridSize.width, Math.ceil((containerRect.right - canvasRect.left) / pixelSize) + 1);
                                    const startY = Math.max(0, Math.floor((containerRect.top - canvasRect.top) / pixelSize));
                                    const endY = Math.min(gridSize.height, Math.ceil((containerRect.bottom - canvasRect.top) / pixelSize) + 1);

                                    const visiblePixels = [];
                                    for (let y = startY; y < endY; y++) {
                                        for (let x = startX; x < endX; x++) {
                                            const color = pixelData[y][x];
                                            visiblePixels.push(
                                                <div
                                                    key={`${x}-${y}`}
                                                    className={styles.pixel}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${x * pixelSize}px`,
                                                        top: `${y * pixelSize}px`,
                                                        width: `${pixelSize}px`,
                                                        height: `${pixelSize}px`,
                                                        background: color,
                                                        cursor: 'crosshair'
                                                    }}
                                                    onMouseDown={(e) => handlePixelMouseDown(e, x, y)}
                                                    onMouseOver={(e) => handlePixelMouseOver(e, x, y)}
                                                    onClick={(e) => handlePixelClick(e, x, y)}
                                                />
                                            );
                                        }
                                    }
                                    return visiblePixels;
                                }, [pixelData, pixelSize, gridSize, scrollOffset, handlePixelMouseDown, handlePixelMouseOver, handlePixelClick])}
                                {/* 显示清空画布提示 */}
                                {!hasClearedCanvas && (
                                    <div 
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            color: '#666',
                                            fontSize: '14px',
                                            textAlign: 'center',
                                            pointerEvents: 'none',
                                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                            padding: '10px 20px',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        请先清空画布，再进行编辑
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.colorSection}>
                            <label>
                                <FormattedMessage
                                    defaultMessage="Current Color"
                                    id="tw.customThemes.pixelCreator.currentColor"
                                />
                            </label>
                            <div className={styles.colorControls}>
                                <input
                                    type="color"
                                    value={currentColor}
                                    onChange={e => setCurrentColor(e.target.value)}
                                    className={styles.primaryColorInput}
                                />
                                <div className={styles.primaryColorValue}>
                                    <span
                                        className={styles.colorPreview}
                                        style={{background: currentColor}}
                                    />
                                    <span className={styles.colorHex}>{currentColor}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.primaryColorSection}>
                            <label>
                                <FormattedMessage
                                    defaultMessage="Primary Color (for UI accents)"
                                    id="tw.customThemes.gradientCreator.primaryColor"
                                />
                            </label>
                            <div className={styles.primaryColorPicker}>
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={e => setPrimaryColor(e.target.value)}
                                    className={styles.primaryColorInput}
                                />
                                <div className={styles.primaryColorValue}>
                                    <span
                                        className={styles.colorPreview}
                                        style={{background: primaryColor}}
                                    />
                                    <span className={styles.colorHex}>{primaryColor}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.primaryColorSection}>
                            <label>
                                <FormattedMessage
                                    defaultMessage="Background Color (for canvas fill)"
                                    id="tw.customThemes.pixelCreator.backgroundColor"
                                />
                            </label>
                            <div className={styles.primaryColorPicker}>
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={e => setBackgroundColor(e.target.value)}
                                    className={styles.primaryColorInput}
                                />
                                <div className={styles.primaryColorValue}>
                                    <span
                                        className={styles.colorPreview}
                                        style={{background: backgroundColor}}
                                    />
                                    <span className={styles.colorHex}>{backgroundColor}</span>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>

            <div className={styles.gradientCreatorFooter}>
                <button
                    className={classNames(styles.footerBtn, isPreviewActive && styles.footerBtnActive)}
                    onClick={handlePreview}
                    disabled={!name.trim()}
                    title="Apply this theme to see how it looks"
                >
                    {isPreviewActive ? (
                        <FormattedMessage
                            defaultMessage="Stop Preview"
                            id="tw.customThemes.gradientCreator.stopPreview"
                        />
                    ) : (
                        <FormattedMessage
                            defaultMessage="Preview Theme"
                            id="tw.customThemes.gradientCreator.previewTheme"
                        />
                    )}
                </button>
                <button
                    className={styles.footerBtn}
                    onClick={() => {
                        // 导出主题功能
                        if (!name.trim()) {
                            showAlert('请输入主题名称');
                            return;
                        }
                        
                        // 生成像素艺术accent
                        const pixelAccent = PixelUtils.createPixelAccent(pixelData, primaryColor, {pixelSize: 2});
                        
                        // 创建主题对象，使用与CustomTheme.export()相同的格式
                        const themeData = {
                            uuid: `custom-theme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            createdAt: new Date().toISOString(),
                            name,
                            description,
                            author: 'User',
                            accent: {
                                pixelData,
                                pixelSize: 2,
                                guiColors: pixelAccent.guiColors
                            },
                            gui: 'light',
                            blocks: 'three',
                            menuBarAlign: 'left',
                            wallpaper: null,
                            fonts: null
                        };
                        
                        // 包装成与exportAllThemes相同的格式
                        const exportData = {
                            version: '2.0',
                            platform: 'RemixWarp',
                            timestamp: Date.now(),
                            themes: [themeData]
                        };
                        
                        const dataStr = JSON.stringify(exportData, null, 2);
                        const dataBlob = new Blob([dataStr], {type: 'application/json'});
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${name.replace(/\s+/g, '_')}_pixel_theme.json`;
                        link.click();
                        URL.revokeObjectURL(url);
                    }}
                >
                    <FormattedMessage
                        defaultMessage="Export Theme"
                        id="tw.customThemes.pixelCreator.exportTheme"
                    />
                </button>
                <button
                    className={styles.footerBtn}
                    onClick={() => {
                        if (props.onCancel) props.onCancel();
                    }}
                >
                    <FormattedMessage
                        defaultMessage="Cancel"
                        id="tw.customThemes.createDialog.cancel"
                    />
                </button>
                <button
                    className={classNames(styles.footerBtn, styles.footerBtnPrimary)}
                    onClick={() => {
                        if (props.onCreate) props.onCreate(name, description, pixelData, primaryColor);
                    }}
                    disabled={!name.trim()}
                >
                    <FormattedMessage
                        defaultMessage="Create Theme"
                        id="tw.customThemes.createDialog.create"
                    />
                </button>
            </div>
        </div>
    );
});

PixelEditorApp.propTypes = {
    initialName: PropTypes.string,
    initialDescription: PropTypes.string,
    initialPixelData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)),
    initialPrimaryColor: PropTypes.string,
    initialPixelSize: PropTypes.number,
    onCancel: PropTypes.func,
    onCreate: PropTypes.func,
    onPreview: PropTypes.func,
    intl: intlShape.isRequired
};

export default PixelEditorApp;
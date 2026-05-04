import React, { useState, useEffect, useRef } from 'react';
import AddonHooks from '../../addons/hooks.js';

// 12x12 超粗像素字体，更有冲击力
const pixelFonts12x12 = {
    '0': [
        0,0,0,1,1,1,1,1,0,0,0,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,1,1,1,0,0,0,0,1,1,1,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        1,1,1,0,0,0,0,0,0,1,1,0,
        1,1,0,0,0,0,0,0,0,1,1,0,
        1,1,0,0,0,0,0,0,0,1,1,0,
        1,1,0,0,0,0,0,0,0,1,1,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        0,1,1,1,0,0,0,0,1,1,1,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,0,0,1,1,1,1,1,0,0,0,0,
    ],
    '1': [
        0,0,0,0,0,1,1,0,0,0,0,0,
        0,0,0,0,1,1,1,0,0,0,0,0,
        0,0,0,0,1,1,1,0,0,0,0,0,
        0,0,0,0,0,1,1,0,0,0,0,0,
        0,0,0,0,0,1,1,0,0,0,0,0,
        0,0,0,0,0,1,1,0,0,0,0,0,
        0,0,0,0,0,1,1,0,0,0,0,0,
        0,0,0,0,0,1,1,0,0,0,0,0,
        0,0,0,0,0,1,1,0,0,0,0,0,
        0,0,0,0,0,1,1,0,0,0,0,0,
        0,1,1,1,1,1,1,1,1,1,0,0,
        0,1,1,1,1,1,1,1,1,1,0,0,
    ],
    '2': [
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,1,1,1,1,1,1,1,1,1,1,0,
        1,1,1,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,1,1,1,0,
        0,0,0,0,0,0,0,1,1,1,0,0,
        0,0,0,0,0,0,1,1,1,0,0,0,
        0,0,0,0,0,1,1,1,0,0,0,0,
        0,0,0,0,1,1,1,0,0,0,0,0,
        0,0,0,1,1,1,0,0,0,0,0,0,
        0,1,1,1,1,1,1,1,1,1,1,1,
        0,1,1,1,1,1,1,1,1,1,1,1,
    ],
    '3': [
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,1,1,1,1,1,1,1,1,1,1,0,
        1,1,1,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,1,1,1,1,1,1,0,0,
        0,0,0,0,1,1,1,1,1,1,0,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        1,1,1,0,0,0,0,0,0,1,1,0,
        0,1,1,1,1,1,1,1,1,1,1,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
    ],
    '4': [
        0,0,0,0,0,0,0,0,1,1,0,0,
        0,0,0,0,0,0,0,1,1,1,0,0,
        0,0,0,0,0,0,1,1,1,1,0,0,
        0,0,0,0,0,1,1,1,1,1,0,0,
        0,0,0,0,1,1,0,1,1,1,0,0,
        0,0,0,1,1,1,0,1,1,1,0,0,
        0,0,1,1,1,0,0,1,1,1,0,0,
        0,1,1,1,1,1,1,1,1,1,1,1,
        0,0,0,0,0,0,0,1,1,1,0,0,
        0,0,0,0,0,0,0,1,1,1,0,0,
        0,0,0,0,0,0,0,1,1,1,0,0,
        0,0,0,0,0,0,0,1,1,1,0,0,
    ],
    '5': [
        0,1,1,1,1,1,1,1,1,1,1,1,
        0,1,1,1,1,1,1,1,1,1,1,1,
        0,1,1,0,0,0,0,0,0,0,0,0,
        0,1,1,0,0,0,0,0,0,0,0,0,
        0,1,1,1,1,1,1,1,1,0,0,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        1,1,1,0,0,0,0,0,0,1,1,0,
        0,1,1,1,1,1,1,1,1,1,1,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
    ],
    '6': [
        0,0,0,0,1,1,1,1,1,0,0,0,
        0,0,0,1,1,1,1,1,1,1,0,0,
        0,0,1,1,1,0,0,0,0,0,0,0,
        0,1,1,1,0,0,0,0,0,0,0,0,
        0,1,1,0,0,0,0,0,0,0,0,0,
        0,1,1,1,1,1,1,1,1,0,0,0,
        0,1,1,1,1,1,1,1,1,1,0,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        0,1,1,1,0,0,0,0,0,1,1,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,0,0,1,1,1,1,1,1,0,0,0,
    ],
    '7': [
        0,1,1,1,1,1,1,1,1,1,1,1,
        0,1,1,1,1,1,1,1,1,1,1,1,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,1,1,1,0,
        0,0,0,0,0,0,0,0,1,1,1,0,
        0,0,0,0,0,0,0,1,1,1,0,0,
        0,0,0,0,0,0,0,1,1,1,0,0,
        0,0,0,0,0,0,1,1,1,0,0,0,
        0,0,0,0,0,0,1,1,1,0,0,0,
        0,0,0,0,0,0,1,1,1,0,0,0,
        0,0,0,0,0,0,1,1,1,0,0,0,
    ],
    '8': [
        0,0,0,1,1,1,1,1,1,0,0,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,1,1,1,0,0,0,0,0,1,1,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        0,1,1,1,0,0,0,0,0,1,1,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,0,0,1,1,1,1,1,1,0,0,0,
    ],
    '9': [
        0,0,0,1,1,1,1,1,1,0,0,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,1,1,1,0,0,0,0,0,1,1,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        0,1,1,0,0,0,0,0,0,1,1,0,
        0,0,1,1,1,1,1,1,1,1,1,0,
        0,0,0,1,1,1,1,1,1,1,0,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,0,1,1,0,
        0,0,0,0,0,0,0,0,1,1,0,0,
        0,0,1,1,1,1,1,1,1,1,0,0,
        0,1,1,1,1,1,1,1,1,0,0,0,
    ],
};

// 小像素字体用于Max标签和数值
const pixelFontsSmall = {
    'M': [
        1,0,0,0,0,1,
        1,1,0,0,1,1,
        1,0,1,1,0,1,
        1,0,0,0,0,1,
        1,0,0,0,0,1,
        1,0,0,0,0,1,
    ],
    'A': [
        0,0,1,1,0,0,
        0,1,0,0,1,0,
        1,0,0,0,0,1,
        1,1,1,1,1,1,
        1,0,0,0,0,1,
        1,0,0,0,0,1,
    ],
    'X': [
        1,0,0,0,0,1,
        0,1,0,0,1,0,
        0,0,1,1,0,0,
        0,0,1,1,0,0,
        0,1,0,0,1,0,
        1,0,0,0,0,1,
    ],
    ':': [
        0,0,0,0,0,0,
        0,0,1,1,0,0,
        0,0,0,0,0,0,
        0,0,0,0,0,0,
        0,0,1,1,0,0,
        0,0,0,0,0,0,
    ],
    'N': [
        1,0,0,0,0,1,
        1,1,0,0,0,1,
        1,0,1,0,0,1,
        1,0,0,1,0,1,
        1,0,0,0,1,1,
        1,0,0,0,0,1,
    ],
    'I': [
        0,0,1,1,0,0,
        0,0,0,1,0,0,
        0,0,0,1,0,0,
        0,0,0,1,0,0,
        0,0,0,1,0,0,
        0,0,1,1,0,0,
    ],
    'C': [
        0,0,1,1,0,0,
        0,1,0,0,1,0,
        1,0,0,0,0,0,
        1,0,0,0,0,0,
        0,1,0,0,1,0,
        0,0,1,1,0,0,
    ],
    'E': [
        0,1,1,1,1,0,
        0,1,0,0,0,0,
        0,1,1,1,0,0,
        0,1,0,0,0,0,
        0,1,0,0,0,0,
        0,1,1,1,1,0,
    ],
    '0': [
        0,0,1,1,0,0,
        0,1,0,0,1,0,
        0,1,0,0,1,0,
        0,1,0,0,1,0,
        0,1,0,0,1,0,
        0,0,1,1,0,0,
    ],
    '1': [
        0,0,1,1,0,0,
        0,0,0,1,0,0,
        0,0,0,1,0,0,
        0,0,0,1,0,0,
        0,0,0,1,0,0,
        0,0,1,1,1,0,
    ],
    '2': [
        0,1,1,1,0,0,
        1,0,0,0,1,0,
        0,0,0,0,1,0,
        0,0,1,1,0,0,
        0,1,0,0,0,0,
        0,1,1,1,1,0,
    ],
    '3': [
        0,1,1,1,0,0,
        1,0,0,0,1,0,
        0,0,0,0,1,0,
        0,0,1,1,0,0,
        1,0,0,0,1,0,
        0,1,1,1,0,0,
    ],
    '4': [
        0,0,0,1,0,0,
        0,0,1,1,0,0,
        0,1,0,1,0,0,
        1,1,1,1,1,0,
        0,0,0,1,0,0,
        0,0,0,1,0,0,
    ],
    '5': [
        0,1,1,1,1,0,
        0,1,0,0,0,0,
        0,1,1,1,0,0,
        0,0,0,0,1,0,
        0,1,0,0,1,0,
        0,0,1,1,0,0,
    ],
    '6': [
        0,0,1,1,0,0,
        0,1,0,0,0,0,
        0,1,1,1,0,0,
        0,1,0,0,1,0,
        0,1,0,0,1,0,
        0,0,1,1,0,0,
    ],
    '7': [
        0,1,1,1,1,0,
        0,1,0,0,1,0,
        0,0,0,0,1,0,
        0,0,0,1,0,0,
        0,0,1,0,0,0,
        0,0,1,0,0,0,
    ],
    '8': [
        0,0,1,1,0,0,
        0,1,0,0,1,0,
        0,0,1,1,0,0,
        0,1,0,0,1,0,
        0,1,0,0,1,0,
        0,0,1,1,0,0,
    ],
    '9': [
        0,0,1,1,0,0,
        0,1,0,0,1,0,
        0,1,0,0,1,0,
        0,0,1,1,1,0,
        0,0,0,0,1,0,
        0,0,1,1,0,0,
    ],
};

const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
];

const PixelCharacter12x12 = ({ char, x, y, color }) => {
    const pixels = pixelFonts12x12[char] || [];
    const pixelSize = 5;
    const pixelGap = 1;
    
    const elements = [];
    for (let i = 0; i < pixels.length; i++) {
        if (pixels[i]) {
            const px = x + (i % 12) * (pixelSize + pixelGap);
            const py = y + Math.floor(i / 12) * (pixelSize + pixelGap);
            elements.push(
                <rect 
                    key={i}
                    x={px}
                    y={py}
                    width={pixelSize}
                    height={pixelSize}
                    fill={color}
                />
            );
        }
    }
    return <>{elements}</>;
};

const PixelCharacterSmall = ({ char, x, y, color }) => {
    const pixels = pixelFontsSmall[char] || [];
    const pixelSize = 3;
    const pixelGap = 1;
    
    const elements = [];
    for (let i = 0; i < pixels.length; i++) {
        if (pixels[i]) {
            const px = x + (i % 6) * (pixelSize + pixelGap);
            const py = y + Math.floor(i / 6) * (pixelSize + pixelGap);
            elements.push(
                <rect 
                    key={i}
                    x={px}
                    y={py}
                    width={pixelSize}
                    height={pixelSize}
                    fill={color}
                />
            );
        }
    }
    return <>{elements}</>;
};

const PixelNumberDisplay = ({ number, startX, startY, color, isSmall = false }) => {
    const numStr = number.toString();
    const charWidth = isSmall ? 24 : 72;
    const elements = [];
    let x = startX;
    
    for (let i = 0; i < numStr.length; i++) {
        const char = numStr[i];
        if (isSmall) {
            elements.push(
                <PixelCharacterSmall 
                    key={i}
                    char={char}
                    x={x}
                    y={startY}
                    color={color}
                />
            );
        } else {
            elements.push(
                <PixelCharacter12x12 
                    key={i}
                    char={char}
                    x={x}
                    y={startY}
                    color={color}
                />
            );
        }
        x += charWidth;
    }
    
    return <>{elements}</>;
};

const PixelLabel = ({ label, startX, startY, color }) => {
    const charWidth = 24;
    const elements = [];
    let x = startX;
    
    for (let i = 0; i < label.length; i++) {
        const char = label[i].toUpperCase();
        if (pixelFontsSmall[char]) {
            elements.push(
                <PixelCharacterSmall 
                    key={i}
                    char={char}
                    x={x}
                    y={startY}
                    color={color}
                />
            );
        }
        x += charWidth;
    }
    
    return <>{elements}</>;
};

// 全局实例标记，确保只有一个BlockCounter实例
let blockCounterInstanceCount = 0;

const BlockCounter = ({ theme, onClose, onReset }) => {
    // 只允许一个实例
    const instanceId = React.useMemo(() => ++blockCounterInstanceCount, []);
    const isPrimaryInstance = instanceId === 1;
    
    const [currentCount, setCurrentCount] = useState(0);
    const [maxCount, setMaxCount] = useState(() => {
        const saved = localStorage.getItem('maxBlockCount');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [showNice, setShowNice] = useState(false);
    const [colorIndex, setColorIndex] = useState(0);
    const [lineIndex, setLineIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isClosed, setIsClosed] = useState(() => {
        const saved = localStorage.getItem('blockCounterClosed');
        return saved === 'true';
    });
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('blockCounterPosition');
        if (saved) return JSON.parse(saved);
        // 初始位置在放置积木区的右上角区域
        const initialX = window.innerWidth - 320;
        const initialY = 60;
        return { x: initialX > 0 ? initialX : 10, y: initialY };
    });
    
    const previousCountRef = useRef(0);
    const debounceTimerRef = useRef(null);
    const stableCountRef = useRef(0);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const currentPositionRef = useRef(position);

    useEffect(() => {
        currentPositionRef.current = position;
    }, [position]);

    useEffect(() => {
        const saved = localStorage.getItem('blockCounterClosed');
        setIsClosed(saved === 'true');
        
        const handleStorageChange = (e) => {
            if (e.key === 'blockCounterClosed') {
                setIsClosed(e.newValue === 'true');
            }
        };
        
        const handleShow = () => {
            setIsClosed(false);
            localStorage.setItem('blockCounterClosed', 'false');
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('blockCounterShow', handleShow);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('blockCounterShow', handleShow);
        };
    }, []);

    const componentRef = useRef(null);
    const topBarRef = useRef(null);

    const handleDragStart = (e) => {
        // 确保点击的是我们的元素
        if (!topBarRef.current?.contains(e.target)) {
            return;
        }
        
        // 使用元素检测遮挡的方法：
        // 先将我们组件设为透明，检测鼠标位置的元素是否是我们下面的东西
        componentRef.current.style.opacity = '0';
        const elBelow = document.elementFromPoint(e.clientX, e.clientY);
        componentRef.current.style.opacity = '1';
        
        // 如果检测到了其他元素，说明我们被遮挡了（排除body/html）
        if (elBelow && elBelow !== document.body && elBelow !== document.documentElement) {
            // 检查检测到的元素是否是我们自己的子元素
            if (!componentRef.current?.contains(elBelow)) {
                return; // 被其他元素遮挡，不响应拖拽
            }
        }

        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.preventDefault();
    };

    const handleDragMove = (e) => {
        if (!isDragging) return;
        const newPosition = {
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        };
        setPosition(newPosition);
        currentPositionRef.current = newPosition;
        e.preventDefault();
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        localStorage.setItem('blockCounterPosition', JSON.stringify(currentPositionRef.current));
    };

    const handleClose = () => {
        setIsClosed(true);
        localStorage.setItem('blockCounterClosed', 'true');
        // 触发自定义事件，同步其他组件的状态
        window.dispatchEvent(new CustomEvent('blockCounterClosed'));
        if (onClose) onClose();
    };

    const handleReset = () => {
        setIsClosed(false);
        localStorage.setItem('blockCounterClosed', 'false');
        if (onReset) onReset();
        // 重置位置到默认
        const initialX = window.innerWidth - 320;
        const initialY = 60;
        const defaultPosition = { x: initialX > 0 ? initialX : 10, y: initialY };
        setPosition(defaultPosition);
        localStorage.setItem('blockCounterPosition', JSON.stringify(defaultPosition));
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        } else {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging]);

    const countBlocks = () => {
        try {
            const workspace = AddonHooks.blocklyWorkspace;
            if (workspace && workspace.getAllBlocks) {
                const blocks = workspace.getAllBlocks(false);
                const count = blocks.length;
                stableCountRef.current = count;
                
                // 清除之前的定时器
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                }
                
                // 设置防抖，等待500ms后计数稳定
                debounceTimerRef.current = setTimeout(() => {
                    const stableCount = stableCountRef.current;
                    setCurrentCount(stableCount);
                    
                    if (stableCount > maxCount) {
                        setMaxCount(stableCount);
                        localStorage.setItem('maxBlockCount', stableCount.toString());
                    }

                    if (stableCount > previousCountRef.current) {
                        const isNiceNumber = stableCount > 0 && (stableCount % 10 === 0 || stableCount % 25 === 0 || stableCount % 50 === 0 || stableCount % 100 === 0);
                        if (isNiceNumber) {
                            setShowNice(true);
                            setColorIndex((prev) => (prev + 1) % colorPalette.length);
                            setTimeout(() => setShowNice(false), 2000);
                        }
                    }
                    previousCountRef.current = stableCount;
                }, 1000);
            }
        } catch (e) {
            console.error('Error counting blocks:', e);
        }
    };

    // 使用Blockly工作区事件代替定时器
    useEffect(() => {
        let workspace = null;
        
        // 等待工作区加载
        const checkWorkspace = setInterval(() => {
            workspace = AddonHooks.blocklyWorkspace;
            if (workspace && workspace.addChangeListener) {
                clearInterval(checkWorkspace);
                
                // 添加工作区变更监听器
                const handleWorkspaceChange = (event) => {
                    // 只在以下情况计数：
                    // - 积木创建/删除
                    // - 积木移动
                    if (
                        event.type === 'create' || 
                        event.type === 'delete' ||
                        event.type === 'move'
                    ) {
                        // 稍微延迟一下确保DOM更新
                        setTimeout(countBlocks, 10);
                    }
                };
                
                workspace.addChangeListener(handleWorkspaceChange);
                
                // 初始计数
                setTimeout(countBlocks, 100);
                
                return () => {
                    if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                    }
                    if (workspace && workspace.removeChangeListener) {
                        workspace.removeChangeListener(handleWorkspaceChange);
                    }
                };
            }
        }, 100);
        
        return () => clearInterval(checkWorkspace);
    }, [maxCount]);

    // 保留扫描线动画
    useEffect(() => {
        const frameInterval = setInterval(() => {
            setLineIndex((prev) => (prev + 1) % 30);
        }, 100);
        
        return () => clearInterval(frameInterval);
    }, []);

    const currentColor = colorPalette[colorIndex % colorPalette.length];
    const maxColor = colorPalette[(colorIndex + 1) % colorPalette.length];
    
    const scanLines = [];
    for (let line = 0; line < 30; line++) {
        const y = line * 3;
        const opacity = 0.08;
        let color = currentColor;
        if (line === lineIndex) {
            color = maxColor;
        }
        scanLines.push(
            <rect
                key={line}
                x={0}
                y={y}
                width={250}
                height={2}
                fill={color}
                opacity={opacity}
            />
        );
    }

    // 使用非常高的z-index确保我们在最上层
    const Z_INDEX = 999999;

    const isDark = theme && theme.isDark ? theme.isDark() : true;
    const bgColor = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.98)';
    const shadowColor = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.15)';
    const barBgColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';

    // 如果不是主实例，不渲染
    if (!isPrimaryInstance) {
        return null;
    }

    // 如果是关闭状态，不显示
    if (isClosed) {
        return null;
    }

    return (
        <div 
            ref={componentRef}
            style={{
                position: 'fixed',
                top: position.y,
                left: position.x,
                zIndex: Z_INDEX,
                backgroundColor: bgColor,
                borderRadius: 6,
                boxShadow: `0 4px 20px ${shadowColor}`,
                border: `2px solid ${currentColor}`,
                transition: 'border-color 0.3s ease',
                pointerEvents: 'auto' // 确保我们能接收到鼠标事件
            }}>
            <div style={{ padding: 12 }}>
                <svg width="250" height="160" style={{ display: 'block', imageRendering: 'pixelated' }}>
                    <rect x={0} y={0} width={250} height={160} fill="transparent"/>
                    {scanLines}
                    {/* Max标签在左上方 */}
                    <PixelLabel label="MAX:" startX={10} startY={8} color={maxColor} />
                    {/* Max数值紧跟在冒号后面 */}
                    <PixelNumberDisplay number={maxCount} startX={106} startY={8} color={maxColor} isSmall={true} />
                    {/* 分隔线 */}
                    <rect x={10} y={35} width={230} height={4} fill={currentColor} opacity={0.3} />
                    {/* 当前积木在下面，更大 */}
                    <PixelNumberDisplay number={currentCount} startX={10} startY={50} color={currentColor} isSmall={false} />
                    {/* 分隔线 */}
                    <rect x={10} y={120} width={230} height={4} fill={currentColor} opacity={0.2} />
                    {showNice && (
                        <PixelLabel label="NICE" startX={10} startY={130} color={colorPalette[(colorIndex + 2) % colorPalette.length]} />
                    )}
                </svg>
            </div>
            {/* 关闭按钮 */}
            <div 
                onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                }}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ff6b6b',
                    fontSize: 18,
                    fontWeight: 'bold',
                    zIndex: 10
                }}
            >
                ×
            </div>
            {/* 可拖动的底部条 */}
            <div 
                ref={topBarRef}
                style={{
                    height: 20,
                    backgroundColor: barBgColor,
                    borderBottomLeftRadius: 6,
                    borderBottomRightRadius: 6,
                    cursor: 'move',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto' // 确保底部条能接收到事件
                }}
                onMouseDown={handleDragStart}
            >
                {/* 拖拽指示 */}
                <div style={{
                    display: 'flex',
                    gap: 4
                }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: 4,
                            height: 4,
                            backgroundColor: currentColor,
                            borderRadius: 1
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlockCounter;

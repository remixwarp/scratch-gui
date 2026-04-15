import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styles from './virtual-keyboard.css';
import WindowManager from '../../addons/window-system/window-manager';

const VirtualKeyboard = ({ visible, onClose }) => {
    const keyboardWindowRef = useRef(null);

    useEffect(() => {
        if (visible && !keyboardWindowRef.current) {
            // 创建可拖动窗口
            const window = WindowManager.createWindow({
                id: 'virtual-keyboard-window',
                title: '虚拟键盘',
                width: 600,
                height: 350,
                minWidth: 400,
                minHeight: 300,
                resizable: true,
                maximizable: false,
                closable: true,
                className: 'virtual-keyboard-window',
                onClose: () => {
                    keyboardWindowRef.current = null;
                    onClose();
                }
            });

            keyboardWindowRef.current = window;
            
            // 创建键盘内容
            const keyboardContent = document.createElement('div');
            keyboardContent.className = styles.keyboardContent;
            
            const handleKeyPress = (key) => {
                let keyValue = key;
                let codeValue = `Key${key.toUpperCase()}`;

                // 处理特殊按键
                switch (key) {
                    case ' ': // 空格键
                        keyValue = ' ';
                        codeValue = 'Space';
                        break;
                    case '↑': // 上方向键
                        keyValue = 'ArrowUp';
                        codeValue = 'ArrowUp';
                        break;
                    case '↓': // 下方向键
                        keyValue = 'ArrowDown';
                        codeValue = 'ArrowDown';
                        break;
                    case '→': // 右方向键
                        keyValue = 'ArrowRight';
                        codeValue = 'ArrowRight';
                        break;
                    case '←': // 左方向键
                        keyValue = 'ArrowLeft';
                        codeValue = 'ArrowLeft';
                        break;
                }

                // 模拟键盘事件
                const event = new KeyboardEvent('keydown', {
                    key: keyValue,
                    code: codeValue,
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(event);

                // 模拟keyup事件
                setTimeout(() => {
                    const keyupEvent = new KeyboardEvent('keyup', {
                        key: keyValue,
                        code: codeValue,
                        bubbles: true,
                        cancelable: true
                    });
                    document.dispatchEvent(keyupEvent);
                }, 100);
            };

            const keys = [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
                ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
                [' ', '↑', '↓', '→', '←']
            ];

            // 构建键盘布局
            const keyboardRows = document.createElement('div');
            keyboardRows.className = styles.keyboardRows;
            
            keys.forEach((row, rowIndex) => {
                const rowElement = document.createElement('div');
                rowElement.className = styles.keyboardRow;
                
                row.forEach((key) => {
                    const keyButton = document.createElement('button');
                    if (key === ' ') {
                        keyButton.className = `${styles.key} ${styles.space}`;
                        keyButton.textContent = '空格';
                    } else {
                        keyButton.className = styles.key;
                        keyButton.textContent = key;
                    }
                    keyButton.addEventListener('click', () => handleKeyPress(key));
                    rowElement.appendChild(keyButton);
                });
                
                keyboardRows.appendChild(rowElement);
            });

            keyboardContent.appendChild(keyboardRows);
            window.setContent(keyboardContent);
            window.show();
        } else if (!visible && keyboardWindowRef.current) {
            // 关闭窗口
            keyboardWindowRef.current.close();
            keyboardWindowRef.current = null;
        }

        return () => {
            if (keyboardWindowRef.current) {
                keyboardWindowRef.current.close();
                keyboardWindowRef.current = null;
            }
        };
    }, [visible, onClose]);

    return null;
};

VirtualKeyboard.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

export default VirtualKeyboard;
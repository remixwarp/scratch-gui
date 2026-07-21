import PropTypes from 'prop-types';
import {useEffect, useRef, useState} from 'react';
import WindowManager from '../../addons/window-system/window-manager';

const ExtensionEditorWindow = ({visible, onClose}) => {
    const windowRef = useRef(null);
    const iframeRef = useRef(null);
    const tab1Ref = useRef(null);
    const tab2Ref = useRef(null);
    const [selectedEditor, setSelectedEditor] = useState('scratch-extension');

    useEffect(() => {
        if (visible && !windowRef.current) {
            // Create window
            const window = WindowManager.createWindow({
                id: 'extension-editor-window',
                title: '扩展编辑器 - Extension Editor',
                width: 900,
                height: 700,
                minWidth: 600,
                minHeight: 400,
                resizable: true,
                maximizable: true,
                closable: true,
                className: 'extension-editor-window',
                onClose: () => {
                    windowRef.current = null;
                    if (onClose) {
                        onClose();
                    }
                }
            });

            windowRef.current = window;

            // Create container for tabs and iframe
            const container = document.createElement('div');
            container.style.cssText = `
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: var(--ui-modal-background, #ffffff);
                color: var(--ui-modal-foreground, var(--text-primary, #1f2937));
            `;

            // Create tab bar
            const tabBar = document.createElement('div');
            tabBar.style.cssText = `
                display: flex;
                border-bottom: 1px solid var(--ui-black-transparent, rgba(0, 0, 0, 0.12));
                background: var(--ui-secondary, #f5f5f5);
                padding: 0;
                margin: 0;
            `;

            // Create tabs
            const createTab = (id, label) => {
                const tab = document.createElement('button');
                tab.textContent = label;
                tab.className = selectedEditor === id ? 'active' : '';
                tab.style.cssText = `
                    flex: 1;
                    padding: 12px;
                    border: none;
                    background: ${selectedEditor === id ?
        'var(--ui-modal-background, #ffffff)' :
        'var(--ui-secondary, #f5f5f5)'};
                    border-bottom: ${selectedEditor === id ?
        '3px solid var(--looks-secondary, #0066cc)' :
        '1px solid var(--ui-black-transparent, rgba(0, 0, 0, 0.12))'};
                    color: var(--ui-modal-foreground, var(--text-primary, #1f2937));
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                `;
                tab.onmouseover = () => {
                    if (selectedEditor !== id) {
                        tab.style.background = 'var(--looks-transparent, rgba(0, 102, 204, 0.12))';
                    }
                };
                tab.onmouseout = () => {
                    if (selectedEditor !== id) {
                        tab.style.background = 'var(--ui-secondary, #f5f5f5)';
                    }
                };
                tab.onclick = () => {
                    setSelectedEditor(id);
                };
                return tab;
            };

            const tab1 = createTab('scratch-extension', '扩展编辑器 - Extension Editor');
            const tab2 = createTab('cbeg', '象棋脑的扩展制作器 - CBEG Extension Maker');

            tab1Ref.current = tab1;
            tab2Ref.current = tab2;

            tabBar.appendChild(tab1);
            tabBar.appendChild(tab2);

            // Create content area
            const contentArea = document.createElement('div');
            contentArea.style.cssText = `
                flex: 1;
                overflow: hidden;
            `;

            container.appendChild(tabBar);
            container.appendChild(contentArea);

            // Create iframe for the extension editor
            const iframe = document.createElement('iframe');
            iframeRef.current = iframe;

            const updateIframeSource = () => {
                if (selectedEditor === 'scratch-extension') {
                    iframe.src = 'https://editors.astras.top/scratch-extension-editor/';
                } else if (selectedEditor === 'cbeg') {
                    iframe.src = 'https://chessbrain.qzz.io/CB-ExtGallary';
                }
            };

            updateIframeSource();

            iframe.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                background: var(--ui-modal-background, #ffffff);
            `;

            contentArea.appendChild(iframe);

            // Set content
            window.setContent(container);
            window.show();
        } else if (!visible && windowRef.current) {
            // Close window
            windowRef.current.close();
            windowRef.current = null;
            iframeRef.current = null;
            tab1Ref.current = null;
            tab2Ref.current = null;
        }

        return () => {
            if (windowRef.current) {
                windowRef.current.close();
                windowRef.current = null;
                iframeRef.current = null;
                tab1Ref.current = null;
                tab2Ref.current = null;
            }
        };
    }, [visible, onClose]);

    // Handle editor switching
    useEffect(() => {
        if (iframeRef.current && windowRef.current) {
            const updateIframeSource = () => {
                if (selectedEditor === 'scratch-extension') {
                    iframeRef.current.src = 'https://editors.astras.top/scratch-extension-editor/';
                } else if (selectedEditor === 'cbeg') {
                    iframeRef.current.src = 'https://chessbrain.qzz.io/CB-ExtGallary';
                }
            };
            updateIframeSource();
        }

        // Update tab styles
        if (tab1Ref.current && tab2Ref.current) {
            const updateTabStyles = () => {
                tab1Ref.current.style.background = selectedEditor === 'scratch-extension' ?
                    'var(--ui-modal-background, #ffffff)' :
                    'var(--ui-secondary, #f5f5f5)';
                tab1Ref.current.style.borderBottom = selectedEditor === 'scratch-extension' ?
                    '3px solid var(--looks-secondary, #0066cc)' :
                    '1px solid var(--ui-black-transparent, rgba(0, 0, 0, 0.12))';
                tab1Ref.current.style.color = 'var(--ui-modal-foreground, var(--text-primary, #1f2937))';

                tab2Ref.current.style.background = selectedEditor === 'cbeg' ?
                    'var(--ui-modal-background, #ffffff)' :
                    'var(--ui-secondary, #f5f5f5)';
                tab2Ref.current.style.borderBottom = selectedEditor === 'cbeg' ?
                    '3px solid var(--looks-secondary, #0066cc)' :
                    '1px solid var(--ui-black-transparent, rgba(0, 0, 0, 0.12))';
                tab2Ref.current.style.color = 'var(--ui-modal-foreground, var(--text-primary, #1f2937))';
            };
            updateTabStyles();
        }
    }, [selectedEditor]);

    return null;
};

ExtensionEditorWindow.propTypes = {
    onClose: PropTypes.func,
    visible: PropTypes.bool
};

export default ExtensionEditorWindow;
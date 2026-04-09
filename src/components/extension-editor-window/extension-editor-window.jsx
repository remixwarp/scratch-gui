import React, {useEffect, useRef} from 'react';
import WindowManager from '../../addons/window-system/window-manager';

const ExtensionEditorWindow = ({visible, onClose}) => {
    const windowRef = useRef(null);
    const iframeRef = useRef(null);

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

            // Create iframe for the extension editor
            const iframe = document.createElement('iframe');
            iframe.src = 'https://editors.astras.top/scratch-extension-editor/';
            iframe.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                background: white;
            `;
            iframeRef.current = iframe;

            // Set content
            window.setContent(iframe);
            window.show();
        } else if (!visible && windowRef.current) {
            // Close window
            windowRef.current.close();
            windowRef.current = null;
            iframeRef.current = null;
        }

        return () => {
            if (windowRef.current) {
                windowRef.current.close();
                windowRef.current = null;
                iframeRef.current = null;
            }
        };
    }, [visible, onClose]);

    return null;
};

export default ExtensionEditorWindow;
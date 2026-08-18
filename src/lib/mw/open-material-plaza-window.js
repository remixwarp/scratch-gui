import WindowManager from '../../addons/window-system/window-manager';

// The material plaza is deployed alongside the config plaza at rw-c.pages.dev.
// During development, use the local file.
const PLAZA_URL = 'https://rw-c.pages.dev/material-plaza/';

let plazaWindow = null;

const openMaterialPlazaWindow = () => {
    if (plazaWindow) {
        plazaWindow.show();
        plazaWindow.bringToFront();
        return plazaWindow;
    }

    const iframe = document.createElement('iframe');
    iframe.src = PLAZA_URL;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen');

    plazaWindow = WindowManager.createWindow({
        id: 'material-plaza-window',
        title: '素材广场',
        width: 960,
        height: 640,
        minWidth: 480,
        minHeight: 360,
        onClose: () => {
            plazaWindow = null;
        }
    });

    plazaWindow.setContent(iframe);
    plazaWindow.center();
    plazaWindow.show();

    return plazaWindow;
};

export default openMaterialPlazaWindow;
import WindowManager from '../../addons/window-system/window-manager';

// The config plaza is deployed as a standalone Cloudflare Pages site at
// https://rw-c.pages.dev/. The plaza iframe talks to the editor through the
// rwc-bridge postMessage channel; cross-origin iframe restrictions on direct
// GitHub API calls from inside the iframe are handled by forwarding read
// requests through the editor tab (see forwardGithubRequest in rwc-bridge.js).
const PLAZA_URL = 'https://rw-c.pages.dev/';

let plazaWindow = null;

const openConfigPlazaWindow = () => {
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
        id: 'config-plaza-window',
        title: '配置广场',
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

export default openConfigPlazaWindow;

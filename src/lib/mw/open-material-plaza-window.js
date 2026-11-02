import WindowManager from '../../addons/window-system/window-manager';
import {makeT} from './mw-l10n.js';

// The material plaza is deployed alongside the config plaza at rw-c.pages.dev.
// During development, use the local file.
const PLAZA_URL = 'https://rw-c.pages.dev/material-plaza/';

// 窗口标题文案（随编辑器语言切换；回退 zh-cn → en）
const t = makeT({
    title: {
        en: 'Material Plaza',
        'zh-cn': '素材广场',
        wenyan: '素材之廣場',
        geng: '素材广场（进来逛逛捏）'
    }
});

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
        title: t('title', '素材广场'),
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

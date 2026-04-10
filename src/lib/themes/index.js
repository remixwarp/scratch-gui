import defaultsDeep from 'lodash.defaultsdeep';

import * as guiLight from './gui/light';
import * as guiDark from './gui/dark';
import * as guiMidnight from './gui/midnight';

import * as blocksThree from './blocks/three';
import * as blocksHighContrast from './blocks/high-contrast';
import * as blocksDark from './blocks/dark';

import {ACCENT_MAP, ACCENT_DEFAULT} from './accents';

// Menu bar alignment options
const MENUBAR_ALIGN = {
    left: {
        defaultMessage: 'Left',
        description: 'Menu bar alignment option: left',
        id: 'tw.menuBar.align.left',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPCEtLSBDaXJjdWxhciBiYWNrZ3JvdW5kIC0tPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjExIiBmaWxsPSIjRkY2NjgwIiBzdHJva2U9IiNFNzRDM0MiIHN0cm9rZS13aWR0aD0iMSIvPgogIAogIDwhLS0gTGVmdC1hbGlnbmVkIHRleHQgbGluZXMgaW4gd2hpdGUgLS0+CiAgPHJlY3QgeD0iNiIgeT0iOCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEuNSIgcng9IjAuNzUiIGZpbGw9IndoaXRlIi8+CiAgPHJlY3QgeD0iNiIgeT0iMTEiIHdpZHRoPSI4IiBoZWlnaHQ9IjEuNSIgcng9IjAuNzUiIGZpbGw9IndoaXRlIi8+CiAgPHJlY3QgeD0iNiIgeT0iMTQiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxLjUiIHJ4PSIwLjc1IiBmaWxsPSJ3aGl0ZSIvPgogIDxyZWN0IHg9IjYiIHk9IjE3IiB3aWR0aD0iOCIgaGVpZ2h0PSIxLjUiIHJ4PSIwLjc1IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'
    },
    center: {
        defaultMessage: 'Center',
        description: 'Menu bar alignment option: center',
        id: 'tw.menuBar.align.center',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPCEtLSBDaXJjdWxhciBiYWNrZ3JvdW5kIC0tPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjExIiBmaWxsPSIjNEVDREM0IiBzdHJva2U9IiMyNkE2OUEiIHN0cm9rZS13aWR0aD0iMSIvPgogIAogIDwhLS0gQ2VudGVyLWFsaWduZWQgdGV4dCBsaW5lcyBpbiB3aGl0ZSAtLT4KICA8cmVjdCB4PSI2IiB5PSI4IiB3aWR0aD0iMTIiIGhlaWdodD0iMS41IiByeD0iMC43NSIgZmlsbD0id2hpdGUiLz4KICA8cmVjdCB4PSI4IiB5PSIxMSIgd2lkdGg9IjgiIGhlaWdodD0iMS41IiByeD0iMC43NSIgZmlsbD0id2hpdGUiLz4KICA8cmVjdCB4PSI2IiB5PSIxNCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEuNSIgcng9IjAuNzUiIGZpbGw9IndoaXRlIi8+CiAgPHJlY3QgeD0iOCIgeT0iMTciIHdpZHRoPSI4IiBoZWlnaHQ9IjEuNSIgcng9IjAuNzUiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='
    },
    right: {
        defaultMessage: 'Right',
        description: 'Menu bar alignment option: right',
        id: 'tw.menuBar.align.right',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPCEtLSBDaXJjdWxhciBiYWNrZ3JvdW5kIC0tPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjExIiBmaWxsPSIjQkJCQjAwIiBzdHJva2U9IiMzNjM2MDAiIHN0cm9rZS13aWR0aD0iMSIvPgogIAogIDwhLS0gUmlnaHQtYWxpZ25lZCB0ZXh0IGxpbmVzIGluIHdoaXRlIC0tPgogIDxyZWN0IHg9IjYiIHk9IjgiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxLjUiIHJ4PSIwLjc1IiBmaWxsPSJ3aGl0ZSIvPgogIDxyZWN0IHg9IjgiIHk9IjExIiB3aWR0aD0iOCIgaGVpZ2h0PSIxLjUiIHJ4PSIwLjc1IiBmaWxsPSJ3aGl0ZSIvPgogIDxyZWN0IHg9IjYiIHk9IjE0IiB3aWR0aD0iMTIiIGhlaWdodD0iMS41IiByeD0iMC43NSIgZmlsbD0id2hpdGUiLz4KICA8cmVjdCB4PSI2IiB5PSIxNyIgd2lkdGg9IjgiIGhlaWdodD0iMS41IiByeD0iMC43NSIgZmlsbD0id2hpdGUiLz4KPC9zdmc+'
    }
};
const MENUBAR_ALIGN_DEFAULT = 'left';

const GUI_LIGHT = 'light';
const GUI_DARK = 'dark';
const GUI_MIDNIGHT = 'midnight';
const GUI_MAP = {
    [GUI_LIGHT]: guiLight,
    [GUI_DARK]: guiDark,
    [GUI_MIDNIGHT]: guiMidnight
};
const GUI_DEFAULT = GUI_DARK;

const BLOCKS_THREE = 'three';
const BLOCKS_DARK = 'dark';
const BLOCKS_HIGH_CONTRAST = 'high-contrast';
const BLOCKS_CUSTOM = 'custom';
const BLOCKS_DEFAULT = BLOCKS_THREE;
const defaultBlockColors = blocksThree.blockColors;
const BLOCKS_MAP = {
    [BLOCKS_THREE]: {
        blocksMediaFolder: 'blocks-media/default',
        colors: blocksThree.blockColors,
        extensions: blocksThree.extensions,
        customExtensionColors: {},
        useForStage: true
    },
    [BLOCKS_HIGH_CONTRAST]: {
        blocksMediaFolder: 'blocks-media/high-contrast',
        colors: defaultsDeep({}, blocksHighContrast.blockColors, defaultBlockColors),
        extensions: blocksHighContrast.extensions,
        customExtensionColors: blocksHighContrast.customExtensionColors,        
        useForStage: true
    },
    [BLOCKS_DARK]: {
        blocksMediaFolder: 'blocks-media/default',
        colors: defaultsDeep({}, blocksDark.blockColors, defaultBlockColors),   
        extensions: blocksDark.extensions,
        customExtensionColors: blocksDark.customExtensionColors,
        useForStage: false
    },
    [BLOCKS_CUSTOM]: {
        // to be filled by editor-theme3 addon
        blocksMediaFolder: 'blocks-media/default',
        colors: blocksThree.blockColors,
        extensions: {},
        customExtensionColors: {},
        useForStage: false
    }
};

let themeObjectsCreated = 0;

class Theme {
    constructor (accent, gui, blocks, menuBarAlign) {
        // do not modify these directly
        /** @readonly */
        this.id = ++themeObjectsCreated;
        /** @readonly */
        this.accent = Object.prototype.hasOwnProperty.call(ACCENT_MAP, accent) ? accent : ACCENT_DEFAULT;
        /** @readonly */
        this.gui = Object.prototype.hasOwnProperty.call(GUI_MAP, gui) ? gui : GUI_DEFAULT;
        /** @readonly */
        this.blocks = Object.prototype.hasOwnProperty.call(BLOCKS_MAP, blocks) ? blocks : BLOCKS_DEFAULT;
        /** @readonly */
        this.menuBarAlign = Object.keys(MENUBAR_ALIGN).includes(menuBarAlign) ? menuBarAlign : MENUBAR_ALIGN_DEFAULT;
        /** @readonly */
        this.name = GUI_MAP[this.gui].name;
    }

    static defaults = Object.create(null);
    static light = new Theme(ACCENT_DEFAULT, GUI_LIGHT, BLOCKS_DEFAULT, MENUBAR_ALIGN_DEFAULT);        
    static dark = new Theme(ACCENT_DEFAULT, GUI_DARK, BLOCKS_DEFAULT, MENUBAR_ALIGN_DEFAULT);
    static midnight = new Theme(ACCENT_DEFAULT, GUI_MIDNIGHT, BLOCKS_DEFAULT, MENUBAR_ALIGN_DEFAULT);
    static highContrast = new Theme(ACCENT_DEFAULT, GUI_DEFAULT, BLOCKS_HIGH_CONTRAST, MENUBAR_ALIGN_DEFAULT);

    set (what, to) {
        if (what === 'accent') {
            return new Theme(to, this.gui, this.blocks, this.menuBarAlign);
        } else if (what === 'gui') {
            return new Theme(this.accent, to, this.blocks, this.menuBarAlign);
        } else if (what === 'blocks') {
            return new Theme(this.accent, this.gui, to, this.menuBarAlign);
        } else if (what === 'menuBarAlign') {
            return new Theme(this.accent, this.gui, this.blocks, to);
        }
        throw new Error(`Unknown theme property: ${what}`);
    }

    getBlocksMediaFolder () {
        return BLOCKS_MAP[this.blocks].blocksMediaFolder;
    }

    getGuiColors () {
        return defaultsDeep(
            {},
            (ACCENT_MAP[this.accent] && ACCENT_MAP[this.accent].guiColors) || {},
            GUI_MAP[this.gui].guiColors,
            guiLight.guiColors
        );
    }

    getBlockColors () {
        return defaultsDeep(
            {},
            (ACCENT_MAP[this.accent] && ACCENT_MAP[this.accent].blockColors) || {},
            GUI_MAP[this.gui].blockColors,
            BLOCKS_MAP[this.blocks].colors
        );
    }

    getExtensions () {
        return BLOCKS_MAP[this.blocks].extensions;
    }

    isDark () {
        return this.getGuiColors()['color-scheme'] === 'dark';
    }

    getStageBlockColors () {
        if (BLOCKS_MAP[this.blocks].useForStage) {
            return this.getBlockColors();
        }
        return Theme.light.getBlockColors();
    }

    getCustomExtensionColors () {
        return BLOCKS_MAP[this.blocks].customExtensionColors;
    }
}

// Create default theme objects for each GUI theme
const keys = Object.keys(GUI_MAP);
for (const key of keys) {
    Theme.defaults[key] = new Theme(
        ACCENT_DEFAULT, key, BLOCKS_DEFAULT, MENUBAR_ALIGN_DEFAULT
    );
}

export {
    Theme,
    defaultBlockColors,

    ACCENT_MAP,
    ACCENT_DEFAULT,

    GUI_LIGHT,
    GUI_DARK,
    GUI_MIDNIGHT,
    GUI_MAP,

    BLOCKS_THREE,
    BLOCKS_DARK,
    BLOCKS_HIGH_CONTRAST,
    BLOCKS_CUSTOM,
    BLOCKS_MAP,

    MENUBAR_ALIGN,
    MENUBAR_ALIGN_DEFAULT
};
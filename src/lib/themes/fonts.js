/**
 * Font management utility for applying theme fonts to the document
 */

import {loadGoogleFont} from './google-fonts';

let currentFontStyleElement = null;

const DEFAULT_FALLBACK_STACK = [
    'Helvetica Neue',
    'Helvetica',
    'Arial',
    'sans-serif'
];

const setCurrentFontStyleEl = element => {
    currentFontStyleElement = element;
};

/**
 * Apply theme fonts to the document
 * @param {object} fonts - The fonts object from theme
 * @param {Array} fonts.google - Array of Google Font names
 * @param {Array} fonts.system - Array of system font names
 */
const applyThemeFonts = async fonts => {
    const existingStyleEl = document.getElementById('theme-fonts');
    if (existingStyleEl) {
        existingStyleEl.remove();
    }

    // Remove existing font styles
    if (currentFontStyleElement) {
        currentFontStyleElement.remove();
        setCurrentFontStyleEl(null);
    }

    // Load Google Fonts first
    if (fonts?.google?.length) {
        await Promise.all(fonts.google.map(fontName => loadGoogleFont(fontName, ['400', '700'])));
    }

    // Create CSS for theme fonts
    const fontStack = [];
    
    // Add Google Fonts first (they have priority)
    if (fonts?.google?.length) {
        fontStack.push(...fonts.google.map(font => `"${font}"`));
    }
    
    // Add system fonts
    if (fonts?.system?.length) {
        fontStack.push(...fonts.system.map(font => `"${font}"`));
    }
    
    // Add fallback fonts
    fontStack.push(...DEFAULT_FALLBACK_STACK);
    
    const fontFamily = fontStack.join(', ');
    
    // Create style element
    const newFontStyleElement = document.createElement('style');
    newFontStyleElement.id = 'theme-fonts';
    newFontStyleElement.textContent = `
        /* Theme Fonts - High Priority Overrides */
        *:not([data-font-preview]):not([class*="paint-editor"]) {
            font-family: ${fontFamily} !important;
        }
        
        /* SVG text elements in Blockly */
        text:not(.paint-editor *), tspan:not(.paint-editor *) {
            font-family: ${fontFamily} !important;
        }
    `;

    setCurrentFontStyleEl(newFontStyleElement);
    
    document.head.appendChild(currentFontStyleElement);
};

/**
 * Remove theme fonts from the document
 */
const removeThemeFonts = () => {
    const existingStyleEl = document.getElementById('theme-fonts');
    if (existingStyleEl) {
        existingStyleEl.remove();
    }
    if (currentFontStyleElement) {
        currentFontStyleElement.remove();
        setCurrentFontStyleEl(null);
    }
};

/**
 * Get the current font stack as a CSS font-family string
 * @param {object} fonts - The fonts object from theme
 * @returns {string} CSS font-family string
 */
const getFontFamilyString = fonts => {
    if (!fonts || (!fonts.google?.length && !fonts.system?.length)) {
        return DEFAULT_FALLBACK_STACK.join(', ');
    }

    const fontStack = [];
    
    if (fonts.google?.length) {
        fontStack.push(...fonts.google.map(font => `"${font}"`));
    }
    
    if (fonts.system?.length) {
        fontStack.push(...fonts.system.map(font => `"${font}"`));
    }
    
    fontStack.push(...DEFAULT_FALLBACK_STACK);
    
    return fontStack.join(', ');
};

export {
    applyThemeFonts,
    removeThemeFonts,
    getFontFamilyString
};

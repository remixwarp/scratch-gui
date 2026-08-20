/* eslint-disable import/no-commonjs */

const SansSerif = require('./NotoSans-Medium.woff2');
const Serif = require('./SourceSerifPro-Regular.woff2');
const Handwriting = require('./handlee-regular.woff2');
const Marker = require('./Knewave.woff2');
const Curly = require('./Griffy-Regular.woff2');
const Pixel = require('./Grand9K-Pixel.woff2');
const Scratch = require('./ScratchSavers_b2.woff2');
const log = require('../utils/log').default;

const fontSource = {
    'Sans Serif': SansSerif,
    'Serif': Serif,
    'Handwriting': Handwriting,
    'Marker': Marker,
    'Curly': Curly,
    'Pixel': Pixel,
    'Scratch': Scratch
};

const fontData = {};

// Try to detect if a value is already a data URL (some webpack configs inline fonts)
const isDataUrl = (val) => typeof val === 'string' && val.startsWith('data:');

const fetchFonts = () => {
    const promises = [];
    for (const fontName of Object.keys(fontSource)) {
        const source = fontSource[fontName];

        // Case 1: Already inlined as data URL via webpack url-loader
        if (isDataUrl(source)) {
            fontData[fontName] = `@font-face{font-family:"${fontName}";src:url("${source}");}`;
            promises.push(Promise.resolve());
            continue;
        }

        // Case 2: A URL path that we need to fetch
        promises.push(
            (async () => {
                try {
                    const res = await fetch(source, {
                        // Avoid CORS preflight for same-origin static assets
                        credentials: 'same-origin',
                        cache: 'force-cache'
                    });

                    if (!res.ok) {
                        throw new Error(`Cannot load font: ${fontName} (HTTP ${res.status})`);
                    }

                    // Guard against the dev server returning SPA fallback HTML instead of the font
                    const contentType = res.headers && res.headers.get && res.headers.get('content-type');
                    if (contentType && /text\/html|application\/xhtml/i.test(contentType)) {
                        throw new Error(`Cannot load font: ${fontName} (server returned HTML, font URL likely misconfigured)`);
                    }

                    const blob = await res.blob();
                    if (blob.size < 100) {
                        throw new Error(`Cannot load font: ${fontName} (suspiciously small response: ${blob.size} bytes)`);
                    }

                    const dataUrl = await new Promise((resolve, reject) => {
                        const fr = new FileReader();
                        fr.onload = () => resolve(fr.result);
                        fr.onerror = () => reject(new Error(`Cannot load font: ${fontName} (could not read blob)`));
                        fr.readAsDataURL(blob);
                    });

                    fontData[fontName] = `@font-face{font-family:"${fontName}";src:url("${dataUrl}");}`;
                } catch (err) {
                    log.error(err);
                    // Don't let one font failure break the entire Promise.all
                }
            })()
        );
    }
    return Promise.all(promises);
};

const addFontsToDocument = () => {
    if (document.getElementById('scratch-font-styles')) {
        return;
    }
    let css = '';
    for (const fontName of Object.keys(fontSource)) {
        const fontCSS = fontData[fontName];
        if (fontCSS) {
            css += fontCSS;
        }
    }
    const documentStyleTag = document.createElement('style');
    documentStyleTag.id = 'scratch-font-styles';
    documentStyleTag.textContent = css;
    document.body.insertBefore(documentStyleTag, document.body.firstChild);
};

const waitForFontsToLoad = () => {
    const promises = [];
    if (document.fonts && document.fonts.load) {
        for (const fontName in fontData) {
            promises.push(
                document.fonts.load(`12px ${fontName}`).catch(err => {
                    log.error(`Font load failed for ${fontName}:`, err);
                })
            );
        }
    }
    return Promise.all(promises);
};

const loadFonts = () => fetchFonts()
    .then(() => {
        addFontsToDocument();
        // 不再等待 document.fonts.load() - CSS @font-face 注入后，
        // 浏览器会自动懒加载字体。跳过等待让项目加载提前数百毫秒。
        // 当 blocks 首次渲染时，字体已经加载完毕或正在加载中，
        // 用户几乎感知不到字体切换。
        return Promise.resolve();
    })
    .catch(err => {
        log.error(err);
    });

const getFonts = () => fontData;

// We have to use legacy module.exports as some parts of Scratch expect require('scratch-render-font') to be a function
module.exports = getFonts;
module.exports.loadFonts = loadFonts;
module.exports.FONTS = fontData;

// Patches scratch-render's ShaderManager.js and raw-loader to fix shader compilation.
//
// Problem: raw-loader@3 outputs ESM (export default "...") which is incompatible
// with CJS require(). require() returns {default: "..."} instead of the string,
// causing shader source to become "[object Object]" or contain "module" text.
//
// Fix: 1. Patch raw-loader to output CJS (module.exports = "...") instead of ESM
//      2. Patch ShaderManager.js to remove inline raw-loader! prefix (use config rule)
//
// This script runs on postinstall to ensure patches survive npm install.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const basePath = path.join(__dirname, '..');

// --- Patch 1: raw-loader — output CJS instead of ESM ---
const rawLoaderPath = path.join(basePath, 'node_modules', 'raw-loader', 'dist', 'index.js');

try {
    if (fs.existsSync(rawLoaderPath)) {
        let content = fs.readFileSync(rawLoaderPath, 'utf8');
        const original = content;

        // Replace ESM output with CJS output
        content = content.replace(
            'return `export default ${json}`',
            'return `module.exports = ${json}`'
        );

        if (content !== original) {
            fs.writeFileSync(rawLoaderPath, content, 'utf8');
            console.info('[patch-shader-manager] Patched raw-loader: ESM -> CJS output');
        } else {
            console.info('[patch-shader-manager] raw-loader already patched');
        }
    } else {
        console.info('[patch-shader-manager] raw-loader not found, skipping');
    }
} catch (err) {
    console.warn('[patch-shader-manager] raw-loader patch warning:', err.message);
}

// --- Patch 2: ShaderManager.js — remove inline raw-loader! prefix ---
const shaderManagerPath = path.join(basePath, 'node_modules', 'scratch-render', 'src', 'ShaderManager.js');

try {
    if (!fs.existsSync(shaderManagerPath)) {
        console.info('[patch-shader-manager] ShaderManager.js not found, skipping');
    } else {
        let content = fs.readFileSync(shaderManagerPath, 'utf8');
        const original = content;

        // Replace inline raw-loader! requires with plain requires
        // The webpack config rule for .vert/.frag files handles loading
        content = content.replace(
            /require\(['"]raw-loader!\.\/shaders\/(sprite\.(?:vert|frag))['"]\)/g,
            "require('./shaders/$1')"
        );

        if (content !== original) {
            fs.writeFileSync(shaderManagerPath, content, 'utf8');
            console.info('[patch-shader-manager] Patched ShaderManager.js: removed inline raw-loader! prefix');
        } else {
            console.info('[patch-shader-manager] ShaderManager.js already patched');
        }
    }
} catch (err) {
    console.warn('[patch-shader-manager] ShaderManager.js patch warning:', err.message);
}

// --- Patch 3: scratch-translate-extension-languages/languages.json — fix empty file ---
// bun install sometimes leaves this file as 0 bytes, causing webpack JSON parse failure.
const translateLangPath = path.join(basePath, 'node_modules', 'scratch-translate-extension-languages', 'languages.json');
try {
    if (fs.existsSync(translateLangPath)) {
        const content = fs.readFileSync(translateLangPath, 'utf8').trim();
        if (content === '' || content === 'null') {
            fs.writeFileSync(translateLangPath, '{}');
            console.info('[patch-shader-manager] Patched languages.json: empty -> {}');
        }
    }
} catch (err) {
    console.warn('[patch-shader-manager] languages.json patch warning:', err.message);
}

#!/usr/bin/env node
/**
 * Post-build compression step (no external dependencies).
 *
 * Cloudflare Pages / CDN can serve precompressed `.gz` / `.br` variants when
 * the client advertises `Accept-Encoding`. Shipping these from the build
 * avoids compressing on-the-fly at the edge and drastically cuts the bytes
 * transferred for the large editor/project bundles (vendors ~13MB, etc.).
 *
 * Uses only Node's built-in `zlib` so it works in any CI without an `npm
 * install` of extra tooling.
 *
 * Usage (after webpack):  node scripts/build-compression.js [buildDir]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BUILD_DIR = process.argv[2] || path.resolve(__dirname, '..', 'build');

// Only compress text-based assets that benefit from compression.
const EXTENSIONS = new Set(['.js', '.css', '.html', '.json', '.svg', '.map', '.ejs', '.txt']);

// Skip files that are already small or are precompressed variants.
const MIN_SIZE = 1024; // 1 KB

function walk(dir, files = []) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, files);
        } else {
            files.push(full);
        }
    }
    return files;
}

function compressFile(file) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTENSIONS.has(ext)) return;
    if (ext === '.gz' || ext === '.br') return;
    if (file.endsWith('.gz') || file.endsWith('.br')) return;

    const stat = fs.statSync(file);
    if (stat.size < MIN_SIZE) return;

    const buf = fs.readFileSync(file);

    const gz = zlib.gzipSync(buf, {level: 9});
    fs.writeFileSync(`${file}.gz`, gz);

    // Brotli is available in Node >= 11.7 via zlib.brotliCompressSync.
    if (typeof zlib.brotliCompressSync === 'function') {
        const br = zlib.brotliCompressSync(buf, {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                [zlib.constants.BROTLI_PARAM_SIZE_HINT]: stat.size
            }
        });
        fs.writeFileSync(`${file}.br`, br);
    }
}

function main() {
    if (!fs.existsSync(BUILD_DIR)) {
        console.error(`[build-compression] build dir not found: ${BUILD_DIR}`);
        process.exit(1);
    }
    const files = walk(BUILD_DIR);
    let gzCount = 0;
    let brCount = 0;
    let savedBytes = 0;
    for (const file of files) {
        const before = fs.statSync(file).size;
        compressFile(file);
        const gzPath = `${file}.gz`;
        const brPath = `${file}.br`;
        if (fs.existsSync(gzPath)) {
            gzCount++;
            savedBytes += before - fs.statSync(gzPath).size;
        }
        if (fs.existsSync(brPath)) {
            brCount++;
        }
    }
    console.log(
        `[build-compression] compressed ${gzCount} files (.gz), ${brCount} files (.br); ` +
        `saved ~${(savedBytes / 1024 / 1024).toFixed(1)} MB uncompressed-on-wire.`
    );
}

main();

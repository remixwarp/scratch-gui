import fs from 'fs';
import path from 'path';
import nodeCrypto from 'crypto';

import crossFetch from 'cross-fetch';
import yauzl from 'yauzl';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const basePath = path.join(__dirname, '..');

const extractFirstMatchingFile = (filter, relativeDestDir, zipBuffer) => new Promise((resolve, reject) => {
    try {
        let extractedFileName;
        yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (zipError, zipfile) => {
            if (zipError) {
                throw zipError;
            }
            zipfile.readEntry();
            zipfile.on('end', () => {
                resolve(extractedFileName);
            });
            zipfile.on('entry', entry => {
                if (!filter(entry)) {
                    return zipfile.readEntry();
                }
                if (extractedFileName) {
                    console.warn(`Multiple matching files found. Ignoring: ${entry.fileName}`);
                    return zipfile.readEntry();
                }
                extractedFileName = entry.fileName;
                console.info(`Found matching file: ${entry.fileName}`);
                zipfile.openReadStream(entry, (fileError, readStream) => {
                    if (fileError) {
                        throw fileError;
                    }
                    const baseName = path.basename(entry.fileName);
                    const relativeDestFile = path.join(relativeDestDir, baseName);
                    console.info(`Extracting ${relativeDestFile}`);
                    const absoluteDestDir = path.join(basePath, relativeDestDir);
                    fs.mkdirSync(absoluteDestDir, { recursive: true });
                    const absoluteDestFile = path.join(basePath, relativeDestFile);
                    const outStream = fs.createWriteStream(absoluteDestFile);
                    readStream.on('end', () => {
                        outStream.close();
                        zipfile.readEntry();
                    });
                    readStream.pipe(outStream);
                });
            });
        });
    } catch (error) {
        reject(error);
    }
});

const applyScratchBlocksPatches = () => {
    console.info('Applying scratch-blocks patches...');

    const scratchBlocksPath = path.join(basePath, 'node_modules', 'scratch-blocks');
    const scratchVmPath = path.join(basePath, 'node_modules', 'scratch-vm');

    const scratchMsgsPath = path.join(scratchBlocksPath, 'msg', 'scratch_msgs.js');
    if (fs.existsSync(scratchMsgsPath)) {
        let content = fs.readFileSync(scratchMsgsPath, 'utf8');

        const translationsToAdd = `    "UNSUPPORT_TW_1": "以下积木不支持 TurboWarp",
    "UNSUPPORT_TW_2": "我们强烈建议不去使用它们",
    "UNSUPPORT_TW_3": "它们仅用于与 MistWarp / Bilup兼容",
    "CONTROL_SWITCH": "对于 %1",
    "CONTROL_CASE": "情况 %1",
    "CONTROL_CASE_FALLTHROUGH": "情况 %1",
    "CONTROL_DEFAULT": "默认",
    "CONTROL_BREAK": "终止",
    "CONTROL_CONTINUE": "继续",
    "OPERATORS_PI": "π",
    "OPERATORS_NEWLINE": "换行",
    "MOTION_POINTTOWARDS_XY": "面向 x:%1 y:%2",
    "MOTION_POINTTOWARDS_XYFROM": "面向 x:%1 y:%2",
    "LOOKS_COSTUMES": "造型",`;

        if (!content.includes('"UNSUPPORT_TW_1"')) {
            const insertPoint = content.indexOf('"CONTROL_FOREVER"');
            if (insertPoint !== -1) {
                content = content.slice(0, insertPoint) + translationsToAdd + '\n    ' + content.slice(insertPoint);
                fs.writeFileSync(scratchMsgsPath, content);
                console.info('Patched scratch_msgs.js with new translations');
            }
        }

        if (content.includes('"CONTROL_SWITCH": "切换 %1"')) {
            content = content.replace('"CONTROL_SWITCH": "切换 %1"', '"CONTROL_SWITCH": "对于 %1"');
            fs.writeFileSync(scratchMsgsPath, content);
            console.info('Fixed CONTROL_SWITCH translation');
        }
    }

    const controlVerticalPath = path.join(scratchBlocksPath, 'blocks_vertical', 'control.js');
    if (fs.existsSync(controlVerticalPath)) {
        let content = fs.readFileSync(controlVerticalPath, 'utf8');

        if (!content.includes("Blockly.Blocks['control_continue']")) {
            const continueBlock = `Blockly.Blocks['control_continue'] = {
  init: function() {
    this.jsonInit({
      "id": "control_continue",
      "message0": Blockly.Msg.CONTROL_CONTINUE,
      "category": Blockly.Categories.control,
      "extensions": ["shape_statement"]
    });
  }
};

`;
            content = continueBlock + content;
            fs.writeFileSync(controlVerticalPath, content);
            console.info('Added control_continue block to blocks_vertical/control.js');
        }

        if (content.includes('"message2": "break"')) {
            content = content.replace('"message2": "break"', '"message2": Blockly.Msg.CONTROL_BREAK');
            fs.writeFileSync(controlVerticalPath, content);
            console.info('Fixed control_case break message to use translation');
        }
    }

    const scratch3ControlPath = path.join(scratchVmPath, 'src', 'blocks', 'scratch3_control.js');
    if (fs.existsSync(scratch3ControlPath)) {
        let content = fs.readFileSync(scratch3ControlPath, 'utf8');

        if (!content.includes('control_continue')) {
            const insertPoint = content.indexOf('control_break:');
            if (insertPoint !== -1) {
                const before = content.slice(0, insertPoint);
                const after = content.slice(insertPoint);
                content = before + 'control_continue: this.continue,\n            ' + after;
                fs.writeFileSync(scratch3ControlPath, content);
                console.info('Registered control_continue in scratch-vm');
            }
        }
    }

    const guiTranslationsPath = path.join(basePath, 'src', 'lib', 'tw-translations', 'generated-translations.json');
    if (fs.existsSync(guiTranslationsPath)) {
        let content = fs.readFileSync(guiTranslationsPath, 'utf8');

        try {
            const translations = JSON.parse(content);

            if (!translations['gui.opcodeLabels.costumes']) {
                translations['gui.opcodeLabels.costumes'] = '造型';
                fs.writeFileSync(guiTranslationsPath, JSON.stringify(translations, null, 4));
                console.info('Added gui.opcodeLabels.costumes translation');
            }
        } catch (e) {
            console.error('Error updating gui translations:', e.message);
        }
    }

    console.info('Scratch-blocks patches complete!');
};

const downloadMicrobitHex = async () => {
    const url = 'https://packagerdata.turbowarp.org/scratch-microbit-1.2.0.hex.zip';
    const expectedSHA256 = 'dfd574b709307fe76c44dbb6b0c8942e7908f4d5c18359fae25fbda3c9f4399';
    console.info(`Downloading ${url}`);
    const response = await crossFetch(url);
    const zipBuffer = Buffer.from(await response.arrayBuffer());
    const sha256 = nodeCrypto.createHash('sha-256').update(zipBuffer).digest('hex');
    if (sha256 !== expectedSHA256) {
        throw new Error(`microbit hex has SHA-256 ${sha256} but expected ${expectedSHA256}`);
    }
    const relativeHexDir = path.join('static', 'microbit');
    const hexFileName = await extractFirstMatchingFile(
        entry => /\.hex$/.test(entry.fileName),
        path.join('static', 'microbit'),
        zipBuffer
    );
    const relativeHexFile = path.join(relativeHexDir, hexFileName);
    const relativeGeneratedDir = path.join('src', 'generated');
    const relativeGeneratedFile = path.join(relativeGeneratedDir, 'microbit-hex-url.cjs');
    const absoluteGeneratedDir = path.join(basePath, relativeGeneratedDir);
    fs.mkdirSync(absoluteGeneratedDir, { recursive: true });
    const absoluteGeneratedFile = path.join(basePath, relativeGeneratedFile);
    const requirePath = `./${path
        .relative(relativeGeneratedDir, relativeHexFile)
        .split(path.win32.sep)
        .join(path.posix.sep)}`;
    fs.writeFileSync(
        absoluteGeneratedFile,
        [
            '// This file is generated by scripts/prepublish.mjs',
            '// Do not edit this file directly',
            '// This file relies on a loader to turn this `require` into a URL',
            `module.exports = require('${requirePath}');`,
            ''
        ].join('\n')
    );
    console.info(`Wrote ${relativeGeneratedFile}`);
};

const syncPenguinMod = async () => {
    const SOURCE ='https://raw.githubusercontent.com/PenguinMod/PenguinMod-ExtensionsGallery/main/src/lib/extensions.js';
    const relativeOutFile = path.join('static', 'penguinmod', 'extensions.js');
    const absoluteOutFile = path.join(basePath, relativeOutFile);
    console.info('[PenguinMod] Fetching gallery…');
    const res = await crossFetch(SOURCE);
    if (!res.ok) throw new Error(`[PenguinMod] Fetch failed: ${res.status}`);
    const code = await res.text();
    if (!code.includes('export default'))
        throw new Error('[PenguinMod] Invalid PenguinMod module');
    const wrapped = `
${code}
`;
    fs.mkdirSync(path.dirname(absoluteOutFile), { recursive: true });
    fs.writeFileSync(absoluteOutFile, wrapped, 'utf8');
    console.info(`[PenguinMod] Wrote ${relativeOutFile}`);
};

const prepublish = async () => {
    applyScratchBlocksPatches();
    await downloadMicrobitHex();
    try {
        await syncPenguinMod();
    } catch (error) {
        console.warn('PenguinMod sync failed, continuing with build:', error.message);
    }
};

prepublish().then(
    () => {
        console.info('Prepublish script complete');
        process.exit(0);
    },
    e => {
        console.error(e);
        process.exit(1);
    }
);

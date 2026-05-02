const fs = require('fs');
const path = require('path');

const scratchBlocksPath = path.join(__dirname, '..', 'node_modules', 'scratch-blocks');
const scratchVmPath = path.join(__dirname, '..', 'node_modules', 'scratch-vm');

console.log('Applying scratch-blocks and scratch-vm patches...');

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
            console.log('Patched scratch_msgs.js with new translations');
        }
    }

    if (content.includes('"CONTROL_SWITCH": "切换 %1"')) {
        content = content.replace('"CONTROL_SWITCH": "切换 %1"', '"CONTROL_SWITCH": "对于 %1"');
        fs.writeFileSync(scratchMsgsPath, content);
        console.log('Fixed CONTROL_SWITCH translation');
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
        console.log('Added control_continue block to blocks_vertical/control.js');
    }

    if (content.includes('"message2": "break"')) {
        content = content.replace('"message2": "break"', '"message2": Blockly.Msg.CONTROL_BREAK');
        fs.writeFileSync(controlVerticalPath, content);
        console.log('Fixed control_case break message to use translation');
    }
}

const compressedVerticalPath = path.join(scratchBlocksPath, 'blocks_compressed_vertical.js');
if (fs.existsSync(compressedVerticalPath)) {
    let content = fs.readFileSync(compressedVerticalPath, 'utf8');

    const replacements = [
        ['CONTROL_SWITCH",message0:Blockly.Msg.CONTROL_SWITCH', 'CONTROL_SWITCH",message0:Blockly.Msg.CONTROL_SWITCH'],
        ['CONTROL_CASE",message0:Blockly.Msg.CONTROL_CASE', 'CONTROL_CASE",message0:Blockly.Msg.CONTROL_CASE'],
        ['CONTROL_CASE_FALLTHROUGH",message0:Blockly.Msg.CONTROL_CASE_FALLTHROUGH', 'CONTROL_CASE_FALLTHROUGH",message0:Blockly.Msg.CONTROL_CASE_FALLTHROUGH'],
        ['CONTROL_DEFAULT",message0:Blockly.Msg.CONTROL_DEFAULT', 'CONTROL_DEFAULT",message0:Blockly.Msg.CONTROL_DEFAULT'],
        ['CONTROL_BREAK",message0:Blockly.Msg.CONTROL_BREAK', 'CONTROL_BREAK",message0:Blockly.Msg.CONTROL_BREAK'],
        ['CONTROL_CONTINUE",message0:Blockly.Msg.CONTROL_CONTINUE', 'CONTROL_CONTINUE",message0:Blockly.Msg.CONTROL_CONTINUE']
    ];

    let modified = false;
    for (const [oldStr, newStr] of replacements) {
        if (content.includes(oldStr) && !content.includes('CONTROL_CONTINUE"]')) {
            const oldBlock = `Blockly.Blocks.control_continue={init:function(){this.jsonInit({message0:Blockly.Msg.CONTROL_CONTINUE,category:Blockly.Categories.control,extensions:["colours_control","shape_statement"]})}}`;
            const newBlock = `Blockly.Blocks.control_continue={init:function(){this.jsonInit({message0:Blockly.Msg.CONTROL_CONTINUE,category:Blockly.Categories.control,extensions:["colours_control","shape_statement"]})}}`;
            if (content.includes(oldBlock)) {
                content = content.replace(oldBlock, newBlock);
                modified = true;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(compressedVerticalPath, content);
        console.log('Patched blocks_compressed_vertical.js');
    }
}

const shimCompressedVerticalPath = path.join(scratchBlocksPath, 'shim', 'blocks_compressed_vertical.js');
if (fs.existsSync(shimCompressedVerticalPath)) {
    let content = fs.readFileSync(shimCompressedVerticalPath, 'utf8');

    if (content.includes('"CONTROL_CONTINUE": "continue"') || content.includes("'CONTROL_CONTINUE': 'continue'")) {
        content = content.replace(/"CONTROL_CONTINUE": "continue"/g, '"CONTROL_CONTINUE": "继续"');
        content = content.replace(/'CONTROL_CONTINUE': 'continue'/g, "'CONTROL_CONTINUE': '继续'");
        fs.writeFileSync(shimCompressedVerticalPath, content);
        console.log('Patched shim/blocks_compressed_vertical.js');
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
            console.log('Registered control_continue in scratch-vm');
        }
    }
}

const guiTranslationsPath = path.join(__dirname, '..', 'src', 'lib', 'tw-translations', 'generated-translations.json');
if (fs.existsSync(guiTranslationsPath)) {
    let content = fs.readFileSync(guiTranslationsPath, 'utf8');

    try {
        const translations = JSON.parse(content);

        if (!translations['gui.opcodeLabels.costumes']) {
            translations['gui.opcodeLabels.costumes'] = '造型';
            fs.writeFileSync(guiTranslationsPath, JSON.stringify(translations, null, 4));
            console.log('Added gui.opcodeLabels.costumes translation');
        }
    } catch (e) {
        console.error('Error updating gui translations:', e.message);
    }
}

console.log('Patching complete!');

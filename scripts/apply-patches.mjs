import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const basePath = path.join(__dirname, '..');

const applyScratchBlocksPatches = () => {
    console.info('Applying scratch-blocks patches...');
    
    const scratchBlocksPath = path.join(basePath, 'node_modules', 'scratch-blocks');
    
    // Patch 1: Fix Chinese translations in scratch_msgs.js
    const scratchMsgsPath = path.join(scratchBlocksPath, 'msg', 'scratch_msgs.js');
    if (fs.existsSync(scratchMsgsPath)) {
        let content = fs.readFileSync(scratchMsgsPath, 'utf8');
        
        // Fix CONTROL_SWITCH translation
        content = content.replace(
            /"CONTROL_SWITCH": "切换 %1"/g,
            '"CONTROL_SWITCH": "对于 %1"'
        );
        
        // Fix CONTROL_BREAK translation  
        content = content.replace(
            /"CONTROL_BREAK": "中断"/g,
            '"CONTROL_BREAK": "终止"'
        );
        
        // Fix OPERATORS_PI translation
        content = content.replace(
            /"OPERATORS_PI": "圆周率"/g,
            '"OPERATORS_PI": "π"'
        );
        
        // Add UNSUPPORT_TW translations if not exists
        if (!content.includes('UNSUPPORT_TW_1')) {
            content = content.replace(
                'Blockly.ScratchMsgs.locales["zh-cn"] = {\n    "CONTROL_FOREVER"',
                'Blockly.ScratchMsgs.locales["zh-cn"] = {\n    "UNSUPPORT_TW_1": "以下积木不支持 TurboWarp",\n    "UNSUPPORT_TW_2": "我们强烈建议不去使用它们",\n    "UNSUPPORT_TW_3": "它们仅用于与 MistWarp 兼容",\n    "CONTROL_FOREVER"'
            );
        }
        
        fs.writeFileSync(scratchMsgsPath, content);
        console.info('Patched scratch_msgs.js');
    }
    
    // Patch 2: Fix control_case in blocks_vertical/control.js
    const verticalControlPath = path.join(scratchBlocksPath, 'blocks_vertical', 'control.js');
    if (fs.existsSync(verticalControlPath)) {
        let content = fs.readFileSync(verticalControlPath, 'utf8');
        
        // Fix hardcoded "break" in control_case
        content = content.replace(
            /"message2": "break", \/\/ Break indicator/g,
            '"message2": Blockly.Msg.CONTROL_BREAK, // Break indicator'
        );
        
        // Add control_continue definition if not exists
        if (!content.includes("Blockly.Blocks['control_continue']")) {
            content = content.replace(
                'Blockly.Blocks[\'control_break\'] = {[^}]+};',
                'Blockly.Blocks[\'control_break\'] = {\n  /**\n   * Block for break statement.\n   * @this Blockly.Block\n   */\n  init: function() {\n    this.jsonInit({\n      "message0": Blockly.Msg.CONTROL_BREAK,\n      "category": Blockly.Categories.control,\n      "extensions": ["colours_control", "shape_statement", "shape_end"]\n    });\n  }\n};\n\nBlockly.Blocks[\'control_continue\'] = {\n  /**\n   * Block for continue statement.\n   * @this Blockly.Block\n   */\n  init: function() {\n    this.jsonInit({\n      "message0": Blockly.Msg.CONTROL_CONTINUE,\n      "category": Blockly.Categories.control,\n      "extensions": ["colours_control", "shape_statement"]\n    });\n  }\n};'
            );
        }
        
        fs.writeFileSync(verticalControlPath, content);
        console.info('Patched blocks_vertical/control.js');
    }
    
    // Patch 3: Fix blocks_compressed_vertical.js
    const compressedVerticalPath = path.join(scratchBlocksPath, 'blocks_compressed_vertical.js');
    if (fs.existsSync(compressedVerticalPath)) {
        let content = fs.readFileSync(compressedVerticalPath, 'utf8');
        
        // Fix hardcoded "break" in control_case
        content = content.replace(
            /control_case.*message2:"break"/g,
            'control_case={init:function(){this.jsonInit({message0:Blockly.Msg.CONTROL_CASE,message1:"%1",message2:Blockly.Msg.CONTROL_BREAK'
        );
        
        // Add control_continue if not exists
        if (!content.includes('control_continue')) {
            content = content.replace(
                /control_break={init:function\(\)\{this\.jsonInit\(\{message0:Blockly\.Msg\.CONTROL_BREAK.*?\}\)\}\};/g,
                'control_break={init:function(){this.jsonInit({message0:Blockly.Msg.CONTROL_BREAK,category:Blockly.Categories.control,extensions:["colours_control","shape_statement","shape_end"]})}};Blockly.Blocks.control_continue={init:function(){this.jsonInit({message0:Blockly.Msg.CONTROL_CONTINUE,category:Blockly.Categories.control,extensions:["colours_control","shape_statement"]})}};'
            );
        }
        
        fs.writeFileSync(compressedVerticalPath, content);
        console.info('Patched blocks_compressed_vertical.js');
    }
    
    // Patch 4: Fix blocks_compressed_horizontal.js
    const compressedHorizontalPath = path.join(scratchBlocksPath, 'blocks_compressed_horizontal.js');
    if (fs.existsSync(compressedHorizontalPath)) {
        let content = fs.readFileSync(compressedHorizontalPath, 'utf8');
        
        // Fix hardcoded "break" in control_case
        content = content.replace(
            /control_case.*message2:"break"/g,
            'control_case={init:function(){this.jsonInit({id:"control_case",message0:"%1 %2",args0:[{type:"field_image",src:Blockly.mainWorkspace.options.pathToMedia+"icons/control_case.svg",width:40,height:40,alt:"Case"},{type:"input_value",name:"VALUE"}],message1:"%1",args1:[{type:"input_statement",name:"SUBSTACK"}],message2:Blockly.Msg.CONTROL_BREAK'
        );
        
        // Add control_continue if not exists
        if (!content.includes('control_continue')) {
            content = content.replace(
                /control_break=\{init:function\(\)\{this\.jsonInit\(\{id:"control_break".*?\}\)\}\};/g,
                'control_break={init:function(){this.jsonInit({id:"control_break",message0:"%1",args0:[{type:"field_image",src:Blockly.mainWorkspace.options.pathToMedia+"icons/control_break.svg",width:40,height:40,alt:"Break"}],inputsInline:!0,previousStatement:null,category:Blockly.Categories.control,colour:Blockly.Colours.control.primary,colourSecondary:Blockly.Colours.control.secondary,colourTertiary:Blockly.Colours.control.tertiary,colourQuaternary:Blockly.Colours.control.quaternary})}};Blockly.Blocks.control_continue={init:function(){this.jsonInit({id:"control_continue",message0:"%1",args0:[{type:"field_image",src:Blockly.mainWorkspace.options.pathToMedia+"icons/control_continue.svg",width:40,height:40,alt:"Continue"}],inputsInline:!0,previousStatement:null,nextStatement:null,category:Blockly.Categories.control,colour:Blockly.Colours.control.primary,colourSecondary:Blockly.Colours.control.secondary,colourTertiary:Blockly.Colours.control.tertiary,colourQuaternary:Blockly.Colours.control.quaternary})}};'
            );
        }
        
        fs.writeFileSync(compressedHorizontalPath, content);
        console.info('Patched blocks_compressed_horizontal.js');
    }
    
    console.info('scratch-blocks patches applied successfully');
};

const applyScratchVmPatches = () => {
    console.info('Applying scratch-vm patches...');
    
    const scratchVmPath = path.join(basePath, 'node_modules', 'scratch-vm');
    
    // Patch: Add control_continue to getPrimitives if not exists
    const scratch3ControlPath = path.join(scratchVmPath, 'src', 'blocks', 'scratch3_control.js');
    if (fs.existsSync(scratch3ControlPath)) {
        let content = fs.readFileSync(scratch3ControlPath, 'utf8');
        
        if (!content.includes('control_continue: this.continue')) {
            content = content.replace(
                /control_break: this\.break,/,
                'control_break: this.break,\n            control_continue: this.continue,'
            );
            
            fs.writeFileSync(scratch3ControlPath, content);
            console.info('Patched scratch3_control.js');
        }
    }
    
    console.info('scratch-vm patches applied successfully');
};

const applyPatches = async () => {
    try {
        await applyScratchBlocksPatches();
        await applyScratchVmPatches();
        console.info('All patches applied successfully');
        process.exit(0);
    } catch (error) {
        console.error('Failed to apply patches:', error);
        process.exit(1);
    }
};

applyPatches();
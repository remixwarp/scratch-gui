/**
 * LanguageService - 语言包管理服务
 * 
 * 该服务负责：
 * 1. 加载和保存用户自定义语言包
 * 2. 生成包含所有翻译键的示例语言包模板
 * 3. 提供翻译回退机制
 * 
 * 支持的翻译类别：
 * - interface: 编辑器主界面（菜单、按钮、对话框等）
 * - blocks: 所有积木的文本
 * - extensions: 官方扩展的文本
 * - paint-editor: 绘图编辑器的文本
 * - addons: 第三方插件的文本
 */

import locales from '@remixwarp/scratch-l10n';
import editorMessages from '@remixwarp/scratch-l10n/locales/editor-msgs';

class LanguageService {
    constructor() {
        this.userLanguagePackages = {};  // 存储用户上传的语言包
        this.defaultLanguage = 'en';     // 默认回退语言
        this.currentLocale = this.getDefaultLocale();
        this.addonL10n = {};  // 初始化插件本地化（延迟加载）
    }

    /**
     * 获取浏览器默认语言
     * @returns {string} 语言代码（如 zh-cn, en）
     */
    getDefaultLocale() {
        const navigatorLang = navigator.language || navigator.userLanguage || 'en';
        const langCode = navigatorLang.split('-')[0].toLowerCase();
        return Object.keys(locales).includes(langCode) ? langCode : 'en';
    }

    /**
     * 从localStorage加载已保存的用户语言包
     */
    loadStoredPackages() {
        try {
            const stored = localStorage.getItem('userLanguagePackages');
            if (stored) {
                this.userLanguagePackages = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load stored language packages:', e);
        }
    }

    /**
     * 保存用户语言包到localStorage
     */
    savePackages() {
        try {
            localStorage.setItem('userLanguagePackages', JSON.stringify(this.userLanguagePackages));
        } catch (e) {
            console.error('Failed to save language packages:', e);
        }
    }

    /**
     * 从localStorage加载上次选中的语言
     */
    loadCurrentLocale() {
        try {
            const stored = localStorage.getItem('currentLocale');
            if (stored) {
                this.currentLocale = stored;
                console.log('=== 已加载上次选中的语言 ===', this.currentLocale);
            }
        } catch (e) {
            console.error('Failed to load current locale:', e);
        }
    }

    /**
     * 保存当前选中的语言到localStorage
     * @param {string} locale - 语言代码
     */
    saveCurrentLocale(locale) {
        try {
            this.currentLocale = locale;
            localStorage.setItem('currentLocale', locale);
            console.log('=== 已保存当前语言 ===', locale);
        } catch (e) {
            console.error('Failed to save current locale:', e);
        }
    }

    /**
     * 加载插件本地化文件
     * 路径: src/addons/addons-l10n/
     * 包含: background, block-pins, language-package 等插件的翻译
     * @returns {Object} 插件本地化数据
     */
    loadAddonL10n() {
        const addonL10n = {};
        try {
            const zhCnData = require('../addons/addons-l10n/zh-cn.json');
            const enData = require('../addons/addons-l10n/en.json');
            addonL10n['zh-cn'] = zhCnData;
            addonL10n['en'] = enData;
        } catch (e) {
            console.error('Failed to load addon localization files:', e);
        }
        return addonL10n;
    }

    /**
     * 加载所有翻译类别文件
     * 包含以下类别：
     * 1. interface - 编辑器主界面翻译
     *    - 示例键: gui.menuBar.file, gui.menuBar.edit, gui.modal.ok
     * 2. blocks - 积木翻译
     *    - 示例键: block.motion.moveSteps, block.looks.say, block.control.forever
     * 3. extensions - 官方扩展翻译
     *    - 示例键: extension.pen.name, extension.videoSensing.name
     * 4. paint-editor - 绘图编辑器翻译
     *    - 示例键: paintEditor.tools.pencil, paintEditor.tools.eraser
     * @returns {Object} 所有翻译数据
     */
    loadAllTranslationFiles() {
        // editorMessages is the bundled, pre-translated message catalog from
        // @remixwarp/scratch-l10n/locales/editor-msgs, shaped as
        // { [locale]: { [messageKey]: translatedString } }.
        // Previously this method tried to require per-category JSON files
        // (@remixwarp/scratch-l10n/editor/<category>/<locale>.json) which do
        // not exist in the package, causing every load to fail and fall back
        // to missing translations. We now read straight from the bundled
        // catalog so translations resolve correctly and synchronously.
        const allData = {};
        const localesToLoad = ['zh-cn', 'en'];

        localesToLoad.forEach(locale => {
            const catalog = editorMessages[locale];
            if (!catalog) {
                return;
            }
            if (!allData[locale]) {
                allData[locale] = {};
            }
            Object.keys(catalog).forEach(key => {
                allData[locale][key] = catalog[key];
            });
        });

        return allData;
    }

    /**
     * 上传语言包
     * @param {string} content - JSON格式的语言包内容
     * @returns {Object} { success: boolean, errors: array, message?: string, locale?: string }
     * 
     * 语言包格式要求：
     * {
     *   "locale": "zh-cn",           // 必填：语言代码
     *   "name": "简体中文",          // 必填：语言包名称
     *   "description": "描述",       // 可选：语言包描述
     *   "translations": {            // 必填：翻译键值对
     *     "key1": "翻译内容1",
     *     "key2": "翻译内容2"
     *   }
     * }
     */
    uploadLanguagePackage(content) {
        const errors = [];
        let data;

        try {
            data = JSON.parse(content);
        } catch (e) {
            errors.push('JSON格式无效，请检查JSON语法');
            return { success: false, errors };
        }

        if (typeof data !== 'object' || data === null) {
            errors.push('语言包必须是JSON对象');
            return { success: false, errors };
        }

        if (!data.locale) {
            errors.push('缺少必需字段: locale（语言代码，如 zh-cn, en）');
        }
        if (!data.name) {
            errors.push('缺少必需字段: name（语言包名称，如 简体中文）');
        }
        if (typeof data.translations !== 'object') {
            errors.push('translations必须是对象（翻译键值对）');
        }

        if (errors.length > 0) {
            return { success: false, errors };
        }

        if (data.translations) {
            Object.keys(data.translations).forEach(key => {
                if (key.startsWith('//')) {
                    delete data.translations[key];
                }
            });
        }

        this.userLanguagePackages[data.locale] = data;
        this.savePackages();

        console.log('=== 语言包上传成功 ===');
        console.log('语言代码:', data.locale);
        console.log('语言包名称:', data.name);
        console.log('翻译键数量:', Object.keys(data.translations || {}).length);
        console.log('前5个翻译键:', Object.keys(data.translations || {}).slice(0, 5));

        return { 
            success: true, 
            message: `语言包 "${data.name}" 上传成功！包含 ${Object.keys(data.translations || {}).length} 个翻译键。`,
            locale: data.locale 
        };
    }

    /**
     * 生成测试语言包（简体中文）
     * 包含少量常用翻译键，用于测试上传功能
     * @returns {Object} 测试语言包
     */
    generateTestPackage() {
        return {
            "locale": "zh-cn-custom",
            "name": "测试简体中文",
            "description": "用于测试的简体中文语言包",
            "translations": {
                "gui.menuBar.file": "文档",
                "gui.menuBar.edit": "编辑",
                "gui.menuBar.language": "语言设置",
                "gui.menuBar.theme": "主题设置",
                "gui.menuBar.backpack": "背包",
                "gui.stageHeader.greenFlag": "绿旗开始",
                "gui.spriteSelector.addSprite": "添加角色",
                "gui.backpack.empty": "背包是空的",
                "gui.modal.ok": "确认",
                "gui.modal.cancel": "取消",
                "block.motion.moveSteps": "移动 {STEPS} 步",
                "block.looks.say": "说 {MESSAGE}",
                "block.control.forever": "重复执行",
                "block.event.whenGreenFlag": "当绿旗被点击",
                "extension.pen.name": "画笔扩展",
                "extension.music.name": "音乐扩展",
                "gui.spriteInfo.name": "轻盈狐测试",
                
                // 积木翻译键（ScratchMsgs 格式）
                // 这些键用于积木文本的翻译，格式为大写加下划线
                "UNSUPPORT_TW_1": "以下积木不支持 TurboWarp",
                "UNSUPPORT_TW_2": "我们强烈不建议使用它们",
                "UNSUPPORT_TW_3": "它们仅为兼容 MistWarp 而保留",
                "LOOKS_HELLO": "你好！",
                "LOOKS_HMM": "嗯...",
                "SENSING_ASK_TEXT": "你叫什么名字？",
                "OPERATORS_JOIN_APPLE": "苹果",
                "OPERATORS_JOIN_BANANA": "香蕉",
                "OPERATORS_LETTEROF_APPLE": "苹"
            }
        };
    }

    /**
     * 生成语言包模板
     * @param {string} locale - 语言代码（默认 'en'）
     * @returns {Object} 完整的语言包模板
     * 
     * 模板包含以下内容：
     * 1. 基本信息（locale, name, description）
     * 2. 详细说明（instructions）
     * 3. 所有翻译键（translations）
     * 
     * 翻译键分类说明：
     * - gui.*: 界面相关（菜单、按钮、对话框）
     * - block.*: 积木相关（积木名称、参数）
     * - extension.*: 扩展相关（扩展名称、描述）
     * - paintEditor.*: 绘图编辑器相关
     * - background.*: 背景插件相关
     * - block-pins.*: 积木置顶插件相关
     * - language-package.*: 语言包管理插件相关
     */
    generateTemplate(locale = 'en') {
        const translations = this.getAllTranslationKeys(locale);
        
        const isChinese = locale === 'zh-cn';
        
        const template = {
            /**
             * locale (必填) - 语言代码
             * 格式: 小写，使用连字符分隔
             * 示例: zh-cn, en, ja, ko, fr
             */
            locale: locale,
            
            /**
             * name (必填) - 语言包名称
             * 显示在语言选择菜单中
             * 示例: 简体中文, English, 日本語
             */
            name: isChinese ? '简体中文语言包' : 'English Language Pack',
            
            /**
             * description (可选) - 语言包描述
             * 简短描述该语言包的内容或特点
             */
            description: isChinese 
                ? '包含编辑器所有文本的翻译，包括界面、积木、扩展和插件'
                : 'Contains translations for all editor text, including interface, blocks, extensions, and addons',
            
            /**
             * instructions - 编写说明
             * 请仔细阅读以下说明后再修改翻译内容
             */
            instructions: {
                /**
                 * ==================== 如何使用此模板 ====================
                 * 1. 将此文件保存为 JSON 格式（建议使用 UTF-8 编码）
                 * 2. 找到 translations 部分，修改您想要翻译的键值
                 * 3. 保留所有翻译键，不要删除任何键
                 * 4. 在编辑器语言菜单中点击"上传语言包"按钮
                 * 5. 选择修改后的文件即可应用自定义翻译
                 * ==========================================================
                 */
                howToUse: isChinese ? [
                    '1. 将此文件保存为 JSON 格式（建议使用 UTF-8 编码）',
                    '2. 找到 translations 部分，修改您想要翻译的键值',
                    '3. 保留所有翻译键，不要删除任何键',
                    '4. 在编辑器语言菜单中点击"上传语言包"按钮',
                    '5. 选择修改后的文件即可应用自定义翻译'
                ] : [
                    '1. Save this file as JSON format (UTF-8 encoding recommended)',
                    '2. Find the translations section and modify values as needed',
                    '3. Keep all translation keys, do not delete any',
                    '4. Click "Upload Language Pack" in editor language menu',
                    '5. Select the modified file to apply custom translations'
                ],
                
                /**
                 * ==================== 翻译键分类说明 ====================
                 * 以下是翻译键的分类，帮助您理解哪些键对应哪些功能：
                 * ==========================================================
                 */
                categories: isChinese ? {
                    '__说明': '以下是翻译键的分类说明',
                    'gui.*': '编辑器主界面（菜单、按钮、对话框、提示信息等）',
                    'block.*': '积木文本（所有积木的名称、参数、提示等）',
                    'extension.*': '官方扩展（扩展名称、描述、积木等）',
                    'paintEditor.*': '绘图编辑器（工具名称、选项、提示等）',
                    'background.*': '背景插件（背景设置相关文本）',
                    'block-pins.*': '积木置顶插件（置顶功能相关文本）',
                    'language-package.*': '语言包管理插件（语言包功能相关文本）',
                    'editor-devtools.*': '开发者工具插件（整理积木等功能相关文本）',
                    '__示例': '例如: gui.menuBar.file, block.motion.moveSteps, extension.pen.name'
                } : {
                    '__note': 'Below are categories of translation keys',
                    'gui.*': 'Editor interface (menus, buttons, dialogs, messages)',
                    'block.*': 'Block text (all block names, parameters, hints)',
                    'extension.*': 'Official extensions (names, descriptions, blocks)',
                    'paintEditor.*': 'Paint editor (tool names, options, hints)',
                    'background.*': 'Background addon (background settings text)',
                    'block-pins.*': 'Block pinning addon (pinning functionality text)',
                    'language-package.*': 'Language package addon (language management text)',
                    'editor-devtools.*': 'Developer tools addon (block cleanup text)',
                    '__example': 'e.g., gui.menuBar.file, block.motion.moveSteps, extension.pen.name'
                },
                
                /**
                 * ==================== 注意事项 ====================
                 * 请务必遵守以下规则，否则语言包可能无法正常工作：
                 * ==========================================================
                 */
                notes: isChinese ? [
                    '⚠️ 所有翻译键都必须保留，即使您不想翻译它们',
                    '⚠️ 如果某个翻译键的值为空字符串，系统将使用默认英文翻译',
                    '⚠️ 请确保JSON格式正确（使用在线JSON校验工具检查）',
                    '⚠️ 语言代码(locale)必须唯一，不能与现有语言重复',
                    '⚠️ 建议使用 UTF-8 编码保存文件，以支持中文等非ASCII字符',
                    '💡 提示：您可以只修改部分翻译键，未修改的将使用默认值',
                    '💡 提示：如果您添加新的翻译键，系统会忽略它们'
                ] : [
                    '⚠️ All translation keys must be preserved, even if you don\'t want to translate them',
                    '⚠️ If a translation value is empty string, system will use default English',
                    '⚠️ Ensure JSON format is correct (use online JSON validator)',
                    '⚠️ Locale code must be unique and not duplicate existing languages',
                    '⚠️ Recommended to save file with UTF-8 encoding for non-ASCII characters',
                    '💡 Tip: You can modify only some translation keys, unmodified ones use default',
                    '💡 Tip: New translation keys you add will be ignored by the system'
                ]
            },
            
            /**
             * translations - 翻译键值对
             * 格式: "翻译键": "翻译内容"
             * 
             * 以下包含所有可用的翻译键，按字母顺序排列：
             * 请直接修改冒号后面的翻译内容，不要修改键名！
             */
            translations: this.generateTranslationsWithNotes(translations)
        };

        return template;
    }

    /**
     * 生成带注释说明的翻译键对象
     * @param {Object} translations - 原始翻译键值对
     * @returns {Object} 添加了分类注释的翻译键值对
     */
    generateTranslationsWithNotes(translations) {
        const categorized = {};
        const isChinese = this.currentLocale === 'zh-cn';
        
        categorized['// ==================== 编辑器主界面 (GUI) ===================='] = '';
        categorized['// 包含菜单、按钮、对话框、提示信息等'] = '';
        
        Object.keys(translations).forEach(key => {
            if (key.startsWith('gui.')) {
                categorized[key] = translations[key];
            }
        });
        
        categorized['// ==================== 积木翻译 (Blocks) ===================='] = '';
        categorized['// 包含所有积木的名称、参数、提示等'] = '';
        
        Object.keys(translations).forEach(key => {
            if (key.startsWith('block.')) {
                categorized[key] = translations[key];
            }
        });
        
        categorized['// ==================== 官方扩展 (Extensions) ===================='] = '';
        categorized['// 包含扩展名称、描述、积木等'] = '';
        
        Object.keys(translations).forEach(key => {
            if (key.startsWith('extension.')) {
                categorized[key] = translations[key];
            }
        });
        
        categorized['// ==================== 绘图编辑器 (Paint Editor) ===================='] = '';
        categorized['// 包含工具名称、选项、提示等'] = '';
        
        Object.keys(translations).forEach(key => {
            if (key.startsWith('paintEditor.')) {
                categorized[key] = translations[key];
            }
        });
        
        categorized['// ==================== 插件翻译 (Addons) ===================='] = '';
        categorized['// 包含各种插件的文本'] = '';
        
        categorized['// --- 背景插件 ---'] = '';
        Object.keys(translations).forEach(key => {
            if (key.startsWith('background/')) {
                categorized[key] = translations[key];
            }
        });
        
        categorized['// --- 积木置顶插件 ---'] = '';
        Object.keys(translations).forEach(key => {
            if (key.startsWith('block-pins/')) {
                categorized[key] = translations[key];
            }
        });
        
        categorized['// --- 语言包管理插件 ---'] = '';
        Object.keys(translations).forEach(key => {
            if (key.startsWith('language-package/')) {
                categorized[key] = translations[key];
            }
        });
        
        categorized['// --- 开发者工具插件 ---'] = '';
        Object.keys(translations).forEach(key => {
            if (key.startsWith('editor-devtools/')) {
                categorized[key] = translations[key];
            }
        });
        
        categorized['// ==================== 其他翻译 (Other) ===================='] = '';
        categorized['// 不属于以上分类的其他翻译'] = '';
        
        Object.keys(translations).forEach(key => {
            if (!key.startsWith('gui.') && 
                !key.startsWith('block.') && 
                !key.startsWith('extension.') && 
                !key.startsWith('paintEditor.') && 
                !key.startsWith('background/') && 
                !key.startsWith('block-pins/') && 
                !key.startsWith('language-package/') && 
                !key.startsWith('editor-devtools/')) {
                categorized[key] = translations[key];
            }
        });
        
        return categorized;
    }

    /**
     * 获取所有翻译键
     * @param {string} locale - 语言代码
     * @returns {Object} 所有翻译键值对
     * 
     * 合并以下来源的翻译键：
     * 1. interface - 编辑器主界面
     * 2. blocks - 积木
     * 3. extensions - 官方扩展
     * 4. paint-editor - 绘图编辑器
     * 5. addons - 第三方插件
     */
    getAllTranslationKeys(locale = 'en') {
        const allKeys = {};
        const allTranslationData = this.loadAllTranslationFiles();
        
        // 加载指定语言的翻译
        if (allTranslationData[locale]) {
            Object.keys(allTranslationData[locale]).forEach(key => {
                allKeys[key] = allTranslationData[locale][key];
            });
        }

        // 如果不是英文，补充英文翻译作为回退
        if (locale !== 'en' && allTranslationData['en']) {
            Object.keys(allTranslationData['en']).forEach(key => {
                if (!allKeys[key]) {
                    allKeys[key] = allTranslationData['en'][key];
                }
            });
        }

        // 加载插件翻译
        const addonLocale = this.addonL10n[locale];
        if (addonLocale) {
            Object.keys(addonLocale).forEach(key => {
                if (!allKeys[key]) {
                    allKeys[key] = addonLocale[key];
                }
            });
        }

        // 如果不是英文，补充插件英文翻译
        const addonEnLocale = this.addonL10n['en'];
        if (addonEnLocale && locale !== 'en') {
            Object.keys(addonEnLocale).forEach(key => {
                if (!allKeys[key]) {
                    allKeys[key] = addonEnLocale[key];
                }
            });
        }

        return allKeys;
    }

    /**
     * 获取翻译内容（带回退机制）
     * @param {string} locale - 语言代码
     * @param {string} key - 翻译键
     * @returns {string} 翻译内容
     * 
     * 回退顺序：
     * 1. 用户自定义语言包
     * 2. 系统语言文件
     * 3. 默认英文
     * 4. 原始键名
     */
    getTranslation(locale, key) {
        // 1. 优先使用用户自定义语言包
        if (this.userLanguagePackages[locale] && 
            this.userLanguagePackages[locale].translations && 
            this.userLanguagePackages[locale].translations[key]) {
            return this.userLanguagePackages[locale].translations[key];
        }

        // 2. 使用系统语言文件 (editorMessages)
        if (editorMessages[locale] && editorMessages[locale][key]) {
            return editorMessages[locale][key];
        }

        // 3. 使用默认英文回退
        if (editorMessages[this.defaultLanguage] && 
            editorMessages[this.defaultLanguage][key]) {
            return editorMessages[this.defaultLanguage][key];
        }

        // 4. 返回原始键名
        return key;
    }

    /**
     * 获取所有可用语言列表（系统语言 + 用户自定义语言包）
     * 用户上传的语言包翻译会与系统翻译合并，用户翻译优先级更高
     * @returns {Object} 语言列表
     */
    getAvailableLocales() {
        const available = {};
        
        console.log('=== 获取可用语言列表 ===');
        console.log('locales 对象键:', Object.keys(locales));
        console.log('editorMessages 键:', Object.keys(editorMessages));
        
        Object.keys(locales).forEach(locale => {
            const localeData = locales[locale];
            const messages = editorMessages[locale] || {};
            
            available[locale] = {
                name: localeData.name || locale,
                messages: messages,
                isSystem: true  // 标记为系统语言
            };
        });
        
        console.log('系统语言数量:', Object.keys(available).length);
        console.log('用户语言包数量:', Object.keys(this.userLanguagePackages).length);
        
        Object.keys(this.userLanguagePackages).forEach(locale => {
            const userPackage = this.userLanguagePackages[locale];
            const systemMessages = available[locale] && available[locale].messages ? available[locale].messages : {};
            const userMessages = userPackage.translations || {};
            
            console.log(`语言: ${locale}, 系统翻译键数: ${Object.keys(systemMessages).length}, 用户翻译键数: ${Object.keys(userMessages).length}`);
            
            // 如果用户语言包使用的locale与系统语言相同，则合并翻译但保留系统语言名称
            // 如果用户语言包使用独特的locale（如 zh-cn-custom），则作为独立选项显示
            if (available[locale] && available[locale].isSystem) {
                // 用户语言包覆盖了系统语言的locale，合并翻译但保留系统语言名称
                available[locale] = {
                    name: available[locale].name,
                    messages: {...systemMessages, ...userMessages},
                    isSystem: true
                };
            } else {
                // 用户语言包使用独特的locale，作为独立选项显示
                available[locale] = {
                    name: userPackage.name,
                    messages: {...systemMessages, ...userMessages},
                    isSystem: false,
                    isCustom: true  // 标记为用户自定义语言包
                };
            }
        });

        return available;
    }

    /**
     * 删除用户语言包
     * @param {string} locale - 语言代码
     * @returns {boolean} 是否删除成功
     */
    deleteLanguagePackage(locale) {
        if (this.userLanguagePackages[locale]) {
            delete this.userLanguagePackages[locale];
            this.savePackages();
            return true;
        }
        return false;
    }
}

const languageService = new LanguageService();

export default languageService;
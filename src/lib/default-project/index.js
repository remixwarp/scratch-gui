import projectData from './project-data';

/* eslint-disable import/no-unresolved */
import overrideDefaultProject from '!arraybuffer-loader!./override-default-project.sb3';
import backdrop from '!raw-loader!./cd21514d0531fdffb22204e0ec5ed84a.svg';
import spriteCostume from '!raw-loader!./Fox.svg';
import yuCostume from '!raw-loader!./yu.svg';
/* eslint-enable import/no-unresolved */
import {TextEncoder} from '../tw-text-encoder';
import {
    isCustomDefaultSpriteEnabled,
    getCustomDefaultSprite,
    base64ToUint8Array
} from '../custom-default-sprite';

// 默认角色池：编辑器和每次打开时随机选择一个
const defaultSprites = [
    {
        assetId: '927d672925e7b99f7813735c484c6922',
        dataFormat: 'svg',
        rotationCenterX: 49.78,
        rotationCenterY: 44.67,
        svgContent: spriteCostume
    },
    {
        assetId: '9273979838f04746e92167f6c4ddb8be',
        dataFormat: 'svg',
        rotationCenterX: 48.79,
        rotationCenterY: 65.50,
        svgContent: yuCostume
    }
];

// 这些角色名是本项目自定义的，上游语言包里没有对应翻译，
// 直接按语言映射，避免 react-intl 的 "Missing message" 警告。
const SPRITE_LOCAL_NAMES = {
    flickFox: {
        en: 'Flick Fox',
        'zh-cn': '轻盈狐',
        wenyan: '轻狐',
        geng: '轻盈狐'
    },
    yu: {
        en: 'Yu',
        'zh-cn': '玉米',
        wenyan: '玉蜀黍',
        geng: '苞谷'
    }
};

const getCurrentLocale = () => {
    try {
        const store = window.ReduxStore;
        if (store && store.getState) {
            const locale = store.getState().locales && store.getState().locales.locale;
            if (locale) return locale;
        }
    } catch (e) {
        // ignore
    }
    return 'en';
};

const localSpriteName = key => {
    const names = SPRITE_LOCAL_NAMES[key];
    if (!names) return key;
    return names[getCurrentLocale()] || names.en;
};

const defaultProject = translateFunction => {
    // 构造阶段 storage.js 调 cacheDefaultProject() 时 this.translator 还没
    // 通过 setTranslatorFunction 注入；这里像 project-data.js 一样用一个
    // 简单 defaultTranslator 兜底，避免 undefined(message) 把整个 GUI 炸掉。
    const translator = translateFunction || (msgObj => msgObj.defaultMessage);

    if (overrideDefaultProject.byteLength > 0) {
        return [{
            id: 0,
            assetType: 'Project',
            dataFormat: 'JSON',
            data: overrideDefaultProject
        }];
    }

    let _TextEncoder;
    if (typeof TextEncoder === 'undefined') {
        _TextEncoder = require('text-encoding').TextEncoder;
    } else {
        _TextEncoder = TextEncoder;
    }
    const encoder = new _TextEncoder();

    const projectJson = projectData(translator);

    // 背景资源始终使用内置的
    const backdropAsset = {
        id: 'cd21514d0531fdffb22204e0ec5ed84a',
        assetType: 'ImageVector',
        dataFormat: 'SVG',
        data: encoder.encode(backdrop)
    };

    // 检查是否启用了自定义默认角色
    if (isCustomDefaultSpriteEnabled()) {
        const custom = getCustomDefaultSprite();
        if (custom) {
            try {
                const spriteBytes = base64ToUint8Array(custom.dataBase64);
                // 替换项目 JSON 中默认角色的造型
                const spriteTarget = projectJson.targets[1];
                const costume = spriteTarget.costumes[0];
                const dataFormat = custom.dataFormat;
                costume.assetId = custom.assetId;
                costume.md5ext = `${custom.assetId}.${dataFormat}`;
                costume.dataFormat = dataFormat;
                costume.bitmapResolution = dataFormat === 'svg' ? 1 : 2;
                costume.rotationCenterX = custom.rotationCenterX;
                costume.rotationCenterY = custom.rotationCenterY;
                // 设置角色名称
                if (custom.spriteName) {
                    spriteTarget.name = custom.spriteName;
                }
                // 注意：必须在修改 projectJson 之后再 stringify
                return [{
                    id: 0,
                    assetType: 'Project',
                    dataFormat: 'JSON',
                    data: JSON.stringify(projectJson)
                }, backdropAsset, {
                    id: custom.assetId,
                    assetType: dataFormat === 'svg' ? 'ImageVector' : 'ImageBitmap',
                    dataFormat: dataFormat.toUpperCase(),
                    data: spriteBytes
                }];
            } catch (e) {
                // 解析失败则回退到默认角色
                // eslint-disable-next-line no-console
                console.error('[custom-default-sprite] 应用失败，回退到默认角色:', e);
            }
        }
    }

    // 默认：从角色池中随机选取一个
    const picked = defaultSprites[Math.floor(Math.random() * defaultSprites.length)];
    const pickedNameKey = picked.assetId === '927d672925e7b99f7813735c484c6922' ?
        'flickFox' :
        'yu';

    // 更新项目 JSON 中的角色信息
    const spriteTarget = projectJson.targets[1];
    const costume = spriteTarget.costumes[0];
    costume.assetId = picked.assetId;
    costume.md5ext = `${picked.assetId}.${picked.dataFormat}`;
    costume.dataFormat = picked.dataFormat;
    costume.rotationCenterX = picked.rotationCenterX;
    costume.rotationCenterY = picked.rotationCenterY;
    spriteTarget.name = localSpriteName(pickedNameKey);

    return [{
        id: 0,
        assetType: 'Project',
        dataFormat: 'JSON',
        data: JSON.stringify(projectJson)
    }, backdropAsset, {
        id: picked.assetId,
        assetType: 'ImageVector',
        dataFormat: 'SVG',
        data: encoder.encode(picked.svgContent)
    }];
};

export default defaultProject;

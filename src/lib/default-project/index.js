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
        nameZh: '轻盈狐',
        nameEn: 'Flick Fox',
        assetId: '927d672925e7b99f7813735c484c6922',
        dataFormat: 'svg',
        rotationCenterX: 49.78,
        rotationCenterY: 44.67,
        svgContent: spriteCostume
    },
    {
        nameZh: '玉米',
        nameEn: 'Yu',
        assetId: '9273979838f04746e92167f6c4ddb8be',
        dataFormat: 'svg',
        rotationCenterX: 48.79,
        rotationCenterY: 65.50,
        svgContent: yuCostume
    }
];

const defaultProject = translator => {
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
    const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    const picked = defaultSprites[Math.floor(Math.random() * defaultSprites.length)];

    // 更新项目 JSON 中的角色信息
    const spriteTarget = projectJson.targets[1];
    const costume = spriteTarget.costumes[0];
    costume.assetId = picked.assetId;
    costume.md5ext = `${picked.assetId}.${picked.dataFormat}`;
    costume.dataFormat = picked.dataFormat;
    costume.rotationCenterX = picked.rotationCenterX;
    costume.rotationCenterY = picked.rotationCenterY;
    spriteTarget.name = lang.startsWith('zh') ? picked.nameZh : picked.nameEn;

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

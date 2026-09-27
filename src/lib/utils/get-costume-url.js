import storage from '../persistence/storage';
import {inlineSvgFonts} from '@turbowarp/scratch-svg-renderer';

// Contains 'font-family', but doesn't only contain 'font-family="none"'
const HAS_FONT_REGEXP = 'font-family(?!="none")';

// 按 assetId 缓存造型缩略图 URL。原本只缓存「最后一个」assetId，导致角色列表每次
// 重渲染（尤其是后台预加载触发的频繁 TARGETS_UPDATE）都会对所有精灵重跑 SVG 解析 /
// 内联字体 / 编码 data URI 的重活，上千个造型会被反复处理，造成持续卡顿。
// 这里改为按 assetId 记忆，相同造型只编码一次。
const CACHE_LIMIT = 4000; // 超大项目保护：超过则淘汰最早的一半
const urlCache = new Map(); // assetId -> url

const getCostumeUrl = function (asset) {
    const cached = urlCache.get(asset.assetId);
    if (cached !== undefined) {
        return cached;
    }

    // If the SVG refers to fonts, they must be inlined in order to display correctly in the img tag.
    // Avoid parsing the SVG when possible, since it's expensive.
    let url;
    if (asset.assetType === storage.AssetType.ImageVector) {
        const svgString = asset.decodeText();
        if (svgString.match(HAS_FONT_REGEXP)) {
            const svgText = inlineSvgFonts(svgString);
            url = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
        } else {
            url = asset.encodeDataURI();
        }
    } else {
        url = asset.encodeDataURI();
    }

    if (urlCache.size >= CACHE_LIMIT) {
        const keys = urlCache.keys();
        for (let i = 0; i < CACHE_LIMIT / 2; i++) {
            const {value} = keys.next();
            if (value === undefined) break;
            urlCache.delete(value);
        }
    }
    urlCache.set(asset.assetId, url);
    return url;
};

export {
    getCostumeUrl as default,
    HAS_FONT_REGEXP
};

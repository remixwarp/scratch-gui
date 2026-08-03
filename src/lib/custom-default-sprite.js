/**
 * 自定义默认角色模块
 * 将用户上传的默认角色数据持久化到 localStorage，并在加载默认项目时应用。
 *
 * 存储结构 (localStorage key: "customDefaultSprite"):
 * {
 *   enabled: boolean,          // 是否启用自定义默认角色
 *   spriteName: string,        // 角色名称
 *   assetId: string,           // 资源 md5（与字节数据对应）
 *   dataFormat: string,        // 'svg' | 'png' | 'jpg'
 *   dataBase64: string,        // 资源字节数据的 base64 编码
 *   rotationCenterX: number,   // 旋转中心 X
 *   rotationCenterY: number    // 旋转中心 Y
 * }
 */

const STORAGE_KEY = 'customDefaultSprite';

/**
 * 读取自定义默认角色配置
 * @returns {object|null} 配置对象，不存在或无效时返回 null
 */
const getCustomDefaultSprite = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !data.assetId || !data.dataFormat || !data.dataBase64) return null;
        return data;
    } catch (e) {
        return null;
    }
};

/**
 * 是否启用了自定义默认角色
 * @returns {boolean}
 */
const isCustomDefaultSpriteEnabled = () => {
    const data = getCustomDefaultSprite();
    return !!(data && data.enabled);
};

/**
 * 保存自定义默认角色配置
 * @param {object} data 配置对象
 */
const setCustomDefaultSprite = data => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

/**
 * 清除自定义默认角色配置
 */
const clearCustomDefaultSprite = () => {
    localStorage.removeItem(STORAGE_KEY);
};

/**
 * ArrayBuffer 转 base64 字符串
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {string}
 */
const arrayBufferToBase64 = buffer => {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
};

/**
 * base64 字符串转 Uint8Array
 * @param {string} base64
 * @returns {Uint8Array}
 */
const base64ToUint8Array = base64 => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

/**
 * 根据 dataFormat 获取 MIME 类型
 * @param {string} dataFormat 'svg' | 'png' | 'jpg'
 * @returns {string}
 */
const mimeFromDataFormat = dataFormat => {
    switch (dataFormat) {
    case 'svg': return 'image/svg+xml';
    case 'png': return 'image/png';
    case 'jpg': return 'image/jpeg';
    default: return 'application/octet-stream';
    }
};

/**
 * 计算图片的旋转中心（图片中心点）
 * @param {Uint8Array} bytes 图片字节数据
 * @param {string} dataFormat 'svg' | 'png' | 'jpg'
 * @returns {Promise<{rotationCenterX: number, rotationCenterY: number}>}
 */
const computeRotationCenter = (bytes, dataFormat) => new Promise(resolve => {
    const mimeType = mimeFromDataFormat(dataFormat);
    const blob = new Blob([bytes], {type: mimeType});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        let w = img.naturalWidth || 0;
        let h = img.naturalHeight || 0;
        // SVG 可能没有固有尺寸，尝试从文本解析
        if ((w === 0 || h === 0) && dataFormat === 'svg') {
            try {
                const text = new TextDecoder().decode(bytes);
                const vbMatch = text.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.-]+)\s+([\d.-]+)\s*["']/i);
                if (vbMatch) {
                    w = parseFloat(vbMatch[1]);
                    h = parseFloat(vbMatch[2]);
                }
                if (w === 0) {
                    const wMatch = text.match(/\swidth=["']([\d.]+)/i);
                    if (wMatch) w = parseFloat(wMatch[1]);
                }
                if (h === 0) {
                    const hMatch = text.match(/\sheight=["']([\d.]+)/i);
                    if (hMatch) h = parseFloat(hMatch[1]);
                }
            } catch (e) {
                // 忽略解析错误
            }
        }
        URL.revokeObjectURL(url);
        resolve({
            rotationCenterX: w > 0 ? w / 2 : 48,
            rotationCenterY: h > 0 ? h / 2 : 48
        });
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({rotationCenterX: 48, rotationCenterY: 48});
    };
    img.src = url;
});

export {
    getCustomDefaultSprite,
    isCustomDefaultSpriteEnabled,
    setCustomDefaultSprite,
    clearCustomDefaultSprite,
    arrayBufferToBase64,
    base64ToUint8Array,
    computeRotationCenter,
    mimeFromDataFormat
};

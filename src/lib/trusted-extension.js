const isGalleryExtensionUrl = url => (
    url.startsWith('https://extensions.turbowarp.org/') ||
    url.startsWith('https://extensions.bilup.org/') ||
    url.startsWith('https://extensions.mistium.com/') ||
    url.startsWith('https://sharkpools-extensions.vercel.app/') ||
    url.startsWith('https://editors.astras.top/extensions/') ||
    url.startsWith('https://extensions.mistium.com/') ||
    url.startsWith('http://localhost:8000/')
);

const isTrustedExtensionUrl = url => isGalleryExtensionUrl(url) || url.startsWith('http://localhost:8000/');

export {isGalleryExtensionUrl};
export default isTrustedExtensionUrl;

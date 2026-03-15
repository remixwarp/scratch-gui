// Local extension URLs mapping
// All extensions are now loaded from local files

const localExtensionURLs = new Map();

// TurboWarp extensions
localExtensionURLs.set('text', '/extensions/turbowarp/text.js');
localExtensionURLs.set('audiostr', '/extensions/turbowarp/audiostream.js');

// Add more local extension URLs as needed

module.exports = localExtensionURLs;

export default [
    {tag: 'scratch', intlLabel: 'Scratch'},
    {tag: 'tw', intlLabel: 'TurboWarp', metadataUrl: 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', fallbackUrl: null},
    {tag: 'remixwarp', intlLabel: 'RemixWarp', metadataUrl: 'https://rw-extensions.pages.dev/remixwarp/extensions-index.json', fallbackUrl: null},
    {tag: 'astra', intlLabel: 'AstraEditor', metadataUrl: 'https://editors.astras.top/extensions/generated-metadata/extensions-v0.json', fallbackUrl: 'https://rw-extensions.pages.dev/astraeditor/extensions-index.json'},
    {tag: 'mistium', intlLabel: 'Mistium', metadataUrl: 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', fallbackUrl: 'https://rw-extensions.pages.dev/mistium/extensions-index.json'},
    {tag: 'sharkpools', intlLabel: 'SharkPools', metadataUrl: 'https://sharkpools-extensions.vercel.app/Gallery%20Files/Extension-Keys.json', fallbackUrl: null},
    {tag: 'penguinmod', intlLabel: 'PenguinMod', metadataUrl: null, fallbackUrl: null},
    {tag: '02engine', intlLabel: '02Engine', metadataUrl: 'https://rw-extensions.pages.dev/02engine/02engine-extensions/extensions.json', fallbackUrl: null},
    {tag: 'yesshape', intlLabel: 'OpenWarp', metadataUrl: 'https://openwarp-extensions.pages.dev/generated-metadata/extensions-v0.json', fallbackUrl: 'https://rw-extensions.pages.dev/yesshape/extensions-index.json'},
    {tag: 'bilup', intlLabel: 'Bilup', metadataUrl: 'https://extensions.bilup.org/generated-metadata/extensions-v0.json', fallbackUrl: 'https://rw-extensions.pages.dev/bilup/extensions-index.json'}
];

export const STATUS_COLORS = {
    SUCCESS: '#3cb371',
    FALLBACK: '#ffd700',
    ERROR: '#ff4444'
};
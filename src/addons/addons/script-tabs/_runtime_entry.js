// script-tabs runtime entry - imported by addon-entries.js
export default async function (addonContext) {
    const mod = await import('./userscript.js');
    return mod.default(addonContext);
}

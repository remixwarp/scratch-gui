import twTranslations from './generated-translations.json';

const addAdditionalTranslations = editorMessages => {
    // 确保自定义语言（如 geng 梗体中文）在消息目录中存在，
    // 因为发布版 @remixwarp/scratch-l10n 可能尚未包含这些语言。
    for (const locale of Object.keys(twTranslations)) {
        if (!editorMessages[locale]) {
            editorMessages[locale] = {};
        }
    }

    for (const locale of Object.keys(editorMessages)) {
        const toMixIn = twTranslations[locale.toLowerCase()];
        if (toMixIn) {
            Object.assign(editorMessages[locale], toMixIn);
        }
    }

    // We reuse our `es` translations for `es-419` instead of maintaining separate translations.
    //Object.assign(editorMessages['es-419'], twTranslations.es);
};

export default addAdditionalTranslations;

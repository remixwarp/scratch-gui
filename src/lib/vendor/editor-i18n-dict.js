/* Editor i18n dictionary seed.
 * The authoritative UI dictionary lives in @remixwarp/scratch-l10n
 * (editor/editors/zh-cn.json -> locales/editors-msgs.js). We inject the full
 * en->zh map into the embedded editor iframe so its runtime translator can
 * cover every UI string instead of the tiny built-in 241-entry table.
 */
import editorMsgs from '@remixwarp/scratch-l10n/locales/editors-msgs';

// en->zh map (the runtime script auto-builds the reverse map).
var DICT = (editorMsgs && editorMsgs['zh-cn']) || {};

/**
 * Return the <script> seed string that defines window.__RW_I18N_DICT__.
 */
function dictSeedScript () {
    try {
        return '<script>window.__RW_I18N_DICT__=' + JSON.stringify(DICT) + ';<\/script>';
    } catch (e) {
        return '';
    }
}

export default dictSeedScript;

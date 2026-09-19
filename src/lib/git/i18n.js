// Shared i18n bridge for non-React git code.
//
// lib/git modules cannot use react-intl hooks, but several of their
// user-visible strings (progress messages) surface in the UI. This tiny module
// holds a reference to the active intl formatter, which is set once from a
// React component (see lib/tw-use-intl.jsx). When no formatter is wired (e.g.
// before the app root renders), callers fall back to the English default.

let globalFormatMessage = null;
let globalIntl = null;

const interpolate = (message, values) => {
    if (!values) return message;
    return Object.keys(values).reduce(
        (acc, key) => acc.split(`{${key}}`).join(String(values[key])),
        message
    );
};

const setFormatMessage = formatter => {
    globalFormatMessage = formatter;
};

const setIntl = intlObject => {
    globalIntl = intlObject;
};

const getFormattedMessage = (messageKey, defaultText, values) => {
    if (globalIntl && globalIntl.messages && typeof globalIntl.messages === 'object') {
        const translated = globalIntl.messages[messageKey];
        if (translated && typeof translated === 'string') {
            return interpolate(translated, values);
        }
    }
    if (typeof globalFormatMessage === 'function') {
        try {
            return globalFormatMessage(
                {id: messageKey, defaultMessage: defaultText},
                values
            );
        } catch (e) {
            // Fall through to the default text.
        }
    }
    return interpolate(defaultText, values);
};

// isomorphic-git reports progress with a fixed set of English phase names
// ("Receiving objects", "Resolving deltas", …). They surface verbatim in the
// busy bar, so map them to translatable keys — unknown phases pass through
// unchanged rather than hiding information.
const PROGRESS_PHASE_KEYS = {
    'Analyzing workdir': 'mw.git.phase.analyzing',
    'Receiving objects': 'mw.git.phase.receiving',
    'Resolving deltas': 'mw.git.phase.resolving',
    'Updating workdir': 'mw.git.phase.updating'
};

const translateGitProgressPhase = phase => {
    if (!phase) return '';
    const key = PROGRESS_PHASE_KEYS[phase];
    if (key) {
        // Fall back to the raw English phase when the active catalog has no
        // entry (e.g. UI language is English).
        return getFormattedMessage(key, phase);
    }
    return phase;
};

export {
    getFormattedMessage,
    setFormatMessage,
    setIntl,
    translateGitProgressPhase
};

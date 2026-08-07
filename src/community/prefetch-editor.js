// Prefetch the editor's heavy JS bundles while the user is still browsing the
// community site. The list of chunks is injected at build time into
// window.MW_EDITOR_CHUNKS (see EditorChunkPrefetchPlugin in webpack.config.js).
// Navigating to the editor is a full page load, so warming the browser cache
// up front makes the first editor load dramatically faster.

let prefetched = false;

const getChunks = () => {
    try {
        if (Array.isArray(window.MW_EDITOR_CHUNKS)) {
            return window.MW_EDITOR_CHUNKS;
        }
    } catch (e) {
        // ignore
    }
    return [];
};

const prefetchUrl = url => {
    try {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'script';
        link.href = url;
        document.head.appendChild(link);
    } catch (e) {
        // ignore
    }
};

const prefetchAll = () => {
    if (prefetched) return;
    prefetched = true;
    const chunks = getChunks();
    for (const url of chunks) {
        prefetchUrl(url);
    }
};

const scheduleIdle = (fn, timeout = 4000) => {
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(fn, {timeout});
    } else {
        setTimeout(fn, timeout);
    }
};

const isEditorLink = href => {
    if (typeof href !== 'string') return false;
    return /^\/editor([?#/]|$)/.test(href) || /(^|\/)editor\.html([?#/]|$)/.test(href);
};

const onPointerTarget = event => {
    const target = event.target && event.target.closest ?
        event.target.closest('a[href]') : null;
    if (!target) return;
    if (isEditorLink(target.getAttribute('href'))) {
        prefetchAll();
    }
};

// Prefetch once the page has fully loaded and the browser is idle.
const initPrefetch = () => {
    if (getChunks().length === 0) return;
    if (document.readyState === 'complete') {
        scheduleIdle(prefetchAll);
    } else {
        window.addEventListener('load', () => scheduleIdle(prefetchAll), {once: true});
    }
    // If the user hovers / focuses a link that goes to the editor, start
    // prefetching immediately instead of waiting for idle time.
    document.addEventListener('mouseover', onPointerTarget, {passive: true});
    document.addEventListener('touchstart', onPointerTarget, {passive: true});
    document.addEventListener('focusin', onPointerTarget, {passive: true});
};

export {
    initPrefetch,
    prefetchAll
};

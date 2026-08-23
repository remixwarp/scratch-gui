const ZONES = [
    {
        id: 'left',
        items: [
            '__errors', 'file', 'edit', 'mode', 'view', 'tools', 'bookmarks',
            '__divider', 'project-title', '__view-counter', 'community', 'block-count'
        ],
        extras: []
    },
    {
        id: 'right',
        items: ['save-status', 'addons', 'settings', 'about'],
        extras: []
    }
];

const ALL_ITEMS = ZONES.reduce((acc, zone) => acc.concat(zone.items, zone.extras), []);

const ORDER_KEY = 'mw:menu-bar-order';
const HIDDEN_KEY = 'mw:menu-bar-hidden';
const CHANGE_EVENT = 'mw-menu-bar-layout-changed';
const STYLE_ID = 'mw-menu-bar-layout';

const readJSON = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch (err) {
        // ignore
    }
    return fallback;
};

const writeJSON = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        // ignore
    }
};

const zoneById = zoneId => ZONES.find(z => z.id === zoneId);

const hasStoredOrder = zoneId => {
    const stored = readJSON(ORDER_KEY, {})[zoneId];
    return Array.isArray(stored) && stored.length > 0;
};

const getStoredOrder = zoneId => {
    const stored = readJSON(ORDER_KEY, {})[zoneId];
    return Array.isArray(stored) ? stored : [];
};

const getHidden = () => readJSON(HIDDEN_KEY, []);

const isHidden = id => getHidden().includes(id);

const getMenuContainers = () => {
    const containers = [];
    const main = document.querySelector('[class*="main-menu"]');
    if (main) containers.push(main);
    const right = document.querySelector('[class*="account-info-group"]');
    if (right && containers.indexOf(right) === -1) containers.push(right);
    return containers;
};

const isDivider = el => /divider/i.test(el.className || '');
const isFileGroup = el => /file-group/i.test(el.className || '');

// Reads the menu items that are actually present in the menu bar right now,
// including items injected dynamically by addons/plugins (e.g. "Bilup Nova",
// "外观", the block-count display) which may not carry a `data-mw-item`.
// Each collected element gets a stable id written back to the DOM
// (existing `data-mw-item`, or `auto:<text>` derived from its label) so the
// hide/order CSS can target it. Items whose id starts with `__` are internal
// separators/counters and are skipped.
// Returns { left: [ids], right: [ids] }.
const collectMenuItemsByZone = () => {
    const result = {left: [], right: []};
    const seen = new Set();
    for (const container of getMenuContainers()) {
        const zoneId = /account-info-group/i.test(container.className || '') ? 'right' : 'left';
        for (const child of Array.from(container.children)) {
            if (isDivider(child)) continue;
            if (isFileGroup(child)) {
                child.querySelectorAll('[data-mw-item]').forEach(el => {
                    const id = el.getAttribute('data-mw-item');
                    if (id && !id.startsWith('__') && !seen.has(id)) {
                        result[zoneId].push(id);
                        seen.add(id);
                    }
                });
                continue;
            }
            let id = child.getAttribute('data-mw-item');
            if (!id) {
                const text = (child.textContent || '').trim().slice(0, 24).replace(/\s+/g, '_');
                if (!text) continue;
                id = `auto:${text}`;
                child.setAttribute('data-mw-item', id);
            }
            if (id.startsWith('__')) continue;
            if (!seen.has(id)) {
                result[zoneId].push(id);
                seen.add(id);
            }
        }
    }
    return result;
};

const getPresentOrderedIds = () => {
    const collected = collectMenuItemsByZone();
    return collected.left.concat(collected.right);
};

const getZoneDisplayOrder = (zoneId, presentIds) => {
    const present = collectMenuItemsByZone()[zoneId];
    if (!hasStoredOrder(zoneId)) return present;
    const stored = getStoredOrder(zoneId).filter(id => present.includes(id));
    for (const id of present) {
        if (!stored.includes(id)) stored.push(id);
    }
    return stored;
};

const getZoneExtras = (zoneId, presentIds) => {
    return [];
};

const applyLayout = () => {
    const parts = [];
    for (const zone of ZONES) {
        if (!hasStoredOrder(zone.id)) continue;
        const order = getStoredOrder(zone.id);
        for (let i = 0; i < order.length; i++) {
            parts.push(`[data-mw-item="${order[i]}"]{order:${i};}`);
        }
    }
    for (const id of getHidden()) {
        parts.push(`[data-mw-item="${id}"]{display:none !important;}`);
    }
    // Always hide the "Bilme 主题商店" (Bilme Marketplace) menu item by default.
    const collected = collectMenuItemsByZone();
    for (const zoneId of Object.keys(collected)) {
        for (const id of collected[zoneId]) {
            if (/bilme/i.test(id)) {
                parts.push(`[data-mw-item="${id}"]{display:none !important;}`);
            }
        }
    }
    let style = document.getElementById(STYLE_ID);
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
    }
    style.textContent = parts.join('');
};

const setZoneOrder = (zoneId, order) => {
    const all = readJSON(ORDER_KEY, {});
    all[zoneId] = order;
    writeJSON(ORDER_KEY, all);
    applyLayout();
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

const setHidden = (id, hidden) => {
    const current = new Set(getHidden());
    if (hidden) {
        current.add(id);
    } else {
        current.delete(id);
    }
    writeJSON(HIDDEN_KEY, Array.from(current));
    applyLayout();
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

const initMenuBarLayout = () => {
    applyLayout();
};

export {
    ZONES,
    ALL_ITEMS,
    ORDER_KEY,
    HIDDEN_KEY,
    CHANGE_EVENT,
    getStoredOrder,
    setZoneOrder,
    getZoneDisplayOrder,
    getZoneExtras,
    getHidden,
    isHidden,
    setHidden,
    getPresentOrderedIds,
    applyLayout,
    initMenuBarLayout
};

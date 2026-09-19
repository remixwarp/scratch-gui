// Persistent, per-project repository registry.
//
// The editor's repository lives in OPFS/IndexedDB under one fixed path, so
// without a registry every project that gets opened fights over the same slot:
// loading an unrelated .sb3 used to wipe whatever history was there. The
// registry records which project a repository belongs to (plus its remotes,
// default branch and author), keyed by the GUI's `projectId`, so switching
// projects can rebind instead of discarding.
//
// Only small metadata lives here (localStorage, synchronous, already used for
// the git author). Repository *contents* stay in OPFS and `.remixwarp-git/`.
//
// Decision D1 (see .workbuddy/memory/git-rewrite-spec.md): embedded repo stays
// as the portable artifact, the registry makes it addressable per project.

import {getItem, setItem} from '../../utils/safe-storage.js';

const STORAGE_KEY = 'mw:git-registry';
const SCHEMA_VERSION = 1;
const CONFIG_KIND = 'remixwarp-git-config';

const emptyRegistry = () => ({version: SCHEMA_VERSION, entries: {}});

// Remotes are stored without credentials: a token embedded in the URL must
// never end up in an exported config or in localStorage beyond the dedicated
// token key the Remote view already owns.
const stripCredentials = url => {
    if (typeof url !== 'string' || url.length === 0) return url;
    try {
        const parsed = new URL(url);
        if (!parsed.username && !parsed.password) return url;
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch (e) {
        // Not a parseable URL (scp-like `git@host:path`), leave it untouched.
        return url;
    }
};

const normalizeRemotes = remotes => {
    if (!Array.isArray(remotes)) return [];
    return remotes
        .filter(remote => remote && typeof remote.name === 'string' && remote.name)
        .map(remote => ({name: remote.name, url: stripCredentials(remote.url || '')}));
};

const normalizeEntry = (projectId, patch = {}, previous = {}) => {
    const now = new Date().toISOString();
    const author = patch.author || previous.author || null;
    return {
        projectId,
        defaultBranch: patch.defaultBranch || previous.defaultBranch || 'main',
        remotes: patch.remotes ? normalizeRemotes(patch.remotes) : (previous.remotes || []),
        author: author && typeof author === 'object' ?
            {name: author.name || '', email: author.email || ''} :
            null,
        createdAt: previous.createdAt || now,
        updatedAt: now
    };
};

export const readRegistry = () => {
    const raw = getItem(STORAGE_KEY);
    if (!raw) return emptyRegistry();
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.entries || typeof parsed.entries !== 'object') {
            return emptyRegistry();
        }
        return {version: parsed.version || SCHEMA_VERSION, entries: parsed.entries};
    } catch (e) {
        // Corrupted JSON must not break the git panel — start clean instead.
        return emptyRegistry();
    }
};

const writeRegistry = registry => {
    const payload = {
        version: SCHEMA_VERSION,
        entries: (registry && registry.entries) || {}
    };
    setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
};

export const getEntry = projectId => {
    if (!projectId) return null;
    return readRegistry().entries[projectId] || null;
};

export const upsertEntry = (projectId, patch = {}) => {
    if (!projectId) return null;
    const registry = readRegistry();
    const previous = registry.entries[projectId] || {};
    const entry = normalizeEntry(projectId, patch, previous);
    registry.entries[projectId] = entry;
    writeRegistry(registry);
    return entry;
};

export const removeEntry = projectId => {
    if (!projectId) return false;
    const registry = readRegistry();
    if (!registry.entries[projectId]) return false;
    delete registry.entries[projectId];
    writeRegistry(registry);
    return true;
};

export const listEntries = () => Object.values(readRegistry().entries);

// Same repository declared by more than one project — surfaced so the UI can
// ask which project owns it instead of silently sharing one slot.
export const findByUrl = url => {
    const clean = stripCredentials(url);
    if (!clean) return [];
    return listEntries().filter(entry => entry.remotes.some(remote => remote.url === clean));
};

// Portable configuration: remotes + author + default branch for one project (or
// all of them). Deliberately excludes history and access tokens.
export const exportConfig = ({projectId} = {}) => {
    const entries = projectId ? [getEntry(projectId)].filter(Boolean) : listEntries();
    return {
        kind: CONFIG_KIND,
        version: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        projects: entries.map(entry => ({
            projectId: entry.projectId,
            defaultBranch: entry.defaultBranch,
            remotes: entry.remotes.map(remote => ({name: remote.name, url: remote.url})),
            author: entry.author
        }))
    };
};

const isConfigShape = value =>
    Boolean(value) &&
    typeof value === 'object' &&
    (value.kind === CONFIG_KIND || Array.isArray(value.projects));

// Merge an exported config back in. Existing project entries are updated in
// place (remotes replaced, author completed), unknown ones are added.
export const importConfig = (config, {overwriteProjectId} = {}) => {
    if (!isConfigShape(config)) {
        throw new Error('Invalid git configuration file');
    }
    const registry = readRegistry();
    const imported = [];
    for (const project of config.projects) {
        const source = project && typeof project === 'object' ? project : null;
        if (!source) continue;
        const projectId = overwriteProjectId || source.projectId;
        if (!projectId || typeof projectId !== 'string') continue;
        registry.entries[projectId] = normalizeEntry(projectId, source, registry.entries[projectId] || {});
        imported.push(projectId);
    }
    writeRegistry(registry);
    return {imported: imported.length, projectIds: imported};
};

export {stripCredentials};
export default {
    readRegistry,
    getEntry,
    upsertEntry,
    removeEntry,
    listEntries,
    findByUrl,
    exportConfig,
    importConfig,
    stripCredentials
};

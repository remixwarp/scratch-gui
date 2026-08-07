import JSZip from '@turbowarp/jszip';
import md5 from 'js-md5';
import {
    createProject, uploadProject, publishProject, updateProject, checkProjectAssets, getProject, remixProject,
    deleteProject
} from './api';

const ZIP_COMPRESSABLE = ['.json', '.svg', '.wav', '.ttf', '.otf'];

// Recompute each asset's md5 and, if the current file name doesn't match the
// actual content, rename the file AND update every reference in project.json.
// This avoids "asset filename does not match its content" errors when a
// costume/sound was loaded with a stale/incorrect assetId.
const hashAssetData = data => {
    if (typeof data === 'string') {
        return md5(data);
    }
    if (data instanceof Uint8Array) {
        // js-md5 accepts ArrayBuffer/Uint8Array directly.
        return md5(data);
    }
    if (data instanceof ArrayBuffer) {
        return md5(data);
    }
    if (data && typeof data.buffer === 'object' && data.buffer instanceof ArrayBuffer) {
        return md5(data.buffer);
    }
    return md5(String(data));
};

const normalizeAssetHashes = files => {
    let project = null;
    try {
        project = JSON.parse(files['project.json']);
    } catch (e) {
        // malformed project.json; leave files untouched
        return files;
    }

    // The current on-disk name for an asset, computing it from the actual file
    // content if it has been remapped. The sb3 json stores BOTH `assetId` and
    // `md5ext` which must remain in sync; we always derive the canonical name
    // from whichever field the costume still references.
    const currentName = name => {
        if (typeof name !== 'string') return null;
        const match = /^([0-9a-f]{32})(\.[a-zA-Z0-9]+)?$/.exec(name);
        if (!match) return null;
        const ext = match[2] || '';
        if (files[name]) {
            // entry still exists under this name; recanonicalize
            const correct = `${hashAssetData(files[name])}${ext}`;
            if (correct !== name) {
                const data = files[name];
                delete files[name];
                files[correct] = data;
            }
            return correct;
        }
        // entry was already remapped; find the file with matching content
        for (const candidate of Object.keys(files)) {
            if (candidate === 'project.json') continue;
            const m = /^([0-9a-f]{32})(\.[a-zA-Z0-9]+)?$/.exec(candidate);
            if (!m || m[2] !== ext) continue;
            try {
                if (`${hashAssetData(files[candidate])}${m[2]}` === name) {
                    return candidate;
                }
            } catch (e) { /* ignore */ }
        }
        return name; // give up; leave the field pointing to the original name
    };

    const fixRefs = obj => {
        if (!obj || typeof obj !== 'object') return;
        // assetId and md5ext always co-reference the same file. Normalize both
        // against the canonical (content-derived) name in a single pass.
        if (typeof obj.assetId === 'string' || typeof obj.md5ext === 'string') {
            // Pick whichever field points to a real entry; if neither does,
            // fall back to assetId (then md5ext).
            const probe = (typeof obj.assetId === 'string' && files[obj.assetId]) ?
                obj.assetId :
                (typeof obj.md5ext === 'string' && files[obj.md5ext] ? obj.md5ext : null);
            if (probe) {
                const match = /^([0-9a-f]{32})(\.[a-zA-Z0-9]+)?$/.exec(probe);
                const ext = match ? (match[2] || '') : '';
                const correct = `${hashAssetData(files[probe])}${ext}`;
                if (typeof obj.assetId === 'string') obj.assetId = correct;
                if (typeof obj.md5ext === 'string') obj.md5ext = correct;
            } else if (typeof obj.assetId === 'string') {
                // Try to find the entry that matches this assetId's content.
                const found = currentName(obj.assetId);
                if (found && found !== obj.assetId) {
                    obj.assetId = found;
                    if (typeof obj.md5ext === 'string') obj.md5ext = found;
                }
            }
        }
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (key === 'assetId' || key === 'md5ext') continue;
            if (Array.isArray(value)) {
                value.forEach(item => fixRefs(item));
            } else if (value && typeof value === 'object') {
                fixRefs(value);
            }
        }
    };

    // project.json references assets by both assetId and md5ext; fix every
    // reference so on-disk file names and the json stay in sync.
    fixRefs(project);

    // Also fix any stray asset file that isn't referenced but has a wrong hash.
    const dataFiles = Object.keys(files).filter(name => name !== 'project.json');
    for (const name of dataFiles) {
        const match = /^([0-9a-f]{32})(\.[a-zA-Z0-9]+)?$/.exec(name);
        if (!match) continue;
        const correct = `${hashAssetData(files[name])}${match[2] || ''}`;
        if (correct !== name) {
            const data = files[name];
            delete files[name];
            files[correct] = data;
        }
    }

    files['project.json'] = JSON.stringify(project);
    return files;
};

// Only ship project.json plus assets the server does not already have;
// assets are content-addressed server-side so everything else is reused.
const buildSparseSb3 = async (vm, platformId) => {
    const files = normalizeAssetHashes(vm.saveProjectSb3DontZip());
    const names = Object.keys(files).filter(name => name !== 'project.json');
    const {missing} = await checkProjectAssets(platformId, names);
    const missingSet = new Set(missing);
    const zip = new JSZip();
    const addFile = (name, data) => {
        zip.file(name, data, {
            compression: ZIP_COMPRESSABLE.some(ext => name.endsWith(ext)) ? 'DEFLATE' : 'STORE'
        });
    };
    addFile('project.json', files['project.json']);
    for (const name of names) {
        if (missingSet.has(name)) {
            addFile(name, files[name]);
        }
    }
    return zip.generateAsync({type: 'blob', mimeType: 'application/x.scratch.sb3'});
};

const PLATFORM_ID_KEY = 'mw:mistwarp-current-project';
const SCRATCH_ORIGIN_KEY = 'mw:mistwarp-scratch-origin';

const rememberPlatformProject = project => {
    try {
        if (project) {
            const value = typeof project === 'object' ? project : {id: project, isOwner: true};
            sessionStorage.setItem(PLATFORM_ID_KEY, JSON.stringify({
                id: String(value.id),
                isOwner: value.isOwner,
                shared: !!value.shared,
                canRemix: value.canRemix,
                projectJsonUrl: value.projectJsonUrl,
                trustedExtensions: value.trustedExtensions || []
            }));
        } else {
            sessionStorage.removeItem(PLATFORM_ID_KEY);
        }
    } catch (e) {
        // ignore
    }
};

const getRememberedPlatformProjectState = () => {
    try {
        const stored = sessionStorage.getItem(PLATFORM_ID_KEY);
        if (!stored) return null;
        try {
            const project = JSON.parse(stored);
            return project && typeof project === 'object' ? project : {id: String(project)};
        } catch (e) {
            return {id: stored};
        }
    } catch (e) {
        return null;
    }
};

const getRememberedPlatformProject = () => {
    const project = getRememberedPlatformProjectState();
    return project && project.id;
};

const getMistWarpAction = (project, changed) => {
    if (!project) return 'save';
    if (project.isOwner === false) return changed && project.canRemix !== false ? 'remix' : null;
    return changed ? 'update' : null;
};

const rememberScratchOrigin = scratchId => {
    try {
        if (scratchId) {
            sessionStorage.setItem(SCRATCH_ORIGIN_KEY, String(scratchId));
        } else {
            sessionStorage.removeItem(SCRATCH_ORIGIN_KEY);
        }
    } catch (e) {
        // ignore
    }
};

const getScratchOrigin = () => {
    try {
        return sessionStorage.getItem(SCRATCH_ORIGIN_KEY) || null;
    } catch (e) {
        return null;
    }
};

const captureThumbnailDataUri = vm => new Promise(resolve => {
    try {
        const renderer = vm && vm.renderer;
        if (!renderer) {
            resolve(null);
            return;
        }
        if (typeof renderer.requestSnapshot === 'function') {
            renderer.requestSnapshot(dataURI => resolve(dataURI));
            renderer.draw();
            return;
        }
        if (renderer.canvas) {
            renderer.dirty = true;
            renderer.draw();
            resolve(renderer.canvas.toDataURL('image/png'));
            return;
        }
        resolve(null);
    } catch (e) {
        resolve(null);
    }
});

const dataUriToBlob = async dataUri => {
    if (!dataUri) {
        return null;
    }
    try {
        return await (await fetch(dataUri)).blob();
    } catch (e) {
        return null;
    }
};

const captureThumbnail = vm => captureThumbnailDataUri(vm).then(dataUriToBlob);

const THUMB_MAX_BYTES = 1000000;
const THUMB_MAX_WIDTH = 960;
const THUMB_MAX_HEIGHT = 720;

// The server silently ignores thumbnails over 1MB, so shrink before upload.
const prepareThumbnailBlob = async dataUri => {
    const original = await dataUriToBlob(dataUri);
    if (!original) {
        return null;
    }
    if (original.size <= THUMB_MAX_BYTES) {
        return original;
    }
    try {
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = dataUri;
        });
        const scale = Math.min(1, THUMB_MAX_WIDTH / img.width, THUMB_MAX_HEIGHT / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const encode = (type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
        const attempts = [['image/png'], ['image/jpeg', 0.85], ['image/jpeg', 0.6]];
        for (const [type, quality] of attempts) {
            const candidate = await encode(type, quality);
            if (candidate && candidate.size <= THUMB_MAX_BYTES) {
                return candidate;
            }
        }
    } catch (e) {
        return null;
    }
    return null;
};

// Save the project to MistWarp: stored on the server (R2), not git.
// A git remote is only involved if the user explicitly connects one elsewhere.
// Sharing is a separate, explicit act (share: true, or the project page).

// Recompute md5 for every asset on every target and overwrite the asset's
// `assetId`/`md5`. Without this, projects that have a stale assetId (e.g.
// loaded from sb3 files where `assetId` does not match the content hash)
// raise "asset filename does not match its content" when re-saved.
const fixAssetIds = vm => {
    if (!vm || !vm.runtime || !Array.isArray(vm.runtime.targets)) return;
    for (const target of vm.runtime.targets) {
        const sprite = target && target.sprite;
        if (!sprite) continue;
        const fix = costume => {
            if (!costume) return;
            try {
                // The actual asset bytes live on `costume.asset.data` in
                // scratch-vm. Some older/custom builds put data directly on the
                // costume. Handle both shapes so we always normalize the real
                // fields scratch-vm serializes (costume.assetId, costume.md5,
                // asset.assetId, asset.md5).
                const asset = costume.asset;
                const data = asset && asset.data ? asset.data : costume.data;
                const dataFormat = asset && asset.dataFormat ? asset.dataFormat : costume.dataFormat;
                if (!data) return;

                const newMd5 = hashAssetData(data);
                const newExt = `${newMd5}.${dataFormat}`;

                if (asset && asset.data) {
                    if (asset.assetId !== newMd5) asset.assetId = newMd5;
                    if (asset.md5 !== newExt) asset.md5 = newExt;
                }
                if (costume.assetId !== newMd5) costume.assetId = newMd5;
                if (costume.md5 !== newExt) costume.md5 = newExt;

                // The `broken` shadow also carries an asset; fix it too.
                const brokenAsset = costume.broken && (costume.broken.asset || costume.broken);
                const brokenData = brokenAsset && brokenAsset.data ? brokenAsset.data : (costume.broken && costume.broken.data);
                if (brokenData) {
                    const bFormat = brokenAsset && brokenAsset.dataFormat ? brokenAsset.dataFormat : dataFormat;
                    const bMd5 = hashAssetData(brokenData);
                    const bExt = `${bMd5}.${bFormat}`;
                    if (brokenAsset && brokenAsset.assetId !== bMd5) brokenAsset.assetId = bMd5;
                    if (brokenAsset && brokenAsset.md5 !== bExt) brokenAsset.md5 = bExt;
                    if (costume.broken && costume.broken.assetId !== bMd5) costume.broken.assetId = bMd5;
                    if (costume.broken && costume.broken.md5 !== bExt) costume.broken.md5 = bExt;
                }
            } catch (e) {
                // ignore individual asset errors
            }
        };
        if (Array.isArray(sprite.costumes)) sprite.costumes.forEach(fix);
        if (Array.isArray(sprite.sounds)) sprite.sounds.forEach(fix);
    }
};

const publishToMistWarp = async ({
    vm, title, thumbnailBlob, share = false, updateOnly = false, onProgress = () => {},
    progressMessages
}) => {
    fixAssetIds(vm);
    const projectTitle = (title && title.trim()) || 'Untitled';

    // progressMessages is an optional map of pre-localized status strings. If
    // not provided, fall back to the English defaults so this function is still
    // safe to call from contexts that don't have access to react-intl.
    const msg = (key, fallback) =>
        (progressMessages && typeof progressMessages[key] === 'string')
            ? progressMessages[key]
            : fallback;
    const creatingRemix = msg('creatingRemix', 'Creating remix');
    const creatingProject = msg('creatingProject', 'Creating project');
    const packagingProject = msg('packagingProject', 'Packaging project');
    const uploadingProject = msg('uploadingProject', 'Uploading project');
    const processingOnServer = msg('processingOnServer', 'Processing on server');
    const uploadingPercent = (percent) => {
        const tpl = msg('uploadingPercent', 'Uploading {percent}%');
        return tpl.replace('{percent}', percent);
    };

    let platformProject = getRememberedPlatformProjectState();
    let platformId = platformProject && platformProject.id;
    if (platformId) {
        try {
            const existing = (await getProject(platformId)).project;
            platformProject = existing;
            rememberPlatformProject(existing);
        } catch (e) {
            if (e.status === 404) {
                platformId = null;
            } else {
                throw e;
            }
        }
        if (platformId && !platformProject.isOwner) {
            onProgress({phase: 'register', message: creatingRemix});
            const remix = await remixProject(platformId);
            platformId = remix.id;
            platformProject = {id: platformId, isOwner: true, shared: false};
            rememberPlatformProject(platformProject);
        }
    }

    let createdNow = false;
    if (!platformId) {
        onProgress({phase: 'register', message: creatingProject});
        const scratchOrigin = getScratchOrigin();
        const payload = {title: projectTitle};
        if (scratchOrigin) {
            payload.scratchOrigin = scratchOrigin;
        }
        const created = await createProject(payload);
        platformId = created.id;
        platformProject = {id: platformId, isOwner: true, shared: false};
        rememberPlatformProject(platformProject);
        createdNow = true;
    }

    if (!createdNow && !updateOnly && title && platformProject.title !== projectTitle) {
        await updateProject(platformId, {title: projectTitle});
    }

    // Create + upload must be atomic: if the upload fails on a project we just
    // created, delete it so we never leave a data-less project behind.
    try {
        onProgress({phase: 'package', message: packagingProject});
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
        let sb3Blob;
        try {
            sb3Blob = await buildSparseSb3(vm, platformId);
        } catch (e) {
            sb3Blob = await vm.saveProjectSb3();
        }
        const thumbnail = updateOnly ? null : (thumbnailBlob || await captureThumbnail(vm));
        onProgress({phase: 'upload', message: uploadingProject});
        try {
            await uploadProject(platformId, sb3Blob, thumbnail, (loaded, total) => {
                const percent = Math.min(100, Math.round((loaded / total) * 100));
                onProgress({
                    phase: 'upload',
                    message: percent >= 100 ? processingOnServer : uploadingPercent(percent),
                    loaded,
                    total
                });
            });
        } catch (e) {
            if (e.code !== 'debounced' || createdNow) {
                throw e;
            }
        }
    } catch (e) {
        if (createdNow) {
            try {
                await deleteProject(platformId);
            } catch (_) {
                // best-effort cleanup
            }
            rememberPlatformProject(null);
        }
        throw e;
    }

    let shared = Boolean(platformProject && platformProject.shared);
    if (share && !shared) {
        onProgress({phase: 'publish', message: 'Sharing'});
        await publishProject(platformId);
        shared = true;
    }
    rememberPlatformProject({...platformProject, id: platformId, isOwner: true, shared});

    try {
        const withHash = new URL(window.location.href);
        withHash.hash = `mw-${platformId}`;
        window.history.replaceState(null, '', withHash);
    } catch (e) {
        // ignore
    }

    return {id: platformId, url: `https://editor.bilup.org/project/${platformId}`, shared};
};

// Compatibility aliases: bilup-ui historically imports these as publishToBilup/
// getBilupAction. The implementations are the same as the mistwarp ones in
// this project.
const publishToBilup = publishToMistWarp;
const getBilupAction = getMistWarpAction;

export {
    publishToMistWarp,
    publishToBilup,
    captureThumbnail,
    captureThumbnailDataUri,
    prepareThumbnailBlob,
    rememberPlatformProject,
    getRememberedPlatformProject,
    getRememberedPlatformProjectState,
    getMistWarpAction,
    getBilupAction,
    rememberScratchOrigin,
    getScratchOrigin
};

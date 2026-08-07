import openMWShareWindow from './open-mw-share-window.js';
import {getRememberedPlatformProjectState, publishToBilup, getBilupAction} from '../community/publish.js';
import {request, isLoggedIn} from '../community/api.js';
import communityEnabled from '../community/enabled.js';
import downloadBlob from '../utils/download-blob';
import {embedRepoIntoSb3Blob} from '../git/browser-git.js';

const agreementAccepted = async () => {
    try {
        const {agreement} = await request('/agreement');
        return !(agreement.version > 0 && !agreement.accepted);
    } catch (e) {
        return true;
    }
};

// Ctrl+S or save button. Smart save to Bilup:
// - Own project on Bilup → upload silently
// - Someone else's project → show window for remix
// - Not on Bilup → download as .sb3
const smartSave = async ({vm, title, onSaved = () => {}}) => {
    const platform = communityEnabled ? getRememberedPlatformProjectState() : null;

    if (!platform) {
        const blob = await embedRepoIntoSb3Blob(await vm.saveProjectSb3());
        downloadBlob(`${title || 'project'}.sb3`, blob);
        return;
    }

    if (platform.isOwner === false) {
        openMWShareWindow({vm, initialTitle: title, action: 'remix', onPublished: onSaved});
        return;
    }

    if (!(await agreementAccepted())) {
        openMWShareWindow({vm, initialTitle: title, action: 'update', onPublished: onSaved});
        return;
    }

    try {
        onSaved(await publishToBilup({vm, title: null, updateOnly: true}));
    } catch (e) {
        openMWShareWindow({
            vm,
            initialTitle: title,
            initialError: e,
            action: 'update',
            onPublished: onSaved
        });
    }
};

// Export for use by menu-bar save button
const saveToBilup = async ({vm, title, share = false, onProgress = () => {}, onSaved = () => {}}) => {
    if (!isLoggedIn()) {
        throw new Error('Not logged in to Bilup Accounts');
    }
    const result = await publishToBilup({vm, title, share, onProgress});
    onSaved(result);
    return result;
};

export {
    smartSave as default,
    saveToBilup,
    getBilupAction
};

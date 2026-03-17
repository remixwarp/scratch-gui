import storage from '../persistence/storage';
import md5 from 'js-md5';
import {soundThumbnail} from '../backpack/sound-payload';
import {arrayBufferToBase64, base64ToArrayBuffer} from '../utils/base64';
import {requestPersistentStorage} from '../utils/storage-request';

// Special constants -- do not change without care.
const DATABASE_NAME = 'TW_Backpack';
const DATABASE_VERSION = 1;
const STORE_NAME = 'backpack';

const idbItemToBackpackItem = item => {
    // convert id to string
    item.id = `${item.id}`;

    if (item.type === 'sound') {
        // For sounds, use the local thumbnail instead of what was stored in the backpack.
        // The thumbnail was updated and it doesn't make sense for already backpacked sounds to
        // use the old icon instead of the new one.
        item.thumbnailUrl = `data:;base64,${soundThumbnail}`;
    } else if (item.type === 'folder') {
        // For folders, use a folder icon
        item.thumbnailUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIyIDE5YTIgMiAwIDAgMS0yIDJINmEyIDIgMCAwIDEtMi0yVjVhMiAyIDAgMCAxIDItMmgxNGEyIDIgMCAwIDEgMiAydjE0eiIvPjxwYXRoIGQ9Ik0yIDVoOWwzLTNoM3YxMGgtMTJ6Ii8+PC9zdmc+';
    } else {
        // Thumbnail could be any image format. The browser will figure out which format it is.
        item.thumbnailUrl = `data:;base64,${arrayBufferToBase64(item.thumbnailData)}`;
    }

    let assetType;
    if (item.type === 'script') {
        item.bodyUrl = `data:application/json;base64,${arrayBufferToBase64(item.bodyData)}`;
    } else if (item.type === 'sprite') {
        item.bodyUrl = `data:application/zip;base64,${arrayBufferToBase64(item.bodyData)}`;
    } else if (item.type === 'costume') {
        if (item.mime === 'image/svg+xml') {
            assetType = storage.AssetType.ImageVector;
        } else if (item.mime === 'image/png' || item.mime === 'image/jpeg') {
            assetType = storage.AssetType.ImageBitmap;
        }
    } else if (item.type === 'sound') {
        assetType = storage.AssetType.Sound;
    }

    if (assetType) {
        const extension = assetType.runtimeFormat;
        const itemMD5 = item.bodyMD5;
        const md5ext = `${itemMD5}.${extension}`;
        item.body = md5ext;
        storage.builtinHelper._store(
            assetType,
            extension,
            new Uint8Array(item.bodyData),
            itemMD5
        );
    }

    return item;
};

let _db;
const openDB = () => new Promise((resolve, reject) => {
    if (_db) {
        resolve(_db);
        return;
    }

    if (!window.indexedDB) {
        reject(new Error('indexedDB is not supported'));
        return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = event => {
        const db = event.target.result;
        db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
        });
    };

    request.onsuccess = event => {
        _db = event.target.result;
        resolve(_db);
    };

    request.onerror = event => {
        reject(new Error(`DB error: ${event.target.error}`));
    };
});

const getBackpackContents = async ({
    limit,
    offset,
    folderId = null
}) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        transaction.onerror = event => {
            reject(new Error(`Getting contents: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const items = [];
        const request = store.openCursor(null, 'prev');
        let first = true;
        request.onsuccess = e => {
            const cursor = e.target.result;
            if (first) {
                first = false;
                if (cursor && offset !== 0) {
                    cursor.advance(offset);
                    return;
                }
            }
            if (cursor && items.length < limit) {
                // 只返回指定文件夹的内容或根目录内容
                // 使用 == 而不是 === 来比较 folderId，因为可能是 null 或 undefined
                if (cursor.value.folderId == folderId) {
                    items.push(idbItemToBackpackItem(cursor.value));
                }
                cursor.continue();
            } else {
                resolve(items);
            }
        };
    });
};

const saveBackpackObject = async ({
    type,
    mime,
    name,
    body,
    thumbnail,
    folderId = null
}) => {
    // User interaction -- fine to show a permission dialog
    requestPersistentStorage();

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Sving object: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const idbItem = {
            type,
            mime,
            name,
            folderId,
            createdAt: Date.now()
        };
        
        if (type !== 'folder') {
            const bodyData = base64ToArrayBuffer(body);
            const bodyMD5 = md5(bodyData);
            idbItem.bodyData = bodyData;
            idbItem.bodyMD5 = bodyMD5;
            idbItem.thumbnailData = base64ToArrayBuffer(thumbnail);
        }
        
        const putRequest = store.put(idbItem);
        putRequest.onsuccess = () => {
            idbItem.id = putRequest.result;
            resolve(idbItemToBackpackItem(idbItem));
        };
    });
};

const deleteBackpackObject = async ({
    id
}) => {
    id = +id;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Deleting object: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        // Convert string IDs to number IDs
        const deleteRequest = store.delete(id);
        deleteRequest.onsuccess = () => {
            resolve();
        };
    });
};

const updateBackpackObject = async ({
    id,
    name,
    folderId
}) => {
    id = +id;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Updating object: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const newItem = {
                ...getRequest.result
            };
            if (name !== undefined) {
                newItem.name = name;
            }
            if (folderId !== undefined) {
                newItem.folderId = folderId;
            }
            const putRequest = store.put(newItem);
            putRequest.onsuccess = () => {
                resolve(idbItemToBackpackItem(newItem));
            };
        };
    });
};

const createFolder = async ({
    name,
    folderId = null
}) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Creating folder: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const idbItem = {
            type: 'folder',
            name,
            folderId,
            createdAt: Date.now()
        };
        const putRequest = store.put(idbItem);
        putRequest.onsuccess = () => {
            idbItem.id = putRequest.result;
            resolve(idbItemToBackpackItem(idbItem));
        };
    });
};

const deleteBackpackFolder = async ({
    id
}) => {
    id = +id;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Deleting folder: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        
        // Delete the folder and all items in it
        const deleteFolderRequest = store.delete(id);
        deleteFolderRequest.onsuccess = () => {
            // Find and delete all items in this folder
            const items = [];
            const request = store.openCursor();
            request.onsuccess = e => {
                const cursor = e.target.result;
                if (cursor) {
                    // 使用 == 而不是 === 来比较 folderId
                    if (cursor.value.folderId == id) {
                        items.push(cursor.value.id);
                    }
                    cursor.continue();
                } else {
                    // Delete all items in the folder
                    items.forEach(itemId => {
                        store.delete(itemId);
                    });
                    resolve();
                }
            };
        };
    });
};

export default {
    getBackpackContents,
    saveBackpackObject,
    deleteBackpackObject,
    updateBackpackObject,
    createFolder,
    deleteBackpackFolder
};

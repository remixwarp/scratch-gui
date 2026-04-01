import storage from '../persistence/storage';
import md5 from 'js-md5';
import {arrayBufferToBase64, base64ToArrayBuffer} from '../utils/base64';
import {requestPersistentStorage} from '../utils/storage-request';

// 共享书包数据库常量
const DATABASE_NAME = 'TW_SharedBackpack';
const DATABASE_VERSION = 1;
const STORE_NAME = 'sharedBackpacks';

let _db;

// 打开数据库
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, {
                keyPath: 'id',
                autoIncrement: true
            });
        }
    };

    request.onsuccess = event => {
        _db = event.target.result;
        resolve(_db);
    };

    request.onerror = event => {
        reject(new Error(`DB error: ${event.target.error}`));
    };
});

// 创建共享书包
const createSharedBackpack = async ({roomId, name, creatorId, creatorName, initialPermissions = []}) => {
    requestPersistentStorage();

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Creating shared backpack: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        
        // 确保创建者有owner权限
        const permissions = [
            {
                userId: creatorId,
                username: creatorName,
                role: 'owner',
                joinedAt: Date.now()
            },
            ...initialPermissions.filter(p => p.userId !== creatorId)
        ];

        const backpack = {
            name,
            creatorId,
            creatorName,
            roomId,
            permissions,
            items: [],
            createdAt: Date.now()
        };

        const putRequest = store.put(backpack);
        putRequest.onsuccess = () => {
            backpack.id = putRequest.result;
            resolve(backpack);
        };
    });
};

// 获取共享书包
const getSharedBackpack = async (backpackId) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        transaction.onerror = event => {
            reject(new Error(`Getting shared backpack: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(backpackId);
        getRequest.onsuccess = () => {
            resolve(getRequest.result);
        };
    });
};

// 获取房间的所有共享书包
const getSharedBackpacksByRoom = async (roomId) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        transaction.onerror = event => {
            reject(new Error(`Getting shared backpacks: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const backpacks = [];
        const request = store.openCursor();
        request.onsuccess = e => {
            const cursor = e.target.result;
            if (cursor) {
                if (cursor.value.roomId === roomId) {
                    backpacks.push(cursor.value);
                }
                cursor.continue();
            } else {
                resolve(backpacks);
            }
        };
    });
};

// 更新共享书包
const updateSharedBackpack = async (backpackId, updates) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Updating shared backpack: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(backpackId);
        getRequest.onsuccess = () => {
            const backpack = getRequest.result;
            if (!backpack) {
                reject(new Error('Shared backpack not found'));
                return;
            }
            
            const updatedBackpack = {
                ...backpack,
                ...updates
            };
            
            const putRequest = store.put(updatedBackpack);
            putRequest.onsuccess = () => {
                resolve(updatedBackpack);
            };
        };
    });
};

// 删除共享书包
const deleteSharedBackpack = async (backpackId) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Deleting shared backpack: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const deleteRequest = store.delete(backpackId);
        deleteRequest.onsuccess = () => {
            resolve();
        };
    });
};

// 添加项目到共享书包
const addBackpackItem = async (backpackId, item) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Adding item: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(backpackId);
        getRequest.onsuccess = () => {
            const backpack = getRequest.result;
            if (!backpack) {
                reject(new Error('Shared backpack not found'));
                return;
            }
            
            const newItem = {
                ...item,
                id: Date.now().toString(),
                addedAt: Date.now()
            };
            
            backpack.items.push(newItem);
            const putRequest = store.put(backpack);
            putRequest.onsuccess = () => {
                resolve(newItem);
            };
        };
    });
};

// 从共享书包移除项目
const removeBackpackItem = async (backpackId, itemId) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Removing item: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(backpackId);
        getRequest.onsuccess = () => {
            const backpack = getRequest.result;
            if (!backpack) {
                reject(new Error('Shared backpack not found'));
                return;
            }
            
            backpack.items = backpack.items.filter(item => item.id !== itemId);
            const putRequest = store.put(backpack);
            putRequest.onsuccess = () => {
                resolve();
            };
        };
    });
};

// 更新书包项目
const updateBackpackItem = async (backpackId, itemId, updates) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Updating item: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(backpackId);
        getRequest.onsuccess = () => {
            const backpack = getRequest.result;
            if (!backpack) {
                reject(new Error('Shared backpack not found'));
                return;
            }
            
            const itemIndex = backpack.items.findIndex(item => item.id === itemId);
            if (itemIndex === -1) {
                reject(new Error('Item not found'));
                return;
            }
            
            backpack.items[itemIndex] = {
                ...backpack.items[itemIndex],
                ...updates
            };
            
            const putRequest = store.put(backpack);
            putRequest.onsuccess = () => {
                resolve(backpack.items[itemIndex]);
            };
        };
    });
};

// 添加成员
const addMember = async (backpackId, userId, username, role) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Adding member: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(backpackId);
        getRequest.onsuccess = () => {
            const backpack = getRequest.result;
            if (!backpack) {
                reject(new Error('Shared backpack not found'));
                return;
            }
            
            // 检查成员是否已存在
            const existingMember = backpack.permissions.find(p => p.userId === userId);
            if (existingMember) {
                reject(new Error('Member already exists'));
                return;
            }
            
            const newMember = {
                userId,
                username,
                role,
                joinedAt: Date.now()
            };
            
            backpack.permissions.push(newMember);
            const putRequest = store.put(backpack);
            putRequest.onsuccess = () => {
                resolve(newMember);
            };
        };
    });
};

// 移除成员
const removeMember = async (backpackId, userId) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Removing member: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(backpackId);
        getRequest.onsuccess = () => {
            const backpack = getRequest.result;
            if (!backpack) {
                reject(new Error('Shared backpack not found'));
                return;
            }
            
            // 不能移除创建者
            if (backpack.creatorId === userId) {
                reject(new Error('Cannot remove creator'));
                return;
            }
            
            backpack.permissions = backpack.permissions.filter(p => p.userId !== userId);
            const putRequest = store.put(backpack);
            putRequest.onsuccess = () => {
                resolve();
            };
        };
    });
};

// 更新成员角色
const updateMemberRole = async (backpackId, userId, role) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.onerror = event => {
            reject(new Error(`Updating member role: ${event.target.error}`));
        };
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(backpackId);
        getRequest.onsuccess = () => {
            const backpack = getRequest.result;
            if (!backpack) {
                reject(new Error('Shared backpack not found'));
                return;
            }
            
            const memberIndex = backpack.permissions.findIndex(p => p.userId === userId);
            if (memberIndex === -1) {
                reject(new Error('Member not found'));
                return;
            }
            
            // 不能改变创建者的角色
            if (backpack.creatorId === userId) {
                reject(new Error('Cannot change creator role'));
                return;
            }
            
            backpack.permissions[memberIndex].role = role;
            const putRequest = store.put(backpack);
            putRequest.onsuccess = () => {
                resolve(backpack.permissions[memberIndex]);
            };
        };
    });
};

// 检查用户权限
const checkPermission = (backpack, userId, requiredRole) => {
    const member = backpack.permissions.find(p => p.userId === userId);
    if (!member) return false;
    
    const roleHierarchy = {
        owner: 3,
        editor: 2,
        viewer: 1
    };
    
    const userRoleLevel = roleHierarchy[member.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
};

export default {
    createSharedBackpack,
    getSharedBackpack,
    getSharedBackpacksByRoom,
    updateSharedBackpack,
    deleteSharedBackpack,
    addBackpackItem,
    removeBackpackItem,
    updateBackpackItem,
    addMember,
    removeMember,
    updateMemberRole,
    checkPermission
};
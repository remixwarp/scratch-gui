import xhr from 'xhr';
import costumePayload from '../backpack/costume-payload';
import soundPayload from '../backpack/sound-payload';
import spritePayload from '../backpack/sprite-payload';
import codePayload from '../backpack/code-payload';
import localBackpackAPI from '../api/local-backpack';

export const LOCAL_API = '_local_';

// Add a new property for the full thumbnail url, which includes the host.
// Also include a full body url for loading sprite zips
// TODO retreiving the images through storage would allow us to remove this.
const includeFullUrls = (item, host) => Object.assign({}, item, {
    thumbnailUrl: `${host}/${item.thumbnail}`,
    bodyUrl: `${host}/${item.body}`
});

const getBackpackContents = ({
    host,
    username,
    token,
    limit,
    offset,
    folderId = null
}) => new Promise((resolve, reject) => {
    if (host === LOCAL_API) {
        return resolve(localBackpackAPI.getBackpackContents({
            limit,
            offset,
            folderId
        }));
    }
    xhr({
        method: 'GET',
        uri: `${host}/${username}?limit=${limit}&offset=${offset}${folderId ? `&folderId=${folderId}` : ''}`,
        headers: {'x-token': token},
        json: true
    }, (error, response) => {
        if (error || response.statusCode !== 200) {
            return reject(new Error(response.status));
        }
        return resolve(response.body.map(item => includeFullUrls(item, host)));
    });
});

const saveBackpackObject = ({
    host,
    username,
    token,
    type, // Type of object being saved to backpack
    mime, // Mime-type of the object being saved
    name, // User-facing name of the object being saved
    body, // Base64-encoded body of the object being saved
    thumbnail, // Base64-encoded JPEG thumbnail of the object being saved
    folderId // Optional folder ID to save the object in
}) => new Promise((resolve, reject) => {
    if (host === LOCAL_API) {
        return resolve(localBackpackAPI.saveBackpackObject({
            type,
            mime,
            name,
            body,
            thumbnail,
            folderId
        }));
    }
    xhr({
        method: 'POST',
        uri: `${host}/${username}`,
        headers: {'x-token': token},
        json: {type, mime, name, body, thumbnail, folderId}
    }, (error, response) => {
        if (error || response.statusCode !== 200) {
            return reject(new Error(response.status));
        }
        return resolve(includeFullUrls(response.body, host));
    });
});

const deleteBackpackObject = ({
    host,
    username,
    token,
    id
}) => new Promise((resolve, reject) => {
    if (host === LOCAL_API) {
        return resolve(localBackpackAPI.deleteBackpackObject({
            id
        }));
    }
    xhr({
        method: 'DELETE',
        uri: `${host}/${username}/${id}`,
        headers: {'x-token': token}
    }, (error, response) => {
        if (error || response.statusCode !== 200) {
            return reject(new Error(response.status));
        }
        return resolve(response.body);
    });
});

const updateBackpackObject = ({
    host,
    id,
    name,
    folderId
}) => new Promise((resolve, reject) => {
    if (host === LOCAL_API) {
        return resolve(localBackpackAPI.updateBackpackObject({
            id,
            name,
            folderId
        }));
    }
    reject(new Error('updateBackpackObject not supported'));
});

const createFolder = ({
    host,
    username,
    token,
    name,
    folderId = null
}) => new Promise((resolve, reject) => {
    if (host === LOCAL_API) {
        return resolve(localBackpackAPI.createFolder({
            name,
            folderId
        }));
    }
    xhr({
        method: 'POST',
        uri: `${host}/${username}/folder`,
        headers: {'x-token': token},
        json: {name, folderId}
    }, (error, response) => {
        if (error || response.statusCode !== 200) {
            return reject(new Error(response.status));
        }
        return resolve(includeFullUrls(response.body, host));
    });
});

const deleteBackpackFolder = ({
    host,
    username,
    token,
    id
}) => new Promise((resolve, reject) => {
    if (host === LOCAL_API) {
        return resolve(localBackpackAPI.deleteBackpackFolder({
            id
        }));
    }
    xhr({
        method: 'DELETE',
        uri: `${host}/${username}/folder/${id}`,
        headers: {'x-token': token}
    }, (error, response) => {
        if (error || response.statusCode !== 200) {
            return reject(new Error(response.status));
        }
        return resolve(response.body);
    });
});

// Two types of backpack items are not retreivable through storage
// code, as json and sprite3 as arraybuffer zips.
const fetchAs = (responseType, uri) => new Promise((resolve, reject) => {
    xhr({uri, responseType}, (error, response) => {
        if (error || response.statusCode !== 200) {
            return reject(new Error(response.status));
        }
        return resolve(response.body);
    });
});

// These two helpers allow easy fetching of backpack code and sprite zips
// Use of curried fetchAs here so that consumer does not worry about XHR responseTypes
const fetchCode = fetchAs.bind(null, 'json');
const fetchSprite = fetchAs.bind(null, 'arraybuffer');

export {
    getBackpackContents,
    saveBackpackObject,
    deleteBackpackObject,
    updateBackpackObject,
    createFolder,
    deleteBackpackFolder,
    costumePayload,
    soundPayload,
    spritePayload,
    codePayload,
    fetchCode,
    fetchSprite
};

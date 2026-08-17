import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import VM from 'scratch-vm';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import log from '../lib/utils/log';

import extensionLibraryContent, {
    galleryError,
    galleryLoading,
    galleryMore
} from '../lib/libraries/extensions/index.jsx';
import extensionTags from '../lib/libraries/tw-extension-tags';
import twExtensionTranslations from '../lib/libraries/extensions/tw-extension-translations';
import {getVanillaPalette} from '../lib/mw-vanilla-palette';
import {manuallyTrustExtension} from './tw-security-manager.jsx';

import LibraryComponent from '../components/tw-extension-library/extension-library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

// 分类状态小圆点颜色：加载中=黄、官方源成功=绿、第三方源成功=蓝、都失败=红
const TAG_STATUS_COLORS = {
    online: '#4CAF50',
    local: '#2196F3',
    loading: '#FFC107',
    error: '#F44336'
};

// 左侧分类侧边栏的小圆点（绿/黄/红表示分类加载状态）
const SidebarStatusDot = ({color, isLoading, className}) => (
    <span
        className={classNames(className, {'sidebar-loading-dot': isLoading})}
        style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            marginRight: '0.5rem',
            flexShrink: 0,
            background: color,
            // 柔光环：与外圈颜色一致的半透明描边
            boxShadow: `0 0 0 2px ${color}40`
        }}
    />
);

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    },
    customGalleryPrompt: {
        defaultMessage: 'Enter custom extension gallery URL:',
        description: 'Prompt for entering custom extension gallery URL',
        id: 'tw.customExtensionGallery.prompt'
    }
});

const toLibraryItem = extension => {
    if (typeof extension === 'object') {
        return ({
            rawURL: extension.iconURL || extensionIcon,
            ...extension
        });
    }
    return extension;
};

const translateGalleryItem = (extension, locale) => {
    const localTranslations = twExtensionTranslations[extension.extensionId] || {};
    return {
        ...extension,
        name: extension.nameTranslations?.[locale] || localTranslations.nameTranslations?.[locale] || extension.name,
        description: extension.descriptionTranslations?.[locale] || localTranslations.descriptionTranslations?.[locale] || extension.description
    };
};

const translateStaticItem = (item, locale) => {
    if (typeof item !== 'object' || item === null) return item;
    if (!item.nameTranslations && !item.descriptionTranslations) return item;

    return {
        ...item,
        name: item.nameTranslations?.[locale] || item.name,
        description: item.descriptionTranslations?.[locale] || item.description
    };
};

let cachedGallery = null;
let cachedLoadStatus = null;
let cachedSourceStatuses = {};
let cachedCustomSources = []; // [{id, name, url}]
let galleryUpdateListeners = [];
let customSourceCounter = 0;

const addGalleryUpdateListener = listener => {
    galleryUpdateListeners.push(listener);
    return () => {
        const index = galleryUpdateListeners.indexOf(listener);
        if (index > -1) {
            galleryUpdateListeners.splice(index, 1);
        }
    };
};

const notifyListeners = () => {
    const snapshot = {
        gallery: cachedGallery ? [...cachedGallery] : cachedGallery,
        sourceStatuses: {...cachedSourceStatuses},
        customSources: [...cachedCustomSources]
    };
    galleryUpdateListeners.forEach(listener => listener(snapshot));
};

const updateGallery = newGallery => {
    cachedGallery = newGallery;
    notifyListeners();
};

const safeResolveURL = (value, base) => {
    if (!value) return null;
    try {
        return new URL(value, base).href;
    } catch (error) {
        return value;
    }
};

const normalizeCustomExtension = (extension, source, index) => {
    const baseURL = new URL(source.url);
    const js = extension.extensionURL || extension.extensionUrl || extension.js || extension.url;
    const image = extension.iconURL || extension.icon || extension.image || extension.banner;
    const id = extension.id || extension.slug || extension.name || `extension-${index + 1}`;
    return {
        name: extension.name || extension.id || extension.slug || `Extension ${index + 1}`,
        nameTranslations: extension.nameTranslations || {},
        description: extension.description || extension.desc || '',
        descriptionTranslations: extension.descriptionTranslations || {},
        extensionId: id,
        extensionURL: safeResolveURL(js, baseURL) ||
            safeResolveURL(extension.slug ? `${extension.slug}.js` : null, baseURL),
        iconURL: image ? safeResolveURL(image, baseURL) : 'https://extensions.bilup.org/images/unknown.svg',
        tags: [source.id],
        source: source.id,
        credits: extension.credits || [],
        docsURI: extension.docs ? safeResolveURL(extension.docs, baseURL) : null,
        incompatibleWithScratch: true,
        featured: true
    };
};

const fetchCustomSource = async id => {
    const source = cachedCustomSources.find(cs => cs.id === id);
    if (!source) return;
    try {
        const res = await fetch(source.url);
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const data = await res.json();
        const rawExtensions = Array.isArray(data) ? data : (data.extensions || []);
        const extensions = rawExtensions.map((extension, index) =>
            normalizeCustomExtension(extension, source, index));
        cachedGallery = [...(cachedGallery || []).filter(item => item.source !== id), ...extensions];
        cachedSourceStatuses[id] = 'loaded';
    } catch (error) {
        console.warn(`Failed to load custom gallery "${source.name}":`, error);
        cachedSourceStatuses[id] = 'error';
    }
    notifyListeners();
};

const addCustomSource = source => {
    const existing = cachedCustomSources.find(cs => cs.url === source.url);
    const id = existing ? existing.id : `custom_${++customSourceCounter}`;
    if (existing) {
        existing.name = source.name;
    } else {
        cachedCustomSources.push({id, name: source.name, url: source.url});
    }
    cachedSourceStatuses[id] = 'loading';
    notifyListeners();
    fetchCustomSource(id).catch(error => log.error(error));
    return id;
};

const removeCustomSource = id => {
    const index = cachedCustomSources.findIndex(cs => cs.id === id);
    if (index === -1) return;
    cachedCustomSources.splice(index, 1);
    delete cachedSourceStatuses[id];
    if (cachedGallery) {
        cachedGallery = cachedGallery.filter(item => item.source !== id);
    }
    notifyListeners();
    fetchLibrary().catch(error => log.error(error));
};

// 存储各扩展库的刷新函数，供 tag-button 调用
const retryFetchers = {};

const fetchWithTimeout = (url, timeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";
    const allExtensions = [];
    const sourceStatuses = {};

    const report = () => {
        const customExtensions = (cachedGallery || [])
            .filter(item => item.source && item.source.indexOf('custom_') === 0);
        cachedGallery = [...allExtensions, ...customExtensions];
        cachedSourceStatuses = { ...cachedSourceStatuses, ...sourceStatuses };
        notifyListeners();
    };

    const fetchAndAdd = async (sourceName, fetchFn) => {
        sourceStatuses[sourceName] = 'loading';
        report();
        try {
            const extensions = await fetchFn();
            allExtensions.push(...extensions);
            sourceStatuses[sourceName] = 'loaded';
        } catch (error) {
            console.warn(`Failed to load ${sourceName} extensions:`, error);
            sourceStatuses[sourceName] = 'error';
        }
        report();
    };

    const fetchWithTimeout = (url, timeoutMs) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
    };

    // fetchWithFallback: 依次尝试官方源和备用源，失败返回 []
    const fetchWithFallback = async (tag, officialUrl, localUrl, transformFn) => {
        try {
            const officialRes = await fetchWithTimeout(officialUrl, 5000);
            if (officialRes.ok) {
                const data = await officialRes.json();
                return transformFn(data);
            }
            console.warn(`${tag} extensions: HTTP status ${officialRes.status}, trying fallback...`);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`${tag} extensions: official source timed out (5s), trying fallback...`);
            } else {
                console.warn(`Failed to load ${tag} extensions from official:`, error);
            }
        }
        try {
            const localRes = await fetchWithTimeout(localUrl, 15000);
            if (localRes.ok) {
                const data = await localRes.json();
                return transformFn(data);
            }
            console.warn(`${tag} extensions: HTTP status ${localRes.status} from fallback`);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`${tag} extensions: fallback source timed out (15s)`);
            } else {
                console.warn(`Failed to load ${tag} extensions from fallback:`, error);
            }
        }
        return [];
    };

    // 为 bilup 扩展补充中文翻译（名称/描述），按 extensionId 匹配
    const bilupZhTranslations = {
        bilupAccounts: {
            name: 'Bilup 账户',
            description: '登录 Bilup 并访问你的账户信息、权限与社交功能。'
        },
        bilupEconomy: {
            name: 'Bilup 经济',
            description: '管理积分、货币与交易等经济相关功能。'
        },
        bilupKeys: {
            name: 'Bilup 密钥',
            description: '创建和管理 API 密钥，用于安全地访问服务。'
        },
        bilupStatus: {
            name: 'Bilup 状态',
            description: '获取在线状态、活动与用户状态信息。'
        },
        bilupSocial: {
            name: 'Bilup 社交',
            description: '发送消息、关注用户并参与社区互动。'
        },
        bilupShop: {
            name: 'Bilup 商店',
            description: '浏览商品、下单并管理你的订单。'
        },
        bilupGroups: {
            name: 'Bilup 群组',
            description: '创建和管理群组，与成员协作。'
        },
        bilupFiles: {
            name: 'Bilup 文件',
            description: '上传、下载并管理你的文件资源。'
        }
    };

    // 并行加载所有扩展源，每个源加载完成后立即更新
    await Promise.all([
        fetchAndAdd('tw', async () => {
            try {
                const twRes = await fetch('https://extensions.turbowarp.org/generated-metadata/extensions-v0.json');
                if (!twRes.ok) {
                    console.warn(`TurboWarp extensions: HTTP status ${twRes.status}`);
                    return [];
                }
                const twData = await twRes.json();
                return twData.extensions.map(extension => ({
                    name: extension.name,
                    nameTranslations: extension.nameTranslations || {},
                    description: extension.description,
                    descriptionTranslations: extension.descriptionTranslations || {},
                    extensionId: extension.id,
                    extensionURL: `https://extensions.turbowarp.org/${extension.slug}.js`,
                    iconURL: `https://extensions.turbowarp.org/${extension.image || 'images/unknown.svg'}`,
                    tags: ['tw'],
                    credits: [
                        ...(extension.by || []),
                        ...(extension.original || [])
                    ].map(credit => {
                        if (credit.link) {
                            return (
                                <a
                                    href={credit.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    key={credit.name}
                                >
                                    {credit.name}
                                </a>
                            );
                        }
                        return credit.name;
                    }),
                    docsURI: extension.docs ? `https://extensions.turbowarp.org/${extension.slug}` : null,
                    samples: extension.samples ? extension.samples.map(sample => ({
                        href: `${process.env.ROOT}editor?project_url=https://extensions.turbowarp.org/samples/${encodeURIComponent(sample)}.sb3`,
                        text: sample
                    })) : null,
                    incompatibleWithScratch: true,
                    featured: true
                }));
            } catch (error) {
                console.warn('Failed to load TurboWarp extensions:', error);
                return [];
            }
        }),
        fetchAndAdd('mistium', async () => {
            try {
                const mistiumRes = await fetch('https://rw-extensions.pages.dev/mistium/extensions-index.json');
                if (!mistiumRes.ok) {
                    console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                    return [];
                }
                const mistiumData = await mistiumRes.json();
                return mistiumData.extensions
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.extensionId,
                        extensionURL: extension.extensionURL,
                        iconURL: extension.iconURL || emptyBanner,
                        tags: ['mistium'],
                        credits: (extension.credits || []).map(credit => typeof credit === 'object' && credit.name ? credit.name : credit),
                        docsURI: null,
                        samples: null,
                        incompatibleWithScratch: true,
                        featured: extension.featured
                    }));
            } catch (error) {
                console.warn('Failed to load Mistium extensions:', error);
                return [];
            }
        }),
        fetchAndAdd('penguinmod', async () => {
            try {
                const penguinmodRes = await fetch('https://rw-extensions.pages.dev/penguinmod/extensions-index.json');
                if (!penguinmodRes.ok) {
                    console.warn(`PenguinMod extensions: HTTP status ${penguinmodRes.status}`);
                    const fallbackRes = await fetch('https://raw.githubusercontent.com/remixwarp/extensions/main/penguinmod/extensions-index.json');
                    if (!fallbackRes.ok) {
                        console.warn(`PenguinMod extensions: fallback also failed, HTTP ${fallbackRes.status}`);
                        return [];
                    }
                    const fallbackData = await fallbackRes.json();
                    const rawExts = fallbackData.extensions || fallbackData;
                    if (!Array.isArray(rawExts) || rawExts.length === 0) {
                        console.warn('PenguinMod extensions: empty or invalid fallback data');
                        return [];
                    }
                    return rawExts.map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.extensionId,
                        extensionURL: extension.onlineURL || extension.extensionURL,
                        iconURL: extension.iconURL,
                        tags: ['penguinmod'],
                        credits: Array.isArray(extension.credits)
                            ? extension.credits.map(c => (typeof c === 'string' ? c : c.name))
                            : [],
                        docsURI: null,
                        samples: null,
                        incompatibleWithScratch: true,
                        featured: true
                    }));
                }
                const penguinmodData = await penguinmodRes.json();
                const rawExts = penguinmodData.extensions || penguinmodData;
                if (!Array.isArray(rawExts) || rawExts.length === 0) {
                    console.warn('PenguinMod extensions: empty or invalid data from primary source');
                    return [];
                }
                return rawExts.map(extension => ({
                    name: extension.name,
                    nameTranslations: extension.nameTranslations || {},
                    description: extension.description,
                    descriptionTranslations: extension.descriptionTranslations || {},
                    extensionId: extension.extensionId,
                    extensionURL: extension.onlineURL || extension.extensionURL,
                    iconURL: extension.iconURL,
                    tags: ['penguinmod'],
                    credits: Array.isArray(extension.credits)
                        ? extension.credits.map(c => (typeof c === 'string' ? c : c.name))
                        : [],
                    docsURI: null,
                    samples: null,
                    incompatibleWithScratch: true,
                    featured: true
                }));
            } catch (error) {
                console.warn('Failed to load PenguinMod extensions:', error);
                return [];
            }
        }),
        fetchAndAdd('remixwarp', async () => {
            try {
                const remixwarpRes = await fetch('https://rw-extensions.pages.dev/remixwarp/extensions-index.json');
                if (!remixwarpRes.ok) {
                    console.warn(`RemixWarp extensions: HTTP status ${remixwarpRes.status}`);
                    return [];
                }
                const remixwarpData = await remixwarpRes.json();
                return remixwarpData.extensions.map(extension => ({
                    name: extension.name,
                    nameTranslations: extension.nameTranslations || {},
                    description: extension.description,
                    descriptionTranslations: extension.descriptionTranslations || {},
                    extensionId: extension.extensionId,
                    extensionURL: extension.extensionURL,
                    iconURL: extension.iconURL,
                    tags: extension.tags || ['remixwarp'],
                    credits: (extension.credits || []).map(credit => {
                        if (typeof credit === 'object' && credit.name) {
                            const link = credit.link || credit.url;
                            if (link) {
                                return (
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noreferrer"
                                        key={credit.name}
                                    >
                                        {credit.name}
                                    </a>
                                );
                            }
                            return credit.name;
                        }
                        return credit;
                    }),
                    docsURI: extension.docsURI || null,
                    samples: extension.samples ? extension.samples.map(sample => ({
                        href: `https://remixwarp.pages.dev/editor.html?project_url=${sample.href.startsWith('http') ? sample.href : 'https://remixwarp.pages.dev' + sample.href}`,
                        text: sample.text
                    })) : null,
                    incompatibleWithScratch: extension.incompatibleWithScratch || true,
                    featured: extension.featured || true
                }));
            } catch (error) {
                console.warn('Failed to load RemixWarp extensions:', error);
                return [];
            }
        }),
        fetchAndAdd('ae', async () => {
            return await fetchWithFallback(
                'ae',
                'https://editors.astras.top/extensions/generated-metadata/extensions-v0.json',
                'https://rw-extensions.pages.dev/astraeditor/extensions-index.json',
                data => data.extensions.map(extension => ({
                    name: extension.name,
                    nameTranslations: extension.nameTranslations || {},
                    description: extension.description,
                    descriptionTranslations: extension.descriptionTranslations || {},
                    extensionId: extension.id,
                    extensionURL: `https://editors.astras.top/extensions/${extension.slug}.js`,
                    iconURL: `https://editors.astras.top/extensions/${extension.image || 'images/unknown.svg'}`,
                    tags: ['ae'],
                    credits: [
                        ...(extension.by || []),
                        ...(extension.original || [])
                    ].map(credit => {
                        if (credit.link) {
                            return (
                                <a
                                    href={credit.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    key={credit.name}
                                >
                                    {credit.name}
                                </a>
                            );
                        }
                        return credit.name;
                    }),
                    docsURI: extension.docs ? `https://editors.astras.top/extensions/${extension.slug}` : null,
                    samples: extension.samples ? extension.samples.map(sample => ({
                        href: `${process.env.ROOT}editor?project_url=https://editors.astras.top/extensions/samples/${encodeURIComponent(sample)}.sb3`,
                        text: sample
                    })) : null,
                    incompatibleWithScratch: true,
                    featured: true
                }))
            );
        }),
        fetchAndAdd('02engine', async () => {
            return await fetchWithFallback(
                '02engine',
                'https://rw-extensions.pages.dev/02engine/02engine-extensions/extensions.json',
                'https://raw.githubusercontent.com/DDguan2010/extensions/main/generated-metadata/extensions-v0.json',
                data => data.extensions.map(extension => ({
                    name: extension.name,
                    nameTranslations: extension.nameTranslations || {},
                    description: extension.description,
                    descriptionTranslations: extension.descriptionTranslations || {},
                    extensionId: extension.id,
                    extensionURL: `https://rw-extensions.pages.dev/02engine/02engine-extensions/extension/${extension.slug}.js`,
                    iconURL: extension.image
                        ? `https://rw-extensions.pages.dev/02engine/02engine-extensions/image/${encodeURIComponent(extension.image)}`
                        : `https://raw.githubusercontent.com/DDguan2010/extensions/main/${extension.image || ''}`,
                    tags: ['02engine'],
                    credits: (extension.by || []).map(credit => {
                        if (credit.link) {
                            return (
                                <a
                                    href={credit.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    key={credit.name}
                                >
                                    {credit.name}
                                </a>
                            );
                        }
                        return credit.name;
                    }),
                    docsURI: extension.docs
                        ? `https://rw-extensions.pages.dev/02engine/02engine-extensions/doc/${encodeURIComponent(extension.slug)}/index.html`
                        : null,
                    samples: extension.samples ? extension.samples.map(sample => {
                        const sampleUrl = `https://rw-extensions.pages.dev/02engine/02engine-extensions/samples/${encodeURIComponent(sample)}.sb3`;
                        return {
                            href: `${process.env.ROOT}editor?project_url=${sampleUrl}`,
                            text: sample
                        };
                    }) : null,
                    incompatibleWithScratch: true,
                    featured: true
                }))
            );
        }),
        fetchAndAdd('ow', async () => {
            return await fetchWithFallback(
                'ow',
                'https://openwarp-extensions.pages.dev/generated-metadata/extensions-v0.json',
                'https://rw-extensions.pages.dev/yesshape/extensions-index.json',
                data => data.extensions.map(extension => ({
                    name: extension.name,
                    nameTranslations: extension.nameTranslations || {},
                    description: extension.description,
                    descriptionTranslations: extension.descriptionTranslations || {},
                    extensionId: extension.id,
                    extensionURL: `https://openwarp-extensions.pages.dev/${extension.slug}.js`,
                    iconURL: `https://openwarp-extensions.pages.dev/${extension.image || 'images/unknown.svg'}`,
                    tags: ['ow'],
                    credits: [
                        ...(extension.by || []),
                        ...(extension.original || [])
                    ].map(credit => {
                        if (credit.link) {
                            return (
                                <a
                                    href={credit.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    key={credit.name}
                                >
                                    {credit.name}
                                </a>
                            );
                        }
                        return credit.name;
                    }),
                    docsURI: extension.docs ? `https://openwarp-extensions.pages.dev/${extension.slug}` : null,
                    samples: extension.samples ? extension.samples.map(sample => ({
                        href: `${process.env.ROOT}editor?project_url=https://openwarp-extensions.pages.dev/samples/${encodeURIComponent(sample)}.sb3`,
                        text: sample
                    })) : null,
                    incompatibleWithScratch: true,
                    featured: true
                }))
            );
        }),
        fetchAndAdd('bilup', async () => {
            return await fetchWithFallback(
                'bilup',
                'https://extensions.bilup.org/generated-metadata/extensions-v0.json',
                'https://rw-extensions.pages.dev/bilup/extensions-index.json',
                data => data.extensions.map(extension => {
                    const zh = bilupZhTranslations[extension.id];
                    const nameTranslations = { ...(extension.nameTranslations || {}) };
                    const descriptionTranslations = { ...(extension.descriptionTranslations || {}) };
                    if (zh) {
                        nameTranslations['zh-cn'] = zh.name;
                        descriptionTranslations['zh-cn'] = zh.description;
                    }
                    return {
                        name: extension.name,
                        nameTranslations,
                        description: extension.description,
                        descriptionTranslations,
                        extensionId: extension.id,
                        extensionURL: `https://extensions.bilup.org/${extension.slug}.js`,
                        iconURL: `https://extensions.bilup.org/${extension.image || 'images/unknown.svg'}`,
                        tags: ['bilup'],
                        credits: [
                            ...(extension.by || []),
                            ...(extension.original || [])
                        ].map(credit => {
                            if (credit.link) {
                                return (
                                    <a
                                        href={credit.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        key={credit.name}
                                    >
                                        {credit.name}
                                    </a>
                                );
                            }
                            return credit.name;
                        }),
                        docsURI: extension.docs ? `https://extensions.bilup.org/${extension.slug}` : null,
                        samples: extension.samples ? extension.samples.map(sample => ({
                            href: `${process.env.ROOT}editor?project_url=https://extensions.bilup.org/samples/${encodeURIComponent(sample)}.sb3`,
                            text: sample
                        })) : null,
                        incompatibleWithScratch: true,
                        featured: true
                    };
                })
            );
        }),
        fetchAndAdd('cy-scr-ext-hub', async () => {
            return await fetchWithFallback(
                'cy-scr-ext-hub',
                'https://raw.githubusercontent.com/cy-studio-001/CYScrExtHub/main/extensions.json',
                'https://rw-extensions.pages.dev/cy-scr-ext-hub/extensions-index.json',
                data => {
                    const extensions = (data.extensions || data);
                    const isGitHubRaw = extensions.length > 0 && ('is_cyso' in extensions[0] || 'download_url' in extensions[0]);
                    if (isGitHubRaw) {
                        return extensions
                            .filter(ext => !ext.is_cyso)
                            .map(ext => ({
                                name: ext.name,
                                description: ext.description,
                                extensionId: 'cyse_' + ext.id,
                                extensionURL: ext.download_url,
                                iconURL: ext.cover_url || emptyBanner,
                                tags: ['cy-scr-ext-hub'],
                                credits: ext.author_name ? [ext.author_name] : [],
                                incompatibleWithScratch: true,
                                featured: true
                            }));
                    }
                    return extensions.map(ext => ({
                        name: ext.name,
                        description: ext.description,
                        extensionId: ext.extensionId || ext.id,
                        extensionURL: ext.extensionURL,
                        iconURL: ext.iconURL || emptyBanner,
                        tags: ['cy-scr-ext-hub'],
                        credits: (ext.credits || []).map(credit => {
                            if (typeof credit === 'object' && credit.name) {
                                const link = credit.link || credit.url;
                                if (link) {
                                    return React.createElement('a', { href: link, target: '_blank', rel: 'noreferrer', key: credit.name }, credit.name);
                                }
                                return credit.name;
                            }
                            return credit;
                        }),
                        incompatibleWithScratch: true,
                        featured: true
                    }));
                }
            );
        })
    ]);

    cachedLoadStatus = { ...sourceStatuses };

    // 注册各扩展库的刷新函数（适配新模式）
    retryFetchers['bilup'] = async () => {
        const result = await fetchWithFallback(
            'bilup',
            'https://extensions.bilup.org/generated-metadata/extensions-v0.json',
            'https://rw-extensions.pages.dev/bilup/extensions-index.json',
            data => data.extensions.map(extension => {
                const zh = bilupZhTranslations[extension.id];
                const nameTranslations = { ...(extension.nameTranslations || {}) };
                const descriptionTranslations = { ...(extension.descriptionTranslations || {}) };
                if (zh) {
                    nameTranslations['zh-cn'] = zh.name;
                    descriptionTranslations['zh-cn'] = zh.description;
                }
                return {
                    name: extension.name,
                    nameTranslations,
                    description: extension.description,
                    descriptionTranslations,
                    extensionId: extension.id,
                    extensionURL: `https://extensions.bilup.org/${extension.slug}.js`,
                    iconURL: `https://extensions.bilup.org/${extension.image || 'images/unknown.svg'}`,
                    tags: ['bilup'],
                    credits: [
                        ...(extension.by || []),
                        ...(extension.original || [])
                    ].map(credit => {
                        if (credit.link) {
                            return React.createElement('a', { href: credit.link, target: '_blank', rel: 'noreferrer', key: credit.name }, credit.name);
                        }
                        return credit.name;
                    }),
                    docsURI: extension.docs ? `https://extensions.bilup.org/${extension.slug}` : null,
                    samples: extension.samples ? extension.samples.map(sample => ({
                        href: `${process.env.ROOT}editor?project_url=https://extensions.bilup.org/samples/${encodeURIComponent(sample)}.sb3`,
                        text: sample
                    })) : null,
                    incompatibleWithScratch: true,
                    featured: true
                };
            })
        );
        if (cachedGallery) {
            cachedGallery = dedupeFetchedExtensions([
                ...cachedGallery.filter(e => !(e.tags || []).includes('bilup')),
                ...result
            ]);
        }
        cachedSourceStatuses = { ...cachedSourceStatuses, bilup: 'loaded' };
        notifyListeners();
        return cachedSourceStatuses;
    };

    retryFetchers['ow'] = async () => {
        const result = await fetchWithFallback(
            'ow',
            'https://openwarp-extensions.pages.dev/generated-metadata/extensions-v0.json',
            'https://rw-extensions.pages.dev/yesshape/extensions-index.json',
            data => data.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTranslations: extension.descriptionTranslations || {},
                extensionId: extension.id,
                extensionURL: `https://openwarp-extensions.pages.dev/${extension.slug}.js`,
                iconURL: `https://openwarp-extensions.pages.dev/${extension.image || 'images/unknown.svg'}`,
                tags: ['ow'],
                credits: [
                    ...(extension.by || []),
                    ...(extension.original || [])
                ].map(credit => {
                    if (credit.link) {
                        return React.createElement('a', { href: credit.link, target: '_blank', rel: 'noreferrer', key: credit.name }, credit.name);
                    }
                    return credit.name;
                }),
                docsURI: extension.docs ? `https://openwarp-extensions.pages.dev/${extension.slug}` : null,
                samples: extension.samples ? extension.samples.map(sample => ({
                    href: `${process.env.ROOT}editor?project_url=https://openwarp-extensions.pages.dev/samples/${encodeURIComponent(sample)}.sb3`,
                    text: sample
                })) : null,
                incompatibleWithScratch: true,
                featured: true
            }))
        );
        if (cachedGallery) {
            cachedGallery = dedupeFetchedExtensions([
                ...cachedGallery.filter(e => !(e.tags || []).includes('ow')),
                ...result
            ]);
        }
        cachedSourceStatuses = { ...cachedSourceStatuses, ow: 'loaded' };
        notifyListeners();
        return cachedSourceStatuses;
    };

    retryFetchers['ae'] = async () => {
        const result = await fetchWithFallback(
            'ae',
            'https://editors.astras.top/extensions/generated-metadata/extensions-v0.json',
            'https://rw-extensions.pages.dev/astraeditor/extensions-index.json',
            data => data.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTranslations: extension.descriptionTranslations || {},
                extensionId: extension.id,
                extensionURL: `https://editors.astras.top/extensions/${extension.slug}.js`,
                iconURL: `https://editors.astras.top/extensions/${extension.image || 'images/unknown.svg'}`,
                tags: ['ae'],
                credits: [
                    ...(extension.by || []),
                    ...(extension.original || [])
                ].map(credit => {
                    if (credit.link) {
                        return React.createElement('a', { href: credit.link, target: '_blank', rel: 'noreferrer', key: credit.name }, credit.name);
                    }
                    return credit.name;
                }),
                docsURI: extension.docs ? `https://editors.astras.top/extensions/${extension.slug}` : null,
                samples: extension.samples ? extension.samples.map(sample => ({
                    href: `${process.env.ROOT}editor?project_url=https://editors.astras.top/extensions/samples/${encodeURIComponent(sample)}.sb3`,
                    text: sample
                })) : null,
                incompatibleWithScratch: true,
                featured: true
            }))
        );
        if (cachedGallery) {
            cachedGallery = dedupeFetchedExtensions([
                ...cachedGallery.filter(e => !(e.tags || []).includes('ae')),
                ...result
            ]);
        }
        cachedSourceStatuses = { ...cachedSourceStatuses, ae: 'loaded' };
        notifyListeners();
        return cachedSourceStatuses;
    };

    retryFetchers['02engine'] = async () => {
        const result = await fetchWithFallback(
            '02engine',
            'https://raw.githubusercontent.com/DDguan2010/extensions/main/generated-metadata/extensions-v0.json',
            'https://rw-extensions.pages.dev/02engine/02engine-extensions/extensions.json',
            data => data.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTranslations: extension.descriptionTranslations || {},
                extensionId: extension.id,
                extensionURL: `https://raw.githubusercontent.com/DDguan2010/extensions/main/${extension.slug}.js`,
                iconURL: extension.image
                    ? `https://raw.githubusercontent.com/DDguan2010/extensions/main/${extension.image}`
                    : `https://rw-extensions.pages.dev/02engine/02engine-extensions/image/${encodeURIComponent(extension.image || '')}`,
                tags: ['02engine'],
                credits: (extension.by || []).map(credit => {
                    if (credit.link) {
                        return React.createElement('a', { href: credit.link, target: '_blank', rel: 'noreferrer', key: credit.name }, credit.name);
                    }
                    return credit.name;
                }),
                docsURI: extension.docs
                    ? `https://raw.githubusercontent.com/DDguan2010/extensions/main/doc/${encodeURIComponent(extension.slug)}/index.html`
                    : null,
                samples: extension.samples ? extension.samples.map(sample => {
                    const sampleUrl = `https://rw-extensions.pages.dev/02engine/02engine-extensions/samples/${encodeURIComponent(sample)}.sb3`;
                    return {
                        href: `${process.env.ROOT}editor?project_url=${sampleUrl}`,
                        text: sample
                    };
                }) : null,
                incompatibleWithScratch: true,
                featured: true
            }))
        );
        if (cachedGallery) {
            cachedGallery = dedupeFetchedExtensions([
                ...cachedGallery.filter(e => !(e.tags || []).includes('02engine')),
                ...result
            ]);
        }
        cachedSourceStatuses = { ...cachedSourceStatuses, '02engine': 'loaded' };
        notifyListeners();
        return cachedSourceStatuses;
    };

    retryFetchers['cy-scr-ext-hub'] = async () => {
        const result = await fetchWithFallback(
            'cy-scr-ext-hub',
            'https://raw.githubusercontent.com/cy-studio-001/CYScrExtHub/main/extensions.json',
            'https://rw-extensions.pages.dev/cy-scr-ext-hub/extensions-index.json',
            data => {
                const extensions = (data.extensions || data);
                const isGitHubRaw = extensions.length > 0 && ('is_cyso' in extensions[0] || 'download_url' in extensions[0]);
                if (isGitHubRaw) {
                    return extensions
                        .filter(ext => !ext.is_cyso)
                        .map(ext => ({
                            name: ext.name,
                            description: ext.description,
                            extensionId: 'cyse_' + ext.id,
                            extensionURL: ext.download_url,
                            iconURL: ext.cover_url || emptyBanner,
                            tags: ['cy-scr-ext-hub'],
                            credits: ext.author_name ? [ext.author_name] : [],
                            incompatibleWithScratch: true,
                            featured: true
                        }));
                }
                return extensions.map(ext => ({
                    name: ext.name,
                    description: ext.description,
                    extensionId: ext.extensionId || ext.id,
                    extensionURL: ext.extensionURL,
                    iconURL: ext.iconURL || emptyBanner,
                    tags: ['cy-scr-ext-hub'],
                    credits: (ext.credits || []).map(credit => {
                        if (typeof credit === 'object' && credit.name) {
                            const link = credit.link || credit.url;
                            if (link) {
                                return React.createElement('a', { href: link, target: '_blank', rel: 'noreferrer', key: credit.name }, credit.name);
                            }
                            return credit.name;
                        }
                        return credit;
                    }),
                    incompatibleWithScratch: true,
                    featured: true
                }));
            }
        );
        if (cachedGallery) {
            cachedGallery = dedupeFetchedExtensions([
                ...cachedGallery.filter(e => !(e.tags || []).includes('cy-scr-ext-hub')),
                ...result
            ]);
        }
        cachedSourceStatuses = { ...cachedSourceStatuses, 'cy-scr-ext-hub': 'loaded' };
        notifyListeners();
        return cachedSourceStatuses;
    };

    return allExtensions;
};

const mergeExtensionTags = (existingTags, newTags) => Array.from(
    new Set([
        ...(existingTags || []).map(tag => String(tag).toLowerCase()),
        ...(newTags || []).map(tag => String(tag).toLowerCase())
    ])
);

const dedupeFetchedExtensions = extensions => {
    const seen = new Map();
    for (const extension of extensions) {
        const extensionId = extension.extensionId || extension.id;
        if (!extensionId) {
            continue;
        }

        if (!seen.has(extensionId)) {
            seen.set(extensionId, {
                ...extension,
                extensionId,
                tags: mergeExtensionTags(extension.tags, extension.tags)
            });
        } else {
            const previous = seen.get(extensionId);
            seen.set(extensionId, {
                ...previous,
                ...extension,
                extensionId,
                tags: mergeExtensionTags(previous.tags, extension.tags)
            });
        }
    }
    return Array.from(seen.values());
};

export {
    addCustomSource,
    removeCustomSource,
    updateGallery
};

class ExtensionLibrary extends React.PureComponent {
    constructor(props) {
        super(props);
        bindAll(this, [
            'handleItemSelect',
            'getSourceStatus'
        ]);
        this.state = {
            gallery: cachedGallery,
            galleryError: null,
            galleryTimedOut: false,
            sourceStatuses: cachedSourceStatuses,
            customSources: cachedCustomSources
        };
    }

    componentDidMount() {
        // 接收模块级快照广播：添加自定义库 / fetchLibrary 进度都会触发
        this.unsubscribeGalleryUpdate = addGalleryUpdateListener(payload => {
            this.setState({
                gallery: payload.gallery,
                sourceStatuses: payload.sourceStatuses,
                customSources: payload.customSources
            });
        });

        // 加载/卸载扩展时同步刷新"已加载"对勾
        this.handleExtensionChange = () => this.forceUpdate();
        const vm = this.props.vm;
        if (vm && typeof vm.on === 'function') {
            vm.on('EXTENSION_ADDED', this.handleExtensionChange);
            vm.on('EXTENSION_REMOVED', this.handleExtensionChange);
        }

        // 首次打开时拉取网络源；已注册的自定义库独立加载（互不阻塞）
        if (!this.state.gallery) {
            const timeout = setTimeout(() => {
                this.setState({
                    galleryTimedOut: true
                });
            }, 750);

            fetchLibrary()
                .then(() => clearTimeout(timeout))
                .catch(error => {
                    log.error(error);
                    this.setState({
                        galleryError: error
                    });
                    clearTimeout(timeout);
                });

            cachedCustomSources.forEach(source => {
                if (!cachedSourceStatuses[source.id]) {
                    fetchCustomSource(source.id).catch(error => log.error(error));
                }
            });
        }
    }

    componentWillUnmount() {
        if (this.unsubscribeGalleryUpdate) {
            this.unsubscribeGalleryUpdate();
        }
        const vm = this.props.vm;
        if (vm && typeof vm.off === 'function') {
            vm.off('EXTENSION_ADDED', this.handleExtensionChange);
            vm.off('EXTENSION_REMOVED', this.handleExtensionChange);
        }
    }

    getSourceStatus(tag) {
        // 扩展实验广场是内嵌 iframe，没有远程加载状态
        if (tag === 'experiment-plaza') {
            return null;
        }
        // 内置本地数据始终可用（桌面端本地加载成功 → 蓝色）
        if (tag === 'scratch' || tag === 'rotur') {
            return 'local';
        }
        // 无状态时返回 'idle' 作为占位
        return this.state.sourceStatuses[tag] || 'idle';
    }

    handleItemSelect(item, callback) {
        if (item.href) {
            window.open(item.href, '_blank', 'noopener,noreferrer');
            if (callback) callback(true, null);
            return;
        }

        const extensionId = item.extensionId;

        if (extensionId === 'custom_extension') {
            this.props.onOpenCustomExtensionModal();
            if (callback) callback(true, null);
            return;
        }

        if (extensionId === 'custom_extension_gallery') {
            if (this.props.onOpenCustomGalleryModal) {
                this.props.onOpenCustomGalleryModal();
            }
            if (callback) callback(true, null);
            return;
        }

        if (extensionId === 'procedures_enable_return') {
            if (this.props.onEnableProcedureReturns) {
                this.props.onEnableProcedureReturns();
            }
            if (typeof this.props.onActivateBlocksTab === 'function') {
                this.props.onActivateBlocksTab();
            }
            if (typeof this.props.onCategorySelected === 'function') {
                this.props.onCategorySelected('more');
            }
            if (callback) callback(true, null);
            return;
        }

        const url = item.extensionURL ? item.extensionURL : extensionId;
        if (!item.disabled) {
            const customSource = cachedCustomSources.find(cs => cs.id === item.source);
            if (customSource && customSource.unsandboxed && url) {
                manuallyTrustExtension(url);
            }
            if (this.props.vm.extensionManager.isExtensionLoaded(extensionId)) {
                if (typeof this.props.onCategorySelected === 'function') {
                    this.props.onCategorySelected(extensionId);
                }
                if (callback) callback(true, null);
            } else {
                this.props.vm.extensionManager.loadExtensionURL(url)
                    .then(() => {
                        this.forceUpdate();
                        if (typeof this.props.onCategorySelected === 'function') {
                            this.props.onCategorySelected(extensionId);
                        }
                        if (callback) callback(true, null);
                    })
                    .catch(err => {
                        this.forceUpdate();
                        log.error(err);
                        // eslint-disable-next-line no-alert
                        alert(err);
                        if (callback) callback(false, err);
                    });
            }
        } else if (callback) {
            callback(false, new Error('Extension is disabled'));
        }
    }

    render() {
        const vanilla = getVanillaPalette();
        let library = null;
        if (vanilla || this.state.gallery || this.state.galleryError || this.state.galleryTimedOut) {
            const locale = this.props.intl.locale;
            library = extensionLibraryContent
                .filter(extension => !vanilla || (extension.tags.includes('scratch') && !extension.extensionURL))
                .map(toLibraryItem);
            if (!vanilla) {
                library.push('---');
                if (this.state.gallery) {
                    library.push(toLibraryItem(galleryMore));
                    library.push(
                        ...this.state.gallery
                            .filter(i => i.extensionId !== 'faceSensing')
                            .map(i => translateGalleryItem(i, locale))
                            .map(toLibraryItem)
                    );
                } else if (this.state.galleryError) {
                    library.push(toLibraryItem(galleryError));
                } else {
                    library.push(toLibraryItem(galleryLoading));
                }
            }
        }

        const vm = this.props.vm;
        const isLoaded = item => {
            if (!vm || !vm.extensionManager || !item) {
                return false;
            }
            // 先按 extensionId 检查（内置扩展和 ID 匹配的扩展）
            if (item.extensionId && vm.extensionManager.isExtensionLoaded(item.extensionId)) {
                return true;
            }
            // 再按 extensionURL 检查（部分外部扩展的 ID 可能不匹配其自身 getInfo().id）
            if (item.extensionURL && vm.extensionManager.isExtensionURLLoaded(item.extensionURL)) {
                return true;
            }
            return false;
        };

        // 已注册的自定义扩展库像内置源一样出现在左侧栏与分组中
        const customTags = this.state.customSources.map(source => ({
            tag: source.id,
            intlLabel: source.name
        }));
        const tags = [...extensionTags, ...customTags];
        const sources = [
            ['scratch', 'Scratch'],
            ['tw', 'TurboWarp'],
            ['mistium', 'Mistium'],
            ['rotur', 'Bilup Accounts'],
            ...this.state.customSources.map(source => [source.id, source.name])
        ];
        // 可删除（自定义）的标签 id 集合，用于侧边栏渲染删除按钮
        const removableTags = this.state.customSources.map(source => source.id);

        return (
            <LibraryComponent
                data={library}
                filterable
                persistableKey="extensionId"
                id="extensionLibrary"
                tags={tags}
                sources={sources}
                title={this.props.intl.formatMessage(messages.extensionTitle)}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
                isLoaded={isLoaded}
                getSourceStatus={this.getSourceStatus}
                removableTags={removableTags}
                onRemoveCustomSource={removeCustomSource}
            />
        );
    }
}

ExtensionLibrary.propTypes = {
    intl: intlShape.isRequired,
    onActivateBlocksTab: PropTypes.func,
    onCategorySelected: PropTypes.func,
    onEnableProcedureReturns: PropTypes.func,
    onOpenCustomExtensionModal: PropTypes.func,
    onOpenCustomGalleryModal: PropTypes.func,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired // eslint-disable-line react/no-unused-prop-types
};

export default injectIntl(ExtensionLibrary);
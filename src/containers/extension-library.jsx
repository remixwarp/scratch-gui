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

import ExtensionLibraryComponent from '../components/tw-extension-library/extension-library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

// 分类状态小圆点颜色（与 tag-button 保持一致：在线=绿、本地/加载中=黄、错误=红）
const TAG_STATUS_COLORS = {
    online: '#4CAF50',
    local: '#FFC107',
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

// 存储各扩展库的刷新函数，供 tag-button 调用
const retryFetchers = {};

const fetchWithTimeout = (url, timeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    let twExtensions = [];
    let mistiumExtensions = [];
    let sharkpoolsExtensions = [];
    let penguinmodExtensions = [];
    let remixwarpExtensions = [];
    let astraExtensions = [];
    let engineExtensions = [];
    let yesshapeExtensions = [];
    let bilupExtensions = [];

    const loadStatus = {};

    try {
        const twRes = await fetch('https://extensions.turbowarp.org/generated-metadata/extensions-v0.json');
        if (!twRes.ok) {
            console.warn(`TurboWarp extensions: HTTP status ${twRes.status}`);
        } else {
            const twData = await twRes.json();
            twExtensions = twData.extensions.map(extension => ({
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
            loadStatus['tw'] = 'online';
        }
    } catch (error) {
        console.warn('Failed to load TurboWarp extensions:', error);
    }

    try {
        const mistiumRes = await fetch('https://rw-extensions.pages.dev/mistium/extensions-index.json');
        if (!mistiumRes.ok) {
            console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
        } else {
            const mistiumData = await mistiumRes.json();
            mistiumExtensions = mistiumData.extensions
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
            loadStatus['mistium'] = 'online';
        }
    } catch (error) {
        console.warn('Failed to load Mistium extensions:', error);
    }

    try {
        const sharkpoolsRes = await fetch('https://sharkpools-extensions.vercel.app/Gallery%20Files/Extension-Keys.json');
        if (!sharkpoolsRes.ok) {
            console.warn(`SharkPool extensions: HTTP status ${sharkpoolsRes.status}`);
        } else {
            const sharkpoolsData = await sharkpoolsRes.json();

            const rawExtensions = sharkpoolsData.extensions;
            let normalizedExtensions = [];

            if (Array.isArray(rawExtensions)) {
                normalizedExtensions = rawExtensions;
            } else if (rawExtensions && typeof rawExtensions === 'object') {
                normalizedExtensions = Object.entries(rawExtensions).map(
                    ([key, value]) => ({
                        id: value.id ?? key,
                        name: value.name ?? key,
                        ...value
                    })
                );
            } else {
                console.warn('[SharkPools] Invalid extensions format:', rawExtensions);
                normalizedExtensions = [];
            }

            console.log('[SharkPools] Normalized extensions:', normalizedExtensions);

            sharkpoolsExtensions = normalizedExtensions
                .filter(ext => !ext.isDeprecated)
                .map(extension => ({
                    name: extension.name,
                    nameTranslations: extension.nameTranslations || {},
                    description: extension.description || extension.desc,
                    descriptionTranslations: extension.descriptionTranslations || {},
                    extensionId: extension.id,
                    extensionURL: `https://sharkpools-extensions.vercel.app/extension-code/${extension.url}`,
                    iconURL: extension.banner ? `https://sharkpools-extensions.vercel.app/extension-thumbs/${extension.banner}` : emptyBanner,
                    tags: ['sharkpools'],
                    credits: [
                        ...(extension.by || []),
                        ...(extension.original || (extension.creator ? [{ name: extension.creator }] : []))
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
                    docsURI: null,
                    samples: null,
                    incompatibleWithScratch: true,
                    featured: true
                }));
            loadStatus['sharkpools'] = 'online';
        }
    } catch (error) {
        console.warn('Failed to load SharkPools extensions:', error);
    }

    try {
        const penguinmodRes = await import(
            /* webpackIgnore: true */
            '/penguinmod/extensions.js'
        );
        const penguinmodData = {extensions: penguinmodRes.default};
        penguinmodExtensions = penguinmodData.extensions
            .map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTranslations: extension.descriptionTranslations || {},
                extensionId: extension.id,
                extensionURL: `https://extensions.penguinmod.com/extensions/${extension.code}`,
                iconURL: extension.banner ? `https://extensions.penguinmod.com/images/${extension.banner}` : emptyBanner,
                tags: ['penguinmod'],
                credits: [
                    ...(extension.by || []),
                    ...(extension.original || (extension.creator ? [{ name: extension.creator }] : []))
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
                docsURI: null,
                samples: null,
                incompatibleWithScratch: true,
                featured: true
            }));
            loadStatus['penguinmod'] = 'online';
    } catch (error) {
        console.warn('Failed to load PenguinMod extensions:', error);
    }

    try {
        const remixwarpRes = await fetch('https://rw-extensions.pages.dev/remixwarp/extensions-index.json');
        if (!remixwarpRes.ok) {
            console.warn(`RemixWarp extensions: HTTP status ${remixwarpRes.status}`);
        } else {
            const remixwarpData = await remixwarpRes.json();
            remixwarpExtensions = remixwarpData.extensions.map(extension => ({
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
            loadStatus['remixwarp'] = 'online';
        }
    } catch (error) {
        console.warn('Failed to load RemixWarp extensions:', error);
    }

    const fetchWithFallback = async (tag, officialUrl, localUrl, transformFn) => {
        // 标记为加载中
        loadStatus[tag] = 'loading';

        // 先尝试官方源，5秒超时
        try {
            const officialRes = await fetchWithTimeout(officialUrl, 5000);
            if (officialRes.ok) {
                const data = await officialRes.json();
                loadStatus[tag] = 'online';
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

        // 官方源失败，尝试备用源，15秒超时
        try {
            const localRes = await fetchWithTimeout(localUrl, 15000);
            if (localRes.ok) {
                const data = await localRes.json();
                loadStatus[tag] = 'local';
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

        loadStatus[tag] = 'error';
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

    bilupExtensions = await fetchWithFallback(
        'bilup',
        'https://extensions.bilup.org/generated-metadata/extensions-v0.json',
        'https://rw-extensions.pages.dev/bilup/extensions-index.json',
        data => data.extensions.map(extension => {
            const zh = bilupZhTranslations[extension.id];
            const nameTranslations = {...(extension.nameTranslations || {})};
            const descriptionTranslations = {...(extension.descriptionTranslations || {})};
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

    yesshapeExtensions = await fetchWithFallback(
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

    astraExtensions = await fetchWithFallback(
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

    engineExtensions = await fetchWithFallback(
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

    cachedLoadStatus = loadStatus;

    // 注册各扩展库的刷新函数
    retryFetchers['bilup'] = async () => {
        const result = await fetchWithFallback(
            'bilup',
            'https://extensions.bilup.org/generated-metadata/extensions-v0.json',
            'https://rw-extensions.pages.dev/bilup/extensions-index.json',
            data => data.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTranslations: extension.descriptionTranslations || {},
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
            }))
        );
        if (cachedGallery) {
            cachedGallery.extensions = dedupeFetchedExtensions([
                ...cachedGallery.extensions.filter(e => !(e.tags || []).includes('bilup')),
                ...result
            ]);
        }
        cachedLoadStatus = { ...cachedLoadStatus, bilup: loadStatus['bilup'] };
        return cachedLoadStatus;
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
            cachedGallery.extensions = dedupeFetchedExtensions([
                ...cachedGallery.extensions.filter(e => !(e.tags || []).includes('ow')),
                ...result
            ]);
        }
        cachedLoadStatus = { ...cachedLoadStatus, ow: loadStatus['ow'] };
        return cachedLoadStatus;
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
            cachedGallery.extensions = dedupeFetchedExtensions([
                ...cachedGallery.extensions.filter(e => !(e.tags || []).includes('ae')),
                ...result
            ]);
        }
        cachedLoadStatus = { ...cachedLoadStatus, ae: loadStatus['ae'] };
        return cachedLoadStatus;
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
            cachedGallery.extensions = dedupeFetchedExtensions([
                ...cachedGallery.extensions.filter(e => !(e.tags || []).includes('02engine')),
                ...result
            ]);
        }
        cachedLoadStatus = { ...cachedLoadStatus, '02engine': loadStatus['02engine'] };
        return cachedLoadStatus;
    };

    return {
        extensions: dedupeFetchedExtensions([
            ...twExtensions,
            ...mistiumExtensions,
            ...sharkpoolsExtensions,
            ...penguinmodExtensions,
            ...remixwarpExtensions,
            ...astraExtensions,
            ...engineExtensions,
            ...yesshapeExtensions,
            ...bilupExtensions
        ]),
        loadStatus
    };
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
    mergeExtensionTags,
    dedupeFetchedExtensions
};

class ExtensionLibrary extends React.PureComponent {
    constructor(props) {
        super(props);
        bindAll(this, [
            'handleItemSelect',
            'handleRetryTag',
            'isLoaded'
        ]);
        this.state = {
            gallery: cachedGallery ? cachedGallery.extensions : null,
            loadStatus: cachedLoadStatus || {},
            galleryError: null,
            galleryTimedOut: false,
            selectedTag: 'all'
        };
        this._mounted = false;
    }
    componentDidMount() {
        this._mounted = true;
        if (!this.state.gallery) {
            // 初始化所有标签为加载中状态（黄点闪烁）
            const initialLoadStatus = {};
            extensionTags.forEach(tag => {
                initialLoadStatus[tag.tag] = 'loading';
            });
            this.setState({ loadStatus: initialLoadStatus });

            const timeout = setTimeout(() => {
                if (this._mounted) {
                    this.setState({
                        galleryTimedOut: true
                    });
                }
            }, 750);

            fetchLibrary()
                .then(result => {
                    if (this._mounted) {
                        cachedGallery = result;
                        cachedLoadStatus = result.loadStatus;
                        this.setState({
                            gallery: result.extensions,
                            loadStatus: result.loadStatus
                        });
                    }
                    clearTimeout(timeout);
                })
                .catch(error => {
                    log.error(error);
                    if (this._mounted) {
                        this.setState({
                            galleryError: error
                        });
                    }
                    clearTimeout(timeout);
                });
        }
    }
    componentWillUnmount() {
        this._mounted = false;
    }
    handleRetryTag(tag) {
        const fetcher = retryFetchers[tag];
        if (!fetcher || !this._mounted) return;

        // 先设置为加载中状态（黄点闪烁）
        this.setState(prevState => ({
            loadStatus: { ...prevState.loadStatus, [tag]: 'loading' }
        }));

        fetcher().then(newLoadStatus => {
            if (this._mounted && cachedGallery) {
                this.setState({
                    gallery: cachedGallery.extensions,
                    loadStatus: newLoadStatus
                });
            }
        }).catch(error => {
            log.error(`Failed to retry ${tag} extensions:`, error);
            if (this._mounted) {
                this.setState(prevState => ({
                    loadStatus: { ...prevState.loadStatus, [tag]: 'error' }
                }));
            }
        });
    }
    handleSelectTag(tag) {
        this.setState({ selectedTag: tag ? tag.toLowerCase() : 'all' });
    }
    handleItemSelect(item) {
        if (item.href) {
            return;
        }

        const extensionId = item.extensionId;

        if (extensionId === 'custom_extension') {
            this.props.onOpenCustomExtensionModal();
            return;
        }

        if (extensionId === 'procedures_enable_return') {
            if (this.props.onEnableProcedureReturns) {
                this.props.onEnableProcedureReturns();
            }

            // Switch to blocks tab after enabling returns
            if (typeof this.props.onActivateBlocksTab === 'function') {
                this.props.onActivateBlocksTab();
            }

            // Switch to My Blocks category after enabling returns (correct ID is "more")
            if (typeof this.props.onCategorySelected === 'function') {
                this.props.onCategorySelected('more');
            }
            return;
        }

        const url = item.extensionURL ? item.extensionURL : extensionId;
        if (!item.disabled) {
            if (this.props.vm.extensionManager.isExtensionLoaded(extensionId)) {
                if (typeof this.props.onCategorySelected === 'function') {
                    this.props.onCategorySelected(extensionId);
                }
            } else {
                this.props.vm.extensionManager.loadExtensionURL(url)
                    .then(() => {
                        if (typeof this.props.onCategorySelected === 'function') {
                            this.props.onCategorySelected(extensionId);
                        }
                    })
                    .catch(err => {
                        log.error(err);
                        // eslint-disable-next-line no-alert
                        alert(err);
                    });
            }
        }
    }
    render() {
        let library = null;
        if (this.state.gallery || this.state.galleryError || this.state.galleryTimedOut) {
            const locale = this.props.intl.locale;
            library = extensionLibraryContent
                .map(i => translateStaticItem(i, locale))
                .map(toLibraryItem);
            library.push('---');
            if (this.state.gallery) {
                library.push(toLibraryItem(galleryMore));
                library.push(
                    ...this.state.gallery
                        .map(i => translateGalleryItem(i, locale))
                        .map(toLibraryItem)
                );
            } else if (this.state.galleryError) {
                library.push(toLibraryItem(galleryError));
            } else {
                library.push(toLibraryItem(galleryLoading));
            }
        }

        const tagsWithIcons = extensionTags.map(tag => {
            // rotur（Bilup Accounts）与 scratch 是内置官方分类，始终显示绿色"已加载"小圆点
            if (tag.tag === 'rotur' || tag.tag === 'scratch') {
                return {
                    ...tag,
                    icon: () => (
                        <SidebarStatusDot
                            color={TAG_STATUS_COLORS.online}
                            isLoading={false}
                        />
                    )
                };
            }
            return {
                ...tag,
                icon: this.state.loadStatus[tag.tag] ? (() => (
                    <SidebarStatusDot
                        color={TAG_STATUS_COLORS[this.state.loadStatus[tag.tag]] || '#888888'}
                        isLoading={this.state.loadStatus[tag.tag] === 'loading'}
                    />
                )) : null
            };
        });

        return (
            <ExtensionLibraryComponent
                data={library}
                isLoaded={this.isLoaded}
                tags={tagsWithIcons}
                title={this.props.intl.formatMessage(messages.extensionTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }

    isLoaded (item) {
        return item && item.extensionId && this.props.vm && this.props.vm.extensionManager &&
            this.props.vm.extensionManager.isExtensionLoaded(item.extensionId);
    }
}

ExtensionLibrary.propTypes = {
    intl: intlShape.isRequired,
    onActivateBlocksTab: PropTypes.func,
    onCategorySelected: PropTypes.func,
    onEnableProcedureReturns: PropTypes.func,
    onOpenCustomExtensionModal: PropTypes.func,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired // eslint-disable-line react/no-unused-prop-types
};

export default injectIntl(ExtensionLibrary);
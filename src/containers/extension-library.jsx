import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

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
        }
    } catch (error) {
        console.warn('Failed to load RemixWarp extensions:', error);
    }

    try {
        const astraRes = await fetch('https://rw-extensions.pages.dev/astraeditor/extensions-index.json');
        if (!astraRes.ok) {
            console.warn(`AstraEditor extensions: HTTP status ${astraRes.status}`);
        } else {
            const astraData = await astraRes.json();
            astraExtensions = astraData.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTranslations: extension.descriptionTranslations || {},
                extensionId: extension.extensionId,
                extensionURL: extension.extensionURL,
                iconURL: extension.iconURL || emptyBanner,
                tags: extension.tags || ['astra'],
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
                    href: `https://remixwarp.pages.dev/editor.html?project_url=https://remixwarp.pages.dev${sample.href}`,
                    text: sample.text
                })) : null,
                incompatibleWithScratch: extension.incompatibleWithScratch || true,
                featured: extension.featured || true
            }));
        }
    } catch (error) {
        console.warn('Failed to load AstraEditor extensions:', error);
    }

    try {
        const engineRes = await fetch('https://rw-extensions.pages.dev/02engine/02engine-extensions/extensions.json');
        if (!engineRes.ok) {
            console.warn(`02Engine extensions: HTTP status ${engineRes.status}`);
        } else {
            const engineData = await engineRes.json();
            engineExtensions = engineData.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTranslations: extension.descriptionTranslations || {},
                extensionId: extension.id,
                extensionURL: `https://rw-extensions.pages.dev/02engine/02engine-extensions/extension/${encodeURIComponent(extension.slug)}.js`,
                iconURL: `https://rw-extensions.pages.dev/02engine/02engine-extensions/image/${encodeURIComponent(extension.image)}`,
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
                docsURI: extension.docs ? `https://rw-extensions.pages.dev/02engine/02engine-extensions/doc/${encodeURIComponent(extension.slug)}/index.html` : null,
                samples: extension.samples ? extension.samples.map(sample => {
                    const sampleUrl = `https://rw-extensions.pages.dev/02engine/02engine-extensions/samples/${encodeURIComponent(sample)}.sb3`;
                    return {
                        href: `${process.env.ROOT}editor?project_url=${sampleUrl}`,
                        text: sample
                    };
                }) : null,
                incompatibleWithScratch: true,
                featured: true
            }));
        }
    } catch (error) {
        console.warn('Failed to load 02Engine extensions:', error);
    }

    try {
        const yesshapeRes = await fetch('https://rw-extensions.pages.dev/yesshape/extensions-index.json');
        if (!yesshapeRes.ok) {
            console.warn(`Yesshape extensions: HTTP status ${yesshapeRes.status}`);
        } else {
            const yesshapeData = await yesshapeRes.json();
            yesshapeExtensions = yesshapeData.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTranslations: extension.descriptionTranslations || {},
                extensionId: extension.extensionId,
                extensionURL: extension.extensionURL,
                iconURL: extension.iconURL,
                tags: extension.tags || ['yesshape'],
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
        }
    } catch (error) {
        console.warn('Failed to load Yesshape extensions:', error);
    }

    try {
        const bilupRes = await fetch('https://rw-extensions.pages.dev/bilup/extensions-index.json');
        if (!bilupRes.ok) {
            console.warn(`Bilup extensions: HTTP status ${bilupRes.status}`);
        } else {
            const bilupData = await bilupRes.json();
            bilupExtensions = bilupData.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTranslations: extension.descriptionTranslations || {},
                extensionId: extension.extensionId,
                extensionURL: extension.extensionURL,
                iconURL: extension.iconURL,
                tags: extension.tags || ['bilup'],
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
        }
    } catch (error) {
        console.warn('Failed to load Bilup extensions:', error);
    }

    return dedupeFetchedExtensions([
        ...twExtensions,
        ...mistiumExtensions,
        ...sharkpoolsExtensions,
        ...penguinmodExtensions,
        ...remixwarpExtensions,
        ...astraExtensions,
        ...engineExtensions,
        ...yesshapeExtensions,
        ...bilupExtensions
    ]);
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
            'handleItemSelect'
        ]);
        this.state = {
            gallery: cachedGallery,
            galleryError: null,
            galleryTimedOut: false
        };
        this._isMounted = false;
    }
    componentDidMount() {
        this._isMounted = true;
        if (!this.state.gallery) {
            const timeout = setTimeout(() => {
                if (this._isMounted) {
                    this.setState({
                        galleryTimedOut: true
                    });
                }
            }, 750);

            fetchLibrary()
                .then(gallery => {
                    if (this._isMounted) {
                        cachedGallery = gallery;
                        this.setState({
                            gallery
                        });
                    }
                    clearTimeout(timeout);
                })
                .catch(error => {
                    log.error(error);
                    if (this._isMounted) {
                        this.setState({
                            galleryError: error
                        });
                    }
                    clearTimeout(timeout);
                });
        }
    }
    componentWillUnmount() {
        this._isMounted = false;
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

        return (
            <LibraryComponent
                data={library}
                filterable
                persistableKey="extensionId"
                id="extensionLibrary"
                tags={extensionTags}
                title={this.props.intl.formatMessage(messages.extensionTitle)}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
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
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired // eslint-disable-line react/no-unused-prop-types
};

export default injectIntl(ExtensionLibrary);import bindAll from 'import bindAll from 'lodash.bindall';
import PropTypes from 'import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React, { useState,import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import VM from 'scratch-vm';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import log fromimport bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import VM from 'scratch-vm';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import log from '../lib/utils/log';

import extensionLibraryContentimport bindAll from 'lodash.bindall';
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

import LibraryComponent fromimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description:import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        idimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtensionimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

constimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

const toLibraryItem = extension => {
    if (typeof extension === 'object') {
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

const toLibraryItem = extension => {
    if (typeof extension === 'object') {
        return ({
            rawURL: extension.iconURL || extensionIcon,
            ...extension
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

const toLibraryItem = extension => {
    if (typeof extension === 'object') {
        return ({
            rawURL: extension.iconURL || extensionIcon,
            ...extension
        });
    }
    return extension;
};

const translateGalleryItem = (extension,import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
    const localTranslationsimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
        name: extension.nameTransimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
        name: extension.nameTranslations?.[locale] || localTranslations.nameTranslations?.[locale] || extension.name,import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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

const translateStaticItem = (item,import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
    if (typeof itemimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
    if (!item.nameTranslations && !item.descriptionTranslations) return item;import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
        name: item.nameTranslations?.[localeimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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

let cachedGallery =import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 500import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6Zjimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/ximport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLiimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83Gimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nOimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4Jimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br6import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKzimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vfimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAADimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = awaitimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrlimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailableimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) =>import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(urlimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
            if (!twRes.ok) {
                console.warn(`TurboWarp extensions: HTTP status ${twRes.status}`);
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
            if (!twRes.ok) {
                console.warn(`TurboWarp extensions: HTTP status ${twRes.status}`);
                return [];
            }
            const twData = await twRes.json();
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
            if (!twRes.ok) {
                console.warn(`TurboWarp extensions: HTTP status ${twRes.status}`);
                return [];
            }
            const twData = await twRes.json();
            return twData.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
            if (!twRes.ok) {
                console.warn(`TurboWarp extensions: HTTP status ${twRes.status}`);
                return [];
            }
            const twData = await twRes.json();
            return twData.extensions.map(extension => ({
                name: extension.name,
                nameTranslations: extension.nameTranslations || {},
                description: extension.description,
                descriptionTransimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                extensionURLimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                iconimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                iconURL: `https://extensions.turbowarp.org/${extension.image || 'images/unknown.svgimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                ].map(credit =>import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                                hrefimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                                target="_blank"import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                docsURI: extensionimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                docsURI: extension.docs ? `https://extensions.turbowimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                    href:import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                    href: `${process.env.ROOT}editor?project_url=https://extensions.turbowarp.org/samplesimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
                }))import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
            }import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistiumimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.devimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            constimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP statusimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                returnimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(extimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
                        extensionURL: `https://extensions.mistimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
                        extensionURL: `https://extensions.mistium.com/featured/${extension.name}.js`,
                        iconURL: extension.image ? `https://extensions.mistium.com/${extension.image}` : emptyBanner,
                        tags: ['import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
                        extensionURL: `https://extensions.mistium.com/featured/${extension.name}.js`,
                        iconURL: extension.image ? `https://extensions.mistium.com/${extension.image}` : emptyBanner,
                        tags: ['mistium'],
                        credits: [
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
                        extensionURL: `https://extensions.mistium.com/featured/${extension.name}.js`,
                        iconURL: extension.image ? `https://extensions.mistium.com/${extension.image}` : emptyBanner,
                        tags: ['mistium'],
                        credits: [
                            ...(extension.by || []),
                            ...(extension.original || [])
                        ].map(credit => {
                            if (credit.link) {
                                return (
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
                        extensionURL: `https://extensions.mistium.com/featured/${extension.name}.js`,
                        iconURL: extension.image ? `https://extensions.mistium.com/${extension.image}` : emptyBanner,
                        tags: ['mistium'],
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
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
                        extensionURL: `https://extensions.mistium.com/featured/${extension.name}.js`,
                        iconURL: extension.image ? `https://extensions.mistium.com/${extension.image}` : emptyBanner,
                        tags: ['mistium'],
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
import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
                        extensionURL: `https://extensions.mistium.com/featured/${extension.name}.js`,
                        iconURL: extension.image ? `https://extensions.mistium.com/${extension.image}` : emptyBanner,
                        tags: ['mistium'],
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
                        docsURI: null,
                        samples: extension.samples ? extension.samples.map(sample => ({
                            href: `${process.env.ROOT}editor?project_url=https://extensions-mistium.pages.dev/samples/${encodeURIComponentimport bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
                        extensionURL: `https://extensions.mistium.com/featured/${extension.name}.js`,
                        iconURL: extension.image ? `https://extensions.mistium.com/${extension.image}` : emptyBanner,
                        tags: ['mistium'],
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
                        docsURI: null,
                        samples: extension.samples ? extension.samples.map(sample => ({
                            href: `${process.env.ROOT}editor?project_url=https://extensions-mistium.pages.dev/samples/${encodeURIComponent(sample)}.sb3`,
                            text: sample
                        })) : null,
                        incompatibleWithScratch: true,
                        featured: true
                    }));
            }import bindAll from 'lodash.bindall';
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

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const STATUS = {
    SUCCESS: 'success',
    FALLBACK: 'fallback',
    ERROR: 'error'
};

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
let cachedStatus = {};

const checkUrl = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        return response.ok;
    } catch (error) {
        return false;
    }
};

const fetchLibrary = async () => {
    const emptyBanner = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjaY2BgnuDo4uTKJMDAUFBUUuQe5BgZERmlwH6egY2BmYGBgYGBITG5uMAxIMCHgYGBIS8/L5UBA3y7xsDIwMDAcFnX0cXJlYE0wJpcUFTCwMBwgIGBwSgltTiZgYHhCwMDQ3p5SUEJAwNjDAMDg0hSdkEJAwNjAQMDg0h2SJAzAwNjCwMDE09JakUJAwMDg3N+QWVRZnpGiYKhpaWlgmNKflKqQnBlcUlqbrGCZ15yflFBflFiSWoKAwMD1A4GBgYGXpf8EgX3xMw8BUNTVQYqg4jIKAX08EGIIUByaVEZhMXIwMDAIMCgxeDHUMmwiuEBozRjFOM8xqdMhkwNTJeYNZgbme+y2LDMY2VmzWa9yubEtoldhX0mhwBHJycrZzMXM1cbNzf3RB4pnqW8xryH+IL5nvFXCwgJrBZ0E3wk1CisKHxYJF2UV3SrWJw4p/hWiRRJYcmjUhXSutJPZObIhsoJyp2V71HwUeRVvKA0RTlKRUnltepWtUZ1Pw1Zjbea+7QmaqfqWOsK6b7SO6I/36DGMMrI0ljS+LfJPdPDZivM+y0qLBOtfKwtbFRtRexY7L7aP3e47XjB6ZjzXpetruvdVrov9VjkudBrgfdCn8W+y/xW+a8P2Bq4N+hY8PmQW6HPwr5EMEUKRilFG8e4xUbF5cW3JMxO3Jx0Nvl5KlOaXLpNRlRmVdas7D059/KY8tULfAqLi2YXHy55WyZR7lJRWDmv6mz131q9uvj6SQ3HGn83G7Skt85ru94h2Ond1d59uJehz76/bsK+if8nO05pnXpiOu+M4JmzZj2aozW3ZN6+BVwLwxYtXvxxqcOyCcsfrjRe1br65lrddU3rb2402NSx+cFWq21Tt3/Y6btr1R6Oven7jh9QP9h56PURv6Obj4ufqD355LT3mS3nZM+3X/h0Ke7yqasW15bdEL3ZeuvrnfS7N+/7PDjwyPTx6qeKz2a+EHzZ9Zr5Td3bn+9LP3z6VPD53de8b+9+5P/88Lv4z7d/Vf//AwAqvx2K829RWwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAEUlEQVR42mL4zwAAAAD//wMAAgEBAJlUum0AAAAASUVORK5CYII=";

    const allExtensions = [];
    const statusMap = {};

    const fetchSource = async (tag, metadataUrl, fallbackUrl, fetchFn) => {
        let currentUrl = metadataUrl;
        let status = STATUS.ERROR;

        if (metadataUrl) {
            const metadataAvailable = await checkUrl(metadataUrl);
            if (metadataAvailable) {
                status = STATUS.SUCCESS;
            } else if (fallbackUrl) {
                const fallbackAvailable = await checkUrl(fallbackUrl);
                if (fallbackAvailable) {
                    currentUrl = fallbackUrl;
                    status = STATUS.FALLBACK;
                }
            }
        } else if (fallbackUrl) {
            const fallbackAvailable = await checkUrl(fallbackUrl);
            if (fallbackAvailable) {
                currentUrl = fallbackUrl;
                status = STATUS.FALLBACK;
            }
        }

        statusMap[tag] = status;

        if (currentUrl) {
            try {
                const extensions = await fetchFn(currentUrl, status === STATUS.SUCCESS);
                allExtensions.push(...extensions);
            } catch (error) {
                console.warn(`Failed to load ${tag} extensions:`, error);
                statusMap[tag] = STATUS.ERROR;
            }
        }
    };

    await Promise.all([
        fetchSource('tw', 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json', null, async (url, isOfficial) => {
            const twRes = await fetch(url);
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
        }),

        fetchSource('mistium', 'https://extensions.mistium.com/generated-metadata/extensions-v0.json', 'https://rw-extensions.pages.dev/mistium/extensions-index.json', async (url, isOfficial) => {
            const mistiumRes = await fetch(url);
            if (!mistiumRes.ok) {
                console.warn(`Mistium extensions: HTTP status ${mistiumRes.status}`);
                return [];
            }
            const mistiumData = await mistiumRes.json();
            
            if (isOfficial) {
                return mistiumData.extensions
                    .filter(ext => ext.featured)
                    .map(extension => ({
                        name: extension.name,
                        nameTranslations: extension.nameTranslations || {},
                        description: extension.description,
                        descriptionTranslations: extension.descriptionTranslations || {},
                        extensionId: extension.id,
                        extensionURL: `https://extensions.mistium.com/featured/${extension.name}.js`,
                        iconURL: extension.image ? `https://extensions.mistium.com/${extension.image}` : emptyBanner,
                        tags: ['mistium'],
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
                        docsURI: null,
                        samples: extension.samples ? extension.samples.map(sample => ({
                            href: `${process.env.ROOT}editor?project_url=https://extensions-mistium.pages.dev/samples/${encodeURIComponent(sample)}.sb3`,
                            text: sample
                        })) : null,
                        incompatibleWithScratch: true,
                        featured: true
                    }));
            } else {
                return mistiumData.extensions
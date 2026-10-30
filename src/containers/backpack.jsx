import React from 'react';
import {getItem as getStorageItem} from '../lib/utils/safe-storage.js';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import BackpackComponent from '../components/backpack/backpack.jsx';
import {
    getBackpackContents,
    saveBackpackObject,
    deleteBackpackObject,
    updateBackpackObject,
    createFolder,
    deleteBackpackFolder,
    soundPayload,
    costumePayload,
    spritePayload,
    codePayload,
    LOCAL_API
} from '../lib/api/backpack';
import DragConstants from '../lib/constants/drag-constants';
import DropAreaHOC from '../lib/components/drop-area-hoc.jsx';

import {connect} from 'react-redux';
import storage from '../lib/persistence/storage';
import VM from 'scratch-vm';
import {updateCallbacks} from '../lib/shortcuts/event-router.js';

const dragTypes = [DragConstants.COSTUME, DragConstants.SOUND, DragConstants.SPRITE];
const DroppableBackpack = DropAreaHOC(dragTypes)(BackpackComponent);

// Backpack item drag types that may be moved into a folder.
const BACKPACK_ITEM_TYPES = [
    DragConstants.BACKPACK_COSTUME,
    DragConstants.BACKPACK_SOUND,
    DragConstants.BACKPACK_SPRITE,
    DragConstants.BACKPACK_CODE
];

const normalizeSearch = value => `${value || ''}`.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const filterBackpackContents = (contents, value) => {
    const query = normalizeSearch(value).trim();
    if (!query) return contents;

    const terms = query.split(/\s+/);
    const aliases = {
        costume: 'costumes image images',
        script: 'scripts block blocks code',
        sound: 'sounds audio',
        sprite: 'sprites character characters'
    };

    return contents.map((item, index) => {
        const name = normalizeSearch(item.name || item.type || 'script');
        const searchable = `${name} ${item.type} ${aliases[item.type] || ''}`;
        if (!terms.every(term => searchable.includes(term))) return null;

        let score = 3;
        if (name === query) score = 0;
        else if (name.startsWith(query)) score = 1;
        else if (name.split(/\s+/).some(word => word.startsWith(query))) score = 2;
        return {item, index, score};
    }).filter(Boolean)
        .sort((a, b) => a.score - b.score || a.index - b.index)
        .map(result => result.item);
};

class Backpack extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleDrop',
            'handleToggle',
            'handleDelete',
            'handleRenameItem',
            'getBackpackAssetURL',
            'getContents',
            'handleMouseEnter',
            'handleMouseLeave',
            'handleBlockDragEnd',
            'handleBlockDragUpdate',
            'handleResizePointerDown',
            'handleResizePointerMove',
            'handleResizePointerUp',
            'handleResizePointerCancel',
            'handleResizeTouchMove',
            'handleGlobalPointerMove',
            'setDropAreaRef',
            'isPointerOverDropArea',
            'handleMore',
            'handleSearchChange',
            'handleFolderClick',
            'handleBackToRoot',
            'handleNavigateBack',
            'handleCreateFolder',
            'handleDeleteFolder',
            'handleCategoryChange',
            'handleToggleWorkspaceAssets',
            'handleAddToFolder',
            'handleFolderDragOver',
            'handleFolderDragLeave',
            'handleFolderDrop'
        ]);

        this.dropAreaRef = null;
        this.lastPointer = {x: null, y: null};
        this.resizeSession = null;
        this.contentsRequest = null;
        this.loadAllContents = false;

        const DEFAULT_HEIGHT = 5.5 * 16;
        const MIN_HEIGHT = DEFAULT_HEIGHT;
        let persistedHeight = null;
        try {
            const raw = getStorageItem('mw:backpackHeight');
            const parsed = raw ? Number(raw) : null;
            if (Number.isFinite(parsed) && parsed >= MIN_HEIGHT) {
                persistedHeight = parsed;
            }
        } catch (e) {
            // ignore
        }

        this.state = {
            // While the DroppableHOC manages drop interactions for asset tiles,
            // we still need to micromanage drops coming from the block workspace.
            // TODO this may be refactorable with the share-the-love logic in SpriteSelectorItem
            blockDragOutsideWorkspace: false,
            blockDragOverBackpack: false,
            error: false,
            itemsPerPage: 100,
            moreToLoad: false,
            loading: false,
            expanded: false,
            contents: [],
            height: persistedHeight || DEFAULT_HEIGHT,
            searchQuery: '',
            // Folder / workspace support.
            currentFolderId: null,
            folderPath: [],
            selectedCategory: 'all',
            showWorkspaceAssets: false,
            workspaceAssets: null,
            folderDragOverId: null
        };

        // If a host is given, add it as a web source to the storage module
        // TODO remove the hacky flag that prevents double adding
        if (props.host && !storage._hasAddedBackpackSource && props.host !== LOCAL_API) {
            storage.addWebSource(
                [storage.AssetType.ImageVector, storage.AssetType.ImageBitmap, storage.AssetType.Sound],
                this.getBackpackAssetURL
            );
            storage._hasAddedBackpackSource = true;
        }
    }
    componentDidMount () {
        this.props.vm.addListener('BLOCK_DRAG_END', this.handleBlockDragEnd);
        this.props.vm.addListener('BLOCK_DRAG_UPDATE', this.handleBlockDragUpdate);

        document.addEventListener('pointermove', this.handleGlobalPointerMove);
        document.addEventListener('mousemove', this.handleGlobalPointerMove);

        updateCallbacks({toggleBackpack: this.handleToggle});
    }
    componentWillUnmount () {
        this.props.vm.removeListener('BLOCK_DRAG_END', this.handleBlockDragEnd);
        this.props.vm.removeListener('BLOCK_DRAG_UPDATE', this.handleBlockDragUpdate);

        document.removeEventListener('pointermove', this.handleGlobalPointerMove);
        document.removeEventListener('mousemove', this.handleGlobalPointerMove);

        window.removeEventListener('pointermove', this.handleResizePointerMove, true);
        window.removeEventListener('pointerup', this.handleResizePointerUp, true);
        window.removeEventListener('pointercancel', this.handleResizePointerUp, true);
        window.removeEventListener('touchmove', this.handleResizeTouchMove, {capture: true, passive: false});
    }

    setDropAreaRef (el) {
        this.dropAreaRef = el;
    }

    handleGlobalPointerMove (e) {
        if (!e) return;
        if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
            this.lastPointer = {x: e.clientX, y: e.clientY};
        }

        if (this.state.blockDragOutsideWorkspace) {
            const over = this.isPointerOverDropArea();
            if (over !== this.state.blockDragOverBackpack) {
                this.setState({blockDragOverBackpack: over});
            }
        }
    }

    isPointerOverDropArea () {
        if (!this.state.expanded) return false;
        if (!this.dropAreaRef) return false;
        const {x, y} = this.lastPointer;
        if (x === null || y === null) return false;
        const rect = this.dropAreaRef.getBoundingClientRect();
        return x > rect.left && x < rect.right && y > rect.top && y < rect.bottom;
    }
    getBackpackAssetURL (asset) {
        return `${this.props.host}/${asset.assetId}.${asset.dataFormat}`;
    }
    handleToggle () {
        const newState = !this.state.expanded;
        this.setState({expanded: newState, contents: []}, () => {
            // Emit resize on window to get blocks to resize
            window.dispatchEvent(new Event('resize'));
        });
        if (newState) {
            this.getContents();
        }
    }
    handleError (error) {
        this.setState({
            error: `${error}`,
            loading: false
        });
        // Log error to console and make the Promise reject.
        throw error;
    }
    handleDrop (dragInfo) {
        let payloader = null;
        let presaveAsset = null;
        switch (dragInfo.dragType) {
        case DragConstants.COSTUME:
            payloader = costumePayload;
            presaveAsset = dragInfo.payload.asset;
            break;
        case DragConstants.SOUND:
            payloader = soundPayload;
            presaveAsset = dragInfo.payload.asset;
            break;
        case DragConstants.SPRITE:
            payloader = spritePayload;
            break;
        case DragConstants.CODE:
            payloader = codePayload;
            break;
        }
        if (!payloader) return;

        // Creating the payload is async, so set loading before starting
        this.setState({loading: true}, () => {
            payloader(dragInfo.payload, this.props.vm)
                .then(payload => {
                    // Force the asset to save to the asset server before storing in backpack
                    // Ensures any asset present in the backpack is also on the asset server
                    if (presaveAsset && !presaveAsset.clean && this.props.host !== LOCAL_API) {
                        return storage.store(
                            presaveAsset.assetType,
                            presaveAsset.dataFormat,
                            presaveAsset.data,
                            presaveAsset.assetId
                        ).then(() => payload);
                    }
                    return payload;
                })
                .then(payload => saveBackpackObject({
                    host: this.props.host,
                    token: this.props.token,
                    username: this.props.username,
                    ...payload,
                    folderId: this.state.currentFolderId
                }))
                .then(item => {
                    this.setState({
                        loading: false,
                        contents: [item].concat(this.state.contents)
                    });
                })
                .catch(error => {
                    this.handleError(error);
                });
        });
    }
    handleDelete (id) {
        this.setState({loading: true}, () => {
            deleteBackpackObject({
                host: this.props.host,
                token: this.props.token,
                username: this.props.username,
                id: id
            })
                .then(() => {
                    this.setState({
                        loading: false,
                        contents: this.state.contents.filter(o => o.id !== id)
                    });
                })
                .catch(error => {
                    this.handleError(error);
                });
        });
    }
    findItemById (id) {
        return this.state.contents.find(i => i.id === id);
    }
    handleRenameItem (id, newName) {
        if (!newName) {
            return;
        }
        const item = this.findItemById(id);
        if (!item) return;
        this.setState({loading: true}, () => {
            updateBackpackObject({
                host: this.props.host,
                ...item,
                name: newName
            })
                .then(newItem => {
                    this.setState({
                        loading: false,
                        contents: this.state.contents.map(i => (i === item ? newItem : i))
                    });
                })
                .catch(error => {
                    this.handleError(error);
                });
        });
    }
    getContents (loadAll = false) {
        if ((!this.props.token || !this.props.username) && this.props.host !== LOCAL_API) return;

        this.loadAllContents = this.loadAllContents || loadAll;
        if (this.contentsRequest) return;

        this.setState({loading: true, error: false});
        const loaded = this.state.contents.slice();
        const loadPage = () => getBackpackContents({
            host: this.props.host,
            token: this.props.token,
            username: this.props.username,
            offset: loaded.length,
            limit: this.state.itemsPerPage,
            folderId: this.state.currentFolderId
        }).then(contents => {
            loaded.push(...contents);
            if (this.loadAllContents && contents.length === this.state.itemsPerPage) {
                return loadPage();
            }
            return contents.length === this.state.itemsPerPage;
        });

        this.contentsRequest = loadPage()
            .then(moreToLoad => {
                this.setState({contents: loaded, moreToLoad, loading: false});
            })
            .catch(error => {
                this.contentsRequest = null;
                this.loadAllContents = false;
                this.handleError(error);
            })
            .then(() => {
                this.contentsRequest = null;
                this.loadAllContents = false;
            });
    }
    handleBlockDragUpdate (isOutsideWorkspace) {
        this.setState({
            blockDragOutsideWorkspace: isOutsideWorkspace,
            blockDragOverBackpack: isOutsideWorkspace ? this.isPointerOverDropArea() : false
        });
    }
    handleMouseEnter () {
        if (this.state.blockDragOutsideWorkspace) {
            this.setState({blockDragOverBackpack: true});
        }
    }
    handleMouseLeave () {
        this.setState({
            blockDragOverBackpack: false
        });
    }
    handleBlockDragEnd (blocks, topBlockId) {
        const shouldDrop = this.state.blockDragOverBackpack || this.isPointerOverDropArea();
        if (shouldDrop) {
            this.handleDrop({
                dragType: DragConstants.CODE,
                payload: {
                    blockObjects: this.props.vm.exportStandaloneBlocks(blocks),
                    topBlockId: topBlockId
                }
            });
        }
        this.setState({
            blockDragOverBackpack: false,
            blockDragOutsideWorkspace: false
        });
    }

    handleResizePointerDown (e) {
        if (!e) return;
        if (!this.state.expanded) return;
        // Stop the gesture from bubbling to ancestors and from being treated as a
        // default browser / workspace action (e.g. starting a block drag).
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();

        // Best-effort: lock the pointer to the handle so subsequent events are
        // delivered here even when the finger slides off the (small) strip.
        if (e.pointerId !== undefined && e.currentTarget &&
                typeof e.currentTarget.setPointerCapture === 'function') {
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch (err) {
                // ignore unsupported / already-captured
            }
        }

        this.resizeSession = {
            startY: e.clientY,
            startHeight: this.state.height
        };

        // Listen on window in the CAPTURE phase so we track the drag even if
        // pointer capture fails or the finger moves over the block workspace
        // behind the handle. Without this the touch leaks to the workspace and
        // drags the blocks instead of resizing the backpack.
        window.addEventListener('pointermove', this.handleResizePointerMove, true);
        window.addEventListener('pointerup', this.handleResizePointerUp, true);
        window.addEventListener('pointercancel', this.handleResizePointerUp, true);
        // Prevent the browser / workspace from acting on the touch as it travels
        // over the blocks behind the handle.
        window.addEventListener('touchmove', this.handleResizeTouchMove, {capture: true, passive: false});
    }

    handleResizeTouchMove (e) {
        if (this.resizeSession && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
    }

    handleResizePointerMove (e) {
        if (!this.resizeSession) return;
        if (typeof e.preventDefault === 'function') e.preventDefault();
        const MIN_HEIGHT = 5.5 * 16;
        const maxHeight = Math.max(MIN_HEIGHT, Math.floor(window.innerHeight * 0.75));
        const delta = this.resizeSession.startY - e.clientY;
        const next = Math.max(MIN_HEIGHT, Math.min(maxHeight, Math.round(this.resizeSession.startHeight + delta)));
        if (next !== this.state.height) {
            this.setState({height: next}, () => {
                window.dispatchEvent(new Event('resize'));
            });
        }
    }

    handleResizePointerUp (e) {
        this.resizeSession = null;
        window.removeEventListener('pointermove', this.handleResizePointerMove, true);
        window.removeEventListener('pointerup', this.handleResizePointerUp, true);
        window.removeEventListener('pointercancel', this.handleResizePointerUp, true);
        window.removeEventListener('touchmove', this.handleResizeTouchMove, {capture: true, passive: false});
        if (e && e.pointerId !== undefined && e.currentTarget &&
                typeof e.currentTarget.releasePointerCapture === 'function') {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch (err) {
                // ignore
            }
        }
        try {
            localStorage.setItem('mw:backpackHeight', String(this.state.height));
        } catch (e) {
            // ignore
        }
    }

    handleResizePointerCancel (e) {
        this.resizeSession = null;
        if (e && e.pointerId !== undefined && e.currentTarget &&
                typeof e.currentTarget.releasePointerCapture === 'function') {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch (err) {
                // ignore
            }
        }
        try {
            localStorage.setItem('mw:backpackHeight', String(this.state.height));
        } catch (e) {
            // ignore
        }
    }

    handleMore () {
        this.getContents();
    }
    handleSearchChange (event) {
        const value = event.target.value;
        this.setState({searchQuery: value});
        if (value.trim() && (this.state.moreToLoad || this.contentsRequest)) this.getContents(true);
    }
    handleFolderClick (folderId, folderName) {
        this.setState({
            currentFolderId: folderId,
            folderPath: [...this.state.folderPath, {id: folderId, name: folderName}],
            contents: []
        }, () => {
            this.getContents();
        });
    }
    handleBackToRoot () {
        this.setState({
            currentFolderId: null,
            folderPath: [],
            contents: []
        }, () => {
            this.getContents();
        });
    }
    handleNavigateBack (index) {
        const newFolderPath = this.state.folderPath.slice(0, index + 1);
        const targetFolder = newFolderPath[newFolderPath.length - 1];
        this.setState({
            currentFolderId: targetFolder ? targetFolder.id : null,
            folderPath: newFolderPath,
            contents: []
        }, () => {
            this.getContents();
        });
    }
    handleCreateFolder (name) {
        if (!name) return;
        this.setState({loading: true}, () => {
            createFolder({
                host: this.props.host,
                token: this.props.token,
                username: this.props.username,
                name: name,
                folderId: this.state.currentFolderId
            })
                .then(folder => {
                    this.setState({
                        loading: false,
                        contents: [folder].concat(this.state.contents)
                    });
                })
                .catch(error => {
                    this.handleError(error);
                });
        });
    }
    handleDeleteFolder (id) {
        this.setState({loading: true}, () => {
            deleteBackpackFolder({
                host: this.props.host,
                token: this.props.token,
                username: this.props.username,
                id: id
            })
                .then(() => {
                    const isCurrent = this.state.currentFolderId === id;
                    this.setState({
                        loading: false,
                        contents: this.state.contents.filter(o => o.id !== id),
                        folderPath: this.state.folderPath.filter(f => f.id !== id)
                    });
                    if (isCurrent) {
                        this.handleBackToRoot();
                    }
                })
                .catch(error => {
                    this.handleError(error);
                });
        });
    }
    handleCategoryChange (category) {
        this.setState({selectedCategory: category});
    }
    handleToggleWorkspaceAssets () {
        const show = !this.state.showWorkspaceAssets;
        this.setState({
            showWorkspaceAssets: show,
            workspaceAssets: show ? this.computeWorkspaceAssets() : null
        });
    }
    computeWorkspaceAssets () {
        const vm = this.props.vm;
        if (!vm || !vm.runtime) {
            return {costumes: [], sounds: [], sprites: [], scripts: []};
        }
        const runtime = vm.runtime;
        const targets = runtime.targets || [];
        const costumes = [];
        const sounds = [];
        const sprites = [];
        const scripts = [];
        targets.forEach(target => {
            const targetCostumes = target.getCostumes ? target.getCostumes() : [];
            targetCostumes.forEach((costume, index) => {
                costumes.push({
                    id: `workspace-costume-${target.id}-${index}`,
                    type: 'costume',
                    name: costume.name,
                    thumbnailUrl: costume.asset ? costume.asset.encodeDataURI() : '',
                    isWorkspace: true
                });
            });
            const targetSounds = target.getSounds ? target.getSounds() : [];
            targetSounds.forEach((sound, index) => {
                sounds.push({
                    id: `workspace-sound-${target.id}-${index}`,
                    type: 'sound',
                    name: sound.name,
                    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgMTJhNyA3IDAgMCAxIDctN2g1YTcgNyAwIDAgMSAxIDd6Ii8+PHBhdGggZD0iTTUgMTJhNyA3IDAgMCAxIDctN2g1YTcgNyAwIDAgMSAxIDd6Ii8+PC9zdmc+',
                    isWorkspace: true
                });
            });
        });
        targets.slice(1).forEach(target => {
            const costume = target.getCostumes ? target.getCostumes()[0] : null;
            sprites.push({
                id: `workspace-sprite-${target.id}`,
                type: 'sprite',
                name: target.getName ? target.getName() : target.name,
                thumbnailUrl: costume && costume.asset ? costume.asset.encodeDataURI() : '',
                isWorkspace: true
            });
        });
        return {costumes, sounds, sprites, scripts};
    }
    handleAddToFolder (itemId, folderId) {
        if (!folderId) return;
        this.setState({loading: true}, () => {
            updateBackpackObject({
                host: this.props.host,
                token: this.props.token,
                username: this.props.username,
                id: itemId,
                folderId: folderId
            })
                .then(() => {
                    this.getContents();
                })
                .catch(error => {
                    this.handleError(error);
                });
        });
    }
    handleFolderDragOver (folderId) {
        if (folderId !== this.state.folderDragOverId) {
            this.setState({folderDragOverId: folderId});
        }
    }
    handleFolderDragLeave () {
        this.setState({folderDragOverId: null});
    }
    handleFolderDrop (folderId, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.setState({folderDragOverId: null});
        const dragInfo = this.props.dragInfo;
        if (!dragInfo || !dragInfo.dragging) return;
        const dt = dragInfo.dragType;
        // Folders themselves cannot be nested into other folders.
        if (dt === 'BACKPACK_FOLDER') return;
        if (!BACKPACK_ITEM_TYPES.includes(dt)) return;
        const itemId = dragInfo.payload && dragInfo.payload.id;
        if (!itemId) return;
        this.setState({loading: true}, () => {
            updateBackpackObject({
                host: this.props.host,
                token: this.props.token,
                username: this.props.username,
                id: itemId,
                folderId: folderId
            })
                .then(() => {
                    this.getContents();
                })
                .catch(error => {
                    this.handleError(error);
                });
        });
    }
    getFilteredContents () {
        let filtered = this.state.contents;
        if (this.state.selectedCategory !== 'all') {
            filtered = filtered.filter(item => item.type === this.state.selectedCategory);
        }
        return filterBackpackContents(filtered, this.state.searchQuery);
    }
    render () {
        const folders = this.state.contents.filter(item => item.type === 'folder');
        return (
            <DroppableBackpack
                blockDragOver={this.state.blockDragOverBackpack}
                contents={this.getFilteredContents()}
                error={this.state.error}
                expanded={this.state.expanded}
                height={this.state.height}
                loading={this.state.loading && this.state.contents.length === 0}
                searchQuery={this.state.searchQuery}
                onSearchChange={this.handleSearchChange}
                showMore={!this.state.searchQuery && this.state.moreToLoad}
                onDelete={this.handleDelete}
                onRename={this.handleRenameItem}
                onDrop={this.handleDrop}
                onMore={this.handleMore}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
                onResizePointerDown={this.handleResizePointerDown}
                onResizePointerMove={this.handleResizePointerMove}
                onResizePointerUp={this.handleResizePointerUp}
                onResizePointerCancel={this.handleResizePointerCancel}
                onToggle={this.handleToggle}
                componentRef={this.setDropAreaRef}
                folders={folders}
                currentFolderId={this.state.currentFolderId}
                folderPath={this.state.folderPath}
                selectedCategory={this.state.selectedCategory}
                onFolderClick={this.handleFolderClick}
                onBackToRoot={this.handleBackToRoot}
                onNavigateBack={this.handleNavigateBack}
                onCreateFolder={this.handleCreateFolder}
                onDeleteFolder={this.handleDeleteFolder}
                onCategoryChange={this.handleCategoryChange}
                onAddToFolder={this.handleAddToFolder}
                onToggleWorkspaceAssets={this.handleToggleWorkspaceAssets}
                showWorkspaceAssets={this.state.showWorkspaceAssets}
                workspaceAssets={this.state.workspaceAssets}
                folderDragOverId={this.state.folderDragOverId}
                onFolderDragOver={this.handleFolderDragOver}
                onFolderDragLeave={this.handleFolderDragLeave}
                onFolderDrop={this.handleFolderDrop}
            />
        );
    }
}

Backpack.propTypes = {
    host: PropTypes.string,
    token: PropTypes.string,
    username: PropTypes.string,
    vm: PropTypes.instanceOf(VM)
};

const getTokenAndUsername = state => {
    // Look for the session state provided by scratch-www
    if (state.session && state.session.session && state.session.session.user) {
        return {
            token: state.session.session.user.token,
            username: state.session.session.user.username
        };
    }
    // Otherwise try to pull testing params out of the URL, or return nulls
    // TODO a hack for testing the backpack
    const tokenMatches = window.location.href.match(/[?&]token=([^&]*)&?/);
    const usernameMatches = window.location.href.match(/[?&]username=([^&]*)&?/);
    return {
        token: tokenMatches ? tokenMatches[1] : null,
        username: usernameMatches ? usernameMatches[1] : null
    };
};

const mapStateToProps = state => Object.assign(
    {
        dragInfo: state.scratchGui.assetDrag,
        vm: state.scratchGui.vm,
        blockDrag: state.scratchGui.blockDrag
    },
    getTokenAndUsername(state)
);

const mapDispatchToProps = () => ({});

export {filterBackpackContents};
export default connect(mapStateToProps, mapDispatchToProps)(Backpack);

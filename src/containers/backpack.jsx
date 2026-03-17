import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
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

const messages = defineMessages({
    rename: {
        defaultMessage: 'New name:',
        description: 'Renaming a backpack item',
        id: 'tw.backpack.rename'
    }
});

class Backpack extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleDrop',
            'handleToggle',
            'handleDelete',
            'handleRename',
            'handleAddToFolder',
            'handleFolderMouseEnter',
            'handleFolderMouseLeave',
            'getBackpackAssetURL',
            'getContents',
            'handleMouseEnter',
            'handleMouseLeave',
            'handleBlockDragEnd',
            'handleBlockDragUpdate',
            'handleResizePointerDown',
            'handleResizePointerMove',
            'handleResizePointerUp',
            'handleGlobalPointerMove',
            'setDropAreaRef',
            'isPointerOverDropArea',
            'handleMore',
            'handleSearchChange',
            'handleFolderClick',
            'handleCreateFolder',
            'handleDeleteFolder',
            'handleCategoryChange',
            'handleBackToRoot',
            'handleToggleWorkspaceAssets'
        ]);

        this.dropAreaRef = null;
        this.lastPointer = {x: null, y: null};
        this.resizeSession = null;

        const DEFAULT_HEIGHT = 5.5 * 16;
        const MIN_HEIGHT = DEFAULT_HEIGHT;
        let persistedHeight = null;
        try {
            const raw = localStorage.getItem('mw:backpackHeight');
            const parsed = raw ? Number(raw) : null;
            if (Number.isFinite(parsed) && parsed >= MIN_HEIGHT) {
                persistedHeight = parsed;
            }
        } catch (e) {
            // ignore
        }

        this.state = {
            // While the DroppableHOC manages drop interactions for asset tiles,
            // we still need to micromanage drops coming from block workspace.
            // TODO this may be refactorable with share-the-love logic in SpriteSelectorItem
            blockDragOutsideWorkspace: false,
            blockDragOverBackpack: false,
            error: false,
            itemsPerPage: 20,
            moreToLoad: false,
            loading: false,
            expanded: false,
            contents: [],
            height: persistedHeight || DEFAULT_HEIGHT,
            searchQuery: '',
            currentFolderId: null,
            folderPath: [],
            selectedCategory: 'all',
            showWorkspaceAssets: false,
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

        window.removeEventListener('pointermove', this.handleResizePointerMove);
        window.removeEventListener('pointerup', this.handleResizePointerUp);
        window.removeEventListener('pointercancel', this.handleResizePointerUp);
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
                    if (presaveAsset && !presaveAsset.clean && !this.props.host === LOCAL_API) {
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
    async handleRename (id) {
        const item = this.findItemById(id);
        // prompt() returns Promise in desktop app
        // eslint-disable-next-line no-alert
        const newName = await prompt(this.props.intl.formatMessage(messages.rename), item.name);
        if (!newName) {
            return;
        }
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
    getContents () {
        if ((this.props.token && this.props.username) || this.props.host === LOCAL_API) {
            this.setState({loading: true, error: false}, () => {
                getBackpackContents({
                    host: this.props.host,
                    token: this.props.token,
                    username: this.props.username,
                    offset: this.state.contents.length,
                    limit: this.state.itemsPerPage,
                    folderId: this.state.currentFolderId
                })
                    .then(contents => {
                        this.setState({
                            contents: this.state.contents.concat(contents),
                            moreToLoad: contents.length === this.state.itemsPerPage,
                            loading: false
                        });
                    })
                    .catch(error => {
                        this.handleError(error);
                    });
            });
        }
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
        if (typeof e.preventDefault === 'function') e.preventDefault();

        this.resizeSession = {
            startY: e.clientY,
            startHeight: this.state.height
        };

        window.addEventListener('pointermove', this.handleResizePointerMove);
        window.addEventListener('pointerup', this.handleResizePointerUp);
        window.addEventListener('pointercancel', this.handleResizePointerUp);
    }

    handleResizePointerMove (e) {
        if (!this.resizeSession) return;
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

    handleResizePointerUp () {
        this.resizeSession = null;
        window.removeEventListener('pointermove', this.handleResizePointerMove);
        window.removeEventListener('pointerup', this.handleResizePointerUp);
        window.removeEventListener('pointercancel', this.handleResizePointerUp);

        try {
            localStorage.setItem('mw:backpackHeight', String(this.state.height));
        } catch (e) {
            // ignore
        }
    }
    handleMore () {
        this.getContents();
    }
    handleSearchChange (value) {
        this.setState({searchQuery: value});
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
    handleCreateFolder () {
        // eslint-disable-next-line no-alert
        const folderName = prompt('请输入文件夹名称:', '新建文件夹');
        if (!folderName) {
            return;
        }
        this.setState({loading: true}, () => {
            createFolder({
                host: this.props.host,
                token: this.props.token,
                username: this.props.username,
                name: folderName,
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
    handleAddToFolder (itemId) {
        // 获取所有文件夹
        getBackpackContents({
            host: this.props.host,
            token: this.props.token,
            username: this.props.username
        })
            .then(allContents => {
                const folders = allContents.filter(item => item.type === 'folder');
                if (folders.length === 0) {
                    alert('没有找到文件夹。请先创建一个文件夹。');
                    return;
                }
                
                // 构建文件夹选择对话框
                const folderOptions = folders.map(folder => `[${folder.id}] ${folder.name}`).join('\n');
                const selectedFolderId = prompt(`选择要添加到的文件夹:\n${folderOptions}\n\n请输入文件夹ID:`);
                
                if (selectedFolderId) {
                    const folder = folders.find(f => f.id === selectedFolderId);
                    if (folder) {
                        // 更新项目的 folderId
                        updateBackpackObject({
                            host: this.props.host,
                            token: this.props.token,
                            username: this.props.username,
                            id: itemId,
                            updates: {
                                folderId: selectedFolderId
                            }
                        })
                            .then(() => {
                                // 重新加载内容
                                this.getContents();
                            })
                            .catch(error => {
                                this.handleError(error);
                            });
                    } else {
                        alert('无效的文件夹ID');
                    }
                }
            })
            .catch(error => {
                this.handleError(error);
            });
    }
    handleCategoryChange (category) {
        this.setState({selectedCategory: category});
    }
    handleToggleWorkspaceAssets () {
        this.setState({showWorkspaceAssets: !this.state.showWorkspaceAssets});
    }
    handleFolderMouseEnter (folderId) {
        this.setState({folderDragOverId: folderId});
    }
    handleFolderMouseLeave () {
        this.setState({folderDragOverId: null});
    }
    getFilteredContents () {
        const query = this.state.searchQuery.toLowerCase().trim();
        let filtered = this.state.contents;
        
        // Filter by category
        if (this.state.selectedCategory !== 'all') {
            filtered = filtered.filter(item => item.type === this.state.selectedCategory);
        }
        
        // Filter by search query
        if (query) {
            filtered = filtered.filter(item => {
                const name = item.name || 'script';
                return name.toLowerCase().includes(query);
            });
        }
        
        return filtered;
    }
    getWorkspaceAssets () {
        const vm = this.props.vm;
        const runtime = vm.runtime;
        const targets = runtime.targets;
        
        const costumes = [];
        const sounds = [];
        const sprites = [];
        const scripts = [];
        
        targets.forEach(target => {
            // Get costumes
            target.getCostumes().forEach((costume, index) => {
                costumes.push({
                    id: `workspace-costume-${target.id}-${index}`,
                    type: 'costume',
                    name: costume.name,
                    thumbnailUrl: costume.asset ? costume.asset.encodeDataURI() : '',
                    isWorkspace: true
                });
            });
            
            // Get sounds
            target.getSounds().forEach((sound, index) => {
                sounds.push({
                    id: `workspace-sound-${target.id}-${index}`,
                    type: 'sound',
                    name: sound.name,
                    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgMTJhNyA3IDAgMCAxIDctN2g1YTcgNyAwIDAgMSAxIDd6Ii8+PHBhdGggZD0iTTUgMTJhNyA3IDAgMCAxIDctN2g1YTcgNyAwIDAgMSAxIDd6Ii8+PC9zdmc+',
                    isWorkspace: true
                });
            });
        });
        
        // Get sprites (excluding stage)
        const stageTarget = targets[0];
        targets.slice(1).forEach((target, index) => {
            const costume = target.getCostumes()[0];
            sprites.push({
                id: `workspace-sprite-${target.id}`,
                type: 'sprite',
                name: target.getName(),
                thumbnailUrl: costume && costume.asset ? costume.asset.encodeDataURI() : '',
                isWorkspace: true
            });
        });
        
        return {costumes, sounds, sprites, scripts};
    }
    render () {
        const workspaceAssets = this.state.showWorkspaceAssets ? this.getWorkspaceAssets() : null;
        return (
            <DroppableBackpack
                blockDragOver={this.state.blockDragOverBackpack}
                contents={this.getFilteredContents()}
                error={this.state.error}
                expanded={this.state.expanded}
                height={this.state.height}
                loading={this.state.loading}
                searchQuery={this.state.searchQuery}
                onSearchChange={this.handleSearchChange}
                showMore={!this.props.searchQuery && this.state.moreToLoad}
                onDelete={this.handleDelete}
                onRename={this.handleRename}
                onDrop={this.handleDrop}
                onMore={this.handleMore}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
                onResizePointerDown={this.handleResizePointerDown}
                onToggle={this.props.host ? this.handleToggle : null}
                componentRef={this.setDropAreaRef}
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
                workspaceAssets={workspaceAssets}
                folderDragOverId={this.state.folderDragOverId}
                onFolderMouseEnter={this.handleFolderMouseEnter}
                onFolderMouseLeave={this.handleFolderMouseLeave}
            />
        );
    }
}

Backpack.propTypes = {
    intl: intlShape,
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

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(Backpack));

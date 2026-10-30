import React, {useState, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {FormattedMessage, defineMessages, injectIntl, intlShape} from 'react-intl';
import DragConstants from '../../lib/constants/drag-constants';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import SpriteSelectorItem from '../../containers/sprite-selector-item.jsx';
import styles from './backpack.css';

// TODO make sprite selector item not require onClick
const noop = () => {};

const dragTypeMap = { // Keys correspond with backpack-server item types
    costume: DragConstants.BACKPACK_COSTUME,
    sound: DragConstants.BACKPACK_SOUND,
    script: DragConstants.BACKPACK_CODE,
    sprite: DragConstants.BACKPACK_SPRITE,
    folder: 'BACKPACK_FOLDER' // folders cannot be dragged elsewhere
};

// Folder glyph taken from the editor's own icon set (lucide folder icon used by
// the sprite-folders addon). It draws with `currentColor`, so the colour follows
// the active theme (light vs dark) automatically via the CSS `color` below.
const FolderIcon = () => (
    <svg
        className={styles.folderIconSvg}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
);

const labelMap = defineMessages({
    costume: {
        id: 'gui.backpack.costumeLabel',
        defaultMessage: 'costume',
        description: 'Label for costume backpack item'
    },
    sound: {
        id: 'gui.backpack.soundLabel',
        defaultMessage: 'sound',
        description: 'Label for sound backpack item'
    },
    script: {
        id: 'gui.backpack.scriptLabel',
        defaultMessage: 'script',
        description: 'Label for script backpack item'
    },
    sprite: {
        id: 'gui.backpack.spriteLabel',
        defaultMessage: 'sprite',
        description: 'Label for sprite backpack item'
    },
    folder: {
        id: 'gui.backpack.folderLabel',
        defaultMessage: 'folder',
        description: 'Label for folder backpack item'
    },
    all: {
        id: 'gui.backpack.allLabel',
        defaultMessage: 'All',
        description: 'Label for the "all" category tab'
    },
    createFolder: {
        id: 'gui.backpack.createFolder',
        defaultMessage: 'New folder',
        description: 'Button / menu item to create a folder'
    }
});

const CATEGORIES = [
    {key: 'all', label: labelMap.all},
    {key: 'costume', label: labelMap.costume},
    {key: 'sound', label: labelMap.sound},
    {key: 'sprite', label: labelMap.sprite},
    {key: 'script', label: labelMap.script}
];

const nameFor = (intl, item) => (
    item.type && labelMap[item.type]
        ? intl.formatMessage(labelMap[item.type])
        : (item.name || '')
);

const Backpack = props => {
    const {
        blockDragOver,
        containerRef,
        contents,
        dragOver,
        error,
        expanded,
        height,
        intl,
        loading,
        showMore,
        onToggle,
        onDelete,
        onRename,
        onResizePointerDown,
        onResizePointerMove,
        onResizePointerUp,
        onResizePointerCancel,
        onMouseEnter,
        onMouseLeave,
        onMore,
        searchQuery,
        onSearchChange,
        folders,
        currentFolderId,
        folderPath,
        selectedCategory,
        onFolderClick,
        onBackToRoot,
        onNavigateBack,
        onCreateFolder,
        onDeleteFolder,
        onCategoryChange,
        onAddToFolder,
        folderDragOverId,
        onFolderDragOver,
        onFolderDragLeave,
        onFolderDrop
    } = props;

    // Inline UI state (replaces the buggy prompt() usage in main).
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [renameId, setRenameId] = useState(null);
    const [renameName, setRenameName] = useState('');
    // Folder picker opened from the item's own (editor built-in) right-click
    // menu. {itemId, x, y} -> anchored at the pointer, like a native popup.
    const [folderPicker, setFolderPicker] = useState(null);
    const folderPickerRef = useRef(null);
    // Right-click context menu (opened on empty backpack area -> "New folder").
    const [contextMenu, setContextMenu] = useState(null);

    const submitCreate = () => {
        const name = createName.trim();
        setShowCreate(false);
        setCreateName('');
        if (name) onCreateFolder(name);
    };
    // NOTE: the editor's SpriteSelectorItem calls onRenameButtonClick with the
    // item id (not the item object), so look the item up by id here.
    const startRename = id => {
        const target = contents.find(i => i.id === id);
        setRenameId(id);
        setRenameName(target ? (target.name || '') : '');
    };
    const submitRename = () => {
        if (renameId != null) onRename(renameId, renameName.trim());
        setRenameId(null);
        setRenameName('');
    };
    const cancelRename = () => {
        setRenameId(null);
        setRenameName('');
    };

    // The editor's own SpriteSelectorItem renders a built-in "Add to Folder"
    // entry in its right-click menu. We only catch that click and open our
    // folder picker next to the pointer.
    const openFolderPicker = (itemId, event) => {
        const rawX = event && typeof event.clientX === 'number' ? event.clientX : window.innerWidth / 2;
        const rawY = event && typeof event.clientY === 'number' ? event.clientY : window.innerHeight / 2;
        setFolderPicker({
            itemId,
            x: Math.max(0, Math.min(rawX, window.innerWidth - 170)),
            y: Math.max(0, Math.min(rawY, window.innerHeight - 220))
        });
    };

    // Close the "New folder" context menu on any outside interaction.
    useEffect(() => {
        if (!contextMenu) return undefined;
        const close = () => setContextMenu(null);
        window.addEventListener('click', close);
        window.addEventListener('contextmenu', close);
        window.addEventListener('scroll', close, true);
        return () => {
            window.removeEventListener('click', close);
            window.removeEventListener('contextmenu', close);
            window.removeEventListener('scroll', close, true);
        };
    }, [contextMenu]);

    // Close the folder picker on an outside press (mousedown so that clicks
    // inside the picker itself keep working).
    useEffect(() => {
        if (!folderPicker) return undefined;
        const close = e => {
            if (folderPickerRef.current && folderPickerRef.current.contains(e.target)) return;
            setFolderPicker(null);
        };
        const closeOnEscape = e => {
            if (e.key === 'Escape') setFolderPicker(null);
        };
        window.addEventListener('mousedown', close);
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            window.removeEventListener('mousedown', close);
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [folderPicker]);

    const handleContextMenu = e => {
        // Let individual items show their own (rename / delete) context menu.
        if (e.target.closest('[data-backpack-item]')) return;
        e.preventDefault();
        const x = Math.min(e.clientX, window.innerWidth - 150);
        const y = Math.min(e.clientY, window.innerHeight - 90);
        setContextMenu({x, y});
    };

    return (
        <div
            className={styles.backpackContainer}
            data-backpack-container
        >
            {expanded ? (
                <div
                    className={styles.resizeHandle}
                    onPointerDown={onResizePointerDown}
                    onPointerMove={onResizePointerMove}
                    onPointerUp={onResizePointerUp}
                    onPointerCancel={onResizePointerCancel}
                />
            ) : null}
            <div
                className={styles.backpackHeader}
                onClick={onToggle}
            >
                {onToggle ? (
                    <FormattedMessage
                        defaultMessage="Backpack"
                        description="Button to open the backpack"
                        id="gui.backpack.header"
                    />
                ) : (
                    <ComingSoonTooltip
                        place="top"
                        tooltipId="backpack-tooltip"
                    >
                        <FormattedMessage
                            defaultMessage="Backpack"
                            description="Button to open the backpack"
                            id="gui.backpack.header"
                        />
                    </ComingSoonTooltip>
                )}
            </div>
            {expanded ? (
                <div
                    className={classNames(styles.backpackList, {
                        [styles.dragOver]: dragOver || blockDragOver
                    })}
                    ref={containerRef}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    style={height ? {height: `${height}px`} : null}
                >
                    <div className={styles.searchRow}>
                        <input
                            aria-label={intl.formatMessage({
                                id: 'gui.backpack.searchPlaceholder',
                                defaultMessage: 'Search backpack...'
                            })}
                            autoComplete="off"
                            className={styles.searchInput}
                            placeholder={intl.formatMessage({
                                id: 'gui.backpack.searchPlaceholder',
                                defaultMessage: 'Search backpack...'
                            })}
                            value={searchQuery}
                            onChange={onSearchChange}
                        />
                        {/* Create-folder button squeezed next to the search box. */}
                        <button
                            className={styles.createFolderButton}
                            title={intl.formatMessage(labelMap.createFolder)}
                            onClick={() => setShowCreate(true)}
                        >
                            {'+'}
                        </button>
                    </div>

                    {showCreate ? (
                        <div className={styles.createFolderRow}>
                            <input
                                autoFocus
                                className={styles.inlineInput}
                                placeholder={intl.formatMessage({
                                    id: 'gui.backpack.folderNamePlaceholder',
                                    defaultMessage: 'Folder name'
                                })}
                                value={createName}
                                onChange={e => setCreateName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') submitCreate();
                                    if (e.key === 'Escape') {
                                        setShowCreate(false);
                                        setCreateName('');
                                    }
                                }}
                            />
                            <button
                                className={styles.inlineButton}
                                onClick={submitCreate}
                            >
                                <FormattedMessage
                                    defaultMessage="OK"
                                    id="gui.backpack.ok"
                                />
                            </button>
                            <button
                                className={styles.inlineButton}
                                onClick={() => {
                                    setShowCreate(false);
                                    setCreateName('');
                                }}
                            >
                                <FormattedMessage
                                    defaultMessage="Cancel"
                                    id="gui.backpack.cancel"
                                />
                            </button>
                        </div>
                    ) : null}

                    <div className={styles.categoryTabs}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                className={classNames(styles.categoryTab, {
                                    [styles.categoryTabActive]: selectedCategory === cat.key
                                })}
                                onClick={() => onCategoryChange(cat.key)}
                            >
                                <FormattedMessage {...cat.label} />
                            </button>
                        ))}
                    </div>

                    {folderPath.length > 0 && (
                        <div className={styles.breadcrumb}>
                            <button
                                className={styles.breadcrumbItem}
                                onClick={onBackToRoot}
                            >
                                Backpack
                            </button>
                            {folderPath.map((folder, index) => (
                                <React.Fragment key={folder.id}>
                                    <span className={styles.breadcrumbSeparator}>/</span>
                                    <button
                                        className={styles.breadcrumbItem}
                                        onClick={() => onNavigateBack(index)}
                                    >
                                        {folder.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    <div
                        className={styles.itemsScroller}
                        onContextMenu={handleContextMenu}
                    >
                        {error !== false ? (
                            <div className={styles.statusMessage}>
                                <FormattedMessage
                                    defaultMessage="Error loading backpack"
                                    description="Error backpack message"
                                    id="gui.backpack.errorBackpack"
                                />
                                <div className={styles.errorMessage}>{error}</div>
                            </div>
                        ) : (
                            loading ? (
                                <div className={styles.statusMessage}>
                                    <FormattedMessage
                                        defaultMessage="Loading..."
                                        description="Loading backpack message"
                                        id="gui.backpack.loadingBackpack"
                                    />
                                </div>
                            ) : (
                                <>
                                    {contents.length > 0 ? (
                                        <div className={styles.backpackListInner}>
                                            {contents.map(item => {
                                                const isFolder = item.type === 'folder';
                                                const renaming = renameId === item.id;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        data-backpack-item
                                                        className={classNames(styles.itemWrapper, {
                                                            [styles.folderItem]: isFolder,
                                                            [styles.folderDragOver]: isFolder && folderDragOverId === item.id
                                                        })}
                                                        onDragOver={isFolder ? e => {
                                                            e.preventDefault();
                                                            onFolderDragOver(item.id);
                                                        } : undefined}
                                                        onDragLeave={isFolder ? onFolderDragLeave : undefined}
                                                        onDrop={isFolder ? e => onFolderDrop(item.id, e) : undefined}
                                                    >
                                                        <SpriteSelectorItem
                                                            className={classNames(styles.backpackItem, {
                                                                [styles.folderSpriteItem]: isFolder
                                                            })}
                                                            costumeURL={isFolder ? null : item.thumbnailUrl}
                                                            details={item.name}
                                                            dragPayload={item}
                                                            dragType={dragTypeMap[item.type]}
                                                            id={item.id}
                                                            key={item.id}
                                                            name={nameFor(intl, item)}
                                                            selected={false}
                                                            onClick={isFolder ? () => onFolderClick(item.id, item.name) : noop}
                                                            onDeleteButtonClick={isFolder ? onDeleteFolder : onDelete}
                                                            onRenameButtonClick={item.type === 'sprite' ? null : startRename}
                                                            onAddToFolder={isFolder ? null : e => openFolderPicker(item.id, e)}
                                                        />
                                                        {isFolder && (
                                                            <div className={styles.folderIcon}>
                                                                <FolderIcon />
                                                            </div>
                                                        )}
                                                        {renaming ? (
                                                            <div className={styles.inlineInputRow}>
                                                                <input
                                                                    autoFocus
                                                                    className={styles.inlineInput}
                                                                    value={renameName}
                                                                    onChange={e => setRenameName(e.target.value)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') submitRename();
                                                                        if (e.key === 'Escape') cancelRename();
                                                                    }}
                                                                />
                                                                <button
                                                                    className={styles.inlineButton}
                                                                    onClick={submitRename}
                                                                >
                                                                    <FormattedMessage
                                                                        defaultMessage="OK"
                                                                        id="gui.backpack.ok"
                                                                    />
                                                                </button>
                                                                <button
                                                                    className={styles.inlineButton}
                                                                    onClick={cancelRename}
                                                                >
                                                                    <FormattedMessage
                                                                        defaultMessage="Cancel"
                                                                        id="gui.backpack.cancel"
                                                                    />
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                            {showMore && (
                                                <button
                                                    className={styles.more}
                                                    onClick={onMore}
                                                >
                                                    <FormattedMessage
                                                        defaultMessage="More"
                                                        description="Load more from backpack"
                                                        id="gui.backpack.more"
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={styles.statusMessage}>
                                            {searchQuery ? (
                                                <FormattedMessage
                                                    defaultMessage="No matching backpack items"
                                                    id="gui.backpack.noSearchResults"
                                                />
                                            ) : (
                                                <FormattedMessage
                                                    defaultMessage="Backpack is empty"
                                                    description="Empty backpack message"
                                                    id="gui.backpack.emptyBackpack"
                                                />
                                            )}
                                        </div>
                                    )}
                                </>
                            )
                        )}
                    </div>

                    {contextMenu && (
                        <div
                            className={styles.contextMenu}
                            style={{left: contextMenu.x, top: contextMenu.y}}
                            onMouseDown={e => e.stopPropagation()}
                        >
                            <button
                                className={styles.contextMenuItem}
                                onClick={() => {
                                    setContextMenu(null);
                                    setShowCreate(true);
                                }}
                            >
                                <FormattedMessage {...labelMap.createFolder} />
                            </button>
                        </div>
                    )}

                    {/* Folder picker, opened from the editor's built-in
                        right-click "Add to Folder" entry on a backpack item. */}
                    {folderPicker && (
                        <div
                            ref={folderPickerRef}
                            className={styles.folderPicker}
                            style={{left: folderPicker.x, top: folderPicker.y}}
                            onMouseDown={e => e.stopPropagation()}
                        >
                            <div className={styles.folderPickerTitle}>
                                <FormattedMessage
                                    defaultMessage="Add to folder"
                                    description="Title of the add-to-folder picker"
                                    id="gui.backpack.addToFolder"
                                />
                            </div>
                            {folders
                                .filter(f => f.id !== folderPicker.itemId)
                                .map(f => (
                                    <button
                                        key={f.id}
                                        className={styles.folderPickerItem}
                                        onClick={() => {
                                            onAddToFolder(folderPicker.itemId, f.id);
                                            setFolderPicker(null);
                                        }}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            {folders.filter(f => f.id !== folderPicker.itemId).length === 0 && (
                                <div className={styles.folderPickerEmpty}>
                                    <FormattedMessage
                                        defaultMessage="No folders yet"
                                        id="gui.backpack.noFolders"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
};

Backpack.propTypes = {
    blockDragOver: PropTypes.bool,
    containerRef: PropTypes.func,
    contents: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        thumbnailUrl: PropTypes.string,
        type: PropTypes.string,
        name: PropTypes.string
    })),
    dragOver: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    expanded: PropTypes.bool,
    folders: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string
    })),
    height: PropTypes.number,
    intl: intlShape,
    loading: PropTypes.bool,
    searchQuery: PropTypes.string,
    onSearchChange: PropTypes.func,
    onDelete: PropTypes.func,
    onRename: PropTypes.func,
    onResizePointerDown: PropTypes.func,
    onResizePointerMove: PropTypes.func,
    onResizePointerUp: PropTypes.func,
    onResizePointerCancel: PropTypes.func,
    onMore: PropTypes.func,
    onMouseEnter: PropTypes.func,
    onMouseLeave: PropTypes.func,
    onToggle: PropTypes.func,
    showMore: PropTypes.bool,
    currentFolderId: PropTypes.string,
    folderPath: PropTypes.array,
    selectedCategory: PropTypes.string,
    onFolderClick: PropTypes.func,
    onBackToRoot: PropTypes.func,
    onNavigateBack: PropTypes.func,
    onCreateFolder: PropTypes.func,
    onDeleteFolder: PropTypes.func,
    onCategoryChange: PropTypes.func,
    onAddToFolder: PropTypes.func,
    folderDragOverId: PropTypes.string,
    onFolderDragOver: PropTypes.func,
    onFolderDragLeave: PropTypes.func,
    onFolderDrop: PropTypes.func
};

Backpack.defaultProps = {
    blockDragOver: false,
    contents: [],
    folders: [],
    dragOver: false,
    expanded: false,
    height: null,
    loading: false,
    searchQuery: '',
    onSearchChange: null,
    showMore: false,
    onMore: null,
    onResizePointerDown: null,
    onResizePointerMove: null,
    onResizePointerUp: null,
    onResizePointerCancel: null,
    onToggle: null,
    folderPath: [],
    selectedCategory: 'all'
};

export default injectIntl(Backpack);

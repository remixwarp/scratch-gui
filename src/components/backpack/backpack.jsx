import React, {useState} from 'react';
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
    workspace: {
        id: 'gui.backpack.workspaceLabel',
        defaultMessage: 'Workspace',
        description: 'Label for the workspace assets section'
    },
    createFolder: {
        id: 'gui.backpack.createFolder',
        defaultMessage: 'New folder',
        description: 'Button to create a folder'
    },
    showWorkspace: {
        id: 'gui.backpack.showWorkspace',
        defaultMessage: 'Show workspace',
        description: 'Button to show workspace assets'
    },
    hideWorkspace: {
        id: 'gui.backpack.hideWorkspace',
        defaultMessage: 'Hide workspace',
        description: 'Button to hide workspace assets'
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
        onToggleWorkspaceAssets,
        showWorkspaceAssets,
        workspaceAssets,
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
    const [addMenuId, setAddMenuId] = useState(null);

    const submitCreate = () => {
        const name = createName.trim();
        setShowCreate(false);
        setCreateName('');
        if (name) onCreateFolder(name);
    };
    const startRename = item => {
        setRenameId(item.id);
        setRenameName(item.name || '');
        setAddMenuId(null);
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
                    <div className={styles.searchContainer}>
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
                    </div>

                    <div className={styles.toolbar}>
                        {showCreate ? (
                            <div className={styles.inlineInputRow}>
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
                        ) : (
                            <button
                                className={styles.toolbarButton}
                                onClick={() => setShowCreate(true)}
                            >
                                <FormattedMessage {...labelMap.createFolder} />
                            </button>
                        )}
                        <button
                            className={styles.toolbarButton}
                            onClick={onToggleWorkspaceAssets}
                        >
                            {showWorkspaceAssets ? (
                                <FormattedMessage {...labelMap.hideWorkspace} />
                            ) : (
                                <FormattedMessage {...labelMap.showWorkspace} />
                            )}
                        </button>
                    </div>

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

                    <div className={styles.itemsScroller}>
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
                                    {showWorkspaceAssets && workspaceAssets && (
                                        <div className={styles.workspaceSection}>
                                            <h3 className={styles.workspaceSectionTitle}>
                                                <FormattedMessage {...labelMap.workspace} />
                                            </h3>
                                            <div className={styles.workspaceCategories}>
                                                {['costume', 'sound', 'sprite'].map(kind => {
                                                    const list = workspaceAssets[kind] || [];
                                                    if (list.length === 0) return null;
                                                    return (
                                                        <div
                                                            className={styles.workspaceCategory}
                                                            key={kind}
                                                        >
                                                            <h4>
                                                                <FormattedMessage {...labelMap[kind]} />
                                                            </h4>
                                                            <div className={styles.workspaceItems}>
                                                                {list.map(item => (
                                                                    <SpriteSelectorItem
                                                                        className={styles.backpackItem}
                                                                        costumeURL={item.thumbnailUrl}
                                                                        details={item.name}
                                                                        dragPayload={item}
                                                                        dragType={dragTypeMap[item.type]}
                                                                        id={item.id}
                                                                        key={item.id}
                                                                        name={nameFor(intl, item)}
                                                                        selected={false}
                                                                        onClick={noop}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {contents.length > 0 ? (
                                        <div className={styles.backpackListInner}>
                                            {contents.map(item => {
                                                const isFolder = item.type === 'folder';
                                                const renaming = renameId === item.id;
                                                return (
                                                    <div
                                                        key={item.id}
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
                                                            className={styles.backpackItem}
                                                            costumeURL={item.thumbnailUrl}
                                                            details={item.name}
                                                            dragPayload={item}
                                                            dragType={dragTypeMap[item.type]}
                                                            id={item.id}
                                                            name={nameFor(intl, item)}
                                                            selected={false}
                                                            onClick={isFolder ? () => onFolderClick(item.id, item.name) : noop}
                                                            onDeleteButtonClick={isFolder ? onDeleteFolder : onDelete}
                                                            onRenameButtonClick={item.type === 'sprite' ? null : startRename}
                                                        />
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
                                                        ) : (isFolder ? null : (
                                                            <button
                                                                className={styles.addToFolderButton}
                                                                title={intl.formatMessage({
                                                                    id: 'gui.backpack.addToFolder',
                                                                    defaultMessage: 'Add to folder'
                                                                })}
                                                                onClick={() => setAddMenuId(addMenuId === item.id ? null : item.id)}
                                                            >
                                                                {'+'}
                                                            </button>
                                                        ))}
                                                        {addMenuId === item.id && (
                                                            <div className={styles.addMenu}>
                                                                {folders
                                                                    .filter(f => f.id !== item.id)
                                                                    .map(f => (
                                                                        <button
                                                                            key={f.id}
                                                                            className={styles.addMenuItem}
                                                                            onClick={() => {
                                                                                onAddToFolder(item.id, f.id);
                                                                                setAddMenuId(null);
                                                                            }}
                                                                        >
                                                                            {f.name}
                                                                        </button>
                                                                    ))}
                                                                {folders.filter(f => f.id !== item.id).length === 0 && (
                                                                    <div className={styles.addMenuEmpty}>
                                                                        <FormattedMessage
                                                                            defaultMessage="No folders yet"
                                                                            id="gui.backpack.noFolders"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
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
    onToggleWorkspaceAssets: PropTypes.func,
    onAddToFolder: PropTypes.func,
    showWorkspaceAssets: PropTypes.bool,
    workspaceAssets: PropTypes.shape({
        costumes: PropTypes.array,
        sounds: PropTypes.array,
        sprites: PropTypes.array,
        scripts: PropTypes.array
    }),
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
    showWorkspaceAssets: false,
    workspaceAssets: null,
    folderPath: [],
    selectedCategory: 'all'
};

export default injectIntl(Backpack);

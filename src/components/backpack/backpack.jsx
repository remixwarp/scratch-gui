import React from 'react';
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
    folder: DragConstants.BACKPACK_COSTUME
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
        description: 'Label for all category'
    },
    workspace: {
        id: 'gui.backpack.workspaceLabel',
        defaultMessage: 'Workspace',
        description: 'Label for workspace assets'
    },
    createFolder: {
        id: 'gui.backpack.createFolder',
        defaultMessage: 'Create Folder',
        description: 'Button to create folder'
    },
    showWorkspace: {
        id: 'gui.backpack.showWorkspace',
        defaultMessage: 'Show Workspace',
        description: 'Button to show workspace assets'
    },
    hideWorkspace: {
        id: 'gui.backpack.hideWorkspace',
        defaultMessage: 'Hide Workspace',
        description: 'Button to hide workspace assets'
    }
});

const Backpack = ({
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
    onMouseEnter,
    onMouseLeave,
    onMore,
    searchQuery,
    onSearchChange,
    currentFolderId,
    folderPath,
    selectedCategory,
    onFolderClick,
    onBackToRoot,
    onNavigateBack,
    onCreateFolder,
    onDeleteFolder,
    onCategoryChange,
    onToggleWorkspaceAssets,
    showWorkspaceAssets,
    workspaceAssets
}) => (
    <div className={styles.backpackContainer}>
        {expanded ? (
            <div
                className={styles.resizeHandle}
                onPointerDown={onResizePointerDown}
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
                        className={styles.searchInput}
                        placeholder={intl.formatMessage({
                            id: 'gui.backpack.searchPlaceholder',
                            defaultMessage: 'Search backpack...'
                        })}
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </div>
                
                <div className={styles.toolbar}>
                    <button
                        className={styles.toolbarButton}
                        onClick={onCreateFolder}
                    >
                        <FormattedMessage
                            defaultMessage="Create Folder"
                            description="Button to create folder"
                            id="gui.backpack.createFolder"
                        />
                    </button>
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
                    <button
                        className={classNames(styles.categoryTab, {
                            [styles.categoryTabActive]: selectedCategory === 'all'
                        })}
                        onClick={() => onCategoryChange('all')}
                    >
                        <FormattedMessage {...labelMap.all} />
                    </button>
                    <button
                        className={classNames(styles.categoryTab, {
                            [styles.categoryTabActive]: selectedCategory === 'costume'
                        })}
                        onClick={() => onCategoryChange('costume')}
                    >
                        <FormattedMessage {...labelMap.costume} />
                    </button>
                    <button
                        className={classNames(styles.categoryTab, {
                            [styles.categoryTabActive]: selectedCategory === 'sound'
                        })}
                        onClick={() => onCategoryChange('sound')}
                    >
                        <FormattedMessage {...labelMap.sound} />
                    </button>
                    <button
                        className={classNames(styles.categoryTab, {
                            [styles.categoryTabActive]: selectedCategory === 'sprite'
                        })}
                        onClick={() => onCategoryChange('sprite')}
                    >
                        <FormattedMessage {...labelMap.sprite} />
                    </button>
                    <button
                        className={classNames(styles.categoryTab, {
                            [styles.categoryTabActive]: selectedCategory === 'script'
                        })}
                        onClick={() => onCategoryChange('script')}
                    >
                        <FormattedMessage {...labelMap.script} />
                    </button>
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
                    {/* eslint-disable-next-line no-negated-condition */}
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
                                            {workspaceAssets.costumes.length > 0 && (
                                                <div className={styles.workspaceCategory}>
                                                    <h4><FormattedMessage {...labelMap.costume} /></h4>
                                                    <div className={styles.workspaceItems}>
                                                        {workspaceAssets.costumes.map(item => (
                                                            <SpriteSelectorItem
                                                                className={styles.backpackItem}
                                                                costumeURL={item.thumbnailUrl}
                                                                details={item.name}
                                                                dragPayload={item}
                                                                dragType={dragTypeMap[item.type]}
                                                                id={item.id}
                                                                key={item.id}
                                                                name={intl.formatMessage(labelMap[item.type])}
                                                                selected={false}
                                                                onClick={noop}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {workspaceAssets.sounds.length > 0 && (
                                                <div className={styles.workspaceCategory}>
                                                    <h4><FormattedMessage {...labelMap.sound} /></h4>
                                                    <div className={styles.workspaceItems}>
                                                        {workspaceAssets.sounds.map(item => (
                                                            <SpriteSelectorItem
                                                                className={styles.backpackItem}
                                                                costumeURL={item.thumbnailUrl}
                                                                details={item.name}
                                                                dragPayload={item}
                                                                dragType={dragTypeMap[item.type]}
                                                                id={item.id}
                                                                key={item.id}
                                                                name={intl.formatMessage(labelMap[item.type])}
                                                                selected={false}
                                                                onClick={noop}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {workspaceAssets.sprites.length > 0 && (
                                                <div className={styles.workspaceCategory}>
                                                    <h4><FormattedMessage {...labelMap.sprite} /></h4>
                                                    <div className={styles.workspaceItems}>
                                                        {workspaceAssets.sprites.map(item => (
                                                            <SpriteSelectorItem
                                                                className={styles.backpackItem}
                                                                costumeURL={item.thumbnailUrl}
                                                                details={item.name}
                                                                dragPayload={item}
                                                                dragType={dragTypeMap[item.type]}
                                                                id={item.id}
                                                                key={item.id}
                                                                name={intl.formatMessage(labelMap[item.type])}
                                                                selected={false}
                                                                onClick={noop}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {contents.length > 0 ? (
                                    <div className={styles.backpackListInner}>
                                        {contents.map(item => (
                                                <SpriteSelectorItem
                                                className={styles.backpackItem}
                                                costumeURL={item.thumbnailUrl}
                                                details={item.name}
                                                dragPayload={item}
                                                dragType={dragTypeMap[item.type]}
                                                id={item.id}
                                                key={item.id}
                                                name={intl.formatMessage(labelMap[item.type])}
                                                selected={false}
                                                onClick={item.type === 'folder' ? () => onFolderClick(item.id, item.name) : noop}
                                                onDeleteButtonClick={item.type === 'folder' ? onDeleteFolder : onDelete}
                                                onAddToFolder={() => onAddToFolder(item.id)}
                                                onRenameButtonClick={item.type === 'sprite' ? null : onRename}
                                            />
                                        ))}
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
                                        <FormattedMessage
                                            defaultMessage="Backpack is empty"
                                            description="Empty backpack message"
                                            id="gui.backpack.emptyBackpack"
                                        />
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
    height: PropTypes.number,
    intl: intlShape,
    loading: PropTypes.bool,
    searchQuery: PropTypes.string,
    onSearchChange: PropTypes.func,
    onDelete: PropTypes.func,
    onRename: PropTypes.func,
    onResizePointerDown: PropTypes.func,
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
    })
};

Backpack.defaultProps = {
    blockDragOver: false,
    contents: [],
    dragOver: false,
    expanded: false,
    height: null,
    loading: false,
    searchQuery: '',
    onSearchChange: null,
    showMore: false,
    onMore: null,
    onResizePointerDown: null,
    onToggle: null
};

export default injectIntl(Backpack);

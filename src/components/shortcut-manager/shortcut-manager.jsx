import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';
import {Search, X, Keyboard} from 'lucide-react';

import {getDefaultShortcuts} from '../../lib/shortcuts/registry.js';
import {closeShortcutManagerModal} from '../../reducers/modals';

import WindowedModal from '../../containers/windowed-modal.jsx';
import Input from '../forms/input.jsx';
import ShortcutCategory from './shortcut-category.jsx';

import styles from './shortcut-manager.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Keyboard Shortcuts',
        description: 'Title of keyboard shortcuts manager modal',
        id: 'shortcut-manager.title'
    },
    search: {
        defaultMessage: 'Search shortcuts...',
        description: 'Placeholder text for search input',
        id: 'shortcut-manager.search'
    },
    noResults: {
        defaultMessage: 'No shortcuts found',
        description: 'Message when no shortcuts match search',
        id: 'shortcut-manager.noResults'
    },
    categories: {
        defaultMessage: 'Categories',
        description: 'Label for categories sidebar',
        id: 'shortcut-manager.categories'
    },
    allShortcuts: {
        defaultMessage: 'All Shortcuts',
        description: 'Label for showing all shortcuts',
        id: 'shortcut-manager.allShortcuts'
    },
    categoryFile: {
        defaultMessage: 'File',
        description: 'Shortcut category name',
        id: 'shortcut.category.file'
    },
    categoryEdit: {
        defaultMessage: 'Edit',
        description: 'Shortcut category name',
        id: 'shortcut.category.edit'
    },
    categoryView: {
        defaultMessage: 'View',
        description: 'Shortcut category name',
        id: 'shortcut.category.view'
    },
    categoryProjectControls: {
        defaultMessage: 'Project Controls',
        description: 'Shortcut category name',
        id: 'shortcut.category.projectControls'
    },
    categoryEditorNavigation: {
        defaultMessage: 'Editor Navigation',
        description: 'Shortcut category name',
        id: 'shortcut.category.editorNavigation'
    },
    categoryLibraryAccess: {
        defaultMessage: 'Library Access',
        description: 'Shortcut category name',
        id: 'shortcut.category.libraryAccess'
    },
    categorySpriteManagement: {
        defaultMessage: 'Sprite Management',
        description: 'Shortcut category name',
        id: 'shortcut.category.spriteManagement'
    },
    categoryWindowManagement: {
        defaultMessage: 'Windows',
        description: 'Shortcut category name',
        id: 'shortcut.category.windowManagement'
    },
    save: {
        defaultMessage: 'Save',
        description: 'Shortcut label',
        id: 'shortcut.save'
    },
    saveAsCopy: {
        defaultMessage: 'Save As Copy',
        description: 'Shortcut label',
        id: 'shortcut.saveAsCopy'
    },
    loadFromComputer: {
        defaultMessage: 'Load from Computer',
        description: 'Shortcut label',
        id: 'shortcut.loadFromComputer'
    },
    packageProject: {
        defaultMessage: 'Package Project',
        description: 'Shortcut label',
        id: 'shortcut.packageProject'
    },
    restorePoints: {
        defaultMessage: 'Restore Points',
        description: 'Shortcut label',
        id: 'shortcut.restorePoints'
    },
    settings: {
        defaultMessage: 'Settings',
        description: 'Shortcut label',
        id: 'shortcut.settings'
    },
    fullScreen: {
        defaultMessage: 'Toggle Fullscreen',
        description: 'Shortcut label',
        id: 'shortcut.fullScreen'
    },
    blocksTab: {
        defaultMessage: 'Blocks Tab',
        description: 'Shortcut label',
        id: 'shortcut.blocksTab'
    },
    costumesTab: {
        defaultMessage: 'Costumes Tab',
        description: 'Shortcut label',
        id: 'shortcut.costumesTab'
    },
    soundsTab: {
        defaultMessage: 'Sounds Tab',
        description: 'Shortcut label',
        id: 'shortcut.soundsTab'
    },
    greenFlag: {
        defaultMessage: 'Start Project (Green Flag)',
        description: 'Shortcut label',
        id: 'shortcut.greenFlag'
    },
    stopAll: {
        defaultMessage: 'Stop All',
        description: 'Shortcut label',
        id: 'shortcut.stopAll'
    },
    spriteLibrary: {
        defaultMessage: 'Open Sprite Library',
        description: 'Shortcut label',
        id: 'shortcut.spriteLibrary'
    },
    costumeLibrary: {
        defaultMessage: 'Open Costume Library',
        description: 'Shortcut label',
        id: 'shortcut.costumeLibrary'
    },
    soundLibrary: {
        defaultMessage: 'Open Sound Library',
        description: 'Shortcut label',
        id: 'shortcut.soundLibrary'
    },
    extensionLibrary: {
        defaultMessage: 'Open Extension Library',
        description: 'Shortcut label',
        id: 'shortcut.extensionLibrary'
    },
    extensionManager: {
        defaultMessage: 'Extension Manager',
        description: 'Shortcut label',
        id: 'shortcut.extensionManager'
    },
    duplicateSprite: {
        defaultMessage: 'Duplicate Sprite',
        description: 'Shortcut label',
        id: 'shortcut.duplicateSprite'
    },
    toggleBackpack: {
        defaultMessage: 'Toggle Backpack',
        description: 'Shortcut label',
        id: 'shortcut.toggleBackpack'
    },
    deleteSprite: {
        defaultMessage: 'Delete Sprite',
        description: 'Shortcut label',
        id: 'shortcut.deleteSprite'
    },
    stageFullScreen: {
        defaultMessage: 'Toggle Stage Fullscreen',
        description: 'Shortcut label',
        id: 'shortcut.stageFullScreen'
    },
    undo: {
        defaultMessage: 'Undo',
        description: 'Shortcut label',
        id: 'shortcut.undo'
    },
    redo: {
        defaultMessage: 'Redo',
        description: 'Shortcut label',
        id: 'shortcut.redo'
    },
    copy: {
        defaultMessage: 'Copy',
        description: 'Shortcut label',
        id: 'shortcut.copy'
    },
    paste: {
        defaultMessage: 'Paste',
        description: 'Shortcut label',
        id: 'shortcut.paste'
    },
    cut: {
        defaultMessage: 'Cut',
        description: 'Shortcut label',
        id: 'shortcut.cut'
    },
    closeWindow: {
        defaultMessage: 'Close Window',
        description: 'Shortcut label',
        id: 'shortcut.closeWindow'
    },
    aiChat: {
        defaultMessage: 'Open AI Chat',
        description: 'Shortcut label',
        id: 'shortcut.aiChat'
    },
    aiAgent: {
        defaultMessage: 'Open AI Agent',
        description: 'Shortcut label',
        id: 'shortcut.aiAgent'
    }
});

class ShortcutManager extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleSearchChange',
            'handleClose',
            'handleCategoryClick',
            'handleAllCategoriesClick',
            'handleSelectCategory',
            'renderCategory',
            'renderCategoryGroup'
        ]);

        this.state = {
            searchQuery: '',
            selectedCategory: null
        };
    }

    handleSearchChange (e) {
        this.setState({searchQuery: e.target.value});
    }

    handleClose () {
        this.props.onRequestClose();
    }

    handleCategoryClick (category) {
        this.setState({
            selectedCategory: category,
            searchQuery: ''
        });
    }

    handleAllCategoriesClick () {
        this.handleCategoryClick(null);
    }

    handleSelectCategory (categoryId) {
        this.handleCategoryClick(categoryId);
    }

    getAllShortcuts () {
        const defaultShortcuts = getDefaultShortcuts();
        const customShortcuts = this.props.customShortcuts || {};
        const {intl} = this.props;

        const shortcutMessages = {
            'save': messages.save,
            'saveAsCopy': messages.saveAsCopy,
            'loadFromComputer': messages.loadFromComputer,
            'packageProject': messages.packageProject,
            'restorePoints': messages.restorePoints,
            'settings': messages.settings,
            'fullScreen': messages.fullScreen,
            'blocksTab': messages.blocksTab,
            'costumesTab': messages.costumesTab,
            'soundsTab': messages.soundsTab,
            'greenFlag': messages.greenFlag,
            'stopAll': messages.stopAll,
            'spriteLibrary': messages.spriteLibrary,
            'costumeLibrary': messages.costumeLibrary,
            'soundLibrary': messages.soundLibrary,
            'extensionLibrary': messages.extensionLibrary,
            'extensionManager': messages.extensionManager,
            'duplicateSprite': messages.duplicateSprite,
            'toggleBackpack': messages.toggleBackpack,
            'deleteSprite': messages.deleteSprite,
            'stageFullScreen': messages.stageFullScreen,
            'undo': messages.undo,
            'redo': messages.redo,
            'copy': messages.copy,
            'paste': messages.paste,
            'cut': messages.cut,
            'closeWindow': messages.closeWindow,
            'aiChat': messages.aiChat,
            'aiAgent': messages.aiAgent
        };

        return defaultShortcuts.map(shortcut => {
            const label = intl.formatMessage(shortcutMessages[shortcut.id]);
            if (customShortcuts[shortcut.id]) {
                return {
                    ...shortcut,
                    key: customShortcuts[shortcut.id],
                    label
                };
            }
            return {
                ...shortcut,
                label
            };
        });
    }

    getFilteredShortcuts () {
        const allShortcuts = this.getAllShortcuts();
        const {searchQuery, selectedCategory} = this.state;

        return allShortcuts.filter(shortcut => {
            if (selectedCategory && shortcut.category !== selectedCategory) {
                return false;
            }

            if (!searchQuery) return true;

            const query = searchQuery.toLowerCase();
            return shortcut.label.toLowerCase().includes(query) ||
                   shortcut.key.toLowerCase().includes(query);
        });
    }

    getCategoriesWithCounts () {
        const allShortcuts = this.getAllShortcuts();
        const categories = {};
        const {intl} = this.props;

        const categoryMessages = {
            'file': messages.categoryFile,
            'edit': messages.categoryEdit,
            'view': messages.categoryView,
            'projectControls': messages.categoryProjectControls,
            'editorNavigation': messages.categoryEditorNavigation,
            'libraryAccess': messages.categoryLibraryAccess,
            'spriteManagement': messages.categorySpriteManagement,
            'windowManagement': messages.categoryWindowManagement
        };

        allShortcuts.forEach(shortcut => {
            if (!categories[shortcut.category]) {
                categories[shortcut.category] = {
                    label: intl.formatMessage(categoryMessages[shortcut.category]),
                    count: 0
                };
            }
            categories[shortcut.category].count++;
        });

        return Object.entries(categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([id, {label, count}]) => ({id, label, count}));
    }

    renderCategory (category) {
        const {selectedCategory} = this.state;
        const onClick = () => this.handleSelectCategory(category.id);
        return (
            <div
                key={category.id}
                className={classNames(styles.categoryItem, {
                    [styles.selected]: selectedCategory === category.id
                })}
                onClick={onClick}
            >
                <span className={styles.categoryLabel}>{category.label}</span>
                <span className={styles.categoryCount}>{category.count}</span>
            </div>
        );
    }

    renderCategoryGroup ([categoryId, categoryShortcuts]) {
        const {intl} = this.props;
        
        const categoryMessages = {
            'file': messages.categoryFile,
            'edit': messages.categoryEdit,
            'view': messages.categoryView,
            'projectControls': messages.categoryProjectControls,
            'editorNavigation': messages.categoryEditorNavigation,
            'libraryAccess': messages.categoryLibraryAccess,
            'spriteManagement': messages.categorySpriteManagement,
            'windowManagement': messages.categoryWindowManagement
        };

        return (
            <ShortcutCategory
                key={categoryId}
                category={intl.formatMessage(categoryMessages[categoryId])}
                shortcuts={categoryShortcuts}
            />
        );
    }

    render () {
        const {searchQuery, selectedCategory} = this.state;
        const categories = this.getCategoriesWithCounts();
        const shortcuts = this.getFilteredShortcuts();

        const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
            if (!groups[shortcut.category]) {
                groups[shortcut.category] = [];
            }
            groups[shortcut.category].push(shortcut);
            return groups;
        }, {});

        return (
            <WindowedModal
                id="shortcut-manager-modal"
                contentLabel={this.props.intl.formatMessage(messages.title)}
                visible={this.props.visible}
                onRequestClose={this.handleClose}
                title={this.props.intl.formatMessage(messages.title)}
                width={800}
                height={600}
            >
                <div className={styles.container}>
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <Keyboard size={16} />
                            <span className={styles.sidebarTitle}>
                                <FormattedMessage {...messages.categories} />
                            </span>
                        </div>

                        <div className={styles.searchContainer}>
                            <Search
                                size={14}
                                className={styles.searchIcon}
                            />
                            <Input
                                type="text"
                                placeholder={this.props.intl.formatMessage(messages.search)}
                                value={searchQuery}
                                onChange={this.handleSearchChange}
                                className={styles.searchInput}
                            />
                        </div>

                        <div className={styles.categoryList}>
                            <div
                                className={classNames(styles.categoryItem, {
                                    [styles.selected]: !selectedCategory && !searchQuery
                                })}
                                onClick={this.handleAllCategoriesClick}
                            >
                                <span className={styles.categoryLabel}>
                                    <FormattedMessage {...messages.allShortcuts} />
                                </span>
                                <span className={styles.categoryCount}>{this.getAllShortcuts().length}</span>
                            </div>

                            {categories.map(category => (
                                <div
                                    key={category.id}
                                    className={classNames(styles.categoryItem, {
                                        [styles.selected]: selectedCategory === category.id
                                    })}
                                >
                                    <span
                                        className={styles.categoryLabel}
                                        onClick={() => this.handleSelectCategory(category.id)}
                                    >
                                        {category.label}
                                    </span>
                                    <span className={styles.categoryCount}>{category.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.content}>
                        {searchQuery && shortcuts.length === 0 ? (
                            <div className={styles.noResults}>
                                <X size={24} />
                                <FormattedMessage {...messages.noResults} />
                            </div>
                        ) : (
                            Object.entries(groupedShortcuts).map(this.renderCategoryGroup)
                        )}
                    </div>
                </div>
            </WindowedModal>
        );
    }
}

ShortcutManager.propTypes = {
    visible: PropTypes.bool.isRequired,
    customShortcuts: PropTypes.object,
    onRequestClose: PropTypes.func.isRequired,
    intl: PropTypes.shape({
        formatMessage: PropTypes.func
    }).isRequired
};

const mapStateToProps = state => ({
    customShortcuts: state.scratchGui.shortcuts.customShortcuts
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeShortcutManagerModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ShortcutManager));

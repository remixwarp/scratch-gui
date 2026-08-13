import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {Search} from 'lucide-react';

import Modal from '../../containers/windowed-modal.jsx';
import {HELP_CATEGORIES, HELP_ENTRIES} from '../../lib/help/index.js';
import HELP_TRANSLATIONS from '../../lib/help/translations-zh-cn.js';

import styles from './help-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Help',
        description: 'Title of the Help window',
        id: 'mw.help.title'
    },
    searchPlaceholder: {
        defaultMessage: 'Search help',
        description: 'Placeholder of the help search input',
        id: 'mw.help.searchPlaceholder'
    },
    noResults: {
        defaultMessage: 'No help topics found.',
        description: 'Message shown when the help search has no results',
        id: 'mw.help.noResults'
    },
    steps: {
        defaultMessage: 'Steps',
        description: 'Heading of the help entry how-to steps',
        id: 'mw.help.steps'
    }
});

const CATEGORY_TRANSLATIONS = {
    'Editor': '编辑器',
    'Blocks': '积木',
    'Extensions': '扩展',
    'Advanced': '高级'
};

class HelpModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleSearch', 'handleSelect']);
        this.state = {
            selectedId: props.selectedId,
            query: ''
        };
    }
    handleSearch (event) {
        this.setState({query: event.target.value, selectedId: null});
    }
    handleSelect (event) {
        this.setState({selectedId: event.currentTarget.dataset.id});
    }
    isChinese () {
        const locale = this.props.intl && this.props.intl.locale;
        return typeof locale === 'string' && locale.toLowerCase().startsWith('zh');
    }
    // Returns the localized value of an entry field, falling back to English.
    // `howTo` is an array of strings; title/short are strings.
    entryText (entry, key) {
        if (this.isChinese() && HELP_TRANSLATIONS[entry.id]) {
            const localized = HELP_TRANSLATIONS[entry.id][key];
            if (Array.isArray(localized)) {
                if (localized.length > 0) {
                    return localized;
                }
            } else if (typeof localized === 'string' && localized) {
                return localized;
            }
        }
        return entry[key];
    }
    matchesQuery (entry, query) {
        if (!query) return true;
        const q = query.toLowerCase();
        const translated = this.isChinese() ? HELP_TRANSLATIONS[entry.id] : null;
        const haystack = [
            entry.title,
            entry.short,
            entry.category,
            ...(entry.keywords || []),
            translated ? translated.title : '',
            translated ? translated.short : '',
            translated ? (translated.keywords || []).join(' ') : ''
        ].join(' ').toLowerCase();
        return haystack.includes(q);
    }
    render () {
        const {intl} = this.props;
        const query = this.state.query.trim();
        const visibleEntries = HELP_ENTRIES.filter(entry => this.matchesQuery(entry, query));
        const selected = visibleEntries.find(e => e.id === this.state.selectedId) || visibleEntries[0] || null;
        const groups = HELP_CATEGORIES
            .map(category => ({
                category,
                label: this.isChinese() ? (CATEGORY_TRANSLATIONS[category] || category) : category,
                entries: visibleEntries.filter(e => e.category === category)
            }))
            .filter(group => group.entries.length > 0);
        return (
            <Modal
                className={styles.modalContent}
                contentLabel={intl.formatMessage(messages.title)}
                onRequestClose={this.props.onClose}
                id="helpModal"
                width={880}
                height={620}
                minWidth={520}
                minHeight={400}
            >
                <div className={styles.root}>
                    <aside className={styles.sidebar}>
                        <div className={styles.searchBox}>
                            <Search size={14} className={styles.searchIcon} />
                            <input
                                className={styles.searchInput}
                                type="text"
                                placeholder={intl.formatMessage(messages.searchPlaceholder)}
                                value={this.state.query}
                                onChange={this.handleSearch}
                            />
                        </div>
                        <div className={styles.sidebarScroll}>
                            {groups.map(group => (
                                <div
                                    key={group.category}
                                    className={styles.group}
                                >
                                    <div className={styles.groupTitle}>{group.label}</div>
                                    {group.entries.map(entry => (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            className={selected && selected.id === entry.id ?
                                                styles.itemActive : styles.item}
                                            data-id={entry.id}
                                            onClick={this.handleSelect}
                                        >
                                            {this.entryText(entry, 'title')}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </aside>
                    <div className={styles.content}>
                        {selected ? (
                            <div
                                className={styles.entry}
                                key={selected.id}
                            >
                                <h2 className={styles.entryTitle}>{this.entryText(selected, 'title')}</h2>
                                <p className={styles.entryShort}>{this.entryText(selected, 'short')}</p>
                                <div className={styles.stepsTitle}>{intl.formatMessage(messages.steps)}</div>
                                <ol className={styles.steps}>
                                    {this.entryText(selected, 'howTo').map((step, index) => (
                                        <li
                                            key={index}
                                            className={styles.step}
                                        >{step}</li>
                                    ))}
                                </ol>
                            </div>
                        ) : (
                            <p className={styles.empty}>{intl.formatMessage(messages.noResults)}</p>
                        )}
                    </div>
                </div>
            </Modal>
        );
    }
}

HelpModal.propTypes = {
    intl: intlShape.isRequired,
    selectedId: PropTypes.string,
    onClose: PropTypes.func.isRequired
};

export default injectIntl(HelpModal);

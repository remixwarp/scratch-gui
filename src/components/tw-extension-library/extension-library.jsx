import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {CheckCircle, Search, Trash2} from 'lucide-react';

import Modal from '../../containers/windowed-modal.jsx';
import {
    ModalSidebar,
    ModalSidebarGroup,
    ModalSidebarGroupHeader,
    ModalSidebarItem,
    ModalSidebarLayout
} from '../modal-sidebar/modal-sidebar.jsx';
import styles from './extension-library.css';

const messages = defineMessages({
    all: {
        id: 'gui.extensionLibrary.allTag',
        defaultMessage: 'All',
        description: 'Sidebar entry showing every extension'
    },
    search: {
        id: 'gui.extensionLibrary.search',
        defaultMessage: 'Search extensions',
        description: 'Placeholder for the extension search field'
    },
    categories: {
        id: 'gui.extensionLibrary.categories',
        defaultMessage: 'Extensions',
        description: 'Header for the extension category sidebar'
    },
    emptyStateLoading: {
        id: 'tw.extensionLibrary.emptyLoading',
        defaultMessage: 'Loading extensions...',
        description: 'Shown in the extension list while the selected source is loading'
    },
    emptyStateError: {
        id: 'tw.extensionLibrary.emptyError',
        defaultMessage: 'Failed to load this extension gallery.',
        description: 'Shown in the extension list when the selected source failed to load'
    },
    emptyStateIdle: {
        id: 'tw.extensionLibrary.emptyIdle',
        defaultMessage: 'This gallery has no extensions yet.',
        description: 'Shown in the extension list when the selected source has no extensions'
    },
    emptyStateEmpty: {
        id: 'tw.extensionLibrary.emptySearch',
        defaultMessage: 'No matching extensions.',
        description: 'Shown in the extension list when the current filter matches nothing'
    }
});

const ALL = 'all';
const topExtensionIds = new Set(['tw', 'custom_extension', 'custom_extension_gallery', 'gallery']);

const labelOf = (tag, intl) => (
    typeof tag.intlLabel === 'string' ? tag.intlLabel : intl.formatMessage(tag.intlLabel)
);

// A real, loadable extension (not a divider or gallery-status card).
const isExtension = item => item && typeof item === 'object' && (item.extensionId || item.href);

const tagStatusClass = {
    loaded: styles.tagStatusDotLoaded, // 绿色：加载成功（网络源）
    loading: styles.tagStatusDotLoading, // 黄色：正在加载
    error: styles.tagStatusDotError, // 红色：加载失败
    local: styles.tagStatusDotLocal, // 蓝色：加载成功（桌面端本地）
    idle: styles.tagStatusDotIdle // 灰色：尚未获取到状态
};

const TagItem = ({tag, label, selected, onSelect, status, removable, onRemove}) => {
    const handleClick = React.useCallback(() => onSelect(tag), [onSelect, tag]);
    const handleRemove = React.useCallback(e => {
        e.stopPropagation();
        if (onRemove) {
            onRemove(tag);
        }
    }, [onRemove, tag]);
    // 非"全部"分类始终渲染圆点（idle 为灰色占位），保证加载中不闪烁/位移
    const statusDot = status ? (
        <span className={classNames(styles.tagStatusDot, tagStatusClass[status])} />
    ) : null;
    const removeButton = removable ? (
        <button
            className={styles.tagRemoveButton}
            onClick={handleRemove}
            title="Remove this gallery"
            type="button"
        >
            <Trash2 size={14} />
        </button>
    ) : null;
    return (
        <ModalSidebarItem
            label={label}
            selected={selected}
            onClick={handleClick}
            statusDot={statusDot}
            trailingAction={removeButton}
        />
    );
};

TagItem.propTypes = {
    tag: PropTypes.string.isRequired,
    label: PropTypes.node.isRequired,
    selected: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    status: PropTypes.string,
    removable: PropTypes.bool,
    onRemove: PropTypes.func
};

const ExtensionSection = ({children, title}) => (
    <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.grid}>{children}</div>
    </section>
);

ExtensionSection.propTypes = {
    children: PropTypes.node.isRequired,
    title: PropTypes.node.isRequired
};

const ExtensionCard = ({item, onSelect, isLoaded}) => {
    const handleClick = React.useCallback(() => onSelect(item), [onSelect, item]);
    const icon = item.iconURL || item.rawURL;
    const loaded = isLoaded ? isLoaded(item) : false;
    const loadedCheck = loaded ? (
        <span
            className={styles.cardLoadedCheck}
            title="Loaded"
        >
            <CheckCircle size={16} />
        </span>
    ) : null;
    const content = (
        <React.Fragment>
            {icon ? (
                <img
                    className={styles.cardIcon}
                    src={icon}
                    alt=""
                    draggable={false}
                    crossOrigin="anonymous"
                />
            ) : <div className={styles.cardIcon} />}
            {item.insetIconURL ? (
                <img
                    className={styles.cardInsetIcon}
                    src={item.insetIconURL}
                    alt=""
                    draggable={false}
                    crossOrigin="anonymous"
                />
            ) : null}
            <div className={styles.cardText}>
                <div className={styles.cardName}>{item.name}</div>
                {item.description ? (
                    <div className={styles.cardDescription}>{item.description}</div>
                ) : null}
            </div>
        </React.Fragment>
    );
    const info = item.docsURI || item.samples || item.credits || item.bluetoothRequired ||
        item.internetConnectionRequired || item.collaborator ? (
            <div className={styles.cardInfo}>
                {item.docsURI ? (
                    <a
                        href={item.docsURI}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <FormattedMessage
                            defaultMessage="Documentation"
                            id="tw.documentation"
                        />
                    </a>
                ) : null}
                {item.samples && item.samples[0] ? (
                    <a
                        href={item.samples[0].href}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <FormattedMessage
                            defaultMessage="Sample project"
                            id="tw.sample"
                        />
                    </a>
                ) : null}
                {item.credits && item.credits.length ? (
                    <span>
                        <FormattedMessage
                            defaultMessage="Created by:"
                            id="tw.createdBy"
                        />
                        {' '}
                        {item.credits.map((credit, index) => (
                            <React.Fragment key={index}>
                                {typeof credit === 'object' && credit !== null && !React.isValidElement(credit)
                                    ? (credit.name || JSON.stringify(credit))
                                    : credit
                                }{index < item.credits.length - 1 ? ', ' : null}
                            </React.Fragment>
                        ))}
                    </span>
                ) : null}
                {item.bluetoothRequired || item.internetConnectionRequired ? (
                    <span>
                        <FormattedMessage
                            defaultMessage="Requires"
                            id="gui.extensionLibrary.requires"
                        />
                        {': '}
                        {[item.bluetoothRequired && 'Bluetooth', item.internetConnectionRequired && 'Internet']
                            .filter(Boolean).join(', ')}
                    </span>
                ) : null}
                {item.collaborator ? (
                    <span>
                        <FormattedMessage
                            defaultMessage="Collaboration with"
                            id="gui.extensionLibrary.collaboration"
                        />
                        {': '}
                        {item.collaborator}
                    </span>
                ) : null}
            </div>
        ) : null;
    return (
        <div className={classNames(styles.card, {[styles.cardDisabled]: item.disabled})}>
            {loadedCheck}
            {item.href ? (
                <a
                    className={styles.cardSelect}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {content}
                </a>
            ) : (
                <button
                    className={styles.cardSelect}
                    onClick={handleClick}
                    disabled={item.disabled}
                    type="button"
                >
                    {content}
                </button>
            )}
            {info}
        </div>
    );
};

ExtensionCard.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    item: PropTypes.object.isRequired,
    onSelect: PropTypes.func.isRequired,
    isLoaded: PropTypes.func
};

class TWExtensionLibrary extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            selectedTag: ALL,
            query: ''
        };
        this.handleQuery = this.handleQuery.bind(this);
        this.handleSelectTag = this.handleSelectTag.bind(this);
        this.handleRemoveTag = this.handleRemoveTag.bind(this);
    }

    handleQuery (e) {
        this.setState({query: e.target.value});
    }

    handleSelectTag (tag) {
        this.setState({selectedTag: tag});
    }

    handleRemoveTag (tag) {
        if (typeof this.props.onRemoveCustomSource === 'function') {
            this.props.onRemoveCustomSource(tag);
        }
        // 删除的正是当前选中的标签时，回到"全部"避免内容区空白
        if (this.state.selectedTag === tag) {
            this.setState({selectedTag: ALL});
        }
    }

    matchesTag (item) {
        if (this.state.selectedTag === ALL) {
            return true;
        }
        return Array.isArray(item.tags) && item.tags.includes(this.state.selectedTag);
    }

    matchesQuery (item) {
        const query = this.state.query.trim().toLowerCase();
        if (!query) {
            return true;
        }
        const haystack = `${item.name || ''} ${item.description || ''}`.toLowerCase();
        return haystack.includes(query);
    }

    render () {
        const {intl, tags, title, onRequestClose, onItemSelected, isLoaded, getSourceStatus, removableTags} = this.props;
        const data = this.props.data || [];
        const divider = data.indexOf('---');
        const builtIn = data.slice(0, divider === -1 ? data.length : divider).filter(isExtension);
        const gallery = divider === -1 ? [] : data.slice(divider + 1).filter(isExtension);
        const matches = item => this.matchesTag(item) && this.matchesQuery(item);
        const items = builtIn.concat(gallery);
        const visible = items.filter(matches);
        const top = visible.filter(item => topExtensionIds.has(item.extensionId));
        const sourceOf = item => item.source ||
            (item.tags.includes('rotur') ? 'rotur' : item.tags.includes('mistium') ? 'mistium' :
        item.tags.includes('tw') ? 'tw' : item.tags.includes('cy-scr-ext-hub') ? 'cy-scr-ext-hub' : 'scratch');
        const sources = this.props.sources || [
            ['scratch', 'Scratch'],
            ['tw', 'TurboWarp'],
            ['mistium', 'Mistium'],
            ['rotur', 'Bilup Accounts'],
            ['cy-scr-ext-hub', 'CY ScrExt Hub']
        ];
        const sections = sources.map(([source, sourceTitle]) => ({
            title: sourceTitle,
            items: visible.filter(item =>
                !topExtensionIds.has(item.extensionId) && sourceOf(item) === source
            )
        })).filter(section => section.items.length);
        const showSections = this.state.selectedTag === ALL && !this.state.query.trim() &&
            (top.length || sections.length > 1);

        // 内容区无匹配项时的状态提示：加载中 / 加载失败 / 空库 / 无搜索结果
        const emptyState = () => {
            if (this.state.query.trim()) {
                return <FormattedMessage {...messages.emptyStateEmpty} />;
            }
            if (this.state.selectedTag !== ALL && getSourceStatus) {
                const status = getSourceStatus(this.state.selectedTag);
                if (status === 'loading') {
                    return <FormattedMessage {...messages.emptyStateLoading} />;
                }
                if (status === 'error') {
                    return <FormattedMessage {...messages.emptyStateError} />;
                }
            }
            return <FormattedMessage {...messages.emptyStateIdle} />;
        };

        const sidebarTags = [{tag: ALL, intlLabel: intl.formatMessage(messages.all)}, ...tags];

        return (
            <Modal
                className={styles.modalContent}
                contentLabel={title}
                onRequestClose={onRequestClose}
                id="extensionLibrary"
                width={1040}
                height={720}
                minWidth={760}
                minHeight={520}
            >
                <ModalSidebarLayout className={styles.layout}>
                    <ModalSidebar
                        ariaLabel={title}
                        width="wide"
                    >
                        <ModalSidebarGroup>
                            <ModalSidebarGroupHeader label={intl.formatMessage(messages.categories)} />
                            {sidebarTags.map(tag => (
                                <TagItem
                                    key={tag.tag}
                                    tag={tag.tag}
                                    label={labelOf(tag, intl)}
                                    selected={this.state.selectedTag === tag.tag}
                                    onSelect={this.handleSelectTag}
                                    icon={tag.icon}
                                    status={tag.tag !== ALL && getSourceStatus ? getSourceStatus(tag.tag) : null}
                                    removable={removableTags && removableTags.includes(tag.tag)}
                                    onRemove={this.handleRemoveTag}
                                />
                            ))}
                        </ModalSidebarGroup>
                    </ModalSidebar>

                    <div className={styles.content}>
                        <div className={styles.searchRow}>
                            <Search
                                className={styles.searchIcon}
                                size={18}
                            />
                            <input
                                className={styles.search}
                                placeholder={intl.formatMessage(messages.search)}
                                value={this.state.query}
                                onChange={this.handleQuery}
                                autoFocus
                            />
                        </div>
                        <div className={styles.scroll}>
                            {showSections ? (
                                <React.Fragment>
                                    {top.length ? (
                                        <div className={styles.grid}>
                                            {top.map((item, index) => (
                                                <ExtensionCard
                                                    key={`${item.extensionId || 'link'}-${index}`}
                                                    item={item}
                                                    onSelect={onItemSelected}
                                                    isLoaded={isLoaded}
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                    {sections.map(section => (
                                        <ExtensionSection
                                            key={section.title}
                                            title={section.title}
                                        >
                                            {section.items.map((item, index) => (
                                                <ExtensionCard
                                                    key={`${item.extensionId || 'link'}-${index}`}
                                                    item={item}
                                                    onSelect={onItemSelected}
                                                    isLoaded={isLoaded}
                                                />
                                            ))}
                                        </ExtensionSection>
                                    ))}
                                </React.Fragment>
                            ) : visible.length ? (
                                <div className={styles.grid}>
                                    {visible.map((item, index) => (
                                        <ExtensionCard
                                            key={`${item.extensionId || 'link'}-${index}`}
                                            item={item}
                                            onSelect={onItemSelected}
                                            isLoaded={isLoaded}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    {emptyState()}
                                </div>
                            )}
                        </div>
                    </div>
                </ModalSidebarLayout>
            </Modal>
        );
    }
}

TWExtensionLibrary.propTypes = {
    intl: intlShape,
    // eslint-disable-next-line react/forbid-prop-types
    data: PropTypes.array,
    tags: PropTypes.arrayOf(PropTypes.object),
    title: PropTypes.string,
    onItemSelected: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    onRemoveCustomSource: PropTypes.func,
    isLoaded: PropTypes.func,
    getSourceStatus: PropTypes.func,
    removableTags: PropTypes.arrayOf(PropTypes.string),
    sources: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string))
};

export default injectIntl(TWExtensionLibrary);
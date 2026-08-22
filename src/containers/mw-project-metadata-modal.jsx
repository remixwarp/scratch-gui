import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {
    defineMessages,
    FormattedMessage,
    injectIntl,
    intlShape
} from 'react-intl';
import VM from 'scratch-vm';
import {
    BarChart3,
    FileText,
    HardDrive,
    Info
} from 'lucide-react';

import Modal from './windowed-modal.jsx';
import Box from '../components/box/box.jsx';
import {
    ModalSidebar,
    ModalSidebarContent,
    ModalSidebarGroup,
    ModalSidebarGroupHeader,
    ModalSidebarItem,
    ModalSidebarLayout
} from '../components/modal-sidebar/modal-sidebar.jsx';
import {closeProjectMetadataModal} from '../reducers/modals';
import {getLoadedProjectMeta} from '../lib/mw-project-metadata';
import {getProject} from '../lib/community/api';
import {getRememberedPlatformProject} from '../lib/community/publish';

import styles from '../components/mw-project-metadata/project-metadata-modal.css';

const MB = 1024 * 1024;
const LIMITS = {
    storedJson: 20 * MB,
    assets: 50 * MB,
    asset: 10 * MB,
    expandedJson: 1024 * MB
};

const messages = defineMessages({
    notRecorded: {id: 'mw.projectMeta.notRecorded', defaultMessage: 'Not recorded'},
    loading: {id: 'mw.projectMeta.loading', defaultMessage: 'Loading...'},
    notUploaded: {id: 'mw.projectMeta.notUploaded', defaultMessage: 'Not uploaded'},
    editorEstimate: {id: 'mw.projectMeta.editorEstimate', defaultMessage: 'Editor estimate'},
    storedOnBilup: {id: 'mw.projectMeta.storedOnBilup', defaultMessage: 'Stored on Bilup'},
    serverUsage: {id: 'mw.projectMeta.serverUsage', defaultMessage: 'Server usage'},
    totalStored: {id: 'mw.projectMeta.totalStored', defaultMessage: 'Total stored'},
    projectData: {id: 'mw.projectMeta.projectData', defaultMessage: 'Project data'},
    assetsLabel: {id: 'mw.projectMeta.assets', defaultMessage: 'Assets'},
    customAssetsLabel: {id: 'mw.projectMeta.customAssets', defaultMessage: 'Custom assets'},
    fontsLabel: {id: 'mw.projectMeta.fonts', defaultMessage: 'Fonts'},
    uploadLimits: {id: 'mw.projectMeta.uploadLimits', defaultMessage: 'Upload limits'},
    compressedProjectData: {id: 'mw.projectMeta.compressedProjectData', defaultMessage: 'Compressed project data on server'},
    exactSizeFromUpload: {id: 'mw.projectMeta.exactSizeFromUpload', defaultMessage: 'Exact size from the last upload'},
    assetsInEditor: {id: 'mw.projectMeta.assetsInEditor', defaultMessage: 'Assets in the editor'},
    assetsEditorNote: {id: 'mw.projectMeta.assetsEditorNote', defaultMessage: 'Costumes, sounds, fonts and custom assets'},
    largestSingleAsset: {id: 'mw.projectMeta.largestSingleAsset', defaultMessage: 'Largest single asset'},
    expandedProjectData: {id: 'mw.projectMeta.expandedProjectData', defaultMessage: 'Expanded project data on server'},
    variableDataInEditor: {id: 'mw.projectMeta.variableDataInEditor', defaultMessage: 'Variable and list data in the editor'},
    fastEstimateFromVM: {id: 'mw.projectMeta.fastEstimateFromVM', defaultMessage: 'Fast lower-bound estimate from the VM'},
    storageDescription: {id: 'mw.projectMeta.storageDescription', defaultMessage: 'Current size, server usage and upload limits.'},
    vmSizeNote: {id: 'mw.projectMeta.vmSizeNote', defaultMessage: 'Sizes in the editor come directly from the VM. Final compression is measured during upload.'},
    bilupLimits: {id: 'mw.projectMeta.bilupLimits', defaultMessage: 'Bilup allows 20 MB of compressed project data, 1 GB expanded, 50 MB of assets, and 10 MB per asset.'},
    sprites: {id: 'mw.projectMeta.sprites', defaultMessage: 'Sprites'},
    costumes: {id: 'mw.projectMeta.costumes', defaultMessage: 'Costumes'},
    sounds: {id: 'mw.projectMeta.sounds', defaultMessage: 'Sounds'},
    blocks: {id: 'mw.projectMeta.blocks', defaultMessage: 'Blocks'},
    extensions: {id: 'mw.projectMeta.extensions', defaultMessage: 'Extensions'},
    none: {id: 'mw.projectMeta.none', defaultMessage: 'None'},
    breakdownDescription: {id: 'mw.projectMeta.breakdownDescription', defaultMessage: 'A fast estimate from live assets, variables and lists in the VM.'},
    largestParts: {id: 'mw.projectMeta.largestParts', defaultMessage: 'Largest parts'},
    projectOverview: {id: 'mw.projectMeta.projectOverview', defaultMessage: 'Project overview'},
    titleLabel: {id: 'mw.projectMeta.titleLabel', defaultMessage: 'Title'},
    author: {id: 'mw.projectMeta.author', defaultMessage: 'Author'},
    created: {id: 'mw.projectMeta.created', defaultMessage: 'Created'},
    lastEdited: {id: 'mw.projectMeta.lastEdited', defaultMessage: 'Last edited'},
    format: {id: 'mw.projectMeta.format', defaultMessage: 'Format'},
    untitled: {id: 'mw.projectMeta.untitled', defaultMessage: 'Untitled'},
    saveToAddAuthor: {id: 'mw.projectMeta.saveToAddAuthor', defaultMessage: 'Save this project to add @{roturUsername} as its author.'},
    signInToAddAuthor: {id: 'mw.projectMeta.signInToAddAuthor', defaultMessage: 'Sign in to Bilup Accounts and save this project to add authorship.'},
    authorId: {id: 'mw.projectMeta.authorId', defaultMessage: 'Author ID'},
    platform: {id: 'mw.projectMeta.platform', defaultMessage: 'Platform'},
    version: {id: 'mw.projectMeta.version', defaultMessage: 'Version'},
    vmLabel: {id: 'mw.projectMeta.vm', defaultMessage: 'VM'},
    userAgent: {id: 'mw.projectMeta.userAgent', defaultMessage: 'User agent'},
    refreshing: {id: 'mw.projectMeta.refreshing', defaultMessage: 'Refreshing...'},
    maxSizeExceeded: {id: 'mw.projectMeta.maxSizeExceeded', defaultMessage: 'Project exceeds storage limits'},
    largeSizeWarning: {id: 'mw.projectMeta.largeSizeWarning', defaultMessage: 'Project is large'},
    sizeOK: {id: 'mw.projectMeta.sizeOK', defaultMessage: 'Within storage limits'},
    contentLabel: {id: 'mw.projectMeta.contentLabel', defaultMessage: 'Project details'},
    sectionsAriaLabel: {id: 'mw.projectMeta.sectionsAriaLabel', defaultMessage: 'Project details sections'},
    groupProject: {id: 'mw.projectMeta.groupProject', defaultMessage: 'Project'},
    groupAnalysis: {id: 'mw.projectMeta.groupAnalysis', defaultMessage: 'Analysis'}
});

const formatTime = iso => {
    if (!iso) return null;
    const date = new Date(iso);
    if (isNaN(date.getTime())) return String(iso);
    return date.toLocaleString();
};

const formatSize = bytes => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < MB) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * MB) return `${(bytes / MB).toFixed(2)} MB`;
    return `${(bytes / (1024 * MB)).toFixed(2)} GB`;
};

const assetSize = asset => {
    if (!asset || !asset.data) return 0;
    return asset.data.byteLength || asset.data.length || 0;
};

const valueSize = value => {
    if (value === null || typeof value === 'undefined') return 0;
    return String(value).length;
};

const variableValueSize = value => {
    if (!Array.isArray(value)) return valueSize(value);
    const samples = Math.min(value.length, 1000);
    if (!samples) return 0;
    let size = 0;
    for (let i = 0; i < samples; i++) {
        size += valueSize(value[Math.floor(i * value.length / samples)]);
    }
    return Math.round(size * value.length / samples);
};

const buildSizeReport = vm => {
    const entries = new Map();
    const addAsset = (asset, category, label) => {
        if (!asset) return;
        const name = `${asset.assetId}.${asset.dataFormat}`;
        if (!entries.has(name)) {
            entries.set(name, {name, category, label, size: assetSize(asset)});
        }
    };
    const targets = vm.runtime.targets.filter(target => target.isOriginal);
    let sprites = 0;
    let costumes = 0;
    let sounds = 0;
    let blocks = 0;
    let variableDataSize = 0;

    for (const target of targets) {
        const targetName = target.getName();
        if (!target.isStage) sprites++;
        const targetCostumes = target.getCostumes();
        const targetSounds = target.getSounds();
        costumes += targetCostumes.length;
        sounds += targetSounds.length;
        for (const costume of targetCostumes) {
            addAsset(costume.asset, 'Costumes', `${targetName}: ${costume.name}`);
        }
        for (const sound of targetSounds) {
            addAsset(sound.asset, 'Sounds', `${targetName}: ${sound.name}`);
        }
        for (const id in target.blocks._blocks) {
            if (Object.prototype.hasOwnProperty.call(target.blocks._blocks, id)) blocks++;
        }
        for (const variable of Object.values(target.variables || {})) {
            const size = valueSize(variable.name) + variableValueSize(variable.value);
            variableDataSize += size;
            entries.set(`variable:${target.id}:${variable.id}`, {
                name: `variable:${target.id}:${variable.id}`,
                category: 'Variables and lists',
                label: `${targetName}: ${variable.name}`,
                size
            });
        }
    }

    for (const entry of (vm.runtime.assetManager && vm.runtime.assetManager.assets) || []) {
        addAsset(entry.asset, 'Custom assets', entry.name);
    }
    for (const font of (vm.runtime.fontManager && vm.runtime.fontManager.fonts) || []) {
        addAsset(font.asset, 'Fonts', font.family);
    }

    const allEntries = Array.from(entries.values());
    const categories = new Map();
    let localAssetSize = 0;
    for (const entry of allEntries) {
        categories.set(entry.category, (categories.get(entry.category) || 0) + entry.size);
        if (entry.category !== 'Variables and lists') localAssetSize += entry.size;
    }
    const localEstimate = localAssetSize + variableDataSize;
    const largestAsset = allEntries
        .filter(entry => entry.category !== 'Variables and lists')
        .reduce((largest, entry) => Math.max(largest, entry.size), 0);

    return {
        localEstimate,
        localAssetSize,
        variableDataSize,
        largestAsset,
        overAssetLimit: largestAsset > LIMITS.asset,
        overAssetsLimit: localAssetSize > LIMITS.assets,
        overExpandedLimit: variableDataSize > LIMITS.expandedJson,
        contents: {
            sprites,
            costumes,
            sounds,
            blocks,
            extensions: vm.extensionManager && vm.extensionManager._loadedExtensions ?
                Array.from(vm.extensionManager._loadedExtensions.keys()) :
                []
        },
        categories: Array.from(categories, ([name, size]) => ({
            name,
            size,
            percent: localEstimate ? Math.max(1, size / localEstimate * 100) : 0
        })).sort((a, b) => b.size - a.size),
        largest: allEntries.sort((a, b) => b.size - a.size).slice(0, 12)
    };
};

const Row = ({label, value}) => (
    <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>
            {value === null || typeof value === 'undefined' || value === '' ? (
                <span className={styles.emptyValue}>
                    <FormattedMessage
                        defaultMessage="Not recorded"
                        id="mw.projectMeta.notRecorded"
                    />
                </span>
            ) : value}
        </span>
    </div>
);

Row.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.node
};

const Header = ({children}) => (
    <div className={styles.header}>
        <h2>{children}</h2>
        <div className={styles.divider} />
    </div>
);

Header.propTypes = {
    children: PropTypes.node
};

const Meter = ({current, label, limit, note}) => {
    const percent = Math.min(100, current / limit * 100);
    const over = current > limit;
    return (
        <div className={styles.meter}>
            <div className={styles.meterLabel}>
                <span>
                    <strong>{label}</strong>
                    {note && <small>{note}</small>}
                </span>
                <span className={over ? styles.over : null}>
                    {formatSize(current)} {' / '} {formatSize(limit)}
                </span>
            </div>
            <div className={styles.meterTrack}>
                <div
                    className={over ? styles.meterFillOver : styles.meterFill}
                    style={{width: `${percent}%`}}
                />
            </div>
        </div>
    );
};

Meter.propTypes = {
    current: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    limit: PropTypes.number.isRequired,
    note: PropTypes.string
};

const ProjectMetadataModal = ({initialView, intl, onRequestClose, projectTitle, roturUsername, vm}) => {
    const [view, setView] = React.useState(initialView);
    const [refresh, setRefresh] = React.useState(0);
    const [serverProject, setServerProject] = React.useState(null);
    const [serverLoading, setServerLoading] = React.useState(false);
    const handleRefresh = React.useCallback(() => setRefresh(value => value + 1), []);
    const report = React.useMemo(() => buildSizeReport(vm), [vm, refresh]);
    const meta = getLoadedProjectMeta() || {};
    const author = meta.author;
    const platform = meta.platform;
    const projectId = getRememberedPlatformProject();

    React.useEffect(() => {
        if (!projectId) return;
        let active = true;
        setServerLoading(true);
        getProject(projectId)
            .then(data => {
                if (active) setServerProject(data.project);
            })
            .catch(() => {
                if (active) setServerProject(null);
            })
            .then(() => {
                if (active) setServerLoading(false);
            });
        return () => {
            active = false;
        };
    }, [projectId, refresh]);

    const serverStoredJson = serverProject && serverProject.storedJsonBytes;
    const hasLocalProblem = report.overAssetLimit || report.overAssetsLimit || report.overExpandedLimit;
    const hasServerProblem = serverStoredJson > LIMITS.storedJson;
    const storageStatus = hasLocalProblem || hasServerProblem ?
        intl.formatMessage(messages.maxSizeExceeded) :
        serverProject ?
            intl.formatMessage(messages.sizeOK) :
            intl.formatMessage(messages.largeSizeWarning);
    const groups = [
        {
            label: intl.formatMessage(messages.groupProject),
            items: [
                {id: 'project', label: intl.formatMessage({id: 'mw.projectMeta.overview', defaultMessage: 'Overview'}), icon: Info},
                {id: 'contents', label: intl.formatMessage({id: 'mw.projectMeta.contents', defaultMessage: 'Contents'}), icon: BarChart3},
                {id: 'technical', label: intl.formatMessage({id: 'mw.projectMeta.technical', defaultMessage: 'Technical metadata'}), icon: FileText}
            ]
        },
        {
            label: intl.formatMessage(messages.groupAnalysis),
            items: [
                {id: 'breakdown', label: intl.formatMessage({id: 'mw.projectMeta.breakdown', defaultMessage: 'Size breakdown'}), icon: HardDrive}
            ]
        }
    ].map(group => Object.assign({}, group, {
        items: group.items.map(item => Object.assign({}, item, {handleClick: () => setView(item.id)}))
    }));

    let page;
    switch (view) {
    case 'contents':
        page = (
            <React.Fragment>
                <Header>
                    <FormattedMessage
                        defaultMessage="Contents"
                        id="mw.projectMeta.contents"
                    />
                </Header>
                <Row
                    label={intl.formatMessage(messages.sprites)}
                    value={String(report.contents.sprites)}
                />
                <Row
                    label={intl.formatMessage(messages.costumes)}
                    value={String(report.contents.costumes)}
                />
                <Row
                    label={intl.formatMessage(messages.sounds)}
                    value={String(report.contents.sounds)}
                />
                <Row
                    label={intl.formatMessage(messages.blocks)}
                    value={String(report.contents.blocks)}
                />
                <Row
                    label={intl.formatMessage(messages.extensions)}
                    value={report.contents.extensions.length ?
                        report.contents.extensions.join(', ') :
                        intl.formatMessage(messages.none)}
                />
            </React.Fragment>
        );
        break;
    case 'breakdown':
        page = (
            <React.Fragment>
                <Header>
                    <FormattedMessage
                        defaultMessage="Size breakdown"
                        id="mw.projectMeta.breakdown"
                    />
                </Header>
                <p className={styles.detail}>
                    {intl.formatMessage(messages.breakdownDescription)}
                </p>
                <div className={styles.breakdown}>
                    {report.categories.map(category => (
                        <div
                            className={styles.breakdownRow}
                            key={category.name}
                        >
                            <div className={styles.breakdownLabel}>
                                <span>{category.name}</span>
                                <strong>{formatSize(category.size)}</strong>
                            </div>
                            <div className={styles.bar}>
                                <div
                                    className={styles.barFill}
                                    style={{width: `${category.percent}%`}}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <Header>
                    <FormattedMessage
                        defaultMessage="Largest parts"
                        id="mw.projectMeta.largestParts"
                    />
                </Header>
                <div className={styles.largest}>
                    {report.largest.map(entry => {
                        const categoryLabel = {
                            Costumes: intl.formatMessage(messages.costumes),
                            Sounds: intl.formatMessage(messages.sounds),
                            'Custom assets': intl.formatMessage(messages.customAssetsLabel),
                            Fonts: intl.formatMessage(messages.fontsLabel),
                            'Variables and lists': intl.formatMessage(messages.variableDataInEditor)
                        }[entry.category] || entry.category;
                        return (
                            <div
                                className={styles.largestRow}
                                key={entry.name}
                            >
                                <span>
                                    <strong>{entry.label}</strong>
                                    <small>{categoryLabel}</small>
                                </span>
                                <strong>{formatSize(entry.size)}</strong>
                            </div>
                        );
                    })}
                </div>
            </React.Fragment>
        );
        break;
    case 'technical':
        page = (
            <React.Fragment>
                <Header>
                    <FormattedMessage
                        defaultMessage="Technical metadata"
                        id="mw.projectMeta.technical"
                    />
                </Header>
                <Row
                    label={intl.formatMessage(messages.authorId)}
                    value={author && author.id}
                />
                <Row
                    label={intl.formatMessage(messages.platform)}
                    value={platform && platform.name}
                />
                <Row
                    label={intl.formatMessage(messages.version)}
                    value={platform && platform.version}
                />
                <Row
                    label={intl.formatMessage(messages.format)}
                    value={meta.semver}
                />
                <Row
                    label={intl.formatMessage(messages.vmLabel)}
                    value={meta.vm}
                />
                <Row
                    label={intl.formatMessage(messages.userAgent)}
                    value={meta.agent}
                />
            </React.Fragment>
        );
        break;
    default:
        page = (
            <React.Fragment>
                <Header>
                    <FormattedMessage
                        defaultMessage="Project overview"
                        id="mw.projectMeta.projectOverview"
                    />
                </Header>
                <Row
                    label={intl.formatMessage(messages.titleLabel)}
                    value={projectTitle || intl.formatMessage(messages.untitled)}
                />
                <Row
                    label={intl.formatMessage(messages.author)}
                    value={author ? `@${author.username}` : null}
                />
                <Row
                    label={intl.formatMessage(messages.created)}
                    value={formatTime(meta.created || meta.createdAt)}
                />
                <Row
                    label={intl.formatMessage(messages.lastEdited)}
                    value={formatTime(meta.edited || meta.savedAt)}
                />
                <Row
                    label={intl.formatMessage(messages.format)}
                    value={meta.semver}
                />
                {!author && !meta.edited && !meta.savedAt && (
                    <p className={styles.detail}>
                        {roturUsername ?
                            intl.formatMessage(messages.saveToAddAuthor, {roturUsername}) :
                            intl.formatMessage(messages.signInToAddAuthor)}
                    </p>
                )}
            </React.Fragment>
        );
    }

    return (
        <Modal
            className={styles.modalContent}
            contentLabel={intl.formatMessage(messages.contentLabel)}
            id="projectMetadataModal"
            onRequestClose={onRequestClose}
            width={880}
            height={550}
        >
            <ModalSidebarLayout>
                <ModalSidebar
                    ariaLabel={intl.formatMessage(messages.sectionsAriaLabel)}
                    width="wide"
                >
                    {groups.map(group => (
                        <ModalSidebarGroup key={group.label}>
                            <ModalSidebarGroupHeader label={group.label} />
                            {group.items.map(item => (
                                <ModalSidebarItem
                                    key={item.id}
                                    icon={item.icon}
                                    label={item.label}
                                    selected={view === item.id}
                                    onClick={item.handleClick}
                                />
                            ))}
                        </ModalSidebarGroup>
                    ))}
                </ModalSidebar>
                <ModalSidebarContent>
                    <Box className={styles.pageContent}>{page}</Box>
                </ModalSidebarContent>
            </ModalSidebarLayout>
        </Modal>
    );
};

ProjectMetadataModal.propTypes = {
    initialView: PropTypes.string.isRequired,
    intl: intlShape,
    onRequestClose: PropTypes.func.isRequired,
    projectTitle: PropTypes.string,
    roturUsername: PropTypes.string,
    vm: PropTypes.instanceOf(VM).isRequired
};

export {buildSizeReport, formatSize, LIMITS};
export default injectIntl(connect(
    state => ({
        initialView: state.scratchGui.modals.projectMetadataView || 'project',
        projectTitle: state.scratchGui.projectTitle,
        roturUsername: (state.scratchGui.rotur && state.scratchGui.rotur.username) || null,
        vm: state.scratchGui.vm
    }),
    dispatch => ({
        onRequestClose: () => dispatch(closeProjectMetadataModal())
    })
)(ProjectMetadataModal));

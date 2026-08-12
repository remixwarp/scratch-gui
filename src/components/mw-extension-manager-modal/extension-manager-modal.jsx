import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {GripVertical, RefreshCw, Trash2} from 'lucide-react';

import Modal from '../../containers/windowed-modal.jsx';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';

import extensionLibrary from '../../lib/libraries/extensions/index.jsx';
import centralDispatch from 'scratch-vm/src/dispatch/central-dispatch';

import styles from './extension-manager-modal.css';

/* eslint-disable react/jsx-no-bind */

const messages = defineMessages({
    title: {
        defaultMessage: 'Extension Manager',
        description: 'Title of modal that appears when opening the Extension Manager',
        id: 'tw.extensionManager.title'
    },
    refresh: {
        defaultMessage: 'Refresh',
        description: 'Recalculate the block counts shown for each extension',
        id: 'tw.extensionManager.refresh'
    },
    noneLoadedDescription: {
        defaultMessage: 'Extensions you add will appear here.',
        description: 'Hint shown when no extensions are loaded',
        id: 'tw.extensionManager.noneLoadedDescription'
    },
    deleteSelected: {
        defaultMessage: 'Delete selected ({count})',
        description: 'Button to delete selected extensions',
        id: 'tw.extensionManager.deleteSelected'
    },
    deleteExtension: {
        defaultMessage: 'Delete extension',
        description: 'Tooltip/aria label for removing a single extension',
        id: 'tw.extensionManager.deleteExtension'
    },
    dragHint: {
        defaultMessage: 'Drag rows to reorder extensions',
        description: 'Hint shown in the footer',
        id: 'tw.extensionManager.dragHint'
    }
});

const ExtensionManagerModal = props => {
    const [selected, setSelected] = useState([]);
    const [dragIndex, setDragIndex] = useState(null);
    const [refreshCounter, setRefreshCounter] = useState(0);

    const [blockIconURIs, setBlockIconURIs] = useState({});
    const [extensionColors, setExtensionColors] = useState({});

    const extensionLibraryById = useMemo(() => new Map(extensionLibrary.map(i => [i.extensionId, i])), []);

    const readExtensionIds = useCallback(() => {
        const map = props.vm?.extensionManager?._loadedExtensions;
        if (!map) return [];
        return Array.from(map.keys());
    }, [props.vm]);

    const initialExtensions = useMemo(() => {
        if (!props.vm || !props.vm.extensionManager) return [];
        return Array.from(props.vm.extensionManager._loadedExtensions.keys());
    }, [props.vm]);

    const [extensionIds, setExtensionIds] = useState(initialExtensions);

    // Count how many blocks in the project use each loaded extension.
    // Extension block opcodes are prefixed with `${extensionId}_`, so the
    // part before the first underscore identifies the owning extension.
    const calculateBlockCounts = useCallback(() => {
        const counts = new Map(extensionIds.map(id => [id, 0]));
        const targets = (props.vm && props.vm.runtime && props.vm.runtime.targets) || [];
        for (const target of targets) {
            if (!target || target.isOriginal === false) continue;
            const blocks = target.blocks && target.blocks._blocks;
            if (!blocks) continue;
            for (const block of Object.values(blocks)) {
                if (!block || block.shadow || !block.opcode) continue;
                const separator = block.opcode.indexOf('_');
                if (separator === -1) continue;
                const prefix = block.opcode.substring(0, separator);
                if (counts.has(prefix)) {
                    counts.set(prefix, counts.get(prefix) + 1);
                }
            }
        }
        return counts;
    }, [props.vm, extensionIds]);

    const [blockCounts, setBlockCounts] = useState(() => calculateBlockCounts());

    // Recompute whenever the extension list or VM changes
    useEffect(() => {
        setBlockCounts(calculateBlockCounts());
    }, [calculateBlockCounts]);

    const getExtensionIconURL = useCallback(extensionId => {
        const libraryItem = extensionLibraryById.get(extensionId);
        if (libraryItem) return libraryItem.insetIconURL || libraryItem.iconURL;
        return blockIconURIs[extensionId] || null;
    }, [extensionLibraryById, blockIconURIs]);

    const getExtensionName = useCallback(extensionId => {
        const libraryItem = extensionLibraryById.get(extensionId);
        if (libraryItem) return libraryItem.name;
        return extensionId;
    }, [extensionLibraryById, props.vm]);

    const getExtensionColor = useCallback(extensionId => {
        return extensionColors[extensionId] || null;
    }, [extensionColors]);

    useEffect(() => {
        const map = props.vm?.extensionManager?._loadedExtensions;
        if (!map) return;

        // Extensions already in the library have a built-in icon, so only
        // fetch icon + color info for unknown (usually third-party) ones.
        // Icon and color are loaded together from a single getInfo() call.
        const idsToFetch = extensionIds.filter(id => (
            !extensionLibraryById.has(id) &&
            !blockIconURIs[id] &&
            !extensionColors[id] &&
            map.has(id)
        ));
        if (idsToFetch.length === 0) return;

        let cancelled = false;
        idsToFetch.forEach(id => {
            const serviceName = map.get(id);
            centralDispatch.call(serviceName, 'getInfo')
                .then(info => {
                    if (cancelled) return;
                    const uri = info && info.blockIconURI;
                    const color = info && info.color1;
                    if (!uri && !color) return;
                    // Only store the icon when we actually got a URI, so a
                    // failed icon fetch can be retried on the next refresh
                    // instead of being permanently cached as undefined.
                    setBlockIconURIs(prev => (
                        prev[id] || !uri ? prev : {...prev, [id]: uri}
                    ));
                    if (color) {
                        setExtensionColors(prev => ({...prev, [id]: color}));
                    }
                })
                .catch(() => {
                    // ignore
                });
        });

        return () => {
            cancelled = true;
        };
    }, [props.vm, extensionIds, refreshCounter, blockIconURIs, extensionColors, extensionLibraryById]);

    const updateExtensionIds = useCallback(() => {
        setExtensionIds(readExtensionIds());
    }, [readExtensionIds]);

    useEffect(() => {
        updateExtensionIds();

        const vm = props.vm;
        if (!vm) return;

        const onAdded = () => {
            updateExtensionIds();
        };
        const onRemoved = () => {
            updateExtensionIds();
            setSelected([]);
        };
        const onReordered = info => {
            if (info && Array.isArray(info.ids)) {
                setExtensionIds(info.ids);
                return;
            }
            updateExtensionIds();
        };

        vm.on('EXTENSION_ADDED', onAdded);
        vm.on('EXTENSION_REMOVED', onRemoved);
        vm.on('EXTENSIONS_REORDERED', onReordered);
        if (vm.runtime) {
            vm.runtime.on('PROJECT_LOADED', updateExtensionIds);
        }

        return () => {
            vm.off('EXTENSION_ADDED', onAdded);
            vm.off('EXTENSION_REMOVED', onRemoved);
            vm.off('EXTENSIONS_REORDERED', onReordered);
            if (vm.runtime) {
                vm.runtime.off('PROJECT_LOADED', updateExtensionIds);
            }
        };
    }, [props.vm, updateExtensionIds]);

    useEffect(() => {
        const loaded = new Set(extensionIds);
        setSelected(prev => prev.filter(id => loaded.has(id)));
    }, [extensionIds]);

    const handleRefresh = useCallback(() => {
        // Re-read the loaded extension list and force a fresh block count
        // calculation, since the project's blocks can change without any
        // of the memoized dependencies (vm, extensionIds) changing.
        setRefreshCounter(c => c + 1);
        updateExtensionIds();
        setBlockCounts(calculateBlockCounts());
    }, [updateExtensionIds, calculateBlockCounts]);

    const totalBlocks = useMemo(() => {
        let total = 0;
        for (const count of blockCounts.values()) total += count;
        return total;
    }, [blockCounts]);

    const updateSelection = e => {
        const {value, checked} = e.target;
        setSelected(old => {
            if (checked) return [...old, value];
            return old.filter(i => i !== value);
        });
    };

    const stopDragAndClickBubbling = e => {
        e.stopPropagation();
    };

    const removeExtension = extensionId => {
        if (!props.vm || !props.vm.extensionManager) return;
        if (typeof props.vm.extensionManager.removeExtension !== 'function') return;

        props.vm.extensionManager.removeExtension(extensionId);
        setExtensionIds(old => old.filter(i => i !== extensionId));
        setSelected(old => old.filter(i => i !== extensionId));
    };

    const removeSelected = () => {
        for (const extensionId of selected) {
            removeExtension(extensionId);
        }
        setSelected([]);
        updateExtensionIds();
    };

    const handleDragStart = e => {
        const index = Number(e.currentTarget.dataset.index);
        setDragIndex(index);

        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try {
                e.dataTransfer.setData('text/plain', String(index));
            } catch (err) {
                // ignore
            }
        }
    };

    const handleDrop = e => {
        const index = Number(e.currentTarget.dataset.index);
        let fromIndex = dragIndex;
        if (e.dataTransfer) {
            const raw = e.dataTransfer.getData('text/plain');
            const parsed = Number(raw);
            if (!Number.isNaN(parsed)) {
                fromIndex = parsed;
            }
        }

        if (fromIndex === null || fromIndex === index) return;

        setExtensionIds(old => {
            const next = [...old];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(index, 0, moved);
            return next;
        });
        setDragIndex(null);

        if (props.vm && props.vm.extensionManager && typeof props.vm.extensionManager.reorderExtension === 'function') {
            props.vm.extensionManager.reorderExtension(fromIndex, index);
            updateExtensionIds();
        }
    };

    const handleDragOver = e => {
        e.preventDefault();
    };

    const handleDragEnd = () => {
        setDragIndex(null);
    };

    return (
        <Modal
            centered
            className={styles.modalContent}
            contentLabel={props.intl.formatMessage(messages.title)}
            height={560}
            id="extensionManagerModal"
            minHeight={420}
            minWidth={500}
            onRequestClose={props.onClose}
            width={680}
        >
            <div className={styles.body}>
                <div className={styles.listToolbar}>
                    <div>
                        <strong>
                            <FormattedMessage
                                defaultMessage="Loaded extensions"
                                id="tw.extensionManager.loadedHeading"
                            />
                        </strong>
                        <span className={styles.summary}>
                            <FormattedMessage
                                defaultMessage="{count} extensions · {totalBlocks} blocks"
                                id="tw.extensionManager.summary"
                                values={{count: extensionIds.length, totalBlocks}}
                            />
                        </span>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            aria-label={props.intl.formatMessage(messages.refresh)}
                            className={styles.iconButton}
                            onClick={handleRefresh}
                            title={props.intl.formatMessage(messages.refresh)}
                        >
                            <RefreshCw />
                        </button>
                    </div>
                </div>

                {extensionIds.length === 0 ? (
                    <div className={styles.state}>
                        <strong>
                            <FormattedMessage
                                defaultMessage="No extensions loaded"
                                id="tw.extensionManager.noneLoaded"
                            />
                        </strong>
                        <span>
                            {props.intl.formatMessage(messages.noneLoadedDescription)}
                        </span>
                    </div>
                ) : (
                    <div className={styles.table}>
                        <div className={styles.tableHeader}>
                            <span>
                                <FormattedMessage
                                    defaultMessage="Extension"
                                    id="tw.extensionManager.extensionColumn"
                                />
                            </span>
                            <span>
                                <FormattedMessage
                                    defaultMessage="Blocks"
                                    id="tw.extensionManager.blocksColumn"
                                />
                            </span>
                            <span />
                        </div>
                        <div className={styles.extensionContainer}>
                            {extensionIds.map((extensionId, index) => {
                                const extensionColor = getExtensionColor(extensionId);
                                const count = blockCounts.get(extensionId) || 0;
                                return (
                                    <div
                                        className={`${styles.extensionRow}${dragIndex === index ? ` ${styles.dragging}` : ''}`}
                                        key={extensionId}
                                        draggable={props.draggable}
                                        data-index={index}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        style={extensionColor ? {borderLeft: `4px solid ${extensionColor}`} : null}
                                    >
                                        <div className={styles.extensionInfo}>
                                            <span
                                                className={styles.extensionIconCircle}
                                                style={extensionColor ? {backgroundColor: extensionColor} : null}
                                            >
                                                {getExtensionIconURL(extensionId) ? (
                                                    <img
                                                        className={styles.extensionIcon}
                                                        src={getExtensionIconURL(extensionId)}
                                                        alt=""
                                                        aria-hidden="true"
                                                        draggable={false}
                                                    />
                                                ) : null}
                                            </span>
                                            <span className={styles.extensionName}>{getExtensionName(extensionId)}</span>
                                        </div>
                                        <div className={styles.blocksCell}>
                                            <strong>{count}</strong>
                                            <span>
                                                {count === 0 ? (
                                                    <FormattedMessage
                                                        defaultMessage="No blocks used"
                                                        id="tw.extensionManager.noBlocks"
                                                    />
                                                ) : (
                                                    <FormattedMessage
                                                        defaultMessage="blocks"
                                                        id="tw.extensionManager.blocksUnit"
                                                    />
                                                )}
                                            </span>
                                        </div>
                                        <div className={styles.extensionActions}>
                                            <span
                                                className={styles.dragHandle}
                                                onDragStart={stopDragAndClickBubbling}
                                                onMouseDown={stopDragAndClickBubbling}
                                                title={props.intl.formatMessage(messages.dragHint)}
                                            >
                                                <GripVertical />
                                            </span>
                                            <button
                                                aria-label={props.intl.formatMessage(messages.deleteExtension)}
                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                                onClick={() => removeExtension(extensionId)}
                                                onDragStart={stopDragAndClickBubbling}
                                                onMouseDown={stopDragAndClickBubbling}
                                                title={props.intl.formatMessage(messages.deleteExtension)}
                                            >
                                                <Trash2 />
                                            </button>
                                            <FancyCheckbox
                                                className={styles.checkboxOption}
                                                checked={selected.includes(extensionId)}
                                                onChange={updateSelection}
                                                value={extensionId}
                                                draggable={false}
                                                onClick={stopDragAndClickBubbling}
                                                onMouseDown={stopDragAndClickBubbling}
                                                onDragStart={stopDragAndClickBubbling}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {extensionIds.length > 0 ? (
                    <div className={styles.footer}>
                        <span>
                            {props.intl.formatMessage(messages.dragHint)}
                        </span>
                        <button
                            className={styles.deleteAllButton}
                            disabled={selected.length === 0}
                            onClick={removeSelected}
                        >
                            <Trash2 />
                            {props.intl.formatMessage(messages.deleteSelected, {count: selected.length})}
                        </button>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
};

ExtensionManagerModal.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func.isRequired,
    vm: PropTypes.shape({
        on: PropTypes.func,
        off: PropTypes.func,
        runtime: PropTypes.shape({
            on: PropTypes.func,
            off: PropTypes.func,
            targets: PropTypes.arrayOf(PropTypes.object)
        }),
        extensionManager: PropTypes.shape({
            _loadedExtensions: PropTypes.instanceOf(Map),
            removeExtension: PropTypes.func,
            reorderExtension: PropTypes.func
        })
    }),
    draggable: PropTypes.bool
};

ExtensionManagerModal.defaultProps = {
    draggable: true
};

export default injectIntl(ExtensionManagerModal);

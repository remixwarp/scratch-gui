import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {connect} from 'react-redux';
import Blocks from '../../containers/blocks.jsx';
import styles from './multi-workspaces.css';

const MultiWorkspaces = ({vm, theme, canUseCloud, stageSize, onOpenCustomExtensionModal, editingTarget, workspaceMetrics}) => {
    const [workspaces, setWorkspaces] = useState(() => {
        const runtime = vm && vm.runtime;
        const stage = runtime ? runtime.getTargetForStage() : null;
        const editId = editingTarget || (runtime && runtime.getEditingTarget && runtime.getEditingTarget() && runtime.getEditingTarget().id);
        const first = editId || (stage ? stage.id : null);
        const second = stage ? stage.id : null;
        const ids = [];
        if (first) ids.push(first);
        if (second && second !== first) ids.push(second);
        if (ids.length === 0) ids.push(null);
        return ids.map(id => ({id}));
    });
    const [activeIndex, setActiveIndex] = useState(0);
    const [targetNames, setTargetNames] = useState({});
    // derived: whether we can add another workspace (sprite count + 1 for stage)

    useEffect(() => {
        const id = workspaces[activeIndex] && workspaces[activeIndex].id;
        if (id && vm && typeof vm.setEditingTarget === 'function') {
            vm.setEditingTarget(id);
        }
    }, [activeIndex, workspaces, vm]);

    useEffect(() => {
        const updateNames = () => {
            try {
                const runtime = vm && vm.runtime;
                const targets = runtime ? runtime.targets : [];
                const names = {};
                for (const t of targets) {
                    if (t && t.id) names[t.id] = t.getName();
                }
                const stage = runtime ? runtime.getTargetForStage() : null;
                if (stage && stage.id) names[stage.id] = stage.getName();
                setTargetNames(names);
            } catch (e) {
                // ignore
            }
        };
        updateNames();
        const handler = () => updateNames();
        if (vm && typeof vm.addListener === 'function') {
            vm.addListener('targetsUpdate', handler);
        }
        return () => {
            if (vm && typeof vm.removeListener === 'function') {
                vm.removeListener('targetsUpdate', handler);
            }
        };
    }, [vm]);

    // When external editingTarget changes (user clicked a sprite/backdrop), add a workspace for it
    useEffect(() => {
        if (!editingTarget) return;
        const exists = workspaces.find(w => w.id === editingTarget);
        if (!exists) {
            setWorkspaces(prev => {
                const next = prev.concat({id: editingTarget});
                return next;
            });
            setActiveIndex(workspaces.length);
        } else {
            const idx = workspaces.findIndex(w => w.id === editingTarget);
            if (idx >= 0) setActiveIndex(idx);
        }
    }, [editingTarget]);

    const addWorkspace = () => {
        const runtime = vm && vm.runtime;
        const targets = runtime ? runtime.targets : [];
        const candidate = targets && targets.find(t => t && !t.isStage && !workspaces.find(w => w.id === t.id));
        const id = candidate ? candidate.id : (vm && vm.runtime && vm.runtime.getTargetForStage() && vm.runtime.getTargetForStage().id);
        const nextIndex = workspaces.length;
        setWorkspaces([...workspaces, {id}]);
        setActiveIndex(nextIndex);
    };

    const removeWorkspace = index => {
        if (workspaces.length <= 1) return;
        const next = workspaces.slice(0, index).concat(workspaces.slice(index + 1));
        setWorkspaces(next);
        setActiveIndex(Math.max(0, Math.min(index, next.length - 1)));
    };

    const selectWorkspace = index => {
        setActiveIndex(index);
    };

    return (
        <div className={styles.multiWrapper}>
            <div className={styles.toolbar}>
                {workspaces.map((w, i) => (
                    <button
                        key={i}
                        className={classNames(styles.tab, {[styles.activeTab]: i === activeIndex})}
                        onClick={() => selectWorkspace(i)}
                        title={targetNames[w.id] || '未选择'}
                    >
                        {targetNames[w.id] || '未选择'}
                        {workspaces.length > 1 ? (
                            <span className={styles.close} onClick={(e) => { e.stopPropagation(); removeWorkspace(i); }}>×</span>
                        ) : null}
                    </button>
                ))}
                {/* Show add button only when there are remaining targets to create workspaces for. Otherwise show text only. */}
                {(() => {
                    const runtime = vm && vm.runtime;
                    const targets = runtime ? runtime.targets : [];
                    const spriteCount = targets ? targets.filter(t => t && !t.isStage).length : 0;
                    const maxWorkspaces = spriteCount + 1; // include stage
                    const canAdd = workspaces.length < maxWorkspaces;
                    if (canAdd) {
                        return (
                            <button
                                className={styles.addBtn}
                                onClick={addWorkspace}
                                title={'添加工作区'}
                            >
                                +
                            </button>
                        );
                    }
                    return <span className={styles.noMore}>无更多工作区</span>;
                })()}
            </div>
            <div className={styles.blocksContainer}>
                <Blocks
                    key={`multi-blocks-${activeIndex}`}
                    canUseCloud={canUseCloud}
                    grow={1}
                    isVisible
                    options={{media: `static/${theme.getBlocksMediaFolder()}/`}}
                    stageSize={stageSize}
                    onOpenCustomExtensionModal={onOpenCustomExtensionModal}
                    theme={theme}
                    vm={vm}
                />
            </div>
        </div>
    );
};

MultiWorkspaces.propTypes = {
    vm: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired,
    canUseCloud: PropTypes.bool,
    stageSize: PropTypes.string,
    onOpenCustomExtensionModal: PropTypes.func,
    editingTarget: PropTypes.string
};

const mapStateToProps = state => ({
    editingTarget: state.scratchGui.targets && state.scratchGui.targets.editingTarget,
    workspaceMetrics: state.scratchGui.workspaceMetrics
});

export default connect(mapStateToProps)(MultiWorkspaces);

import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {connect} from 'react-redux';
import Blocks from '../../containers/blocks.jsx';
import styles from './multi-workspaces.css';

/**
 * MultiWorkspaces 组件
 * - 顶部工具栏：[角色标签1][角色标签2]... [+添加工作区] [⊢拆分编辑器(并排)] [×取消拆分]
 * - 拆分模式下：积木盒并排左右两列，每列独立显示不同角色代码，可同时编辑
 * - 非拆分模式下：单积木盒 + 标签切换
 */
const MultiWorkspaces = ({vm, theme, canUseCloud, stageSize, onOpenCustomExtensionModal, editingTarget, workspaceMetrics}) => {
    // ========== 工作区列表 ==========
    // 每个 workspace: { id: targetId }
    const [workspaces, setWorkspaces] = useState(() => {
        const runtime = vm && vm.runtime;
        const stage = runtime ? runtime.getTargetForStage() : null;
        const editId = editingTarget || (runtime && runtime.getEditingTarget && runtime.getEditingTarget() && runtime.getEditingTarget().id);
        const first = editId || (stage ? stage.id : null);
        const ids = [];
        if (first) ids.push(first);
        if (ids.length === 0) ids.push(null);
        return ids.map(id => ({id}));
    });

    // 当前选中的工作区（0 为左侧或单工作区；1 为右侧）
    const [activeIndex, setActiveIndex] = useState(0);

    // 是否处于拆分编辑器模式（左右并排）
    const [splitMode, setSplitMode] = useState(false);

    // 角色名缓存
    const [targetNames, setTargetNames] = useState({});

    // ========== 切换 activeIndex → vm.setEditingTarget ==========
    useEffect(() => {
        const id = workspaces[activeIndex] && workspaces[activeIndex].id;
        if (id && vm && typeof vm.setEditingTarget === 'function') {
            vm.setEditingTarget(id);
        }
    }, [activeIndex, workspaces, vm]);

    // ========== 更新角色名 ==========
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

    // ========== 外部点击角色 → 添加/切换工作区 ==========
    useEffect(() => {
        if (!editingTarget) return;
        const exists = workspaces.find(w => w.id === editingTarget);
        if (!exists) {
            setWorkspaces(prev => {
                const next = prev.concat({id: editingTarget});
                return next;
            });
            // 加入到当前激活索引
            setActiveIndex(workspaces.length);
        } else {
            const idx = workspaces.findIndex(w => w.id === editingTarget);
            if (idx >= 0) setActiveIndex(idx);
        }
    }, [editingTarget]);

    // ========== 添加工作区 ==========
    const addWorkspace = () => {
        const runtime = vm && vm.runtime;
        const targets = runtime ? runtime.targets : [];
        // 找一个尚未添加过的角色
        const candidate = targets && targets.find(t => t && !t.isStage && !workspaces.find(w => w.id === t.id));
        const id = candidate ? candidate.id : (vm && vm.runtime && vm.runtime.getTargetForStage() && vm.runtime.getTargetForStage().id);
        const nextIndex = workspaces.length;
        setWorkspaces([...workspaces, {id}]);
        setActiveIndex(nextIndex);
    };

    // ========== 删除工作区 ==========
    const removeWorkspace = index => {
        if (workspaces.length <= 1) return;
        const next = workspaces.slice(0, index).concat(workspaces.slice(index + 1));
        setWorkspaces(next);
        setActiveIndex(Math.max(0, Math.min(index, next.length - 1)));
    };

    // ========== 切换工作区 ==========
    const selectWorkspace = index => {
        setActiveIndex(index);
    };

    // ========== 点击标签：切换到拆分模式时该工作区位置 ==========
    const setWorkspaceTarget = (index, targetId) => {
        setWorkspaces(prev => prev.map((w, i) => i === index ? {...w, id: targetId} : w));
    };

    // ========== 拆分编辑器：打开并排模式 ==========
    const enableSplitMode = () => {
        // 确保至少 2 个工作区：如果没有，则添加第二个
        if (workspaces.length < 2) {
            const runtime = vm && vm.runtime;
            const targets = runtime ? runtime.targets : [];
            const candidate = targets && targets.find(t => t && !t.isStage && t.id !== workspaces[0].id);
            const id = candidate ? candidate.id : (vm && vm.runtime && vm.runtime.getTargetForStage() && vm.runtime.getTargetForStage().id);
            if (id) {
                setWorkspaces([...workspaces, {id}]);
            }
        }
        setSplitMode(true);
    };

    const disableSplitMode = () => {
        setSplitMode(false);
    };

    // ========== 渲染 Blocks 组件 ==========
    const renderBlocks = (index) => {
        const w = workspaces[index];
        return (
            <Blocks
                key={`multi-blocks-${index}-${w ? w.id : 'null'}`}
                canUseCloud={canUseCloud}
                grow={1}
                isVisible
                options={{media: `static/${theme.getBlocksMediaFolder()}/`}}
                stageSize={stageSize}
                onOpenCustomExtensionModal={onOpenCustomExtensionModal}
                theme={theme}
                vm={vm}
                workspaceIndex={index}
                workspaceTargetId={w ? w.id : undefined}
            />
        );
    };

    // ========== 辅助：计算能否再添加工作区 ==========
    const canAddMoreWorkspaces = () => {
        const runtime = vm && vm.runtime;
        const targets = runtime ? runtime.targets : [];
        const spriteCount = targets ? targets.filter(t => t && !t.isStage).length : 0;
        const maxWorkspaces = spriteCount + 1; // 角色数 + 1 个舞台
        return workspaces.length < maxWorkspaces;
    };

    // ========== 渲染：工作区标签（+ 角色下拉菜单） ==========
    const renderWorkspaceTab = (w, i) => {
        const runtime = vm && vm.runtime;
        const targets = runtime ? runtime.targets : [];
        const name = targetNames[w.id] || (w.id ? '未选择' : '未设置');

        return (
            <button
                key={i}
                className={classNames(styles.tab, {[styles.activeTab]: i === activeIndex})}
                onClick={() => selectWorkspace(i)}
                title={name}
            >
                <select
                    className={styles.tabSelect}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        e.stopPropagation();
                        setWorkspaceTarget(i, e.target.value);
                        setActiveIndex(i);
                    }}
                    value={w.id || ''}
                >
                    {targets && targets.map(t => (
                        <option key={t.id} value={t.id}>
                            {(t.isStage ? '🎬 ' : '🧍 ') + (targetNames[t.id] || t.id)}
                        </option>
                    ))}
                </select>
                {workspaces.length > 1 ? (
                    <span className={styles.close} onClick={(e) => { e.stopPropagation(); removeWorkspace(i); }}>×</span>
                ) : null}
            </button>
        );
    };

    return (
        <div className={styles.multiWrapper}>
            {/* 顶部工具栏 */}
            <div className={styles.toolbar}>
                {/* 拆分模式：左工作区标签（激活=split模式下0） */}
                {splitMode ? (
                    <>
                        <div className={styles.splitGroup}>
                            <span className={styles.splitLabel}>左:</span>
                            {renderWorkspaceTab(workspaces[0] || {id: null}, 0)}
                        </div>
                        <div className={styles.splitGroup}>
                            <span className={styles.splitLabel}>右:</span>
                            {workspaces[1] ? renderWorkspaceTab(workspaces[1], 1) : (
                                <button className={classNames(styles.tab)} onClick={addWorkspace} title="添加右侧工作区">
                                    + 右
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    /* 非拆分模式：所有工作区标签依次排列 */
                    workspaces.map((w, i) => renderWorkspaceTab(w, i))
                )}

                {/* 右侧：添加工作区按钮 */}
                {canAddMoreWorkspaces() ? (
                    <button
                        className={styles.addBtn}
                        onClick={addWorkspace}
                        title={'添加工作区'}
                    >
                        +
                    </button>
                ) : null}

                {/* 拆分编辑器切换按钮 */}
                {splitMode ? (
                    <button
                        className={classNames(styles.splitBtn, styles.splitBtnActive)}
                        onClick={disableSplitMode}
                        title={'取消拆分编辑器'}
                    >
                        ⏹ 取消拆分
                    </button>
                ) : (
                    <button
                        className={styles.splitBtn}
                        onClick={enableSplitMode}
                        title={'向右拆分编辑器（并排显示两个工作区）'}
                    >
                        ⊢ 拆分
                    </button>
                )}
            </div>

            {/* 积木盒区域 */}
            {splitMode ? (
                <div className={styles.blocksSplitContainer}>
                    <div className={styles.blocksPanel}>
                        <div className={styles.blocksPanelTitle}>
                            {workspaces[0] ? (targetNames[workspaces[0].id] || '未设置') : '未设置'}
                        </div>
                        {renderBlocks(0)}
                    </div>
                    <div className={styles.blocksDivider} />
                    <div className={styles.blocksPanel}>
                        <div className={styles.blocksPanelTitle}>
                            {workspaces[1] ? (targetNames[workspaces[1].id] || '未设置') : '未设置'}
                        </div>
                        {workspaces[1] ? renderBlocks(1) : (
                            <div className={styles.blocksEmpty}>
                                <button className={styles.addWorkspaceHereBtn} onClick={addWorkspace}>
                                    + 添加右侧工作区
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className={styles.blocksContainer}>
                    {renderBlocks(activeIndex)}
                </div>
            )}
        </div>
    );
};

MultiWorkspaces.propTypes = {
    vm: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired,
    canUseCloud: PropTypes.bool,
    stageSize: PropTypes.string,
    onOpenCustomExtensionModal: PropTypes.func,
    editingTarget: PropTypes.string,
    workspaceMetrics: PropTypes.object
};

const mapStateToProps = state => ({
    editingTarget: state.scratchGui.targets && state.scratchGui.targets.editingTarget,
    workspaceMetrics: state.scratchGui.workspaceMetrics
});

export default connect(mapStateToProps)(MultiWorkspaces);

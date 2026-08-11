import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {connect} from 'react-redux';
import Blocks from '../../containers/blocks.jsx';
import styles from './multi-workspaces.css';

/**
 * MultiWorkspaces 组件
 * - 顶部工具栏：[角色标签1][角色标签2]... [+添加工作区]
 * - 单个积木盒 + 标签切换：每个标签可通过倒三角下拉选择角色/背景
 */
const MultiWorkspaces = ({vm, theme, canUseCloud, stageSize, onOpenCustomExtensionModal, editingTarget}) => {
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

    // 当前选中的工作区
    const [activeIndex, setActiveIndex] = useState(0);

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
        setWorkspaces(prev => {
            if (prev.some(w => w.id === editingTarget)) return prev;
            return prev.concat({id: editingTarget});
        });
    }, [editingTarget]);

    // 当编辑目标已存在于工作区列表中时，同步激活索引
    useEffect(() => {
        if (!editingTarget) return;
        const idx = workspaces.findIndex(w => w.id === editingTarget);
        if (idx >= 0) setActiveIndex(idx);
    }, [editingTarget, workspaces]);

    // ========== 添加工作区 ==========
    const addWorkspace = () => {
        const runtime = vm && vm.runtime;
        const targets = runtime ? runtime.targets : [];
        const used = workspaces.map(w => w && w.id).filter(Boolean);
        // 找一个尚未添加过的角色
        const candidate = targets && targets.find(t => t && !t.isStage && !used.includes(t.id));
        const stage = runtime ? runtime.getTargetForStage() : null;
        const id = candidate ? candidate.id : (stage && !used.includes(stage.id) ? stage.id : null);
        if (!id) return;
        const nextIndex = workspaces.length;
        setWorkspaces(prev => {
            if (prev.some(w => w.id === id)) return prev;
            return [...prev, {id}];
        });
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

    // ========== 标签下拉菜单（点倒三角才展开） ==========
    const [dropdownOpenTab, setDropdownOpenTab] = useState(null);
    useEffect(() => {
        if (dropdownOpenTab === null) return undefined;
        const handler = (e) => {
            if (!e.target.closest || !e.target.closest('[data-mw-tab-dropdown]')) {
                setDropdownOpenTab(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOpenTab]);

    // ========== 设置某个工作区的目标（角色/背景） ==========
    const setWorkspaceTarget = (index, targetId) => {
        setWorkspaces(prev => prev.map((w, i) => i === index ? {...w, id: targetId} : w));
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
        const isOpen = dropdownOpenTab === i;

        return (
            <div
                key={i}
                className={classNames(styles.tab, {[styles.activeTab]: i === activeIndex})}
            >
                <button
                    type="button"
                    className={styles.tabMain}
                    onClick={() => selectWorkspace(i)}
                    title={name}
                >
                    {name}
                </button>
                <button
                    type="button"
                    className={classNames(styles.tabCaret, {[styles.tabCaretOpen]: isOpen})}
                    onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpenTab(isOpen ? null : i);
                    }}
                    title={'选择角色/背景'}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                >
                    <svg width="10" height="6" viewBox="0 0 10 6" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0 L5 6 L10 0 Z" fill="currentColor" />
                    </svg>
                </button>
                {workspaces.length > 1 ? (
                    <span
                        className={styles.close}
                        onClick={(e) => { e.stopPropagation(); removeWorkspace(i); }}
                        title={'关闭该工作区'}
                    >×</span>
                ) : null}
                {isOpen ? (
                    <ul
                        className={styles.tabMenu}
                        data-mw-tab-dropdown
                        onClick={(e) => e.stopPropagation()}
                        role="menu"
                    >
                        {targets && targets.map(t => (
                            <li
                                key={t.id}
                                role="menuitem"
                                className={classNames(styles.tabMenuItem, {
                                    [styles.tabMenuItemSelected]: t.id === w.id
                                })}
                                onClick={() => {
                                    setWorkspaceTarget(i, t.id);
                                    setActiveIndex(i);
                                    setDropdownOpenTab(null);
                                }}
                            >
                                <span className={styles.tabMenuItemIcon}>
                                    {t.isStage ? '舞台' : '角色'}
                                </span>
                                <span className={styles.tabMenuItemLabel}>
                                    {targetNames[t.id] || t.id}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        );
    };

    return (
        <div className={styles.multiWrapper}>
            {/* 顶部工具栏：所有工作区标签依次排列 */}
            <div className={styles.toolbar}>
                {workspaces.map((w, i) => renderWorkspaceTab(w, i))}

                {/* 添加工作区按钮 */}
                {canAddMoreWorkspaces() ? (
                    <button
                        className={styles.addBtn}
                        onClick={addWorkspace}
                        title={'添加工作区'}
                    >
                        +
                    </button>
                ) : null}
            </div>

            {/* 积木盒区域：单积木盒，随激活标签切换 */}
            <div className={styles.blocksContainer}>
                {renderBlocks(activeIndex)}
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
    editingTarget: state.scratchGui.targets && state.scratchGui.targets.editingTarget
});

export default connect(mapStateToProps)(MultiWorkspaces);

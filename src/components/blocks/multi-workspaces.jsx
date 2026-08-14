import React, {useEffect, useState, useCallback} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {connect} from 'react-redux';
import Blocks from '../../containers/blocks.jsx';
import styles from './multi-workspaces.css';

/**
 * MultiWorkspaces 组件
 * - 顶部工具栏：[角色标签1][角色标签2]... [+添加工作区] [拆分]
 * - 普通模式：单个积木盒 + 标签切换
 * - 拆分模式：两个积木盒并排显示，各自绑定不同角色
 */
const MultiWorkspaces = ({vm, theme, canUseCloud, stageSize, onOpenCustomExtensionModal, editingTarget}) => {
    // ========== 工作区列表 ==========
    const [workspaces, setWorkspaces] = useState(() => {
        const runtime = vm && vm.runtime;
        const stage = runtime ? runtime.getTargetForStage() : null;
        const editId = editingTarget || (runtime && runtime.getEditingTarget && runtime.getEditingTarget() && runtime.getEditingTarget().id);
        const first = editId || (stage ? stage.id : null);
        return first ? [{id: first, pinned: false}] : [];
    });

    // 当前选中的工作区
    const [activeIndex, setActiveIndex] = useState(0);

    // 角色名缓存
    const [targetNames, setTargetNames] = useState({});

    // ========== 拆分模式状态：null=未拆分，horizontal=左右拆分，vertical=上下拆分 ==========
    const [splitMode, setSplitMode] = useState(null);
    // 拆分模式下，左右两侧各自绑定的 targetId
    const [leftTargetId, setLeftTargetId] = useState(null);
    const [rightTargetId, setRightTargetId] = useState(null);

    // ========== 切换 activeIndex → vm.setEditingTarget ==========
    useEffect(() => {
        if (splitMode !== null) return; // 拆分模式下不切换编辑目标
        const id = workspaces[activeIndex] && workspaces[activeIndex].id;
        if (id && vm && typeof vm.setEditingTarget === 'function') {
            vm.setEditingTarget(id);
        }
    }, [activeIndex, workspaces, vm, splitMode]);

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
            return prev.concat({id: editingTarget, pinned: false});
        });
    }, [editingTarget]);

    // 当编辑目标已存在于工作区列表中时，同步激活索引
    useEffect(() => {
        if (!editingTarget || splitMode !== null) return;
        const idx = workspaces.findIndex(w => w.id === editingTarget);
        if (idx >= 0) setActiveIndex(idx);
    }, [editingTarget, workspaces, splitMode]);

    // ========== 添加工作区 ==========
    const addWorkspace = () => {
        const runtime = vm && vm.runtime;
        const targets = runtime ? runtime.targets : [];
        const used = workspaces.map(w => w && w.id).filter(Boolean);
        const candidate = targets && targets.find(t => t && !t.isStage && !used.includes(t.id));
        const stage = runtime ? runtime.getTargetForStage() : null;
        const id = candidate ? candidate.id : (stage && !used.includes(stage.id) ? stage.id : null);
        if (!id) return;
        const nextIndex = workspaces.length;
        setWorkspaces(prev => {
            if (prev.some(w => w.id === id)) return prev;
            return [...prev, {id, pinned: false}];
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

    // ========== 固定 / 取消固定工作区 ==========
    const togglePin = index => {
        setWorkspaces(prev => prev.map((w, i) => i === index ? {...w, pinned: !w.pinned} : w));
    };

    // ========== 标签右键菜单 ==========
    const [contextMenu, setContextMenu] = useState(null);
    useEffect(() => {
        if (!contextMenu) return undefined;
        const close = (e) => {
            if (e.target && e.target.closest && e.target.closest('[data-mw-context-menu]')) {
                return;
            }
            setContextMenu(null);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('click', close);
        document.addEventListener('contextmenu', close);
        window.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('click', close);
            document.removeEventListener('contextmenu', close);
            window.removeEventListener('scroll', close, true);
        };
    }, [contextMenu]);

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

    // ========== 拆分模式下左右列的下拉菜单 ==========
    const [splitDropdown, setSplitDropdown] = useState(null); // 'left' | 'right' | null
    useEffect(() => {
        if (splitDropdown === null) return undefined;
        const handler = (e) => {
            if (!e.target.closest || !e.target.closest('[data-mw-split-dropdown]')) {
                setSplitDropdown(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [splitDropdown]);

    // ========== 冲突提示 ==========
    const [conflictToast, setConflictToast] = useState({visible: false, message: ''});
    const [conflictDetected, setConflictDetected] = useState(false);
    let conflictTimer = null;

    const showConflictToast = (message) => {
        setConflictToast({visible: true, message});
        setConflictDetected(true);
        if (conflictTimer) clearTimeout(conflictTimer);
        conflictTimer = setTimeout(() => {
            setConflictToast({visible: false, message: ''});
            setConflictDetected(false);
        }, 3000);
    };

    const clearConflict = () => {
        setConflictToast({visible: false, message: ''});
        setConflictDetected(false);
        if (conflictTimer) clearTimeout(conflictTimer);
    };

    // 拆分模式下，检测左右选择相同角色 → 拒绝切换并弹提示
    const handleSplitTargetSelect = (side, targetId) => {
        const otherSide = side === 'left' ? rightTargetId : leftTargetId;
        if (targetId === otherSide && targetId) {
            showConflictToast('左右两侧不能设置成相同的角色/背景');
            setSplitDropdown(null);
            return;
        }
        // 正常切换
        if (side === 'left') {
            setLeftTargetId(targetId);
        } else {
            setRightTargetId(targetId);
        }
        setSplitDropdown(null);
        clearConflict();
    };

    // ========== 设置某个工作区的目标（角色/背景） ==========
    const setWorkspaceTarget = (index, targetId) => {
        setWorkspaces(prev => prev.map((w, i) => i === index ? {...w, id: targetId} : w));
    };

    // ========== 切换拆分模式：null → horizontal → vertical → null ==========
    const toggleSplitMode = useCallback(() => {
        if (splitMode === null) {
            // 进入左右拆分模式
            const runtime = vm && vm.runtime;
            const targets = runtime ? runtime.targets : [];
            const currentId = workspaces[activeIndex] && workspaces[activeIndex].id;

            // 左列：当前工作区绑定的角色
            // 右列：找一个不同的角色
            let leftId = currentId;
            let rightId = null;

            // 找第一个不同于 leftId 的角色
            const other = targets && targets.find(t => t && t.id !== leftId);
            if (other) {
                rightId = other.id;
            } else {
                // 如果没有其他角色，尝试用舞台
                const stage = runtime ? runtime.getTargetForStage() : null;
                if (stage && stage.id !== leftId) {
                    rightId = stage.id;
                } else {
                    rightId = leftId; // 实在没有，先用同一个
                }
            }

            setLeftTargetId(leftId);
            setRightTargetId(rightId);
            setSplitMode('horizontal');
        } else if (splitMode === 'horizontal') {
            // 切换到上下拆分模式，保持角色不变
            setSplitMode('vertical');
        } else {
            // 退出拆分模式
            clearConflict();
            setSplitMode(null);
            setLeftTargetId(null);
            setRightTargetId(null);
        }
    }, [splitMode, workspaces, activeIndex, vm]);

    // ========== 左右交换角色 ==========
    const swapLeftRightTargets = useCallback(() => {
        setLeftTargetId(prevLeft => {
            setRightTargetId(prevRight => prevLeft);
            return rightTargetId;
        });
    }, [rightTargetId]);

    // ========== 渲染 Blocks 组件（普通模式） ==========
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

    // ========== 渲染拆分模式下的单列 ==========
    const renderSplitColumn = (side, targetId) => {
        const runtime = vm && vm.runtime;
        const targets = runtime ? runtime.targets : [];
        const isOpen = splitDropdown === side;

        return (
            <div className={styles.splitColumn}>
                {/* 列头：角色选择器 */}
                <div className={styles.splitColumnHeader}>
                    <span className={styles.splitColumnLabel}>
                        {side === 'left' ? '左列' : '右列'}
                    </span>
                    <div className={styles.splitTargetSelector} data-mw-split-dropdown>
                        <button
                            type="button"
                            className={styles.splitTargetBtn}
                            onClick={() => setSplitDropdown(isOpen ? null : side)}
                            title={targetNames[targetId] || targetId || '选择角色'}
                        >
                            <span className={styles.splitTargetName}>
                                {targetNames[targetId] || (targetId ? '未选择' : '未设置')}
                            </span>
                            <svg width="10" height="6" viewBox="0 0 10 6" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 0 L5 6 L10 0 Z" fill="currentColor" />
                            </svg>
                        </button>
                        {isOpen ? (
                            <ul
                                className={styles.splitTargetMenu}
                                onClick={(e) => e.stopPropagation()}
                                role="menu"
                            >
                                {targets && targets.map(t => (
                                    <li
                                        key={t.id}
                                        role="menuitem"
                                        className={classNames(styles.splitTargetMenuItem, {
                                            [styles.splitTargetMenuItemSelected]: t.id === targetId
                                        })}
                                        onClick={() => {
                                            handleSplitTargetSelect(side, t.id);
                                        }}
                                    >
                                        <span className={styles.splitTargetMenuItemIcon}>
                                            {t.isStage ? '舞台' : '角色'}
                                        </span>
                                        <span className={styles.splitTargetMenuItemLabel}>
                                            {targetNames[t.id] || t.id}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                </div>
                {/* 积木盒 */}
                <div className={styles.splitBlocksWrapper}>
                    <Blocks
                        key={`split-blocks-${splitMode}-${side}-${targetId || 'null'}`}
                        canUseCloud={canUseCloud}
                        grow={1}
                        isVisible
                        options={{media: `static/${theme.getBlocksMediaFolder()}/`}}
                        stageSize={stageSize}
                        onOpenCustomExtensionModal={onOpenCustomExtensionModal}
                        theme={theme}
                        vm={vm}
                        workspaceTargetId={targetId}
                    />
                </div>
            </div>
        );
    };

    // ========== 辅助：计算能否再添加工作区 ==========
    const canAddMoreWorkspaces = () => {
        const runtime = vm && vm.runtime;
        const targets = runtime ? runtime.targets : [];
        const spriteCount = targets ? targets.filter(t => t && !t.isStage).length : 0;
        const maxWorkspaces = spriteCount + 1;
        return workspaces.length < maxWorkspaces;
    };

    // ========== 渲染：工作区标签（+ 角色下拉菜单） ==========
    const renderWorkspaceTab = (w, i) => {
        const runtime = vm && vm.runtime;
        const targets = runtime ? runtime.targets : [];
        const name = targetNames[w.id] || (w.id ? '未选择' : '未设置');
        const isOpen = dropdownOpenTab === i;
        const isPinned = !!w.pinned;

        return (
            <div
                key={i}
                className={classNames(styles.tab, {
                    [styles.activeTab]: i === activeIndex,
                    [styles.tabPinned]: isPinned
                })}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropdownOpenTab(null);
                    setContextMenu({index: i, x: e.clientX, y: e.clientY});
                }}
                onClick={() => {
                    if (contextMenu) setContextMenu(null);
                }}
                title={isPinned ? `${name}（已固定，右键可取消）` : name}
            >
                {isPinned ? (
                    <span className={styles.pinDot} title={'已固定（移到上面可删除）'} />
                ) : null}
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
                {isPinned ? (
                    <span
                        className={styles.closeAsDot}
                        onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu(null);
                            removeWorkspace(i);
                        }}
                        title={'取消固定并删除该工作区'}
                    >
                        <span className={styles.closeDotGlyph} />
                        <span className={styles.closeXGlyph}>×</span>
                    </span>
                ) : (workspaces.length > 1 ? (
                    <span
                        className={styles.close}
                        onClick={(e) => { e.stopPropagation(); setContextMenu(null); removeWorkspace(i); }}
                        title={'关闭该工作区'}
                    >×</span>
                ) : null)}
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
            {/* 顶部工具栏 */}
            <div className={styles.toolbar}>
                {splitMode === null ? (
                    <>
                        {workspaces.map((w, i) => renderWorkspaceTab(w, i))}
                    </>
                ) : (
                    <span className={styles.splitModeLabel}>
                        <span className={styles.splitModeTag}>{targetNames[leftTargetId] || '未选择'}</span>
                        <button
                            type="button"
                            className={styles.swapBtn}
                            onClick={swapLeftRightTargets}
                            title="交换左右角色"
                        >
                            <svg className={styles.swapBtnIcon} viewBox="0 0 1217 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                                <path d="M81.279482 403.912645l1.601294-0.055217 1054.866326-0.110434h0.55217a54.112699 54.112699 0 0 0 54.057482-53.33966 52.732273 52.732273 0 0 0-23.246374-44.78102L775.026368 35.780642a55.051389 55.051389 0 0 0-74.211701 11.871663l-1.766945 2.374333a52.014451 52.014451 0 0 0-8.503424 39.424966 51.904017 51.904017 0 0 0 21.755513 33.903263l253.611863 173.712806H83.101645a53.450094 53.450094 0 0 0-1.822163 106.844972zM1137.471016 619.976921H82.273389a54.112699 54.112699 0 0 0-54.057482 53.394877 52.897924 52.897924 0 0 0 23.301591 44.781019l394.028795 269.790456v0.055217c9.276463 6.294743 20.099002 9.607765 31.308061 9.607765h0.165651a55.051389 55.051389 0 0 0 44.449717-22.528552l1.104341-1.546077a52.621839 52.621839 0 0 0-14.35643-72.996927l-253.611863-173.712806H1137.471016a53.450094 53.450094 0 0 0 0-106.844972z" />
                            </svg>
                        </button>
                        <span className={styles.splitModeTag}>{targetNames[rightTargetId] || '未选择'}</span>
                    </span>
                )}

                <div className={styles.toolbarRight}>
                    {/* 拆分按钮：null→未拆分，horizontal→左右拆分，vertical→上下拆分 */}
                    <button
                        className={classNames(styles.splitBtn, {
                            [styles.splitBtnConflict]: conflictDetected
                        })}
                        onClick={toggleSplitMode}
                        title={splitMode === null ? '拆分积木盒' : splitMode === 'horizontal' ? '切换为上下拆分' : '取消拆分'}
                    >
                        <svg className={classNames(styles.splitBtnIcon, {
                            [styles.splitBtnIconRotate90]: splitMode === 'horizontal',
                            [styles.splitBtnIconRotate180]: splitMode === 'vertical'
                        })} viewBox="0 0 1024 1024" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                            <path d="M59.448889 133.575111m56.888889 0l227.555555 0q56.888889 0 56.888889 56.888889l0 625.777778q0 56.888889-56.888889 56.888889l-227.555555 0q-56.888889 0-56.888889-56.888889l0-625.777778q0-56.888889 56.888889-56.888889Z" />
                            <path d="M628.337778 133.575111m56.888889 0l227.555555 0q56.888889 0 56.888889 56.888889l0 625.777778q0 56.888889-56.888889 56.888889l-227.555555 0q-56.888889 0-56.888889-56.888889l0-625.777778q0-56.888889 56.888889-56.888889Z" />
                            <path d="M487.879111 102.741333h56.888889v113.777778h-56.888889v-113.777778z m0 227.555556h56.888889v113.777778h-56.888889v-113.777778z m0 227.555555h56.888889v113.777778h-56.888889v-113.777778z m0 227.555556h56.888889v113.777778h-56.888889v-113.777778z" />
                        </svg>
                    </button>
                    {splitMode === null && canAddMoreWorkspaces() ? (
                        <button
                            className={styles.addBtn}
                            onClick={addWorkspace}
                            title={'添加工作区'}
                        >
                            +
                        </button>
                    ) : null}
                </div>
            </div>

            {/* 冲突提示弹层 */}
            {conflictToast.visible ? (
                <div className={styles.toast}>
                    <span className={styles.toastIcon}>!</span>
                    <span className={styles.toastText}>{conflictToast.message}</span>
                    <button
                        className={styles.toastClose}
                        onClick={() => clearConflict()}
                        title="关闭"
                    >×</button>
                </div>
            ) : null}

            {/* 积木盒区域 */}
            {splitMode !== null ? (
                <div className={classNames(styles.splitContainer, {
                    [styles.splitContainerVertical]: splitMode === 'vertical'
                })}>
                    {renderSplitColumn('left', leftTargetId)}
                    <div className={classNames(styles.splitDivider, {
                        [styles.splitDividerVertical]: splitMode === 'vertical'
                    })} />
                    {renderSplitColumn('right', rightTargetId)}
                </div>
            ) : (
                <div className={styles.blocksContainer}>
                    {renderBlocks(activeIndex)}
                </div>
            )}

            {/* 标签右键菜单 */}
            {contextMenu ? (
                <ul
                    className={styles.contextMenu}
                    data-mw-context-menu
                    style={{left: contextMenu.x, top: contextMenu.y}}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => e.stopPropagation()}
                    role="menu"
                >
                    <li
                        role="menuitem"
                        className={styles.contextMenuItem}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => {
                            togglePin(contextMenu.index);
                            setContextMenu(null);
                        }}
                    >
                        <span className={styles.contextMenuIcon}>
                            {workspaces[contextMenu.index] && workspaces[contextMenu.index].pinned ? '取消固定' : '固定'}
                        </span>
                    </li>
                    {workspaces.length > 1 ? (
                        <li
                            role="menuitem"
                            className={classNames(styles.contextMenuItem, styles.contextMenuDanger)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => {
                                const idx = contextMenu.index;
                                setContextMenu(null);
                                removeWorkspace(idx);
                            }}
                        >
                            <span className={styles.contextMenuIcon}>删除</span>
                        </li>
                    ) : null}
                </ul>
            ) : null}
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
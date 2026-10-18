import React, {useState, useEffect} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import VM from 'scratch-vm';
import {
    MousePointer2,
    Monitor,
    Boxes,
    Layers,
    Gauge,
    Play,
    Square,
    Wifi,
    ZoomIn
} from 'lucide-react';

import styles from './status-bar.css';
import {
    getVisibleOrderedIds,
    CHANGE_EVENT,
    RIGHT_FIXED
} from '../../lib/mw-status-bar-layout';

const StatusBar = ({vm, theme, messages}) => {
    const [blockCount, setBlockCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [spriteName, setSpriteName] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [mouseCoords, setMouseCoords] = useState({x: 0, y: 0});
    const [stageMouseCoords, setStageMouseCoords] = useState({x: 0, y: 0});
    const [zoomLevel, setZoomLevel] = useState(100);
    const [onlineStatus, setOnlineStatus] = useState(navigator.onLine ? 'ready' : 'offline');
    // 由高级设置中的状态栏布局决定的可见段顺序
    const [visibleIds, setVisibleIds] = useState(getVisibleOrderedIds);

    // 监听布局配置变更（拖动排序 / 勾选隐藏后实时重排）
    useEffect(() => {
        const onLayoutChanged = () => setVisibleIds(getVisibleOrderedIds());
        window.addEventListener(CHANGE_EVENT, onLayoutChanged);
        return () => window.removeEventListener(CHANGE_EVENT, onLayoutChanged);
    }, []);

    // 积木数 + 当前角色名 + 缩放比例：300ms 轮询
    useEffect(() => {
        const update = () => {
            const count = (typeof window.__blockCountValue === 'number') ? window.__blockCountValue : 0;
            setBlockCount(count);
            if (vm && vm.editingTarget) {
                try {
                    const name = vm.editingTarget.sprite && vm.editingTarget.sprite.name
                        ? vm.editingTarget.sprite.name
                        : (vm.editingTarget.getName ? vm.editingTarget.getName() : '');
                    setSpriteName(name || '');
                } catch (e) {
                    // ignore
                }
            }
            // 工作区缩放比例
            const Blockly = window.Blockly;
            if (Blockly) {
                const workspace = Blockly.getMainWorkspace && Blockly.getMainWorkspace();
                if (workspace && workspace.scale) {
                    setZoomLevel(Math.round(workspace.scale * 100));
                }
            }
        };
        update();
        const id = setInterval(update, 300);
        return () => clearInterval(id);
    }, [vm]);

    // 点击重置缩放并居中工作区
    const handleResetZoom = () => {
        const Blockly = window.Blockly;
        if (!Blockly) return;
        const workspace = Blockly.getMainWorkspace && Blockly.getMainWorkspace();
        if (!workspace) return;
        try {
            workspace.setScale(1);
            if (workspace.scrollCenter) {
                workspace.scrollCenter();
            }
            setZoomLevel(100);
        } catch (e) {
            // ignore
        }
    };

    // FPS：从全局 window.__currentFps 读取（与舞台上方 FPS 显示共用同一数据源）
    useEffect(() => {
        const update = () => {
            let val = (typeof window.__currentFps === 'number') ? window.__currentFps : 0;
            if (val === 0 && vm && vm.runtime && vm.runtime.frameLoop) {
                const target = vm.runtime.frameLoop.framerate;
                val = target === 0 ? 60 : target;
            }
            setFps(val);
        };
        update();
        const id = setInterval(update, 500);
        return () => clearInterval(id);
    }, [vm]);

    // 运行状态：监听 VM 事件
    useEffect(() => {
        if (!vm) return;

        const onRunStart = () => setIsRunning(true);
        const onRunStop = () => setIsRunning(false);

        vm.runtime.on('PROJECT_RUN_START', onRunStart);
        vm.runtime.on('PROJECT_RUN_STOP', onRunStop);

        return () => {
            vm.runtime.off('PROJECT_RUN_START', onRunStart);
            vm.runtime.off('PROJECT_RUN_STOP', onRunStop);
        };
    }, [vm]);

    // 鼠标坐标：工作区坐标 + 舞台坐标
    useEffect(() => {
        const handleMouseMove = e => {
            // 1. Blockly 工作区坐标
            const Blockly = window.Blockly;
            if (Blockly) {
                const workspace = Blockly.getMainWorkspace && Blockly.getMainWorkspace();
                const injectionDiv = document.querySelector('.injectionDiv');
                if (workspace && injectionDiv && injectionDiv.contains(e.target)) {
                    try {
                        const m = workspace.getMetrics();
                        if (m) {
                            const scale = workspace.scale || 1;
                            setMouseCoords({
                                x: Math.round((e.clientX - m.absoluteLeft) / scale),
                                y: Math.round((e.clientY - m.absoluteTop) / scale)
                            });
                        }
                    } catch (err) {
                        // 忽略转换错误
                    }
                }
            }

            // 2. 舞台坐标（-240~240 / -180~180，中心为原点，y 向上为正）
            const stageCanvas = document.querySelector('[class*="stage_stage_"] canvas');
            if (stageCanvas) {
                const rect = stageCanvas.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 &&
                    e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    // 舞台尺寸 480x360
                    const stageX = Math.round(((e.clientX - rect.left) / rect.width) * 480 - 240);
                    const stageY = Math.round(180 - ((e.clientY - rect.top) / rect.height) * 360);
                    setStageMouseCoords({x: stageX, y: stageY});
                }
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // 在线状态：监听 navigator.onLine + online/offline 事件
    useEffect(() => {
        const onOnline = () => setOnlineStatus('ready');
        const onOffline = () => setOnlineStatus('offline');
        setOnlineStatus(navigator.onLine ? 'ready' : 'offline');
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const isDark = theme && theme.isDark ? theme.isDark() : false;

    const renderSegment = id => {
        switch (id) {
        case 'workspaceMouse':
            return (
                <div className={styles.segment} data-mw-item="workspaceMouse" title={messages['tw.statusBar.spriteCoord']}>
                    <MousePointer2 size={13} className={styles.icon} />
                    <span className={styles.label}>x: {mouseCoords.x}</span>
                    <span className={styles.label}>y: {mouseCoords.y}</span>
                </div>
            );
        case 'stageMouse':
            return (
                <div className={styles.segment} data-mw-item="stageMouse" title={messages['tw.statusBar.stageCoord']}>
                    <Monitor size={13} className={styles.icon} />
                    <span className={styles.label}>x: {stageMouseCoords.x}</span>
                    <span className={styles.label}>y: {stageMouseCoords.y}</span>
                </div>
            );
        case 'zoom':
            return (
                <div
                    className={`${styles.segment} ${styles.clickable}`}
                    data-mw-item="zoom"
                    title={messages['tw.statusBar.resetZoom']}
                    onClick={handleResetZoom}
                >
                    <ZoomIn size={13} className={styles.icon} />
                    <span className={styles.label}>{zoomLevel}%</span>
                </div>
            );
        case 'blockCount':
            return (
                <div className={styles.segment} data-mw-item="blockCount" title={messages['tw.statusBar.totalBlocks']}>
                    <Boxes size={13} className={styles.icon} />
                    <span className={styles.label}>{(messages['tw.statusBar.blocks'] || '{count} blocks').replace('{count}', blockCount)}</span>
                </div>
            );
        case 'spriteName':
            return (
                <div className={styles.segment} data-mw-item="spriteName" title={messages['tw.statusBar.editingSprite']}>
                    <Layers size={13} className={styles.icon} />
                    <span className={styles.label}>{spriteName || '—'}</span>
                </div>
            );
        case 'fps':
            return (
                <div className={styles.segment} data-mw-item="fps" title={messages['tw.statusBar.renderFps']}>
                    <Gauge size={13} className={styles.icon} />
                    <span className={styles.label}>{(messages['tw.statusBar.fps'] || '{value} FPS').replace('{value}', fps)}</span>
                </div>
            );
        case 'running':
            return (
                <div className={styles.segment} data-mw-item="running" title={messages['tw.statusBar.runState']}>
                    {isRunning ? (
                        <Play size={13} className={`${styles.icon} ${styles.running}`} />
                    ) : (
                        <Square size={11} className={styles.icon} />
                    )}
                    <span className={styles.label}>{isRunning ? messages['tw.statusBar.running'] : messages['tw.statusBar.stopped']}</span>
                </div>
            );
        case 'onlineStatus':
            return (
                <div
                    className={`${styles.segment} ${onlineStatus === 'offline' ? styles.aiBusy : ''}`}
                    data-mw-item="onlineStatus"
                    title={onlineStatus === 'ready' ? messages['tw.statusBar.connected'] : messages['tw.statusBar.noNetwork']}
                >
                    <Wifi size={13} className={styles.icon} />
                    <span className={styles.label}>{onlineStatus === 'ready' ? messages['tw.statusBar.ready'] : messages['tw.statusBar.offline']}</span>
                </div>
            );
        default:
            return null;
        }
    };

    // 渲染一组段，段与段之间插入分隔线
    const renderSegments = ids => {
        const items = [];
        ids.forEach(id => {
            const seg = renderSegment(id);
            if (!seg) return;
            if (items.length > 0) {
                items.push(<div className={styles.divider} key={`divider-${id}`} />);
            }
            items.push(React.cloneElement(seg, {key: id}));
        });
        return items;
    };

    // 普通段在左侧，RIGHT_FIXED 段（如 AI 状态）固定在 spacer 右侧
    const leftIds = visibleIds.filter(id => RIGHT_FIXED.indexOf(id) === -1);
    const rightIds = visibleIds.filter(id => RIGHT_FIXED.indexOf(id) !== -1);

    return (
        <div className={`${styles.statusBar} ${isDark ? styles.dark : styles.light}`}>
            {renderSegments(leftIds)}
            <div className={styles.spacer} />
            {renderSegments(rightIds)}
        </div>
    );
};

StatusBar.propTypes = {
    vm: PropTypes.instanceOf(VM),
    theme: PropTypes.shape({isDark: PropTypes.func}),
    messages: PropTypes.object
};

const mapStateToProps = state => ({
    theme: state.scratchGui.theme.theme,
    messages: state.locales.messages || {}
});

export default connect(mapStateToProps)(StatusBar);

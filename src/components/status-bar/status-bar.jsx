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
    Sparkles,
    ZoomIn
} from 'lucide-react';

import styles from './status-bar.css';

const StatusBar = ({vm, theme}) => {
    const [blockCount, setBlockCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [spriteName, setSpriteName] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [mouseCoords, setMouseCoords] = useState({x: 0, y: 0});
    const [stageMouseCoords, setStageMouseCoords] = useState({x: 0, y: 0});
    const [zoomLevel, setZoomLevel] = useState(100);
    const [aiStatus, setAiStatus] = useState('就绪');

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

    // AI 状态：监听 02agent/novatheai 事件（如果有）
    useEffect(() => {
        const onAIStart = () => setAiStatus('生成中');
        const onAIDone = () => setAiStatus('就绪');
        const onAIError = () => setAiStatus('错误');

        window.addEventListener('02agent-request-start', onAIStart);
        window.addEventListener('02agent-request-done', onAIDone);
        window.addEventListener('02agent-request-error', onAIError);
        window.addEventListener('novatheai-request-start', onAIStart);
        window.addEventListener('novatheai-request-done', onAIDone);
        window.addEventListener('novatheai-request-error', onAIError);

        return () => {
            window.removeEventListener('02agent-request-start', onAIStart);
            window.removeEventListener('02agent-request-done', onAIDone);
            window.removeEventListener('02agent-request-error', onAIError);
            window.removeEventListener('novatheai-request-start', onAIStart);
            window.removeEventListener('novatheai-request-done', onAIDone);
            window.removeEventListener('novatheai-request-error', onAIError);
        };
    }, []);

    const isDark = theme && theme.isDark ? theme.isDark() : false;

    return (
        <div className={`${styles.statusBar} ${isDark ? styles.dark : styles.light}`}>
            <div className={styles.segment} title="鼠标在工作区中的坐标">
                <MousePointer2 size={13} className={styles.icon} />
                <span className={styles.label}>x: {mouseCoords.x}</span>
                <span className={styles.label}>y: {mouseCoords.y}</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.segment} title="鼠标在舞台上的坐标">
                <Monitor size={13} className={styles.icon} />
                <span className={styles.label}>x: {stageMouseCoords.x}</span>
                <span className={styles.label}>y: {stageMouseCoords.y}</span>
            </div>
            <div className={styles.divider} />
            <div
                className={`${styles.segment} ${styles.clickable}`}
                title="点击重置缩放到 100% 并居中"
                onClick={handleResetZoom}
            >
                <ZoomIn size={13} className={styles.icon} />
                <span className={styles.label}>{zoomLevel}%</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.segment} title="项目积木总数">
                <Boxes size={13} className={styles.icon} />
                <span className={styles.label}>{blockCount} 个积木</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.segment} title="当前编辑角色">
                <Layers size={13} className={styles.icon} />
                <span className={styles.label}>{spriteName || '—'}</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.segment} title="渲染帧率">
                <Gauge size={13} className={styles.icon} />
                <span className={styles.label}>{fps} FPS</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.segment} title="项目运行状态">
                {isRunning ? (
                    <Play size={13} className={`${styles.icon} ${styles.running}`} />
                ) : (
                    <Square size={11} className={styles.icon} />
                )}
                <span className={styles.label}>{isRunning ? '运行中' : '已停止'}</span>
            </div>
            <div className={styles.spacer} />
            <div className={`${styles.segment} ${aiStatus === '生成中' ? styles.aiBusy : ''}`} title="AI 助手状态">
                <Sparkles size={13} className={styles.icon} />
                <span className={styles.label}>{aiStatus}</span>
            </div>
        </div>
    );
};

StatusBar.propTypes = {
    vm: PropTypes.instanceOf(VM),
    theme: PropTypes.shape({
        isDark: PropTypes.func
    })
};

const mapStateToProps = state => ({
    theme: state.scratchGui.theme.theme
});

export default connect(mapStateToProps)(StatusBar);

import React, {useState, useCallback} from 'react';
import PropTypes from 'prop-types';
import {ZoomIn, ZoomOut, Move, Maximize2, RotateCcw} from 'lucide-react';
import styles from './stage-camera-controls.css';

const StageCameraControls = ({onZoomIn, onZoomOut, onPan, onReset, onToggleFullscreen}) => {
    const [zoom, setZoom] = useState(100);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({x: 0, y: 0});

    const handleZoomIn = useCallback(() => {
        const newZoom = Math.min(zoom + 10, 200);
        setZoom(newZoom);
        onZoomIn(newZoom);
    }, [zoom, onZoomIn]);

    const handleZoomOut = useCallback(() => {
        const newZoom = Math.max(zoom - 10, 50);
        setZoom(newZoom);
        onZoomOut(newZoom);
    }, [zoom, onZoomOut]);

    const handleMouseDown = useCallback((e) => {
        setIsDragging(true);
        setDragStart({x: e.clientX, y: e.clientY});
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;
            onPan(deltaX, deltaY);
            setDragStart({x: e.clientX, y: e.clientY});
        }
    }, [isDragging, dragStart, onPan]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleReset = useCallback(() => {
        setZoom(100);
        onReset();
    }, [onReset]);

    return (
        <div 
            className={styles.cameraControls}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className={styles.cameraHeader}>
                <span className={styles.cameraTitle}>相机</span>
            </div>
            <div className={styles.cameraButtons}>
                <button 
                    className={styles.cameraButton}
                    onClick={handleZoomIn}
                    title="放大"
                >
                    <ZoomIn size={16} />
                </button>
                <button 
                    className={styles.cameraButton}
                    onClick={handleZoomOut}
                    title="缩小"
                >
                    <ZoomOut size={16} />
                </button>
                <button 
                    className={styles.cameraButton}
                    onClick={handleReset}
                    title="重置视图"
                >
                    <RotateCcw size={16} />
                </button>
                <button 
                    className={styles.cameraButton}
                    onClick={onToggleFullscreen}
                    title="全屏"
                >
                    <Maximize2 size={16} />
                </button>
            </div>
            <div className={styles.zoomDisplay}>
                {zoom}%
            </div>
            <div className={styles.panHint}>
                <Move size={12} />
                <span>拖动平移</span>
            </div>
        </div>
    );
};

StageCameraControls.propTypes = {
    onZoomIn: PropTypes.func,
    onZoomOut: PropTypes.func,
    onPan: PropTypes.func,
    onReset: PropTypes.func,
    onToggleFullscreen: PropTypes.func
};

StageCameraControls.defaultProps = {
    onZoomIn: () => {},
    onZoomOut: () => {},
    onPan: () => {},
    onReset: () => {},
    onToggleFullscreen: () => {}
};

export default StageCameraControls;
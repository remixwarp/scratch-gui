import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { defineMessages, injectIntl, intlShape } from 'react-intl';

import Modal from '../../containers/windowed-modal.jsx';
import Box from '../box/box.jsx';

import styles from './video-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Video Player',
        description: 'Title of modal that appears when playing a video',
        id: 'tw.videoModal.title'
    }
});

const VideoModal = props => {
    if (!props.visible || !props.tutorial) return null;
    
    const [windowPosition, setWindowPosition] = useState({ x: 100, y: 100 });
    const [windowSize, setWindowSize] = useState({ width: 800, height: 450 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const handleMouseDown = (e, type) => {
        if (type === 'drag') {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - windowPosition.x,
                y: e.clientY - windowPosition.y
            });
        } else if (type === 'resize') {
            setIsResizing(true);
            setResizeStart({
                x: e.clientX,
                y: e.clientY,
                width: windowSize.width,
                height: windowSize.height
            });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setWindowPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        } else if (isResizing) {
            const newWidth = Math.max(400, resizeStart.width + (e.clientX - resizeStart.x));
            const newHeight = Math.max(225, resizeStart.height + (e.clientY - resizeStart.y));
            setWindowSize({ width: newWidth, height: newHeight });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    return (
        <div 
            className={styles.videoOverlay}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <div 
                className={styles.videoWindow}
                style={{
                    left: `${windowPosition.x}px`,
                    top: `${windowPosition.y}px`,
                    width: `${windowSize.width}px`,
                    height: `${windowSize.height}px`
                }}
            >
                <div 
                    className={styles.videoHeader}
                    onMouseDown={(e) => handleMouseDown(e, 'drag')}
                >
                    <h3>{props.tutorial.title}</h3>
                    <button 
                        className={styles.closeButton}
                        onClick={props.onClose}
                    >
                        ×
                    </button>
                </div>
                <div className={styles.videoContent}>
                    <iframe
                        src={props.tutorial.videoUrl}
                        scrolling="no"
                        border="0"
                        frameBorder="no"
                        frameSpacing="0"
                        allowFullScreen={true}
                        className={styles.videoIframe}
                    />
                </div>
                <div 
                    className={styles.resizeHandle}
                    onMouseDown={(e) => handleMouseDown(e, 'resize')}
                />
            </div>
        </div>
    );
};

VideoModal.propTypes = {
    intl: intlShape.isRequired,
    onClose: PropTypes.func.isRequired,
    tutorial: PropTypes.shape({
        title: PropTypes.string.isRequired,
        videoUrl: PropTypes.string.isRequired
    }).isRequired
};

export default injectIntl(VideoModal);
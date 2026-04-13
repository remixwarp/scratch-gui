import PropTypes from 'prop-types';
import React from 'react';
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
    if (!props.visible || !props.tutorial) {
        return null;
    }
    
    return (
        <Modal
            id="video-modal"
            visible={props.visible}
            onRequestClose={props.onClose}
            contentLabel={props.tutorial.title}
            width={800}
            height={450}
            minWidth={400}
            minHeight={225}
            resizable={true}
            maximizable={true}
        >
            <div className={styles.videoContainer}>
                <iframe
                    src={`//player.bilibili.com/player.html?isOutside=true&bvid=${props.tutorial.bvid}&p=1`}
                    scrolling="no"
                    border="0"
                    frameBorder="no"
                    frameSpacing="0"
                    allowFullScreen={true}
                    className={styles.videoIframe}
                />
                <button 
                    className={styles.useResourceButton}
                    onClick={() => {
                        if (props.tutorial.url) {
                            window.open(props.tutorial.url, '_blank');
                        } else {
                            alert('作者没有为此视频设置资源');
                        }
                    }}
                >
                    使用视频资源
                </button>
            </div>
        </Modal>
    );
};

VideoModal.propTypes = {
    intl: intlShape.isRequired,
    onClose: PropTypes.func.isRequired,
    visible: PropTypes.bool.isRequired,
    tutorial: PropTypes.shape({
        title: PropTypes.string.isRequired,
        bvid: PropTypes.string.isRequired,
        url: PropTypes.string
    }).isRequired
};

export default injectIntl(VideoModal);
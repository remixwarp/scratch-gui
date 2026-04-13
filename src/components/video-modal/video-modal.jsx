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
    const [showExtensionDialog, setShowExtensionDialog] = useState(false);
    
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
                                // 检查是否是JS扩展文件
                                if (props.tutorial.url.endsWith('.js')) {
                                    // 显示自定义弹窗
                                    setShowExtensionDialog(true);
                                } else {
                                    // 不是JS文件，直接打开
                                    window.open(props.tutorial.url, '_blank');
                                }
                            } else {
                                alert('作者没有为此视频设置资源');
                            }
                        }}
                    >
                        使用视频资源
                    </button>
            </div>
            
            {/* 扩展文件选择弹窗 */}
            {showExtensionDialog && (
                <div className={styles.extensionDialogOverlay}>
                    <div className={styles.extensionDialog}>
                        <div className={styles.extensionDialogHeader}>
                            <h3>扩展文件选择</h3>
                            <button 
                                className={styles.extensionDialogCloseButton}
                                onClick={() => setShowExtensionDialog(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.extensionDialogContent}>
                            <p>该视频资源为扩展文件。请选择以下操作：</p>
                        </div>
                        <div className={styles.extensionDialogActions}>
                            <button 
                                className={styles.dialogButton}
                                onClick={() => {
                                    // 下载扩展文件
                                    fetch(props.tutorial.url)
                                        .then(response => response.blob())
                                        .then(blob => {
                                            const url = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = props.tutorial.url.split('/').pop();
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(url);
                                            setShowExtensionDialog(false);
                                        })
                                        .catch(err => {
                                            console.error('下载扩展文件失败:', err);
                                            alert('下载扩展文件失败：' + err.message);
                                            setShowExtensionDialog(false);
                                        });
                                }}
                            >
                                下载扩展文件
                            </button>
                            <button 
                                className={styles.dialogButton + ' ' + styles.primaryButton}
                                onClick={() => {
                                    // 添加扩展到编辑器
                                    if (props.vm && props.vm.extensionManager) {
                                        props.vm.extensionManager.loadExtensionURL(props.tutorial.url)
                                            .then(() => {
                                                alert('扩展已成功添加到编辑器！');
                                                setShowExtensionDialog(false);
                                            })
                                            .catch(err => {
                                                console.error('添加扩展失败:', err);
                                                alert('添加扩展失败：' + err.message);
                                                setShowExtensionDialog(false);
                                            });
                                    } else {
                                        alert('无法添加扩展：编辑器实例不可用');
                                        setShowExtensionDialog(false);
                                    }
                                }}
                            >
                                添加扩展
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
    }).isRequired,
    vm: PropTypes.object
};

export default injectIntl(VideoModal);
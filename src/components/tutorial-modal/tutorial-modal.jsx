import PropTypes from 'prop-types';
import React, {useState} from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';

import Modal from '../../containers/windowed-modal.jsx';
import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import {openVideoModal} from '../../reducers/modals.js';

import styles from './tutorial-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Tutorial',
        description: 'Title of modal that appears when opening the Tutorial',
        id: 'tw.tutorialModal.title'
    },
    categoryAll: {
        defaultMessage: 'All',
        description: 'Category for all tutorials',
        id: 'tw.tutorialModal.category.all'
    },
    categoryTips: {
        defaultMessage: 'Tips',
        description: 'Category for tutorial tips',
        id: 'tw.tutorialModal.category.tips'
    },
    categoryFacts: {
        defaultMessage: 'Facts',
        description: 'Category for tutorial facts',
        id: 'tw.tutorialModal.category.facts'
    },
    tutorial1Title: {
        defaultMessage: 'RemixWarp 入门教程',
        description: 'Title of the first tutorial',
        id: 'tw.tutorialModal.tutorial1.title'
    },
    tutorial1Description: {
        defaultMessage: '学习如何使用 RemixWarp 编辑器的基本功能',
        description: 'Description of the first tutorial',
        id: 'tw.tutorialModal.tutorial1.description'
    }
});

const tutorialData = [
    {
        id: 1,
        bvid: 'BV1FDUTBGE2H',
        aid: '115599531318028',
        cid: '34212417236',
        category: 'all'
    }
];

const TutorialModal = props => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [tutorialDetails, setTutorialDetails] = useState({});
    const [loading, setLoading] = useState(false);

    const filteredTutorials = tutorialData.filter(tutorial => 
        selectedCategory === 'all' || tutorial.category === selectedCategory
    );

    const fetchVideoDetails = async (bvid) => {
        if (tutorialDetails[bvid]) return tutorialDetails[bvid];
        
        setLoading(true);
        try {
            // 使用B站公开API获取视频信息
            const response = await fetch(`https://api.bilibili.com/x/web-interface/wbi/view?bvid=${bvid}`);
            const data = await response.json();
            
            if (data.code === 0) {
                const details = {
                    title: data.data.title,
                    description: data.data.desc,
                    thumbnail: data.data.pic,
                    videoUrl: `//player.bilibili.com/player.html?isOutside=true&bvid=${bvid}&cid=${data.data.cid}&p=1`
                };
                setTutorialDetails(prev => ({ ...prev, [bvid]: details }));
                return details;
            }
        } catch (error) {
            console.error('Failed to fetch video details:', error);
        } finally {
            setLoading(false);
        }
        
        // 默认数据
        return {
            title: '视频标题',
            description: '视频描述',
            thumbnail: 'https://i2.hdslb.com/bfs/archive/3a0b8c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0.jpg',
            videoUrl: `//player.bilibili.com/player.html?isOutside=true&bvid=${bvid}`
        };
    };

    const handleTutorialClick = async (tutorial) => {
        const details = await fetchVideoDetails(tutorial.bvid);
        props.openVideoModal({ ...tutorial, ...details });
    };

    return (
        <Modal
            className={styles.modalContent}
            onRequestClose={props.onClose}
            contentLabel={props.intl.formatMessage(messages.title)}
            id="tutorialModal"
        >
            <Box className={styles.body}>
                <h2 className={styles.title}>
                    {props.intl.formatMessage(messages.title)}
                </h2>
                
                <div className={styles.categoryTabs}>
                    <Button
                        className={`${styles.categoryTab} ${selectedCategory === 'all' ? styles.active : ''}`}
                        onClick={() => setSelectedCategory('all')}
                    >
                        {props.intl.formatMessage(messages.categoryAll)}
                    </Button>
                    <Button
                        className={`${styles.categoryTab} ${selectedCategory === 'tips' ? styles.active : ''}`}
                        onClick={() => setSelectedCategory('tips')}
                    >
                        {props.intl.formatMessage(messages.categoryTips)}
                    </Button>
                    <Button
                        className={`${styles.categoryTab} ${selectedCategory === 'facts' ? styles.active : ''}`}
                        onClick={() => setSelectedCategory('facts')}
                    >
                        {props.intl.formatMessage(messages.categoryFacts)}
                    </Button>
                </div>

                <div className={styles.tutorialGrid}>
                    {filteredTutorials.map(tutorial => {
                        const details = tutorialDetails[tutorial.bvid] || {
                            title: '加载中...',
                            description: '正在获取视频信息...',
                            thumbnail: 'https://i2.hdslb.com/bfs/archive/3a0b8c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0.jpg'
                        };
                        
                        return (
                            <div 
                                key={tutorial.id} 
                                className={styles.tutorialCard}
                                onClick={() => handleTutorialClick(tutorial)}
                            >
                                <div className={styles.tutorialThumbnail}>
                                    <img 
                                        src={details.thumbnail} 
                                        alt={details.title}
                                        className={styles.thumbnailImage}
                                    />
                                    <div className={styles.playButton}>
                                        <span className={styles.playIcon}>▶</span>
                                    </div>
                                </div>
                                <div className={styles.tutorialInfo}>
                                    <h3 className={styles.tutorialTitle}>
                                        {details.title}
                                    </h3>
                                    <p className={styles.tutorialDescription}>
                                        {details.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {loading && (
                    <div className={styles.loadingOverlay}>
                        <div className={styles.loadingSpinner}>
                            加载中...
                        </div>
                    </div>
                )}
            </Box>
        </Modal>
    );
};

TutorialModal.propTypes = {
    intl: intlShape.isRequired,
    onClose: PropTypes.func.isRequired,
    openVideoModal: PropTypes.func.isRequired
};

const mapDispatchToProps = dispatch => ({
    openVideoModal: tutorial => dispatch(openVideoModal(tutorial))
});

export default connect(
    null,
    mapDispatchToProps
)(injectIntl(TutorialModal));

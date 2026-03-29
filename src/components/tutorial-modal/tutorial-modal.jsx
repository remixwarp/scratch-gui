向。import PropTypes from 'prop-types';
import React, {useState, useEffect, useCallback} from 'react';
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
        bvid: 'BV14Lf4BPEQE',
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

    // 使用 useCallback 定义 fetchVideoDetails，避免在 useEffect 中使用时出现依赖问题
    const fetchVideoDetails = useCallback(async (bvid) => {
        setLoading(true);
        try {
            // 使用B站公开API获取视频信息，通过CORS代理绕过跨域限制
            console.log('Fetching video details for:', bvid);
            const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
            const response = await fetch(proxyUrl);
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.code === 0) {
                const details = {
                    bvid: bvid,
                    title: data.data.title,
                    description: data.data.desc,
                    thumbnail: data.data.pic,
                    videoUrl: `https://www.bilibili.com/video/${bvid}`,
                    author: data.data.owner.name,
                    views: data.data.stat.view,
                    duration: data.data.duration
                };
                console.log('Fetched video details:', details);
                setTutorialDetails(prev => ({ ...prev, [bvid]: details }));
                return details;
            } else {
                console.error('API error:', data.message);
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Failed to fetch video details:', error);
            // 即使API调用失败，也使用默认数据，避免用户看到错误
            const defaultDetails = {
                bvid: bvid,
                title: 'RemixWarp 入门教程',
                description: '学习如何使用 RemixWarp 编辑器的基本功能',
                thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfkuIvkvbPkuKXmrKHniYg8L3RleHQ+PC9zdmc+',
                videoUrl: `https://www.bilibili.com/video/${bvid}`,
                author: 'RemixWarp',
                views: 0,
                duration: 0
            };
            setTutorialDetails(prev => ({ ...prev, [bvid]: defaultDetails }));
            return defaultDetails;
        } finally {
            setLoading(false);
            console.log('Loading finished');
        }
    }, []);

    // 组件挂载时自动获取所有教程的视频详情
    useEffect(() => {
        const fetchAllVideoDetails = async () => {
            for (const tutorial of tutorialData) {
                try {
                    await fetchVideoDetails(tutorial.bvid);
                } catch (error) {
                    console.error('Failed to fetch tutorial details:', error);
                }
            }
        };
        fetchAllVideoDetails();
    }, [fetchVideoDetails]);

    const handleTutorialClick = async (tutorial) => {
        console.log('Tutorial clicked:', tutorial);
        try {
            const details = await fetchVideoDetails(tutorial.bvid);
            console.log('Fetched details:', details);
            console.log('Opening video modal with:', { ...tutorial, ...details });
            props.openVideoModal({ ...tutorial, ...details });
            console.log('openVideoModal called');
        } catch (error) {
            console.error('Failed to open video:', error);
        }
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
                            thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfkuIvkvbPkuKXmrKHniYg8L3RleHQ+PC9zdmc+',
                            author: '加载中...',
                            views: 0
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
                                    <div className={styles.tutorialMetadata}>
                                        <div className={styles.tutorialAuthor}>
                                            <span>UP: {details.author}</span>
                                        </div>
                                        <div className={styles.tutorialViews}>
                                            <span>{details.views} 播放</span>
                                        </div>
                                    </div>
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

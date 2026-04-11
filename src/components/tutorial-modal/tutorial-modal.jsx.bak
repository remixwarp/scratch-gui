import PropTypes from 'prop-types';
import React, {useState, useEffect, useCallback, useRef} from 'react';
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
    //all
    {
        id: 'tutorial1',
        bvid: 'BV1DUnhzkEJb',
        category: 1
    },
    //tips
    {
        id: 'tutorial2',
        bvid: 'BV18fxVz6EiE',
        category: 2
    },
    //facts
    {
        id: 'tutorial3',
        bvid: 'BV1hi2HBcEuD',
        category: 3
    },
    //extension
    {
        id: 'tutorial4',
        bvid: 'BV1q3aezREjd',
        category: 4
    },
    {
        id: 'tutorial5',
        bvid: 'BV1FDUTBGE2H',
        category: 4
    },
    {
        id: 'tutorial6',
        bvid: 'BV1khhyzZEyS',
        category: 4
    },
    {
        id: 'tutorial7',
        bvid: 'BV1BAeyzZEf3',
        category: 4
    },
    {
        id: 'tutorial8',
        bvid: 'BV1vBpRzsEDK',
        category: 4
    },
    {
        id: 'tutorial9',
        bvid: 'BV16Exvz7E6N',
        category: 4
    },
    {
        id: 'tutorial10',
        bvid: 'BV1XPWbz1Ezb',
        category: 4
    },
    {
        id: 'tutorial11',
        bvid: 'BV1Sm1kBJEBg',
        category: 4
    }
];

const getCategoryInfo = (categoryId) => {
    const categories = {
        1: { id: 1, key: 'all', defaultMessage: '所有' },
        2: { id: 2, key: 'tips', defaultMessage: '小技巧' },
        3: { id: 3, key: 'facts', defaultMessage: '冷知识' },
        4: { id: 4, key: 'extension', defaultMessage: '扩展' }
    };
    return categories[categoryId] || categories[1];
};

const TutorialModal = props => {
    const [selectedCategory, setSelectedCategory] = useState(1);
    const [tutorialDetails, setTutorialDetails] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState({
        total: 0,
        loaded: 0,
        failed: 0
    });
    const isLoadingRef = useRef(false); // 使用ref跟踪加载状态，避免重复加载

    const filteredTutorials = tutorialData.filter(tutorial => 
        selectedCategory === 1 || tutorial.category === selectedCategory
    );

    // 使用 useCallback 定义 fetchVideoDetails，避免在 useEffect 中使用时出现依赖问题
    const fetchVideoDetails = useCallback(async (bvid) => {
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
                    duration: data.data.duration,
                    loadFailed: false
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
                title: '加载信息失败',
                description: '无法获取视频信息，但视频可以正常播放',
                thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==',
                videoUrl: `https://www.bilibili.com/video/${bvid}`,
                author: '未知',
                views: 0,
                duration: 0,
                loadFailed: true
            };
            setTutorialDetails(prev => ({ ...prev, [bvid]: defaultDetails }));
            return defaultDetails;
        }
    }, []);

    // 组件挂载时串行获取所有教程的视频详情，添加延迟避免被API限制
    useEffect(() => {
        // 避免重复加载
        if (isLoadingRef.current) {
            console.log('Already loading, skipping...');
            return;
        }
        
        const fetchAllVideoDetails = async () => {
            isLoadingRef.current = true;
            setLoading(true);
            // 初始化进度
            const total = tutorialData.length;
            let loaded = 0;
            let failed = 0;
            setLoadingProgress({ total, loaded, failed });
            
            try {
                // 串行加载所有教程，每个请求之间添加延迟
                for (const tutorial of tutorialData) {
                    try {
                        // 检查缓存，如果有缓存且未失败，跳过
                        const cachedDetails = tutorialDetails[tutorial.bvid];
                        if (!cachedDetails || cachedDetails.loadFailed) {
                            const result = await fetchVideoDetails(tutorial.bvid);
                            // 更新进度
                            if (result.loadFailed) {
                                failed++;
                            } else {
                                loaded++;
                            }
                            // 每2个视频更新一次进度，减少UI更新频率
                            if ((loaded + failed) % 2 === 0 || (loaded + failed) === total) {
                                setLoadingProgress({ total, loaded, failed });
                            }
                            // 添加随机延迟，模拟人类操作
                            const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3秒
                            console.log(`Waiting ${delay}ms before next request...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        } else {
                            // 缓存命中，更新进度
                            loaded++;
                            // 每2个视频更新一次进度，减少UI更新频率
                            if (loaded % 2 === 0 || loaded === total) {
                                setLoadingProgress({ total, loaded, failed });
                            }
                        }
                    } catch (error) {
                        console.error('Failed to fetch tutorial details:', tutorial.bvid, error);
                        // 更新失败进度
                        failed++;
                        // 每2个视频更新一次进度，减少UI更新频率
                        if ((loaded + failed) % 2 === 0 || (loaded + failed) === total) {
                            setLoadingProgress({ total, loaded, failed });
                        }
                        // 失败后也添加延迟
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }
                // 最终更新进度
                setLoadingProgress({ total, loaded, failed });
            } catch (error) {
                console.error('Error in fetchAllVideoDetails:', error);
            } finally {
                setLoading(false);
                isLoadingRef.current = false;
                console.log('All tutorials loaded');
            }
        };
        fetchAllVideoDetails();
    }, [fetchVideoDetails, tutorialDetails]);

    const handleTutorialClick = async (tutorial) => {
        console.log('Tutorial clicked:', tutorial);
        try {
            let details = tutorialDetails[tutorial.bvid];
            
            if (!details) {
                console.log('Fetching fresh details for:', tutorial.bvid);
                details = await fetchVideoDetails(tutorial.bvid);
            } else {
                console.log('Using cached details:', details);
            }
            
            console.log('Opening video modal with:', { ...tutorial, ...details });
            props.openVideoModal({ ...tutorial, ...details });
            console.log('openVideoModal called');
        } catch (error) {
            console.error('Failed to open video:', error);
        }
    };

    const handleReload = async (e, tutorial) => {
        e.stopPropagation();
        console.log('Reloading tutorial:', tutorial.bvid);
        try {
            await fetchVideoDetails(tutorial.bvid);
        } catch (error) {
            console.error('Failed to reload tutorial:', error);
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
                    {[1, 2, 3, 4].map(categoryId => {
                        const categoryInfo = getCategoryInfo(categoryId);
                        return (
                            <Button
                                key={categoryId}
                                className={`${styles.categoryTab} ${selectedCategory === categoryId ? styles.active : ''}`}
                                onClick={() => setSelectedCategory(categoryId)}
                            >
                                {categoryInfo.defaultMessage}
                            </Button>
                        );
                    })}
                </div>

                <div className={styles.tutorialGrid}>
                    {filteredTutorials.map(tutorial => {
                        const details = tutorialDetails[tutorial.bvid] || {
                            title: 'Loading...',
                            description: 'Fetching video information...',
                            thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==',
                            author: 'Loading...',
                            views: 0
                        };
                        
                        const handleImageError = (e) => {
                            console.log('Image failed to load, using placeholder');
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5MaW5rIFN0cmF0Y2g8L3RleHQ+PC9zdmc+';
                            // 图片加载失败不影响整体加载状态
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
                                        onError={handleImageError}
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
                                    {details.loadFailed && (
                                        <button
                                            className={styles.reloadButton}
                                            onClick={(e) => handleReload(e, tutorial)}
                                        >
                                            重新加载
                                        </button>
                                    )}
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
                            <div className={styles.loadingProgress}>
                                <div className={styles.progressBar}>
                                    <div 
                                        className={styles.progressFill} 
                                        style={{ width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%` }}
                                    />
                                </div>
                                <div className={styles.progressInfo}>
                                    {loadingProgress.loaded}/{loadingProgress.total} 已加载
                                    {loadingProgress.failed > 0 && ` (${loadingProgress.failed} 失败)`}
                                </div>
                            </div>
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

import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import { connect } from 'react-redux';
import { openVideoModal } from '../../reducers/modals.js';

import Modal from '../../containers/windowed-modal.jsx';
import Box from '../box/box.jsx';
import Button from '../button/button.jsx';

import styles from './tutorial-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: '视频教程',
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
    categoryExtension: {
        defaultMessage: 'Extension',
        description: 'Category for tutorial extensions',
        id: 'tw.tutorialModal.category.extension'
    }
});

const getCategoryInfo = (categoryId) => {
    const categories = {
        1: { id: 1, key: 'all', defaultMessage: '所有' },
        2: { id: 2, key: 'tips', defaultMessage: '小技巧' },
        3: { id: 3, key: 'facts', defaultMessage: '冷知识' },
        4: { id: 4, key: 'extension', defaultMessage: '扩展' }
    };
    return categories[categoryId] || categories[1];
};

const tutorialData = [

    {
        id: 'BV1DUnhzkEJb',
        bvid: 'BV1DUnhzkEJb',
        category: 2,
        bt: 'Turbowarp怎么加载自定义扩展？（附带gandi教程）',
        jj: '怎么加载自定义扩展一个视频告诉你！',
        fm: require('./images/BV1DUnhzkEJb.jpg')
    },
    //tips
    {
        id: 'BV18fxVz6EiE',
        bvid: 'BV18fxVz6EiE',
        category: 2,
        bt: 'Scratch扩展合并器！合并多段扩展代码',
        jj: '这个想法小时候就想做了，现在有AI，总算是把小时候的梦给圆上了 这个工具说实话，其实没啥用（主要是为了圆梦） 体验网址：https://yunpa.vip/10000why.html 下载链接：https://yunpavip.lanzn.com/iKVd237rpdhi 无密码',
        fm: require('./images/BV18fxVz6EiE.jpg')
    },
    //facts
    {
        id: 'BV1hi2HBcEuD',
        bvid: 'BV1hi2HBcEuD',
        category: 3,
        bt: '为什么0.1+0.2不等于0.3？一期视频讲清！',
        jj: 'IEEE754标准经度有限，只能存近似值，指数偏移并不精确等，最终导致0.1+0.2≠0.3。',
        fm: require('./images/BV1hi2HBcEuD.jpg')
    },
    //extension
    {
        id: 'BV1q3aezREjd',
        bvid: 'BV1q3aezREjd',
        category: 4,
        bt: '简单几个扩展积木实现网页社区？还开源！',
        jj: '本视频/扩展由10000why制作，支持二创，严禁获取源码后生称自己为原作者！ 我之后会出一些运用此积木的示例作品，在删除角色一游戏中就添加了这个扩展（感兴趣的可以看下我之前的视频） https://yunpavip.lanzn.com/irS7j35hqrze 密码:视频结尾会说 希望你能给我个三连，最好能关注一下，非常感谢你的支持 总之还看什么简介呢快去看视频！',
        fm: require('./images/BV1q3aezREjd.jpg')
    },
    {
        id: 'BV1FDUTBGE2H',
        bvid: 'BV1FDUTBGE2H',
        category: 4,
        bt: 'Scratch云列表，当然是真的（免费开源）',
        jj: 'github：https://github.com/xiao-xiao-lang/bilibili-/blob/%E5%BC%80%E6%BA%90%E5%85%B6%E4%BB%96%E9%A1%B9%E7%9B%AE/%E4%BA%91%E5%88%97%E8%A1%A8json.js 蓝奏云（无需登录）：https://wwet.lanzouu.com/ijLc73bz0wzc',
        fm: require('./images/BV1FDUTBGE2H.jpg')
    },
    {
        id: 'BV1khhyzZEyS',
        bvid: 'BV1khhyzZEyS',
        category: 4,
        bt: '一个Scratch摇杆扩展积木',
        jj: '这是一个scratch摇杆扩展，不需要填写任何内容，自动模拟按键/判定 使用自研九宫格算法，因为是自研的算法所以有很多bug，请在使用的时候勾选在非沙和环境下运行 这个扩展只能使用tubowarp里面的自定义扩展打开或者是其他支持自定义扩展的编辑器 下载链接：https://wwtd.lanzn.com/iH0xU34sjceb 密码:视频结尾会说（传统） （有必要说一下：主体代码由AI生成） 希望你能给up点个关注，谢谢，小up都是这么一步一步走过来的 总之别看简介了，快看视频啊！求三连！',
        fm: require('./images/BV1khhyzZEyS.jpg')
    },
    {
        id: 'BV1BAeyzZEf3',
        bvid: 'BV1BAeyzZEf3',
        category: 4,
        bt: '一个万能的Scratch方向键积木',
        jj: '无需任何调试，一个积木实现移动端操作，支持长按等 蓝凑云下载链接： https://wwtd.lanzn.com/iqDVn34mf9kj 密码:视频结尾会说！或者联系我 用的作者做的扩展了，也点个关注呗，小up都很不容易的 （有必要说一下：这个扩展主题由ai制作）',
        fm: require('./images/BV1BAeyzZEf3.jpg')
    },
    {
        id: 'BV1vBpRzsEDK',
        bvid: 'BV1vBpRzsEDK',
        category: 4,
        bt: '超多积木的B站Scratch扩展！还开源！',
        jj: '全球首发！自制 B站扩展！ 源码/文档：http://yunpa.vip/10000why扩展文档 js文件下载：https://yunpavip.lanzn.com/iJemi36mrgaf 密码:视频结尾会说 turbowarp网页体验此扩展：https://turbowarp.org/editor?extension=https://yunpa.vip/10000why扩展文档/扩展.js 别看简介了，快去看视频吧！ (有必要说一下，这个扩展主体由AI制作，避免一些人…) ',
        fm: require('./images/BV1vBpRzsEDK.jpg')
    },
    {
        id: 'BV16Exvz7E6N',
        bvid: 'BV16Exvz7E6N',
        category: 4,
        bt: '云变量扩展⁈ 已开源！',
        jj: '注意事项： 请勿改动，这个扩展的任何代码，这会影响其他使用此扩展的用户 下载链接：https://yunpavip.lanzn.com/iSzAd37yf8ad 提取码：视频结尾会写',
        fm: require('./images/BV16Exvz7E6N.jpg')
    },
    {
        id: 'BV1XPWbz1Ezb',
        bvid: 'BV1XPWbz1Ezb',
        category: 4,
        bt: '功能丰富的框选扩展！在Scratch中实现红警？',
        jj: '这个扩展和视频制作花了Up很长时间，求个三连不过分吧？ 下载网址：https://yunpavip.lanzn.com/ijo8338rz01a Bro认为bro的视频封面发生了技术爆炸 总之，别看简介了，快去看视频啊！',
        fm: require('./images/BV1XPWbz1Ezb.jpg')
    },
    {
        id: 'BV1Sm1kBJEBg',
        bvid: 'BV1Sm1kBJEBg',
        category: 4,
        bt: 'Scratch音频编码扩展，实现实时免费通话！',
        jj: '本扩展10000why原创，支持二创，但禁止声称自己为原创 下载链接：https://yunpavip.lanzn.com/ipu0G3a4qqbg （无提取码）',
        fm: require('./images/BV1Sm1kBJEBg.jpg')
    }
];

const TutorialModal = props => {
    const [selectedCategory, setSelectedCategory] = useState(1);

    const filteredTutorials = tutorialData.filter(tutorial => 
        selectedCategory === 1 || tutorial.category === selectedCategory
    );

    const handleTutorialClick = (tutorial) => {
        const tutorialDetails = {
            bvid: tutorial.bvid,
            title: tutorial.bt || '视频教程',
            description: tutorial.jj || '点击播放视频教程',
            thumbnail: tutorial.fm || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5MaW5rIFN0cmF0Y2g8L3RleHQ+PC9zdmc+',
            videoUrl: `https://www.bilibili.com/video/${tutorial.bvid}`,
            author: 'RemixWarp',
            views: 0,
            duration: 0
        };
        props.openVideoModal({ ...tutorial, ...tutorialDetails });
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
                        return (
                            <div 
                                key={tutorial.id} 
                                className={styles.tutorialCard}
                                onClick={() => handleTutorialClick(tutorial)}
                            >
                                <div className={styles.tutorialThumbnail}>
                                    <img 
                                        src={tutorial.fm} 
                                        alt={tutorial.bt || `教程 ${tutorial.id}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div className={styles.playButton}>
                                        <span className={styles.playIcon}>▶</span>
                                    </div>
                                </div>
                                <div className={styles.tutorialInfo}>
                                    <h3 className={styles.tutorialTitle}>
                                        {tutorial.bt || `教程 ${tutorial.id.replace('tutorial', '')}`}
                                    </h3>
                                    <p className={styles.tutorialDescription}>
                                        {tutorial.jj || `BV号: ${tutorial.bvid}`}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
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

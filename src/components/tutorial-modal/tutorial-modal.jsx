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
        2: { id: 2, key: 'basics', defaultMessage: '基础知识' },
        3: { id: 3, key: 'advanced', defaultMessage: '进阶算法' },
        4: { id: 4, key: 'tips', defaultMessage: '小技巧' },
        5: { id: 5, key: 'extension', defaultMessage: '扩展' },
        6: { id: 6, key: 'facts', defaultMessage: '冷知识' },
        7: { id: 7, key: 'other', defaultMessage: '其他' }
    };
    return categories[categoryId] || categories[1];
};

const tutorialData = [

    {
        id: 'BV1bEYRzvEHd',
        bvid: 'BV1bEYRzvEHd',
        category: 2,
        bt: '用Turbowarp制作天气软件！完全开源！',
        jj: '蓝奏云：https://www.lanzoum.com/ixRmt343b6sb。“开源，是世界上最伟大的精神”',
        fm: require('./images/BV1bEYRzvEHd.jpg'),
        url: 'https://remixwarp.pages.dev/editor?project_url=https://rw-vep.pages.dev/BV1bEYRzvEHd.sb3'
    },
    {
        id: 'BV1bQtQzmEDz',
        bvid: 'BV1bQtQzmEDz',
        category: 5,
        bt: 'Turbowarp使用天气API',
        jj: '作品：https://www.lanzoum.com/iqXzu33ch7jc 感谢观看，一键三连支持一下！',
        fm: require('./images/BV1bQtQzmEDz.jpg'),
        url: 'https://remixwarp.pages.dev/editor?project_url=https://rw-vep.pages.dev/BV1bQtQzmEDz.sb3'
    },
    {
        id: 'BV1dj8kziEYD',
        bvid: 'BV1dj8kziEYD',
        category: 2,
        bt: 'Turbowarp导入图片教程',
        jj: '-',
        fm: require('./images/BV1dj8kziEYD.jpg')
    },
    {
        id: 'BV13v39zEEfV',
        bvid: 'BV13v39zEEfV',
        category: 2,
        bt: '用Turbowarp制作音乐播放器，新手也能学会！',
        jj: '什么？Turbowarp也能制作音乐播放器！快来看看！ 记得一键三连。 我每个视频都很用心，关注一下吧。 如果您有建议，请在评论区反馈，UP会及时回复哒！',
        fm: require('./images/BV13v39zEEfV.jpg')
    },
    {
        id: 'BV1HC7uzdEWr',
        bvid: 'BV1HC7uzdEWr',
        category: 4,
        bt: '什么！？scratch不用画笔也能做时钟，快来看，有文件下载！',
        jj: '什么！？scratch不用画笔也能做时钟，快来看，有文件下载！ 蓝奏云链接：https://wwrx.lanzoum.com/iAslk2xpmp8b',
        fm: require('./images/BV1HC7uzdEWr.jpg'),
        url: 'https://remixwarp.pages.dev/editor?project_url=https://rw-vep.pages.dev/BV1HC7uzdEWr.sb3'
    },
    {
        id: 'BV1jR7uzEEHd',
        bvid: 'BV1jR7uzEEHd',
        category: 4,
        bt: 'scratch非线性动画教程',
        jj: '蓝奏云：https://wwrx.lanzoum.com/iUw5F2xpm30b',
        fm: require('./images/BV1jR7uzEEHd.jpg'),
        url: 'https://remixwarp.pages.dev/editor?project_url=https://rw-vep.pages.dev/BV1jR7uzEEHd.sb3'
    },
    {
        id: 'BV1J9pgziEpL',
        bvid: 'BV1J9pgziEpL',
        category: 4,
        bt: 'scratch鼠标滚轮检测制作教程',
        jj: '一个教会你如何用scratch或者turbowarp等软件中，如何检测鼠标滚轮的视频教程',
        fm: require('./images/BV1J9pgziEpL.jpg')
    },
    {
        id: 'BV1Jo1VBDEHY',
        bvid: 'BV1Jo1VBDEHY',
        category: 4,
        bt: '【scratch教程】彩带效果',
        jj: '一个彩带效果的视频！scratch和turbowarp通用。',
        fm: require('./images/BV1Jo1VBDEHY.jpg')
    },
    {
        id: 'BV1EU1EBaEYL',
        bvid: 'BV1EU1EBaEYL',
        category: 2,
        bt: '【sc教程】scratch的sin是什么？',
        jj: '一个sin的使用教程，scratch和turbowarp还有mind+通用',
        fm: require('./images/BV1EU1EBaEYL.jpg')
    },
    {
        id: 'BV1p514BoEJA',
        bvid: 'BV1p514BoEJA',
        category: 2,
        bt: '【scratch教程】你真的懂克隆体的用途吗？',
        jj: '一个关于scratch的克隆体用途的视频',
        fm: require('./images/BV1p514BoEJA.jpg')
    },
    {
        id: 'BV1dfyAB1EuY',
        bvid: 'BV1dfyAB1EuY',
        category: 4,
        bt: '【scratch教程】非线性旋转和同时进行的动画',
        jj: '非线性动画的教程 记得三连',
        fm: require('./images/BV1dfyAB1EuY.jpg')
    },
    {
        id: 'BV1vMUvByE1x',
        bvid: 'BV1vMUvByE1x',
        category: 3,
        bt: '【scratch教程】如何解析歌词',
        jj: '一个scratch的分析歌词文件的教程，我可能讲得不好，勿喷。 代码由 @一只编澄  制作。',
        fm: require('./images/BV1vMUvByE1x.jpg')
    },
    {
        id: 'BV1qi2jBdEL1',
        bvid: 'BV1qi2jBdEL1',
        category: 5,
        bt: '【TW教程】turbowarp也能获取API！获取教程',
        jj: '这是一个教大家使用http来获取API数据的教程~ 有一些是HTTPS协议，请用下面这个我开发的扩展： https://wwbpx.lanzoum.com/izZAq3cxyyif 密码：code 记得三连支持一下！',
        fm: require('./images/BV1qi2jBdEL1.jpg'),
        url: 'https://rw-vep.pages.dev/BV1qi2jBdEL1.js'
    },
    {
        id: 'BV14Lm3BZEvx',
        bvid: 'BV14Lm3BZEvx',
        category: 4,
        bt: '【scratch教程】用原版scratch画笔画圆，可拉伸形状！',
        jj: '用原版scratch也能做的画圆代码制作教程。 感兴趣的话就关注一下我吧 OuO',
        fm: require('./images/BV14Lm3BZEvx.jpg')
    },
    {
        id: 'BV1sHqmBPE4X',
        bvid: 'BV1sHqmBPE4X',
        category: 4,
        bt: '【scratch教程】更好的点击！让你的点击更有质感~',
        jj: '一个给新手的教程，可以让你的点击动效更精美！ 喜欢的话记得关注~',
        fm: require('./images/BV1sHqmBPE4X.jpg')
    },
    {
        id: 'BV1mgB6BHEre',
        bvid: 'BV1mgB6BHEre',
        category: 5,
        bt: 'Turbowarp云变量聊天室制作教程，教你制作一个简单的聊天室！',
        jj: '一个基础的聊天室教程，如果喜欢我的视频，可以一键三连加关注哟！ 作品下载链接：https://f-code.lanzoum.com/ifQim3emfo3c',
        fm: require('./images/BV1mgB6BHEre.jpg'),
        url: 'https://remixwarp.pages.dev/editor?project_url=https://rw-vep.pages.dev/BV1mgB6BHEre.sb3'
    },
    {
        id: 'BV14tvzBgEA7',
        bvid: 'BV14tvzBgEA7',
        category: 4,
        bt: 'scratch进度条制作教程，让你的每一次加载更加精美',
        jj: '一个用scratch制作进度条的教程视频，非常简单！ 如果喜欢我的视频记得一键三连哈~对了！还有关注！ 链接：哪来的链接，又不难...',
        fm: require('./images/BV14tvzBgEA7.jpg')
    },
    {
        id: 'BV1WgicBwEqm',
        bvid: 'BV1WgicBwEqm',
        category: 4,
        bt: '让你的Turbowarp积木变圆！F_code同款圆角积木制作教程',
        jj: '有很多人在评论区问我圆角积木是怎么做的，于是就有了这篇教程',
        fm: require('./images/BV1WgicBwEqm.jpg')
    },
    {
        id: 'BV1RGiiB2ETR',
        bvid: 'BV1RGiiB2ETR',
        category: 3,
        bt: 'scratch用列表做变量引擎教程。你的下一个变量何必是变量？',
        jj: '一个简陋的教程，我不是大佬，只是一个小白，录屏的时候出了很多错误，所以画面如果突然出现闪动是我的问题，我没有录好，所以剪掉了一部分，但是绝对没有剪掉任何步骤，所以还请大家见谅！',
        fm: require('./images/BV1RGiiB2ETR.jpg')
    },
    {
        id: 'BV1G86ZBJEdd',
        bvid: 'BV1G86ZBJEdd',
        category: 3,
        bt: '在Turbowarp的舞台中做更好的列表',
        jj: '一个在Turbowarp的舞台中做更好的列表的教程。 这是我自己研究的方法，可能做得不好，可以在评论区反馈意见。 要用到原版scratch中没有的功能！',
        fm: require('./images/BV1G86ZBJEdd.jpg')
    },
    {
        id: 'BV1Q2rSBbEJf',
        bvid: 'BV1Q2rSBbEJf',
        category: 3,
        bt: '让你在scratch中做出有顺序的排行榜！scratch冒泡排序教程',
        jj: '一个用scratch做冒泡排序的算法教程，它可以让你的排行榜、分数榜、统计表不再无序。 这是我根据我学C++的知识做出来的，可能有很多未知的问题！',
        fm: require('./images/BV1Q2rSBbEJf.jpg')
    },
    {
        id: 'BV1mt67BbEyB',
        bvid: 'BV1mt67BbEyB',
        category: 5,
        bt: 'turbowarp补间扩展使用教程',
        jj: '终于考完试了，UP第一时间剪辑并发布了这个视频 OuO 如你所见，这是一个turbowarp里的 补间 扩展的使用教程。 这期视频很短！',
        fm: require('./images/BV1mt67BbEyB.jpg')
    },
    {
        id: 'BV1Ko6CBvEZ6',
        bvid: 'BV1Ko6CBvEZ6',
        category: 4,
        bt: 'scratch的小技巧1',
        jj: '好了，其实我在摸鱼...',
        fm: require('./images/BV1Ko6CBvEZ6.jpg')
    },
    {
        id: 'BV14bFTz2E7J',
        bvid: 'BV14bFTz2E7J',
        category: 3,
        bt: '在Scratch中制作列表排序教程！scratch桶排序教程。',
        jj: '这是一期用scratch制作桶排序的教程。 原本我想完成粉丝@暴龙猴紫 的愿望"做一个快速排序的教程"的，可惜我实在是不会做，我甚至没有在任何地方听到过这个排序，我还是不够好。在这里和所有希望我做快速排序教程的人说声抱歉。 网上都说桶排序比冒泡排序快，但是在scratch中也是如此吗？',
        fm: require('./images/BV14bFTz2E7J.jpg')
    },
    {
        id: 'BV1U5FGzhEp9',
        bvid: 'BV1U5FGzhEp9',
        category: 4,
        bt: '让你的scratch时间始终为两个数',
        jj: '这是一个将scratch的时间一直变为两位数:两位数格式的教程视频。 一定要勾选 运行时不刷新屏幕，作用是能够使自制积木里的代码更加快速的运行（ 简单理解）。但是其实不用也可以，因为现在代码不多，不用担心执行一次自制积木的时长。 我最近不知道做什么教程了。。。',
        fm: require('./images/BV1U5FGzhEp9.jpg')
    },
    {
        id: 'BV1FhcTzuEyq',
        bvid: 'BV1FhcTzuEyq',
        category: 4,
        bt: 'scratch绘制圆形进度条教程',
        jj: '一个使用scratch的画笔绘制圆形的进度条的教程视频~',
        fm: require('./images/BV1FhcTzuEyq.jpg')
    },
    {
        id: 'BV1DCc5zVE2S',
        bvid: 'BV1DCc5zVE2S',
        category: 4,
        bt: '在scratch中绘制圆形并填充',
        jj: '这是一个在scratch中绘制圆形并填充的教程，使用原版sc就能实现',
        fm: require('./images/BV1DCc5zVE2S.jpg')
    },
    {
        id: 'BV1yGcWzxEVU',
        bvid: 'BV1yGcWzxEVU',
        category: 3,
        bt: 'scratch克隆体使用教程，搭配仅适用于当前角色的变量',
        jj: '这是一个类似于进阶版的scratch克隆体教程，讲解了"仅适用于当前角色"的变量是如何搭配克隆体使用的方法，我之前也出过一期克隆体教程，但是讲的并不好，所以就有了这期视频。(其实这期也不是很好...) 此教程适用于原版scratch及其他的scratch衍生版本。',
        fm: require('./images/BV1yGcWzxEVU.jpg')
    },
    {
        id: 'BV1tMfmBbEZT',
        bvid: 'BV1tMfmBbEZT',
        category: 4,
        bt: 'Turbowarp更加简单的进度条教程',
        jj: '是的是的，必须用turbowarp，scratch做不到。 这已经是我能想出来用TW制作的最简单的方法了',
        fm: require('./images/BV1tMfmBbEZT.jpg')
    },
    {
        id: 'BV1DcASz2Ebx',
        bvid: 'BV1DcASz2Ebx',
        category: 2,
        bt: 'scratch自制积木教程',
        jj: '这个不是给大佬看的，是给刚入门的小白看的。大佬们如果觉得我有哪里讲的不对，可以指正一下！',
        fm: require('./images/BV1DcASz2Ebx.jpg')
    },
    {
        id: 'BV1h8P4zHEEK',
        bvid: 'BV1h8P4zHEEK',
        category: 5,
        bt: 'turbowarp自定义的返回值扩展',
        jj: '这是一个turbowarp的教程，仅对turbowarp或者turbowarp的衍生版本有效',
        fm: require('./images/BV1h8P4zHEEK.jpg')
    },
    {
        id: 'BV1h8wxz1Eb8',
        bvid: 'BV1h8wxz1Eb8',
        category: 3,
        bt: '原版scratch帧率曲线图制作教程，纯画笔，不用克隆体',
        jj: '原版scratch也能做到的帧率曲线图教程，也可以用于制作其他数值的曲线图。 如果你觉得你绘制的线条不够清楚，可以使用turbowarp的高清画笔功能，方法：点击顶部高级 >>勾选高清画笔 如果你喜欢我的视频，可以关注我哦，往后还会有很多scratch或者turbowarp的教程视频！ 如果你有想看的教程，可以发在评论区或者私信我，我会尽可能实现。',
        fm: require('./images/BV1h8wxz1Eb8.jpg')
    },
    {
        id: 'BV1nvX5BgEUw',
        bvid: 'BV1nvX5BgEUw',
        category: 4,
        bt: '用scratch做出丝滑的展示分数，原版scratch也能用的教程',
        jj: '这个教程适用于原版的scratch',
        fm: require('./images/BV1nvX5BgEUw.jpg')
    },
    {
        id: 'BV1Z9QABeENg',
        bvid: 'BV1Z9QABeENg',
        category: 5,
        bt: '4分钟内在Turbowarp里做一个文件管理？非常简单！',
        jj: '这个代码完全开源，您可以直接在您的任何作品使用，网址放在评论区啦！ 可以三连支持一下我嘛~',
        fm: require('./images/BV1Z9QABeENg.jpg')
    },
    {
        id: 'BV1DUnhzkEJb',
        bvid: 'BV1DUnhzkEJb',
        category: 4,
        bt: 'Turbowarp怎么加载自定义扩展？（附带gandi教程）',
        jj: '怎么加载自定义扩展一个视频告诉你！',
        fm: require('./images/BV1DUnhzkEJb.jpg')
    },
    //tips
    {
        id: 'BV18fxVz6EiE',
        bvid: 'BV18fxVz6EiE',
        category: 4,
        bt: 'Scratch扩展合并器！合并多段扩展代码',
        jj: '这个想法小时候就想做了，现在有AI，总算是把小时候的梦给圆上了 这个工具说实话，其实没啥用（主要是为了圆梦） 体验网址：https://yunpa.vip/10000why.html 下载链接：https://yunpavip.lanzn.com/iKVd237rpdhi 无密码',
        fm: require('./images/BV18fxVz6EiE.jpg')
    },
    //facts
    {
        id: 'BV1hi2HBcEuD',
        bvid: 'BV1hi2HBcEuD',
        category: 6,
        bt: '为什么0.1+0.2不等于0.3？一期视频讲清！',
        jj: 'IEEE754标准经度有限，只能存近似值，指数偏移并不精确等，最终导致0.1+0.2≠0.3。',
        fm: require('./images/BV1hi2HBcEuD.jpg')
    },
    //extension
    {
        id: 'BV1q3aezREjd',
        bvid: 'BV1q3aezREjd',
        category: 5,
        bt: '简单几个扩展积木实现网页社区？还开源！',
        jj: '本视频/扩展由10000why制作，支持二创，严禁获取源码后生称自己为原作者！ 我之后会出一些运用此积木的示例作品，在删除角色一游戏中就添加了这个扩展（感兴趣的可以看下我之前的视频） https://yunpavip.lanzn.com/irS7j35hqrze 密码:视频结尾会说 希望你能给我个三连，最好能关注一下，非常感谢你的支持 总之还看什么简介呢快去看视频！',
        fm: require('./images/BV1q3aezREjd.jpg')
    },
    {
        id: 'BV1FDUTBGE2H',
        bvid: 'BV1FDUTBGE2H',
        category: 5,
        bt: 'Scratch云列表，当然是真的（免费开源）',
        jj: 'github：https://github.com/xiao-xiao-lang/bilibili-/blob/%E5%BC%80%E6%BA%90%E5%85%B6%E4%BB%96%E9%A1%B9%E7%9B%AE/%E4%BA%91%E5%88%97%E8%A1%A8json.js 蓝奏云（无需登录）：https://wwet.lanzouu.com/ijLc73bz0wzc',
        fm: require('./images/BV1FDUTBGE2H.jpg')
    },
    {
        id: 'BV1khhyzZEyS',
        bvid: 'BV1khhyzZEyS',
        category: 5,
        bt: '一个Scratch摇杆扩展积木',
        jj: '这是一个scratch摇杆扩展，不需要填写任何内容，自动模拟按键/判定 使用自研九宫格算法，因为是自研的算法所以有很多bug，请在使用的时候勾选在非沙和环境下运行 这个扩展只能使用tubowarp里面的自定义扩展打开或者是其他支持自定义扩展的编辑器 下载链接：https://wwtd.lanzn.com/iH0xU34sjceb 密码:视频结尾会说（传统） （有必要说一下：主体代码由AI生成） 希望你能给up点个关注，谢谢，小up都是这么一步一步走过来的 总之别看简介了，快看视频啊！求三连！',
        fm: require('./images/BV1khhyzZEyS.jpg')
    },
    {
        id: 'BV1BAeyzZEf3',
        bvid: 'BV1BAeyzZEf3',
        category: 5,
        bt: '一个万能的Scratch方向键积木',
        jj: '无需任何调试，一个积木实现移动端操作，支持长按等 蓝凑云下载链接： https://wwtd.lanzn.com/iqDVn34mf9kj 密码:视频结尾会说！或者联系我 用的作者做的扩展了，也点个关注呗，小up都很不容易的 （有必要说一下：这个扩展主题由ai制作）',
        fm: require('./images/BV1BAeyzZEf3.jpg')
    },
    {
        id: 'BV1vBpRzsEDK',
        bvid: 'BV1vBpRzsEDK',
        category: 5,
        bt: '超多积木的B站Scratch扩展！还开源！',
        jj: '全球首发！自制 B站扩展！ 源码/文档：http://yunpa.vip/10000why扩展文档 js文件下载：https://yunpavip.lanzn.com/iJemi36mrgaf 密码:视频结尾会说 turbowarp网页体验此扩展：https://turbowarp.org/editor?extension=https://yunpa.vip/10000why扩展文档/扩展.js 别看简介了，快去看视频吧！ (有必要说一下，这个扩展主体由AI制作，避免一些人…) ',
        fm: require('./images/BV1vBpRzsEDK.jpg')
    },
    {
        id: 'BV16Exvz7E6N',
        bvid: 'BV16Exvz7E6N',
        category: 5,
        bt: '云变量扩展⁈ 已开源！',
        jj: '注意事项： 请勿改动，这个扩展的任何代码，这会影响其他使用此扩展的用户 下载链接：https://yunpavip.lanzn.com/iSzAd37yf8ad 提取码：视频结尾会写',
        fm: require('./images/BV16Exvz7E6N.jpg')
    },
    {
        id: 'BV1XPWbz1Ezb',
        bvid: 'BV1XPWbz1Ezb',
        category: 5,
        bt: '功能丰富的框选扩展！在Scratch中实现红警？',
        jj: '这个扩展和视频制作花了Up很长时间，求个三连不过分吧？ 下载网址：https://yunpavip.lanzn.com/ijo8338rz01a Bro认为bro的视频封面发生了技术爆炸 总之，别看简介了，快去看视频啊！',
        fm: require('./images/BV1XPWbz1Ezb.jpg')
    },
    {
        id: 'BV1Sm1kBJEBg',
        bvid: 'BV1Sm1kBJEBg',
        category: 5,
        bt: 'Scratch音频编码扩展，实现实时免费通话！',
        jj: '本扩展10000why原创，支持二创，但禁止声称自己为原创 下载链接：https://yunpavip.lanzn.com/ipu0G3a4qqbg （无提取码）',
        fm: require('./images/BV1Sm1kBJEBg.jpg')
    }
];

const TutorialModal = props => {
    const [selectedCategory, setSelectedCategory] = useState(1);
    const [showAddTutorialModal, setShowAddTutorialModal] = useState(false);

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
            duration: 0,
            url: tutorial.url
        };
        props.openVideoModal({ ...tutorial, ...tutorialDetails });
    };

    const handleAddTutorialClick = () => {
        setShowAddTutorialModal(true);
    };

    const handleCloseAddTutorialModal = () => {
        setShowAddTutorialModal(false);
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
                    {[1, 2, 3, 4, 5, 6, 7].map(categoryId => {
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
                <div 
                    className={styles.addTutorialButton}
                    onClick={handleAddTutorialClick}
                >
                    <div className={styles.addIcon}>+</div>
                </div>
                {showAddTutorialModal && (
                    <div className={styles.modalOverlay} onClick={handleCloseAddTutorialModal}>
                        <div className={styles.addTutorialModal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h3>加入教程</h3>
                                <button className={styles.closeIconButton} onClick={handleCloseAddTutorialModal}>
                                    ×
                                </button>
                            </div>
                            <p>点击下方链接加入腾讯频道，提交你的视频教程：</p>
                            <a 
                                href="https://pd.qq.com/s/6cn3ldjnw?b=5" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={styles.qqLink}
                            >
                                【RemixWarp重构跃迁】腾讯频道
                            </a>
                            <button className={styles.confirmButton} onClick={handleCloseAddTutorialModal}>
                                关闭
                            </button>
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

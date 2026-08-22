import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, FormattedMessage} from 'react-intl';

import {closeRoadmapModal} from '../../reducers/modals.js';

import WindowedModal from '../../containers/windowed-modal.jsx';

import styles from './roadmap-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Editor Hardcore Roadmap',
        description: 'Title of the roadmap modal',
        id: 'roadmap-modal.title'
    },
    subtitle: {
        defaultMessage: 'MistWarp / RemixWarp editor enhancement plan',
        description: 'Subtitle of the roadmap modal',
        id: 'roadmap-modal.subtitle'
    },
    direction: {
        defaultMessage: 'Direction',
        description: 'Column header for roadmap direction',
        id: 'roadmap-modal.direction'
    },
    status: {
        defaultMessage: 'Status',
        description: 'Column header for roadmap status',
        id: 'roadmap-modal.status'
    }
});

// ✅ 已实现　🟡 部分 / 进行中　⬜ 规划中
const ROADMAP = [
    {n: 1, title: 'Zen 模式', status: '✅', desc: '活动栏按钮 + 命令面板入口，一键免打扰'},
    {n: 2, title: '命令中心', status: '✅', desc: '标题栏命令面板入口'},
    {n: 3, title: '面包屑', status: '✅', desc: '代码编辑器顶部已嵌入面包屑 + 吸顶滚动 + 缩进参考线'},
    {n: 4, title: '多工作区', status: '🟡', desc: '基础架构在'},
    {n: 5, title: '底部面板补全', status: '🟡', desc: '输出 + 控制台已落地'},
    {n: 6, title: 'Monaco 满配', status: '✅', desc: '连字 / 多光标 / 滚轮缩放 / 折叠 / 小地图 / 面包屑'},
    {n: 7, title: '标题栏强化', status: '✅', desc: '项目名 + 未保存圆点 + Git 分支'},
    {n: 8, title: '快捷键深度化', status: '✅', desc: '新增「超级重构」分类与改键'},
    {n: 9, title: '调试增强', status: '🟡', desc: '基础断点 / 单步在'},
    {n: 10, title: '分屏增强', status: '🟡', desc: '多代码分组在'}
];

const statusClass = status => {
    if (status === '✅') return styles.statusDone;
    if (status === '🟡') return styles.statusPartial;
    return styles.statusPlanned;
};

const RoadmapModal = ({visible, onRequestClose, intl}) => (
    <WindowedModal
        id="roadmap-modal"
        contentLabel={intl.formatMessage(messages.title)}
        visible={visible}
        onRequestClose={onRequestClose}
        title={intl.formatMessage(messages.title)}
        width={760}
        height={560}
    >
        <div className={styles.container}>
            <p className={styles.subtitle}>
                <FormattedMessage {...messages.subtitle} />
            </p>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.thIndex}>#</th>
                        <th><FormattedMessage {...messages.direction} /></th>
                        <th><FormattedMessage {...messages.status} /></th>
                        <th className={styles.thDesc}>说明</th>
                    </tr>
                </thead>
                <tbody>
                    {ROADMAP.map(item => (
                        <tr key={item.n}>
                            <td className={styles.tdIndex}>{item.n}</td>
                            <td className={styles.tdTitle}>{item.title}</td>
                            <td className={statusClass(item.status)}>{item.status}</td>
                            <td className={styles.tdDesc}>{item.desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </WindowedModal>
);

RoadmapModal.propTypes = {
    visible: PropTypes.bool,
    onRequestClose: PropTypes.func.isRequired,
    intl: PropTypes.shape({
        formatMessage: PropTypes.func
    }).isRequired
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.roadmapModal
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeRoadmapModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(RoadmapModal));

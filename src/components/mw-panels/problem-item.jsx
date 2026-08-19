import React from 'react';
import PropTypes from 'prop-types';
import {defineMessages, injectIntl} from 'react-intl';
import styles from './mw-panel-bar.css';

const messages = defineMessages({
    jumpTo: {
        id: 'mw.panel.jumpToBlock',
        defaultMessage: '点击跳转到对应位置',
        description: 'Tooltip for problem items, jumps to the related block'
    },
    error: {
        id: 'mw.panel.severity.error',
        defaultMessage: '错误',
        description: 'Error severity label'
    },
    warning: {
        id: 'mw.panel.severity.warning',
        defaultMessage: '警告',
        description: 'Warning severity label'
    },
    info: {
        id: 'mw.panel.severity.info',
        defaultMessage: '提示',
        description: 'Info severity label'
    }
});

const severityOrder = {
    error: 0,
    warning: 1,
    info: 2
};

class ProblemItem extends React.Component {
    constructor (props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick () {
        this.props.onJump(this.props.problem);
    }
    render () {
        const {problem, intl} = this.props;
        const sev = Object.prototype.hasOwnProperty.call(severityOrder, problem.severity) ?
            problem.severity : 'info';
        const marker = sev === 'error' ? '✕' : sev === 'warning' ? '▲' : 'ℹ';
        const label = sev === 'error' ? messages.error : sev === 'warning' ? messages.warning : messages.info;
        return (
            <button
                className={styles.problemItem}
                onClick={this.handleClick}
                title={`${intl.formatMessage(messages.jumpTo)}（${intl.formatMessage(label)}）`}
            >
                <span
                    className={styles.problemMark}
                    data-severity={sev}
                >
                    {marker}
                </span>
                <span className={styles.problemMessage}>{problem.message}</span>
                {problem.source ? (
                    <span className={styles.problemSource}>{problem.source}</span>
                ) : null}
            </button>
        );
    }
}

ProblemItem.propTypes = {
    problem: PropTypes.object.isRequired,
    intl: PropTypes.object,
    onJump: PropTypes.func.isRequired
};

ProblemItem.defaultProps = {
    intl: null
};

export default injectIntl(ProblemItem);

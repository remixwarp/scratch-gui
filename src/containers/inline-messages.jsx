import React, {useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';

import {
    filterInlineAlerts
} from '../reducers/alerts';
import {AlertLevels} from '../lib/alerts/index.jsx';
import notificationManager from '../lib/notification-manager.js';

const LEVEL_TO_TYPE = {
    [AlertLevels.SUCCESS]: 'success',
    [AlertLevels.INFO]: 'info',
    [AlertLevels.WARN]: 'warning'
};

// 未配置 maxDisplaySecs 的提示（如"新建还原点中…"等进度提示）
// 也使用默认时长自动关闭，避免 toast 一直停留在右下角
const DEFAULT_TOAST_DURATION = 4000;

const InlineMessages = ({
    alertsList,
    intl
}) => {
    const currentToastIdRef = useRef(null);

    // only inline alerts are shown via the notification system
    const inlineAlerts = filterInlineAlerts(alertsList || []);
    const firstInlineAlert = inlineAlerts[0];

    useEffect(() => {
        if (!firstInlineAlert) {
            // 所有内联提示都消失时，关闭之前显示的右下角提示
            if (currentToastIdRef.current) {
                notificationManager.dismiss(currentToastIdRef.current);
                currentToastIdRef.current = null;
            }
            return;
        }

        const {
            content,
            level,
            maxDisplaySecs
        } = firstInlineAlert;

        // 从 FormattedMessage 元素中提取纯文本消息
        let message = '';
        if (React.isValidElement(content)) {
            const {id, defaultMessage, values} = content.props;
            try {
                message = intl.formatMessage({id, defaultMessage}, values);
            } catch (e) {
                message = defaultMessage;
            }
        } else if (typeof content === 'string') {
            message = content;
        }

        if (!message) {
            return;
        }

        // 先关闭上一条提示，避免右下角提示叠加
        if (currentToastIdRef.current) {
            notificationManager.dismiss(currentToastIdRef.current);
        }

        const type = LEVEL_TO_TYPE[level] || 'info';
        const duration = typeof maxDisplaySecs === 'number' && maxDisplaySecs > 0 ?
            maxDisplaySecs * 1000 : DEFAULT_TOAST_DURATION;
        currentToastIdRef.current = notificationManager.show(message, type, duration);
    }, [intl, firstInlineAlert]);

    // 右上角内联提示已改为通过右下角通知（toast）展示
    return null;
};

InlineMessages.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object),
    intl: PropTypes.shape({
        formatMessage: PropTypes.func.isRequired
    }).isRequired
};

const mapStateToProps = state => ({
    alertsList: state.scratchGui.alerts.alertsList
});

const mapDispatchToProps = () => ({});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(InlineMessages));
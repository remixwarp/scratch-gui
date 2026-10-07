import React from 'react';
import bindAll from 'lodash.bindall';
import {FormattedMessage} from 'react-intl';
import {GripVertical, Lock} from 'lucide-react';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';
import LayoutToolbar from './layout-toolbar.jsx';
import styles from './settings-modal.css';
import {
    BUTTONS,
    FIXED_BOTTOM,
    getOrder,
    getHidden,
    isHidden,
    setOrder,
    setHidden,
    setHiddenAll
} from '../../lib/mw-activity-bar-layout';

const LABELS = {
    explorer: <FormattedMessage
        defaultMessage="资源管理器"
        description="Label for the explorer button in activity bar layout settings"
        id="tw.settingsModal.activityBarItem.explorer"
    />,
    addonSettings: <FormattedMessage
        defaultMessage="插件设置"
        description="Label for the addon settings button in activity bar layout settings"
        id="tw.settingsModal.activityBarItem.addonSettings"
    />,
    addExtension: <FormattedMessage
        defaultMessage="添加扩展"
        description="Label for the add extension button in activity bar layout settings"
        id="tw.settingsModal.activityBarItem.addExtension"
    />,
    collaboration: 'Live Collaboration',
    todo: 'Todo',
    git: 'Git',
    bookmarks: <FormattedMessage
        defaultMessage="书签"
        description="Label for the bookmarks button in activity bar layout settings"
        id="tw.settingsModal.activityBarItem.bookmarks"
    />,
    aiAgent: 'AI Agent',
    achievements: <FormattedMessage
        defaultMessage="成就"
        description="Label for the achievements button in activity bar layout settings"
        id="tw.settingsModal.activityBarItem.achievements"
    />
};

class UnwrappedActivityBarLayoutSetting extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleDragStart',
            'handleDragOver',
            'handleDrop',
            'handleDragEnd',
            'handleSelectAll',
            'handleSelectNone'
        ]);
        this.state = {
            order: getOrder(),
            hidden: getHidden(),
            dragId: null
        };
    }
    handleToggle (id) {
        return e => {
            setHidden(id, !e.target.checked);
            this.setState({hidden: getHidden()});
        };
    }
    handleSelectAll () {
        setHiddenAll(BUTTONS, false);
        this.setState({hidden: getHidden()});
    }
    handleSelectNone () {
        setHiddenAll(BUTTONS, true);
        this.setState({hidden: getHidden()});
    }
    handleDragStart (id) {
        return e => {
            this.setState({dragId: id});
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
            }
        };
    }
    handleDragOver (e) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }
    handleDrop (targetId) {
        return e => {
            e.preventDefault();
            const {dragId} = this.state;
            if (!dragId || dragId === targetId) return;
            const order = this.state.order.slice();
            const from = order.indexOf(dragId);
            const to = order.indexOf(targetId);
            if (from === -1 || to === -1) return;
            order.splice(from, 1);
            order.splice(to, 0, dragId);
            setOrder(order);
            this.setState({order: getOrder(), dragId: null});
        };
    }
    handleDragEnd () {
        this.setState({dragId: null});
    }
    renderButtonRow (id) {
        const visible = !isHidden(id);
        const label = LABELS[id] || id;
        return (
            <div
                key={id}
                className={styles['menu-bar-row']}
                draggable
                onDragStart={this.handleDragStart(id)}
                onDragOver={this.handleDragOver}
                onDrop={this.handleDrop(id)}
                onDragEnd={this.handleDragEnd}
            >
                <GripVertical
                    className={styles['menu-bar-grip']}
                    size={16}
                />
                <span className={styles['menu-bar-row-label']}>{label}</span>
                <FancyCheckbox
                    className={styles.checkbox}
                    checked={visible}
                    onChange={this.handleToggle(id)}
                />
            </div>
        );
    }
    renderFixedRow (id) {
        const label = <FormattedMessage
            defaultMessage="设置（固定）"
            description="Label for the pinned settings button in activity bar layout settings"
            id="tw.settingsModal.activityBar.settingsFixed"
        />;
        return (
            <div
                key={id}
                className={styles['menu-bar-row']}
            >
                <Lock
                    className={styles['menu-bar-grip']}
                    size={16}
                />
                <span className={styles['menu-bar-row-label']}>{label}</span>
            </div>
        );
    }
    render () {
        return (
            <div className={styles.setting}>
                <div className={styles['layout-header']}>
                    <div className={styles['menu-bar-hint']}>
                        <FormattedMessage
                            defaultMessage="拖动左侧把手以调整活动栏按钮顺序，取消勾选以隐藏。设置按钮固定在底部，不可调整。"
                            description="Hint for the activity bar layout setting"
                            id="tw.settingsModal.activityBar.hint"
                        />
                    </div>
                    <LayoutToolbar
                        onSelectAll={this.handleSelectAll}
                        onSelectNone={this.handleSelectNone}
                    />
                </div>
                <div className={styles['menu-bar-zone-label']}>
                    <FormattedMessage
                        defaultMessage="活动栏按钮"
                        description="Label for the activity bar buttons section"
                        id="tw.settingsModal.activityBar.buttonsLabel"
                    />
                </div>
                {this.state.order
                    .filter(id => BUTTONS.indexOf(id) !== -1)
                    .map(id => this.renderButtonRow(id))}
                <div className={styles['menu-bar-zone-label']}>
                    <FormattedMessage
                        defaultMessage="固定在底部（不可开关 / 调整）"
                        description="Label for the fixed-at-bottom section in activity bar layout settings"
                        id="tw.settingsModal.activityBar.fixedBottomLabel"
                    />
                </div>
                {FIXED_BOTTOM.map(id => this.renderFixedRow(id))}
            </div>
        );
    }
}

export default UnwrappedActivityBarLayoutSetting;

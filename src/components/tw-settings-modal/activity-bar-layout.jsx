import React from 'react';
import bindAll from 'lodash.bindall';
import {GripVertical, Lock} from 'lucide-react';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';
import styles from './settings-modal.css';
import {
    BUTTONS,
    FIXED_BOTTOM,
    getOrder,
    getHidden,
    isHidden,
    setOrder,
    setHidden
} from '../../lib/mw-activity-bar-layout';

const LABELS = {
    addonSettings: '插件设置',
    addExtension: '添加扩展',
    collaboration: 'Live Collaboration',
    todo: 'Todo',
    git: 'Git',
    bookmarks: '书签',
    aiAgent: 'AI Agent',
    achievements: '成就'
};

class UnwrappedActivityBarLayoutSetting extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleDragStart',
            'handleDragOver',
            'handleDrop',
            'handleDragEnd'
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
        const label = id === 'settings' ? '设置（固定）' : '登录 / 头像（固定）';
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
                <div className={styles['menu-bar-hint']}>
                    {'拖动左侧把手以调整活动栏按钮顺序，取消勾选以隐藏。设置按钮与登录/头像固定在底部，不可调整。'}
                </div>
                <div className={styles['menu-bar-zone-label']}>
                    {'活动栏按钮'}
                </div>
                {this.state.order
                    .filter(id => BUTTONS.indexOf(id) !== -1)
                    .map(id => this.renderButtonRow(id))}
                <div className={styles['menu-bar-zone-label']}>
                    {'固定在底部（不可开关 / 调整）'}
                </div>
                {FIXED_BOTTOM.map(id => this.renderFixedRow(id))}
            </div>
        );
    }
}

export default UnwrappedActivityBarLayoutSetting;

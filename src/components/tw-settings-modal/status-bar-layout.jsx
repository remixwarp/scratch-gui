import React from 'react';
import bindAll from 'lodash.bindall';
import {FormattedMessage} from 'react-intl';
import {GripVertical, Lock} from 'lucide-react';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';
import LayoutToolbar from './layout-toolbar.jsx';
import styles from './settings-modal.css';
import {
    SEGMENTS,
    RIGHT_FIXED,
    getOrder,
    getHidden,
    isHidden,
    setOrder,
    setHidden,
    setHiddenAll
} from '../../lib/mw-status-bar-layout';

const LABELS = {
    workspaceMouse: <FormattedMessage
        defaultMessage="鼠标在工作区的坐标"
        description="Label for the workspace mouse coordinates status bar segment"
        id="tw.settingsModal.statusBarItem.workspaceMouse"
    />,
    stageMouse: <FormattedMessage
        defaultMessage="鼠标在舞台上的坐标"
        description="Label for the stage mouse coordinates status bar segment"
        id="tw.settingsModal.statusBarItem.stageMouse"
    />,
    zoom: <FormattedMessage
        defaultMessage="缩放比例"
        description="Label for the zoom status bar segment"
        id="tw.settingsModal.statusBarItem.zoom"
    />,
    blockCount: <FormattedMessage
        defaultMessage="积木数"
        description="Label for the block count status bar segment"
        id="tw.settingsModal.statusBarItem.blockCount"
    />,
    spriteName: <FormattedMessage
        defaultMessage="当前角色"
        description="Label for the current sprite status bar segment"
        id="tw.settingsModal.statusBarItem.spriteName"
    />,
    fps: <FormattedMessage
        defaultMessage="帧率 FPS"
        description="Label for the FPS status bar segment"
        id="tw.settingsModal.statusBarItem.fps"
    />,
    running: <FormattedMessage
        defaultMessage="运行状态"
        description="Label for the running state status bar segment"
        id="tw.settingsModal.statusBarItem.running"
    />,
    onlineStatus: <FormattedMessage
        defaultMessage="在线状态"
        description="Label for the online status status bar segment"
        id="tw.settingsModal.statusBarItem.onlineStatus"
    />
};

class UnwrappedStatusBarLayoutSetting extends React.Component {
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
        setHiddenAll(SEGMENTS, false);
        this.setState({hidden: getHidden()});
    }
    handleSelectNone () {
        setHiddenAll(SEGMENTS, true);
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
    renderRow (id) {
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
        const visible = !isHidden(id);
        const label = LABELS[id] || id;
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
                <FancyCheckbox
                    className={styles.checkbox}
                    checked={visible}
                    onChange={this.handleToggle(id)}
                />
            </div>
        );
    }
    render () {
        const draggableIds = this.state.order
            .filter(id => SEGMENTS.indexOf(id) !== -1 && RIGHT_FIXED.indexOf(id) === -1);
        return (
            <div className={styles.setting}>
                <div className={styles['layout-header']}>
                    <div className={styles['menu-bar-hint']}>
                        <FormattedMessage
                            defaultMessage="拖动左侧把手以调整状态栏显示内容的顺序，取消勾选以隐藏。"
                            description="Hint for the status bar layout setting"
                            id="tw.settingsModal.statusBar.hint"
                        />
                    </div>
                    <LayoutToolbar
                        onSelectAll={this.handleSelectAll}
                        onSelectNone={this.handleSelectNone}
                    />
                </div>
                <div className={styles['menu-bar-zone-label']}>
                    <FormattedMessage
                        defaultMessage="状态栏内容"
                        description="Label for the status bar contents section"
                        id="tw.settingsModal.statusBar.contentLabel"
                    />
                </div>
                {draggableIds.map(id => this.renderRow(id))}
                <div className={styles['menu-bar-zone-label']}>
                    <FormattedMessage id="tw.settingsModal.fixedRightLabel" defaultMessage="Fixed right" />
                </div>
                {RIGHT_FIXED
                    .filter(id => SEGMENTS.indexOf(id) !== -1)
                    .map(id => this.renderFixedRow(id))}
            </div>
        );
    }
}

export default UnwrappedStatusBarLayoutSetting;

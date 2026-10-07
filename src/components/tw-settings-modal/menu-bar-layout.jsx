import React from 'react';
import bindAll from 'lodash.bindall';
import {FormattedMessage} from 'react-intl';
import {GripVertical} from 'lucide-react';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';
import LayoutToolbar from './layout-toolbar.jsx';
import styles from './settings-modal.css';
import {
    ZONES,
    getZoneDisplayOrder,
    getZoneExtras,
    setZoneOrder,
    getHidden,
    setHidden,
    setHiddenAll,
    getPresentOrderedIds
} from '../../lib/mw-menu-bar-layout';

const LABELS = {
    'file': <FormattedMessage
        defaultMessage="文件"
        description="Label for the file menu in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.file"
    />,
    'view': <FormattedMessage
        defaultMessage="查看"
        description="Label for the view menu in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.view"
    />,
    'bookmarks': <FormattedMessage
        defaultMessage="书签"
        description="Label for the bookmarks menu in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.bookmarks"
    />,
    'edit': <FormattedMessage
        defaultMessage="编辑"
        description="Label for the edit menu in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.edit"
    />,
    'tools': <FormattedMessage
        defaultMessage="工具"
        description="Label for the tools menu in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.tools"
    />,
    'mode': <FormattedMessage
        defaultMessage="模式"
        description="Label for the mode menu in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.mode"
    />,
    'block-count': <FormattedMessage
        defaultMessage="积木数量"
        description="Label for the block count item in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.blockCount"
    />,
    'save-status': <FormattedMessage
        defaultMessage="保存状态"
        description="Label for the save status item in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.saveStatus"
    />,
    'addons': <FormattedMessage
        defaultMessage="扩展"
        description="Label for the addons menu in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.addons"
    />,
    'settings': <FormattedMessage
        defaultMessage="设置"
        description="Label for the settings button in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.settings"
    />,
    'about': <FormattedMessage
        defaultMessage="关于"
        description="Label for the about menu in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.about"
    />,
    'project-title': <FormattedMessage
        defaultMessage="项目标题"
        description="Label for the project title in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.projectTitle"
    />,
    'community': <FormattedMessage
        defaultMessage="社区"
        description="Label for the community menu in menu bar layout settings"
        id="tw.settingsModal.menuBarItem.community"
    />,
    'rwck-publish': <FormattedMessage
        defaultMessage="发布到创客次元"
        description="Label for the Rwck publish item in menu bar layout settings"
        id="gui.menuBar.publishRwck"
    />
};

const isVisibleItem = id => !id.startsWith('__');

class UnwrappedMenuBarLayoutSetting extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleDragEnd', 'handleSelectAll', 'handleSelectNone']);
        const present = getPresentOrderedIds();
        this.state = {
            present,
            orders: this.readOrders(present),
            hidden: getHidden(),
            dragId: null,
            dragZone: null
        };
    }
    readOrders (present) {
        const orders = {};
        for (const zone of ZONES) {
            orders[zone.id] = getZoneDisplayOrder(zone.id, present);
        }
        return orders;
    }
    handleToggle (id) {
        return e => {
            setHidden(id, !e.target.checked);
            this.setState({hidden: getHidden()});
        };
    }
    handleSelectAll () {
        const ids = getPresentOrderedIds().filter(isVisibleItem);
        setHiddenAll(ids, false);
        this.setState({hidden: getHidden()});
    }
    handleSelectNone () {
        const ids = getPresentOrderedIds().filter(isVisibleItem);
        setHiddenAll(ids, true);
        this.setState({hidden: getHidden()});
    }
    handleDragStart (zoneId, id) {
        return () => this.setState({dragId: id, dragZone: zoneId});
    }
    handleDragEnd () {
        this.setState({dragId: null, dragZone: null});
    }
    handleDrop (zoneId, overId) {
        return e => {
            e.preventDefault();
            const {dragId, dragZone} = this.state;
            if (!dragId || dragZone !== zoneId || dragId === overId) return;
            const order = this.state.orders[zoneId].slice();
            const from = order.indexOf(dragId);
            const to = order.indexOf(overId);
            if (from === -1 || to === -1) return;
            order.splice(from, 1);
            order.splice(to, 0, dragId);
            setZoneOrder(zoneId, order);
            this.setState(prev => ({
                orders: {...prev.orders, [zoneId]: order},
                dragId: null,
                dragZone: null
            }));
        };
    }
    renderRow (zoneId, id, draggable) {
        const visible = !this.state.hidden.includes(id);
        const label = LABELS[id] || (id.startsWith('auto:') ? id.slice('auto:'.length) : id);
        return (
            <div
                key={id}
                className={styles['menu-bar-row']}
                draggable={draggable}
                onDragStart={draggable ? this.handleDragStart(zoneId, id) : null}
                onDragEnd={draggable ? this.handleDragEnd : null}
                onDragOver={draggable ? (e => e.preventDefault()) : null}
                onDrop={draggable ? this.handleDrop(zoneId, id) : null}
            >
                {draggable && (
                    <GripVertical
                        className={styles['menu-bar-grip']}
                        size={16}
                    />
                )}
                <span className={styles['menu-bar-row-label']}>{label}</span>
                <FancyCheckbox
                    className={styles.checkbox}
                    checked={visible}
                    onChange={this.handleToggle(id)}
                />
            </div>
        );
    }
    renderZone (zoneId) {
        const ids = (this.state.orders[zoneId] || []).filter(isVisibleItem);
        const extras = getZoneExtras(zoneId, this.state.present).filter(isVisibleItem);
        return (
            <React.Fragment key={zoneId}>
                {ids.map(id => this.renderRow(zoneId, id, true))}
                {extras.map(id => this.renderRow(null, id, false))}
            </React.Fragment>
        );
    }
    sectionRowCount (section) {
        return section.zones.reduce((count, zoneId) => (
            count +
            (this.state.orders[zoneId] || []).filter(isVisibleItem).length +
            getZoneExtras(zoneId, this.state.present).filter(isVisibleItem).length
        ), 0);
    }
    render () {
        return (
            <div className={styles.setting}>
                <div className={styles['layout-header']}>
                    <div className={styles['menu-bar-hint']}>
                        <FormattedMessage
                            defaultMessage="拖动以重新排序每组中的项目。取消勾选以隐藏。"
                            description="Hint for the menu bar layout setting"
                            id="mw.settingsModal.menuBarHint"
                        />
                    </div>
                    <LayoutToolbar
                        onSelectAll={this.handleSelectAll}
                        onSelectNone={this.handleSelectNone}
                    />
                </div>
                {[
                    {id: 'left', label: <FormattedMessage
                        defaultMessage="左侧菜单"
                        description="Label for the left menus section in menu bar layout settings"
                        id="mw.settingsModal.leftMenus"
                    />, zones: ['left']},
                    {id: 'right', label: <FormattedMessage
                        defaultMessage="右上角按钮"
                        description="Label for the top-right buttons section in menu bar layout settings"
                        id="mw.settingsModal.topRightButtons"
                    />, zones: ['right']}
                ].map(section => {
                    if (this.sectionRowCount(section) === 0) return null;
                    return (
                        <div key={section.id}>
                            <div className={styles['menu-bar-zone-label']}>
                                {section.label}
                            </div>
                            {section.zones.map(zoneId => this.renderZone(zoneId))}
                        </div>
                    );
                })}
            </div>
        );
    }
}

export default UnwrappedMenuBarLayoutSetting;

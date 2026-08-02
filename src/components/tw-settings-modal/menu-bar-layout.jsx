import React from 'react';
import bindAll from 'lodash.bindall';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import {GripVertical} from 'lucide-react';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';
import styles from './settings-modal.css';
import {
    ZONES,
    getZoneDisplayOrder,
    getZoneExtras,
    setZoneOrder,
    getHidden,
    setHidden,
    getPresentOrderedIds
} from '../../lib/mw-menu-bar-layout';

const LABELS = {
    'file': 'mw.menuBar.file',
    'view': 'mw.menuBar.view',
    'bookmarks': 'mw.menuBar.bookmarks',
    'edit': 'mw.menuBar.edit',
    'tools': 'mw.menuBar.tools',
    'mode': 'mw.menuBar.mode',
    'block-count': 'mw.menuBar.blockCount',
    'save-status': 'mw.menuBar.saveStatus',
    'addons': 'mw.menuBar.addons',
    'settings': 'mw.menuBar.settings',
    'about': 'mw.menuBar.about',
    'project-title': 'mw.menuBar.projectTitle',
    'community': 'mw.menuBar.community'
};

const isVisibleItem = id => !id.startsWith('__');

class UnwrappedMenuBarLayoutSetting extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleDragEnd']);
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
        const {intl} = this.props;
        const visible = !this.state.hidden.includes(id);
        const labelId = LABELS[id];
        const label = labelId ? intl.formatMessage({id: labelId, defaultMessage: labelId}) : id;
        return (
            <div
                key={id}
                className={styles.menuBarRow}
                draggable={draggable}
                onDragStart={draggable ? this.handleDragStart(zoneId, id) : null}
                onDragEnd={draggable ? this.handleDragEnd : null}
                onDragOver={draggable ? (e => e.preventDefault()) : null}
                onDrop={draggable ? this.handleDrop(zoneId, id) : null}
            >
                {draggable && (
                    <GripVertical
                        className={styles.menuBarGrip}
                        size={16}
                    />
                )}
                <span className={styles.menuBarRowLabel}>{label}</span>
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
        const {intl} = this.props;
        return (
            <div className={styles.setting}>
                <div className={styles.menuBarHint}>
                    <FormattedMessage
                        defaultMessage="Drag to reorder items within each group. Uncheck to hide."
                        id="mw.settingsModal.menuBarHint"
                    />
                </div>
                {[
                    {labelId: 'mw.settingsModal.leftMenus', zones: ['left']},
                    {labelId: 'mw.settingsModal.topRightButtons', zones: ['right']}
                ].map(section => {
                    if (this.sectionRowCount(section) === 0) return null;
                    return (
                        <div key={section.labelId}>
                            <div className={styles.menuBarZoneLabel}>
                                {intl.formatMessage({id: section.labelId, defaultMessage: section.labelId})}
                            </div>
                            {section.zones.map(zoneId => this.renderZone(zoneId))}
                        </div>
                    );
                })}
            </div>
        );
    }
}

UnwrappedMenuBarLayoutSetting.propTypes = {
    intl: intlShape.isRequired
};

const MenuBarLayoutSetting = injectIntl(UnwrappedMenuBarLayoutSetting);

export default MenuBarLayoutSetting;

import React from 'react';
import PropTypes from 'prop-types';
import styles from './command-palette.css';

class CommandItem extends React.Component {
    constructor (props) {
        super(props);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
    }
    handleMouseDown (e) {
        e.preventDefault();
        this.props.onRun(this.props.index);
    }
    handleMouseEnter () {
        this.props.onSelectIndex(this.props.index);
    }
    render () {
        const {command, selected} = this.props;
        const Icon = command.icon;
        const itemClass = selected ?
            `${styles.item} ${styles.itemSelected}` :
            styles.item;
        return (
            <div
                className={itemClass}
                onMouseDown={this.handleMouseDown}
                onMouseEnter={this.handleMouseEnter}
            >
                <Icon
                    size={16}
                    className={styles.itemIcon}
                />
                <div className={styles.itemText}>
                    <div className={styles.itemTitle}>
                        <span className={styles.itemLabel}>{command.label}</span>
                        <span className={styles.itemLabelZh}>{command.labelZh}</span>
                        {command.checked ? (
                            <span className={styles.itemChecked}>{'✓'}</span>
                        ) : null}
                    </div>
                    <div className={styles.itemDesc}>{command.descZh}</div>
                </div>
            </div>
        );
    }
}

CommandItem.propTypes = {
    command: PropTypes.object.isRequired,
    index: PropTypes.number.isRequired,
    selected: PropTypes.bool.isRequired,
    onRun: PropTypes.func.isRequired,
    onSelectIndex: PropTypes.func.isRequired
};

export default CommandItem;

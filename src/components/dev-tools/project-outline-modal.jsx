import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';

import Modal from '../../containers/windowed-modal.jsx';
import {
    closeProjectOutlineModal
} from '../../reducers/modals';

import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Project Outline',
        description: 'Title of the project outline window',
        id: 'mw.devtools.outline.title'
    },
    sprites: {
        defaultMessage: 'Sprites',
        description: 'Section header: sprites',
        id: 'mw.devtools.outline.sprites'
    },
    stage: {
        defaultMessage: 'Stage',
        description: 'Section header: stage',
        id: 'mw.devtools.outline.stage'
    },
    costumes: {
        defaultMessage: 'Costumes',
        description: 'Section header: costumes',
        id: 'mw.devtools.outline.costumes'
    },
    sounds: {
        defaultMessage: 'Sounds',
        description: 'Section header: sounds',
        id: 'mw.devtools.outline.sounds'
    },
    broadcasts: {
        defaultMessage: 'Broadcasts',
        description: 'Section header: broadcasts',
        id: 'mw.devtools.outline.broadcasts'
    },
    scripts: {
        defaultMessage: 'Top-level scripts',
        description: 'Section header: top level scripts',
        id: 'mw.devtools.outline.scripts'
    },
    empty: {
        defaultMessage: 'No project loaded.',
        description: 'Message when no project',
        id: 'mw.devtools.outline.empty'
    }
});

class ProjectOutlineModal extends React.Component {
    getOutline () {
        const vm = this.props.vm;
        if (!vm || !vm.runtime) {
            return null;
        }
        const runtime = vm.runtime;
        const targets = runtime.targets || [];
        const broadcasts = runtime.extensionManager && runtime.extensionManager._editingTarget ?
            null : null;
        // Collect broadcasts from all scripts
        const broadcastSet = {};
        for (const target of targets) {
            const blocks = target.blocks;
            if (!blocks) continue;
            const allBlocks = blocks._blocks || {};
            for (const id of Object.keys(allBlocks)) {
                const block = allBlocks[id];
                if (block.opcode === 'event_broadcast' || block.opcode === 'event_broadcastandwait') {
                    const msg = block.inputs && block.inputs.BROADCAST_INPUT &&
                        block.inputs.BROADCAST_INPUT[1];
                    if (msg && msg.id) {
                        const varObj = blocks.getVariable(msg.id);
                        if (varObj) {
                            broadcastSet[varObj.id] = varObj.name;
                        }
                    }
                }
            }
        }
        return {targets, broadcasts: Object.values(broadcastSet)};
    }
    render () {
        const intl = this.props.intl;
        const outline = this.getOutline();
        if (!outline) {
            return (
                <Modal
                    className={styles.modalContent}
                    onRequestClose={this.props.onClose}
                    id="projectOutlineModal"
                    showClose={false}
                >
                    <div className={styles.header}>
                        <h2 className={styles.title}>{intl.formatMessage(messages.title)}</h2>
                    </div>
                    <div className={styles.body}>
                        <p className={styles.empty}>{intl.formatMessage(messages.empty)}</p>
                    </div>
                </Modal>
            );
        }
        const {targets, broadcasts} = outline;
        const renderTarget = target => (
            <li className={styles.treeItem} key={target.id}>
                <strong>{target.getName()}</strong>
                <span className={styles.value}>{` — ${target.isStage ? intl.formatMessage(messages.stage) : intl.formatMessage(messages.sprites)}`}</span>
                <ul className={styles.tree}>
                    <li className={styles.treeItem}>
                        <span className={styles.sectionTitle}>{intl.formatMessage(messages.costumes)} ({target.getCostumes().length})</span>
                    </li>
                    <li className={styles.treeItem}>
                        <span className={styles.sectionTitle}>{intl.formatMessage(messages.sounds)} ({target.getSounds().length})</span>
                    </li>
                    <li className={styles.treeItem}>
                        <span className={styles.sectionTitle}>{intl.formatMessage(messages.scripts)} ({target.blocks ? Object.keys(target.blocks._blocks || {}).length : 0})</span>
                    </li>
                </ul>
            </li>
        );
        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={this.props.onClose}
                id="projectOutlineModal"
                showClose={false}
            >
                <div className={styles.header}>
                    <h2 className={styles.title}>{intl.formatMessage(messages.title)}</h2>
                </div>
                <div className={styles.body}>
                    <ul className={styles.treeRoot}>
                        {targets.map(renderTarget)}
                    </ul>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            {intl.formatMessage(messages.broadcasts)} ({broadcasts.length})
                        </h3>
                        <ul className={styles.tree}>
                            {broadcasts.map((name, i) => (
                                <li
                                    className={styles.treeItem}
                                    key={`${name}-${i}`}
                                >
                                    {name || '(empty)'}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Modal>
        );
    }
}

ProjectOutlineModal.propTypes = {
    intl: intlShape,
    vm: PropTypes.shape({
        runtime: PropTypes.object
    }),
    onClose: PropTypes.func
};

const mapStateToProps = () => ({});
const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeProjectOutlineModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ProjectOutlineModal));

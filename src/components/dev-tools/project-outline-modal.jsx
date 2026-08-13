import bindAll from 'lodash.bindall';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Project Outline',
        description: 'Title for the project outline tool',
        id: 'gui.devTools.projectOutline.title'
    },
    subtitle: {
        defaultMessage: '查看项目结构，点击角色可切换到其脚本编辑。',
        description: 'Subtitle for the project outline tool',
        id: 'gui.devTools.projectOutline.subtitle'
    },
    stage: {
        defaultMessage: '舞台',
        description: 'Stage label',
        id: 'gui.devTools.projectOutline.stage'
    },
    sprites: {
        defaultMessage: '角色',
        description: 'Sprites label',
        id: 'gui.devTools.projectOutline.sprites'
    },
    costumes: {
        defaultMessage: '造型',
        description: 'Costumes label',
        id: 'gui.devTools.projectOutline.costumes'
    },
    sounds: {
        defaultMessage: '声音',
        description: 'Sounds label',
        id: 'gui.devTools.projectOutline.sounds'
    },
    variables: {
        defaultMessage: '变量',
        description: 'Variables label',
        id: 'gui.devTools.projectOutline.variables'
    },
    lists: {
        defaultMessage: '列表',
        description: 'Lists label',
        id: 'gui.devTools.projectOutline.lists'
    },
    extensions: {
        defaultMessage: '扩展',
        description: 'Extensions label',
        id: 'gui.devTools.projectOutline.extensions'
    },
    scripts: {
        defaultMessage: '脚本',
        description: 'Scripts label',
        id: 'gui.devTools.projectOutline.scripts'
    },
    blocks: {
        defaultMessage: '积木',
        description: 'Blocks label',
        id: 'gui.devTools.projectOutline.blocks'
    },
    noProject: {
        defaultMessage: '当前没有打开的项目。',
        description: 'No project loaded',
        id: 'gui.devTools.projectOutline.noProject'
    },
    clickToEdit: {
        defaultMessage: '点击切换到此角色',
        description: 'Hint to click to edit target',
        id: 'gui.devTools.projectOutline.clickToEdit'
    }
});

class ProjectOutlineModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleSelectTarget',
            'refresh'
        ]);
        this.state = {
            targets: [],
            editingTargetId: null,
            projectOpen: false
        };
    }

    componentDidMount () {
        this.refresh();
        const vm = this.props.vm;
        if (vm) {
            this._onTargetsUpdate = () => this.refresh();
            vm.on('TARGETS_UPDATE', this._onTargetsUpdate);
        }
        // Periodic refresh so newly-run code (new variables, etc.) shows up.
        this._interval = window.setInterval(this.refresh, 1500);
    }

    componentWillUnmount () {
        const vm = this.props.vm;
        if (vm && this._onTargetsUpdate) {
            vm.off('TARGETS_UPDATE', this._onTargetsUpdate);
        }
        if (this._interval) {
            window.clearInterval(this._interval);
            this._interval = null;
        }
    }

    refresh () {
        const vm = this.props.vm;
        if (!vm || !vm.runtime) return;
        let targets = [];
        try {
            targets = vm.runtime.targets.map(target => {
                const variables = Object.values(target.variables || {});
                const lists = variables.filter(v => v.type === 'list');
                const plainVars = variables.filter(v => v.type !== 'list');
                let scripts = [];
                try {
                    if (target.blocks && typeof target.blocks.getScripts === 'function') {
                        scripts = target.blocks.getScripts();
                    }
                } catch (e) {
                    scripts = [];
                }
                let blockCount = 0;
                try {
                    if (target.blocks && typeof target.blocks._blocks !== 'undefined') {
                        blockCount = Object.keys(target.blocks._blocks || {}).length;
                    }
                } catch (e) {
                    blockCount = 0;
                }
                let extensions = [];
                try {
                    extensions = Object.keys(target.extensions || {});
                } catch (e) {
                    extensions = [];
                }
                return {
                    id: target.id,
                    name: target.isStage ? null : target.getName(),
                    isStage: target.isStage,
                    costumes: (target.costumes || []).length,
                    sounds: (target.sounds || []).length,
                    variables: plainVars.map(v => v.name),
                    lists: lists.map(v => v.name),
                    extensions,
                    scripts: scripts.length,
                    blocks: blockCount
                };
            });
        } catch (e) {
            targets = [];
        }
        this.setState({
            targets,
            editingTargetId: vm.editingTarget ? vm.editingTarget.id : null,
            projectOpen: true
        });
    }

    handleSelectTarget (targetId) {
        const vm = this.props.vm;
        if (vm && typeof vm.setEditingTarget === 'function') {
            vm.setEditingTarget(targetId);
            this.setState({editingTargetId: targetId});
        }
    }

    render () {
        const {intl} = this.props;
        const {targets, editingTargetId, projectOpen} = this.state;

        if (!projectOpen || targets.length === 0) {
            return (
                <Box className={styles.devToolsContainer}>
                    <h2 className={styles.devToolsTitle}>{intl.formatMessage(messages.title)}</h2>
                    <p className={styles.devToolsSubtitle}>{intl.formatMessage(messages.subtitle)}</p>
                    <p className={styles.devToolsEmpty}>{intl.formatMessage(messages.noProject)}</p>
                </Box>
            );
        }

        const stage = targets.find(t => t.isStage);
        const sprites = targets.filter(t => !t.isStage);

        const renderTarget = target => {
            const isEditing = target.id === editingTargetId;
            return (
                <div
                    key={target.id}
                    className={`${styles.outlineTarget} ${isEditing ? styles.outlineTargetActive : ''}`}
                    onClick={() => this.handleSelectTarget(target.id)}
                    title={intl.formatMessage(messages.clickToEdit)}
                >
                    <div className={styles.outlineTargetName}>
                        {target.isStage ? intl.formatMessage(messages.stage) : target.name}
                        {isEditing && <span className={styles.outlineEditingTag}>●</span>}
                    </div>
                    <div className={styles.outlineTargetStats}>
                        <span>{intl.formatMessage(messages.scripts)}: {target.scripts}</span>
                        <span>{intl.formatMessage(messages.blocks)}: {target.blocks}</span>
                        <span>{intl.formatMessage(messages.costumes)}: {target.costumes}</span>
                        <span>{intl.formatMessage(messages.sounds)}: {target.sounds}</span>
                        {target.variables.length > 0 && (
                            <span>{intl.formatMessage(messages.variables)}: {target.variables.join(', ')}</span>
                        )}
                        {target.lists.length > 0 && (
                            <span>{intl.formatMessage(messages.lists)}: {target.lists.join(', ')}</span>
                        )}
                        {target.extensions.length > 0 && (
                            <span>{intl.formatMessage(messages.extensions)}: {target.extensions.join(', ')}</span>
                        )}
                    </div>
                </div>
            );
        };

        return (
            <Box className={styles.devToolsContainer}>
                <h2 className={styles.devToolsTitle}>{intl.formatMessage(messages.title)}</h2>
                <p className={styles.devToolsSubtitle}>{intl.formatMessage(messages.subtitle)}</p>
            <div className={styles.outlineSection}>
                    {stage && renderTarget(stage)}
                </div>
                <h4 className={styles.devToolsSectionTitle}>
                    {intl.formatMessage(messages.sprites)} ({sprites.length})
                </h4>
                <div className={styles.outlineSection}>
                    {sprites.map(renderTarget)}
                </div>
            </Box>
        );
    }
}

ProjectOutlineModal.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func,
    vm: PropTypes.shape({
        on: PropTypes.func,
        off: PropTypes.func,
        editingTarget: PropTypes.shape({
            id: PropTypes.string
        }),
        setEditingTarget: PropTypes.func,
        runtime: PropTypes.shape({
            targets: PropTypes.array
        })
    })
};

export default injectIntl(ProjectOutlineModal);

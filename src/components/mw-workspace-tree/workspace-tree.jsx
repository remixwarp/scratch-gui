import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {
    ChevronDown,
    ChevronRight,
    Image,
    Music,
    Braces,
    List,
    Radio,
    FunctionSquare,
    Globe,
    Code2,
    FolderOpen
} from 'lucide-react';
import styles from './workspace-tree.css';

const VAR_TYPE_ICONS = {
    scalar: Braces,
    list: List,
    broadcast: Radio
};

// 单个可变/自定义积木行
const LeafRow = ({icon: Icon, name, selected, onClick, depth, badge}) => (
    <button
        type="button"
        className={classNames(styles.treeRow, styles.treeLeaf, {
            [styles.treeRowSelected]: selected
        })}
        style={{paddingLeft: `${16 + depth * 14}px`}}
        onClick={onClick}
        title={name}
    >
        <Icon size={14} className={styles.leafIcon} />
        <span className={styles.leafName}>{name}</span>
        {badge && <span className={styles.badge}>{badge}</span>}
    </button>
);

LeafRow.propTypes = {
    icon: PropTypes.func,
    name: PropTypes.string,
    selected: PropTypes.bool,
    onClick: PropTypes.func,
    depth: PropTypes.number,
    badge: PropTypes.string
};

// 一组同类资源（造型 / 声音 / 变量 / 自制积木）的折叠分组头
class ResourceGroup extends React.Component {
    constructor (props) {
        super(props);
        this.state = {expanded: props.defaultExpanded !== false};
    }

    render () {
        const {label, icon: Icon, count, children, depth} = this.props;
        const {expanded} = this.state;
        return (
            <div className={styles.group}>
                <button
                    type="button"
                    className={styles.groupHeader}
                    style={{paddingLeft: `${16 + depth * 14}px`}}
                    onClick={() => this.setState({expanded: !expanded})}
                >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Icon size={14} className={styles.groupIcon} />
                    <span className={styles.groupLabel}>{label}</span>
                    {count > 0 && <span className={styles.count}>{count}</span>}
                </button>
                {expanded && (
                    <div className={styles.groupBody}>
                        {children}
                    </div>
                )}
            </div>
        );
    }
}

ResourceGroup.propTypes = {
    label: PropTypes.string,
    icon: PropTypes.func,
    count: PropTypes.number,
    children: PropTypes.node,
    depth: PropTypes.number,
    defaultExpanded: PropTypes.bool
};

// 单个精灵 / 舞台节点
class TargetNode extends React.Component {
    constructor (props) {
        super(props);
        this.state = {expanded: props.defaultExpanded === true};
    }

    render () {
        const {
            target,
            depth,
            editingTarget,
            onSelectTarget,
            onSelectCostume,
            onSelectSound,
            intl
        } = this.props;
        const {expanded} = this.state;
        const selected = editingTarget === target.id;
        const hasChildren = target.costumes.length > 0 ||
            target.sounds.length > 0 ||
            target.scalars.length > 0 ||
            target.lists.length > 0 ||
            target.broadcasts.length > 0 ||
            target.procedures.length > 0;

        return (
            <div className={styles.targetNode}>
                <button
                    type="button"
                    className={classNames(styles.treeRow, styles.targetRow, {
                        [styles.treeRowSelected]: selected
                    })}
                    style={{paddingLeft: `${12 + depth * 14}px`}}
                    onClick={() => {
                        if (hasChildren) {
                            this.setState({expanded: !expanded});
                        }
                        onSelectTarget(target.id);
                    }}
                    title={target.name}
                >
                    {hasChildren ?
                        (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) :
                        <span className={styles.spacerIcon} />}
                    {target.isStage ?
                        <Globe size={15} className={classNames(styles.targetIcon, styles.stageIcon)} /> :
                        <Code2 size={15} className={styles.targetIcon} />}
                    <span className={styles.leafName}>{target.name}</span>
                </button>
                {expanded && (
                    <div className={styles.targetBody}>
                        {target.costumes.length > 0 && (
                            <ResourceGroup
                                label={intl.formatMessage({defaultMessage: 'Costumes', id: 'mw.tree.costumes'})}
                                icon={Image}
                                count={target.costumes.length}
                                depth={depth + 1}
                                defaultExpanded
                            >
                                {target.costumes.map(costume => (
                                    <LeafRow
                                        key={costume.id}
                                        icon={Image}
                                        name={costume.name}
                                        depth={depth + 2}
                                        onClick={() => onSelectCostume(target.id, costume.id)}
                                        badge={costume.dataFormat}
                                    />
                                ))}
                            </ResourceGroup>
                        )}
                        {target.sounds.length > 0 && (
                            <ResourceGroup
                                label={intl.formatMessage({defaultMessage: 'Sounds', id: 'mw.tree.sounds'})}
                                icon={Music}
                                count={target.sounds.length}
                                depth={depth + 1}
                            >
                                {target.sounds.map(sound => (
                                    <LeafRow
                                        key={sound.id}
                                        icon={Music}
                                        name={sound.name}
                                        depth={depth + 2}
                                        onClick={() => onSelectSound(target.id, sound.id)}
                                        badge={sound.dataFormat}
                                    />
                                ))}
                            </ResourceGroup>
                        )}
                        {target.scalars.length > 0 && (
                            <ResourceGroup
                                label={intl.formatMessage({defaultMessage: 'Variables', id: 'mw.tree.variables'})}
                                icon={VAR_TYPE_ICONS.scalar}
                                count={target.scalars.length}
                                depth={depth + 1}
                            >
                                {target.scalars.map(variable => (
                                    <LeafRow
                                        key={variable.id}
                                        icon={VAR_TYPE_ICONS.scalar}
                                        name={variable.name}
                                        depth={depth + 2}
                                        badge={variable.isCloud ? 'cloud' : null}
                                    />
                                ))}
                            </ResourceGroup>
                        )}
                        {target.lists.length > 0 && (
                            <ResourceGroup
                                label={intl.formatMessage({defaultMessage: 'Lists', id: 'mw.tree.lists'})}
                                icon={VAR_TYPE_ICONS.list}
                                count={target.lists.length}
                                depth={depth + 1}
                            >
                                {target.lists.map(list => (
                                    <LeafRow
                                        key={list.id}
                                        icon={VAR_TYPE_ICONS.list}
                                        name={list.name}
                                        depth={depth + 2}
                                    />
                                ))}
                            </ResourceGroup>
                        )}
                        {target.broadcasts.length > 0 && (
                            <ResourceGroup
                                label={intl.formatMessage({defaultMessage: 'Broadcasts', id: 'mw.tree.broadcasts'})}
                                icon={VAR_TYPE_ICONS.broadcast}
                                count={target.broadcasts.length}
                                depth={depth + 1}
                            >
                                {target.broadcasts.map(broadcast => (
                                    <LeafRow
                                        key={broadcast.id}
                                        icon={VAR_TYPE_ICONS.broadcast}
                                        name={broadcast.name}
                                        depth={depth + 2}
                                    />
                                ))}
                            </ResourceGroup>
                        )}
                        {target.procedures.length > 0 && (
                            <ResourceGroup
                                label={intl.formatMessage({defaultMessage: 'My Blocks', id: 'mw.tree.procedures'})}
                                icon={FunctionSquare}
                                count={target.procedures.length}
                                depth={depth + 1}
                            >
                                {target.procedures.map(procedure => (
                                    <LeafRow
                                        key={procedure.id}
                                        icon={FunctionSquare}
                                        name={procedure.name}
                                        depth={depth + 2}
                                    />
                                ))}
                            </ResourceGroup>
                        )}
                    </div>
                )}
            </div>
        );
    }
}

TargetNode.propTypes = {
    target: PropTypes.object,
    depth: PropTypes.number,
    editingTarget: PropTypes.string,
    onSelectTarget: PropTypes.func,
    onSelectCostume: PropTypes.func,
    onSelectSound: PropTypes.func,
    defaultExpanded: PropTypes.bool,
    intl: PropTypes.object
};

// 资源树根组件
const WorkspaceTree = ({
    tree,
    editingTarget,
    onSelectTarget,
    onSelectCostume,
    onSelectSound,
    intl
}) => {
    const hasSprites = tree.sprites && tree.sprites.length > 0;
    const hasStage = tree.stage !== null && tree.stage !== undefined;

    return (
        <div className={styles.tree}>
            <div className={styles.treeHeader}>
                <FolderOpen size={16} className={styles.treeHeaderIcon} />
                <span>{intl.formatMessage({defaultMessage: 'Explorer', id: 'mw.tree.title'})}</span>
            </div>
            <div className={styles.treeBody}>
                {hasStage && (
                    <TargetNode
                        target={tree.stage}
                        depth={0}
                        editingTarget={editingTarget}
                        onSelectTarget={onSelectTarget}
                        onSelectCostume={onSelectCostume}
                        onSelectSound={onSelectSound}
                        intl={intl}
                    />
                )}
                {hasSprites && tree.sprites.map(sprite => (
                    <TargetNode
                        key={sprite.id}
                        target={sprite}
                        depth={0}
                        editingTarget={editingTarget}
                        onSelectTarget={onSelectTarget}
                        onSelectCostume={onSelectCostume}
                        onSelectSound={onSelectSound}
                        intl={intl}
                    />
                ))}
                {!hasStage && !hasSprites && (
                    <div className={styles.empty}>
                        {intl.formatMessage({defaultMessage: 'No targets yet', id: 'mw.tree.empty'})}
                    </div>
                )}
            </div>
        </div>
    );
};

WorkspaceTree.propTypes = {
    tree: PropTypes.object,
    editingTarget: PropTypes.string,
    onSelectTarget: PropTypes.func,
    onSelectCostume: PropTypes.func,
    onSelectSound: PropTypes.func,
    intl: PropTypes.object
};

export default WorkspaceTree;

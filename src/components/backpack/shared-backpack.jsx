import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {FormattedMessage, defineMessages, injectIntl, intlShape} from 'react-intl';
import styles from './shared-backpack.css';

const labelMap = defineMessages({
    title: {
        id: 'gui.sharedBackpack.title',
        defaultMessage: 'Shared Backpacks',
        description: 'Title for shared backpacks section'
    },
    create: {
        id: 'gui.sharedBackpack.create',
        defaultMessage: 'Create Shared Backpack',
        description: 'Button to create a new shared backpack'
    },
    empty: {
        id: 'gui.sharedBackpack.empty',
        defaultMessage: 'No shared backpacks yet',
        description: 'Message when no shared backpacks exist'
    },
    members: {
        id: 'gui.sharedBackpack.members',
        defaultMessage: 'Members',
        description: 'Label for members count'
    },
    items: {
        id: 'gui.sharedBackpack.items',
        defaultMessage: 'Items',
        description: 'Label for items count'
    }
});

const SharedBackpack = ({
    expanded,
    height,
    intl,
    onToggle,
    onCreate,
    backpacks,
    onBackpackClick,
    currentUser
}) => (
    <div className={styles.sharedBackpackContainer}>
        {expanded ? (
            <div
                className={styles.resizeHandle}
            />
        ) : null}
        <div
            className={styles.sharedBackpackHeader}
            onClick={onToggle}
        >
            <FormattedMessage {...labelMap.title} />
        </div>
        {expanded ? (
            <div
                className={styles.sharedBackpackList}
                style={height ? {height: `${height}px`} : null}
            >
                <div className={styles.toolbar}>
                    <button
                        className={styles.createButton}
                        onClick={onCreate}
                    >
                        <FormattedMessage {...labelMap.create} />
                    </button>
                </div>
                
                <div className={styles.itemsScroller}>
                    {backpacks.length > 0 ? (
                        <div className={styles.backpacksList}>
                            {backpacks.map(backpack => {
                                const isOwner = backpack.creatorId === currentUser.id;
                                const userPermission = backpack.permissions.find(p => p.userId === currentUser.id);
                                const userRole = userPermission ? userPermission.role : 'none';
                                
                                return (
                                    <div
                                        key={backpack.id}
                                        className={classNames(styles.backpackCard, {
                                            [styles.ownerCard]: isOwner
                                        })}
                                        onClick={() => onBackpackClick(backpack.id)}
                                    >
                                        <div className={styles.backpackCardHeader}>
                                            <h3 className={styles.backpackName}>{backpack.name}</h3>
                                            {isOwner && (
                                                <span className={styles.ownerBadge}>Owner</span>
                                            )}
                                        </div>
                                        <div className={styles.backpackCardInfo}>
                                            <div className={styles.infoItem}>
                                                <span className={styles.infoLabel}>
                                                    <FormattedMessage {...labelMap.members} />
                                                </span>
                                                <span className={styles.infoValue}>{backpack.permissions.length}</span>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <span className={styles.infoLabel}>
                                                    <FormattedMessage {...labelMap.items} />
                                                </span>
                                                <span className={styles.infoValue}>{backpack.items.length}</span>
                                            </div>
                                        </div>
                                        <div className={styles.backpackCardFooter}>
                                            <span className={styles.roleBadge}>
                                                {userRole === 'owner' ? 'Owner' : 
                                                 userRole === 'editor' ? 'Editor' : 'Viewer'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.statusMessage}>
                            <FormattedMessage {...labelMap.empty} />
                        </div>
                    )}
                </div>
            </div>
        ) : null}
    </div>
);

SharedBackpack.propTypes = {
    expanded: PropTypes.bool,
    height: PropTypes.number,
    intl: intlShape,
    onToggle: PropTypes.func,
    onCreate: PropTypes.func,
    backpacks: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        creatorId: PropTypes.string,
        permissions: PropTypes.array,
        items: PropTypes.array
    })),
    onBackpackClick: PropTypes.func,
    currentUser: PropTypes.shape({
        id: PropTypes.string,
        username: PropTypes.string
    })
};

SharedBackpack.defaultProps = {
    expanded: false,
    height: null,
    backpacks: [],
    currentUser: {}
};

export default injectIntl(SharedBackpack);
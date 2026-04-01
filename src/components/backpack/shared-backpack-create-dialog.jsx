import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, defineMessages, injectIntl, intlShape } from 'react-intl';
import styles from './shared-backpack-create-dialog.css';

const labelMap = defineMessages({
    title: {
        id: 'gui.sharedBackpack.createDialog.title',
        defaultMessage: 'Create Shared Backpack',
        description: 'Title for create shared backpack dialog'
    },
    name: {
        id: 'gui.sharedBackpack.createDialog.name',
        defaultMessage: 'Backpack Name',
        description: 'Label for backpack name input'
    },
    namePlaceholder: {
        id: 'gui.sharedBackpack.createDialog.namePlaceholder',
        defaultMessage: 'Enter backpack name',
        description: 'Placeholder for backpack name input'
    },
    members: {
        id: 'gui.sharedBackpack.createDialog.members',
        defaultMessage: 'Add Members',
        description: 'Label for members section'
    },
    role: {
        id: 'gui.sharedBackpack.createDialog.role',
        defaultMessage: 'Role',
        description: 'Label for role selection'
    },
    editor: {
        id: 'gui.sharedBackpack.createDialog.editor',
        defaultMessage: 'Editor',
        description: 'Editor role option'
    },
    viewer: {
        id: 'gui.sharedBackpack.createDialog.viewer',
        defaultMessage: 'Viewer',
        description: 'Viewer role option'
    },
    create: {
        id: 'gui.sharedBackpack.createDialog.create',
        defaultMessage: 'Create',
        description: 'Create button'
    },
    cancel: {
        id: 'gui.sharedBackpack.createDialog.cancel',
        defaultMessage: 'Cancel',
        description: 'Cancel button'
    }
});

const SharedBackpackCreateDialog = ({
    intl,
    isOpen,
    onClose,
    onCreate,
    roomMembers
}) => {
    const [name, setName] = useState('');
    const [memberRoles, setMemberRoles] = useState({
        // Default all members to viewer
        ...Object.fromEntries(roomMembers.map(member => [member.id, 'viewer']))
    });

    const handleCreate = () => {
        if (!name.trim()) return;

        const initialPermissions = roomMembers.map(member => ({
            userId: member.id,
            username: member.username,
            role: memberRoles[member.id]
        }));

        onCreate(name.trim(), initialPermissions);
        onClose();
    };

    const handleRoleChange = (userId, role) => {
        setMemberRoles(prev => ({
            ...prev,
            [userId]: role
        }));
    };

    if (!isOpen) return null;

    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <div className={styles.dialogHeader}>
                    <h2><FormattedMessage {...labelMap.title} /></h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>
                <div className={styles.dialogContent}>
                    <div className={styles.formGroup}>
                        <label><FormattedMessage {...labelMap.name} /></label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder={intl.formatMessage(labelMap.namePlaceholder)}
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label><FormattedMessage {...labelMap.members} /></label>
                        <div className={styles.membersList}>
                            {roomMembers.map(member => (
                                <div key={member.id} className={styles.memberItem}>
                                    <span className={styles.memberName}>{member.username}</span>
                                    <select
                                        className={styles.roleSelect}
                                        value={memberRoles[member.id]}
                                        onChange={e => handleRoleChange(member.id, e.target.value)}
                                    >
                                        <option value="editor">
                                            <FormattedMessage {...labelMap.editor} />
                                        </option>
                                        <option value="viewer">
                                            <FormattedMessage {...labelMap.viewer} />
                                        </option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className={styles.dialogFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        <FormattedMessage {...labelMap.cancel} />
                    </button>
                    <button 
                        className={styles.createButton} 
                        onClick={handleCreate}
                        disabled={!name.trim()}
                    >
                        <FormattedMessage {...labelMap.create} />
                    </button>
                </div>
            </div>
        </div>
    );
};

SharedBackpackCreateDialog.propTypes = {
    intl: intlShape,
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    onCreate: PropTypes.func,
    roomMembers: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        username: PropTypes.string
    }))
};

SharedBackpackCreateDialog.defaultProps = {
    isOpen: false,
    roomMembers: []
};

export default injectIntl(SharedBackpackCreateDialog);
import PropTypes from 'prop-types';
import React, {useState} from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {Link} from 'react-router-dom';
import {Check, Pencil, Plus, X, GitFork} from 'lucide-react';
import api, {projectUrl} from '../api';
import RichText from './RichText.jsx';
import styles from './ProjectInfoPanel.module.css';

const TAB_IDS = ['Instructions', 'Notes', 'Credits', 'Tags'];

const messages = defineMessages({
    tabInstructions: {
        defaultMessage: 'Instructions',
        id: 'mw.community.projectInfo.tabInstructions'
    },
    tabNotes: {
        defaultMessage: 'Notes',
        id: 'mw.community.projectInfo.tabNotes'
    },
    tabCredits: {
        defaultMessage: 'Credits',
        id: 'mw.community.projectInfo.tabCredits'
    },
    tabTags: {
        defaultMessage: 'Tags',
        id: 'mw.community.projectInfo.tabTags'
    },
    save: {
        defaultMessage: 'Save',
        id: 'mw.community.projectInfo.save'
    },
    cancel: {
        defaultMessage: 'Cancel',
        id: 'mw.community.projectInfo.cancel'
    },
    edit: {
        defaultMessage: 'Edit',
        id: 'mw.community.projectInfo.edit'
    },
    instructionsPlaceholder: {
        defaultMessage: 'How do you play or use this project?',
        id: 'mw.community.projectInfo.instructionsPlaceholder'
    },
    noInstructions: {
        defaultMessage: 'No instructions provided.',
        id: 'mw.community.projectInfo.noInstructions'
    },
    notesPlaceholder: {
        defaultMessage: 'Anything else you want to share',
        id: 'mw.community.projectInfo.notesPlaceholder'
    },
    noNotes: {
        defaultMessage: 'No notes yet.',
        id: 'mw.community.projectInfo.noNotes'
    },
    whoPlaceholder: {
        defaultMessage: 'username',
        id: 'mw.community.projectInfo.whoPlaceholder'
    },
    rolePlaceholder: {
        defaultMessage: 'what they did',
        id: 'mw.community.projectInfo.rolePlaceholder'
    },
    remove: {
        defaultMessage: 'Remove',
        id: 'mw.community.projectInfo.remove'
    },
    addCredit: {
        defaultMessage: 'Add credit',
        id: 'mw.community.projectInfo.addCredit'
    },
    noCredits: {
        defaultMessage: 'No credits listed.',
        id: 'mw.community.projectInfo.noCredits'
    },
    tagsPlaceholder: {
        defaultMessage: 'platformer game pixel-art',
        id: 'mw.community.projectInfo.tagsPlaceholder'
    },
    tagsHint: {
        defaultMessage: 'Separate tags with spaces. Up to 10.',
        id: 'mw.community.projectInfo.tagsHint'
    },
    noTags: {
        defaultMessage: 'No tags yet.',
        id: 'mw.community.projectInfo.noTags'
    },
    remixOf: {
        defaultMessage: 'Based on another project',
        id: 'mw.community.projectInfo.remixOf'
    },
    saveError: {
        defaultMessage: 'Could not save your changes.',
        id: 'mw.community.projectInfo.saveError'
    }
});

const parseTags = text => {
    const seen = [];
    text.split(/[\s,]+/).forEach(raw => {
        const tag = raw.replace(/^#+/, '').trim().toLowerCase();
        if (tag && !seen.includes(tag) && seen.length < 10) {
            seen.push(tag);
        }
    });
    return seen;
};

const ProjectInfoPanel = injectIntl(({project, onSaved, embedded = false, intl}) => {
    const [tab, setTab] = useState(TAB_IDS[0]);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [instructions, setInstructions] = useState(project.instructions || '');
    const [notes, setNotes] = useState(project.notes || '');
    const [credits, setCredits] = useState(project.credits || []);
    const [tagsText, setTagsText] = useState((project.tags || []).join(' '));

    const INFO_TABS = [
        {id: TAB_IDS[0], label: intl.formatMessage(messages.tabInstructions)},
        {id: TAB_IDS[1], label: intl.formatMessage(messages.tabNotes)},
        {id: TAB_IDS[2], label: intl.formatMessage(messages.tabCredits)},
        {id: TAB_IDS[3], label: intl.formatMessage(messages.tabTags)}
    ];

    const startEdit = () => {
        setInstructions(project.instructions || '');
        setNotes(project.notes || '');
        setCredits(project.credits || []);
        setTagsText((project.tags || []).join(' '));
        setSaveError('');
        setEditing(true);
    };

    const cancelEdit = () => {
        setSaveError('');
        setEditing(false);
    };

    const save = async () => {
        setSaving(true);
        setSaveError('');
        try {
            await api.updateProject(project.id, {
                instructions,
                notes,
                credits: credits.filter(c => c.who && c.who.trim()),
                tags: parseTags(tagsText)
            });
            setEditing(false);
            onSaved();
        } catch (e) {
            setSaveError(e.message || intl.formatMessage(messages.saveError));
        } finally {
            setSaving(false);
        }
    };

    const updateCredit = (i, field, value) => {
        setCredits(list => list.map((c, idx) => (idx === i ? {...c, [field]: value} : c)));
    };
    const addCredit = () => setCredits(list => [...list, {who: '', role: ''}]);
    const removeCredit = i => setCredits(list => list.filter((c, idx) => idx !== i));

    return (
        <aside className={embedded ? `${styles.sidePanel} ${styles.sidePanelEmbedded}` : styles.sidePanel}>
            <div className={styles.panelTabs}>
                {INFO_TABS.map(item => (
                    <button
                        key={item.id}
                        className={item.id === tab ? styles.panelTabActive : styles.panelTab}
                        onClick={() => setTab(item.id)}
                    >{item.label}</button>
                ))}
                {project.isOwner ? (
                    editing ? (
                        <>
                            <button
                                className={styles.panelEdit}
                                onClick={save}
                                disabled={saving}
                                title={intl.formatMessage(messages.save)}
                            >
                                <Check size={15} />
                            </button>
                            <button
                                className={styles.panelEdit}
                                onClick={cancelEdit}
                                disabled={saving}
                                title={intl.formatMessage(messages.cancel)}
                            >
                                <X size={14} />
                            </button>
                        </>
                    ) : (
                        <button
                            className={styles.panelEdit}
                            onClick={startEdit}
                            title={intl.formatMessage(messages.edit)}
                        >
                            <Pencil size={14} />
                        </button>
                    )
                ) : null}
            </div>
            <div className={styles.panelBody}>
                {saveError ? <p className={styles.panelError}>{saveError}</p> : null}
                {tab === 'Instructions' && (
                    editing ? (
                        <textarea
                            className={styles.panelInput}
                            value={instructions}
                            maxLength={5000}
                            placeholder={intl.formatMessage(messages.instructionsPlaceholder)}
                            onChange={e => setInstructions(e.target.value)}
                        />
                    ) : project.instructions ? (
                        <p className={styles.panelText}><RichText text={project.instructions} /></p>
                    ) : (
                        <p className={styles.panelEmpty}>
                            <FormattedMessage
                                defaultMessage="No instructions provided."
                                id="mw.community.projectInfo.noInstructions"
                            />
                        </p>
                    )
                )}

                {tab === 'Notes' && (
                    editing ? (
                        <textarea
                            className={styles.panelInput}
                            value={notes}
                            maxLength={5000}
                            placeholder={intl.formatMessage(messages.notesPlaceholder)}
                            onChange={e => setNotes(e.target.value)}
                        />
                    ) : project.notes ? (
                        <p className={styles.panelText}><RichText text={project.notes} /></p>
                    ) : (
                        <p className={styles.panelEmpty}>
                            <FormattedMessage
                                defaultMessage="No notes yet."
                                id="mw.community.projectInfo.noNotes"
                            />
                        </p>
                    )
                )}

                {tab === 'Credits' && (
                    editing ? (
                        <div className={styles.creditEditor}>
                            {credits.map((c, i) => (
                                <div
                                    key={i}
                                    className={styles.creditEditRow}
                                >
                                    <input
                                        className={styles.creditWho}
                                        value={c.who}
                                        placeholder={intl.formatMessage(messages.whoPlaceholder)}
                                        onChange={e => updateCredit(i, 'who', e.target.value)}
                                    />
                                    <input
                                        className={styles.creditRole}
                                        value={c.role}
                                        placeholder={intl.formatMessage(messages.rolePlaceholder)}
                                        onChange={e => updateCredit(i, 'role', e.target.value)}
                                    />
                                    <button
                                        className={styles.creditRemove}
                                        onClick={() => removeCredit(i)}
                                        title={intl.formatMessage(messages.remove)}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <button
                                className={styles.creditAdd}
                                onClick={addCredit}
                            >
                                <Plus size={14} />
                                <FormattedMessage
                                    defaultMessage="Add credit"
                                    id="mw.community.projectInfo.addCredit"
                                />
                            </button>
                        </div>
                    ) : (project.credits && project.credits.length) ? (
                        <ul className={styles.creditList}>
                            {project.credits.map((c, i) => (
                                <li key={i}>
                                    <Link
                                        to={`/users/${c.who}`}
                                        className={styles.creditName}
                                    >{c.who}</Link>
                                    {c.role ? (
                                        <span className={styles.creditRoleText}>
                                            {' '}
                                            <RichText text={c.role} />
                                        </span>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.panelEmpty}>
                            <FormattedMessage
                                defaultMessage="No credits listed."
                                id="mw.community.projectInfo.noCredits"
                            />
                        </p>
                    )
                )}

                {tab === 'Tags' && (
                    editing ? (
                        <div>
                            <input
                                className={styles.panelInput}
                                value={tagsText}
                                placeholder={intl.formatMessage(messages.tagsPlaceholder)}
                                onChange={e => setTagsText(e.target.value)}
                            />
                            <p className={styles.panelEmpty}>
                                <FormattedMessage
                                    defaultMessage="Separate tags with spaces. Up to 10."
                                    id="mw.community.projectInfo.tagsHint"
                                />
                            </p>
                        </div>
                    ) : (project.tags && project.tags.length) ? (
                        <div className={styles.tagRow}>
                            {project.tags.map(tag => (
                                <Link
                                    key={tag}
                                    to={`/explore?q=${encodeURIComponent(`#${tag}`)}`}
                                    className={styles.tag}
                                >{`#${tag}`}</Link>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.panelEmpty}>
                            <FormattedMessage
                                defaultMessage="No tags yet."
                                id="mw.community.projectInfo.noTags"
                            />
                        </p>
                    )
                )}

                {!editing && project.remixParent ? (
                    <Link
                        to={projectUrl(project.remixParent)}
                        className={styles.remixOf}
                    >
                        <GitFork size={13} />
                        <FormattedMessage
                            defaultMessage="Based on another project"
                            id="mw.community.projectInfo.remixOf"
                        />
                    </Link>
                ) : null}
            </div>
        </aside>
    );
});

ProjectInfoPanel.propTypes = {
    project: PropTypes.shape({}),
    onSaved: PropTypes.func.isRequired,
    embedded: PropTypes.bool,
    intl: intlShape
};

export default ProjectInfoPanel;

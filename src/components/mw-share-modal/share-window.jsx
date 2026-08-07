import React from 'react';
import PropTypes from 'prop-types';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {publishToMistWarp, captureThumbnailDataUri, prepareThumbnailBlob} from '../../lib/community/publish.js';
import {request} from '../../lib/community/api.js';
import styles from './share-window.css';

const messages = defineMessages({
    saving: {id: 'mw.share.saving', defaultMessage: 'Saving…'},
    thumbnailNotice: {
        id: 'mw.share.thumbnailNotice',
        defaultMessage: 'Couldn\'t attach thumbnail; publishing without it.'
    },
    couldNotSave: {id: 'mw.share.couldNotSave', defaultMessage: 'Could not save'},
    couldNotAcceptAgreement: {id: 'mw.share.couldNotAcceptAgreement', defaultMessage: 'Could not accept agreement.'},
    remix: {id: 'mw.share.remix', defaultMessage: 'Remix'},
    update: {id: 'mw.share.update', defaultMessage: 'Update'},
    save: {id: 'mw.share.save', defaultMessage: 'Save'},
    checkStorage: {id: 'mw.share.checkStorage', defaultMessage: 'Check project storage'},
    uploadAgreement: {id: 'mw.share.uploadAgreement', defaultMessage: 'Upload agreement v{version}'},
    cancel: {id: 'mw.share.cancel', defaultMessage: 'Cancel'},
    accepting: {id: 'mw.share.accepting', defaultMessage: 'Accepting…'},
    acceptAgreement: {id: 'mw.share.acceptAgreement', defaultMessage: 'Accept v{version} & {action}'},
    savedAndShared: {id: 'mw.share.savedAndShared', defaultMessage: 'Your project is saved and shared.'},
    savedPrivate: {
        id: 'mw.share.savedPrivate',
        defaultMessage: 'Your project is saved to Bilup. It stays private until you share it from its project page.'
    },
    close: {id: 'mw.share.close', defaultMessage: 'Close'},
    openProjectPage: {id: 'mw.share.openProjectPage', defaultMessage: 'Open project page'},
    updateDescription: {
        id: 'mw.share.updateDescription',
        defaultMessage: 'Upload the current version of this project to Bilup. The title and thumbnail stay as they are; edit those on the project page.'
    },
    title: {id: 'mw.share.title', defaultMessage: 'Title'},
    untitled: {id: 'mw.share.untitled', defaultMessage: 'Untitled'},
    thumbnail: {id: 'mw.share.thumbnail', defaultMessage: 'Thumbnail'},
    thumbnailAlt: {id: 'mw.share.thumbnailAlt', defaultMessage: 'Project thumbnail'},
    noPreview: {id: 'mw.share.noPreview', defaultMessage: 'No preview'},
    useCurrentCanvas: {id: 'mw.share.useCurrentCanvas', defaultMessage: 'Use current canvas'},
    uploadImage: {id: 'mw.share.uploadImage', defaultMessage: 'Upload an image'}
});

class ShareWindow extends React.Component {
    constructor (props) {
        super(props);
        this.handlePublish = this.handlePublish.bind(this);
        this.handleRetake = this.handleRetake.bind(this);
        this.handleUpload = this.handleUpload.bind(this);
        this.handleTitleChange = this.handleTitleChange.bind(this);
        this.handleAcceptAgreement = this.handleAcceptAgreement.bind(this);
        this.fileInput = React.createRef();
        this.state = {
            title: props.initialTitle || '',
            thumbnail: null,
            status: null,
            error: props.initialError ? props.initialError.message : null,
            errorCode: props.initialError ? props.initialError.code : null,
            notice: null,
            done: null,
            agreement: null,
            agreeBusy: false,
            agreeError: ''
        };
    }
    componentDidMount () {
        if (this.props.action === 'update') {
            return;
        }
        captureThumbnailDataUri(this.props.vm).then(thumbnail => {
            if (thumbnail && !this.state.thumbnail) {
                this.setState({thumbnail});
            }
        });
    }
    handleTitleChange (event) {
        this.setState({title: event.target.value});
    }
    handleRetake () {
        captureThumbnailDataUri(this.props.vm).then(thumbnail => {
            if (thumbnail) {
                this.setState({thumbnail});
            }
        });
    }
    handleUpload (event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => this.setState({thumbnail: reader.result});
        reader.readAsDataURL(file);
    }
    async handlePublish () {
        if (this.state.status || this.state.agreeBusy) {
            return;
        }
        const isUpdate = this.props.action === 'update';

        // Check agreement acceptance before uploading
        try {
            const agreementData = await request('/agreement');
            const ag = agreementData.agreement;
            if (ag.version > 0 && !ag.accepted) {
                this.setState({agreement: ag, agreeError: ''});
                return;
            }
        } catch (e) {
            // proceed with upload if agreement check fails
        }

        this.setState({
            status: this.props.intl.formatMessage(messages.saving),
            error: null,
            errorCode: null,
            notice: null,
            agreement: null
        });
        let thumbnailBlob = null;
        if (!isUpdate && this.state.thumbnail) {
            try {
                thumbnailBlob = await prepareThumbnailBlob(this.state.thumbnail);
            } catch (e) {
                thumbnailBlob = null;
                this.setState({
                    notice: this.props.intl.formatMessage(messages.thumbnailNotice)
                });
            }
        }
        try {
            const result = await publishToMistWarp({
                vm: this.props.vm,
                title: isUpdate ? null : (this.state.title || this.props.intl.formatMessage(messages.untitled)),
                thumbnailBlob,
                updateOnly: isUpdate,
                onProgress: ({message}) => this.setState({status: message})
            });
            this.setState({status: null, done: result});
            this.props.onPublished(result);
        } catch (e) {
            this.setState({
                status: null,
                error: e.message || this.props.intl.formatMessage(messages.couldNotSave),
                errorCode: e.code || null
            });
        }
    }

    async handleAcceptAgreement () {
        this.setState({agreeBusy: true, agreeError: ''});
        try {
            await request('/agreement/accept', {method: 'POST'});
            this.setState({agreeBusy: false, agreement: null});
            // proceed with the save now that agreement is accepted
            this.handlePublish();
        } catch (e) {
            this.setState({
                agreeBusy: false,
                agreeError: e.message || this.props.intl.formatMessage(messages.couldNotAcceptAgreement)
            });
        }
    }
    renderError () {
        if (!this.state.error) return null;
        return (
            <div className={styles.errorPanel}>
                <div className={styles.error}>{this.state.error}</div>
                {this.state.errorCode === 'project_too_large' && (
                    <button
                        className={styles.reviewStorage}
                        onClick={this.props.onReviewStorage}
                    >
                        {this.props.intl.formatMessage(messages.checkStorage)}
                    </button>
                )}
            </div>
        );
    }
    render () {
        const intl = this.props.intl;
        const title = this.state.title || intl.formatMessage(messages.untitled);
        const actionLabel = this.props.action === 'remix' ? intl.formatMessage(messages.remix) :
            this.props.action === 'update' ? intl.formatMessage(messages.update) : intl.formatMessage(messages.save);

        if (this.state.agreement) {
            return (
                <div className={styles.root}>
                    <div className={styles.body}>
                        <h3 className={styles.agreeTitle}>
                            {intl.formatMessage(messages.uploadAgreement, {
                                version: this.state.agreement.version
                            })}
                        </h3>
                        <div className={styles.agreeBody}>
                            <pre className={styles.agreeText}>{this.state.agreement.text}</pre>
                        </div>
                        {this.state.agreeError ? (
                            <div className={styles.error}>{this.state.agreeError}</div>
                        ) : null}
                    </div>
                    <div className={styles.footer}>
                        <button
                            className={styles.secondary}
                            onClick={() => this.setState({agreement: null, agreeError: ''})}
                            disabled={this.state.agreeBusy}
                        >{intl.formatMessage(messages.cancel)}</button>
                        <button
                            className={styles.primary}
                            onClick={this.handleAcceptAgreement}
                            disabled={this.state.agreeBusy}
                        >
                            {this.state.agreeBusy ?
                                intl.formatMessage(messages.accepting) :
                                intl.formatMessage(messages.acceptAgreement, {
                                    version: this.state.agreement.version,
                                    action: actionLabel.toLowerCase()
                                })}
                        </button>
                    </div>
                </div>
            );
        }

        if (this.state.done) {
            return (
                <div className={styles.root}>
                    <div className={styles.body}>
                        <p className={styles.doneMessage}>
                            {this.state.done.shared ?
                                intl.formatMessage(messages.savedAndShared) :
                                intl.formatMessage(messages.savedPrivate)}
                        </p>
                    </div>
                    <div className={styles.footer}>
                        <button
                            className={styles.secondary}
                            onClick={this.props.onClose}
                        >{intl.formatMessage(messages.close)}</button>
                        <button
                            className={styles.primary}
                            onClick={() => {
                                window.open(this.state.done.url, '_blank', 'noopener');
                                this.props.onClose();
                            }}
                        >{intl.formatMessage(messages.openProjectPage)}</button>
                    </div>
                </div>
            );
        }
        const isUpdate = this.props.action === 'update';
        if (isUpdate) {
            return (
                <div className={styles.root}>
                    <div className={styles.body}>
                        <p className={styles.doneMessage}>
                            {intl.formatMessage(messages.updateDescription)}
                        </p>
                        {this.renderError()}
                    </div>
                    <div className={styles.footer}>
                        <button
                            className={styles.secondary}
                            onClick={this.props.onClose}
                            disabled={!!this.state.status}
                        >{intl.formatMessage(messages.cancel)}</button>
                        <button
                            className={styles.primary}
                            onClick={this.handlePublish}
                            disabled={!!this.state.status}
                        >{this.state.status || actionLabel}</button>
                    </div>
                </div>
            );
        }
        return (
            <div className={styles.root}>
                <div className={styles.body}>
                    <label className={styles.label} htmlFor="mw-share-title">{intl.formatMessage(messages.title)}</label>
                    <input
                        id="mw-share-title"
                        className={styles.input}
                        value={title}
                        maxLength={100}
                        onChange={this.handleTitleChange}
                    />

                    <div className={styles.label}>{intl.formatMessage(messages.thumbnail)}</div>
                    <div className={styles.thumbRow}>
                        {this.state.thumbnail ? (
                            <img
                                className={styles.thumb}
                                src={this.state.thumbnail}
                                alt={intl.formatMessage(messages.thumbnailAlt)}
                            />
                        ) : (
                            <div className={styles.thumbEmpty}>{intl.formatMessage(messages.noPreview)}</div>
                        )}
                        <div className={styles.thumbButtons}>
                            <button
                                className={styles.secondary}
                                onClick={this.handleRetake}
                                disabled={!!this.state.status}
                            >{intl.formatMessage(messages.useCurrentCanvas)}</button>
                            <button
                                className={styles.secondary}
                                onClick={() => this.fileInput.current && this.fileInput.current.click()}
                                disabled={!!this.state.status}
                            >{intl.formatMessage(messages.uploadImage)}</button>
                            <input
                                ref={this.fileInput}
                                className={styles.hiddenInput}
                                type="file"
                                accept="image/*"
                                onChange={this.handleUpload}
                            />
                        </div>
                    </div>

                    {this.state.notice ? (
                        <div className={styles.notice}>{this.state.notice}</div>
                    ) : null}
                    {this.renderError()}
                </div>
                <div className={styles.footer}>
                    <button
                        className={styles.secondary}
                        onClick={this.props.onClose}
                        disabled={!!this.state.status}
                    >{intl.formatMessage(messages.cancel)}</button>
                    <button
                        className={styles.primary}
                        onClick={this.handlePublish}
                        disabled={!!this.state.status || !title.trim()}
                    >{this.state.status || actionLabel}</button>
                </div>
            </div>
        );
    }
}

ShareWindow.propTypes = {
    intl: intlShape.isRequired,
    vm: PropTypes.shape({
        saveProjectSb3: PropTypes.func,
        renderer: PropTypes.object
    }).isRequired,
    initialError: PropTypes.shape({
        code: PropTypes.string,
        message: PropTypes.string
    }),
    initialTitle: PropTypes.string,
    action: PropTypes.oneOf(['save', 'remix', 'update']),
    onClose: PropTypes.func.isRequired,
    onReviewStorage: PropTypes.func.isRequired,
    onPublished: PropTypes.func.isRequired
};

ShareWindow.defaultProps = {
    action: 'save'
};

export default injectIntl(ShareWindow);

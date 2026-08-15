import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';
import styles from './custom-gallery-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: '加载自定义扩展库',
        description: 'Title for custom extension gallery modal',
        id: 'tw.customExtensionGallery.title'
    },
    nameLabel: {
        defaultMessage: '扩展库名称',
        description: 'Custom gallery name field label',
        id: 'tw.customExtensionGallery.nameLabel'
    },
    namePlaceholder: {
        defaultMessage: '我的扩展库',
        description: 'Custom gallery name field placeholder',
        id: 'tw.customExtensionGallery.namePlaceholder'
    },
    urlLabel: {
        defaultMessage: '扩展库 URL',
        description: 'Custom gallery metadata JSON URL field label',
        id: 'tw.customExtensionGallery.urlLabel'
    },
    urlPlaceholder: {
        defaultMessage: 'https://example.com/extensions.json',
        description: 'Custom gallery metadata JSON URL field placeholder',
        id: 'tw.customExtensionGallery.urlPlaceholder'
    },
    typeUrl: {
        defaultMessage: 'URL',
        description: 'Tab to load a custom gallery from a remote URL',
        id: 'tw.customExtensionGallery.typeUrl'
    },
    typeFile: {
        defaultMessage: '文件',
        description: 'Tab to load a custom gallery from a local JSON file',
        id: 'tw.customExtensionGallery.typeFile'
    },
    filePrompt: {
        defaultMessage: '选择本地 JSON 文件：',
        description: 'Label that appears when loading a custom gallery from a file',
        id: 'tw.customExtensionGallery.filePrompt'
    },
    fileSelected: {
        defaultMessage: '已选择文件：{fileName}',
        description: 'Shown after a local JSON file has been selected',
        id: 'tw.customExtensionGallery.fileSelected'
    },
    hint: {
        // eslint-disable-next-line max-len
        defaultMessage: '指向一个 JSON 元数据文件，格式与内置扩展库相同：一个包含 extensions 数组的对象，或纯扩展对象数组。加载后，扩展库会出现在侧边栏并带有自己的状态指示灯。',
        description: 'Hint about the expected custom gallery JSON format',
        id: 'tw.customExtensionGallery.hint'
    },
    loading: {
        defaultMessage: '正在加载扩展库...',
        description: 'Status shown while the custom gallery is loading',
        id: 'tw.customExtensionGallery.loading'
    },
    loaded: {
        defaultMessage: '找到 {count} 个扩展',
        description: 'Status shown when the custom gallery loaded successfully',
        id: 'tw.customExtensionGallery.loaded'
    },
    error: {
        defaultMessage: '加载扩展库失败：{message}',
        description: 'Status shown when the custom gallery failed to load',
        id: 'tw.customExtensionGallery.error'
    },
    add: {
        defaultMessage: '添加到扩展库',
        description: 'Button to add the loaded gallery to the extension library',
        id: 'tw.customExtensionGallery.add'
    },
    load: {
        defaultMessage: '加载',
        description: 'Button to load the custom gallery',
        id: 'tw.customExtensionGallery.load'
    },
    unsandboxed: {
        defaultMessage: '此扩展库中的扩展不经过沙盒运行',
        description: 'Checkbox label for running custom gallery extensions unsandboxed',
        id: 'tw.customExtensionGallery.unsandboxed'
    },
    unsandboxedWarning: {
        // eslint-disable-next-line max-len
        defaultMessage: '不经过沙盒加载扩展是危险的，如果你不了解其含义请勿启用。官方扩展始终不经过沙盒加载，不受此选项影响。',
        description: 'Warning shown when the unsandboxed option is enabled',
        id: 'tw.customExtensionGallery.unsandboxedWarning'
    },
    cancel: {
        defaultMessage: '取消',
        description: 'Button to cancel',
        id: 'tw.simpleDialog.cancel'
    }
});

class CustomGalleryModalComponent extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            type: 'url', // 'url' | 'file'
            galleryName: '',
            galleryUrl: '',
            fileDataUrl: '',
            fileName: '',
            status: null, // 'loading' | 'loaded' | 'error'
            errorMessage: null,
            count: null,
            // 非沙盒运行开关：默认关闭（沙盒开启）。
            // 官方域名扩展不受此开关影响，始终自动非沙盒运行。
            unsandboxed: false
        };
    }

    handleChangeUnsandboxed = e => {
        this.setState({unsandboxed: e.target.checked});
    };

    handleChange = field => e => {
        this.setState({[field]: e.target.value});
    };

    // 本地文件用 FileReader 转为 data URL，后续统一按 URL 加载
    handleChangeFile = e => {
        const file = e.target.files && e.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            this.setState({
                fileDataUrl: reader.result,
                fileName: file.name,
                status: null
            }, () => this.handleLoad());
        };
        reader.onerror = () => {
            this.setState({
                status: 'error',
                errorMessage: 'Failed to read file'
            });
        };
        reader.readAsDataURL(file);
    };

    handleSwitchToURL = () => {
        this.setState({type: 'url', status: null});
    };

    handleSwitchToFile = () => {
        this.setState({type: 'file', status: null});
    };

    getSourceValue () {
        return this.state.type === 'url' ?
            this.state.galleryUrl.trim() :
            this.state.fileDataUrl;
    }

    handleLoad = async () => {
        const source = this.getSourceValue();
        if (!source) {
            return;
        }
        this.setState({status: 'loading', errorMessage: null, count: null});
        try {
            const res = await fetch(source);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            const extensions = Array.isArray(data) ? data : (data.extensions || []);
            if (!Array.isArray(extensions) || extensions.length === 0) {
                throw new Error('No extensions found in gallery');
            }
            this.setState({status: 'loaded', count: extensions.length});
        } catch (err) {
            this.setState({
                status: 'error',
                errorMessage: err.message || String(err)
            });
        }
    };

    handleAdd = () => {
        if (this.state.status !== 'loaded') {
            return;
        }
        this.props.onOk({
            name: this.state.galleryName.trim() || 'Custom',
            url: this.getSourceValue(),
            unsandboxed: this.state.unsandboxed
        });
    };

    render () {
        const {intl} = this.props;
        const {status, errorMessage, count, type} = this.state;
        const canLoad = type === 'url' ? !!this.state.galleryUrl.trim() : !!this.state.fileDataUrl;

        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={this.props.onCancel}
                contentLabel={intl.formatMessage(messages.title)}
                id="customGalleryModal"
            >
                <Box className={styles.body}>
                    <div className={styles.typeSelectorContainer}>
                        <div
                            className={styles.typeSelectorButton}
                            data-active={type === 'url'}
                            onClick={this.handleSwitchToURL}
                            tabIndex={0}
                            role="button"
                        >
                            <FormattedMessage {...messages.typeUrl} />
                        </div>
                        <div
                            className={styles.typeSelectorButton}
                            data-active={type === 'file'}
                            onClick={this.handleSwitchToFile}
                            tabIndex={0}
                            role="button"
                        >
                            <FormattedMessage {...messages.typeFile} />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>
                            <FormattedMessage {...messages.nameLabel} />
                        </label>
                        <input
                            className={styles.input}
                            type="text"
                            value={this.state.galleryName}
                            onChange={this.handleChange('galleryName')}
                            placeholder={intl.formatMessage(messages.namePlaceholder)}
                        />
                    </div>

                    {type === 'url' ? (
                        <div className={styles.field}>
                            <label className={styles.label}>
                                <FormattedMessage {...messages.urlLabel} />
                            </label>
                            <input
                                className={styles.input}
                                type="text"
                                value={this.state.galleryUrl}
                                onChange={this.handleChange('galleryUrl')}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        this.handleLoad();
                                    }
                                }}
                                placeholder={intl.formatMessage(messages.urlPlaceholder)}
                            />
                        </div>
                    ) : (
                        <div className={styles.field}>
                            <label className={styles.label}>
                                <FormattedMessage {...messages.filePrompt} />
                            </label>
                            <input
                                className={styles.fileInput}
                                type="file"
                                accept=".json,application/json"
                                onChange={this.handleChangeFile}
                            />
                            {this.state.fileName ? (
                                <div className={styles.fileSelected}>
                                    <FormattedMessage
                                        {...messages.fileSelected}
                                        values={{fileName: this.state.fileName}}
                                    />
                                </div>
                            ) : null}
                        </div>
                    )}

                    <p className={styles.hint}>
                        <FormattedMessage {...messages.hint} />
                    </p>

                    <label className={styles.unsandboxedContainer}>
                        <input
                            className={styles.unsandboxedCheckbox}
                            type="checkbox"
                            checked={this.state.unsandboxed}
                            onChange={this.handleChangeUnsandboxed}
                        />
                        <FormattedMessage {...messages.unsandboxed} />
                    </label>
                    {this.state.unsandboxed && (
                        <p className={styles.unsandboxedWarning}>
                            <FormattedMessage {...messages.unsandboxedWarning} />
                        </p>
                    )}

                    {status === 'loading' ? (
                        <div className={classNames(styles.status, styles.statusLoading)}>
                            <FormattedMessage {...messages.loading} />
                        </div>
                    ) : null}
                    {status === 'loaded' ? (
                        <div className={classNames(styles.status, styles.statusLoaded)}>
                            <FormattedMessage {...messages.loaded} values={{count}} />
                        </div>
                    ) : null}
                    {status === 'error' ? (
                        <div className={classNames(styles.status, styles.statusError)}>
                            <FormattedMessage {...messages.error} values={{message: errorMessage}} />
                        </div>
                    ) : null}

                    <div className={styles.buttonRow}>
                        <button
                            className={styles.cancelButton}
                            onClick={this.props.onCancel}
                            type="button"
                        >
                            <FormattedMessage {...messages.cancel} />
                        </button>
                        {status === 'loaded' ? (
                            <button
                                className={styles.okButton}
                                onClick={this.handleAdd}
                                type="button"
                            >
                                <FormattedMessage {...messages.add} />
                            </button>
                        ) : (
                            <button
                                className={styles.okButton}
                                onClick={this.handleLoad}
                                disabled={status === 'loading' || !canLoad}
                                type="button"
                            >
                                <FormattedMessage {...messages.load} />
                            </button>
                        )}
                    </div>
                </Box>
            </Modal>
        );
    }
}

CustomGalleryModalComponent.propTypes = {
    intl: intlShape,
    onOk: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

export default injectIntl(CustomGalleryModalComponent);
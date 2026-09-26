import React from 'react';
import {FormattedMessage, injectIntl, intlShape, defineMessages} from 'react-intl';
import {connect} from 'react-redux';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import styles from './loader.css';
import {getIsLoadingWithId} from '../../reducers/project-state';
import {RJ_ASSET_PHASE_END} from '../../lib/rj/progress.js';
import topBlock from './top-block.svg';
import middleBlock from './middle-block.svg';
import bottomBlock from './bottom-block.svg';

const mainMessages = {
    'gui.loader.headline': (
        <FormattedMessage
            defaultMessage="Loading Project"
            description="Main loading message"
            id="gui.loader.headline"
        />
    ),
    'gui.loader.creating': (
        <FormattedMessage
            defaultMessage="Creating Project"
            description="Main creating message"
            id="gui.loader.creating"
        />
    )
};

const messages = defineMessages({
    projectData: {
        defaultMessage: 'Loading project …',
        description: 'Appears when loading project data, but not assets yet',
        id: 'tw.loader.projectData'
    },
    downloadingAssets: {
        defaultMessage: 'Downloading assets ({complete}/{total}) …',
        description: 'Appears when loading project assets from a project on a remote website',
        id: 'tw.loader.downloadingAssets'
    },
    loadingAssets: {
        defaultMessage: 'Loading assets ({complete}/{total}) …',
        description: 'Appears when loading project assets from a project file on the user\'s computer',
        id: 'tw.loader.loadingAssets'
    }
});

/**
 * .rj 的阶段文案与百分比都在 src/lib/rj/progress.js 里定义，
 * 这里只负责把 redux 里的进度画出来。
 */
const RJ_PHASE_END = RJ_ASSET_PHASE_END;

const randomMessages = [
    'Also try TurboWarp!',
    'Also try MistWarp!',
    'Also try Bilup!',
    'Also try 02Engine!',
    'Also try AstraEditor!'
];

const TYPE_STRING = '["ˍ"*/';

class LoaderComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleAssetProgress',
            'handleProjectLoaded',
            'barInnerRef',
            'messageRef',
            'percentRef'
        ]);
        this.barInnerEl = null;
        this.messageEl = null;
        this.percentEl = null;
        this.ignoreProgress = false;
        this.randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];
        this._mounted = false;
        // .rj 的 json 分片阶段已经走到的百分比；之后的 VM 资源加载从这里续到 ASSET_PHASE_END
        this.rjBase = 0;

        this.state = {
            displayText: TYPE_STRING
        };
        this.typingInterval = null;
        this.lastUpdateTime = Date.now();
        this.currentIndex = TYPE_STRING.length;
    }

    componentDidMount () {
        this._mounted = true;
        if (this.props.vm) {
            this.handleAssetProgress(
                this.props.vm.runtime.finishedAssetRequests,
                this.props.vm.runtime.totalAssetRequests
            );
            this.props.vm.on('ASSET_PROGRESS', this.handleAssetProgress);
            this.props.vm.runtime.on('PROJECT_LOADED', this.handleProjectLoaded);
        }
        this.startTyping();
        this.applyLoadingProgress(this.props.loadingProgress);
    }

    componentDidUpdate (prevProps) {
        if (this.props.loadingProgress !== prevProps.loadingProgress) {
            this.applyLoadingProgress(this.props.loadingProgress);
        }
    }

    componentWillUnmount () {
        this._mounted = false;
        if (this.props.vm) {
            this.props.vm.off('ASSET_PROGRESS', this.handleAssetProgress);
            this.props.vm.runtime.off('PROJECT_LOADED', this.handleProjectLoaded);
        }
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
        }
    }

    startTyping = () => {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
        }

        this.currentIndex = 0;
        if (this._mounted) {
            this.setState({
                displayText: ''
            });
        }

        this.typingInterval = setInterval(() => {
            if (!this._mounted) {
                clearInterval(this.typingInterval);
                return;
            }

            const now = Date.now();
            if (now - this.lastUpdateTime > 3000) {
                this.setState({
                    displayText: TYPE_STRING
                });
                this.currentIndex = TYPE_STRING.length;
                return;
            }

            if (this.currentIndex <= TYPE_STRING.length) {
                this.setState({
                    displayText: TYPE_STRING.substring(0, this.currentIndex)
                });
                this.lastUpdateTime = now;
                this.currentIndex++;
            } else {
                this.setState({
                    displayText: TYPE_STRING
                });
                setTimeout(() => {
                    if (!this._mounted) return;
                    this.currentIndex = 0;
                    this.setState({
                        displayText: ''
                    });
                }, 1000);
            }
        }, 150);
    };

    /**
     * 把 redux 里的加载进度反映到界面上。
     * @param {object} progress loadingProgress reducer 的 state
     */
    applyLoadingProgress (progress) {
        if (!progress || this.ignoreProgress) return;
        if (progress.detail && this.messageEl) {
            this.messageEl.textContent = progress.detail;
        }
        if (typeof progress.percent === 'number') {
            this.rjBase = progress.percent;
            this.setBar(progress.percent);
        }
    }

    setBar (percent) {
        const clamped = Math.max(0, Math.min(100, percent));
        if (this.barInnerEl) this.barInnerEl.style.width = `${clamped}%`;
        if (this.percentEl) this.percentEl.textContent = `${Math.round(clamped)}%`;
    }

    handleAssetProgress (finished, total) {
        if (this.ignoreProgress || !this.barInnerEl || !this.messageEl) {
            return;
        }

        if (total === 0) {
            this.setBar(this.rjBase || 0);
            this.messageEl.textContent = this.props.intl.formatMessage(messages.projectData);
        } else {
            // .rj 的 json 阶段已经占到 rjBase，剩下的区间由真实的素材加载进度填满
            const base = this.rjBase || 0;
            const ratio = Math.max(0, Math.min(1, finished / total));
            this.setBar(base + (ratio * (RJ_PHASE_END - base)));
            const message = this.props.isRemote ? messages.downloadingAssets : messages.loadingAssets;
            this.messageEl.textContent = this.props.intl.formatMessage(message, {
                complete: finished,
                total
            });
        }
    }
    handleProjectLoaded () {
        if (this.ignoreProgress || !this.barInnerEl || !this.messageEl) {
            return;
        }

        this.ignoreProgress = true;
        this.setBar(100);
        const zh = this.props.locale === 'zh-cn';
        this.messageEl.textContent = zh ? '作品载入完成。' : 'Project loaded.';
        this.props.vm.runtime.resetProgress();
    }
    barInnerRef (barInner) {
        this.barInnerEl = barInner;
    }
    messageRef (message) {
        this.messageEl = message;
    }
    percentRef (percent) {
        this.percentEl = percent;
    }
    render () {
        const body = (
            <div className={styles.container}>
                <div
                    className={styles.typingText}
                    style={{
                        color: '#ffffff',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        minHeight: '30px',
                        letterSpacing: '2px',
                        marginBottom: '15px',
                        display: 'block',
                        zIndex: 100
                    }}
                >
                    {this.state.displayText}
                </div>

                <div className={styles.blockAnimation}>
                    <img
                        className={styles.topBlock}
                        src={topBlock}
                        draggable={false}
                    />
                    <img
                        className={styles.middleBlock}
                        src={middleBlock}
                        draggable={false}
                    />
                    <img
                        className={styles.bottomBlock}
                        src={bottomBlock}
                        draggable={false}
                    />
                </div>

                <div className={styles.title}>
                    {mainMessages[this.props.messageId]}
                </div>

                <div
                    className={styles.message}
                    ref={this.messageRef}
                />

                <div className={styles.barRow}>
                    <div className={styles.barOuter}>
                        <div
                            className={styles.barInner}
                            ref={this.barInnerRef}
                        >
                            <div className={styles.barShimmer} />
                        </div>
                    </div>
                    <span
                        className={styles.percentText}
                        ref={this.percentRef}
                    />
                </div>

                <div className={styles.randomMessage}>
                    {this.randomMessage}
                </div>
            </div>
        );

        return (
            <div
                className={classNames(styles.background, {
                    [styles.fullscreen]: this.props.isFullScreen
                })}
            >
                {body}
            </div>
        );
    }
}

LoaderComponent.propTypes = {
    intl: intlShape,
    isFullScreen: PropTypes.bool,
    isRemote: PropTypes.bool,
    messageId: PropTypes.string,
    locale: PropTypes.string,
    loadingProgress: PropTypes.shape({
        phase: PropTypes.string,
        detail: PropTypes.string,
        percent: PropTypes.number
    }),
    vm: PropTypes.shape({
        on: PropTypes.func,
        off: PropTypes.func,
        runtime: PropTypes.shape({
            totalAssetRequests: PropTypes.number,
            finishedAssetRequests: PropTypes.number,
            resetProgress: PropTypes.func,
            on: PropTypes.func,
            off: PropTypes.func
        })
    })
};
LoaderComponent.defaultProps = {
    isFullScreen: false,
    messageId: 'gui.loader.headline'
};

const mapStateToProps = state => ({
    isRemote: getIsLoadingWithId(state.scratchGui.projectState.loadingState),
    // localization-hoc 可能还没挂上 locales reducer，做个兜底
    locale: state.locales ? state.locales.locale : 'en',
    loadingProgress: state.scratchGui.loadingProgress || null,
    vm: state.scratchGui.vm
});

export default connect(mapStateToProps)(injectIntl(LoaderComponent));

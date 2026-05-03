import React from 'react';
import {FormattedMessage, injectIntl, intlShape, defineMessages} from 'react-intl';
import {connect} from 'react-redux';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import styles from './loader.css';
import {getIsLoadingWithId} from '../../reducers/project-state';
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

const randomMessages = [
  "Also try TurboWarp!",
  "Also try MistWarp!",
  "Also try Bilup!",
  "Also try 02Engine!",
  "Also try AstraEditor!"
];

const TYPE_STRING = '["ˍ"*/';

class LoaderComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleAssetProgress',
            'handleProjectLoaded',
            'barInnerRef',
            'messageRef'
        ]);
        this.barInnerEl = null;
        this.messageEl = null;
        this.ignoreProgress = false;
        this.randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];
        
        this.state = {
            displayText: TYPE_STRING
        };
        this.typingInterval = null;
        this.lastUpdateTime = Date.now();
        this.currentIndex = TYPE_STRING.length;
        
        this.startTyping();
    }
    
    componentDidMount () {
        if (this.props.vm) {
            this.handleAssetProgress(
                this.props.vm.runtime.finishedAssetRequests,
                this.props.vm.runtime.totalAssetRequests
            );
            this.props.vm.on('ASSET_PROGRESS', this.handleAssetProgress);
            this.props.vm.runtime.on('PROJECT_LOADED', this.handleProjectLoaded);
        }
    }
    
    componentWillUnmount () {
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
        this.setState({
            displayText: ''
        });
        
        this.typingInterval = setInterval(() => {
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
                    this.currentIndex = 0;
                    this.setState({
                        displayText: ''
                    });
                }, 1000);
            }
        }, 150);
    }
    
    handleAssetProgress (finished, total) {
        if (this.ignoreProgress || !this.barInnerEl || !this.messageEl) {
            return;
        }

        if (total === 0) {
            this.barInnerEl.style.width = '0';
            this.messageEl.textContent = this.props.intl.formatMessage(messages.projectData);
        } else {
            this.barInnerEl.style.width = `${finished / total * 100}%`;
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
        this.props.vm.runtime.resetProgress();
    }
    barInnerRef (barInner) {
        this.barInnerEl = barInner;
    }
    messageRef (message) {
        this.messageEl = message;
    }
    render () {
        return (
            <div
                className={classNames(styles.background, {
                    [styles.fullscreen]: this.props.isFullScreen
                })}
            >
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

                    <div className={styles.barOuter}>
                        <div
                            className={styles.barInner}
                            ref={this.barInnerRef}
                        />
                    </div>
                    
                    <div className={styles.randomMessage}>
                        {this.randomMessage}
                    </div>
                </div>
            </div>
        );
    }
}

LoaderComponent.propTypes = {
    intl: intlShape,
    isFullScreen: PropTypes.bool,
    isRemote: PropTypes.bool,
    messageId: PropTypes.string,
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
    vm: state.scratchGui.vm
});

const mapDispatchToProps = () => ({});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(injectIntl(LoaderComponent));
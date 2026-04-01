import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage, injectIntl} from 'react-intl';
import classNames from 'classnames';

import Modal from '../../containers/windowed-modal.jsx';
import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import Input from '../forms/input.jsx';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';

const BufferedInput = BufferedInputHOC(Input);

import {Handshake as CollaborationIcon, User, Crown, UserMinus, Copy, AlertTriangle, PenLine} from 'lucide-react';

import showAlert from '../../addons/window-system/alert';

import styles from './collaboration-modal.css';

class CollaborationModal extends Component {
    constructor (props) {
        super(props);

        this.state = {
            roomId: props.roomId || '',
            isConnecting: false,
            connectionStep: props.isConnected ? 'connected' : 'join',
            error: null,
            pendingRequests: [],
            showJoinRequest: false,
            turnstileToken: '',
            turnstileLoading: false,
            turnstileReady: false
        };

        this.autoJoinAttempted = new Set();
        this.autoJoinInProgress = false;
        this._autoJoinTimer = null;
        this._lastAutoJoinAttempt = new Map();
        this._autoJoinFailures = new Map();
        this.turnstileInitialized = false;

        this.handleRoomIdChange = this.handleRoomIdChange.bind(this);
        this.handleJoinRoom = this.handleJoinRoom.bind(this);
        this.handleCreateRoom = this.handleCreateRoom.bind(this);
        this.handleLeaveRoom = this.handleLeaveRoom.bind(this);
        this.handleKickUser = this.handleKickUser.bind(this);
        this.handleCopyRoomUrl = this.handleCopyRoomUrl.bind(this);
        this.fallbackCopyToClipboard = this.fallbackCopyToClipboard.bind(this);
        this.showUrlPrompt = this.showUrlPrompt.bind(this);
        this.generateRoomCode = this.generateRoomCode.bind(this);
        this.attemptAutoJoin = this.attemptAutoJoin.bind(this);
        this.handleApproveRequest = this.handleApproveRequest.bind(this);
        this.handleDenyRequest = this.handleDenyRequest.bind(this);
        this.handleCancelJoinRequest = this.handleCancelJoinRequest.bind(this);
        this.handleChangeCurrentRoomPrivacy = this.handleChangeCurrentRoomPrivacy.bind(this);
        this.handleJoinRequestEvent = this.handleJoinRequestEvent.bind(this);
        this.handleAwaitingApproval = this.handleAwaitingApproval.bind(this);
        this.handleApprovalResolved = this.handleApprovalResolved.bind(this);
        this.handleJoinDenied = this.handleJoinDenied.bind(this);
        this.resetToJoinScreen = this.resetToJoinScreen.bind(this);
        this.handleCancelClick = this.handleCancelClick.bind(this);
        this.togglePublicPrivacy = this.togglePublicPrivacy.bind(this);
        this.togglePrivatePrivacy = this.togglePrivatePrivacy.bind(this);
        this.verifyCaptcha = this.verifyCaptcha.bind(this);
        this.onTurnstileSuccess = this.onTurnstileSuccess.bind(this);
        this.onTurnstileReady = this.onTurnstileReady.bind(this);
    }

    componentDidMount () {
        console.log('[COLLAB MODAL] ComponentDidMount - props:', {
            roomId: this.props.roomId,
            isConnected: this.props.isConnected,
            currentUsername: this.props.currentUsername
        });

        // 为 Cloudflare Turnstile 回调设置全局引用
        if (typeof window !== 'undefined') {
            window.collaborationModal = this;
        }

        if (this.props.roomId && !this.props.isConnected && !this._autoJoinTimer && !this.autoJoinInProgress) {
            console.log('[COLLAB MODAL] Auto-joining room from URL:', this.props.roomId);

            const roomIdKey = `${this.props.roomId}-${this.props.currentUsername}`;
            this.autoJoinAttempted.add(roomIdKey);
            this.autoJoinInProgress = true;
            this._autoJoinTimer = setTimeout(() => {
                this._autoJoinTimer = null;
                this.autoJoinInProgress = false;
                this.attemptAutoJoin(this.props.roomId, this.props.currentUsername);
            }, 100);
        }

        if (typeof window !== 'undefined' && window.CollaborationService) {
            try {
                const service = window.CollaborationService.getInstance();
                if (service) {
                    service.on('join-request-received', this.handleJoinRequestEvent);
                    service.on('awaiting-approval', this.handleAwaitingApproval);
                    service.on('approval-resolved', this.handleApprovalResolved);
                    service.on('join-denied', this.handleJoinDenied);
                    service.on('connected-to-host', this.handleConnectedToHost);
                }
            } catch (error) {
                console.warn('Could not set up collaboration service event listeners:', error);
            }
        }
    }

    initTurnstile () {
        if (this.turnstileInitialized) return;
        
        this.setState({ turnstileLoading: true, turnstileReady: false });
        
        // 确保 Turnstile 脚本已加载
        if (typeof window !== 'undefined' && window.turnstile) {
            console.log('Initializing Turnstile...');
            this.turnstileInitialized = true;
            
            // 显式渲染 Turnstile
            window.turnstile.render('.cf-turnstile', {
                sitekey: '0x4AAAAAACyeS6Www9AVI--y',
                theme: 'auto',
                size: 'normal',
                language: 'auto',
                retry: 'auto',
                retryInterval: 2000,
                callback: (token) => {
                    console.log('Turnstile verification success, token:', token);
                    this.onTurnstileSuccess(token);
                },
                readyCallback: () => {
                    console.log('Turnstile ready');
                    this.onTurnstileReady();
                },
                errorCallback: (error) => {
                    console.error('Turnstile verification error:', error);
                    this.setState({ turnstileLoading: false, error: 'Verification failed. Please try again.' });
                },
                expiredCallback: () => {
                    console.log('Turnstile token expired, reinitializing...');
                    this.setState({ turnstileToken: '', turnstileReady: false });
                    this.initTurnstile();
                },
                timeoutCallback: () => {
                    console.error('Turnstile verification timed out');
                    this.setState({ turnstileLoading: false, error: 'Verification timed out. Please try again.' });
                }
            });
        } else {
            // 如果 Turnstile 脚本还没加载，等待一下再尝试
            console.log('Turnstile script not loaded yet, waiting...');
            setTimeout(() => this.initTurnstile(), 100);
        }
    }

    onTurnstileReady () {
        this.setState({ turnstileLoading: false, turnstileReady: true });
    }

    componentDidUpdate (prevProps, prevState) {
        // 当切换到验证码步骤时，初始化 Cloudflare Turnstile
        if (this.state.connectionStep === 'captcha' && prevState.connectionStep !== 'captcha') {
            this.initTurnstile();
        }

        if (prevProps.isConnected !== this.props.isConnected) {
            const newConnectionStep = this.props.isConnected ? 'connected' : 'join';
            this.setState({
                connectionStep: newConnectionStep,
                isConnecting: false,
                error: null
            });

            if (!this.props.isConnected) {
                this.autoJoinInProgress = false;
                if (this._autoJoinTimer) {
                    clearTimeout(this._autoJoinTimer);
                    this._autoJoinTimer = null;
                }
                return;
            }
            const roomIdKey = `${this.props.roomId}-${this.props.currentUsername}`;
            this._autoJoinFailures.delete(roomIdKey);
        }

        const shouldResetToJoin =
            prevProps.roomId !== this.props.roomId &&
            this.props.roomId === null &&
            !this.props.isConnected;

        if (shouldResetToJoin) {
            this.resetToJoinScreen();
        }

        if (prevProps.connectionError !== this.props.connectionError && this.props.connectionError) {
            this.setState({
                error: this.props.connectionError,
                isConnecting: false,
                connectionStep: 'join'
            });
        }

        if (prevProps.roomId !== this.props.roomId && this.props.roomId && !this.props.isConnected) {
            console.log('Room ID prop changed, updating local state:', this.props.roomId);
            this.setState({
                roomId: this.props.roomId
            });

            const roomIdKey = `${this.props.roomId}-${this.props.currentUsername}`;
            const now = Date.now();
            const lastAttempt = this._lastAutoJoinAttempt.get(roomIdKey) || 0;
            const timeSinceLastAttempt = now - lastAttempt;
            const cooldownPeriod = 30000;
            const failureCount = this._autoJoinFailures.get(roomIdKey) || 0;
            const hasNoPreviousRoomId = prevProps.roomId === null || prevProps.roomId === undefined;
            const hasCurrentUsername = this.props.currentUsername != null;
            const shouldAttemptAutoJoin =
                hasNoPreviousRoomId &&
                this.props.roomId &&
                hasCurrentUsername &&
                !this._autoJoinTimer &&
                !this.autoJoinInProgress &&
                timeSinceLastAttempt > cooldownPeriod &&
                failureCount < 5;

            if (shouldAttemptAutoJoin) {
                console.log('Auto-joining room after prop update:', this.props.roomId);
                this.autoJoinAttempted.add(roomIdKey);
                this._lastAutoJoinAttempt.set(roomIdKey, now);
                this.autoJoinInProgress = true;
                this._autoJoinTimer = setTimeout(() => {
                    this._autoJoinTimer = null;
                    this.autoJoinInProgress = false;
                    this.attemptAutoJoin(this.props.roomId, this.props.currentUsername);
                }, 100);
            } else if (failureCount >= 5) {
                console.log(
                    `[COLLAB MODAL] Too many consecutive failures (${failureCount}), skipping auto-join`
                );
                this.setState({
                    error: 'Unable to connect to the room. Please try again later.',
                    connectionStep: 'join'
                });
            } else if (timeSinceLastAttempt <= cooldownPeriod) {
                const elapsedSeconds = Math.round(timeSinceLastAttempt / 1000);
                const cooldownSeconds = cooldownPeriod / 1000;
                console.log(`[COLLAB MODAL] Auto-join cooldown in effect (${elapsedSeconds}s / ${cooldownSeconds}s)`);
            }
        }

        if (this.props.visible && typeof window !== 'undefined' && window.CollaborationService) {
            try {
                const service = window.CollaborationService.getInstance();
                if (service && service.getPendingJoinRequests) {
                    const pendingRequests = service.getPendingJoinRequests();
                    const hasChanged =
                        JSON.stringify(pendingRequests) !== JSON.stringify(this.state.pendingRequests);

                    if (hasChanged) {
                        this.setState({pendingRequests});
                    }
                }
            } catch (error) {
                // ignore
            }
        }
    }

    componentWillUnmount () {
        // 清理 Cloudflare Turnstile 全局引用
        if (typeof window !== 'undefined') {
            delete window.collaborationModal;
        }

        if (typeof window !== 'undefined' && window.CollaborationService) {
            try {
                const service = window.CollaborationService.getInstance();
                if (service) {
                    service.off('join-request-received', this.handleJoinRequestEvent);
                    service.off('awaiting-approval', this.handleAwaitingApproval);
                    service.off('approval-resolved', this.handleApprovalResolved);
                    service.off('join-denied', this.handleJoinDenied);
                    service.off('connected-to-host', this.handleConnectedToHost);
                }
            } catch (error) {
                console.warn('Could not clean up collaboration service event listeners:', error);
            }
        }

        this.autoJoinAttempted.clear();
        this.autoJoinInProgress = false;
        this._lastAutoJoinAttempt.clear();
        this._autoJoinFailures.clear();
        if (this._autoJoinTimer) {
            clearTimeout(this._autoJoinTimer);
            this._autoJoinTimer = null;
        }
    }

    resetToJoinScreen () {
        this.setState({
            connectionStep: 'join',
            isConnecting: false,
            error: null
        });
    }

    handleCancelClick () {
        this.resetToJoinScreen();
        this.props.onCancelConnection();
    }

    togglePublicPrivacy () {
        this.handleChangeCurrentRoomPrivacy('public');
    }

    togglePrivatePrivacy () {
        this.handleChangeCurrentRoomPrivacy('private');
    }

    handleRoomIdChange (roomId) {
        this.setState({roomId});
    }

    async handleJoinRoom () {
        if (!this.state.roomId.trim()) {
            this.setState({error: 'Please enter a room ID'});
            return;
        }

        // 存储待加入的房间信息
        this._pendingRoomJoin = {
            roomId: this.state.roomId.trim(),
            username: this.props.currentUsername
        };

        // 显示人机验证步骤
        this.setState({
            connectionStep: 'captcha',
            error: null,
            turnstileToken: ''
        });
    }

    async handleCreateRoom () {
        // 生成房间代码并存储
        this._pendingRoomCreation = {
            roomCode: this.generateRoomCode(),
            username: this.props.currentUsername
        };

        // 显示人机验证步骤
        this.setState({
            connectionStep: 'captcha',
            error: null,
            turnstileToken: ''
        });
    }

    handleLeaveRoom () {
        this.props.onLeaveRoom();
        this.setState({
            connectionStep: 'join',
            roomId: '',
            error: null
        });
    }

    handleKickUser (userId) {
        this.props.onKickUser(userId);
    }

    handleCopyRoomUrl () {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('room', this.props.roomId);
        currentUrl.searchParams.delete('username');
        const roomUrl = currentUrl.toString();

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(roomUrl).then(() => {
                console.log('Room URL copied to clipboard');
                showAlert('Room URL copied to clipboard!');
            })
                .catch(err => {
                    console.error('Failed to copy room URL:', err);
                    this.fallbackCopyToClipboard(roomUrl);
                });
        } else {
            this.fallbackCopyToClipboard(roomUrl);
        }
    }

    fallbackCopyToClipboard (text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);

        try {
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            if (successful) {
                console.log('Room URL copied to clipboard (fallback)');
                showAlert('Room URL copied to clipboard!');
            } else {
                console.warn('Fallback copy failed');
                this.showUrlPrompt(text);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            this.showUrlPrompt(text);
        } finally {
            document.body.removeChild(textArea);
        }
    }

    showUrlPrompt (text) {
        console.log('Room URL:', text);
        showAlert(
            'Could not copy room URL to clipboard. The URL has been logged to the console for manual copying.'
        );
    }

    generateRoomCode () {
        const adjectives = ['cool', 'fun', 'epic', 'wild', 'neat', 'rad', 'hot', 'ice', 'big', 'tiny'];
        const nouns = ['cat', 'dog', 'owl', 'fox', 'bee', 'ant', 'fish', 'bird', 'frog', 'duck'];

        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNum = Math.floor(Math.random() * 1000).toString()
            .padStart(3, '0');

        return `${randomAdjective}-${randomNoun}-${randomNum}`;
    }

    async attemptAutoJoin (roomCode, username) {
        console.log(`Attempting to auto-join room "${roomCode}" as "${username}"`);

        try {
            if (!roomCode) {
                console.error('attemptAutoJoin called with null/undefined roomCode');
                this.autoJoinInProgress = false;
                this.setState({
                    error: 'No room code provided',
                    isConnecting: false,
                    connectionStep: 'join'
                });
                return;
            }

            if (!username) {
                console.error('attemptAutoJoin called with null/undefined username');
                this.autoJoinInProgress = false;
                this.setState({
                    error: 'Username not available',
                    isConnecting: false,
                    connectionStep: 'join'
                });
                return;
            }

            this.setState({
                isConnecting: true,
                connectionStep: 'connecting',
                error: null
            });

            await this.props.onJoinRoom(roomCode, username);
            console.log(`Successfully joined room "${roomCode}"`);

            const roomIdKey = `${roomCode}-${username}`;
            this._autoJoinFailures.delete(roomIdKey);
        } catch (error) {
            console.log(`Failed to join room "${roomCode}":`, error.message);

            const roomIdKey = `${roomCode}-${username}`;
            const failureCount = (this._autoJoinFailures.get(roomIdKey) || 0) + 1;
            this._autoJoinFailures.set(roomIdKey, failureCount);
            console.log(`[COLLAB MODAL] Update failure count for "${roomCode}": ${failureCount}`);

            try {
                console.log(`Auto-creating room "${roomCode}" since it doesn't exist`);
                // 自动创建房间时也需要先进行人机验证
                this.generateCaptcha();
                this.setState({
                    connectionStep: 'captcha',
                    error: null,
                    isConnecting: false
                });
                // 存储要创建的房间信息，以便验证后使用
                this._pendingRoomCreation = {
                    roomCode,
                    username
                };
            } catch (createError) {
                console.error(`Failed to create room "${roomCode}":`, createError.message);

                this.autoJoinInProgress = false;

                if (failureCount < 3) {
                    this.setState({
                        error: `Room "${roomCode}" doesn't exist and couldn't be created: ${createError.message || 'Unknown error'}`,
                        isConnecting: false,
                        connectionStep: 'join'
                    });
                } else {
                    this.setState({
                        error: `Unable to connect. Will retry in a moment... (${failureCount} attempts)`,
                        isConnecting: false,
                        connectionStep: 'join'
                    });
                }
            }
        }
    }

    onTurnstileSuccess (token) {
        this.setState({ turnstileToken: token });
        this.verifyCaptcha();
    }

    async verifyCaptcha () {
        if (!this.state.turnstileToken) {
            this.setState({ error: 'Please complete the verification.' });
            return;
        }
        
        this.setState({
            isConnecting: true,
            connectionStep: 'connecting',
            error: null
        });
        
        try {
            const serverUrl = 'https://remixwarp.pages.dev';
            
            const response = await fetch(`${serverUrl}/api/verify-turnstile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: this.state.turnstileToken
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                    // 重置加载状态
                    this.setState({
                        isConnecting: false,
                        turnstileLoading: false,
                        turnstileReady: false
                    });
                    
                    if (this._pendingRoomCreation) {
                        const { roomCode, username } = this._pendingRoomCreation;
                        await this.props.onCreateRoom(roomCode, username, 'public');
                        
                        const currentUrl = new URL(window.location.href);
                        currentUrl.searchParams.set('room', roomCode);
                        currentUrl.searchParams.delete('username');
                        window.history.replaceState(null, null, currentUrl.toString());
                        
                        this.setState({ roomId: roomCode });
                        this._pendingRoomCreation = null;
                    } else if (this._pendingRoomJoin) {
                        const { roomId, username } = this._pendingRoomJoin;
                        await this.props.onJoinRoom(roomId, username);
                        
                        const currentUrl = new URL(window.location.href);
                        currentUrl.searchParams.set('room', roomId);
                        currentUrl.searchParams.delete('username');
                        window.history.replaceState(null, null, currentUrl.toString());
                        
                        this.setState({ roomId: roomId });
                        this._pendingRoomJoin = null;
                    } else {
                        const roomCode = this.generateRoomCode();
                        await this.props.onCreateRoom(roomCode, this.props.currentUsername, 'public');
                        
                        const currentUrl = new URL(window.location.href);
                        currentUrl.searchParams.set('room', roomCode);
                        currentUrl.searchParams.delete('username');
                        window.history.replaceState(null, null, currentUrl.toString());
                        
                        this.setState({ roomId: roomCode });
                    }
            } else {
                console.error('Turnstile verification failed:', result);
                this.setState({
                    isConnecting: false,
                    error: 'Invalid verification. Please try again.',
                    turnstileToken: '',
                    turnstileReady: false
                });
                
                // 重新初始化 Turnstile
                this.turnstileInitialized = false;
                setTimeout(() => this.initTurnstile(), 500);
            }
        } catch (error) {
            console.error('Error verifying captcha or creating/joining room:', error);
            this.setState({
                error: 'Error verifying captcha. Please try again.',
                isConnecting: false,
                turnstileToken: '',
                turnstileReady: false
            });
            
            // 重新初始化 Turnstile
            this.turnstileInitialized = false;
            setTimeout(() => this.initTurnstile(), 500);
        }
    }


    async handleApproveRequest (requesterId, requesterUsername) {
        try {
            await this.props.onApproveJoinRequest(requesterId, requesterUsername);
            this.setState(prevState => ({
                pendingRequests: prevState.pendingRequests.filter(req => req.id !== requesterId)
            }));
        } catch (error) {
            console.error('Failed to approve join request:', error);
            this.setState({error: 'Failed to approve join request'});
        }
    }

    async handleDenyRequest (requesterId) {
        try {
            await this.props.onDenyJoinRequest(requesterId);
            this.setState(prevState => ({
                pendingRequests: prevState.pendingRequests.filter(req => req.id !== requesterId)
            }));
        } catch (error) {
            console.error('Failed to deny join request:', error);
            this.setState({error: 'Failed to deny join request'});
        }
    }

    handleCancelJoinRequest () {
        if (this.props.onCancelJoinRequest) {
            this.props.onCancelJoinRequest();
        }

        if (typeof window !== 'undefined' && window.CollaborationService) {
            try {
                const service = window.CollaborationService.getInstance();
                if (service) {
                    service.disconnect();
                }
            } catch (error) {
                console.warn('Could not disconnect from collaboration service:', error);
            }
        }

        this.setState({
            connectionStep: 'join',
            isConnecting: false,
            error: null
        });
    }

    handleAwaitingApproval () {
        console.log('[COLLAB MODAL] Awaiting approval from host', {
            isConnected: this.props.isConnected,
            connectionStep: this.state.connectionStep
        });

        this.setState({
            connectionStep: 'pending-approval',
            isConnecting: false,
            error: null
        });
    }

    handleApprovalResolved () {
        console.log('[COLLAB MODAL] Approval resolved', {
            isConnected: this.props.isConnected,
            connectionStep: this.state.connectionStep
        });

        this.setState({
            connectionStep: this.props.isConnected ? 'connected' : 'connecting',
            error: null
        });
    }

    handleJoinDenied (reason) {
        console.log('[COLLAB MODAL] Join request denied:', reason);
        this.setState({
            connectionStep: 'join',
            isConnecting: false,
            error: `Join request denied: ${reason}`
        });
    }

    handleConnectedToHost () {
        console.log('[COLLAB MODAL] Connected to host', {
            isConnected: this.props.isConnected,
            connectionStep: this.state.connectionStep
        });

        this.setState({
            connectionStep: 'connected',
            isConnecting: false,
            error: null
        });
    }

    async handleChangeCurrentRoomPrivacy (newPrivacy) {
        try {
            await this.props.onChangeRoomPrivacy(newPrivacy);
        } catch (error) {
            console.error('Failed to change room privacy:', error);
            this.setState({error: 'Failed to change room privacy'});
        }
    }

    handleJoinRequestEvent (data) {
        console.log('[COLLAB MODAL] Join request event received:', data);
        if (typeof window !== 'undefined' && window.CollaborationService) {
            try {
                const service = window.CollaborationService.getInstance();
                if (service && service.getPendingJoinRequests) {
                    const pendingRequests = service.getPendingJoinRequests();
                    console.log('[COLLAB MODAL] Updated pending requests:', pendingRequests);
                    this.setState({pendingRequests});
                }
            } catch (error) {
                console.warn('Could not get pending requests:', error);
            }
        }
    }

    renderJoinStep () {
        return (
            <Box className={styles.content}>
                <div className={styles.alphaBanner}>
                    <div className={styles.bannerIcon}>
                        <AlertTriangle size={20} />
                    </div>
                    <div className={styles.bannerContent}>
                        <strong>
                            <FormattedMessage
                                defaultMessage="Alpha Warning:"
                                description="Alpha warning label"
                                id="gui.collaboration.alphaWarningLabel"
                            />
                        </strong>
                        {' '}
                        <FormattedMessage
                            defaultMessage="This feature is in early development. Your projects may get corrupted or broken. Use at your own risk."
                            description="Alpha warning message"
                            id="gui.collaboration.alphaWarningMessage"
                        />
                    </div>
                </div>

                <div className={styles.header}>
                    <CollaborationIcon
                        className={styles.headerIcon}
                        draggable={false}
                    />
                    <div className={styles.headerText}>
                        <FormattedMessage
                            defaultMessage="Live Collaboration"
                            description="Title for collaboration modal"
                            id="gui.collaboration.title"
                        />
                    </div>
                </div>

                <div className={styles.description}>
                    <FormattedMessage
                        defaultMessage="You will be known as: {username}"
                        description="Shows current username"
                        id="gui.collaboration.currentUsername"
                        values={{username: this.props.currentUsername}}
                    />
                    <button
                        className={styles.editUsernameButton}
                        onClick={this.props.onOpenChangeUsername}
                        title="Change username"
                    >
                        <PenLine size={16} />
                    </button>
                </div>

                <div className={styles.roomActions}>
                    <div className={styles.joinSection}>
                        <h3 className={styles.sectionTitle}>
                            <FormattedMessage
                                defaultMessage="Join an Existing Room"
                                description="Join room section title"
                                id="gui.collaboration.joinTitle"
                            />
                        </h3>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>
                                <FormattedMessage
                                    defaultMessage="Room ID"
                                    description="Label for room ID input"
                                    id="gui.collaboration.roomId"
                                />
                            </label>
                            <BufferedInput
                                className={styles.input}
                                placeholder={this.props.intl.formatMessage({
                                    id: 'gui.collaboration.roomIdPlaceholder',
                                    defaultMessage: 'Enter room ID...',
                                    description: 'Placeholder for room ID input'
                                })}
                                value={this.state.roomId}
                                onSubmit={this.handleRoomIdChange}
                            />
                        </div>
                        <Button
                            className={styles.primaryButton}
                            onClick={this.handleJoinRoom}
                            disabled={this.state.isConnecting}
                        >
                            <FormattedMessage
                                defaultMessage="Join Room"
                                description="Button to join collaboration room"
                                id="gui.collaboration.joinRoom"
                            />
                        </Button>
                        {this.state.error && (
                            <div className={styles.joinError}>
                                {this.state.error}
                            </div>
                        )}
                    </div>

                    <div className={styles.sectionDivider} />

                    <div className={styles.createSection}>
                        <h3 className={styles.sectionTitle}>
                            <FormattedMessage
                                defaultMessage="Create a New Room"
                                description="Create room section title"
                                id="gui.collaboration.createTitle"
                            />
                        </h3>
                        <div className={styles.createDescription}>
                            <FormattedMessage
                                defaultMessage="Generate a new room ID to start collaborating with others. Share the room URL to invite people."
                                description="Create room description"
                                id="gui.collaboration.createDescription"
                            />
                        </div>
                        <Button
                            className={styles.secondaryButton}
                            onClick={this.handleCreateRoom}
                            disabled={this.state.isConnecting}
                        >
                            <FormattedMessage
                                defaultMessage="Create New Room"
                                description="Button to create new collaboration room"
                                id="gui.collaboration.createRoom"
                            />
                        </Button>
                    </div>
                </div>
            </Box>
        );
    }

    renderConnectingStep () {
        return (
            <Box className={styles.content}>
                <div className={styles.alphaBanner}>
                    <div className={styles.bannerIcon}>
                        <AlertTriangle size={20} />
                    </div>
                    <div className={styles.bannerContent}>
                        <strong>
                            <FormattedMessage
                                defaultMessage="Alpha Warning:"
                                description="Alpha warning label"
                                id="gui.collaboration.alphaWarningLabel"
                            />
                        </strong>
                        {' '}
                        <FormattedMessage
                            defaultMessage="This feature is in early development. Your projects may get corrupted or broken. Use at your own risk."
                            description="Alpha warning message"
                            id="gui.collaboration.alphaWarningMessage"
                        />
                    </div>
                </div>
                <div className={styles.connecting}>
                    <div className={styles.spinner} />
                    <FormattedMessage
                        defaultMessage="Connecting to room..."
                        description="Connecting message"
                        id="gui.collaboration.connecting"
                    />
                    <div className={styles.buttonGroup}>
                        <Button
                            className={styles.secondaryButton}
                            onClick={this.handleCancelClick}
                        >
                            <FormattedMessage
                                defaultMessage="Cancel"
                                description="Cancel connection button"
                                id="gui.collaboration.cancel"
                            />
                        </Button>
                    </div>
                </div>
            </Box>
        );
    }

    renderConnectedStep () {
        const users = this.props.connectedUsers || [];
        const currentUser = users.find(user => user.id === this.props.currentUserId);
        const isHost = currentUser && currentUser.isHost;

        return (
            <Box className={styles.content}>
                <div className={styles.alphaBanner}>
                    <div className={styles.bannerIcon}>
                        <AlertTriangle size={20} />
                    </div>
                    <div className={styles.bannerContent}>
                        <strong>
                            <FormattedMessage
                                defaultMessage="Alpha Warning:"
                                description="Alpha warning label"
                                id="gui.collaboration.alphaWarningLabel"
                            />
                        </strong>
                        {' '}
                        <FormattedMessage
                            defaultMessage="This feature is in early development. Your projects may get corrupted or broken. Use at your own risk."
                            description="Alpha warning message"
                            id="gui.collaboration.alphaWarningMessage"
                        />
                    </div>
                </div>

                <div className={styles.header}>
                    <CollaborationIcon
                        className={styles.headerIcon}
                        draggable={false}
                    />
                    <div className={styles.headerText}>
                        <FormattedMessage
                            defaultMessage="Room: {roomId}"
                            description="Connected room title"
                            id="gui.collaboration.connectedRoom"
                            values={{roomId: this.props.roomId}}
                        />
                    </div>
                </div>

                <div className={styles.connectedInfo}>
                    <div className={styles.status}>
                        <span className={styles.statusIndicator} />
                        <FormattedMessage
                            defaultMessage="Connected - {userCount} {userCount, plural, one {user} other {users}} online"
                            description="Connection status"
                            id="gui.collaboration.status"
                            values={{userCount: users.length}}
                        />
                    </div>
                </div>

                <div className={styles.usersSectionWrapper}>
                    <div className={styles.usersSection}>
                        <h3 className={styles.sectionTitle}>
                            <FormattedMessage
                                defaultMessage="Connected Users"
                                description="Users section title"
                                id="gui.collaboration.connectedUsers"
                            />
                        </h3>

                        <div className={styles.usersList}>
                            {users.map(user => (
                                <div
                                    key={user.id}
                                    className={classNames(styles.userItem, {
                                        [styles.currentUser]: user.id === this.props.currentUserId
                                    })}
                                >
                                    <div className={styles.userIcon}>
                                        {user.isHost ? <Crown /> : <User />}
                                    </div>
                                    <span className={styles.username}>
                                        {user.username}
                                        {user.isHost && (
                                            <span className={styles.hostBadge}>
                                                <FormattedMessage
                                                    defaultMessage="Host"
                                                    description="Host badge"
                                                    id="gui.collaboration.host"
                                                />
                                            </span>
                                        )}
                                        {user.id === this.props.currentUserId && (
                                            <span className={styles.youBadge}>
                                                <FormattedMessage
                                                    defaultMessage="You"
                                                    description="You badge"
                                                    id="gui.collaboration.you"
                                                />
                                            </span>
                                        )}
                                    </span>

                                    {isHost && user.id !== this.props.currentUserId && (
                                        <Button
                                            className={styles.kickButton}
                                            onClick={this.handleKickUser.bind(this, user.id)}
                                            iconElem={UserMinus}
                                            iconClassName={styles.kickIcon}
                                        >
                                            <FormattedMessage
                                                defaultMessage="Kick"
                                                description="Kick user button"
                                                id="gui.collaboration.kick"
                                            />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {isHost && this.state.pendingRequests.length > 0 && (
                    <>
                        <div className={styles.sectionDivider} />
                        <div className={styles.requestsSection}>
                            <h3 className={styles.sectionTitle}>
                                <FormattedMessage
                                    defaultMessage="Pending Join Requests ({count})"
                                    description="Pending requests section title"
                                    id="gui.collaboration.pendingRequests"
                                    values={{count: this.state.pendingRequests.length}}
                                />
                            </h3>

                            <div className={styles.requestsList}>
                                {this.state.pendingRequests.map(request => (
                                    <div
                                        key={request.id}
                                        className={styles.requestItem}
                                    >
                                        <div className={styles.requesterInfo}>
                                            <User className={styles.userIcon} />
                                            <span className={styles.username}>
                                                {request.username}
                                            </span>
                                        </div>

                                        <div className={styles.requestActions}>
                                            <Button
                                                className={styles.approveButton}
                                                onClick={this.handleApproveRequest.bind(this, request.id, request.username)}
                                            >
                                                <FormattedMessage
                                                    defaultMessage="Approve"
                                                    description="Approve join request button"
                                                    id="gui.collaboration.approve"
                                                />
                                            </Button>
                                            <Button
                                                className={styles.denyButton}
                                                onClick={this.handleDenyRequest.bind(this, request.id)}
                                            >
                                                <FormattedMessage
                                                    defaultMessage="Deny"
                                                    description="Deny join request button"
                                                    id="gui.collaboration.deny"
                                                />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {isHost && (
                    <>
                        <div className={styles.sectionDivider} />
                        <div className={styles.privacySection}>
                            <h3 className={styles.sectionTitle}>
                                <FormattedMessage
                                    defaultMessage="Room Privacy"
                                    description="Room privacy section title"
                                    id="gui.collaboration.roomPrivacySettings"
                                />
                            </h3>

                            {this.props.roomPrivacy === 'public' ? (
                                <div className={styles.privacyCard}>
                                    <div className={styles.privacyCardTitle}>
                                        <FormattedMessage
                                            defaultMessage="Public Room"
                                            description="Public room card title"
                                            id="gui.collaboration.publicRoom"
                                        />
                                    </div>
                                    <div className={styles.privacyCardDesc}>
                                        <FormattedMessage
                                            defaultMessage="Anyone can join this room without approval"
                                            description="Public room explanation"
                                            id="gui.collaboration.publicRoomDesc"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {this.props.roomPrivacy === 'private' ? (
                                <div className={classNames(styles.privacyCard, styles.private)}>
                                    <div className={styles.privacyCardTitle}>
                                        <FormattedMessage
                                            defaultMessage="Private Room"
                                            description="Private room card title"
                                            id="gui.collaboration.privateRoom"
                                        />
                                    </div>
                                    <div className={styles.privacyCardDesc}>
                                        <FormattedMessage
                                            defaultMessage="Users must request approval to join this room"
                                            description="Private room explanation"
                                            id="gui.collaboration.privateRoomDesc"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div className={styles.privacySelector}>
                                <label className={styles.radioLabel}>
                                    <FancyCheckbox
                                        className={styles.checkbox}
                                        checked={this.props.roomPrivacy === 'public'}
                                        onChange={this.togglePublicPrivacy}
                                    />
                                    <span className={styles.radioText}>
                                        <FormattedMessage
                                            defaultMessage="Make Public"
                                            description="Make public room option"
                                            id="gui.collaboration.makePublic"
                                        />
                                    </span>
                                </label>
                                <label className={styles.radioLabel}>
                                    <FancyCheckbox
                                        className={styles.checkbox}
                                        checked={this.props.roomPrivacy === 'private'}
                                        onChange={this.togglePrivatePrivacy}
                                    />
                                    <span className={styles.radioText}>
                                        <FormattedMessage
                                            defaultMessage="Make Private"
                                            description="Make private room option"
                                            id="gui.collaboration.makePrivate"
                                        />
                                    </span>
                                </label>
                            </div>
                        </div>
                    </>
                )}

                <div className={styles.connectedActions}>
                    <div className={styles.primaryActions}>
                        <Button
                            className={styles.primaryButton}
                            onClick={this.handleCopyRoomUrl}
                            iconElem={Copy}
                            iconClassName={styles.buttonIcon}
                        >
                            <FormattedMessage
                                defaultMessage="Copy Room URL to Share"
                                description="Button to copy room URL for sharing"
                                id="gui.collaboration.copyRoomUrl"
                            />
                        </Button>
                    </div>

                    <Button
                        className={styles.dangerButton}
                        onClick={this.handleLeaveRoom}
                    >
                        <FormattedMessage
                            defaultMessage="Leave Room"
                            description="Button to leave collaboration room"
                            id="gui.collaboration.leaveRoom"
                        />
                    </Button>
                </div>
            </Box>
        );
    }

    renderPendingApprovalStep () {
        return (
            <Box className={styles.content}>
                <div className={styles.alphaBanner}>
                    <div className={styles.bannerIcon}>
                        <AlertTriangle size={20} />
                    </div>
                    <div className={styles.bannerContent}>
                        <strong>
                            <FormattedMessage
                                defaultMessage="Alpha Warning:"
                                description="Alpha warning label"
                                id="gui.collaboration.alphaWarningLabel"
                            />
                        </strong>
                        {' '}
                        <FormattedMessage
                            defaultMessage="This feature is in early development. Your projects may get corrupted or broken. Use at your own risk."
                            description="Alpha warning message"
                            id="gui.collaboration.alphaWarningMessage"
                        />
                    </div>
                </div>
                <div className={styles.header}>
                    <CollaborationIcon
                        className={styles.headerIcon}
                        draggable={false}
                    />
                    <div className={styles.headerText}>
                        <FormattedMessage
                            defaultMessage="Waiting for Host Approval"
                            description="Title for pending approval state"
                            id="gui.collaboration.waitingApproval"
                        />
                    </div>
                </div>

                <div className={styles.description}>
                    <FormattedMessage
                        defaultMessage="Your request to join this private room has been sent to the host. Please wait for approval."
                        description="Description for pending approval"
                        id="gui.collaboration.pendingApprovalDescription"
                    />
                </div>

                <div className={styles.buttonGroup}>
                    <Button
                        className={styles.secondaryButton}
                        onClick={this.handleCancelJoinRequest}
                    >
                        <FormattedMessage
                            defaultMessage="Cancel Request"
                            description="Button to cancel join request"
                            id="gui.collaboration.cancelRequest"
                        />
                    </Button>
                </div>

                {this.state.error && (
                    <div className={styles.error}>
                        {this.state.error}
                    </div>
                )}
            </Box>
        );
    }

    renderCaptchaStep () {
        return (
            <Box className={styles.content}>
                <div className={styles.alphaBanner}>
                    <div className={styles.bannerIcon}>
                        <AlertTriangle size={20} />
                    </div>
                    <div className={styles.bannerContent}>
                        <strong>
                            <FormattedMessage
                                defaultMessage="Alpha Warning:"
                                description="Alpha warning label"
                                id="gui.collaboration.alphaWarningLabel"
                            />
                        </strong>
                        {' '}
                        <FormattedMessage
                            defaultMessage="This feature is in early development. Your projects may get corrupted or broken. Use at your own risk."
                            description="Alpha warning message"
                            id="gui.collaboration.alphaWarningMessage"
                        />
                    </div>
                </div>
                <div className={styles.header}>
                    <CollaborationIcon
                        className={styles.headerIcon}
                        draggable={false}
                    />
                    <div className={styles.headerText}>
                        <FormattedMessage
                            defaultMessage="Human Verification"
                            description="Title for captcha verification"
                            id="gui.collaboration.captchaTitle"
                        />
                    </div>
                </div>

                <div className={styles.description}>
                    <FormattedMessage
                        defaultMessage="Please complete the verification to create a room."
                        description="Description for captcha verification"
                        id="gui.collaboration.captchaDescription"
                    />
                </div>

                <div className={styles.captchaSection}>
                    <div className={styles.turnstileContainer}>
                        {this.state.turnstileLoading ? (
                            <div className={styles.loadingContainer}>
                                <div className={styles.spinner} />
                                <p>Loading verification...</p>
                            </div>
                        ) : (
                            <div 
                                className="cf-turnstile" 
                                data-sitekey="0x4AAAAAACyeS6Www9AVI--y" 
                                data-theme="auto" 
                                data-size="normal" 
                                data-callback="window.collaborationModal.onTurnstileSuccess"
                                data-ready-callback="window.collaborationModal.onTurnstileReady"
                            ></div>
                        )}
                    </div>
                    <Button
                        className={styles.primaryButton}
                        onClick={this.verifyCaptcha}
                        disabled={!this.state.turnstileToken || this.state.turnstileLoading}
                    >
                        <FormattedMessage
                            defaultMessage="Verify"
                            description="Button to verify captcha"
                            id="gui.collaboration.verifyCaptcha"
                        />
                    </Button>
                </div>

                {this.state.error && (
                    <div className={styles.error}>
                        {this.state.error}
                    </div>
                )}

                <div className={styles.buttonGroup}>
                    <Button
                        className={styles.secondaryButton}
                        onClick={this.handleCancelClick}
                        disabled={this.state.turnstileLoading}
                    >
                        <FormattedMessage
                            defaultMessage="Cancel"
                            description="Cancel verification button"
                            id="gui.collaboration.cancelVerification"
                        />
                    </Button>
                </div>
            </Box>
        );
    }

    render () {
        let content;
        switch (this.state.connectionStep) {
        case 'join':
            content = this.renderJoinStep();
            break;
        case 'connecting':
            content = this.renderConnectingStep();
            break;
        case 'connected':
            content = this.renderConnectedStep();
            break;
        case 'pending-approval':
            content = this.renderPendingApprovalStep();
            break;
        case 'captcha':
            content = this.renderCaptchaStep();
            break;
        default:
            content = this.renderJoinStep();
        }

        return (
            <Modal
                visible={this.props.visible}
                className={styles.modalContent}
                onRequestClose={this.props.onRequestClose}
                contentLabel={this.props.intl.formatMessage({
                    id: 'gui.collaboration.title',
                    defaultMessage: 'Live Collaboration',
                    description: 'Title for collaboration modal'
                })}
                id="collaborationModal"
                width={600}
                height={720}
                resizable
            >
                <Box className={styles.body}>
                    {content}
                </Box>
            </Modal>
        );
    }
}

CollaborationModal.propTypes = {
    visible: PropTypes.bool,
    currentUsername: PropTypes.string,
    currentUserId: PropTypes.string,
    isConnected: PropTypes.bool,
    roomId: PropTypes.string,
    roomPrivacy: PropTypes.string,
    connectedUsers: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        username: PropTypes.string.isRequired,
        isHost: PropTypes.bool
    })),
    connectionError: PropTypes.string,
    onRequestClose: PropTypes.func.isRequired,
    onJoinRoom: PropTypes.func.isRequired,
    onCreateRoom: PropTypes.func.isRequired,
    onLeaveRoom: PropTypes.func.isRequired,
    onKickUser: PropTypes.func.isRequired,
    onCancelConnection: PropTypes.func.isRequired,
    onApproveJoinRequest: PropTypes.func,
    onDenyJoinRequest: PropTypes.func,
    onCancelJoinRequest: PropTypes.func,
    onChangeRoomPrivacy: PropTypes.func
};

export default injectIntl(CollaborationModal);

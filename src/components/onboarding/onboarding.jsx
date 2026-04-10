import PropTypes from 'prop-types';
import React, {Component, createRef} from 'react';
import ReactDOM from 'react-dom';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import WindowManager from '../../addons/window-system/window-manager.js';
import {Search, Maximize2, Palette, Sparkles, Hand, CheckCheck, Brain, RefreshCw} from 'lucide-react';

import './onboarding.css';

const messages = defineMessages({
    windowTitle: {
        defaultMessage: 'MistWarp Tutorial',
        description: 'Title of the onboarding tutorial window',
        id: 'onboarding.windowTitle'
    },
    step1Title: {
        defaultMessage: 'Welcome to MistWarp!',
        description: 'Title of the first onboarding step',
        id: 'onboarding.step1.title'
    },
    step1Content: {
        defaultMessage: 'Follow this short tour to discover the powerful features that make MistWarp special.',
        description: 'Content of the first onboarding step',
        id: 'onboarding.step1.content'
    },
    step2Title: {
        defaultMessage: 'Find Anything',
        description: 'Title of the second onboarding step',
        id: 'onboarding.step2.title'
    },
    step2Content: {
        defaultMessage: "Use the search bar to quickly find blocks, variables, broadcasts, and text content within your sprite's code.",
        description: 'Content of the second onboarding step',
        id: 'onboarding.step2.content'
    },
    step3Title: {
        defaultMessage: 'Window Manager',
        description: 'Title of the third onboarding step',
        id: 'onboarding.step3.title'
    },
    step3Content: {
        defaultMessage: "MistWarp's window manager gives you unparalleled multitasking power. Drag windows anywhere, resize them to your liking, or keep them always-on-top when you need them.",
        description: 'Content of the third onboarding step',
        id: 'onboarding.step3.content'
    },
    step4Title: {
        defaultMessage: 'Resize Panels',
        description: 'Title of the fourth onboarding step',
        id: 'onboarding.step4.title'
    },
    step4Content: {
        defaultMessage: 'Drag the resize handles to adjust the size of your workspace. Customize the stage, backpack, and block palette to fit your needs.',
        description: 'Content of the fourth onboarding step',
        id: 'onboarding.step4.content'
    },
    step5Title: {
        defaultMessage: 'Personalize Your Experience',
        description: 'Title of the fifth onboarding step',
        id: 'onboarding.step5.title'
    },
    step5Content: {
        defaultMessage: 'Choose from beautiful themes, accent colors, wallpapers, and custom fonts in Settings. Make MistWarp yours.',
        description: 'Content of the fifth onboarding step',
        id: 'onboarding.step5.content'
    },
    step6Title: {
        defaultMessage: "You're All Set!",
        description: 'Title of the sixth onboarding step',
        id: 'onboarding.step6.title'
    },
    step6Content: {
        defaultMessage: 'You can access this tutorial anytime from the Edit menu. Now go create something amazing!',
        description: 'Content of the sixth onboarding step',
        id: 'onboarding.step6.content'
    },
    step7Title: {
        defaultMessage: 'AI Assistant',
        description: 'Title of the seventh onboarding step',
        id: 'onboarding.step7.title'
    },
    step7Content: {
        defaultMessage: 'RemixWarp includes powerful AI tools to help you code faster and smarter. Access AI Chat for coding assistance or AI Agent for automated tasks.',
        description: 'Content of the seventh onboarding step',
        id: 'onboarding.step7.content'
    },
    step8Title: {
        defaultMessage: 'Compatibility Convert',
        description: 'Title of the eighth onboarding step',
        id: 'onboarding.step8.title'
    },
    step8Content: {
        defaultMessage: 'Convert your projects to work with different Scratch-based editors. Save to Scratch, Turbowarp, 02Engine, AstraEditor, or RemixWarp formats.',
        description: 'Content of the eighth onboarding step',
        id: 'onboarding.step8.content'
    },
    nextButton: {
        defaultMessage: 'Next',
        description: 'Next button in onboarding',
        id: 'onboarding.next'
    },
    startCreatingButton: {
        defaultMessage: 'Start Creating',
        description: 'Start creating button in onboarding',
        id: 'onboarding.startCreating'
    },
    skipTutorial: {
        defaultMessage: 'Skip tutorial',
        description: 'Skip tutorial link',
        id: 'onboarding.skipTutorial'
    },
    replayTutorial: {
        defaultMessage: 'Replay Tutorial',
        description: 'Replay tutorial button',
        id: 'onboarding.replayTutorial'
    }
});

const TUTORIAL_STEPS = [
    {
        titleKey: 'step1Title',
        contentKey: 'step1Content',
        icon: Sparkles,
        selector: null,
        position: 'center'
    },
    {
        titleKey: 'step2Title',
        contentKey: 'step2Content',
        icon: Search,
        selector: '.sa-find-dropdown',
        position: 'bottom'
    },
    {
        titleKey: 'step3Title',
        contentKey: 'step3Content',
        icon: Maximize2,
        selector: null,
        position: 'center',
        optional: true
    },
    {
        titleKey: 'step4Title',
        contentKey: 'step4Content',
        icon: Hand,
        selector: '.stagePaneResizer',
        position: 'right'
    },
    {
        titleKey: 'step5Title',
        contentKey: 'step5Content',
        icon: Palette,
        selector: null,
        position: 'bottom'
    },
    {
        titleKey: 'step7Title',
        contentKey: 'step7Content',
        icon: Brain,
        selector: '[class*="menu-bar_menu-bar"]',
        position: 'bottom'
    },
    {
        titleKey: 'step8Title',
        contentKey: 'step8Content',
        icon: RefreshCw,
        selector: '[class*="menu-bar_menu-bar"]',
        position: 'bottom'
    },
    {
        titleKey: 'step6Title',
        contentKey: 'step6Content',
        icon: CheckCheck,
        selector: null,
        position: 'center'
    }
];

class OnboardingTutorial extends Component {
    constructor (props) {
        super(props);
        this.windowRef = createRef();
        this.onboardingWindow = null;
        this.contentContainer = null;
        this.menuKeepOpenInterval = null;
    }

    componentDidMount () {
        this.openWindow();
    }

    componentDidUpdate (prevProps) {
        if (this.props.visible && !prevProps.visible) {
            this.openWindow();
        } else if (!this.props.visible && prevProps.visible) {
            this.closeWindow();
        } else if (this.props.visible && this.props.step !== prevProps.step) {
            this.handleStepChange(prevProps.step, this.props.step);
            setTimeout(() => {
                this.updateWindowPosition();
                this.ensureWindowVisible();
            }, 50);
        }
    }

    componentWillUnmount () {
        if (this.onboardingWindow) {
            this.onboardingWindow.destroy();
        }
        if (this.menuKeepOpenInterval) {
            clearInterval(this.menuKeepOpenInterval);
        }
    }

    handleStepChange (prevStep, newStep) {
        if (newStep === 1) {
            const findInput = document.querySelector('.mw-native-find-bar input');
            if (findInput) {
                findInput.focus();
            }
        }

        if (newStep === 4) {
            this.props.openSettingsMenu();
        }

        if (newStep === 5) {
            this.props.openToolsMenu();
            setTimeout(() => {
                try {
                    this.props.openAIMenu();
                    this.ensureWindowVisible();
                } catch (e) {
                    console.error('Error opening AI menu:', e);
                }
            }, 200);

            setTimeout(() => {
                this.keepMenusOpen();
            }, 300);
        }

        if (newStep === 6) {
            this.props.openFileMenu();
            setTimeout(() => {
                this.ensureWindowVisible();
            }, 50);
        }

        if (prevStep === 5 && newStep !== 6) {
            this.props.closeAIMenu();
            this.props.closeToolsMenu();
            setTimeout(() => {
                this.ensureWindowVisible();
            }, 50);
        }

        if (prevStep === 6 && newStep !== 7) {
            this.props.closeFileMenu();
            setTimeout(() => {
                this.ensureWindowVisible();
            }, 50);
        }
    }

    keepMenusOpen () {
        if (!this.props.visible || this.props.step !== 5) return;

        if (this.menuKeepOpenInterval) {
            clearInterval(this.menuKeepOpenInterval);
        }

        this.menuKeepOpenInterval = setInterval(() => {
            if (!this.props.visible || this.props.step !== 5) {
                if (this.menuKeepOpenInterval) {
                    clearInterval(this.menuKeepOpenInterval);
                    this.menuKeepOpenInterval = null;
                }
                return;
            }

            this.props.openToolsMenu();
            this.props.openAIMenu();
        }, 150);

        setTimeout(() => {
            if (this.menuKeepOpenInterval) {
                clearInterval(this.menuKeepOpenInterval);
                this.menuKeepOpenInterval = null;
            }
        }, 5000);
    }

    openWindow () {
        if (this.onboardingWindow) {
            try {
                this.onboardingWindow.show();
                this.updateWindowPosition();
            } catch (e) {
                console.error('Error showing onboarding window:', e);
            }
            return;
        }

        const {intl} = this.props;

        try {
            this.onboardingWindow = WindowManager.createWindow({
                id: 'onboarding-tutorial',
                title: intl.formatMessage(messages.windowTitle),
                width: 340,
                height: 380,
                minWidth: 300,
                minHeight: 350,
                resizable: true,
                modal: false,
                closable: true,
                minimizable: true,
                maximizable: false,
                onClose: this.handleClose
            });

            if (!this.onboardingWindow) {
                console.error('Failed to create onboarding window');
                return;
            }

            this.contentContainer = document.createElement('div');
            this.contentContainer.style.flex = '1';
            this.contentContainer.style.overflow = 'auto';
            this.contentContainer.style.minHeight = '0';

            this.onboardingWindow.setContent(this.contentContainer);
            this.onboardingWindow.show();
            setTimeout(() => {
                try {
                    this.updateWindowPosition();
                } catch (e) {
                    console.error('Error updating window position:', e);
                }
            }, 100);
            this.forceUpdate();
        } catch (e) {
            console.error('Error creating onboarding window:', e);
        }
    }

    closeWindow () {
        if (this.onboardingWindow) {
            this.onboardingWindow.hide();
        }
    }

    updateWindowPosition () {
        if (!this.onboardingWindow) return;

        const {step} = this.props;
        const currentStep = TUTORIAL_STEPS[step];

        if (!currentStep) return;

        if (!currentStep.selector || currentStep.position === 'center') {
            this.positionWindowCenter();
        } else {
            const target = document.querySelector(currentStep.selector);
            if (target) {
                const rect = target.getBoundingClientRect();
                this.positionWindowNearTarget(rect, currentStep.position);
            } else if (currentStep.optional) {
                this.positionWindowCenter();
            } else {
                this.positionWindowCenter();
            }
        }
    }

    positionWindowCenter () {
        if (!this.onboardingWindow) return;
        this.onboardingWindow.center();
    }

    ensureWindowVisible () {
        if (!this.onboardingWindow) return;

        try {
            if (this.onboardingWindow.element) {
                this.onboardingWindow.element.style.display = 'block';
                this.onboardingWindow.element.style.visibility = 'visible';
                this.onboardingWindow.element.style.opacity = '1';
            }
        } catch (e) {
            console.error('Error ensuring window visibility:', e);
        }
    }

    positionWindowNearTarget (targetRect, position) {
        if (!this.onboardingWindow) return;

        const windowWidth = this.onboardingWindow.width;
        const windowHeight = this.onboardingWindow.height;
        const margin = 20;
        let x; let y;

        switch (position) {
        case 'bottom':
            x = Math.max(16, Math.min(
                window.innerWidth - windowWidth - 16,
                targetRect.left + ((targetRect.width - windowWidth) / 2)
            ));
            y = targetRect.bottom + margin;
            if (y + windowHeight > window.innerHeight - 16) {
                y = Math.max(64, targetRect.top - windowHeight - margin);
            }
            break;
        case 'right':
            x = targetRect.right + margin;
            if (x + windowWidth > window.innerWidth - 16) {
                x = Math.max(16, targetRect.left - windowWidth - margin);
            }
            y = Math.max(64, Math.min(window.innerHeight - windowHeight - 16, targetRect.top));
            break;
        case 'left':
            x = Math.max(16, targetRect.left - windowWidth - margin);
            if (x < 16) {
                x = targetRect.right + margin;
            }
            y = Math.max(64, Math.min(window.innerHeight - windowHeight - 16, targetRect.top));
            break;
        case 'center':
        default:
            this.positionWindowCenter();
            return;
        }

        this.onboardingWindow.x = x;
        this.onboardingWindow.y = y;
        if (this.onboardingWindow.element) {
            this.onboardingWindow.element.style.left = `${x}px`;
            this.onboardingWindow.element.style.top = `${y}px`;
        }
    }

    handleClose = () => {
        this.props.onClose();
    };

    markAsComplete = () => {
        localStorage.setItem('mw:has-seen-onboarding', 'true');
    };

    markAsSkipped = () => {
        localStorage.setItem('mw:has-seen-onboarding', 'true');
    };

    renderContent () {
        if (!this.contentContainer) return null;

        const {intl, step, onNext, onPrev} = this.props;
        const currentStep = TUTORIAL_STEPS[step];
        if (!currentStep) return null;

        const Icon = currentStep.icon;
        const isLastStep = step === TUTORIAL_STEPS.length - 1;
        const isFirstStep = step === 0;

        const content = (
            <div className="mw-onboarding-content">
                <div className="mw-onboarding-icon">
                    <Icon size={32} />
                </div>

                <h3 className="mw-onboarding-title">
                    {intl.formatMessage(messages[currentStep.titleKey])}
                </h3>

                <p className="mw-onboarding-description">
                    {intl.formatMessage(messages[currentStep.contentKey])}
                </p>

                <div className="mw-onboarding-steps">
                    {TUTORIAL_STEPS.map((_, index) => (
                        <div
                            key={index}
                            className={`mw-onboarding-step-dot ${index === step ? 'active' : ''}`}
                        />
                    ))}
                </div>

                <div className="mw-onboarding-buttons">
                    {!isFirstStep && (
                        <button
                            className="mw-onboarding-button mw-onboarding-button-secondary"
                            onClick={onPrev}
                        >
                            {'←'}
                        </button>
                    )}

                    <button
                        className="mw-onboarding-button mw-onboarding-button-primary"
                        onClick={() => {
                            if (isLastStep) {
                                this.markAsComplete();
                                this.handleClose();
                            } else {
                                onNext();
                            }
                        }}
                    >
                        {isLastStep ? intl.formatMessage(messages.startCreatingButton) : `${intl.formatMessage(messages.nextButton)} `}
                        {!isLastStep && '→'}
                    </button>
                </div>

                {!isLastStep && (
                    <div
                        className="mw-onboarding-skip-text"
                        onClick={() => {
                            this.markAsSkipped();
                            this.handleClose();
                        }}
                    >
                        {intl.formatMessage(messages.skipTutorial)}
                    </div>
                )}

                {isLastStep && (
                    <button
                        className="mw-onboarding-button mw-onboarding-button-secondary"
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                        onClick={() => {
                            localStorage.removeItem('mw:has-seen-onboarding');
                            // 先关闭教程，然后重新打开，这样会重置步骤
                            this.props.onClose();
                            setTimeout(() => {
                                if (window.dispatchEvent) {
                                    window.dispatchEvent(new Event('show-onboarding'));
                                }
                            }, 100);
                        }}
                    >
                        {`↻ ${intl.formatMessage(messages.replayTutorial)}`}
                    </button>
                )}
            </div>
        );

        return ReactDOM.createPortal(content, this.contentContainer);
    }

    render () {
        if (!this.props.visible) return null;
        return this.renderContent();
    }
}

OnboardingTutorial.propTypes = {
    intl: intlShape.isRequired,
    visible: PropTypes.bool.isRequired,
    step: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    onPrev: PropTypes.func.isRequired,
    openSettingsMenu: PropTypes.func,
    openToolsMenu: PropTypes.func,
    openAIMenu: PropTypes.func,
    openFileMenu: PropTypes.func,
    closeToolsMenu: PropTypes.func,
    closeAIMenu: PropTypes.func,
    closeFileMenu: PropTypes.func
};

export default injectIntl(OnboardingTutorial);

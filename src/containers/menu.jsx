import PropTypes from 'prop-types';
import React from 'react';

import MenuComponent from '../components/menu/menu.jsx';
import WindowManager from '../addons/window-system/window-manager.js';

class Menu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isAnimating: false,
            isOpen: props.open
        };
        this.hideTimer = null;
        this.animationFrame = null;
        this.animationFrame2 = null;
    }

    componentDidUpdate(prevProps) {
        const animationsEnabled = WindowManager.getAnimationsEnabled();
        
        if (this.props.open && !prevProps.open) {
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            if (this.animationFrame2) {
                cancelAnimationFrame(this.animationFrame2);
                this.animationFrame2 = null;
            }
            
            if (animationsEnabled) {
                this.setState({isAnimating: true, isOpen: false}, () => {
                    this.animationFrame = requestAnimationFrame(() => {
                        this.animationFrame2 = requestAnimationFrame(() => {
                            this.setState({isOpen: true});
                        });
                    });
                });
            } else {
                this.setState({isAnimating: true, isOpen: true});
            }
        } else if (!this.props.open && prevProps.open) {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            if (this.animationFrame2) {
                cancelAnimationFrame(this.animationFrame2);
                this.animationFrame2 = null;
            }
            
            if (animationsEnabled) {
                this.setState({isOpen: false});
                this.hideTimer = setTimeout(() => {
                    this.setState({isAnimating: false});
                    this.hideTimer = null;
                }, 200);
            } else {
                this.setState({isOpen: false, isAnimating: false});
            }
        }
    }

    componentWillUnmount() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.animationFrame2) {
            cancelAnimationFrame(this.animationFrame2);
            this.animationFrame2 = null;
        }
    }

    render() {
        if (!this.props.open && !this.state.isAnimating) {
            return null;
        }
        return (
            <MenuComponent
                {...this.props}
                isOpen={this.state.isOpen}
            >
                {this.props.children}
            </MenuComponent>
        );
    }
}

Menu.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    open: PropTypes.bool.isRequired
};

export default Menu;
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useState, createContext, useContext, useRef } from 'react';

import {AESettings} from '../../lib/settings.js';
import styles from './menu.css';

export const isMobileMode = () => {
    try {
        return AESettings.get('EnableMobileTouchDrag') === true;
    } catch (e) {
        return false;
    }
};

const MenuContext = createContext({
    expandedIndex: null,
    setExpandedIndex: () => {}
});

let menuItemCounter = 0;

// Recursively clone children so that MenuItem elements receive _menuIndex and
// _expandedIndex even when they are wrapped in MenuSection or React.Fragment.
const renderChildrenWithIndices = (children, expandedIndex, indexCounter) => (
    React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;

        if (child.type === MenuItem) {
            const currentIndex = indexCounter.value++;
            return React.cloneElement(child, {
                _menuIndex: currentIndex,
                _expandedIndex: expandedIndex
            });
        }

        // Recurse into MenuSection / Fragment wrappers
        if (child.type === MenuSection || child.type === React.Fragment) {
            const newChildren = renderChildrenWithIndices(
                child.props.children,
                expandedIndex,
                indexCounter
            );
            return React.cloneElement(child, {children: newChildren});
        }

        return child;
    })
);

const MenuComponent = ({
    className = '',
    children,
    componentRef,
    place = 'right',
    isOpen = false
}) => {
    const mobileMode = isMobileMode();
    const [expandedIndex, setExpandedIndex] = useState(null);
    const menuKeyRef = useRef(++menuItemCounter);

    const handleMenuClick = (e) => {
        const target = e.target;
        const menuItem = target.closest(`.${styles.menuItem}`);
        if (!menuItem) return;

        const menuItems = Array.from(menuItem.parentElement.children);
        const clickedIndex = menuItems.indexOf(menuItem);

        if (clickedIndex === expandedIndex) {
            setExpandedIndex(null);
        } else {
            setExpandedIndex(clickedIndex);
        }
    };

    const indexCounter = {value: 0};
    const renderedChildren = renderChildrenWithIndices(children, expandedIndex, indexCounter);

    return (
        <MenuContext.Provider value={{ expandedIndex, setExpandedIndex, menuKey: menuKeyRef.current }}>
            <ul
                className={classNames(
                    styles.menu,
                    className,
                    {
                        [styles.left]: place === 'left',
                        [styles.right]: place === 'right',
                        [styles.mobileModeMenu]: mobileMode,
                        [styles.menuOpen]: isOpen
                    }
                )}
                ref={componentRef}
                onClick={mobileMode ? handleMenuClick : undefined}
            >
                {renderedChildren}
            </ul>
        </MenuContext.Provider>
    );
};

MenuComponent.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    componentRef: PropTypes.func,
    place: PropTypes.oneOf(['left', 'right']),
    isOpen: PropTypes.bool
};

const Submenu = ({children, className, place, ...props}) => (
    <div
        className={classNames(
            styles.submenu,
            className,
            {
                [styles.left]: place === 'left',
                [styles.right]: place === 'right'
            }
        )}
    >
        <MenuComponent
            place={place}
            {...props}
        >
            {children}
        </MenuComponent>
    </div>
);

Submenu.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    place: PropTypes.oneOf(['left', 'right'])
};

const MenuItem = ({
    children,
    className,
    expanded: initialExpanded = false,
    onClick,
    shortcut,
    _menuIndex,
    _expandedIndex
}) => {
    const mobileMode = isMobileMode();
    const {setExpandedIndex} = useContext(MenuContext);

    // Check whether this item has a submenu (expandable) child
    const hasSubmenu = React.Children.toArray(children).some(
        child => React.isValidElement(child) && child.type === Submenu
    );

    const isExpanded = mobileMode && _menuIndex !== undefined
        ? _expandedIndex === _menuIndex
        : initialExpanded;

    const handleClick = (e) => {
        if (mobileMode && _menuIndex !== undefined) {
            if (hasSubmenu) {
                // Toggle submenu expansion via context
                setExpandedIndex(_expandedIndex === _menuIndex ? null : _menuIndex);
            } else {
                // Close any open submenu in this menu
                setExpandedIndex(null);
            }
            if (onClick) {
                onClick(e);
            }
            e.stopPropagation();
            return;
        }
        e.stopPropagation();
        if (onClick) {
            onClick(e);
        }
    };

    const expanded = isExpanded;

    return (
        <li
            className={classNames(
                styles.menuItem,
                styles.hoverable,
                className,
                {[styles.expanded]: expanded},
                {[styles.mobileMode]: mobileMode}
            )}
            onClick={handleClick}
        >
            {children}
            {shortcut && <span className={styles.shortcut}>{shortcut}</span>}
        </li>
    );
};

MenuItem.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    expanded: PropTypes.bool,
    onClick: PropTypes.func,
    shortcut: PropTypes.string,
    _menuIndex: PropTypes.number,
    _expandedIndex: PropTypes.number
};


const addDividerClassToFirstChild = (child, id) => (
    child && React.cloneElement(child, {
        className: classNames(
            child.className,
            {[styles.menuSection]: id === 0}
        ),
        key: id
    })
);

const MenuSection = ({children}) => (
    <React.Fragment>{
        React.Children.map(children, addDividerClassToFirstChild)
    }</React.Fragment>
);

MenuSection.propTypes = {
    children: PropTypes.node
};

export {
    MenuComponent as default,
    MenuItem,
    MenuSection,
    Submenu
};

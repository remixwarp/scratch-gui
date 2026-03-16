import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';
import {MenuItem} from '../menu/menu.jsx';
import {openBilmeModal} from '../../reducers/modals';
import {openCustomThemes, closeSettingsMenu} from '../../reducers/menus';

import {Store} from 'lucide-react';

class BilmeMenu extends React.Component {
    handleClick () {
        this.props.onOpenBilme();
        this.props.onRequestClose();
    }

    render () {
        return (
            <MenuItem
                onClick={() => this.handleClick()}
            >
                <Store size={16} />
                <FormattedMessage
                    defaultMessage="Bilme Marketplace"
                    description="Menu item to open Bilme marketplace"
                    id="bl.menu.bilme"
                />
            </MenuItem>
        );
    }
}

BilmeMenu.propTypes = {
    onOpenBilme: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func.isRequired
};

const mapDispatchToProps = dispatch => ({
    onOpenBilme: () => {
        dispatch(openBilmeModal());
    },
    onRequestClose: () => dispatch(closeSettingsMenu())
});

export default connect(
    null,
    mapDispatchToProps
)(BilmeMenu);
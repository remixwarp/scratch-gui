import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import {closeUnknownPlatformModal} from '../reducers/modals';
import UnknownPlatformModalComponent from '../components/tw-unknown-platform-modal/unknown-platform-modal.jsx';

class TWUnknownPlatformModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClose'
        ]);
        this.state = {
            canClose: true
        };
    }

    handleClose () {
        if (this.state.canClose) {
            // The platform-mismatch callback is supplied by the VM and may be
            // undefined in some code paths (e.g. projects loaded without a
            // continue handler). Guard it so a missing callback can never
            // throw and block the modal from closing.
            if (typeof this.props.callback === 'function') {
                this.props.callback();
            }
            this.props.onClose();
        }
    }

    render () {
        return (
            <UnknownPlatformModalComponent
                onClose={this.handleClose}
                platform={this.props.platform}
                canClose={this.state.canClose}
            />
        );
    }
}

TWUnknownPlatformModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    platform: PropTypes.shape({
        name: PropTypes.string,
        url: PropTypes.string
    }),
    callback: PropTypes.func
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    callback: state.scratchGui.tw.platformMismatchDetails.callback,
    platform: state.scratchGui.tw.platformMismatchDetails.platform
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeUnknownPlatformModal())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(TWUnknownPlatformModal);

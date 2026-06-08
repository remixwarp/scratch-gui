import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';

import CompatibilityModal from '../components/tw-compatibility-modal/compatibility-modal.jsx';
import WindowedModal from './windowed-modal.jsx';
import {closeCompatibilityModal} from '../reducers/modals';

const messages = defineMessages({
    title: {
        defaultMessage: '兼容性转换',
        description: 'Title of compatibility conversion modal',
        id: 'tw.compatibilityModal.title'
    }
});

const mapStateToProps = state => ({
    isOpen: state.scratchGui.modals.compatibilityModal,
    theme: state.scratchGui.theme
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => {
        dispatch(closeCompatibilityModal());
    }
});

class CompatibilityModalContainer extends React.Component {
    constructor (props) {
        super(props);
        this.handleCompatibilitySave = this.handleCompatibilitySave.bind(this);
        this.getCompatibilityIssues = this.getCompatibilityIssues.bind(this);
    }

    handleCompatibilitySave (agentName) {
        if (window.__remixWarpMenuBarInstance) {
            window.__remixWarpMenuBarInstance.handleCompatibilitySave(agentName);
        }
    }

    getCompatibilityIssues (targetPlatform) {
        if (window.__remixWarpMenuBarInstance) {
            return window.__remixWarpMenuBarInstance.getCompatibilityIssues(targetPlatform);
        }
        return [];
    }

    render () {
        const {isOpen, onRequestClose, intl} = this.props;

        return (
            <WindowedModal
                id="compatibilityModal"
                visible={isOpen}
                onRequestClose={onRequestClose}
                contentLabel={intl.formatMessage(messages.title)}
                width={500}
                height={600}
                minWidth={420}
                minHeight={400}
            >
                <CompatibilityModal
                    getCompatibilityIssues={this.getCompatibilityIssues}
                    handleCompatibilitySave={this.handleCompatibilitySave}
                    onRequestClose={onRequestClose}
                />
            </WindowedModal>
        );
    }
}

CompatibilityModalContainer.propTypes = {
    isOpen: PropTypes.bool,
    theme: PropTypes.object,
    onRequestClose: PropTypes.func.isRequired,
    intl: intlShape.isRequired
};

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(CompatibilityModalContainer));
import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {
    closeAlert,
    filterPopupAlerts
} from '../reducers/alerts';

import AlertsComponent from '../components/alerts/alerts.jsx';
import DailyQuote from '../components/quotes/daily-quote.jsx';

const Alerts = ({
    alertsList,
    className,
    onCloseAlert
}) => (
    <AlertsComponent
        alertsList={filterPopupAlerts(alertsList)}
        className={className}
        onCloseAlert={onCloseAlert}
    >
        <DailyQuote alertsList={alertsList} />
    </AlertsComponent>
);

Alerts.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object),
    className: PropTypes.string,
    onCloseAlert: PropTypes.func
};

const mapStateToProps = state => ({
    alertsList: state.scratchGui.alerts.alertsList
});

const mapDispatchToProps = dispatch => ({
    onCloseAlert: index => dispatch(closeAlert(index))
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Alerts);

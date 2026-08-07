import React from 'react';
import {IntlProvider as ReactIntlProvider} from 'react-intl';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import IntlBridge from './tw-use-intl.jsx';

class ConnectedIntlProvider extends React.Component {
    static propTypes = {
        messages: PropTypes.object
    };

    componentDidUpdate(prevProps) {
        if (prevProps.messages !== this.props.messages) {
            console.log('=== ConnectedIntlProvider messages updated ===');
            console.log('messages keys count:', Object.keys(this.props.messages || {}).length);

            const sampleKeys = Object.keys(this.props.messages || {}).filter(k => k.startsWith('gui.menuBar')).slice(0, 3);
            console.log('sample menuBar translations:', sampleKeys.map(k => ({[k]: this.props.messages[k]})));
        }
    }

    render() {
        return (
            <ReactIntlProvider {...this.props}>
                <IntlBridge>
                    {this.props.children}
                </IntlBridge>
            </ReactIntlProvider>
        );
    }
}

const mapStateToProps = state => ({
    key: state.locales.locale,
    locale: state.locales.locale,
    messages: state.locales.messages
});

export default connect(mapStateToProps)(ConnectedIntlProvider);

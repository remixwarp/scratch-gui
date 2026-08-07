import React, {createContext, useContext} from 'react';
import PropTypes from 'prop-types';
import {injectIntl} from 'react-intl';

/*
 * This project uses react-intl 2.9.0, which does not provide a `useIntl()` hook
 * (hooks were added in react-intl 3.8). Existing and new code still wants to
 * consume `intl` from function components, so this module bridges the legacy
 * `intl` context into a modern React context and exposes a `useIntl()` hook.
 *
 * Place <IntlBridge> somewhere inside <IntlProvider> at the application root
 * (see community.jsx / localization-hoc.jsx).
 */

const IntlBridgeContext = createContext(null);

// Reads `intl` from the legacy context (via injectIntl) and provides it through
// the modern context so `useIntl()` can consume it.
const IntlBridge = injectIntl(({intl, children}) => (
    <IntlBridgeContext.Provider value={intl}>{children}</IntlBridgeContext.Provider>
));

IntlBridge.propTypes = {
    intl: PropTypes.object,
    children: PropTypes.node
};

const fallbackIntl = {
    formatMessage: (descriptor, values) => {
        let message = descriptor.defaultMessage || descriptor.id;
        if (values) {
            for (const key of Object.keys(values)) {
                message = message.split(`{${key}}`).join(String(values[key]));
            }
        }
        return message;
    },
    formatDate: value => new Date(value).toLocaleDateString(),
    formatTime: value => new Date(value).toLocaleTimeString(),
    formatNumber: value => Number(value).toLocaleString(),
    formatRelative: value => String(value),
    formatPlural: () => 'other',
    formatHTMLMessage: (descriptor, values) =>
        fallbackIntl.formatMessage(descriptor, values),
    locale: 'en'
};

export const useIntl = () => useContext(IntlBridgeContext) || fallbackIntl;

export default IntlBridge;

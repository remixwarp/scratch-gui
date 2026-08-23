import React from 'react';
import PropTypes from 'prop-types';
import {Provider} from 'react-redux';
import {createStore, combineReducers, compose} from 'redux';
import ConnectedIntlProvider from '../connected-intl-provider.jsx';
import AddonHooks from '../../addons/hooks.js';

import localesReducer, {initLocale, localesInitialState} from '../../reducers/locales.js';

import {setPlayer, setFullScreen} from '../../reducers/mode.js';

import locales from '@remixwarp/scratch-l10n';
import {detectLocale} from '../utils/detect-locale';

// 发布版 @remixwarp/scratch-l10n 可能尚未包含这些自定义语言，在此补充。
const EXTRA_LOCALES = {
    'geng': {name: '梗体中文'}
};
const allLocales = Object.assign({}, locales, EXTRA_LOCALES);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

/*
 * Higher Order Component to provide redux state. If an `intl` prop is provided
 * it will override the internal `intl` redux state
 * @param {React.Component} WrappedComponent - component to provide state for
 * @param {boolean} localesOnly - only provide the locale state, not everything
 *                      required by the GUI. Used to exclude excess state when
                        only rendering modals, not the GUI.
 * @returns {React.Component} component with redux and intl state provided
 */
const AppStateHOC = function (WrappedComponent, localesOnly) {
    class AppStateWrapper extends React.Component {
        constructor (props) {
            super(props);
            let initialState = {};
            let reducers = {};
            let enhancer;

            let initializedLocales = localesInitialState;
            const locale = detectLocale(Object.keys(allLocales));
            if (locale !== 'en') {
                initializedLocales = initLocale(initializedLocales, locale);
            }
            if (localesOnly) {
                // Used for instantiating minimal state for the unsupported
                // browser modal
                reducers = {locales: localesReducer};
                initialState = {locales: initializedLocales};
                enhancer = composeEnhancers();
            } else {
                // You are right, this is gross. But it's necessary to avoid
                // importing unneeded code that will crash unsupported browsers.
                const guiRedux = require('../../reducers/gui.js');
                const guiReducer = guiRedux.default;
                const {
                    guiInitialState,
                    guiMiddleware,
                    initFullScreen,
                    initPlayer,
                    initEmbedded,
                    initTelemetryModal
                } = guiRedux;
                const {ScratchPaintReducer} = require('../tw-scratch-paint.js');

                let initializedGui = guiInitialState;
                if (props.isFullScreen || props.isPlayerOnly) {
                    if (props.isFullScreen) {
                        initializedGui = initFullScreen(initializedGui);
                    }
                    if (props.isPlayerOnly) {
                        initializedGui = initPlayer(initializedGui);
                    }
                } else if (props.showTelemetryModal) {
                    initializedGui = initTelemetryModal(initializedGui);
                }
                if (props.isEmbedded) {
                    initializedGui = initEmbedded(initializedGui);
                }
                reducers = {
                    locales: localesReducer,
                    scratchGui: guiReducer,
                    scratchPaint: ScratchPaintReducer
                };
                initialState = {
                    locales: initializedLocales,
                    scratchGui: initializedGui
                };
                enhancer = composeEnhancers(guiMiddleware);
            }
            const reducer = combineReducers(reducers);
            const reducer2 = (previousState, action) => {
                const nextState = reducer(previousState, action);
                AddonHooks.appStateReducer(action, previousState, nextState);
                return nextState;
            };
            this.store = createStore(
                reducer2,
                initialState,
                enhancer
            );
            window.ReduxStore = this.store;
            AddonHooks.appStateStore = this.store;
        }
        componentDidUpdate (prevProps) {
            if (localesOnly) return;
            if (prevProps.isPlayerOnly !== this.props.isPlayerOnly) {
                this.store.dispatch(setPlayer(this.props.isPlayerOnly));
            }
            if (prevProps.isFullScreen !== this.props.isFullScreen) {
                this.store.dispatch(setFullScreen(this.props.isFullScreen));
            }
        }
        render () {
            const {
                isFullScreen, // eslint-disable-line no-unused-vars
                isPlayerOnly, // eslint-disable-line no-unused-vars
                showTelemetryModal, // eslint-disable-line no-unused-vars
                ...componentProps
            } = this.props;
            return (
                <Provider store={this.store}>
                    <ConnectedIntlProvider>
                        <WrappedComponent
                            {...componentProps}
                        />
                    </ConnectedIntlProvider>
                </Provider>
            );
        }
    }
    AppStateWrapper.propTypes = {
        isFullScreen: PropTypes.bool,
        isPlayerOnly: PropTypes.bool,
        isTelemetryEnabled: PropTypes.bool,
        showTelemetryModal: PropTypes.bool,
        isEmbedded: PropTypes.bool
    };
    return AppStateWrapper;
};

export default AppStateHOC;

import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import classNames from 'classnames';
import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import {STAGE_DISPLAY_SIZES} from '../../lib/constants/layout-constants.js';
import StageHeader from '../../containers/stage-header.jsx';
import Stage from '../../containers/stage.jsx';
import Loader from '../loader/loader.jsx';

import styles from './stage-wrapper.css';

// ---------------------------------------------------------------------------
// FLIP (First, Last, Invert, Play) animation helpers
// ---------------------------------------------------------------------------

/**
 * Capture the element's size and position in the viewport.
 */
const getRect = (el) => {
    const {left, top, width, height} = el.getBoundingClientRect();
    return {left, top, width, height};
};

/**
 * Apply an inverse transform so the element *visually* appears at `fromRect`
 * even though it is already laid out at `toRect`.
 */
const invert = (el, fromRect, toRect) => {
    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top - toRect.top;
    const sx = fromRect.width / toRect.width;
    const sy = fromRect.height / toRect.height;
    el.style.transformOrigin = '0 0';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
};

/**
 * Start the "play" phase: animate transform to identity and opacity to 1.
 * Returns a Promise that resolves when the transition ends.
 */
const play = (el, duration, onDone) => {
    el.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
    el.style.transform = '';
    el.style.opacity = '1';

    const onTransitionEnd = (e) => {
        if (e.target !== el) return;
        el.removeEventListener('transitionend', onTransitionEnd);
        el.style.transition = '';
        el.style.transformOrigin = '';
        if (onDone) onDone();
    };
    el.addEventListener('transitionend', onTransitionEnd);
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StageWrapperComponent = function (props) {
    const {
        isEmbedded,
        isFullScreen,
        isRtl,
        isRendererSupported,
        loading,
        stageContainerWidth,
        stageSize,
        vm
    } = props;

    // Box.componentRef expects a callback, not a ref object.
    const wrapperElRef = useRef(null);
    const handleWrapperRef = useCallback((node) => {
        wrapperElRef.current = node;
    }, []);
    const wasFullScreenRef = useRef(false);
    const flipAnimatingRef = useRef(false);

    // Track whether the full-screen *layout* class is currently applied.
    // During exit we keep it applied until the FLIP animation finishes.
    const [isFullScreenLayout, setIsFullScreenLayout] = useState(false);

    // -----------------------------------------------------------------------
    // FLIP: Enter fullscreen
    //
    // React 16 batches setState asynchronously, so we cannot rely on
    // setIsFullScreenLayout to update the DOM before capturing the "Last"
    // rect.  Instead we add the fullScreen class directly, force a
    // synchronous reflow via getBoundingClientRect(), then invert and play.
    // React state is synced only after the animation completes.
    // -----------------------------------------------------------------------
    const flipEnter = useCallback(() => {
        const el = wrapperElRef.current;
        if (!el || flipAnimatingRef.current) return;
        flipAnimatingRef.current = true;

        // 1. First: capture the editor position.
        const fromRect = getRect(el);

        // 2. Last: add full-screen class directly to the DOM, then force
        //    a synchronous layout so we can read the new size immediately.
        el.classList.add(styles.fullScreen);
        const toRect = getRect(el);

        // 3. Invert: pull the element back to the editor position.
        invert(el, fromRect, toRect);
        el.getBoundingClientRect(); // force paint of the inverted state

        // 4. Play: animate to the full-screen position.
        requestAnimationFrame(() => {
            play(el, 300, () => {
                setIsFullScreenLayout(true);
                flipAnimatingRef.current = false;
            });
        });
    }, []);

    // -----------------------------------------------------------------------
    // FLIP: Exit fullscreen
    // -----------------------------------------------------------------------
    const flipExit = useCallback(() => {
        const el = wrapperElRef.current;
        if (!el || flipAnimatingRef.current) return;
        flipAnimatingRef.current = true;

        // 1. First: capture the full-screen position.
        const fromRect = getRect(el);

        // 2. Last: remove full-screen class directly from the DOM.
        el.classList.remove(styles.fullScreen);
        const toRect = getRect(el);

        // 3. Invert: pull the element back to the full-screen position.
        invert(el, fromRect, toRect);
        el.getBoundingClientRect(); // force paint of the inverted state

        // 4. Play: animate to the editor position.
        requestAnimationFrame(() => {
            play(el, 250, () => {
                setIsFullScreenLayout(false);
                flipAnimatingRef.current = false;
            });
        });
    }, []);

    // -----------------------------------------------------------------------
    // React to fullscreen toggles
    // -----------------------------------------------------------------------
    useLayoutEffect(() => {
        if (isFullScreen && !wasFullScreenRef.current) {
            wasFullScreenRef.current = true;
            flipEnter();
        } else if (!isFullScreen && wasFullScreenRef.current) {
            wasFullScreenRef.current = false;
            flipExit();
        }
    }, [isFullScreen, flipEnter, flipExit]);

    // Handle initial mount: sync layout state without animation.
    useEffect(() => {
        if (isFullScreen && !wasFullScreenRef.current) {
            wasFullScreenRef.current = true;
            setIsFullScreenLayout(true);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Box
            className={classNames(
                styles.stageWrapper,
                {
                    [styles.embedded]: isEmbedded,
                    [styles.fullScreen]: isFullScreenLayout,
                    [styles.loading]: loading,
                    [styles.offsetControls]: !(isEmbedded || isFullScreenLayout)
                }
            )}
            dir={isRtl ? 'rtl' : 'ltr'}
            componentRef={handleWrapperRef}
        >
            <Box className={styles.stageMenuWrapper}>
                <StageHeader
                    isFullScreen={isFullScreen}
                    isEmbedded={isEmbedded}
                    stageContainerWidth={stageContainerWidth}
                    stageSize={stageSize}
                    vm={vm}
                />
            </Box>
            <Box className={styles.stageCanvasWrapper}>
                {
                    isRendererSupported ?
                        <Stage
                            stageContainerWidth={stageContainerWidth}
                            stageSize={stageSize}
                            vm={vm}
                        /> :
                        null
                }
            </Box>
            {loading ? (
                <Loader isFullScreen={isFullScreen} />
            ) : null}
        </Box>
    );
};

StageWrapperComponent.propTypes = {
    isEmbedded: PropTypes.bool,
    isFullScreen: PropTypes.bool,
    isRendererSupported: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool.isRequired,
    loading: PropTypes.bool,
    stageContainerWidth: PropTypes.number,
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default StageWrapperComponent;
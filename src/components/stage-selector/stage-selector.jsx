import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, intlShape, injectIntl, FormattedMessage} from 'react-intl';

import Box from '../box/box.jsx';
import ActionMenu from '../action-menu/action-menu.jsx';
import styles from './stage-selector.css';
import {isRtl} from '@remixwarp/scratch-l10n';

import backdropIcon from '../action-menu/icon--backdrop.svg';
import {Upload, Paintbrush, Sparkles, Search} from 'lucide-react';
import {AESettings} from '../../lib/settings.js';

const messages = defineMessages({
    addBackdropFromLibrary: {
        id: 'gui.spriteSelector.addBackdropFromLibrary',
        description: 'Button to add a stage in the target pane from library',
        defaultMessage: 'Choose a Backdrop'
    },
    addBackdropFromPaint: {
        id: 'gui.stageSelector.addBackdropFromPaint',
        description: 'Button to add a stage in the target pane from paint',
        defaultMessage: 'Paint'
    },
    addBackdropFromSurprise: {
        id: 'gui.stageSelector.addBackdropFromSurprise',
        description: 'Button to add a random stage in the target pane',
        defaultMessage: 'Surprise'
    },
    addBackdropFromFile: {
        id: 'gui.stageSelector.addBackdropFromFile',
        description: 'Button to add a stage in the target pane from file',
        defaultMessage: 'Upload Backdrop'
    }
});

const StageSelector = props => {
    const {
        backdropCount,
        containerRef,
        dragOver,
        fileInputRef,
        intl,
        selected,
        raised,
        receivedBlocks,
        url,
        onBackdropFileUploadClick,
        onBackdropFileUpload,
        onClick,
        onMouseEnter,
        onMouseLeave,
        onNewBackdropClick,
        onSurpriseBackdropClick,
        onEmptyBackdropClick,
        ...componentProps
    } = props;
    const isMobileLayout = AESettings.get('EnableMobileLayout') || false;
    const headerEl = (
        <div className={styles.header}>
            <div className={styles.headerTitle}>
                <FormattedMessage
                    defaultMessage="Stage"
                    description="Label for the stage in the stage selector"
                    id="gui.stageSelector.stage"
                />
            </div>
        </div>
    );
    const backdropImgEl = url ? (
        <img
            className={styles.costumeCanvas}
            src={url}
            draggable={false}
        />
    ) : null;
    const labelEl = (
        <div className={styles.label}>
            <FormattedMessage
                defaultMessage="Backdrops"
                description="Label for the backdrops in the stage selector"
                id="gui.stageSelector.backdrops"
            />
        </div>
    );
    const countEl = <div className={styles.count}>{backdropCount}</div>;
    const actionMenuEl = (
        <ActionMenu
            className={styles.addButton}
            img={backdropIcon}
            moreButtons={[
                {
                    title: intl.formatMessage(messages.addBackdropFromFile),
                    img: Upload,
                    onClick: onBackdropFileUploadClick,
                    fileAccept: '.svg, .png, .bmp, .jpg, .jpeg, .jfif, .webp, .gif',
                    fileChange: onBackdropFileUpload,
                    fileInput: fileInputRef,
                    fileMultiple: true
                }, {
                    title: intl.formatMessage(messages.addBackdropFromSurprise),
                    img: Sparkles,
                    onClick: onSurpriseBackdropClick

                }, {
                    title: intl.formatMessage(messages.addBackdropFromPaint),
                    img: Paintbrush,
                    onClick: onEmptyBackdropClick
                }, {
                    title: intl.formatMessage(messages.addBackdropFromLibrary),
                    img: Search,
                    onClick: onNewBackdropClick
                }
            ]}
            title={intl.formatMessage(messages.addBackdropFromLibrary)}
            tooltipPlace={isRtl(intl.locale) ? 'right' : 'left'}
            onClick={onNewBackdropClick}
        />
    );
    return (
        <Box
            className={classNames(styles.stageSelector, {
                [styles.isSelected]: selected,
                [styles.raised]: raised || dragOver,
                [styles.receivedBlocks]: receivedBlocks
            })}
            componentRef={containerRef}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={isMobileLayout ? {position: 'static'} : {}}
            {...componentProps}
        >
            {headerEl}
            {/* 移动端布局：按钮在前，背景图紧跟其后 */}
            {isMobileLayout ? (
                <>
                    <div className={styles.mobileActionMenu}>
                        {actionMenuEl}
                    </div>
                    {backdropImgEl}
                    {labelEl}
                    {countEl}
                </>
            ) : (
                <>
                    {backdropImgEl}
                    {labelEl}
                    {countEl}
                    {actionMenuEl}
                </>
            )}
        </Box>
    );
};

StageSelector.propTypes = {
    backdropCount: PropTypes.number.isRequired,
    containerRef: PropTypes.func,
    dragOver: PropTypes.bool,
    fileInputRef: PropTypes.func,
    intl: intlShape.isRequired,
    onBackdropFileUpload: PropTypes.func,
    onBackdropFileUploadClick: PropTypes.func,
    onClick: PropTypes.func,
    onEmptyBackdropClick: PropTypes.func,
    onMouseEnter: PropTypes.func,
    onMouseLeave: PropTypes.func,
    onNewBackdropClick: PropTypes.func,
    onSurpriseBackdropClick: PropTypes.func,
    raised: PropTypes.bool.isRequired,
    receivedBlocks: PropTypes.bool.isRequired,
    selected: PropTypes.bool.isRequired,
    url: PropTypes.string
};

export default injectIntl(StageSelector);

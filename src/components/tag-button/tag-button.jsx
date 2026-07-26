import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';

import Button from '../button/button.jsx';

import styles from './tag-button.css';

const TagButtonComponent = ({
    active,
    iconClassName,
    className,
    tag, // eslint-disable-line no-unused-vars
    intlLabel,
    loadStatus,
    ...props
}) => (
    <Button
        className={classNames(
            styles.tagButton,
            className, {
                [styles.active]: active
            }
        )}
        iconClassName={classNames(
            styles.tagButtonIcon,
            iconClassName
        )}
        {...props}
    >
        <span className={styles.tagButtonContent}>
            {typeof intlLabel === 'string' ? intlLabel : (
                <FormattedMessage {...intlLabel} />
            )}
        </span>
        {loadStatus && (
            <span className={classNames(styles.statusDot, {
                [styles.online]: loadStatus === 'online',
                [styles.local]: loadStatus === 'local',
                [styles.error]: loadStatus === 'error'
            })} />
        )}
    </Button>
);

TagButtonComponent.propTypes = {
    ...Button.propTypes,
    active: PropTypes.bool,
    intlLabel: PropTypes.oneOfType([
        PropTypes.shape({
            defaultMessage: PropTypes.string,
            description: PropTypes.string,
            id: PropTypes.string
        }),
        PropTypes.string
    ]).isRequired,
    tag: PropTypes.string.isRequired,
    loadStatus: PropTypes.oneOf(['online', 'local', 'error'])
};

TagButtonComponent.defaultProps = {
    active: false
};

export default TagButtonComponent;

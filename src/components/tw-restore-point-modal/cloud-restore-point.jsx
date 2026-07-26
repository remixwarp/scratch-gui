import React from 'react';
import PropTypes from 'prop-types';
import {FormattedDate, FormattedTime, FormattedRelative} from 'react-intl';
import styles from './restore-point-modal.css';
import {Trash, Link} from 'lucide-react';

const relativeTimeSupported = () => typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat !== 'undefined';

const CloudRestorePoint = props => {
    const createdDate = new Date(props.created * 1000);
    
    const handleClickDelete = e => {
        e.stopPropagation();
        props.onClickDelete(props.id);
    };
    
    const handleClickCopyLink = e => {
        e.stopPropagation();
        props.onClickCopyLink(props.id);
    };
    
    return (
        <div className={styles.cloudRestorePoint}>
            <div className={styles.cloudRestorePointInfo}>
                <div className={styles.cloudRestorePointTitle}>
                    {props.title}
                </div>
                
                <div>
                    {relativeTimeSupported() && (
                        <span>
                            <FormattedRelative value={createdDate} />
                            {' ('}
                        </span>
                    )}
                    <FormattedDate value={createdDate} />
                    {', '}
                    <FormattedTime value={createdDate} />
                    {relativeTimeSupported() && ')'}
                </div>
                
                {props.version && (
                    <div className={styles.cloudRestorePointVersion}>
                        Version: {props.version}
                    </div>
                )}
            </div>
            
            <div className={styles.cloudRestorePointButtons}>
                <button
                    className={styles.cloudRestorePointButton}
                    onClick={handleClickCopyLink}
                    title="Copy download link"
                >
                    <Link size={16} />
                </button>
                
                <button
                    className={styles.cloudRestorePointButton}
                    onClick={handleClickDelete}
                    title="Delete"
                >
                    <Trash size={16} />
                </button>
            </div>
        </div>
    );
};

CloudRestorePoint.propTypes = {
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    created: PropTypes.number.isRequired,
    version: PropTypes.string,
    onClickDelete: PropTypes.func.isRequired,
    onClickCopyLink: PropTypes.func.isRequired
};

export default CloudRestorePoint;
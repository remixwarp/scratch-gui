import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import UpdateLogModalComponent from '../components/update-log/update-log-modal.jsx';
import {
    checkForUpdate,
    shouldShowUpdateLog,
    getCurrentVersion,
    getCurrentDate,
    markVersionAsSeen
} from '../lib/version-manager.js';

const UpdateLogModalContainer = ({ intl }) => {
    const [visible, setVisible] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUpdate = async () => {
            try {
                setIsLoading(true);
                
                const currentVersion = getCurrentVersion();
                
                // 检查是否应该显示更新日志
                if (shouldShowUpdateLog(currentVersion)) {
                    // 获取更新信息
                    const info = await checkForUpdate();
                    
                    if (info && info.hasUpdate) {
                        setUpdateInfo({
                            currentVersion: info.currentVersion,
                            updateDate: info.date || getCurrentDate(),
                            changes: info.changes || []
                        });
                        setVisible(true);
                    }
                }
            } catch (error) {
                console.error('Error checking for updates:', error);
            } finally {
                setIsLoading(false);
            }
        };

        // 延迟检查，确保应用完全加载
        const timer = setTimeout(() => {
            checkUpdate();
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setVisible(false);
        // 标记当前版本为已查看
        markVersionAsSeen();
    };

    // 如果没有更新信息或不应该显示，返回 null
    if (!visible || !updateInfo) {
        return null;
    }

    return (
        <UpdateLogModalComponent
            visible={visible}
            onClose={handleClose}
            currentVersion={updateInfo.currentVersion}
            updateDate={updateInfo.updateDate}
            changes={updateInfo.changes}
        />
    );
};

UpdateLogModalContainer.propTypes = {
    intl: PropTypes.shape({
        formatMessage: PropTypes.func.isRequired
    }).isRequired
};

const mapStateToProps = () => ({});

const mapDispatchToProps = () => ({});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(UpdateLogModalContainer));

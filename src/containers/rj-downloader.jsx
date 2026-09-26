import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import {projectTitleInitialState, setProjectTitle} from '../reducers/project-title';
import downloadBlob from '../lib/utils/download-blob';
import {setProjectUnchanged} from '../reducers/project-changed';
import {showStandardAlert, showAlertWithTimeout} from '../reducers/alerts';
import {getIsShowingProject} from '../reducers/project-state';
import log from '../lib/utils/log';

import {saveProjectAsRJ} from '../lib/rj/serialize.js';
import {getProjectTitleFromFilename} from '../lib/rj/constants.js';

const getProjectFilename = (curTitle, defaultTitle) => {
    let filenameTitle = curTitle;
    if (!filenameTitle || filenameTitle.length === 0) {
        filenameTitle = defaultTitle;
    }
    return `${filenameTitle.substring(0, 100)}.rj`;
};

/**
 * 把当前作品保存为 .rj 作品文件。
 * 用法与 SB3Downloader 类似：
 *
 * <RJDownloader>{(className, saveAsRJ) => (
 *     <MenuItem onClick={saveAsRJ} />
 * )}</RJDownloader>
 */
class RJDownloader extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'saveAsRJ'
        ]);
    }
    startedSaving () {
        this.props.onShowSavingAlert();
    }
    finishedSaving () {
        this.props.onProjectUnchanged();
        this.props.onShowSaveSuccessAlert();
        if (this.props.onSaveFinished) {
            this.props.onSaveFinished();
        }
    }
    async saveAsRJ () {
        if (!this.props.canSaveProject) {
            return;
        }
        this.startedSaving();
        let content;
        try {
            content = await saveProjectAsRJ(this.props.vm, this.props.projectTitle);
        } catch (error) {
            log.error('保存 .rj 失败', error);
            this.props.onShowSaveErrorAlert();
            return;
        }

        try {
            if (this.props.showSaveFilePicker) {
                const handle = await this.props.showSaveFilePicker({
                    suggestedName: this.props.projectFilename,
                    types: [
                        {
                            description: 'RemixWarp RJ Project',
                            accept: {
                                'application/octet-stream': '.rj'
                            }
                        }
                    ],
                    excludeAcceptAllOption: true
                });
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                const title = getProjectTitleFromFilename(handle.name);
                if (title) {
                    this.props.onSetProjectTitle(title);
                }
            } else {
                downloadBlob(this.props.projectFilename, content);
            }
            this.finishedSaving();
        } catch (e) {
            // 用户在文件选择框里点了取消
            if (e && e.name === 'AbortError') {
                return;
            }
            log.error(e);
            this.props.onShowSaveErrorAlert();
        }
    }
    render () {
        return this.props.children(
            this.props.className,
            this.saveAsRJ
        );
    }
}

RJDownloader.propTypes = {
    children: PropTypes.func,
    className: PropTypes.string,
    projectFilename: PropTypes.string,
    projectTitle: PropTypes.string,
    canSaveProject: PropTypes.bool,
    vm: PropTypes.shape({
        saveProjectSb3: PropTypes.func,
        saveProjectSb3DontZip: PropTypes.func
    }),
    onSaveFinished: PropTypes.func,
    onSetProjectTitle: PropTypes.func,
    onShowSavingAlert: PropTypes.func,
    onShowSaveSuccessAlert: PropTypes.func,
    onShowSaveErrorAlert: PropTypes.func,
    onProjectUnchanged: PropTypes.func,
    showSaveFilePicker: PropTypes.func
};

RJDownloader.defaultProps = {
    className: '',
    showSaveFilePicker: typeof showSaveFilePicker === 'function' && !navigator.userAgent.includes('Android') ?
        window.showSaveFilePicker.bind(window) :
        null
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    projectTitle: state.scratchGui.projectTitle,
    canSaveProject: getIsShowingProject(state.scratchGui.projectState.loadingState),
    projectFilename: getProjectFilename(state.scratchGui.projectTitle, projectTitleInitialState)
});

const mapDispatchToProps = dispatch => ({
    onSetProjectTitle: title => dispatch(setProjectTitle(title)),
    onShowSavingAlert: () => showAlertWithTimeout(dispatch, 'saving'),
    onShowSaveSuccessAlert: () => showAlertWithTimeout(dispatch, 'twSaveToDiskSuccess'),
    onShowSaveErrorAlert: () => dispatch(showStandardAlert('savingError')),
    onProjectUnchanged: () => dispatch(setProjectUnchanged())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(RJDownloader);

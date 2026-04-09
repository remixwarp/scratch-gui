import { connect } from 'react-redux';
import PreviewExtComponent from '../components/ae-preview-ext/ae-preview-ext.jsx';
import { closePreviewExt } from '../reducers/modals';

const mapStateToProps = state => ({
    svgList: state.aePreviewExtData.previewExtData
});

const mapDispatchToProps = dispatch => ({
    onClose: () => {
        dispatch(closePreviewExt());
    }
});

const PreviewExt = connect(
    mapStateToProps,
    mapDispatchToProps
)(PreviewExtComponent);

export default PreviewExt;

import PropTypes from 'prop-types';
import React, {useLayoutEffect, useRef, useState} from 'react';
import {connect} from 'react-redux';

import Stage from '../../containers/stage.jsx';
import StageHeader from '../../containers/stage-header.jsx';
import {STAGE_SIZE_MODES} from '../../lib/constants/layout-constants';
import {getStageDimensions} from '../../lib/utils/screen.js';

import styles from './stage-in-window.css';

/**
 * 在编辑器自带的自由窗口中承载舞台（含舞台上方的顶栏）。
 *
 * 关键点：
 * 1. `Stage`（容器 + 组件）会根据 stageSize 与 customStageSize 算出一个
 *    “真实渲染尺寸”（large 模式下会乘以 0.85）。因此这里的包装盒必须使用与之
 *    完全相同的尺寸，再整体等比缩放到窗口内容区；否则就会发生双重缩放，舞台缩在
 *    窗口中间、四周露出窗口底色（也就是“舞台和窗口不贴合”）。
 * 2. 顶栏（`StageHeader`，绿旗/暂停那一栏）与舞台等宽，所以它与舞台放在同一个
 *    缩放容器里一起等比缩放，既不会溢出窗口，比例也和编辑器内一致。
 */
const StageInWindow = ({customStageSize, isRendererSupported, vm}) => {
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const [scale, setScale] = useState(1);

    // 与编辑器内舞台保持一致的渲染尺寸（large 模式 0.85 缩放后）
    const stageDimensions = getStageDimensions(
        STAGE_SIZE_MODES.large, customStageSize, false, null
    );
    // `.stage` 带 1px 边框且 box-sizing: content-box，两侧各多 1px
    const boxWidth = stageDimensions.width + 2;
    const boxHeight = stageDimensions.height + 2;

    useLayoutEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return undefined;
        const update = () => {
            // 注意：必须读 clientWidth/clientHeight（纯布局尺寸），不能读
            // getBoundingClientRect()。因为窗口最大化/还原时，窗口管理器会对
            // 窗口元素施加 CSS transform 动画，getBoundingClientRect 会把祖先的
            // transform 也算进去，返回“视觉上被缩放过”的尺寸，导致 scale 算错、
            // 舞台在最大化时仍是小尺寸、还原时又不跟随。clientWidth/Height 只反映
            // 布局盒，不受祖先 transform 影响。
            const width = container.clientWidth;
            const height = container.clientHeight;
            // offsetWidth/offsetHeight 同样是布局尺寸，不受自身 transform 影响，
            // 因此可以安全地用来测量「顶栏 + 舞台」的整体高度。
            const contentWidth = content.offsetWidth;
            const contentHeight = content.offsetHeight;
            if (width <= 0 || height <= 0 || contentWidth <= 0 || contentHeight <= 0) return;
            const next = Math.min(width / contentWidth, height / contentHeight);
            setScale(next > 0 && Number.isFinite(next) ? next : 1);
        };
        update();
        let observer = null;
        if (typeof ResizeObserver !== 'undefined') {
            // ResizeObserver 基于布局盒触发，不受祖先 transform 影响，
            // 因此最大化/还原的尺寸变化能被正确捕获。
            observer = new ResizeObserver(update);
            observer.observe(container);
            observer.observe(content);
        }
        return () => {
            if (observer) observer.disconnect();
        };
    }, [boxWidth, boxHeight]);

    return (
        <div
            ref={containerRef}
            className={styles.container}
        >
            <div
                ref={contentRef}
                className={styles.content}
                style={{
                    width: boxWidth,
                    transform: `scale(${scale})`
                }}
            >
                <div className={styles.headerHost}>
                    <StageHeader
                        stageContainerWidth={null}
                        stageSize={STAGE_SIZE_MODES.large}
                        vm={vm}
                    />
                </div>
                <div
                    className={styles.stageHost}
                    style={{width: boxWidth, height: boxHeight}}
                >
                    <Stage
                        isRendererSupported={isRendererSupported}
                        stageContainerWidth={null}
                        stageSize={STAGE_SIZE_MODES.large}
                        vm={vm}
                    />
                </div>
            </div>
        </div>
    );
};

StageInWindow.propTypes = {
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    isRendererSupported: PropTypes.bool,
    vm: PropTypes.object
};

const mapStateToProps = state => ({
    customStageSize: state.scratchGui.customStageSize
});

export default connect(mapStateToProps)(StageInWindow);

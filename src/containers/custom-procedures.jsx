import bindAll from 'lodash.bindall';
import defaultsDeep from 'lodash.defaultsdeep';
import PropTypes from 'prop-types';
import React from 'react';
import CustomProceduresComponent from '../components/custom-procedures/custom-procedures.jsx';
import LazyScratchBlocks from '../lib/tw-lazy-scratch-blocks';
import {connect} from 'react-redux';
import {showAlertWithTimeout} from '../reducers/alerts';

class CustomProcedures extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleAddLabel',
            'handleAddBoolean',
            'handleAddTextNumber',
            'handleToggleWarp',
            'handleColorChange',
            'handleCancel',
            'handleOk',
            'setBlocks',
            'collectProcedureText',
            'guardBlocked',
            'resetProcedureText',
            'alertPercent'
        ]);
        this.state = {
            rtlOffset: 0,
            warp: false,
            color: '#FF6680', // Default "more" category color
            hasPercent: false // 自定义积木名称/参数中是否包含非法字符 '%'
        };
    }
    componentWillUnmount () {
        if (this.workspace) {
            this.workspace.dispose();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
    setBlocks (blocksRef) {
        if (!blocksRef) return;

        if (this.workspace) return;

        this.blocks = blocksRef;
        const workspaceConfig = defaultsDeep({},
            CustomProcedures.defaultOptions,
            this.props.options,
            {rtl: this.props.isRtl}
        );

        const ScratchBlocks = LazyScratchBlocks.get();
        // @todo This is a hack to make there be no toolbox.
        const oldDefaultToolbox = ScratchBlocks.Blocks.defaultToolbox;
        ScratchBlocks.Blocks.defaultToolbox = null;
        this.workspace = ScratchBlocks.inject(this.blocks, workspaceConfig);
        ScratchBlocks.Blocks.defaultToolbox = oldDefaultToolbox;

        // Create the procedure declaration block for editing the mutation.
        this.mutationRoot = this.workspace.newBlock('procedures_declaration');
        // Make the declaration immovable, undeletable and have no context menu
        this.mutationRoot.setMovable(false);
        this.mutationRoot.setDeletable(false);
        this.mutationRoot.contextMenu = false;

        this.workspace.addChangeListener(() => {
            if (!this.workspace || !this.mutationRoot || !this.mutationRoot.workspace) return;
            this.mutationRoot.onChangeFn();

            // 实时检测名称/参数中是否包含非法字符 '%'
            const text = this.collectProcedureText();
            const hasPercent = typeof text === 'string' && text.indexOf('%') !== -1;
            if (hasPercent !== this.state.hasPercent) {
                this.setState({hasPercent});
            }
            // Keep the block centered on the workspace
            const metrics = this.workspace.getMetrics();
            const {x, y} = this.mutationRoot.getRelativeToSurfaceXY();
            const dy = (metrics.viewHeight / 2) - (this.mutationRoot.height / 2) - y;
            let dx;
            if (this.props.isRtl) {
                // // TODO: https://github.com/LLK/scratch-gui/issues/2838
                // This is temporary until we can figure out what's going on width
                // block positioning on the workspace for RTL.
                // Workspace is always origin top-left, with x increasing to the right
                // Calculate initial starting offset and save it, every other move
                // has to take the original offset into account.
                // Calculate a new left postion based on new width
                // Convert current x position into LTR (mirror) x position (uses original offset)
                // Use the difference between ltrX and mirrorX as the amount to move
                const ltrX = ((metrics.viewWidth / 2) - (this.mutationRoot.width / 2) + 25);
                const mirrorX = x - ((x - this.state.rtlOffset) * 2);
                if (mirrorX === ltrX) {
                    return;
                }
                dx = mirrorX - ltrX;
                const midPoint = metrics.viewWidth / 2;
                if (x === 0) {
                    // if it's the first time positioning, it should always move right
                    if (this.mutationRoot.width < midPoint) {
                        dx = ltrX;
                    } else if (this.mutationRoot.width < metrics.viewWidth) {
                        dx = midPoint - ((metrics.viewWidth - this.mutationRoot.width) / 2);
                    } else {
                        dx = midPoint + (this.mutationRoot.width - metrics.viewWidth);
                    }
                    this.mutationRoot.moveBy(dx, dy);
                    this.setState({rtlOffset: this.mutationRoot.getRelativeToSurfaceXY().x});
                    return;
                }
                if (this.mutationRoot.width > metrics.viewWidth) {
                    dx = dx + this.mutationRoot.width - metrics.viewWidth;
                }
            } else {
                dx = (metrics.viewWidth / 2) - (this.mutationRoot.width / 2) - x;
                // If the procedure declaration is wider than the view width,
                // keep the right-hand side of the procedure in view.
                if (this.mutationRoot.width > metrics.viewWidth) {
                    dx = metrics.viewWidth - this.mutationRoot.width - x;
                }
            }
            this.mutationRoot.moveBy(dx, dy);
        });
        this.mutationRoot.domToMutation(this.props.mutator);
        this.mutationRoot.initSvg();
        this.mutationRoot.render();
        
        // Set warp state if the method exists
        if (typeof this.mutationRoot.getWarp === 'function') {
            this.setState({warp: this.mutationRoot.getWarp()});
        }
        
        // Load custom color from mutation if available
        let customColor = null;
        if (this.props.mutator && this.props.mutator.hasAttribute('customcolor')) {
            customColor = this.props.mutator.getAttribute('customcolor');
        } else if (this.props.mutator && this.props.mutator.hasAttribute('customColor')) {
            customColor = this.props.mutator.getAttribute('customColor');
        }
        
        if (customColor) {
            this.setState({color: customColor});
            if (typeof this.mutationRoot.setCustomColor === 'function') {
                this.mutationRoot.setCustomColor(customColor);
            }
        }
        
        // Allow the initial events to run to position this block, then focus.
        setTimeout(() => {
            this.mutationRoot.focusLastEditor_();
        });

        // 初始检测（编辑已有积木时名称可能已含 '%'）
        const initialText = this.collectProcedureText();
        this.setState({
            hasPercent: typeof initialText === 'string' && initialText.indexOf('%') !== -1
        });
        
        // Add resize observer to handle workspace resizing
        if (window.ResizeObserver && this.blocks) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.workspace && this.workspace.svgBlockCanvas_) {
                    // Force Blockly to recalculate its size and metrics
                    this.workspace.resize();
                    
                    // Update the workspace's scrollable area and content bounds
                    this.workspace.resizeContents();
                    
                    // Force a complete metrics update
                    setTimeout(() => {
                        if (this.workspace && this.mutationRoot) {
                            // Update scroll boundaries to allow movement in expanded area
                            if (this.workspace.scrollbar) {
                                this.workspace.scrollbar.resize();
                            }
                            
                            // Re-center the block with updated metrics
                            const metrics = this.workspace.getMetrics();
                            const {x, y} = this.mutationRoot.getRelativeToSurfaceXY();
                            const dy = (metrics.viewHeight / 2) - (this.mutationRoot.height / 2) - y;
                            const dx = (metrics.viewWidth / 2) - (this.mutationRoot.width / 2) - x;
                            
                            // Only move if significantly off-center
                            if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
                                this.mutationRoot.moveBy(dx, dy);
                            }
                            
                            // Force workspace to recognize new content bounds
                            this.workspace.setResizesEnabled(true);
                            this.workspace.resizeContents();
                        }
                    }, 100);
                }
            });
            this.resizeObserver.observe(this.blocks);
        }
    }
    handleCancel () {
        if (this.guardBlocked()) {
            this.onPercentBlocked();
            return;
        }
        this.props.onRequestClose();
    }
    handleOk () {
        if (this.guardBlocked()) {
            this.onPercentBlocked();
            return;
        }
        const newMutation = this.mutationRoot ? this.mutationRoot.mutationToDom(true) : null;
        // Include the custom color in the mutation data
        if (newMutation && this.state.color !== '#FF6680') {
            newMutation.setAttribute('customColor', this.state.color);
        }
        this.props.onRequestClose(newMutation);
    }
    handleAddLabel () {
        if (this.guardBlocked()) {
            this.onPercentBlocked();
            return;
        }
        if (this.mutationRoot) {
            this.mutationRoot.addLabelExternal();
        }
    }
    handleAddBoolean () {
        if (this.guardBlocked()) {
            this.onPercentBlocked();
            return;
        }
        if (this.mutationRoot) {
            this.mutationRoot.addBooleanExternal();
        }
    }
    handleAddTextNumber () {
        if (this.guardBlocked()) {
            this.onPercentBlocked();
            return;
        }
        if (this.mutationRoot) {
            this.mutationRoot.addStringNumberExternal();
        }
    }
    handleToggleWarp () {
        if (this.guardBlocked()) {
            this.onPercentBlocked();
            return;
        }
        if (this.mutationRoot &&
            typeof this.mutationRoot.getWarp === 'function' &&
            typeof this.mutationRoot.setWarp === 'function') {
            const newWarp = !this.mutationRoot.getWarp();
            this.mutationRoot.setWarp(newWarp);
            this.setState({warp: newWarp});
        }
    }
    handleColorChange (event) {
        if (this.guardBlocked()) {
            this.onPercentBlocked();
            return;
        }
        const newColor = event.target.value;
        this.setState({color: newColor});
        // Apply color to the block immediately for preview
        if (this.mutationRoot && typeof this.mutationRoot.setCustomColor === 'function') {
            this.mutationRoot.setCustomColor(newColor);
        }
    }

    // 收集自定义积木名称与所有参数/标签文本，用于检测非法字符 '%'
    collectProcedureText () {
        if (!this.mutationRoot) return '';
        let text = '';
        const collect = block => {
            if (!block.inputList) return;
            block.inputList.forEach(input => {
                (input.fieldRow || []).forEach(field => {
                    if (field && typeof field.getText === 'function') {
                        text += ' ' + (field.getText() || '');
                    }
                });
            });
        };
        collect(this.mutationRoot);
        return text;
    }

    // 实时检测：名称/参数/标签文本中是否包含非法字符 '%'
    guardBlocked () {
        const text = this.collectProcedureText();
        return typeof text === 'string' && text.indexOf('%') !== -1;
    }

    // 检测到百分号时的统一处理：弹窗提示 + 清空文字 + 更新状态（窗口不关闭）
    onPercentBlocked () {
        this.alertPercent();
        this.resetProcedureText();
        this.setState({hasPercent: false});
    }

    // 清空自制积木名称与所有参数/标签文本，去除其中的 '%'
    resetProcedureText () {
        if (!this.mutationRoot || !this.mutationRoot.inputList) return;
        this.mutationRoot.inputList.forEach(input => {
            (input.fieldRow || []).forEach(field => {
                if (field && typeof field.setValue === 'function') {
                    try {
                        field.setValue('');
                    } catch (e) {
                        // 某些只读字段（如标签）无法赋值，忽略即可
                    }
                }
            });
        });
    }

    alertPercent () {
        if (this.props.dispatch) {
            showAlertWithTimeout(this.props.dispatch, 'twCustomBlockPercent');
        }
    }
    render () {
        return (
            <CustomProceduresComponent
                componentRef={this.setBlocks}
                warp={this.state.warp}
                color={this.state.color}
                onAddBoolean={this.handleAddBoolean}
                onAddLabel={this.handleAddLabel}
                onAddTextNumber={this.handleAddTextNumber}
                onCancel={this.handleCancel}
                onColorChange={this.handleColorChange}
                onOk={this.handleOk}
                onToggleWarp={this.handleToggleWarp}
            />
        );
    }
}

CustomProcedures.propTypes = {
    isRtl: PropTypes.bool,
    mutator: PropTypes.instanceOf(Element),
    onRequestClose: PropTypes.func.isRequired,
    options: PropTypes.shape({
        media: PropTypes.string,
        zoom: PropTypes.shape({
            controls: PropTypes.bool,
            wheel: PropTypes.bool,
            startScale: PropTypes.number
        }),
        comments: PropTypes.bool,
        collapse: PropTypes.bool
    })
};

CustomProcedures.defaultOptions = {
    zoom: {
        controls: false,
        wheel: false,
        startScale: 0.9
    },
    comments: false,
    collapse: false,
    scrollbars: true,
    move: {
        scrollbars: true,
        drag: true,
        wheel: true
    }
};

CustomProcedures.defaultProps = {
    options: CustomProcedures.defaultOptions
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl,
    mutator: state.scratchGui.customProcedures.mutator
});

export default connect(
    mapStateToProps
)(CustomProcedures);

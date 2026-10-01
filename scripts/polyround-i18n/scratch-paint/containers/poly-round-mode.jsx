import paper from '@turbowarp/paper';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../lib/modes';
import {MIXED} from '../helper/style-path';
import ColorStyleProptype from '../lib/color-style-proptype';
import GradientTypes from '../lib/gradient-types';

import {changeFillColor, clearFillGradient, DEFAULT_COLOR} from '../reducers/fill-style';
import {changeStrokeColor, clearStrokeGradient} from '../reducers/stroke-style';
import {changeMode} from '../reducers/modes';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';
import {setCursor} from '../reducers/cursor';
// Translatable strings for the floating 顶点坐标 (vertex-coordinates) window.
// They are consumed imperatively inside DOM-building code that bypasses React
// render (we construct <div>s via document.createElement so the window can live
// outside React's tree inside WindowManager). So we can't use <FormattedMessage>
// JSX — instead we call intl.formatMessage() on these descriptors directly.
const VM = defineMessages({
    windowTitle: {
        id: 'paint.polyRoundMode.vertexWindow.title',
        defaultMessage: '顶点坐标',
        description: 'Title bar of the floating vertex-editing window'
    },
    headerCount: {
        id: 'paint.polyRoundMode.vertexWindow.headerCount',
        defaultMessage: '顶点坐标 ({count})',
        description: 'Header of the vertex list showing current vertex count',
    },
    hint: {
        id: 'paint.polyRoundMode.vertexWindow.hint',
        defaultMessage: '在画板上点一下添加顶点，双向实时同步',
        description: 'Short hint under the vertex-window header'
    },
    empty: {
        id: 'paint.polyRoundMode.vertexWindow.empty',
        defaultMessage: '在画板上点一下开始选点',
        description: 'Placeholder shown when no vertices have been placed yet'
    },
    btnMid: {
        id: 'paint.polyRoundMode.vertexWindow.btnMid',
        defaultMessage: '添加中间点',
        description: 'Label of the "add midpoint" button in the vertex window'
    },
    btnMidTip: {
        id: 'paint.polyRoundMode.vertexWindow.btnMidTip',
        defaultMessage: '在最后两点之间插入一个顶点',
        description: 'Tooltip for the "add midpoint" button'
    },
    btnClear: {
        id: 'paint.polyRoundMode.vertexWindow.btnClear',
        defaultMessage: '清空',
        description: 'Label of the "clear all vertices" button'
    },
    btnClearTip: {
        id: 'paint.polyRoundMode.vertexWindow.btnClearTip',
        defaultMessage: '删除所有顶点',
        description: 'Tooltip for the "clear all vertices" button'
    },
    btnFinish: {
        id: 'paint.polyRoundMode.vertexWindow.btnFinish',
        defaultMessage: '完成',
        description: 'Label of the "finish / commit shape" button in the vertex window'
    },
    btnFinishTip: {
        id: 'paint.polyRoundMode.vertexWindow.btnFinishTip',
        defaultMessage: '提交为图形',
        description: 'Tooltip for the "finish shape" button'
    },
    deleteVertexTip: {
        id: 'paint.polyRoundMode.vertexWindow.deleteVertexTip',
        defaultMessage: '删除此顶点',
        description: 'Tooltip for the per-row vertex delete (✕) button'
    }
});

import {
    changePolyRoundRadius,
    changePolyRoundCornerStyle,
    changePolyRoundLimitRadius,
    changePolyRoundShowItems,
    setPolyRoundPoints,
    editPolyRoundPoint,
    removePolyRoundPoint,
    triggerPolyRoundAction,
    consumePolyRoundAction
} from '../reducers/poly-round-mode';

import {clearSelection, getSelectedLeafItems} from '../helper/selection';
import PolyRoundTool from '../helper/tools/poly-round-tool';
import PolyRoundModeComponent from '../components/poly-round-mode/poly-round-mode.jsx';

// Optional: GUI-side window-manager. It only exists when scratch-paint is
// built inside the GUI, whose webpack config aliases '@remixwarp/window-manager'
// to the addon window system (src/addons/window-system/window-manager.js).
// Vanilla scratch-paint builds don't have that alias, so degrade to the inline
// toolbar UI instead of crashing the module.
let WindowManager = null;
try {
    // eslint-disable-next-line global-require
    const windowManagerModule = require('@remixwarp/window-manager');
    WindowManager = (windowManagerModule && windowManagerModule.default) || windowManagerModule || null;
} catch (_e) {
    WindowManager = null;
}


class PolyRoundMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'validateColorState',
            'handlePointsChanged',
            'openVertexWindow',
            'closeVertexWindow',
            'buildVertexWindow',
            'syncVertexWindow',
            'createVertexRow',
            'onVertexInput',
            'onVertexDelete',
            'onVertexAddMid',
            'onVertexClear',
            'onVertexFinish'
        ]);
    }
    componentDidMount () {
        if (this.props.isPolyRoundModeActive) this.activateTool(this.props);
    }

    /**
     * The vertex list lives in a floating window so the tool's toolbar row keeps
     * its normal height (a taller toolbar shrinks the canvas container, which
     * used to leave paper.js' view size stale and stretch the canvas bitmap).
     * The window is two-way synced with the canvas: clicking on the board adds
     * rows, editing a row moves the marker, dragging a marker updates the row.
     */
    openVertexWindow () {
        if (!WindowManager) return;
        if (this._vertexWindow) {
            this.syncVertexWindow();
            this._vertexWindow.show();
            return;
        }
        this._vertexWindow = WindowManager.createWindow({
            id: 'poly-round-vertices',
            title: this.props.intl.formatMessage(VM.windowTitle),
            width: 300,
            height: 380,
            minWidth: 240,
            minHeight: 200,
            onClose: () => {
                this._vertexWindow = null;
                this._vertexRoot = null;
                this._vertexRows = null;
                this._vertexCount = null;
                this._vertexEmpty = null;
                this._vertexFooter = null;
            }
        });
        this.buildVertexWindow();
        // createWindow() builds the window hidden — it has to be shown explicitly.
        this._vertexWindow.show();
    }

    closeVertexWindow () {
        if (this._vertexWindow) {
            try { this._vertexWindow.close(); } catch (_e) { /* already gone */ }
            this._vertexWindow = null;
        }
        this._vertexRoot = null;
        this._vertexRows = null;
        this._vertexCount = null;
        this._vertexEmpty = null;
        this._vertexFooter = null;
    }

    buildVertexWindow () {
        if (!this._vertexWindow) return;
        const doc = document;

        const root = doc.createElement('div');
        root.className = 'poly-round-vertex-window';
        root.style.cssText = [
            'display:flex', 'flex-direction:column', 'height:100%', 'box-sizing:border-box',
            'padding:10px', 'gap:8px',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
            'font-size:13px', 'color:var(--text-primary,#333)'
        ].join(';');

        const head = doc.createElement('div');
        head.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;';
        const count = doc.createElement('span');
        count.style.cssText = 'font-weight:600;';
        const hint = doc.createElement('span');
        hint.style.cssText = 'font-size:11px;color:var(--looks-secondary,#888);';
        hint.textContent = this.props.intl.formatMessage(VM.hint);
        head.appendChild(count);
        head.appendChild(hint);

        const empty = doc.createElement('div');
        empty.style.cssText = 'flex:1 1 auto;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--looks-secondary,#888);font-size:12px;';
        empty.textContent = this.props.intl.formatMessage(VM.empty);

        const rows = doc.createElement('div');
        rows.style.cssText = 'flex:1 1 auto;overflow:auto;display:flex;flex-direction:column;gap:4px;';

        const footer = doc.createElement('div');
        footer.style.cssText = 'display:flex;gap:6px;flex:0 0 auto;';

        const button = (action, label, title) => {
            const btn = doc.createElement('button');
            btn.type = 'button';
            btn.dataset.action = action;
            btn.textContent = label;
            btn.title = title;
            btn.style.cssText = 'flex:1 1 0;padding:4px 6px;border:1px solid var(--ui-black-transparent,#ccc);border-radius:4px;background:var(--ui-modal-background,#fff);color:inherit;font:inherit;cursor:pointer;';
            return btn;
        };
        footer.appendChild(button('mid', this.props.intl.formatMessage(VM.btnMid), this.props.intl.formatMessage(VM.btnMidTip)));
        footer.appendChild(button('clear', this.props.intl.formatMessage(VM.btnClear), this.props.intl.formatMessage(VM.btnClearTip)));
        footer.appendChild(button('finish', this.props.intl.formatMessage(VM.btnFinish), this.props.intl.formatMessage(VM.btnFinishTip)));

        // Delegated handlers — rows are recycled, so per-row listeners would leak.
        rows.addEventListener('input', ev => {
            const target = ev.target;
            if (!target || target.tagName !== 'INPUT' || !target.dataset.axis) return;
            const idx = parseInt(target.parentNode.dataset.row, 10);
            const value = parseFloat(target.value);
            if (isNaN(idx) || !isFinite(value)) return;
            this.onVertexInput(idx, target.dataset.axis, value);
        });
        rows.addEventListener('click', ev => {
            const target = ev.target;
            if (!target || target.dataset.role !== 'delete') return;
            const idx = parseInt(target.parentNode.dataset.row, 10);
            if (isNaN(idx)) return;
            this.onVertexDelete(idx);
        });
        footer.addEventListener('click', ev => {
            const action = ev.target && ev.target.dataset && ev.target.dataset.action;
            if (action === 'mid') this.onVertexAddMid();
            else if (action === 'clear') this.onVertexClear();
            else if (action === 'finish') this.onVertexFinish();
        });

        root.appendChild(head);
        root.appendChild(empty);
        root.appendChild(rows);
        root.appendChild(footer);

        this._vertexRoot = root;
        this._vertexCount = count;
        this._vertexEmpty = empty;
        this._vertexRows = rows;
        this._vertexFooter = footer;

        try {
            this._vertexWindow.setContent(root);
        } catch (_e) {
            // Fallback for window implementations without setContent()
            const c = this._vertexWindow.contentElement;
            while (c && c.firstChild) c.removeChild(c.firstChild);
            if (c) c.appendChild(root);
        }
        this.syncVertexWindow();
    }

    createVertexRow (index) {
        const doc = document;
        const row = doc.createElement('div');
        row.dataset.row = String(index);
        row.style.cssText = 'display:flex;align-items:center;gap:6px;';

        const indexEl = doc.createElement('span');
        indexEl.dataset.role = 'index';
        indexEl.style.cssText = 'min-width:18px;text-align:center;color:var(--looks-secondary,#888);font-variant-numeric:tabular-nums;';

        const inputCss = 'flex:1 1 0;min-width:0;box-sizing:border-box;padding:3px 5px;' +
            'border:1px solid var(--ui-black-transparent,#ccc);border-radius:4px;' +
            'background:var(--ui-modal-background,#fff);color:inherit;font:inherit;';
        const xInput = doc.createElement('input');
        xInput.type = 'number';
        xInput.step = 'any';
        xInput.dataset.axis = 'x';
        xInput.title = 'X';
        xInput.style.cssText = inputCss;
        const yInput = doc.createElement('input');
        yInput.type = 'number';
        yInput.step = 'any';
        yInput.dataset.axis = 'y';
        yInput.title = 'Y';
        yInput.style.cssText = inputCss;

        const del = doc.createElement('button');
        del.type = 'button';
        del.dataset.role = 'delete';
        del.textContent = '✕';
        del.title = this.props.intl.formatMessage(VM.deleteVertexTip);
        del.style.cssText = 'flex:0 0 auto;padding:2px 6px;border:none;background:transparent;color:#e64a4a;cursor:pointer;font:inherit;';

        row.appendChild(indexEl);
        row.appendChild(xInput);
        row.appendChild(yInput);
        row.appendChild(del);
        return row;
    }

    /**
     * Reconcile the window with the current point list *in place*: rows are
     * created / removed as needed and values are written only into inputs the
     * user isn't currently editing, so typing a coordinate never gets its focus
     * (or caret) stolen by the round trip through Redux.
     */
    syncVertexWindow () {
        if (!this._vertexWindow || !this._vertexRows) return;
        const pts = this.props.rawPoints || [];
        const rows = this._vertexRows;

        while (rows.children.length > pts.length) {
            rows.removeChild(rows.lastChild);
        }
        for (let i = rows.children.length; i < pts.length; i++) {
            rows.appendChild(this.createVertexRow(i));
        }
        for (let i = 0; i < pts.length; i++) {
            const row = rows.children[i];
            row.dataset.row = String(i);
            const indexEl = row.querySelector('[data-role="index"]');
            if (indexEl) indexEl.textContent = String(i + 1);
            const xInput = row.querySelector('input[data-axis="x"]');
            const yInput = row.querySelector('input[data-axis="y"]');
            if (xInput && document.activeElement !== xInput) xInput.value = pts[i].x.toFixed(1);
            if (yInput && document.activeElement !== yInput) yInput.value = pts[i].y.toFixed(1);
        }

        if (this._vertexCount) this._vertexCount.textContent = this.props.intl.formatMessage(VM.headerCount, {count: pts.length});
        if (this._vertexEmpty) this._vertexEmpty.style.display = pts.length ? 'none' : 'flex';
        rows.style.display = pts.length ? 'flex' : 'none';
        if (this._vertexFooter) {
            const setEnabled = (action, enabled) => {
                const btn = this._vertexFooter.querySelector(`[data-action="${action}"]`);
                if (!btn) return;
                btn.disabled = !enabled;
                btn.style.opacity = enabled ? '1' : '0.5';
                btn.style.cursor = enabled ? 'pointer' : 'default';
            };
            setEnabled('mid', pts.length > 0);
            setEnabled('clear', pts.length > 0);
            setEnabled('finish', pts.length >= 2);
        }
    }

    onVertexInput (index, axis, value) {
        if (!isFinite(value)) return;
        const pts = (this.props.rawPoints || []).slice();
        if (index < 0 || index >= pts.length) return;
        const point = Object.assign({}, pts[index]);
        point[axis] = value;
        this.props.onSetPoint(index, point.x, point.y);
    }

    onVertexDelete (index) {
        this.props.onRemovePoint(index);
    }

    onVertexAddMid () {
        if (!this.tool) return;
        const pts = this.tool.getRawPoints();
        if (!pts.length) return;
        const last = pts[pts.length - 1];
        const prev = pts.length > 1 ? pts[pts.length - 2] : last;
        this.tool.addPointAt(prev.add(last).divide(2));
    }

    onVertexClear () {
        if (this.tool) this.tool.clear();
    }

    onVertexFinish () {
        if (this.tool) this.tool.finish();
    }
    componentWillReceiveProps (nextProps) {
        if (this.tool) {
            if (nextProps.colorState !== this.props.colorState) {
                this.tool.setColorState(nextProps.colorState);
            }
            if (nextProps.selectedItems !== this.props.selectedItems) {
                this.tool.onSelectionChanged(nextProps.selectedItems);
            }
            if (nextProps.radius !== this.props.radius) {
                this.tool.setRadius(nextProps.radius);
            }
            if (nextProps.cornerStyle !== this.props.cornerStyle) {
                this.tool.setCornerStyle(nextProps.cornerStyle);
            }
            if (nextProps.limitRadius !== this.props.limitRadius) {
                this.tool.setLimitRadius(nextProps.limitRadius);
            }
            if (nextProps.showItems !== this.props.showItems) {
                this.tool.setShowItems(nextProps.showItems);
            }

            // Keep the floating vertex editor in sync with the canvas (a vertex
            // added/dragged on the board shows up here; editing here moves the
            // marker). Values are reconciled in place so the input the user is
            // typing in keeps its focus and caret.
            this.syncVertexWindow();

            // Imperative actions from toolbar (finish / setPoint / removePoint / clear / addMid)
            const pending = nextProps.pendingAction;
            const prevPending = this.props.pendingAction;
            const tokenChanged = !!(pending && (!prevPending || pending.token !== prevPending.token));
            if (pending && tokenChanged) {
                const name = pending.name;
                if (name === 'clear') this.tool.clear();
                else if (name === 'addMid') {
                    const pts = this.tool.getRawPoints();
                    if (pts.length) {
                        const last = pts[pts.length - 1];
                        const prev = pts[pts.length - 2] || last;
                        this.tool.addPointAt(prev.add(last).divide(2));
                    }
                } else if (name === 'finish') this.tool.finish();
                else if (name === 'setPoint') this.tool.setPointAt(pending.index, pending.x, pending.y);
                else if (name === 'removePoint') this.tool.removePoint(pending.index);
                if (typeof this.props.onConsumeAction === 'function') {
                    this.props.onConsumeAction();
                }
            }
        }

        if (nextProps.isPolyRoundModeActive && !this.props.isPolyRoundModeActive) {
            this.activateTool();
        } else if (!nextProps.isPolyRoundModeActive && this.props.isPolyRoundModeActive) {
            this.deactivateTool();
        }
    }
    componentWillUnmount () {
        if (this.tool) this.deactivateTool();
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);
        this.validateColorState();

        // Reset Redux's raw-points slice *before* building the tool / window.
        // Otherwise an old residual value (from a previous session where the
        // tool was used and then closed without a clean deactivateTool, e.g.
        // after a hot reload or mode swap) leaks into the fresh window the
        // moment openVertexWindow → buildVertexWindow → syncVertexWindow reads
        // this.props.rawPoints. That stale list then sits "ahead" of the empty
        // tool._rawPoints so the user's very first click shows "no first point
        // in the window until I click / drag once more to trigger another sync".
        this.props.onSyncPoints([]);

        if (typeof this.props.radius !== 'number') this.props.onChangeRadius(20);

        this.tool = new PolyRoundTool(
            this.props.setSelectedItems,
            this.props.clearSelectedItems,
            this.props.setCursor,
            this.props.onUpdateImage,
            this.handlePointsChanged
        );
        this.tool.setRadius(this.props.radius);
        this.tool.setCornerStyle(this.props.cornerStyle);
        this.tool.setLimitRadius(this.props.limitRadius);
        this.tool.setShowItems(this.props.showItems);
        this.tool.setColorState(this.props.colorState);
        this.tool.activate();
        // GUI window manager (if present) — show a floating vertex editor
        this.openVertexWindow();
    }
    validateColorState () {
        const {strokeWidth} = this.props.colorState;
        const fillColor1 = this.props.colorState.fillColor.primary;
        let fillColor2 = this.props.colorState.fillColor.secondary;
        let fillGradient = this.props.colorState.fillColor.gradientType;
        const strokeColor1 = this.props.colorState.strokeColor.primary;
        let strokeColor2 = this.props.colorState.strokeColor.secondary;
        let strokeGradient = this.props.colorState.strokeColor.gradientType;

        if (fillColor2 === MIXED) {
            this.props.clearFillGradient(); fillColor2 = null;
            fillGradient = GradientTypes.SOLID;
        }
        if (strokeColor2 === MIXED) {
            this.props.clearStrokeGradient(); strokeColor2 = null;
            strokeGradient = GradientTypes.SOLID;
        }

        const fillColorMissing = fillColor1 === MIXED ||
            (fillGradient === GradientTypes.SOLID && fillColor1 === null) ||
            (fillGradient !== GradientTypes.SOLID && fillColor1 === null && fillColor2 === null);
        const strokeColorMissing = strokeColor1 === MIXED ||
            strokeWidth === null || strokeWidth === 0 ||
            (strokeGradient === GradientTypes.SOLID && strokeColor1 === null) ||
            (strokeGradient !== GradientTypes.SOLID && strokeColor1 === null && strokeColor2 === null);

        if (fillColorMissing && strokeColorMissing) {
            this.props.onChangeFillColor(DEFAULT_COLOR);
            this.props.clearFillGradient();
            this.props.onChangeStrokeColor(null);
            this.props.clearStrokeGradient();
        } else if (fillColorMissing && !strokeColorMissing) {
            this.props.onChangeFillColor(null);
            this.props.clearFillGradient();
        } else if (!fillColorMissing && strokeColorMissing) {
            this.props.onChangeStrokeColor(null);
            this.props.clearStrokeGradient();
        }
    }
    deactivateTool () {
        if (this.tool) {
            this.tool.deactivateTool();
            this.tool.remove();
            this.tool = null;
        }
        this.props.onSyncPoints([]);
        this.closeVertexWindow();
    }

    handlePointsChanged (pts) { this.props.onSyncPoints(pts); }

    render () {
        return (
            <PolyRoundModeComponent
                isSelected={this.props.isPolyRoundModeActive}
                onMouseDown={this.props.handleMouseDown}
            />
        );
    }
}

PolyRoundMode.propTypes = {
    clearFillGradient: PropTypes.func.isRequired,
    clearStrokeGradient: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    colorState: PropTypes.shape({
        fillColor: ColorStyleProptype,
        strokeColor: ColorStyleProptype,
        strokeWidth: PropTypes.number
    }).isRequired,
    cornerStyle: PropTypes.string.isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    isPolyRoundModeActive: PropTypes.bool.isRequired,
    limitRadius: PropTypes.bool.isRequired,
    onChangeFillColor: PropTypes.func.isRequired,
    onChangeStrokeColor: PropTypes.func.isRequired,
    onChangeRadius: PropTypes.func.isRequired,
    onChangeCornerStyle: PropTypes.func.isRequired,
    onChangeLimitRadius: PropTypes.func.isRequired,
    onChangeShowItems: PropTypes.func.isRequired,
    onSyncPoints: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired,
    pendingAction: PropTypes.shape({token: PropTypes.number, name: PropTypes.string}),
    rawPoints: PropTypes.arrayOf(PropTypes.shape({x: PropTypes.number, y: PropTypes.number})),
    onConsumeAction: PropTypes.func,
    onSetPoint: PropTypes.func.isRequired,
    onRemovePoint: PropTypes.func.isRequired,
    radius: PropTypes.number.isRequired,
    showItems: PropTypes.string.isRequired,
    selectedItems: PropTypes.arrayOf(PropTypes.instanceOf(paper.Item)),
    setCursor: PropTypes.func.isRequired,
    setSelectedItems: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    colorState: state.scratchPaint.color,
    isPolyRoundModeActive: state.scratchPaint.mode === Modes.POLY_ROUND,
    selectedItems: state.scratchPaint.selectedItems,
    radius: state.scratchPaint.polyRoundMode.radius,
    cornerStyle: state.scratchPaint.polyRoundMode.cornerStyle,
    limitRadius: state.scratchPaint.polyRoundMode.limitRadius,
    showItems: state.scratchPaint.polyRoundMode.showItems,
    rawPoints: state.scratchPaint.polyRoundMode.rawPoints,
    pendingAction: state.scratchPaint.polyRoundMode.pendingAction
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => { dispatch(clearSelectedItems()); },
    clearFillGradient: () => { dispatch(clearFillGradient()); },
    clearStrokeGradient: () => { dispatch(clearStrokeGradient()); },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems(), false /* bitmapMode */));
    },
    setCursor: cursorString => { dispatch(setCursor(cursorString)); },
    handleMouseDown: () => { dispatch(changeMode(Modes.POLY_ROUND)); },
    onChangeFillColor: fillColor => { dispatch(changeFillColor(fillColor)); },
    onChangeStrokeColor: strokeColor => { dispatch(changeStrokeColor(strokeColor)); },
    onChangeRadius: radius => { dispatch(changePolyRoundRadius(radius)); },
    onChangeCornerStyle: cornerStyle => { dispatch(changePolyRoundCornerStyle(cornerStyle)); },
    onChangeLimitRadius: limitRadius => { dispatch(changePolyRoundLimitRadius(limitRadius)); },
    onChangeShowItems: showItems => { dispatch(changePolyRoundShowItems(showItems)); },
    onSyncPoints: points => { dispatch(setPolyRoundPoints(points)); },
    onConsumeAction: () => { dispatch(consumePolyRoundAction()); },
    onSetPoint: (index, x, y) => {
        dispatch(editPolyRoundPoint(index, x, y));
        dispatch(triggerPolyRoundAction('setPoint', {index, x, y}));
    },
    onRemovePoint: index => {
        dispatch(removePolyRoundPoint(index));
        dispatch(triggerPolyRoundAction('removePoint', {index}));
    }
});

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(PolyRoundMode));

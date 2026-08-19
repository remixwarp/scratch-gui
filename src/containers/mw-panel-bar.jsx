import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {defineMessages, injectIntl} from 'react-intl';
import VM from 'scratch-vm';
import MWPanelBar from '../components/mw-panels/mw-panel-bar.jsx';
import {inspectProject} from '../lib/mw-project-inspector.js';
import {setProblemCount} from '../lib/mw-panels-store.js';

const MAX_CONSOLE_ENTRIES = 500;
const MAX_PROBLEMS = 200;

const messages = defineMessages({
    unknownTarget: {
        id: 'mw.panel.unknownTarget',
        defaultMessage: '未知角色',
        description: 'Fallback name when a sprite target has no name'
    },
    say: {
        id: 'mw.panel.say',
        defaultMessage: '{target} 说：{text}',
        description: 'Console entry when a sprite says something'
    },
    think: {
        id: 'mw.panel.think',
        defaultMessage: '{target} 想：{text}',
        description: 'Console entry when a sprite thinks something'
    },
    question: {
        id: 'mw.panel.question',
        defaultMessage: '提问：{question}',
        description: 'Console entry when the project asks a question'
    },
    answer: {
        id: 'mw.panel.answer',
        defaultMessage: '回答：{answer}',
        description: 'Console entry when the project answers a question'
    },
    runStart: {
        id: 'mw.panel.runStart',
        defaultMessage: '▶ 运行开始（点击绿旗）',
        description: 'Console entry when the project starts running'
    },
    runStop: {
        id: 'mw.panel.runStop',
        defaultMessage: '■ 运行停止',
        description: 'Console entry when the project stops running'
    },
    broadcast: {
        id: 'mw.panel.broadcast',
        defaultMessage: '广播：{message}',
        description: 'Console entry when a broadcast is sent'
    },
    compileError: {
        id: 'mw.panel.compileError',
        defaultMessage: '{target} · 编译错误',
        description: 'Source label for compile errors'
    },
    runtimeError: {
        id: 'mw.panel.runtimeError',
        defaultMessage: '{target} · 运行时错误',
        description: 'Source label for runtime errors'
    }
});

class MWPanelBarContainer extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            consoleEntries: [],
            problems: []
        };
        this.idCounter = 0;
        this.handleVmCompileError = this.handleVmCompileError.bind(this);
        this.handleVmStopForTarget = this.handleVmStopForTarget.bind(this);
        this.handleProjectLoaded = this.handleProjectLoaded.bind(this);
        this.handleVmSay = this.handleVmSay.bind(this);
        this.handleVmQuestion = this.handleVmQuestion.bind(this);
        this.handleVmAnswer = this.handleVmAnswer.bind(this);
        this.handleVmRunStart = this.handleVmRunStart.bind(this);
        this.handleVmRunStop = this.handleVmRunStop.bind(this);
        this.handleClearConsole = this.handleClearConsole.bind(this);
        this.handleJumpToProblem = this.handleJumpToProblem.bind(this);
        this.handleTargetsUpdate = this.handleTargetsUpdate.bind(this);
        this.inspectTimer = null;
        this.patchStartHats = this.patchStartHats.bind(this);
    }
    componentDidMount () {
        const vm = this.props.vm;
        if (vm && vm.runtime) {
            vm.runtime.on('COMPILE_ERROR', this.handleVmCompileError);
            vm.runtime.on('STOP_FOR_TARGET', this.handleVmStopForTarget);
            vm.runtime.on('PROJECT_LOADED', this.handleProjectLoaded);
            vm.runtime.on('SAY', this.handleVmSay);
            vm.runtime.on('QUESTION', this.handleVmQuestion);
            vm.runtime.on('ANSWER', this.handleVmAnswer);
            vm.runtime.on('PROJECT_RUN_START', this.handleVmRunStart);
            vm.runtime.on('PROJECT_RUN_STOP', this.handleVmRunStop);
            vm.runtime.on('TARGETS_UPDATE', this.handleTargetsUpdate);
            this.patchStartHats();
        }
    }
    componentWillUnmount () {
        if (this.inspectTimer) {
            clearTimeout(this.inspectTimer);
        }
        const vm = this.props.vm;
        if (vm && vm.runtime) {
            vm.runtime.off('COMPILE_ERROR', this.handleVmCompileError);
            vm.runtime.off('STOP_FOR_TARGET', this.handleVmStopForTarget);
            vm.runtime.off('PROJECT_LOADED', this.handleProjectLoaded);
            vm.runtime.off('SAY', this.handleVmSay);
            vm.runtime.off('QUESTION', this.handleVmQuestion);
            vm.runtime.off('ANSWER', this.handleVmAnswer);
            vm.runtime.off('PROJECT_RUN_START', this.handleVmRunStart);
            vm.runtime.off('PROJECT_RUN_STOP', this.handleVmRunStop);
            vm.runtime.off('TARGETS_UPDATE', this.handleTargetsUpdate);
            if (this.originalStartHats && vm.runtime.startHats === this.patchedStartHats) {
                vm.runtime.startHats = this.originalStartHats;
            }
        }
    }
    nextId () {
        this.idCounter += 1;
        return `mw-${Date.now()}-${this.idCounter}`;
    }
    addConsoleEntry (method, args) {
        const entry = {
            id: this.nextId(),
            method: method === 'debug' ? 'debug' : method,
            args,
            time: Date.now()
        };
        this.setState(prev => ({
            consoleEntries: [...prev.consoleEntries, entry].slice(-MAX_CONSOLE_ENTRIES)
        }));
    }
    addProblem (problem) {
        const entry = Object.assign({
            id: this.nextId(),
            severity: 'error',
            message: '',
            source: null,
            targetId: null,
            blockId: null,
            time: Date.now()
        }, problem);
        this.setState(prev => {
            const problems = [...prev.problems, entry].slice(-MAX_PROBLEMS);
            setProblemCount(problems.length);
            return {problems};
        });
    }
    // 面向用户的控制台：捕获作品运行时行为（说/想、广播、提问、运行开始/停止）
    targetName (target) {
        return target && target.getName ? target.getName() : this.props.intl.formatMessage(messages.unknownTarget);
    }
    handleVmSay (target, type, message) {
        const text = typeof message === 'string' ? message : String(message);
        this.addConsoleEntry(type === 'think' ? 'info' : 'log', [
            this.props.intl.formatMessage(
                type === 'think' ? messages.think : messages.say,
                {target: this.targetName(target), text}
            )
        ]);
    }
    handleVmQuestion (question) {
        if (!question) return;
        this.addConsoleEntry('info', [this.props.intl.formatMessage(messages.question, {question})]);
    }
    handleVmAnswer (answer) {
        this.addConsoleEntry('log', [this.props.intl.formatMessage(messages.answer, {answer})]);
    }
    handleVmRunStart () {
        this.addConsoleEntry('info', [this.props.intl.formatMessage(messages.runStart)]);
    }
    handleVmRunStop () {
        this.addConsoleEntry('info', [this.props.intl.formatMessage(messages.runStop)]);
    }
    handleVmCompileError (target, error) {
        const message = error && error.message ? error.message : String(error);
        this.addProblem({
            severity: 'error',
            message,
            source: this.props.intl.formatMessage(messages.compileError, {target: this.targetName(target)}),
            targetId: target && target.id ? target.id : null
        });
        this.addConsoleEntry('error', [message]);
    }
    handleVmStopForTarget (target, threadException) {
        if (!threadException) {
            return;
        }
        const message = threadException.message ?
            threadException.message : String(threadException);
        this.addProblem({
            severity: 'error',
            message,
            source: this.props.intl.formatMessage(messages.runtimeError, {target: this.targetName(target)}),
            targetId: target && target.id ? target.id : null
        });
        this.addConsoleEntry('error', [message]);
    }
    handleProjectLoaded () {
        this.setState({problems: []}, () => {
            this.runInspection();
        });
    }
    // 作品结构发生变化（新增/修改积木）时延迟重新检测
    handleTargetsUpdate () {
        if (this.inspectTimer) {
            clearTimeout(this.inspectTimer);
        }
        this.inspectTimer = setTimeout(() => this.runInspection(), 800);
    }
    runInspection () {
        const vm = this.props.vm;
        if (!vm) return;
        const problems = inspectProject(vm, this.props.intl.formatMessage).map(p => Object.assign({
            id: this.nextId(),
            time: Date.now()
        }, p));
        this.setState({problems}, () => {
            setProblemCount(problems.length);
        });
    }
    // 拦截广播：通过 startHats('event_whenbroadcastreceived', ...) 检测广播发送
    patchStartHats () {
        const runtime = this.props.vm.runtime;
        if (!runtime || typeof runtime.startHats !== 'function') return;
        this.originalStartHats = runtime.startHats.bind(runtime);
        this.patchedStartHats = (requestedHatOpcode, optMatchFields, optTarget) => {
            if (requestedHatOpcode === 'event_whenbroadcastreceived' &&
                optMatchFields && optMatchFields.BROADCAST_OPTION) {
                this.addConsoleEntry('log', [this.props.intl.formatMessage(messages.broadcast, {
                    message: optMatchFields.BROADCAST_OPTION
                })]);
            }
            return this.originalStartHats(requestedHatOpcode, optMatchFields, optTarget);
        };
        runtime.startHats = this.patchedStartHats;
    }
    handleClearConsole () {
        this.setState({consoleEntries: []});
    }
    handleJumpToProblem (problem) {
        if (this.props.vm && problem.targetId) {
            try {
                this.props.vm.setEditingTarget(problem.targetId);
            } catch (e) {
                console.warn('Failed to jump to target:', e);
            }
        }
        if (problem.blockId) {
            window.dispatchEvent(new CustomEvent('rw-focus-block', {
                detail: {blockId: problem.blockId}
            }));
        }
    }
    render () {
        return (
            <MWPanelBar
                visible={this.props.visible}
                active={this.props.active}
                height={this.props.height}
                vscodeLayout={this.props.vscodeLayout}
                problems={this.state.problems}
                consoleEntries={this.state.consoleEntries}
                onSelect={this.props.onSelect}
                onClose={this.props.onClose}
                onResize={this.props.onResize}
                onClearConsole={this.handleClearConsole}
                onJumpToProblem={this.handleJumpToProblem}
            />
        );
    }
}

MWPanelBarContainer.propTypes = {
    vm: PropTypes.instanceOf(VM),
    visible: PropTypes.bool.isRequired,
    active: PropTypes.string.isRequired,
    height: PropTypes.number.isRequired,
    intl: PropTypes.object,
    vscodeLayout: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onResize: PropTypes.func.isRequired
};

MWPanelBarContainer.defaultProps = {
    intl: null
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

export default injectIntl(connect(mapStateToProps)(MWPanelBarContainer));

import React from 'react';
import PropTypes from 'prop-types';
import styles from './ai-panel.css';
import Button from '../button/button.jsx';

const API_ENDPOINT = 'https://api.siliconflow.cn/v1/chat/completions';
const API_KEY = 'sk-ytpuhxsxxuhmlnqelpvviiuvbvodluirsfsiyrbsvesosbti';
const MODEL = 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B';

class AIPanel extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {
            input: '',
            messages: [],
            loading: false,
            error: null
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSend = this.handleSend.bind(this);
        this.messagesEnd = React.createRef();
        this.inputRef = React.createRef();
    }

    scrollToBottom () {
        if (this.messagesEnd && this.messagesEnd.current) {
            this.messagesEnd.current.scrollIntoView({behavior: 'smooth'});
        }
    }

    componentDidMount () {
        if (this.inputRef && this.inputRef.current) {
            this.inputRef.current.focus();
        }
    }

    handleChange (e) {
        this.setState({input: e.target.value});
    }

    handleSend () {
        const {input} = this.state;
        if (!input) return;
        const userMessage = {role: 'user', content: input};
        this.setState(state => ({
            messages: [...state.messages, {from: 'user', text: input}],
            input: '',
            loading: true,
            error: null
        }), this.scrollToBottom);

        fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {role: 'system', content: '你是一个有用的助手'},
                    userMessage
                ]
            })
        })
        .then(response => response.json())
        .then(data => {
            // Try to extract assistant reply from common response shapes
            let reply = null;
            if (data && data.choices && data.choices[0]) {
                const choice = data.choices[0];
                if (choice.message && choice.message.content) reply = choice.message.content;
                else if (choice.text) reply = choice.text;
            }
            if (!reply) reply = JSON.stringify(data);
            this.setState(state => ({
                messages: [...state.messages, {from: 'assistant', text: reply}],
                loading: false
            }), this.scrollToBottom);
        })
        .catch(err => {
            this.setState({loading: false, error: String(err)});
        });
    }

    render () {
        return (
            <div className={styles.container}>
                {this.props.showHeader !== false && (
                    <div className={styles.header}>AI 辅助编程</div>
                )}
                <div className={styles.messagesWrapper}>
                    <div className={styles.messages}>
                        {this.state.messages.map((m, i) => (
                            <div key={i} className={m.from === 'user' ? styles.userMsg : styles.assistantMsg}>
                                {m.text}
                            </div>
                        ))}
                        <div ref={this.messagesEnd} />
                    </div>
                </div>
+                {this.state.loading && <div className={styles.loading}>思考中...</div>}
                {this.state.error && <div className={styles.error}>{this.state.error}</div>}
                <div className={styles.controls}>
                    <textarea ref={this.inputRef} className={styles.input} value={this.state.input} onChange={this.handleChange} placeholder="聊聊你的代码..." />
                    <div className={styles.actions}>
                        <Button onClick={this.handleSend} className={styles.sendButton} disabled={this.state.loading}>
                            发送
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
}

AIPanel.propTypes = {
    onRequestClose: PropTypes.func
};

AIPanel.defaultProps = {
    showHeader: true
};

AIPanel.propTypes = Object.assign({}, AIPanel.propTypes, {
    showHeader: PropTypes.bool
});

export default AIPanel;

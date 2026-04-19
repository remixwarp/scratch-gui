import React from 'react';
import PropTypes from 'prop-types';
import styles from './markdown-renderer.css';

/**
 * 简单的 Markdown 渲染组件
 * 支持：标题、加粗、斜体、删除线、代码、引用、列表、表格、链接、图片、数学公式
 */
class MarkdownRenderer extends React.PureComponent {
    constructor(props) {
        super(props);
        this.codeRefs = [];
    }

    // 复制代码到剪贴板
    copyCode = (code, index) => {
        navigator.clipboard.writeText(code).then(() => {
            const btn = this.codeRefs[index];
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = '已复制!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }
        });
    };

    // 下载代码文件
    downloadCode = (code, language) => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `code.${language || 'txt'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 简单的 Markdown 解析器
    parseMarkdown = (text) => {
        if (!text) return '';

        // 先提取代码块和数学公式，避免被其他规则处理
        const codeBlocks = [];
        const mathBlocks = [];
        let processedText = text;

        // 提取代码块（支持标准 Markdown 格式）
        processedText = processedText.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const index = codeBlocks.length;
            codeBlocks.push({ language: lang || 'text', code: code.trim() });
            return `__CODE_BLOCK_${index}__`;
        });

        // 提取 AI 生成的代码块（使用 ###CODE### 标记）
        processedText = processedText.replace(/###CODE###\n?([\s\S]*?)###END###/g, (match, code) => {
            const index = codeBlocks.length;
            codeBlocks.push({ language: 'python', code: code.trim() });
            return `__CODE_BLOCK_${index}__`;
        });

        // 处理 CODEBLOCK0, CODEBLOCK1 等占位符（AI 有时仍会输出这种格式）
        // 直接移除这些占位符，因为它们通常是AI生成的错误格式
        processedText = processedText.replace(/CODEBLOCK\s*(\d+)/gi, '');
        
        // 同时处理可能的CODEBLOCK标记变体
        processedText = processedText.replace(/CODE_BLOCK_\d+/gi, '');
        processedText = processedText.replace(/__CODE_BLOCK_\d+__/gi, '');
        processedText = processedText.replace(/__CODE_BLOCK_QUOTE_\d+__/gi, '');
        
        // 清理可能的空行
        processedText = processedText.replace(/\n{3,}/g, '\n\n');
        processedText = processedText.replace(/^\n+|\n+$/g, '');

        // 提取块级数学公式
        processedText = processedText.replace(/\$\$\n?([\s\S]*?)\$\$/g, (match, formula) => {
            const index = mathBlocks.length;
            mathBlocks.push(formula.trim());
            return `__MATH_BLOCK_${index}__`;
        });

        let html = processedText;

        // 转义 HTML 特殊字符（除了占位符）
        html = html.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');

        // 行内代码 (支持双反引号)
        html = html.replace(/``([^`]+)``/g, '<code class="inline-code">$1</code>');
        html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        // 分割线
        html = html.replace(/---(.+?)---/g, '<hr class="markdown-hr" />');

        // 支持 HTML 标签（简单处理）
        html = html.replace(/&lt;(span|div)([^&]+)&gt;([^&]+)&lt;\/\1&gt;/g, '<$1$2>$3</$1>');

        // 支持注释
        html = html.replace(/\/\/(.+)/g, '<span class="comment">// $1</span>');

        // 标题
        html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
        html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // 加粗斜体
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
        html = html.replace(/_(.+?)_/g, '<em>$1</em>');

        // 删除线
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

        // 下划线 (HTML 标签)
        html = html.replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');

        // 引用
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

        // 任务列表
        html = html.replace(/^- \[x\] (.+)$/gmi, '<div class="task-list"><input type="checkbox" checked disabled> $1</div>');
        html = html.replace(/^- \[ \] (.+)$/gmi, '<div class="task-list"><input type="checkbox" disabled> $1</div>');

        // 无序列表
        html = html.replace(/^- (.+)$/gm, '<li class="ul-item">$1</li>');
        html = html.replace(/(<li class="ul-item">.+<\/li>\n?)+/g, '<ul>$&</ul>');
        html = html.replace(/<\/ul>\n<ul>/g, '');

        // 有序列表
        html = html.replace(/^\d+\. (.+)$/gm, '<li class="ol-item">$1</li>');
        html = html.replace(/(<li class="ol-item">.+<\/li>\n?)+/g, '<ol>$&</ol>');
        html = html.replace(/<\/ol>\n<ol>/g, '');

        // 表格
        html = html.replace(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
            const headers = header.split('|').map(h => h.trim()).filter(h => h);
            const rowData = rows.trim().split('\n').map(row => {
                return row.split('|').map(c => c.trim()).filter(c => c);
            });
            
            let tableHtml = '<table class="markdown-table"><thead><tr>';
            headers.forEach(h => {
                tableHtml += `<th>${h}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';
            
            rowData.forEach(row => {
                tableHtml += '<tr>';
                row.forEach(cell => {
                    tableHtml += `<td>${cell}</td>`;
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            return tableHtml;
        });

        // 链接
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // 图片
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="markdown-image" />');

        // 水平线
        html = html.replace(/^---$/gm, '<hr class="markdown-hr" />');

        // 行内数学公式
        html = html.replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>');

        // 脚注
        html = html.replace(/\[\^(\d+)\]/g, '<sup class="footnote">[$1]</sup>');

        // 恢复代码块
        codeBlocks.forEach((block, index) => {
            const escapedCode = block.code.replace(/&/g, '&amp;')
                                         .replace(/</g, '&lt;')
                                         .replace(/>/g, '&gt;');
            const codeHtml = `
                <div class="code-block-wrapper">
                    <div class="code-block-header">
                        <span class="code-language">${block.language}</span>
                        <div class="code-actions">
                            <button class="code-action-btn copy-btn" data-index="${index}">复制</button>
                            <button class="code-action-btn download-btn" data-index="${index}">下载</button>
                        </div>
                    </div>
                    <pre class="code-block"><code class="language-${block.language}">${escapedCode}</code></pre>
                </div>
            `;
            html = html.replace(`__CODE_BLOCK_${index}__`, codeHtml);
        });

        // 恢复数学公式块
        mathBlocks.forEach((formula, index) => {
            const mathHtml = `<div class="math-block">${formula}</div>`;
            html = html.replace(`__MATH_BLOCK_${index}__`, mathHtml);
        });

        // 清理可能的空行和多余空格
        html = html.replace(/\n{3,}/g, '\n\n');
        html = html.replace(/^\n+|\n+$/g, '');
        html = html.replace(/\s+$/gm, '');
        html = html.replace(/^\s+/gm, '');

        // 段落 (将剩余文本包装在段落中)
        const lines = html.split('\n');
        let result = [];
        let currentPara = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                if (currentPara.length > 0) {
                    result.push('<p>' + currentPara.join(' ') + '</p>');
                    currentPara = [];
                }
            } else if (
                trimmed.startsWith('<h') ||
                trimmed.startsWith('<ul') ||
                trimmed.startsWith('<ol') ||
                trimmed.startsWith('<li') ||
                trimmed.startsWith('<blockquote') ||
                trimmed.startsWith('<table') ||
                trimmed.startsWith('<div class="code-block') ||
                trimmed.startsWith('<div class="task-list') ||
                trimmed.startsWith('<hr') ||
                trimmed.startsWith('<img') ||
                trimmed.startsWith('<div class="math')
            ) {
                if (currentPara.length > 0) {
                    result.push('<p>' + currentPara.join(' ') + '</p>');
                    currentPara = [];
                }
                result.push(line);
            } else {
                currentPara.push(line);
            }
        });

        if (currentPara.length > 0) {
            result.push('<p>' + currentPara.join(' ') + '</p>');
        }

        return result.join('\n');
    };

    componentDidMount() {
        this.attachEventListeners();
    }

    componentDidUpdate() {
        this.attachEventListeners();
    }

    attachEventListeners = () => {
        // 为复制按钮添加事件监听
        const copyBtns = document.querySelectorAll('.copy-btn');
        copyBtns.forEach((btn, index) => {
            if (!btn.dataset.hasListener) {
                btn.dataset.hasListener = 'true';
                btn.addEventListener('click', () => {
                    const codeBlock = btn.closest('.code-block-wrapper').querySelector('code');
                    const code = codeBlock.textContent;
                    this.copyCode(code, index);
                });
            }
        });

        // 为下载按钮添加事件监听
        const downloadBtns = document.querySelectorAll('.download-btn');
        downloadBtns.forEach((btn) => {
            if (!btn.dataset.hasListener) {
                btn.dataset.hasListener = 'true';
                btn.addEventListener('click', () => {
                    const wrapper = btn.closest('.code-block-wrapper');
                    const codeBlock = wrapper.querySelector('code');
                    const code = codeBlock.textContent;
                    const lang = wrapper.querySelector('.code-language').textContent;
                    this.downloadCode(code, lang);
                });
            }
        });
    };

    render() {
        const { content, className } = this.props;
        const html = this.parseMarkdown(content);

        return (
            <div
                className={`${styles.markdownRenderer} ${className || ''}`}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    }
}

MarkdownRenderer.propTypes = {
    content: PropTypes.string.isRequired,
    className: PropTypes.string
};

MarkdownRenderer.defaultProps = {
    className: ''
};

export default MarkdownRenderer;

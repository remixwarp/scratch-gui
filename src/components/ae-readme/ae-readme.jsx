import { defineMessages, FormattedMessage, intlShape, injectIntl, useRef } from 'react-intl';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from '../../containers/modal.jsx';
import PropTypes from 'prop-types';
import Box from '../box/box.jsx';
import styles from './ae-readme.css';
import classNames from 'classnames';
import {AESettings} from '../../lib/settings.js';

const settings = new AESettings();

var data = null;

export function loadData(loadData) {
    data = loadData;
}

const markdownComponents = {
    h1: ({children}) => <h1 style={{fontSize: '1.8em', borderBottom: '2px solid #ddd', paddingBottom: '8px'}}>{children}</h1>,
    h2: ({children}) => <h2 style={{fontSize: '1.5em', borderBottom: '1px solid #eee', paddingBottom: '6px'}}>{children}</h2>,
    h3: ({children}) => <h3 style={{fontSize: '1.25em'}}>{children}</h3>,
    p: ({children}) => <p style={{margin: '0.8em 0', lineHeight: '1.6'}}>{children}</p>,
    code: ({inline, children}) => inline ? <code style={{background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px'}}>{children}</code> : <pre style={{background: '#f5f5f5', padding: '12px', borderRadius: '6px', overflow: 'auto'}}><code>{children}</code></pre>,
    pre: ({children}) => <pre style={{background: '#f5f5f5', padding: '12px', borderRadius: '6px', overflow: 'auto'}}>{children}</pre>,
    ul: ({children}) => <ul style={{margin: '0.8em 0', paddingLeft: '24px'}}>{children}</ul>,
    ol: ({children}) => <ol style={{margin: '0.8em 0', paddingLeft: '24px'}}>{children}</ol>,
    li: ({children}) => <li style={{margin: '4px 0'}}>{children}</li>,
    blockquote: ({children}) => <blockquote style={{borderLeft: '4px solid #4c97ff', margin: '0.8em 0', padding: '8px 16px', background: '#f5f9ff'}}>{children}</blockquote>,
    a: ({href, children}) => <a href={href} style={{color: '#4c97ff', textDecoration: 'none'}} target="_blank" rel="noopener noreferrer">{children}</a>,
    strong: ({children}) => <strong style={{fontWeight: 'bold'}}>{children}</strong>,
    em: ({children}) => <em style={{fontStyle: 'italic'}}>{children}</em>,
};

const CustomModalComponent = (props) => {
    try {
        let comments = {};
        if (data != null) { comments = Object.values(data); }
        else { comments = Object.values(props.vm.editingTarget.comments) }
        console.log(comments)
        const readMe = [];
        comments.forEach(comment => {
            if (comment.text.slice(0, 7) == "#README") {
                if (comment.text.slice(8, 9) == "#") {
                    let title = "";
                    const CheckTitle = comment.text.slice(
                        9,
                        comment.text.length
                    )

                    for (let checkTitle_i = 0; checkTitle_i <= CheckTitle.length; checkTitle_i += 1) {
                        if (CheckTitle.charAt(checkTitle_i) == "\n" || CheckTitle.charAt(checkTitle_i) == "\r") break
                        else title = title + CheckTitle.charAt(checkTitle_i)
                    }
                    readMe.push(
                        {
                            text: comment.text.slice(10 + title.length, comment.text.length),
                            title: title
                        }
                    );

                } else {
                    readMe.push(
                        {
                            text: comment.text.slice(8, comment.text.length),
                        }
                    );
                }

            }
        })

        const [nowTab, setTab] = useState(0)
        const [Title, setTitle] = useState(`README${readMe[0].title != undefined ? readMe[0].title.length < 39 ? ":" + readMe[0].title : ":Title is Too Long" : ""}`)
        const handleClose = () => {
            data = null;
            props.onClose();
        };
        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={handleClose}
                contentLabel={Title}
                id="readme"
            >
                <Box>
                    {readMe.length > 1 &&
                        <div className={styles.Modaltab} style={{
                            margin: "0",
                            '--total-tabs': readMe.length,
                            '--active-index': nowTab
                        }}>
                            {readMe.length > 1 && readMe.map((item, index) => (
                                <button key={index} className={
                                    nowTab == index ?
                                        styles.tabButtonEnable : styles.tabButtonUnable
                                } style={{
                                    display: "inline-block",
                                    width: `calc(100% / ${readMe.length})`,
                                    height: '100%'

                                }}
                                    onClick={() => {
                                        setTitle(`README${readMe[index].title != undefined ? readMe[index].title.length < 39 ? ":" + readMe[index].title : ":Title is Too Long" : ""}`); setTab(index)
                                    }}

                                >
                                    {readMe[index].title == undefined ? index + 1 : readMe[index].title}
                                </button>
                            ))}
                        </div>
                    }
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {readMe[nowTab].text}
                        </ReactMarkdown>
                    </div>
                </Box>

            </Modal >
        )
    } catch (e) {
        console.log(e)
        return (<>Hey!There is an ERROR from README Modal. Check the Error in the console and report it on Github</>)
    }
};

CustomModalComponent.propTypes = {
    intl: intlShape,
    vm: PropTypes.shape({
        editingTarget: PropTypes.shape({
            comments: PropTypes.object
        })
    }).isRequired,
    onClose: PropTypes.func,
};


export default injectIntl(CustomModalComponent);
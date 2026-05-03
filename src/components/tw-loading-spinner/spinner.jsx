import React, {useState, useEffect} from 'react';
import styles from './spinner.css';

const Loading = () => {
    const [displayText, setDisplayText] = useState('');

    useEffect(() => {
        const fullText = '["ˍ"*/';
        let index = 0;
        
        const typeInterval = setInterval(() => {
            if (index <= fullText.length) {
                setDisplayText(fullText.substring(0, index));
                index++;
            } else {
                clearInterval(typeInterval);
                setTimeout(() => {
                    setDisplayText('');
                    index = 0;
                    const restartInterval = setInterval(() => {
                        if (index <= fullText.length) {
                            setDisplayText(fullText.substring(0, index));
                            index++;
                        } else {
                            clearInterval(restartInterval);
                            setTimeout(() => {
                                setDisplayText('');
                            }, 1000);
                        }
                    }, 150);
                }, 1000);
            }
        }, 150);

        return () => clearInterval(typeInterval);
    }, []);

    return (
        <div className={styles.container}>
            <span 
                className={styles.typingText} 
                style={{
                    color: '#ffffff',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    minHeight: '36px',
                    letterSpacing: '2px',
                    zIndex: 9999,
                    position: 'relative',
                    display: 'block'
                }}
            >
                {displayText}
            </span>
            <div className={styles.spinner} />
        </div>
    );
};

export default Loading;
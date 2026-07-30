import React, {useEffect, useState, useRef, useCallback} from 'react';
import PropTypes from 'prop-types';

import styles from './daily-quote.css';
import SettingsStore from '../../addons/settings-store-singleton';

const LOCAL_KEY_INTERVAL = 'dailyQuoteInterval';
const LOCAL_KEY_QUOTES = 'dailyQuoteCustomQuotes';
const LOCAL_KEY_MODE = 'dailyQuoteDisplayMode';
const LOCAL_KEY_POSITION = 'dailyQuotePosition';

const defaultInterval = 5; // seconds
const defaultMode = 'sequential'; // 'sequential' or 'random'
const defaultLibrary = 'local'; // 'local' or 'hitokoto'

// Hitokoto sentence categories (from https://developer.hitokoto.cn/sentence/)
const HITOKOTO_CATEGORIES = [
    {key: 'a', label: '动画'},
    {key: 'b', label: '漫画'},
    {key: 'c', label: '游戏'},
    {key: 'd', label: '文学'},
    {key: 'e', label: '原创'},
    {key: 'f', label: '来自网络'},
    {key: 'g', label: '其他'},
    {key: 'h', label: '影视'},
    {key: 'i', label: '诗词'},
    {key: 'k', label: '哲学'},
    {key: 'l', label: '抖机灵'},
];

const HITOKOTO_LABEL_MAP = Object.fromEntries(
    HITOKOTO_CATEGORIES.map(c => [c.key, c.label])
);

const HITOKOTO_API_BASE = 'https://v1.hitokoto.cn/';

const defaultQuotes = [
    "长风破浪会有时，直挂云帆济沧海。",
    "海内存知己，天涯若比邻。",
    "千淘万漉虽辛苦，吹尽狂沙始到金。",
    "路漫漫其修远兮，吾将上下而求索。",
    "天生我材必有用，千金散尽还复来。",
    "会当凌绝顶，一览众山小。",
    "星光不问赶路人，时光不负有心人。",
    "追光的人，终会光芒万丈。",
    "没有比脚更长的路，没有比人更高的山。",
    "志之所趋，无远弗届；穷山距海，不能限也。",
    "博观而约取，厚积而薄发。",
    "道阻且长，行则将至；行而不辍，未来可期。",
    "人生在勤，不索何获。",
    "纸上得来终觉浅，绝知此事要躬行。",
    "山重水复疑无路，柳暗花明又一村。",
    "莫道桑榆晚，为霞尚满天。",
    "少年应有鸿鹄志，当骑骏马踏平川。",
    "追风赶月莫停留，平芜尽处是春山。",
    "纵有疾风起，人生不言弃。",
    "每一个清晨，都是希望的开始。",
    "梦想，是照亮前路的星。",
    "你若决定灿烂，山无遮，海无拦。",
    "虽千万人，吾往矣。",
    "好运藏在努力里，光芒藏在坚持中。",
    "心之所向，素履以往。",
    "不积跬步，无以至千里；不积小流，无以成江海。",
    "与其仰望星空，不如去做摘星的人。",
    "所有看似微小的努力，都在默默塑造未来。",
    "逆水行舟，不进则退。",
    "你若盛开，清风自来。",
    "锲而不舍，金石可镂。",
    "流水不争先，争的是滔滔不绝。",
    "日拱一卒，功不唐捐。",
    "人生如逆旅，我亦是行人。",
    "苔花如米小，也学牡丹开。",
    "天行健，君子以自强不息。",
    "不忘初心，方得始终。",
    "只有非常努力，才能看起来毫不费力。",
    "向前走，相信时间会给你答案。",
    "努力只能及格，拼命才能优秀。",
    "脚步不停，终会抵达想去的远方。",
    "熬过无人问津的日子，才有诗和远方。",
    "心中有火，眼里有光。",
    "乾坤未定，你我皆是黑马。",
    "不辜负时光，不辜负自己。",
    "看似寻常最奇崛，成如容易却艰辛。",
    "生命不止，奋斗不息。",
    "让努力成为一种习惯，而不是一时热血。",
    "今天所有的混乱与芜杂，努力与精进，都将在进步中变得更加清晰。",
    "士不可不弘毅，任重而道远。",
    "宝剑锋从磨砺出，梅花香自苦寒来。",
    "老骥伏枥，志在千里；烈士暮年，壮心不已。",
    "及时当勉励，岁月不待人。",
    "操千曲而后晓声，观千剑而后识器。",
    "非淡泊无以明志，非宁静无以致远。",
    "黄沙百战穿金甲，不破楼兰终不还。",
    "好事尽从难处得，少年无向易中轻。",
    "青春须早为，岂能长少年。",
    "千磨万击还坚劲，任尔东西南北风。",
    "大鹏一日同风起，扶摇直上九万里。",
    "古之立大事者，不惟有超世之才，亦必有坚忍不拔之志。",
    "业精于勤，荒于嬉；行成于思，毁于随。",
    "宣父犹能畏后生，丈夫未可轻年少。",
    "雄关漫道真如铁，而今迈步从头越。",
    "看似寻常最奇崛，成如容易却艰辛。",
    "问渠那得清如许？为有源头活水来。",
    "不经一番寒彻骨，怎得梅花扑鼻香。",
    "读书不觉已春深，一寸光阴一寸金。",
    "沉舟侧畔千帆过，病树前头万木春。",
    "咬定青山不放松，立根原在破岩中。",
    "长风破浪会有时，直挂云帆济沧海。",
    "沧海可填山可移，男儿志气当如斯。",
    "天将降大任于斯人也，必先苦其心志，劳其筋骨。",
    "吾心信其可行，则移山填海之难，终有成功之日。",
    "志不立，天下无可成之事。",
    "丈夫志四海，万里犹比邻。",
    "愿乘长风，破万里浪。",
    "石可破也，而不可夺坚；丹可磨也，而不可夺赤。",
    "凡事以理想为因，实行为果。",
    "冀以尘雾之微补益山海，荧烛末光增辉日月。",
    "苟日新，日日新，又日新。",
    "知行合一，止于至善。",
    "君子藏器于身，待时而动。",
    "日就月将，学有缉熙于光明。",
    "积土而为山，积水而为海。",
    "志当存高远。",
    "以不息为体，以日新为道。",
    "精诚所至，金石为开。",
    "君子求诸己，小人求诸人。",
    "功崇惟志，业广惟勤。",
    "不满是向上的车轮。",
    "不驰于空想，不骛于虚声。",
    "贵有恒，何必三更眠五更起；最无益，只怕一日曝十日寒。",
    "生活原本沉闷，但跑起来就有风。",
    "相信尘埃里会开出一朵花，因为曾有漫天星光，亮透胸膛。",
    "不必行色匆匆，不必光芒四射，不必成为别人，只需做自己。",
    "只要明天还在，我就不会悲哀；冬雪终会悄悄融化，春雷定将滚滚而来。",
    "黎明之前，黑暗最深。",
    "不是看到希望才去坚持，而是坚持了才会看到希望。",
    "相信自己，你能作茧自缚，也能破茧成蝶。",
    "每一天都是新的开始，每一刻都是改变的机会。",
    "决定你人生高度的，不是你的才能，而是你的态度。",
    "把简单的事做好，就是不简单；把平凡的事做好，就是不平凡。",
    "自律，是治愈一切迷茫的良药。",
    "低头有坚定的脚步，抬头有清晰的远方。",
    "你的日积月累，终会成为别人的望尘莫及。",
    "热爱，可抵岁月漫长。",
    "奔赴要值得，放弃要利落。",
    "保持热爱，总会有很多瞬间告诉你，生活温柔且浪漫。",
    "善良，勇敢，优秀，绝不妥协，祝你，也祝我。",
    "在繁华中自律，在落魄中自愈。",
    "谋生的路上不抛弃良知，谋爱的路上不放弃尊严。",
    "愿你以渺小启程，以伟大结尾。"
];

// Load settings from storage
const loadSettings = () => {
    let interval = defaultInterval;
    let quotes = defaultQuotes;
    let mode = defaultMode;
    let library = defaultLibrary;

    // Try addon settings first
    try {
        const addonInterval = SettingsStore.getAddonSetting('daily-quote', 'interval');
        if (typeof addonInterval === 'number' && addonInterval > 0) {
            interval = addonInterval;
        }
    } catch (e) {
        // ignore
    }

    try {
        const addonMode = SettingsStore.getAddonSetting('daily-quote', 'display_mode');
        if (addonMode && (addonMode === 'sequential' || addonMode === 'random')) {
            mode = addonMode;
        }
    } catch (e) {
        // ignore
    }

    try {
        const addonLibrary = SettingsStore.getAddonSetting('daily-quote', 'quote_library');
        if (addonLibrary && (addonLibrary === 'local' || addonLibrary === 'hitokoto')) {
            library = addonLibrary;
        }
    } catch (e) {
        // ignore
    }

    try {
        const addonQuotes = SettingsStore.getAddonSetting('daily-quote', 'custom_quotes');
        if (addonQuotes && typeof addonQuotes === 'string') {
            const parsed = addonQuotes.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            if (parsed.length > 0) {
                quotes = parsed;
            }
        }
    } catch (e) {
        // ignore
    }

    // Fallback to localStorage for backward compatibility
    const storedInterval = parseInt(window.localStorage.getItem(LOCAL_KEY_INTERVAL), 10);
    if (Number.isFinite(storedInterval) && storedInterval > 0) {
        interval = storedInterval;
    }

    const storedQuotes = window.localStorage.getItem(LOCAL_KEY_QUOTES);
    if (storedQuotes) {
        try {
            const parsed = JSON.parse(storedQuotes);
            if (Array.isArray(parsed) && parsed.length > 0) {
                quotes = parsed;
            }
        } catch (e) {
            // ignore
        }
    }

    const storedMode = window.localStorage.getItem(LOCAL_KEY_MODE);
    if (storedMode && (storedMode === 'sequential' || storedMode === 'random')) {
        mode = storedMode;
    }

    return { interval, quotes, mode, library };
};

// Fetch hitokoto from API, with optional category filters (array of keys)
const fetchHitokoto = async (categories) => {
    try {
        const params = new URLSearchParams();
        params.append('encode', 'json');
        if (categories && categories.length > 0) {
            categories.forEach(c => params.append('c', c));
        }
        const url = `${HITOKOTO_API_BASE}?${params.toString()}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return data;
    } catch (e) {
        console.warn('daily-quote hitokoto fetch error:', e);
        return null;
    }
};

const DailyQuote = ({alertsList}) => {
    const settings = loadSettings();

    const [lines, setLines] = useState(settings.quotes);
    const [index, setIndex] = useState(0);
    const [intervalSec, setIntervalSec] = useState(settings.interval);
    const [displayMode, setDisplayMode] = useState(settings.mode);
    const [quoteLibrary, setQuoteLibrary] = useState(settings.library);
    const [currentQuote, setCurrentQuote] = useState(settings.quotes[0] || '');
    const timerRef = useRef(null);
    const dragRef = useRef(null);
    const isDragging = useRef(false);
    const dragOffset = useRef({x: 0, y: 0});

    // Hitokoto specific state
    const [hitokotoCategories, setHitokotoCategories] = useState([]); // selected category keys, empty = all
    const [hitokotoInfo, setHitokotoInfo] = useState(null); // {from, from_who, type, uuid, ...}
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const hitokotoLoadingRef = useRef(false);

    const loadPosition = () => {
        try {
            const stored = window.localStorage.getItem(LOCAL_KEY_POSITION);
            if (stored) {
                const pos = JSON.parse(stored);
                if (pos && typeof pos.left === 'number' && typeof pos.top === 'number' &&
                    pos.left >= 0 && pos.top >= 0 &&
                    pos.left < window.innerWidth && pos.top < window.innerHeight) {
                    return pos;
                }
            }
        } catch (e) {
            // ignore
        }
        window.localStorage.removeItem(LOCAL_KEY_POSITION);
        return {left: 10, top: 60};
    };

    const [position, setPosition] = useState(loadPosition);

    const handleMouseDown = useCallback((e) => {
        if (e.target === dragRef.current) {
            isDragging.current = true;
            dragOffset.current = {
                x: e.clientX - position.left,
                y: e.clientY - position.top
            };
            e.preventDefault();
        }
    }, [position]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging.current) {
            let newLeft = e.clientX - dragOffset.current.x;
            let newTop = e.clientY - dragOffset.current.y;

            const checkElementAtPosition = (x, y) => {
                const el = document.elementFromPoint(x, y);
                if (!el) return false;
                const style = window.getComputedStyle(el);
                if (style.pointerEvents === 'none') return false;
                if (el.closest && el.closest('[data-not-draggable]')) return false;
                return true;
            };

            const minTop = 60;
            const checkPoints = [
                {x: newLeft + 50, y: newTop + 15},
                {x: newLeft + 50, y: newTop + 30},
            ];

            let allValid = true;
            for (const pt of checkPoints) {
                if (!checkElementAtPosition(pt.x, pt.y)) {
                    allValid = false;
                    break;
                }
            }

            if (allValid) {
                newLeft = Math.max(0, newLeft);
                newTop = Math.max(minTop, newTop);
                newTop = Math.min(window.innerHeight - 40, newTop);
                setPosition({left: newLeft, top: newTop});
            }
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        if (isDragging.current) {
            isDragging.current = false;
            window.localStorage.setItem(LOCAL_KEY_POSITION, JSON.stringify(position));
        }
    }, [position]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // determine whether a saving/saved alert is present
    const hasSaveAlert = alertsList && alertsList.some(a => (
        a.alertId === 'saving' || a.alertId === 'twSaveToDiskSuccess' || a.alertId === 'saveSuccess'
    ));

    // Switch category selection (toggle)
    const toggleCategory = useCallback((catKey) => {
        setHitokotoCategories(prev => {
            if (prev.includes(catKey)) {
                return prev.filter(c => c !== catKey);
            } else {
                return [...prev, catKey];
            }
        });
    }, []);

    // Select all categories
    const selectAllCategories = useCallback(() => {
        setHitokotoCategories([]);
    }, []);

    // Fetch a new hitokoto
    const fetchNewHitokoto = useCallback(async () => {
        if (hitokotoLoadingRef.current) return;
        hitokotoLoadingRef.current = true;
        try {
            const data = await fetchHitokoto(hitokotoCategories);
            if (data && data.hitokoto) {
                setCurrentQuote(data.hitokoto);
                setHitokotoInfo({
                    from: data.from || '',
                    from_who: data.from_who || '',
                    type: data.type || '',
                    uuid: data.uuid || ''
                });
            } else {
                setCurrentQuote('网络开小差了，稍后再试～');
                setHitokotoInfo(null);
            }
        } finally {
            hitokotoLoadingRef.current = false;
        }
    }, [hitokotoCategories]);

    // Get next quote based on display mode and library
    const getNextQuote = useCallback(async () => {
        if (quoteLibrary === 'hitokoto') {
            await fetchNewHitokoto();
            return;
        }
        if (lines.length === 0) return;
        
        if (displayMode === 'random') {
            // Random mode: pick a random index different from current
            if (lines.length === 1) {
                setCurrentQuote(lines[0]);
                return;
            }
            
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * lines.length);
            } while (newIndex === index && lines.length > 1);
            
            setIndex(newIndex);
            setCurrentQuote(lines[newIndex]);
            setHitokotoInfo(null);
        } else {
            // Sequential mode: next index in order
            const nextIndex = (index + 1) % lines.length;
            setIndex(nextIndex);
            setCurrentQuote(lines[nextIndex]);
            setHitokotoInfo(null);
        }
    }, [lines, index, displayMode, quoteLibrary, fetchNewHitokoto]);

    // Timer effect - triggers next quote on interval
    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        timerRef.current = setInterval(() => {
            getNextQuote();
        }, Math.max(1000, intervalSec * 1000));
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [lines.length, intervalSec, displayMode, quoteLibrary, hitokotoCategories, getNextQuote]);

    // Initial load for hitokoto
    useEffect(() => {
        if (quoteLibrary === 'hitokoto') {
            fetchNewHitokoto();
        } else {
            // Reset to local library first quote
            setCurrentQuote(lines[0] || '');
            setHitokotoInfo(null);
            setIndex(0);
        }
    }, [quoteLibrary]); // eslint-disable-line react-hooks/exhaustive-deps

    // When hitokoto categories change, fetch a new quote
    useEffect(() => {
        if (quoteLibrary === 'hitokoto') {
            fetchNewHitokoto();
        }
    }, [hitokotoCategories, quoteLibrary, fetchNewHitokoto]);

    // Listen for settings changes
    useEffect(() => {
        const handleSettingsChange = () => {
            const newSettings = loadSettings();
            setIntervalSec(newSettings.interval);
            setLines(newSettings.quotes);
            setDisplayMode(newSettings.mode);
            setQuoteLibrary(newSettings.library);
            if (newSettings.library !== 'hitokoto') {
                setIndex(0);
                setCurrentQuote(newSettings.quotes[0] || '');
                setHitokotoInfo(null);
            }
        };

        // Listen for SettingsStore changes
        const handleSettingChanged = e => {
            if (e.detail && e.detail.addonId === 'daily-quote') {
                handleSettingsChange();
            }
        };

        SettingsStore.addEventListener('setting-changed', handleSettingChanged);
        
        // Listen for storage changes (from other tabs/windows)
        window.addEventListener('storage', handleSettingsChange);

        return () => {
            SettingsStore.removeEventListener('setting-changed', handleSettingChanged);
            window.removeEventListener('storage', handleSettingsChange);
        };
    }, []);

    const [enabled, setEnabled] = useState(() => {
        try {
            return SettingsStore.getAddonEnabled('daily-quote');
        } catch (e) {
            return true;
        }
    });

    const openSettings = () => {
        // Try to use the window manager if available, otherwise open in new tab
        if (window.handleClickAddonSettings) {
            window.handleClickAddonSettings('daily-quote');
        } else {
            window.open('./addons.html#daily-quote', '_blank');
        }
    };

    // Build source display string for hitokoto
    const sourceLabel = (() => {
        if (quoteLibrary !== 'hitokoto' || !hitokotoInfo) return '';
        const parts = [];
        if (hitokotoInfo.type && HITOKOTO_LABEL_MAP[hitokotoInfo.type]) {
            parts.push(`[${HITOKOTO_LABEL_MAP[hitokotoInfo.type]}]`);
        }
        if (hitokotoInfo.from) {
            parts.push(`《${hitokotoInfo.from}》`);
        }
        if (hitokotoInfo.from_who) {
            parts.push(`——${hitokotoInfo.from_who}`);
        }
        return parts.join(' ');
    })();

    if (hasSaveAlert) return null;
    if (!enabled) return null;

    return (
        <div
            className={styles.container}
            style={{left: position.left, top: position.top}}
            onMouseDown={handleMouseDown}
            title="日常一句"
        >
            <div
                ref={dragRef}
                className={styles.dragHandle}
            />
            <div className={styles.mainContent}>
                <div className={styles.quoteRow}>
                    <span className={styles.text}>{currentQuote}</span>
                    <div className={styles.buttonRow}>
                        {quoteLibrary === 'hitokoto' && (
                            <button
                                className={styles.filterToggle}
                                onClick={() => setShowFilterPanel(v => !v)}
                                aria-label="筛选"
                                title="筛选分类"
                            >
                                {showFilterPanel ? '▲' : '▼'}
                            </button>
                        )}
                        <button
                            className={styles.manualNext}
                            onClick={getNextQuote}
                            aria-label="下一句"
                            title="立即切换下一句"
                        >
                            ⏭
                        </button>
                        <button
                            className={styles.settings}
                            onClick={openSettings}
                            aria-label="设置"
                            title="打开插件设置"
                        >
                            ⚙
                        </button>
                    </div>
                </div>
                {sourceLabel && (
                    <div className={styles.sourceLabel} title="出处">
                        {sourceLabel}
                    </div>
                )}
                {quoteLibrary === 'hitokoto' && showFilterPanel && (
                    <div className={styles.filterPanel}>
                        <div className={styles.filterTitle}>分类筛选：</div>
                        <div className={styles.filterButtons}>
                            <button
                                className={hitokotoCategories.length === 0 ? styles.filterBtnActive : styles.filterBtn}
                                onClick={selectAllCategories}
                                title="选择全部（无筛选）"
                            >
                                全部
                            </button>
                            {HITOKOTO_CATEGORIES.map(cat => (
                                <button
                                    key={cat.key}
                                    className={hitokotoCategories.includes(cat.key) ? styles.filterBtnActive : styles.filterBtn}
                                    onClick={() => toggleCategory(cat.key)}
                                    title={`分类：${cat.label}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

DailyQuote.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object)
};

export default DailyQuote;

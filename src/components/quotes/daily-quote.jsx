import React, {useEffect, useState, useRef, useCallback, useMemo} from 'react';
import PropTypes from 'prop-types';

import styles from './daily-quote.css';
import SettingsStore from '../../addons/settings-store-singleton';
import {AESettings} from '../../lib/settings.js';

const LOCAL_KEY_INTERVAL = 'dailyQuoteInterval';
const LOCAL_KEY_QUOTES = 'dailyQuoteCustomQuotes';
const LOCAL_KEY_MODE = 'dailyQuoteDisplayMode';
const LOCAL_KEY_POSITION = 'dailyQuotePosition';

const defaultInterval = 5; // seconds
const defaultMode = 'sequential'; // 'sequential' or 'random'
const defaultLibrary = 'local'; // 'local' | 'hitokoto' | 'gudong' | 'jinrishici'

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
    {key: 'l', label: '抖机灵'}
];

const HITOKOTO_LABEL_MAP = Object.fromEntries(
    HITOKOTO_CATEGORIES.map(c => [c.key, c.label])
);

const HITOKOTO_API_BASE = 'https://v1.hitokoto.cn/';

// 古动笔记 API (from https://card.gudong.site/#/developer)
// 接口：GET https://card.gudong.site/api/random-note
// 完全公开、支持 CORS，无鉴权，无筛选参数（返回随机笔记）
const GUDONG_API_URL = 'https://card.gudong.site/api/random-note';

// 今日诗词 API (from https://v1.jinrishici.com/)
// 在链接最后加 .json 获取 JSON 输出。分类按路径区分，单选。
const JINRISHICI_API_BASE = 'https://v1.jinrishici.com/';

// 今日诗词分类（按主分类分组，每组含“全部”入口及子分类）
const JINRISHICI_GROUPS = [
    {
        group: '全部',
        items: [{path: 'all', label: '全部'}]
    },
    {
        group: '抒情',
        items: [
            {path: 'shuqing', label: '抒情（全部）'},
            {path: 'shuqing/aiqing', label: '爱情'},
            {path: 'shuqing/youqing', label: '友情'},
            {path: 'shuqing/libie', label: '离别'},
            {path: 'shuqing/sinian', label: '思念'},
            {path: 'shuqing/sixiang', label: '思乡'},
            {path: 'shuqing/shanggan', label: '伤感'},
            {path: 'shuqing/gudu', label: '孤独'},
            {path: 'shuqing/guiyuan', label: '闺怨'},
            {path: 'shuqing/daowang', label: '悼亡'},
            {path: 'shuqing/huaigu', label: '怀古'},
            {path: 'shuqing/aiguo', label: '爱国'},
            {path: 'shuqing/ganen', label: '感恩'}
        ]
    },
    {
        group: '四季',
        items: [
            {path: 'siji', label: '四季（全部）'},
            {path: 'siji/chuntian', label: '春天'},
            {path: 'siji/xiatian', label: '夏天'},
            {path: 'siji/qiutian', label: '秋天'},
            {path: 'siji/dongtian', label: '冬天'}
        ]
    },
    {
        group: '山水',
        items: [
            {path: 'shanshui', label: '山水（全部）'},
            {path: 'shanshui/lushan', label: '庐山'},
            {path: 'shanshui/taishan', label: '泰山'},
            {path: 'shanshui/jianghe', label: '江河'},
            {path: 'shanshui/changjiang', label: '长江'},
            {path: 'shanshui/huanghe', label: '黄河'},
            {path: 'shanshui/xihu', label: '西湖'},
            {path: 'shanshui/pubu', label: '瀑布'}
        ]
    },
    {
        group: '天气',
        items: [
            {path: 'tianqi', label: '天气（全部）'},
            {path: 'tianqi/xiefeng', label: '写风'},
            {path: 'tianqi/xieyun', label: '写云'},
            {path: 'tianqi/xieyu', label: '写雨'},
            {path: 'tianqi/xiexue', label: '写雪'},
            {path: 'tianqi/caihong', label: '彩虹'},
            {path: 'tianqi/taiyang', label: '太阳'},
            {path: 'tianqi/yueliang', label: '月亮'},
            {path: 'tianqi/xingxing', label: '星星'}
        ]
    },
    {
        group: '人物',
        items: [
            {path: 'renwu', label: '人物（全部）'},
            {path: 'renwu/nvzi', label: '女子'},
            {path: 'renwu/fuqin', label: '父亲'},
            {path: 'renwu/muqin', label: '母亲'},
            {path: 'renwu/laoshi', label: '老师'},
            {path: 'renwu/ertong', label: '儿童'}
        ]
    },
    {
        group: '人生',
        items: [
            {path: 'rensheng', label: '人生（全部）'},
            {path: 'rensheng/lizhi', label: '励志'},
            {path: 'rensheng/zheli', label: '哲理'},
            {path: 'rensheng/qingchun', label: '青春'},
            {path: 'rensheng/shiguang', label: '时光'},
            {path: 'rensheng/mengxiang', label: '梦想'},
            {path: 'rensheng/dushu', label: '读书'},
            {path: 'rensheng/zhanzheng', label: '战争'}
        ]
    },
    {
        group: '生活',
        items: [
            {path: 'shenghuo', label: '生活（全部）'},
            {path: 'shenghuo/xiangcun', label: '乡村'},
            {path: 'shenghuo/tianyuan', label: '田园'},
            {path: 'shenghuo/biansai', label: '边塞'},
            {path: 'shenghuo/xieqiao', label: '写桥'}
        ]
    },
    {
        group: '节日',
        items: [
            {path: 'jieri', label: '节日（全部）'},
            {path: 'jieri/chunjie', label: '春节'},
            {path: 'jieri/yuanxiaojie', label: '元宵节'},
            {path: 'jieri/hanshijie', label: '寒食节'},
            {path: 'jieri/qingmingjie', label: '清明节'},
            {path: 'jieri/duanwujie', label: '端午节'},
            {path: 'jieri/qixijie', label: '七夕节'},
            {path: 'jieri/zhongqiujie', label: '中秋节'},
            {path: 'jieri/chongyangjie', label: '重阳节'}
        ]
    },
    {
        group: '动物',
        items: [
            {path: 'dongwu', label: '动物（全部）'},
            {path: 'dongwu/xieniao', label: '写鸟'},
            {path: 'dongwu/xiema', label: '写马'},
            {path: 'dongwu/xiemao', label: '写猫'}
        ]
    },
    {
        group: '植物',
        items: [
            {path: 'zhiwu', label: '植物（全部）'},
            {path: 'zhiwu/meihua', label: '梅花'},
            {path: 'zhiwu/lihua', label: '梨花'},
            {path: 'zhiwu/taohua', label: '桃花'},
            {path: 'zhiwu/hehua', label: '荷花'},
            {path: 'zhiwu/juhua', label: '菊花'},
            {path: 'zhiwu/liushu', label: '柳树'},
            {path: 'zhiwu/yezi', label: '叶子'},
            {path: 'zhiwu/zhuzi', label: '竹子'}
        ]
    },
    {
        group: '食物',
        items: [
            {path: 'shiwu', label: '食物（全部）'},
            {path: 'shiwu/xiejiu', label: '写酒'},
            {path: 'shiwu/xiecha', label: '写茶'},
            {path: 'shiwu/lizhi', label: '荔枝'}
        ]
    }
];

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

const LIBRARY_IDS = ['local', 'hitokoto', 'gudong', 'jinrishici'];

// Load settings from storage
const loadSettings = () => {
    let interval = defaultInterval;
    let quotes = defaultQuotes;
    let mode = defaultMode;
    let library = defaultLibrary;

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
        if (addonLibrary && LIBRARY_IDS.includes(addonLibrary)) {
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

// 一言 Hitokoto：支持多分类筛选（c 参数可重复）
const fetchHitokoto = async categories => {
    try {
        const params = new URLSearchParams();
        params.append('encode', 'json');
        if (categories && categories.length > 0) {
            categories.forEach(c => params.append('c', c));
        }
        const resp = await fetch(`${HITOKOTO_API_BASE}?${params.toString()}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (e) {
        console.warn('daily-quote hitokoto fetch error:', e);
        return null;
    }
};

// 古动笔记：无筛选参数，返回随机笔记
const fetchGudong = async () => {
    try {
        const resp = await fetch(GUDONG_API_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (e) {
        console.warn('daily-quote gudong fetch error:', e);
        return null;
    }
};

// 今日诗词：分类按路径区分（单选），追加 .json 获取 JSON
const fetchJinrishici = async categoryPath => {
    try {
        const path = categoryPath || 'all';
        const resp = await fetch(`${JINRISHICI_API_BASE}${path}.json`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (e) {
        console.warn('daily-quote jinrishici fetch error:', e);
        return null;
    }
};

const DailyQuoteInner = ({alertsList, quoteLibrary}) => {
    const settings = loadSettings();

    const [lines, setLines] = useState(settings.quotes);
    const [index, setIndex] = useState(0);
    const [intervalSec, setIntervalSec] = useState(settings.interval);
    const [displayMode, setDisplayMode] = useState(settings.mode);
    const [currentQuote, setCurrentQuote] = useState(settings.quotes[0] || '');
    // 统一存放各句库返回的元信息，供出处展示使用
    const [meta, setMeta] = useState(null);
    const timerRef = useRef(null);
    const isDragging = useRef(false);
    const dragOffset = useRef({x: 0, y: 0});

    // 一言分类（多选，空数组 = 全部）
    const [hitokotoCategories, setHitokotoCategories] = useState([]);
    // 今日诗词分类（单选路径，默认 all）
    const [jinrishiciCategory, setJinrishiciCategory] = useState('all');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const loadingRef = useRef(false);

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

    // 是否启用移动端模式（开启后支持触摸拖动）
    // 切换移动端模式会触发 location.reload()，因此挂载时读取一次即可
    const isMobileLayout = useMemo(() => {
        try {
            return AESettings.get('EnableMobileLayout') || false;
        } catch (e) {
            return false;
        }
    }, []);

    const containerRef = useRef(null);

    // 判断点击/触摸目标是否可拖动（按钮、链接、输入框等交互元素不触发拖动）
    const isDraggableTarget = (target) => {
        if (!target) return true;
        // 排除按钮、链接、输入框及其子元素
        if (target.closest && target.closest('button, a, input, textarea, select, [data-not-draggable]')) {
            return false;
        }
        return true;
    };

    const handleMouseDown = useCallback((e) => {
        // 仅左键触发
        if (e.button !== 0) return;
        if (!isDraggableTarget(e.target)) return;
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - position.left,
            y: e.clientY - position.top
        };
        e.preventDefault();
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
                {x: newLeft + 50, y: newTop + 30}
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

    // 触摸拖动（移动端模式启用后生效）——使用原生事件确保可靠性
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isMobileLayout) return;

        const onTouchStart = (e) => {
            if (e.touches.length !== 1) return;
            if (!isDraggableTarget(e.target)) return;
            const touch = e.touches[0];
            isDragging.current = true;
            dragOffset.current = {
                x: touch.clientX - position.left,
                y: touch.clientY - position.top
            };
        };

        const onTouchMove = (e) => {
            if (!isDragging.current) return;
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            let newLeft = touch.clientX - dragOffset.current.x;
            let newTop = touch.clientY - dragOffset.current.y;
            const minTop = 60;
            newLeft = Math.max(0, newLeft);
            newTop = Math.max(minTop, newTop);
            newTop = Math.min(window.innerHeight - 40, newTop);
            setPosition({left: newLeft, top: newTop});
            e.preventDefault();
        };

        const onTouchEnd = () => {
            if (isDragging.current) {
                isDragging.current = false;
                window.localStorage.setItem(LOCAL_KEY_POSITION, JSON.stringify(position));
            }
        };

        el.addEventListener('touchstart', onTouchStart, {passive: true});
        el.addEventListener('touchmove', onTouchMove, {passive: false});
        el.addEventListener('touchend', onTouchEnd);
        el.addEventListener('touchcancel', onTouchEnd);

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [isMobileLayout, position]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const hasSaveAlert = alertsList && alertsList.some(a => (
        a.alertId === 'saving' || a.alertId === 'twSaveToDiskSuccess' || a.alertId === 'saveSuccess'
    ));

    // 一言分类多选切换
    const toggleHitokotoCategory = useCallback(catKey => {
        setHitokotoCategories(prev => prev.includes(catKey) ?
            prev.filter(c => c !== catKey) :
            [...prev, catKey]);
    }, []);

    const clearHitokotoCategories = useCallback(() => setHitokotoCategories([]), []);

    // 今日诗词分类单选
    const selectJinrishiciCategory = useCallback(path => setJinrishiciCategory(path), []);

    // 拉取一言
    const fetchNewHitokoto = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        try {
            const data = await fetchHitokoto(hitokotoCategories);
            if (data && data.hitokoto) {
                setCurrentQuote(data.hitokoto);
                setMeta({
                    type: data.type || '',
                    from: data.from || '',
                    from_who: data.from_who || '',
                    uuid: data.uuid || ''
                });
            } else {
                setCurrentQuote('网络开小差了，稍后再试～');
                setMeta(null);
            }
        } finally {
            loadingRef.current = false;
        }
    }, [hitokotoCategories]);

    // 拉取古动笔记
    const fetchNewGudong = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        try {
            const data = await fetchGudong();
            if (data && data.content) {
                setCurrentQuote(data.content);
                setMeta({
                    source: data.source || '',
                    author: data.author || '',
                    collectionName: data.collectionName || '',
                    tags: Array.isArray(data.tags) ? data.tags : []
                });
            } else {
                setCurrentQuote('网络开小差了，稍后再试～');
                setMeta(null);
            }
        } finally {
            loadingRef.current = false;
        }
    }, []);

    // 拉取今日诗词
    const fetchNewJinrishici = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        try {
            const data = await fetchJinrishici(jinrishiciCategory);
            if (data && data.content) {
                setCurrentQuote(data.content);
                setMeta({
                    origin: data.origin || '',
                    author: data.author || '',
                    category: data.category || ''
                });
            } else {
                setCurrentQuote('网络开小差了，稍后再试～');
                setMeta(null);
            }
        } finally {
            loadingRef.current = false;
        }
    }, [jinrishiciCategory]);

    // 统一获取下一句
    const getNextQuote = useCallback(async () => {
        if (quoteLibrary === 'hitokoto') {
            await fetchNewHitokoto();
            return;
        }
        if (quoteLibrary === 'gudong') {
            await fetchNewGudong();
            return;
        }
        if (quoteLibrary === 'jinrishici') {
            await fetchNewJinrishici();
            return;
        }
        // local
        if (lines.length === 0) return;
        if (displayMode === 'random') {
            if (lines.length === 1) {
                setCurrentQuote(lines[0]);
                setMeta(null);
                return;
            }
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * lines.length);
            } while (newIndex === index && lines.length > 1);
            setIndex(newIndex);
            setCurrentQuote(lines[newIndex]);
            setMeta(null);
        } else {
            const nextIndex = (index + 1) % lines.length;
            setIndex(nextIndex);
            setCurrentQuote(lines[nextIndex]);
            setMeta(null);
        }
    }, [lines, index, displayMode, quoteLibrary, fetchNewHitokoto, fetchNewGudong, fetchNewJinrishici]);

    // 定时切换
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
    }, [lines.length, intervalSec, displayMode, quoteLibrary, hitokotoCategories, jinrishiciCategory, getNextQuote]);

    // 句库切换 / 分类变化时立即拉取一次
    useEffect(() => {
        if (quoteLibrary === 'hitokoto') {
            fetchNewHitokoto();
        } else if (quoteLibrary === 'gudong') {
            fetchNewGudong();
        } else if (quoteLibrary === 'jinrishici') {
            fetchNewJinrishici();
        } else {
            // local：回到本地第一句
            setCurrentQuote(lines[0] || '');
            setMeta(null);
            setIndex(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quoteLibrary, hitokotoCategories, jinrishiciCategory]);

    // 监听设置变化（句库切换由外层 wrapper 通过 key 重置处理，这里只同步其他设置）
    useEffect(() => {
        const handleSettingsChange = () => {
            const newSettings = loadSettings();
            setIntervalSec(newSettings.interval);
            setLines(newSettings.quotes);
            setDisplayMode(newSettings.mode);
        };

        const handleSettingChanged = e => {
            if (e.detail && e.detail.addonId === 'daily-quote') {
                handleSettingsChange();
            }
        };

        SettingsStore.addEventListener('setting-changed', handleSettingChanged);
        window.addEventListener('storage', handleSettingsChange);

        return () => {
            SettingsStore.removeEventListener('setting-changed', handleSettingChanged);
            window.removeEventListener('storage', handleSettingsChange);
        };
    }, []);

    const [enabled] = useState(() => {
        try {
            return SettingsStore.getAddonEnabled('daily-quote');
        } catch (e) {
            return true;
        }
    });

    const openSettings = () => {
        if (window.handleClickAddonSettings) {
            window.handleClickAddonSettings('daily-quote');
        } else {
            window.open('./addons.html#daily-quote', '_blank');
        }
    };

    // 出处展示
    const sourceLabel = (() => {
        if (!meta) return '';
        if (quoteLibrary === 'hitokoto') {
            const parts = [];
            if (meta.type && HITOKOTO_LABEL_MAP[meta.type]) parts.push(`[${HITOKOTO_LABEL_MAP[meta.type]}]`);
            if (meta.from) parts.push(`《${meta.from}》`);
            if (meta.from_who) parts.push(`——${meta.from_who}`);
            return parts.join(' ');
        }
        if (quoteLibrary === 'jinrishici') {
            const parts = [];
            if (meta.origin) parts.push(`《${meta.origin}》`);
            if (meta.author) parts.push(`——${meta.author}`);
            return parts.join(' ');
        }
        if (quoteLibrary === 'gudong') {
            const parts = [];
            if (meta.source) parts.push(`《${meta.source}》`);
            if (meta.author) parts.push(`——${meta.author}`);
            if (meta.collectionName) parts.push(`· ${meta.collectionName}`);
            return parts.join(' ');
        }
        return '';
    })();

    if (hasSaveAlert) return null;
    if (!enabled) return null;

    const showFilterButton = quoteLibrary === 'hitokoto' || quoteLibrary === 'jinrishici';

    return (
        <div
            ref={containerRef}
            className={styles.container}
            style={{left: position.left, top: position.top}}
            onMouseDown={handleMouseDown}
            title="日常一句"
        >
            <div className={styles.mainContent}>
                <div className={styles.quoteRow}>
                    <span className={styles.text}>{currentQuote}</span>
                    <div className={styles.buttonRow}>
                        {showFilterButton && (
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
                        <div className={styles.filterTitle}>分类筛选（可多选）：</div>
                        <div className={styles.filterButtons}>
                            <button
                                className={hitokotoCategories.length === 0 ? styles.filterBtnActive : styles.filterBtn}
                                onClick={clearHitokotoCategories}
                                title="选择全部（无筛选）"
                            >
                                全部
                            </button>
                            {HITOKOTO_CATEGORIES.map(cat => (
                                <button
                                    key={cat.key}
                                    className={hitokotoCategories.includes(cat.key) ? styles.filterBtnActive : styles.filterBtn}
                                    onClick={() => toggleHitokotoCategory(cat.key)}
                                    title={`分类：${cat.label}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {quoteLibrary === 'jinrishici' && showFilterPanel && (
                    <div className={styles.filterPanel}>
                        <div className={styles.filterTitle}>分类筛选（单选）：</div>
                        <div className={styles.filterScroll}>
                            {JINRISHICI_GROUPS.map(group => (
                                <div key={group.group} className={styles.filterGroup}>
                                    <div className={styles.filterGroupTitle}>{group.group}</div>
                                    <div className={styles.filterButtons}>
                                        {group.items.map(item => (
                                            <button
                                                key={item.path}
                                                className={jinrishiciCategory === item.path ? styles.filterBtnActive : styles.filterBtn}
                                                onClick={() => selectJinrishiciCategory(item.path)}
                                                title={`${group.group} - ${item.label}`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

DailyQuoteInner.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object),
    quoteLibrary: PropTypes.string
};

// 外层 wrapper：监听句库切换，通过 key 变化触发整个内部组件卸载重建（与主题切换的 key 重置机制一致）
const DailyQuote = ({alertsList}) => {
    const [library, setLibrary] = useState(() => loadSettings().library);

    useEffect(() => {
        const syncLibrary = () => {
            const next = loadSettings().library;
            setLibrary(prev => (prev !== next ? next : prev));
        };
        const handleSettingChanged = e => {
            if (e.detail && e.detail.addonId === 'daily-quote') {
                syncLibrary();
            }
        };
        SettingsStore.addEventListener('setting-changed', handleSettingChanged);
        window.addEventListener('storage', syncLibrary);
        return () => {
            SettingsStore.removeEventListener('setting-changed', handleSettingChanged);
            window.removeEventListener('storage', syncLibrary);
        };
    }, []);

    return (
        <DailyQuoteInner
            key={library}
            quoteLibrary={library}
            alertsList={alertsList}
        />
    );
};

DailyQuote.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object)
};

export default DailyQuote;

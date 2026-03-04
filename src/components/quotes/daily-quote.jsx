import React, {useEffect, useState, useRef} from 'react';
import PropTypes from 'prop-types';

import styles from './daily-quote.css';
import QuotesPluginSettings from './quotes-plugin-settings.jsx';
import SettingsStore from '../../addons/settings-store-singleton';

const LOCAL_KEY = 'dailyQuoteInterval';

const defaultInterval = 5; // seconds

const DailyQuote = ({alertsList}) => {
    const [lines, setLines] = useState([
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
    ]);
    const [index, setIndex] = useState(0);
    const [intervalSec, setIntervalSec] = useState(() => {
        try {
            const v = SettingsStore.getAddonSetting('daily-quote', 'interval');
            if (typeof v === 'number' && v > 0) return v;
        } catch (e) {
            // ignore
        }
        const v2 = parseInt(window.localStorage.getItem(LOCAL_KEY), 10);
        return Number.isFinite(v2) && v2 > 0 ? v2 : defaultInterval;
    });
    const timerRef = useRef(null);

    // determine whether a saving/saved alert is present
    const hasSaveAlert = alertsList && alertsList.some(a => (
        a.alertId === 'saving' || a.alertId === 'twSaveToDiskSuccess' || a.alertId === 'saveSuccess'
    ));

    // 已将所有句子内联到组件，移除远程加载逻辑

    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        timerRef.current = setInterval(() => {
            setIndex(i => (i + 1) % lines.length);
        }, Math.max(1000, intervalSec * 1000));
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [lines.length, intervalSec]);

    const [showSettings, setShowSettings] = useState(false);
    const [enabled, setEnabled] = useState(() => {
        try {
            return SettingsStore.getAddonEnabled('daily-quote');
        } catch (e) {
            return true;
        }
    });

    const openSettings = () => setShowSettings(true);

    const handleSaveSettings = (n) => {
        if (Number.isFinite(n) && n > 0) {
            // save to addon settings if available
            try {
                SettingsStore.setAddonSetting('daily-quote', 'interval', Number(n));
            } catch (e) {
                // fallback to localStorage
                window.localStorage.setItem(LOCAL_KEY, String(n));
            }
            setIntervalSec(n);
            setShowSettings(false);
        } else {
            window.alert('请输入正整数秒数。');
        }
    };

    const handleCancelSettings = () => setShowSettings(false);

    if (hasSaveAlert) return null;
    if (!enabled) return null;

    const current = lines.length ? lines[index % lines.length] : '';

    return (
        <div className={styles.container} title="日常一句">
            <span className={styles.text}>{current}</span>
            <button
                className={styles.settings}
                onClick={openSettings}
                aria-label="设置切换间隔"
            >
                ⚙
            </button>
            {showSettings ? (
                <QuotesPluginSettings
                    initialInterval={intervalSec}
                    onSave={handleSaveSettings}
                    onCancel={handleCancelSettings}
                />
            ) : null}
        </div>
    );
};

DailyQuote.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object)
};

export default DailyQuote;

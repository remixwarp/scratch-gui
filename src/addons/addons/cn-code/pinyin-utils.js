// @ts-check
/**
 * 拼音搜索工具
 * 动态扫描积木文字，只收集积木中实际包含的汉字，建立拼音映射
 */

// ============ 积木中实际出现的汉字及其拼音映射 ============
const PINYIN_MAP = {
    // 运动类
    "移": "yi", "动": "dong", "旋": "xuan", "转": "zhuan", "面": "mian", "向": "xiang",
    "步": "bu", "滑": "hua", "行": "xing", "坐": "zuo", "标": "biao", "位": "wei",
    "置": "zhi", "碰": "peng", "边": "bian", "缘": "yuan", "弹": "dan", "反": "fan",
    "左": "zuo", "右": "you", "上": "shang", "下": "xia", "前": "qian", "后": "hou",
    "秒": "miao", "度": "du", "角": "jiao", "方": "fang", "随": "sui", "机": "ji",
    "舞": "wu", "台": "tai",

    // 外观类
    "说": "shuo", "思": "si", "考": "kao", "显": "xian", "示": "shi", "隐": "yin",
    "藏": "cang", "造": "zao", "型": "xing", "背": "bei", "景": "jing", "大": "da",
    "小": "xiao", "颜": "yan", "色": "se", "特": "te", "效": "xiao", "清": "qing",
    "除": "chu", "图": "tu", "层": "ceng", "像": "xiang", "虚": "xu", "鱼": "yu",
    "眼": "yan", "亮": "liang", "马": "ma", "赛": "sai", "克": "ke", "扭": "niu",
    "曲": "qu", "强": "qiang", "弱": "ruo", "灵": "ling", "素": "su", "化": "hua",
    "分": "fen", "辨": "bian", "率": "lv", "画": "hua", "质": "zhi", "帧": "zhen",
    "模": "mo", "糊": "hu", "镜": "jing", "纹": "wen", "理": "li", "漩": "xuan",
    "涡": "wo", "毛": "mao", "刺": "ci", "格": "ge", "栅": "zha", "拼": "pin",
    "不": "bu", "透": "tou", "明": "ming", "调": "diao", "饱": "bao", "和": "he",
    "光": "guang", "影": "ying", "晕": "yun", "老": "lao", "旧": "jiu", "噪": "zao",
    "点": "dian", "锐": "rui", "胶": "jiao", "片": "pian", "复": "fu", "制": "zhi",
    "粘": "zhan", "贴": "tie", "填": "tian", "轮": "lun", "廓": "kuo", "伸": "shen",
    "缩": "suo", "裁": "cai", "剪": "jian", "翻": "fan", "歪": "wai", "斜": "xie",
    "对": "dui", "称": "cheng", "中": "zhong", "心": "xin", "链": "lian", "接": "jie",
    "插": "cha", "入": "ru", "更": "geng", "改": "gai", "名": "ming", "编": "bian",
    "号": "hao", "创": "chuang", "建": "jian", "删": "shan", "全": "quan", "部": "bu",
    "拉": "la", "粗": "cu", "细": "xi", "宽": "kuan",

    // 声音类
    "播": "bo", "放": "fang", "停": "ting", "声": "sheng", "音": "yin", "量": "liang",
    "节": "jie", "拍": "pai", "乐": "le", "器": "qi", "休": "xiu", "止": "zhi",
    "鼓": "gu", "奏": "zou", "选": "xuan", "择": "ze", "果": "guo", "设": "she",
    "为": "wei", "变": "bian",

    // 事件类
    "当": "dang", "击": "ji", "按": "an", "键": "jian", "盘": "pan", "广": "guang",
    "收": "shou", "到": "dao", "切": "qie", "换": "huan", "响": "xiang", "应": "ying",
    "于": "yu", "等": "deng", "计": "ji", "时": "shi", "启": "qi", "触": "chu",
    "发": "fa",

    // 控制类
    "重": "zhong", "直": "zhi", "则": "ze", "否": "fou", "那": "na", "么": "me",
    "隆": "long", "所": "suo", "有": "you", "脚": "jiao", "本": "ben", "循": "xun",
    "环": "huan", "迭": "die", "代": "dai", "条": "tiao", "件": "jian", "判": "pan",
    "断": "duan", "套": "tao", "嵌": "qian", "级": "ji",

    // 侦测类
    "询": "xun", "问": "wen", "回": "hui", "答": "da", "鼠": "shu", "离": "li",
    "距": "ju", "性": "xing", "关": "guan", "闭": "bi", "取": "qu", "目": "mu",
    "文": "wen", "属": "shu", "拖": "tuo", "拽": "zhuai", "可": "ke", "用": "yong",
    "状": "zhuang", "态": "tai", "年": "nian", "月": "yue", "日": "ri", "星": "xing",
    "期": "qi", "网": "wang", "络": "luo", "户": "hu", "麦": "mai", "摄": "she",
    "头": "tou", "扬": "yang",

    // 运算类
    "算": "suan", "术": "shu", "运": "yun", "加": "jia", "减": "jian", "乘": "cheng",
    "比": "bi", "较": "jiao", "超": "chao", "绝": "jue", "值": "zhi", "舍": "she",
    "余": "yu", "连": "lian", "含": "han", "平": "ping", "根": "gen", "指": "zhi",
    "数": "shu", "字": "zi", "符": "fu", "串": "chuan", "列": "lie", "表": "biao",
    "项": "xiang", "布": "bu", "尔": "er", "真": "zhen", "假": "jia", "增": "zeng",
    "添": "tian", "替": "ti", "序": "xu", "导": "dao", "出": "chu",

    // 变量/列表类
    "监": "jian", "测": "ce", "块": "kuai", "只": "zhi", "读": "du", "写": "xie",
    "局": "ju", "私": "si",

    // 自制积木/插件
    "义": "yi", "定": "ding", "参": "can", "签": "qian", "刷": "shua", "新": "xin",
    "辑": "ji", "屏": "ping", "幕": "mu", "输": "shu", "注": "zhu", "释": "shi",
    "批": "pi", "处": "chu", "理": "li", "默": "mo", "认": "ren", "搜": "sou",
    "索": "suo", "匹": "pi", "配": "pei", "积": "ji", "木": "mu", "件": "jian",
    "主": "zhu", "题": "ti", "语": "yu", "言": "yan", "航": "hang", "菜": "cai",
    "单": "dan", "帮": "bang", "助": "zhu", "版": "ban", "记": "ji", "录": "lu",
    "成": "cheng", "就": "jiu", "教": "jiao", "程": "cheng", "手": "shou", "册": "ce",
    "馈": "kui", "扩": "kuo", "展": "zhan", "外": "wai", "观": "guan", "功": "gong",
    "能": "neng", "高": "gao", "修": "xiu", "实": "shi", "验": "yan", "室": "shi",
    "意": "yi", "见": "jian", "信": "xin", "息": "xi", "还": "hai", "原": "yuan",
    "撤": "che", "销": "xiao", "恢": "hui", "保": "bao", "存": "cun", "载": "zai",
    "返": "fan", "打": "da", "开": "kai", "译": "yi", "简": "jian", "繁": "fan",
    "体": "ti", "深": "shen", "浅": "qian", "式": "shi", "粗": "cu", "报": "bao",
    "告": "gao", "错": "cuo", "误": "wu", "端": "duan", "口": "kou", "失": "shi",
    "败": "bai", "远": "yuan", "地": "di", "同": "tong", "步": "bu", "云": "yun",
    "协": "xie", "作": "zuo", "书": "shu", "布": "bu", "享": "xiang", "迁": "qian",
    "校": "jiao", "验": "yan", "最": "zui", "近": "jin", "提": "ti", "交": "jiao",
    "哈": "ha", "希": "xi", "正": "zheng", "优": "you", "兼": "jian", "容": "rong",
    "安": "an", "装": "zhuang", "卸": "xie", "附": "fu", "暂": "zan", "缓": "huan",
    "历": "li", "史": "shi", "夹": "jia", "资": "zi", "源": "yuan", "包": "bao",
    "管": "guan", "码": "ma", "解": "jie", "终": "zhong", "控": "kong", "台": "tai",
    "发": "fa", "调": "tiao", "试": "shi", "工": "gong", "具": "ju", "先": "xian",
    "渲": "xuan", "染": "ran", "硬": "ying", "速": "su", "形": "xing", "内": "nei",
    "存": "cun", "使": "shi", "占": "zhan", "视": "shi", "窗": "chuang", "全": "quan",
    "默": "mo", "认": "ren", "主": "zhu", "题": "ti", "色": "se", "调": "diao",
    "重": "chong", "构": "gou", "跃": "yue", "迁": "qian", "蓝": "lan", "牙": "ya",
    "备": "bei", "微": "wei", "型": "xing", "乐": "yue", "人": "ren",
    "传": "chuan", "感": "gan", "温": "wen", "湿": "shi", "压": "ya",
    "流": "liu", "陀": "tuo", "螺": "luo", "仪": "yi", "红": "hong", "距": "ju",
    "识": "shi", "别": "bie", "合": "he", "成": "cheng", "智": "zhi",
    "话": "hua", "生": "sheng", "风": "feng", "滤": "lv", "拟": "ni", "现": "xian",
    "三": "san", "维": "wei", "空": "kong", "间": "jian", "锚": "mao", "追": "zhui",
    "踪": "zong", "势": "shi", "电": "dian", "子": "zi", "邮": "you",
    "箱": "xiang", "通": "tong", "知": "zhi", "消": "xiao", "息": "xi",
    "任": "ren", "务": "wu", "划": "hua", "历": "li", "聊": "liao", "天": "tian",
    "钟": "zhong", "闹": "nao", "绘": "hui", "笔": "bi", "便": "bian",
    "密": "mi", "扫": "sao", "描": "miao", "二": "er", "预": "yu",
    "股": "gu", "票": "piao", "情": "qing", "汇": "hui", "兑": "dui", "词": "ci",
    "典": "dian", "页": "ye", "爬": "pa", "虫": "chong", "据": "ju", "抓": "zhua",
    "析": "xi", "自": "zi", "浏": "liu", "览": "lan", "操": "cao", "档": "dang",
    "演": "yan", "稿": "gao", "会": "hui", "议": "yi", "频": "pin", "直": "zhi",
    "播": "bo", "制": "zhi", "截": "jie", "桌": "zhuo", "告": "gao", "拦": "lan",
    "私": "si", "护": "hu", "双": "shuang", "因": "yin", "素": "su", "压": "ya",
    "缩": "suo", "份": "fen", "磁": "ci", "系": "xi", "统": "tong", "驱": "qu",
    "序": "xu", "册": "ce", "进": "jin", "程": "cheng", "服": "fu", "务": "wu",
    "段": "duan", "板": "ban", "查": "cha", "审": "shen", "核": "he", "推": "tui",
    "拉": "la", "取": "qu", "并": "bing", "支": "zhi", "冲": "chong", "突": "tu",
    "决": "jue", "基": "ji", "拣": "jian", "搁": "ge", "弃": "qi", "志": "zhi",
    "看": "kan", "差": "cha", "异": "yi", "责": "ze", "还": "huan", "标": "biao",
    "已": "yi", "跳": "tiao", "折": "zhe", "叠": "die", "纲": "gang",
    "专": "zhuan", "注": "zhu", "无": "wu", "干": "gan", "扰": "rao", "禅": "chan",
    "暗": "an", "快": "kuai", "捷": "jie", "映": "ying", "射": "she", "宏": "hong",
    "命": "ming", "令": "ling", "多": "duo", "局": "ju", "补": "bu", "能": "neng",
    "示": "shi", "检": "jian", "法": "fa", "亮": "liang", "括": "kuo", "号": "hao",
    "引": "yin", "尺": "chi", "做": "zuo", "找": "zhao", "消": "xiao", "首": "shou",
    "尾": "wei", "区": "qu", "铡": "ce", "栏": "lan", "滚": "gun", "动": "dong",
    "屑": "xie", "树": "shu", "达": "da", "拾": "shi", "渐": "jian", "齐": "qi",
    "辅": "fu", "考": "kao", "洋": "yang", "葱": "cong", "皮": "pi", "骨": "gu",
    "胳": "ge", "膊": "bo", "线": "xian", "弹": "tan", "簧": "huang", "惯": "guan",
    "性": "xing", "限": "xian", "往": "wang", "脉": "mai", "冲": "chong", "弦": "xian",
    "抖": "dou", "谱": "pu", "波": "bo", "封": "feng", "轨": "gui", "混": "hun",
    "采": "cai", "样": "yang", "钢": "gang", "琴": "qin", "吉": "ji", "他": "ta",
    "贝": "bei", "斯": "si", "架": "jia", "鼓": "gu", "长": "chang", "笛": "di",
    "短": "duan", "簧": "huang", "萨": "sa", "圆": "yuan", "竖": "shu", "颤": "chan",
    "唱": "chang", "声": "sheng", "混": "hun", "响": "xiang", "延": "yan", "迟": "chi",
    "均": "jun", "衡": "heng", "门": "men", "过": "guo", "载": "zai", "镶": "xiang",
    "边": "bian", "高": "gao", "正": "zheng", "奏": "zou", "作": "zuo", "编": "bian",
    "曲": "qu", "低": "di", "线": "xian", "律": "lv", "弦": "xian", "行": "xing",
    "即": "ji", "兴": "xing", "奏": "zou", "伴": "ban", "智": "zhi", "能": "neng",
    "配": "pei", "器": "qi", "离": "li", "去": "qu", "降": "jiang", "齿": "chi",
    "嘶": "si", "爆": "bao", "准": "zhun", "响": "xiang", "度": "du", "幅": "fu",
    "立": "li", "宽": "kuan", "绕": "rao", "耳": "er", "炮": "pao", "站": "zhan",
    "印": "yin", "箱": "xiang", "由": "you", "总": "zong", "损": "sun", "保": "bao",
    "持": "chi", "交": "jiao", "叉": "cha", "淡": "dan", "倒": "dao", "相": "xiang",
    "白": "bai", "粉": "fen", "锯": "ju", "顺": "shun", "歌": "ge", "专": "zhuan",
    "辑": "ji", "艺": "yi", "库": "ku", "在": "zai", "媒": "mei", "荐": "jian",
    "个": "ge", "似": "si", "热": "re", "门": "men", "我": "wo", "的": "de",
    "下": "xia", "评": "ping", "论": "lun", "赞": "zan", "员": "yuan", "付": "fu",
    "费": "fei", "订": "ding", "阅": "yue", "免": "mian", "听": "ting", "觉": "jue",
    "词": "ci", "迷": "mi", "你": "ni", "锁": "suo", "睡": "shui", "眠": "mian",
    "社": "she", "礼": "li", "物": "wu", "赠": "zeng", "送": "song", "赏": "shang",
    "众": "zhong", "筹": "chou", "慈": "ci", "善": "shan", "权": "quan", "授": "shou",
    "许": "xu", "证": "zheng", "侵": "qin", "维": "wei", "律": "lv", "税": "shui",
    "商": "shang", "业": "ye", "营": "ying", "销": "xiao", "现": "xian", "创": "chuang",
    "投": "tou", "融": "rong", "市": "shi", "金": "jin", "财": "cai", "险": "xian",
    "托": "tuo", "银": "yin", "付": "fu", "结": "jie", "账": "zhang", "统": "tong",
    "据": "ju", "学": "xue", "习": "xi", "神": "shen", "经": "jing", "自": "zi",
    "然": "ran", "语": "yu", "言": "yan", "区": "qu", "块": "kuai", "链": "lian",
    "元": "yuan", "宇": "yu", "宙": "zhou", "增": "zeng", "强": "qiang", "物": "wu",
    "联": "lian", "家": "jia", "居": "ju", "穿": "chuan", "戴": "dai", "汽": "qi",
    "车": "che", "驾": "jia", "驶": "shi", "城": "cheng", "医": "yi", "疗": "liao",
    "育": "yu", "农": "nong", "造": "zao", "零": "ling", "售": "shou", "源": "yuan",
    "环": "huan", "碳": "tan", "绿": "lv", "太": "tai", "阳": "yang", "水": "shui",
    "核": "he", "氢": "qing", "储": "chu", "共": "gong", "约": "yue", "租": "zu",
    "公": "gong", "铁": "tie", "飞": "fei", "火": "huo", "船": "chuan", "骑": "qi",
    "跑": "pao", "健": "jian", "身": "shen", "瑜": "yu", "伽": "ga", "冥": "ming",
    "想": "xiang", "念": "nian", "雨": "yu", "海": "hai", "浪": "lang", "森": "sen",
    "林": "lin", "鸟": "niao", "鸣": "ming", "溪": "xi", "篝": "gou", "铃": "ling",
};

/**
 * 判断是否为纯 ASCII 字母（可能是拼音输入）
 * @param {string} text
 * @returns {boolean}
 */
function isAsciiPinyin(text) {
    return /^[a-zA-Z]+$/.test(text);
}

/**
 * 判断字符是否为中文汉字
 * @param {string} char
 * @returns {boolean}
 */
function isChineseChar(char) {
    return /[\u4e00-\u9fff]/.test(char);
}

/**
 * 从积木类型列表中提取所有独特的汉字
 * @param {Array} blockTypes - BlockTypeInfo 数组
 * @returns {Set<string>} 独特汉字集合
 */
function extractChineseChars(blockTypes) {
    const chars = new Set();
    for (const bt of blockTypes) {
        for (const part of bt.parts) {
            if (typeof part === 'string') {
                for (const ch of part) {
                    if (isChineseChar(ch)) {
                        chars.add(ch);
                    }
                }
            }
        }
    }
    return chars;
}

/**
 * 从积木中提取文字，去重后建立拼音→汉字反向索引
 * @param {Array} blockTypes - BlockTypeInfo 数组
 * @returns {Map<string, string[]>} 拼音 → 汉字列表
 */
function buildPinyinIndex(blockTypes) {
    const chars = extractChineseChars(blockTypes);
    /** @type {Map<string, string[]>} */
    const pinyinIndex = new Map();

    for (const ch of chars) {
        const py = PINYIN_MAP[ch];
        if (py) {
            if (!pinyinIndex.has(py)) {
                pinyinIndex.set(py, []);
            }
            pinyinIndex.get(py).push(ch);
        }
    }
    return pinyinIndex;
}

/**
 * 将拼音字符串分割为可能的拼音音节组合
 * 例如 "jiangshu" → [["jiang", "shu"]]
 * @param {string} pinyin
 * @returns {string[][]}
 */
function segmentPinyin(pinyin) {
    const lower = pinyin.toLowerCase();
    const results = [];

    function backtrack(start, path) {
        if (start >= lower.length) {
            results.push([...path]);
            return;
        }
        // 尝试最长匹配（6个字母内）
        for (let end = Math.min(start + 6, lower.length); end > start; end--) {
            const seg = lower.substring(start, end);
            if (PINYIN_MAP_HAS.has(seg)) {
                path.push(seg);
                backtrack(end, path);
                path.pop();
            }
        }
    }

    backtrack(0, []);
    return results;
}

// 预构建拼音音节存在性 Set（用于快速分割）
const PINYIN_MAP_HAS = new Set(Object.values(PINYIN_MAP));

/**
 * 将拼音查询扩展为可能的汉字查询
 * 例如 "jiang" → ["将", "讲", "江", "降", "奖", ...]
 * 例如 "jiangshu" → ["讲述", ...]
 * @param {string} query - 拼音查询字符串
 * @param {Map<string, string[]>} pinyinIndex - 拼音→汉字映射
 * @returns {string[]} 扩展后的查询字符串列表
 */
function expandPinyinQuery(query, pinyinIndex) {
    const lower = query.toLowerCase().trim();
    if (!lower) return [];

    // 单字拼音
    if (pinyinIndex.has(lower)) {
        return pinyinIndex.get(lower);
    }

    // 多字拼音：分割
    const segments = segmentPinyin(lower);
    if (segments.length === 0) return [];

    const results = [];
    for (const segList of segments) {
        // 检查每个音节是否都有对应的汉字
        let valid = true;
        const charLists = [];
        for (const seg of segList) {
            const chars = pinyinIndex.get(seg);
            if (!chars || chars.length === 0) {
                valid = false;
                break;
            }
            charLists.push(chars);
        }
        if (!valid) continue;

        // 生成笛卡尔积
        function cartesian(lists, idx, current) {
            if (idx === lists.length) {
                results.push(current.join(''));
                return;
            }
            for (const ch of lists[idx]) {
                cartesian(lists, idx + 1, current + ch);
            }
        }
        cartesian(charLists, 0, '');
    }

    return results;
}

/**
 * 提取单个 BlockTypeInfo 中所有汉字的拼音首字母缩写
 * 例如 parts 含 "计算" → "js"
 * @param {object} blockType - BlockTypeInfo 实例（含 parts 数组）
 * @returns {string} 首字母缩写（小写）
 */
function getInitialsOfBlockType(blockType) {
    let initials = '';
    const parts = blockType.parts;
    if (!parts) return initials;
    for (const part of parts) {
        if (typeof part !== 'string') continue;
        for (const ch of part) {
            if (!isChineseChar(ch)) continue;
            const py = PINYIN_MAP[ch];
            if (py) initials += py[0];
        }
    }
    return initials.toLowerCase();
}

/**
 * 构建首字母索引：缩写（如 "js"）→ BlockTypeInfo 列表
 * @param {Array} blockTypes - BlockTypeInfo 数组
 * @returns {Map<string, object[]>}
 */
function buildInitialIndex(blockTypes) {
    const map = new Map();
    for (const bt of blockTypes) {
        const initials = getInitialsOfBlockType(bt);
        if (!initials) continue;
        if (!map.has(initials)) map.set(initials, []);
        map.get(initials).push(bt);
    }
    return map;
}

/**
 * 首字母匹配：用户输入拼音缩写（如 "js"）时，模糊匹配积木汉字的拼音首字母（如 "计算" → "js"）
 * 支持包含匹配与起始匹配
 * @param {string} query - 用户输入的 ASCII 缩写
 * @param {Map<string, object[]>} initialIndex - 缩写索引
 * @returns {object[]} 匹配的 BlockTypeInfo 列表（已去重）
 */
function matchInitialQuery(query, initialIndex) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return [];
    const seen = new Set();
    const results = [];
    for (const [initials, bts] of initialIndex) {
        if (!initials) continue;
        if (initials.includes(q) || q.startsWith(initials)) {
            for (const bt of bts) {
                const key = bt.id || bt.type || bt;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push(bt);
                }
            }
        }
    }
    return results;
}

export {
    isAsciiPinyin,
    extractChineseChars,
    buildPinyinIndex,
    expandPinyinQuery,
    buildInitialIndex,
    matchInitialQuery,
    PINYIN_MAP
};
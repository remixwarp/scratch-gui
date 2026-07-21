const ACHIEVEMENT_DEFINITIONS = [
    {
        id: 'ai-conversation',
        category: '进阶难度',
        name: 'AI？',
        description: '与 AI Agent 或 AI Chat 对话'
    },
    {
        id: 'sponsor',
        category: '彩蛋成就',
        name: '赞助商',
        description: '赞助 rw'
    },
    {
        id: 'competitor-research',
        category: '彩蛋成就',
        name: '了解友商',
        description: '询问 AI 什么是 rw、bilup、02e、ae 等'
    },
    {
        id: 'sixty-fps',
        category: '彩蛋成就',
        name: '提高效率！',
        description: '开启 60 帧'
    },
    {
        id: 'high-framerate',
        category: '彩蛋成就',
        name: '效率过高...',
        description: '开启超过 200 帧的自定义帧率'
    },
    {
        id: 'larger-stage',
        category: '进阶成就',
        name: '扩大舞台',
        description: '将舞台大小调至超过 480 × 360'
    },
    {
        id: 'collaboration-chat',
        category: '硬核难度',
        name: '启动聊天模式',
        description: '在实时协作中用“/”召出对话框并输入文字'
    },
    {
        id: 'unstable-nuke',
        category: '彩蛋成就',
        name: '不稳定核弹',
        description: '帧率上限不低于 30 帧时，连续 5 秒实际帧率低于 10 帧'
    },
    {
        id: 'chat-overflow',
        category: '彩蛋成就',
        name: '塞不下了......',
        description: '实时协作聊天框文字超过 500 字上限'
    },
    {
        id: 'classic-remake',
        category: '基础成就',
        name: '经典复刻',
        description: '用积木复刻一个经典玩法'
    },
    {
        id: 'classic-remake-cn',
        category: '基础成就',
        name: '经典复刻：中国版',
        description: '用中文命名的积木项目复刻经典玩法'
    },
    {
        id: 'dizzy',
        category: '基础成就',
        name: '晕头转向',
        description: '让角色旋转起来'
    },
    {
        id: 'first-steps',
        category: '基础成就',
        name: '初试啼声',
        description: '第一次运行积木项目'
    },
    {
        id: 'costume-master',
        category: '基础成就',
        name: '换装大师',
        description: '切换或编辑角色造型'
    },
    {
        id: 'movement-pro',
        category: '基础成就',
        name: '移动健将',
        description: '使用运动积木控制角色'
    },
    {
        id: 'variables-intro',
        category: '基础成就',
        name: '变量初探',
        description: '创建并使用变量'
    },
    {
        id: 'broadcast-pioneer',
        category: '基础成就',
        name: '广播先锋',
        description: '发送并接收广播'
    },
    {
        id: 'backdrop-switch',
        category: '基础成就',
        name: '背景切换',
        description: '切换舞台背景'
    },
    {
        id: 'mouse-follower',
        category: '基础成就',
        name: '鼠标跟随',
        description: '让角色跟随鼠标'
    },
    {
        id: 'keyboard-dancer',
        category: '基础成就',
        name: '键盘舞者',
        description: '响应键盘输入'
    },
    {
        id: 'size-transform',
        category: '基础成就',
        name: '大小变换',
        description: '改变角色大小'
    },
    {
        id: 'spin-jump',
        category: '基础成就',
        name: '旋转跳跃',
        description: '同时使用旋转与移动积木'
    },
    {
        id: 'clone-intro',
        category: '进阶成就',
        name: '克隆初体验',
        description: '创建并处理克隆体'
    },
    {
        id: 'sound-control',
        category: '进阶成就',
        name: '声音控制',
        description: '使用声音积木'
    },
    {
        id: 'ask-interact',
        category: '进阶成就',
        name: '提问互动',
        description: '向玩家提问并读取回答'
    },
    {
        id: 'list-expert',
        category: '进阶成就',
        name: '列表达人',
        description: '创建并操作列表'
    },
    {
        id: 'hi-hi-hi',
        category: '进阶成就',
        name: '嗨嗨嗨！',
        description: '让角色连续说三次话'
    },
    {
        id: 'nested-loops',
        category: '进阶成就',
        name: '循环嵌套',
        description: '在循环中再使用循环'
    },
    {
        id: 'condition-branch',
        category: '进阶成就',
        name: '条件分支',
        description: '使用如果/否则分支'
    },
    {
        id: 'random-walk',
        category: '进阶成就',
        name: '随机漫步',
        description: '用随机数驱动角色移动'
    },
    {
        id: 'pen-trail',
        category: '进阶成就',
        name: '画笔留痕',
        description: '使用画笔扩展绘制轨迹'
    },
    {
        id: 'collision-detect',
        category: '进阶成就',
        name: '侦测碰撞',
        description: '检测角色碰撞'
    },
    {
        id: 'music-producer',
        category: '进阶成就',
        name: '音乐制作人',
        description: '使用音乐扩展'
    },
    {
        id: 'translator',
        category: '进阶成就',
        name: '翻译官',
        description: '使用翻译扩展'
    },
    {
        id: 'video-sensing',
        category: '进阶成就',
        name: '视频侦测',
        description: '使用视频侦测扩展'
    },
    {
        id: 'custom-function',
        category: '进阶成就',
        name: '自定义函数',
        description: '定义并调用自定义积木'
    },
    {
        id: 'coordinate-math',
        category: '进阶成就',
        name: '坐标计算',
        description: '计算并设置坐标'
    },
    {
        id: 'string-join',
        category: '进阶成就',
        name: '字符串拼接',
        description: '拼接文本'
    },
    {
        id: 'clone-cleanup',
        category: '进阶成就',
        name: '克隆体清理',
        description: '删除克隆体'
    },
    {
        id: 'timer-challenge',
        category: '进阶成就',
        name: '计时挑战',
        description: '使用计时器完成挑战'
    },
    {
        id: 'stamp-master',
        category: '进阶成就',
        name: '图章大师',
        description: '使用画笔图章'
    },
    {
        id: 'effects-maxed',
        category: '进阶成就',
        name: '特效拉满',
        description: '组合使用多个图形特效'
    },
    {
        id: 'block-maniac',
        category: '硬核难度',
        name: '积木狂魔',
        description: '项目中放入大量积木'
    },
    {
        id: 'extreme-compression',
        category: '硬核难度',
        name: '极限压缩',
        description: '用极少积木完成完整交互'
    },
    {
        id: 'memory-assassin',
        category: '硬核难度',
        name: '内存刺客',
        description: '大量创建克隆体'
    },
    {
        id: 'pixel-tweak',
        category: '硬核难度',
        name: '像素级微调',
        description: '使用小数坐标或大小'
    },
    {
        id: 'global-variable-network',
        category: '硬核难度',
        name: '全局变量网',
        description: '用多个全局变量连接角色逻辑'
    },
    {
        id: 'broadcast-storm',
        category: '硬核难度',
        name: '广播风暴',
        description: '构建大量广播通信'
    },
    {
        id: 'nested-hell',
        category: '硬核难度',
        name: '嵌套地狱',
        description: '构建深层嵌套控制结构'
    },
    {
        id: 'seamless-loop',
        category: '硬核难度',
        name: '无缝循环',
        description: '用循环维持连续行为'
    },
    {
        id: 'state-machine',
        category: '硬核难度',
        name: '状态机大师',
        description: '用变量和广播管理状态'
    },
    {
        id: 'physics-engine',
        category: '硬核难度',
        name: '物理引擎',
        description: '用变量模拟速度、重力或碰撞'
    },
    {
        id: 'code-cleanliness',
        category: '硬核难度',
        name: '代码洁癖',
        description: '保持项目结构清晰'
    },
    {
        id: 'ultimate-reuse',
        category: '硬核难度',
        name: '终极复用',
        description: '多次复用自定义积木'
    },
    {
        id: 'give-up-treatment',
        category: '彩蛋成就',
        name: '放弃治疗',
        description: '在项目中堆叠过多复杂逻辑'
    },
    {
        id: 'restored-sprite',
        category: '入门难度',
        name: '你好！',
        description: '复原删除的角色'
    },
    {
        id: 'tutorial-favorite',
        category: '入门难度',
        name: '吃灰去吧！',
        description: '在视频教程中收藏一个视频'
    },
    {
        id: 'colorful',
        category: '入门难度',
        name: '色彩斑斓',
        description: '在绘画编辑器中使用至少 5 种不同的颜色'
    },
    {
        id: 'now-good',
        category: '进阶难度',
        name: '现在好了',
        description: '删除一条超过 20 块积木的积木链'
    },
    {
        id: 'collaboration-room',
        category: '进阶难度',
        name: '天涯若比邻',
        description: '创建或连接一个团队协作房间'
    },
    {
        id: 'backpack-dust',
        category: '彩蛋难度',
        name: '在哪儿呢？',
        description: '书包打开超过 5 秒'
    },
    {
        id: 'use-draft',
        category: '彩蛋难度',
        name: '用初稿吧！',
        description: '连续点击画布中的撤销'
    },
    {
        id: 'turbo-time',
        category: '彩蛋难度',
        name: '时间都去哪儿了？',
        description: '打开加速模式'
    },
    {
        id: 'naming-obsession',
        category: '彩蛋难度',
        name: '命名强迫症',
        description: '至少重命名 5 个资源'
    },
    {
        id: 'fullscreen-maniac',
        category: '彩蛋难度',
        name: '全屏狂魔',
        description: '连续切换全屏超过 5 次'
    },
    {
        id: 'drag-master',
        category: '彩蛋难度',
        name: '拖拽大师',
        description: '反复拖动同一积木且不运行'
    },
    {
        id: 'invalid-search',
        category: '彩蛋难度',
        name: '无效搜索',
        description: '搜索不存在的积木名称并等待 5 秒'
    },
    {
        id: 'buddhist-developer',
        category: '彩蛋难度',
        name: '佛系开发者',
        description: '打开编辑器后 10 分钟未添加积木'
    },
    {
        id: 'stop-spammer',
        category: '彩蛋难度',
        name: '破坏王',
        description: '运行时连续点击停止按钮超过 10 次'
    },
    {
        id: 'copy-paste',
        category: '彩蛋难度',
        name: '复制粘贴',
        description: '复制并粘贴积木超过 20 次'
    },
    {
        id: 'late-night-coding',
        category: '彩蛋难度',
        name: '深夜编程',
        description: '在凌晨 0 点至 4 点打开或保存项目'
    },
    {
        id: 'exact-origin',
        category: '彩蛋难度',
        name: '强迫症晚期',
        description: '将角色精确移动到 x:0、y:0'
    },
    {
        id: 'instant-default-delete',
        category: '彩蛋难度',
        name: '露头就秒',
        description: '编辑器加载后 3 秒内删除默认角色'
    }
];

const ACHIEVEMENT_METADATA = {
    'ai-conversation': ['系统交互', '进阶', 'AI？', '与AI Agent或AI Chat对话'],
    'sponsor': ['趣味彩蛋', '彩蛋', '赞助商', '赞助rw'],
    'competitor-research': ['系统交互', '彩蛋', '了解友商', '询问AI什么是rw/bilup/02e/ae/...'],
    'sixty-fps': ['技术操作', '彩蛋', '提高效率！', '开启60帧'],
    'high-framerate': ['技术操作', '彩蛋', '效率过高...', '开启自定义帧率且帧率上限大于200'],
    'larger-stage': ['技术操作', '进阶', '扩大舞台', '改变舞台的大小（大于480x360）'],
    'collaboration-chat': ['协作与社区', '硬核', '启动聊天模式', '在实时协作下使用“/”召出对话框并输入文字'],
    'unstable-nuke': ['趣味彩蛋', '彩蛋', '不稳定核弹', '在帧率上限为30帧以上的条件下连续5秒帧率小于10帧'],
    'chat-overflow': ['协作与社区', '彩蛋', '塞不下了......', '实时协作聊天框文字超过上限（500字）'],
    'classic-remake': ['技术操作', '入门', '经典复刻', '在说积木中填写“Hello World!”'],
    'classic-remake-cn': ['技术操作', '入门', '经典复刻：中国版', '在说积木中填写“你好，世界！”'],
    'dizzy': ['逻辑编程', '入门', '晕头转向', '在重复执行积木中嵌套左转、右转积木并运行'],
    'first-steps': ['创意设计', '入门', '初试啼声', '添加一个声音到角色中'],
    'costume-master': ['创意设计', '入门', '换装大师', '为角色添加至少3个造型'],
    'movement-pro': ['技术操作', '入门', '移动健将', '使用“移动10步”积木超过10次'],
    'variables-intro': ['逻辑编程', '入门', '变量初探', '创建一个变量并在舞台上显示它'],
    'broadcast-pioneer': ['逻辑编程', '入门', '广播先锋', '发送并接收一次广播消息'],
    'backdrop-switch': ['创意设计', '入门', '背景切换', '在项目中添加至少2个不同的背景'],
    'mouse-follower': ['逻辑编程', '入门', '鼠标跟随', '让角色的坐标跟随鼠标的x和y坐标'],
    'keyboard-dancer': ['技术操作', '入门', '键盘舞者', '使用“当按下空格键”触发一次脚本'],
    'size-transform': ['技术操作', '入门', '大小变换', '将角色的大小设置为50%以下或200%以上'],
    'spin-jump': ['技术操作', '入门', '旋转跳跃', '使用“将旋转模式设为左右翻转”并移动角色'],
    'clone-intro': ['逻辑编程', '入门', '克隆初体验', '使用“克隆自己”积木生成第一个克隆体'],
    'sound-control': ['技术操作', '入门', '声音控制', '将角色的音量设置为0'],
    'ask-interact': ['系统交互', '入门', '提问互动', '使用“询问...并等待”积木获取一次用户输入'],
    'list-expert': ['逻辑编程', '入门', '列表达人', '创建一个列表并添加至少5个物品'],
    'hi-hi-hi': ['逻辑编程', '进阶', '嗨嗨嗨！', '在重复执行积木中嵌套克隆积木并运行'],
    'nested-loops': ['逻辑编程', '进阶', '循环嵌套', '在一个循环积木内部嵌套另一个循环积木并运行'],
    'condition-branch': ['逻辑编程', '进阶', '条件分支', '使用“如果...那么...否则”积木做出至少3次判断'],
    'random-walk': ['逻辑编程', '进阶', '随机漫步', '使用“在1和10之间取随机数”让角色随机移动'],
    'pen-trail': ['创意设计', '进阶', '画笔留痕', '使用画笔积木在舞台上画出至少一个封闭图形'],
    'collision-detect': ['逻辑编程', '进阶', '侦测碰撞', '使用“碰到颜色...”或“碰到边缘就反弹”完成一次逻辑'],
    'music-producer': ['创意设计', '进阶', '音乐制作人', '使用音乐扩展积木播放一段包含至少5个音符的旋律'],
    'translator': ['系统交互', '进阶', '翻译官', '使用翻译扩展积木将一段中文翻译成英文并说出来'],
    'video-sensing': ['系统交互', '进阶', '视频侦测', '使用视频侦测扩展，当视频运动大于某个值时触发脚本'],
    'custom-function': ['逻辑编程', '进阶', '自定义函数', '创建一个“自制积木”（函数）并至少调用3次'],
    'coordinate-math': ['逻辑编程', '进阶', '坐标计算', '使用数学运算（加减乘除）计算角色的目标坐标'],
    'string-join': ['技术操作', '进阶', '字符串拼接', '使用“连接...和...”积木拼接出长度超过20的字符串'],
    'clone-cleanup': ['逻辑编程', '进阶', '克隆体清理', '使用“删除此克隆体”积木清理超过20个克隆体'],
    'timer-challenge': ['技术操作', '进阶', '计时挑战', '使用“计时器”积木记录一段超过10秒的时间'],
    'stamp-master': ['创意设计', '进阶', '图章大师', '使用“图章”积木在舞台上留下超过50个图章'],
    'effects-maxed': ['创意设计', '进阶', '特效拉满', '将角色的“虚影”或“颜色”特效设置为100'],
    'block-maniac': ['逻辑编程', '硬核', '积木狂魔', '单个角色的脚本区积木数量超过200块'],
    'extreme-compression': ['逻辑编程', '硬核', '极限压缩', '在不使用自定义函数的情况下，用少于10块积木实现复杂的数学计算'],
    'memory-assassin': ['逻辑编程', '硬核', '内存刺客', '同时生成并维持300个克隆体（达到系统上限）'],
    'pixel-tweak': ['技术操作', '硬核', '像素级微调', '将角色的x或y坐标精确到小数点后三位'],
    'global-variable-network': ['逻辑编程', '硬核', '全局变量网', '在项目中创建超过20个不同的变量或列表'],
    'broadcast-storm': ['逻辑编程', '硬核', '广播风暴', '在一秒内发送超过10条不同的广播消息'],
    'nested-hell': ['逻辑编程', '硬核', '嵌套地狱', '将条件判断或循环积木嵌套超过5层'],
    'seamless-loop': ['技术操作', '硬核', '无缝循环', '利用“停止其他脚本”和“等待0秒”实现完美的无缝音频循环'],
    'state-machine': ['逻辑编程', '硬核', '状态机大师', '使用变量和广播实现一个包含至少5个状态的复杂状态机'],
    'physics-engine': ['逻辑编程', '硬核', '物理引擎', '不使用任何物理扩展，纯用基础积木模拟出带重力和摩擦力的抛物线运动'],
    'code-cleanliness': ['技术操作', '硬核', '代码洁癖', '将超过50个积木的脚本全部整理对齐，没有任何重叠或超出边界'],
    'ultimate-reuse': ['逻辑编程', '硬核', '终极复用', '将同一个自制积木在至少10个不同的角色中调用'],
    'give-up-treatment': ['趣味彩蛋', '彩蛋', '放弃治疗', '在连续运行失败5次后，直接删除整个脚本'],
    'restored-sprite': ['技术操作', '入门', '你好！', '复原删除的角色'],
    'tutorial-favorite': ['系统交互', '入门', '吃灰去吧！', '在“视频教程”中收藏一个视频'],
    'colorful': ['创意设计', '入门', '色彩斑斓', '在绘画编辑器中使用至少5种不同的颜色'],
    'now-good': ['技术操作', '进阶', '现在好了', '把一个积木点数超过20的积木链删除'],
    'collaboration-room': ['协作与社区', '进阶', '天涯若比邻', '连接一个团队协作房间（包括创建）'],
    'backpack-dust': ['趣味彩蛋', '彩蛋', '在哪儿呢？', '书包打开超过5秒'],
    'use-draft': ['趣味彩蛋', '彩蛋', '用初稿吧！', '连续点击画布中的“撤销”'],
    'turbo-time': ['趣味彩蛋', '彩蛋', '时间都去哪儿了？', '打开加速模式'],
    'naming-obsession': ['技术操作', '彩蛋', '命名强迫症', '将至少5个资源（角色/造型/声音/变量）重命名'],
    'fullscreen-maniac': ['系统交互', '彩蛋', '全屏狂魔', '在舞台区连续点击全屏/退出全屏按钮超过5次'],
    'drag-master': ['系统交互', '彩蛋', '拖拽大师', '将同一个积木在脚本区拖拽移动超过50次而不运行'],
    'invalid-search': ['系统交互', '彩蛋', '无效搜索', '在积木区搜索框中输入一个不存在的积木名称并等待5秒'],
    'buddhist-developer': ['趣味彩蛋', '彩蛋', '佛系开发者', '打开编辑器后超过10分钟没有添加任何一块积木'],
    'stop-spammer': ['系统交互', '彩蛋', '破坏王', '在运行状态下，连续点击“停止”按钮超过10次'],
    'copy-paste': ['技术操作', '彩蛋', '复制粘贴', '使用快捷键（Ctrl+C / Ctrl+V）复制并粘贴积木超过20次'],
    'late-night-coding': ['趣味彩蛋', '彩蛋', '深夜编程', '在系统时间凌晨0点到4点之间打开或保存项目'],
    'exact-origin': ['技术操作', '彩蛋', '强迫症晚期', '将画布中的角色精确移动到x:0, y:0的位置'],
    'instant-default-delete': ['趣味彩蛋', '彩蛋', '露头就秒', '在编辑器成功加载后的三秒内删除默认角色'],
    'hesitate': ['趣味彩蛋', '彩蛋', '欲言又止', '创建注释后三秒内删除该注释'],
    'error-restore': ['趣味彩蛋', '彩蛋', '为什么会变成这样呢？', '由报错了入额外的还原点恢复页面'],
    'achievement-hunter': ['趣味彩蛋', '彩蛋', '你是来完成成就的吧', '打开成就窗口'],
    'scratcher': ['逻辑编程', '彩蛋', 'Scratcher！', '说积木数量达到15个以上'],
    'captcha-human': ['系统交互', '彩蛋', '我还是人类吗？', '人机验证连续3次未通过'],
    'object-ran': ['趣味彩蛋', '彩蛋', '对象跑了（面向对象编程）', '重复执行中嵌套移动步数']
};

const createAchievement = (id, metadata) => ({
    id,
    type: metadata[0],
    difficulty: metadata[1],
    name: metadata[2],
    description: metadata[3]
});

export const ACHIEVEMENTS = [
    ...ACHIEVEMENT_DEFINITIONS.map(achievement => (
        createAchievement(achievement.id, ACHIEVEMENT_METADATA[achievement.id])
    )),
    ...['hesitate', 'error-restore', 'achievement-hunter', 'scratcher', 'captcha-human', 'object-ran']
        .map(id => createAchievement(id, ACHIEVEMENT_METADATA[id]))
];

const STORAGE_KEY = 'rw:achievements';
const ENABLED_STORAGE_KEY = 'rw:achievements-enabled';
const EXPERIENCE_STORAGE_KEY = 'rw:achievement-experience';
const UNLOCK_EVENT = 'rw-achievement-unlocked';
let lowFramerateSince = null;

export const getAchievementExperience = () => localStorage.getItem(EXPERIENCE_STORAGE_KEY);

export const isAchievementsEnabled = () => localStorage.getItem(ENABLED_STORAGE_KEY) === 'true';

export const setAchievementsEnabled = enabled => {
    localStorage.setItem(ENABLED_STORAGE_KEY, String(Boolean(enabled)));
    window.dispatchEvent(new CustomEvent('rw-achievements-settings-changed', {
        detail: {enabled: Boolean(enabled)}
    }));
};

export const selectAchievementExperience = experience => {
    localStorage.setItem(EXPERIENCE_STORAGE_KEY, experience);
    setAchievementsEnabled(experience === 'sc-newbie');
};

const getStoredIds = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        return [];
    }
};

export const getUnlockedAchievementIds = () => getStoredIds();

export const unlockAchievement = id => {
    const achievement = ACHIEVEMENTS.find(item => item.id === id);
    if (!achievement || typeof window === 'undefined' || !isAchievementsEnabled()) return false;

    const unlockedIds = getStoredIds();
    if (unlockedIds.includes(id)) return false;

    const nextIds = [...unlockedIds, id];
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
    } catch (e) {
        return false;
    }

    window.dispatchEvent(new CustomEvent(UNLOCK_EVENT, {
        detail: {achievement, unlockedIds: nextIds}
    }));
    return true;
};

const isCompetitorQuestion = message => {
    const normalized = message.toLowerCase();
    const mentionsCompetitor = /\b(rw|bilup|02e|ae)\b|remixwarp|bil(?:up|me)|a[ei]编辑器/.test(normalized);
    const asksAboutIt = /什么是|是什么|介绍|了解|谁是|what is|tell me about|about/.test(normalized);
    return mentionsCompetitor && asksAboutIt;
};

export const recordAIConversation = message => {
    unlockAchievement('ai-conversation');
    if (isCompetitorQuestion(message)) {
        unlockAchievement('competitor-research');
    }
};

export const recordFramerateChange = (framerate, isCustom) => {
    if (isCustom && framerate > 200) {
        unlockAchievement('high-framerate');
    } else if (!isCustom && framerate === 60) {
        unlockAchievement('sixty-fps');
    }
};

export const recordStageSize = (width, height) => {
    if (width > 480 || height > 360) {
        unlockAchievement('larger-stage');
    }
};

export const recordCollaborationChatInput = () => unlockAchievement('collaboration-chat');

export const recordCollaborationChatOverflow = () => unlockAchievement('chat-overflow');

export const recordActualFramerate = (actualFps, maxFps) => {
    if (maxFps >= 30 && actualFps < 10) {
        if (lowFramerateSince === null) {
            lowFramerateSince = Date.now();
        } else if (Date.now() - lowFramerateSince >= 5000) {
            unlockAchievement('unstable-nuke');
            lowFramerateSince = null;
        }
        return;
    }
    lowFramerateSince = null;
};

export const recordSponsorIntent = () => unlockAchievement('sponsor');

export {UNLOCK_EVENT};

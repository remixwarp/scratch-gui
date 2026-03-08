import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './ai-panel.css';
import Button from '../button/button.jsx';
import MarkdownRenderer from '../markdown-renderer/markdown-renderer.jsx';

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
            error: null,
            // 多步骤AI Agent状态
            multiStepMode: false,
            currentStep: 0,
            totalSteps: 4,
            stepStatus: ['pending', 'pending', 'pending', 'pending'], // pending, running, completed, error
            stepContext: {}, // 存储各步骤的上下文
            progressExpanded: true // 创作进度展开/收起状态
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSend = this.handleSend.bind(this);
        this.handleConvertToProject = this.handleConvertToProject.bind(this);
        this.handleMultiStepStart = this.handleMultiStepStart.bind(this);
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
        const {type} = this.props;
        if (!input) return;
        
        const isAgent = type === 'agent';
        
        // AI Agent的系统提示词，包含Scratch积木的完整信息
        const agentSystemPrompt = `你是RemixWarp的AI Agent助手，专门帮助用户编写Scratch项目。

## Scratch积木JSON格式参考

### 项目基本结构
{"targets":[{"isStage":true,"name":"Stage","variables":{},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"name":"背景1","dataFormat":"svg","assetId":"cd21514d0531fdffb22204e0ec5ed84a","md5ext":"cd21514d0531fdffb22204e0ec5ed84a.svg","rotationCenterX":240,"rotationCenterY":180}],"sounds":[],"volume":100,"layerOrder":0,"tempo":60,"videoTransparency":50,"videoState":"on","textToSpeechLanguage":null},{"isStage":false,"name":"角色1","variables":{},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,"costumes":[{"name":"造型1","dataFormat":"svg","assetId":"default_sprite","md5ext":"default_sprite.svg","rotationCenterX":50,"rotationCenterY":50}],"sounds":[],"volume":100,"layerOrder":1,"visible":true,"x":0,"y":0,"size":100,"direction":90,"draggable":false,"rotationStyle":"all around"}],"monitors":[],"extensions":[],"meta":{"semver":"3.0.0","vm":"0.2.0","agent":"Mozilla/5.0"}}

### 重要格式说明
- variables格式：{"变量ID": ["变量名", 初始值]}，例如：{"VAR_ID": ["我的变量", 0]}
- lists格式：{"列表ID": ["列表名", []]}，例如：{"LIST_ID": ["我的列表", []]}
- broadcasts格式：{"广播ID": "广播消息"}，例如：{"BROADCAST_ID": "消息1"}
- 变量ID和列表ID必须使用特殊格式：反引号开头，中间包含特殊字符，以反引号结尾，例如：VAR_ID
- 注意：在实际JSON中，变量ID和列表ID需要用反引号包裹，如：jEk@4|i[#Fk?(8x)AV.-my variable
- assetId格式：必须是32位的十六进制字符串（小写），例如：927d672925e7b99f7813735c484c6922
- md5ext格式：assetId加上文件扩展名，例如：927d672925e7b99f7813735c484c6922.svg

### 运动类积木JSON示例
- 移动10步: {"opcode":"motion_movesteps","next":null,"parent":null,"inputs":{"STEPS":[1,[4,"10"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 右转15度: {"opcode":"motion_turnright","next":null,"parent":null,"inputs":{"DEGREES":[1,[4,"15"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 左转15度: {"opcode":"motion_turnleft","next":null,"parent":null,"inputs":{"DEGREES":[1,[4,"15"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 移到随机位置: {"opcode":"motion_goto","next":null,"parent":null,"inputs":{"TO":[1,"_random_menu_"]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0} + {"opcode":"motion_goto_menu","next":null,"parent":"motion_goto_id","inputs":{},"fields":{"TO":["_random_",null]},"shadow":true,"topLevel":false}
- 移到x:0 y:0: {"opcode":"motion_gotoxy","next":null,"parent":null,"inputs":{"X":[1,[4,"0"]],"Y":[1,[4,"0"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 在1秒内滑行到x:0 y:0: {"opcode":"motion_glidesecstoxy","next":null,"parent":null,"inputs":{"SECS":[1,[4,"1"]],"X":[1,[4,"0"]],"Y":[1,[4,"0"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 面向90方向: {"opcode":"motion_pointindirection","next":null,"parent":null,"inputs":{"DIRECTION":[1,[8,"90"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 面向鼠标指针: {"opcode":"motion_pointtowards","next":null,"parent":null,"inputs":{"TOWARDS":[1,"_mouse_menu_"]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 将x坐标增加10: {"opcode":"motion_changexby","next":null,"parent":null,"inputs":{"DX":[1,[4,"10"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 将x坐标设为0: {"opcode":"motion_setx","next":null,"parent":null,"inputs":{"X":[1,[4,"0"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 碰到边缘就反弹: {"opcode":"motion_ifonedgebounce","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 将旋转方式设为左右翻转: {"opcode":"motion_setrotationstyle","next":null,"parent":null,"inputs":{},"fields":{"STYLE":["left-right",null]},"shadow":false,"topLevel":true,"x":0,"y":0}（注意：STYLE在fields中，不在inputs中）

### 外观类积木JSON示例
- 说你好2秒: {"opcode":"looks_sayforsecs","next":null,"parent":null,"inputs":{"MESSAGE":[1,[10,"你好！"]],"SECS":[1,[4,"2"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 说你好: {"opcode":"looks_say","next":null,"parent":null,"inputs":{"MESSAGE":[1,[10,"你好！"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 思考嗯2秒: {"opcode":"looks_thinkforsecs","next":null,"parent":null,"inputs":{"MESSAGE":[1,[10,"嗯……"]],"SECS":[1,[4,"2"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 换成造型1: {"opcode":"looks_switchcostumeto","next":null,"parent":null,"inputs":{"COSTUME":[1,"_costume_menu_"]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 下一个造型: {"opcode":"looks_nextcostume","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 换成背景1: {"opcode":"looks_switchbackdropto","next":null,"parent":null,"inputs":{"BACKDROP":[1,"_backdrop_menu_"]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 将大小增加10: {"opcode":"looks_changesizeby","next":null,"parent":null,"inputs":{"CHANGE":[1,[4,"10"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 将大小设为100: {"opcode":"looks_setsizeto","next":null,"parent":null,"inputs":{"SIZE":[1,[4,"100"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 将颜色特效增加25: {"opcode":"looks_changeeffectby","next":null,"parent":null,"inputs":{"CHANGE":[1,[4,"25"]]},"fields":{"EFFECT":["COLOR",null]},"shadow":false,"topLevel":true,"x":0,"y":0}
- 清除图形特效: {"opcode":"looks_cleargraphiceffects","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 显示: {"opcode":"looks_show","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 隐藏: {"opcode":"looks_hide","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 移到最前面: {"opcode":"looks_gotofrontback","next":null,"parent":null,"inputs":{},"fields":{"FRONT_BACK":["front",null]},"shadow":false,"topLevel":true,"x":0,"y":0}

### 事件类积木JSON示例
- 当绿旗被点击: {"opcode":"event_whenflagclicked","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 当按下空格键: {"opcode":"event_whenkeypressed","next":null,"parent":null,"inputs":{},"fields":{"KEY_OPTION":["space",null]},"shadow":false,"topLevel":true,"x":0,"y":0}
- 当角色被点击: {"opcode":"event_whenthisspriteclicked","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 当接收到消息1: {"opcode":"event_whenbroadcastreceived","next":null,"parent":null,"inputs":{},"fields":{"BROADCAST_OPTION":["消息1",null]},"shadow":false,"topLevel":true,"x":0,"y":0}
- 广播消息1: {"opcode":"event_broadcast","next":null,"parent":null,"inputs":{"BROADCAST_INPUT":[1,[10,"消息1"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 广播消息1并等待: {"opcode":"event_broadcastandwait","next":null,"parent":null,"inputs":{"BROADCAST_INPUT":[1,[10,"消息1"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}

### 控制类积木JSON示例
- 等待1秒: {"opcode":"control_wait","next":null,"parent":null,"inputs":{"DURATION":[1,[4,"1"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 重复执行10次: {"opcode":"control_repeat","next":null,"parent":null,"inputs":{"TIMES":[1,[4,"10"]],"SUBSTACK":[2,null]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 重复执行: {"opcode":"control_forever","next":null,"parent":null,"inputs":{"SUBSTACK":[2,null]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 如果那么: {"opcode":"control_if","next":null,"parent":null,"inputs":{"CONDITION":[2,null],"SUBSTACK":[2,null]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 如果那么否则: {"opcode":"control_if_else","next":null,"parent":null,"inputs":{"CONDITION":[2,null],"SUBSTACK":[2,null],"SUBSTACK2":[2,null]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 等待直到: {"opcode":"control_wait_until","next":null,"parent":null,"inputs":{"CONDITION":[2,null]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 重复执行直到: {"opcode":"control_repeat_until","next":null,"parent":null,"inputs":{"CONDITION":[2,null],"SUBSTACK":[2,null]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 停止全部脚本: {"opcode":"control_stop","next":null,"parent":null,"inputs":{},"fields":{"STOP_OPTION":["all",null]},"shadow":false,"topLevel":true,"x":0,"y":0}
- 克隆自己: {"opcode":"control_create_clone_of","next":null,"parent":null,"inputs":{"CLONE_OPTION":[1,"_myself_menu_"]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 当作为克隆体启动时: {"opcode":"control_start_as_clone","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 删除此克隆体: {"opcode":"control_delete_this_clone","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}

### 侦测类积木JSON示例
- 询问并等待: {"opcode":"sensing_askandwait","next":null,"parent":null,"inputs":{"QUESTION":[1,[10,"你叫什么名字？"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 回答: {"opcode":"sensing_answer","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 按下空格键: {"opcode":"sensing_keypressed","next":null,"parent":null,"inputs":{"KEY_OPTION":[1,"_space_menu_"]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 按下鼠标: {"opcode":"sensing_mousedown","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 鼠标的x坐标: {"opcode":"sensing_mousex","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 碰到鼠标指针: {"opcode":"sensing_touchingobject","next":null,"parent":null,"inputs":{"TOUCHINGOBJECTMENU":[1,"_mouse_menu_"]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 到鼠标指针的距离: {"opcode":"sensing_distanceto","next":null,"parent":null,"inputs":{"DISTANCETOMENU":[1,"_mouse_menu_"]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 计时器归零: {"opcode":"sensing_resettimer","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 计时器: {"opcode":"sensing_timer","next":null,"parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}

### 运算类积木JSON示例
- 加法: {"opcode":"operator_add","next":null,"parent":null,"inputs":{"NUM1":[1,[4,""]],"NUM2":[1,[4,""]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 减法: {"opcode":"operator_subtract","next":null,"parent":null,"inputs":{"NUM1":[1,[4,""]],"NUM2":[1,[4,""]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 乘法: {"opcode":"operator_multiply","next":null,"parent":null,"inputs":{"NUM1":[1,[4,""]],"NUM2":[1,[4,""]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 除法: {"opcode":"operator_divide","next":null,"parent":null,"inputs":{"NUM1":[1,[4,""]],"NUM2":[1,[4,""]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 随机数: {"opcode":"operator_random","next":null,"parent":null,"inputs":{"FROM":[1,[4,"1"]],"TO":[1,[4,"10"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 大于: {"opcode":"operator_gt","next":null,"parent":null,"inputs":{"OPERAND1":[1,[4,""]],"OPERAND2":[1,[4,"50"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 与: {"opcode":"operator_and","next":null,"parent":null,"inputs":{"OPERAND1":[2,null],"OPERAND2":[2,null]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 或: {"opcode":"operator_or","next":null,"parent":null,"inputs":{"OPERAND1":[2,null],"OPERAND2":[2,null]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 不成立: {"opcode":"operator_not","next":null,"parent":null,"inputs":{"OPERAND":[2,null]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}
- 连接字符串: {"opcode":"operator_join","next":null,"parent":null,"inputs":{"STRING1":[1,[10,"苹果"]],"STRING2":[1,[10,"香蕉"]]},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0}

### 变量类积木JSON示例
- 设置变量: {"opcode":"data_setvariableto","next":null,"parent":null,"inputs":{"VALUE":[1,[4,"0"]]},"fields":{"VARIABLE":["我的变量","VARIABLE_ID_PLACEHOLDER"]},"shadow":false,"topLevel":true,"x":0,"y":0}
- 增加变量: {"opcode":"data_changevariableby","next":null,"parent":null,"inputs":{"VALUE":[1,[4,"1"]]},"fields":{"VARIABLE":["我的变量","VARIABLE_ID_PLACEHOLDER"]},"shadow":false,"topLevel":true,"x":0,"y":0}
- 显示变量: {"opcode":"data_showvariable","next":null,"parent":null,"inputs":{},"fields":{"VARIABLE":["我的变量","VARIABLE_ID_PLACEHOLDER"]},"shadow":false,"topLevel":true,"x":0,"y":0}
- 隐藏变量: {"opcode":"data_hidevariable","next":null,"parent":null,"inputs":{},"fields":{"VARIABLE":["我的变量","VARIABLE_ID_PLACEHOLDER"]},"shadow":false,"topLevel":true,"x":0,"y":0}

注意：VARIABLE_ID_PLACEHOLDER 是变量唯一标识符，格式类似于反引号开头的一串字符

### 积木连接说明
- 每个积木有唯一ID（如"aK","Y","Z"等）
- parent字段指向父积木ID
- next字段指向下一个积木ID
- topLevel为true表示这是脚本的开始
- shadow为true表示这是下拉菜单选项
- inputs数组格式：[类型,值]，类型1表示直接值，2表示嵌套积木
- 直接值格式：[4,"数字"]或[10,"字符串"]或[8,"角度"]
- 嵌套积木格式（如SUBSTACK）：[2, 积木ID] 或 [2, null]
  - 例如：{"opcode":"control_repeat","inputs":{"TIMES":[1,[4,"10"]],"SUBSTACK":[2,"abc123"]}}
  - SUBSTACK指向第一个子积木的ID，子积木通过next字段连接
- fields对象格式：{"字段名":[值, null]}，用于下拉菜单选项（如STYLE、EFFECT等）
- 重要：inputs和fields的区别：
  - inputs：用于积木的输入参数（如数字、字符串、其他积木等）
  - fields：用于积木的配置选项（如下拉菜单的选项值，如STYLE、EFFECT、VARIABLE等）
  - 不要混淆这两个字段！
- 常见错误示例（错误）：{"opcode":"motion_setrotationstyle","inputs":{"STYLE":[1,[10,"left-right"]]}} - 这是错误的！STYLE应该在fields中
- 正确示例：{"opcode":"motion_setrotationstyle","inputs":{},"fields":{"STYLE":["left-right",null]}}
- SUBSTACK错误示例（错误）：{"opcode":"control_repeat","inputs":{"SUBSTACK":"abc123"}} - 这是错误的！SUBSTACK必须是数组
- SUBSTACK正确示例：{"opcode":"control_repeat","inputs":{"SUBSTACK":[2,"abc123"]}}
- 重复执行积木示例：
  - 绿旗点击 → 重复执行 → 移动10步 → 碰到边缘就反弹
  - 正确格式：
    {
      "event_whenflagclicked": {
        "opcode": "event_whenflagclicked",
        "next": "control_forever",
        "parent": null,
        "inputs": {},
        "fields": {},
        "shadow": false,
        "topLevel": true,
        "x": 0,
        "y": 0
      },
      "control_forever": {
        "opcode": "control_forever",
        "next": null,  // 循环积木没有next
        "parent": "event_whenflagclicked",
        "inputs": {
          "SUBSTACK": [2, "motion_movesteps"]  // SUBSTACK指向第一个子积木
        },
        "fields": {},
        "shadow": false,
        "topLevel": false,
        "x": 0,
        "y": 0
      },
      "motion_movesteps": {
        "opcode": "motion_movesteps",
        "next": "motion_ifonedgebounce",
        "parent": "control_forever",
        "inputs": {
          "STEPS": [1, [4, "10"]]
        },
        "fields": {},
        "shadow": false,
        "topLevel": false,
        "x": 0,
        "y": 0
      },
      "motion_ifonedgebounce": {
        "opcode": "motion_ifonedgebounce",
        "next": null,
        "parent": "motion_movesteps",
        "inputs": {},
        "fields": {},
        "shadow": false,
        "topLevel": false,
        "x": 0,
        "y": 0
      }
    }

## 你的任务
1. 理解用户想要创建的项目需求
2. 在脑海中构建项目的完整逻辑
3. 使用上述积木为用户提供详细的实现方案
4. 直接输出代码，删除无用的解释信息
5. 直接输出纯文本形式的project.json代码内容，不要使用代码块等模态框包裹，直接输出JSON文本
6. 确保输出的JSON格式正确，可以直接被解析
7. 重要：JSON中的字符串值必须正确转义，特别是引号、换行符等特殊字符
8. 不要在JSON末尾添加多余的逗号
9. 确保所有字符串使用双引号包裹
10. 积木ID必须是唯一的，可以使用随机字符串如 "abc123", "xyz789" 等
11. 生成代码后，请仔细检查所有积木的inputs和fields是否正确，确保STYLE、EFFECT、VARIABLE等配置项都在fields中，不在inputs中
12. 如果使用变量、列表或广播，请确保它们的格式正确：
    - variables: {"变量ID": ["变量名", 初始值]}
    - lists: {"列表ID": ["列表名", []]}
    - broadcasts: {"广播ID": "广播消息"}
    - 变量ID和列表ID必须使用特殊格式：反引号开头，中间包含特殊字符，以反引号结尾
13. 确保costumes和sounds中的assetId和md5ext格式正确：
    - assetId: 必须是32位的十六进制字符串（小写），例如：927d672925e7b99f7813735c484c6922
    - md5ext: assetId加上文件扩展名，例如：927d672925e7b99f7813735c484c6922.svg
14. 确保嵌套积木（如SUBSTACK、SUBSTACK2等）的格式正确：
    - 必须是数组格式：[2, 积木ID] 或 [2, null]
    - 不能是字符串或其他格式
    - 例如：{"opcode":"control_repeat","inputs":{"TIMES":[1,[4,"10"]],"SUBSTACK":[2,"abc123"]}}
15. 重要：积木应该放在正确的target上：
    - 运动类积木（移动、转向、反弹等）应该放在角色（isStage为false的target）上
    - 外观类积木（说、思考、显示/隐藏等）应该放在角色上
    - 只有舞台相关的积木（背景切换、舞台变量等）才放在Stage上
    - 确保将积木放在非Stage的target（如"角色1"）的blocks对象中
16. 确保循环积木（如control_forever、control_repeat等）的格式正确：
    - 必须包含SUBSTACK输入，指向要循环执行的积木
    - 循环积木不应该有next字段（因为它们是循环）
    - 子积木应该通过parent字段指向循环积木
    - 例如：{"opcode":"control_forever","inputs":{"SUBSTACK":[2,"子积木ID"]},"next":null}
17. 避免循环引用：
    - 积木的next字段不能指向自己
    - 积木的parent字段不能形成循环链
    - SUBSTACK不能指向包含它的积木
    - 确保积木连接关系是单向的，从绿旗开始，到结束积木结束
    - 检查每个积木的连接，确保没有形成环
18. 禁止使用扩展：
    - 不要使用任何Scratch扩展（如events、sensing等）
    - 只使用基础积木（运动、外观、声音、画笔、数据、控制、侦测、运算）
    - 不要在项目中添加extensions配置

用户问题：`;

        // AI Chat的系统提示词
        const chatSystemPrompt = '你是RemixWarp的智能AI助手。回答的大部分是Scratch（及修改版）代码的问题。当需要输出代码时，请直接使用Markdown的代码块格式（```语言\n代码内容\n```）或者使用引用块格式（> 代码内容）。绝对不要输出CODEBLOCK0、CODEBLOCK1等占位符，这些占位符无法被正确渲染。直接输出实际的代码内容。';
        
        const userMessageContent = isAgent 
            ? agentSystemPrompt + input
            : '你是RemixWarp的智能AI助手。回答的大部分是Scratch（及修改版）代码的问题。用户问题：' + input;
            
        const userMessage = {role: 'user', content: userMessageContent};
        
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
                    {role: 'system', content: isAgent ? agentSystemPrompt : chatSystemPrompt},
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

    // 多步骤AI Agent处理方法
    async handleMultiStepStart () {
        const {input} = this.state;
        if (!input) return;
        
        this.setState({
            multiStepMode: true,
            currentStep: 1,
            stepStatus: ['running', 'pending', 'pending', 'pending'],
            stepContext: {userRequirement: input}
        });
        
        // 开始第1步：设计结构
        await this.executeStep1(input);
    }
    
    // 第1步：设计程序结构
    async executeStep1 (userRequirement) {
        this.setState({
            messages: [...this.state.messages, {from: 'system', text: '🚀 开始多步骤创作...\n\n📋 步骤1/4: 设计程序结构'}]
        });
        
        const step1Prompt = `【任务】设计Scratch项目结构
需求：${userRequirement}

【输出格式】JSON对象，包含：
{
  "projectName": "项目名称",
  "description": "项目描述",
  "targets": [
    {
      "name": "角色名",
      "isStage": false,
      "variables": [{"name": "变量名", "id": 0}],
      "lists": [{"name": "列表名"}],
      "broadcasts": ["广播名"],
      "blocks": [
        {
          "opcode": "积木类型",
          "description": "功能描述",
          "inputs": ["输入参数"],
          "fields": ["字段"]
        }
      ],
      "costumes": [{"name": "造型名", "type": "svg"}],
      "sounds": [{"name": "声音名"}]
    }
  ],
  "stageVariables": [],
  "stageLists": [],
  "stageBroadcasts": []
}

【要求】
- 详细列出每个角色需要的积木块
- 明确每个积木的功能
- 只输出JSON，不要解释文字`;

        try {
            const response = await this.callAI(step1Prompt);
            console.log('步骤1 AI响应:', response);
            const structure = this.extractJSON(response);
            console.log('步骤1 提取的结构:', structure);
            
            this.setState(state => ({
                stepContext: {...state.stepContext, structure},
                stepStatus: ['completed', 'running', 'pending', 'pending'],
                currentStep: 2,
                messages: [...state.messages, {from: 'assistant', text: '✅ 步骤1完成：程序结构设计完成\n\n' + structure}]
            }));
            
            // 自动进入第2步
            await this.executeStep2(structure, userRequirement);
        } catch (err) {
            this.setState({
                stepStatus: ['error', 'pending', 'pending', 'pending'],
                error: '步骤1失败: ' + err.message
            });
        }
    }
    
    // 第2步：编写代码
    async executeStep2 (structure, userRequirement) {
        this.setState(state => ({
            messages: [...state.messages, {from: 'system', text: '💻 步骤2/4: 编写代码...'}]
        }));
        
        const step2Prompt = `【任务】根据结构生成完整的Scratch project.json
需求：${userRequirement}
结构：${structure}

【重要】必须输出完整的project.json格式，包含以下字段：
{
  "targets": [
    {
      "isStage": true,
      "name": "Stage",
      "variables": {},
      "lists": {},
      "broadcasts": {},
      "blocks": {},
      "comments": {},
      "currentCostume": 0,
      "costumes": [],
      "sounds": [],
      "volume": 100,
      "layerOrder": 0
    },
    {
      "isStage": false,
      "name": "角色名",
      "variables": {},
      "lists": {},
      "broadcasts": {},
      "blocks": {
        "blockId": {
          "opcode": "event_whenflagclicked",
          "next": "下一个blockId或null",
          "parent": "上一个blockId或null",
          "inputs": {},
          "fields": {},
          "shadow": false,
          "topLevel": true,
          "x": 0,
          "y": 0
        }
      },
      "comments": {},
      "currentCostume": 0,
      "costumes": [
        {
          "name": "造型名",
          "bitmapResolution": 1,
          "dataFormat": "svg",
          "assetId": "32位十六进制字符串",
          "md5ext": "assetId.svg",
          "rotationCenterX": 240,
          "rotationCenterY": 180
        }
      ],
      "sounds": [],
      "volume": 100,
      "visible": true,
      "x": 0,
      "y": 0,
      "size": 100,
      "direction": 90,
      "draggable": false,
      "rotationStyle": "all around",
      "layerOrder": 1
    }
  ],
  "meta": {
    "semver": "3.0.0",
    "vm": "0.2.0",
    "agent": "Mozilla/5.0"
  }
}

【积木格式规则】
1. inputs格式: "INPUT_NAME": [类型, [值类型, 值]] 或 [类型, "blockId"]
   - 类型1: 数字/字符串输入
   - 类型2: 积木输入（如SUBSTACK）
   - 类型3: 广播输入
   
2. fields格式: "FIELD_NAME": ["值", null]

3. 常见opcode示例：
   - event_whenflagclicked: 事件类-当绿旗被点击
   - control_forever: 控制类-重复执行
   - motion_movesteps: 运动类-移动步数
   - looks_say: 外观类-说

4. 连接规则：
   - next: 下一个积木的ID，没有则为null
   - parent: 上一个积木的ID，没有则为null
   - topLevel: 是否是积木链的顶部（第一个积木）

【要求】
- 严格按照结构设计生成代码
- 确保所有积木连接正确
- 循环积木必须有SUBSTACK输入
- 直接输出完整JSON，不要代码块标记
- 不要任何解释文字`;

        try {
            const response = await this.callAI(step2Prompt);
            console.log('步骤2 AI响应长度:', response.length);
            console.log('步骤2 AI响应前500字符:', response.substring(0, 500));
            const code = this.extractJSON(response);
            console.log('步骤2 提取的代码长度:', code.length);
            console.log('步骤2 提取的代码前500字符:', code.substring(0, 500));
            
            // 验证提取的代码是否是有效的JSON
            try {
                const testParsed = JSON.parse(code);
                console.log('步骤2 代码JSON验证通过，targets数量:', testParsed.targets ? testParsed.targets.length : 0);
            } catch (e) {
                console.error('步骤2 代码JSON验证失败:', e.message);
            }
            
            this.setState(state => ({
                stepContext: {...state.stepContext, code},
                stepStatus: ['completed', 'completed', 'running', 'pending'],
                currentStep: 3,
                messages: [...state.messages, {from: 'assistant', text: '✅ 步骤2完成：代码编写完成'}]
            }));
            
            // 自动进入第3步
            await this.executeStep3(code, structure);
        } catch (err) {
            this.setState({
                stepStatus: ['completed', 'error', 'pending', 'pending'],
                error: '步骤2失败: ' + err.message
            });
        }
    }
    
    // 第3步：修复代码
    async executeStep3 (code, structure) {
        this.setState(state => ({
            messages: [...state.messages, {from: 'system', text: '🔧 步骤3/4: 修复代码...'}]
        }));
        
        const step3Prompt = `【任务】检查并修复project.json中的错误
代码：${code}

【必须检查的问题】
1. targets字段是否存在且是数组
2. 每个target是否包含必需字段：
   - isStage, name, variables, lists, broadcasts, blocks
   - costumes, sounds, volume, layerOrder
3. 积木连接是否正确：
   - next/parent是否匹配
   - 是否存在循环引用
   - topLevel是否正确设置
4. inputs/fields格式是否正确：
   - inputs: [类型, [值类型, 值]] 或 [类型, "blockId"]
   - fields: ["值", null]
5. assetId是否是32位十六进制字符串
6. 循环积木(control_forever等)是否有SUBSTACK输入

【输出要求】
- 直接输出修复后的完整JSON
- 不要输出修复列表
- 不要任何解释文字
- 确保JSON格式正确`;

        try {
            const response = await this.callAI(step3Prompt);
            console.log('步骤3 AI响应长度:', response.length);
            console.log('步骤3 AI响应前500字符:', response.substring(0, 500));
            const fixedCode = this.extractJSON(response);
            console.log('步骤3 提取的代码长度:', fixedCode.length);
            console.log('步骤3 提取的代码前500字符:', fixedCode.substring(0, 500));
            
            // 验证提取的代码是否是有效的JSON
            try {
                const testParsed = JSON.parse(fixedCode);
                console.log('步骤3 代码JSON验证通过，targets数量:', testParsed.targets ? testParsed.targets.length : 0);
            } catch (e) {
                console.error('步骤3 代码JSON验证失败:', e.message);
                console.log('步骤3 将使用原始代码');
                // 如果修复失败，使用原始代码
                this.setState(state => ({
                    stepContext: {...state.stepContext, fixedCode: code},
                    stepStatus: ['completed', 'completed', 'completed', 'running'],
                    currentStep: 4,
                    messages: [...state.messages, {from: 'assistant', text: '⚠️ 步骤3修复失败，使用原始代码继续'}]
                }));
                await this.executeStep4(structure, code);
                return;
            }
            
            this.setState(state => ({
                stepContext: {...state.stepContext, fixedCode},
                stepStatus: ['completed', 'completed', 'completed', 'running'],
                currentStep: 4,
                messages: [...state.messages, {from: 'assistant', text: '✅ 步骤3完成：代码修复完成'}]
            }));
            
            // 自动进入第4步（SVG绘制可与代码生成并行）
            await this.executeStep4(structure, fixedCode);
        } catch (err) {
            this.setState({
                stepStatus: ['completed', 'completed', 'error', 'pending'],
                error: '步骤3失败: ' + err.message
            });
        }
    }
    
    // 第4步：绘制SVG
    async executeStep4 (structure, code) {
        this.setState(state => ({
            messages: [...state.messages, {from: 'system', text: '🎨 步骤4/4: 绘制图形...'}]
        }));
        
        const step4Prompt = `【任务】根据代码需求绘制SVG造型
代码：${code}

【从代码中提取信息】
1. 找到所有角色的costumes字段
2. 提取每个造型的name和assetId
3. 根据角色功能设计合适的图形

【SVG格式要求】
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- 简洁的矢量图形 -->
</svg>

【输出格式】
为每个造型输出：
---造型名称---
<svg>...</svg>

【要求】
- 图形要符合角色功能
- 使用简洁的矢量图形
- viewBox统一使用"0 0 100 100"
- 直接输出SVG代码，不要解释`;

        try {
            const response = await this.callAI(step4Prompt);
            console.log('步骤4 AI响应:', response);
            
            this.setState(state => ({
                stepContext: {...state.stepContext, svg: response},
                stepStatus: ['completed', 'completed', 'completed', 'completed'],
                currentStep: 4,
                multiStepMode: false,
                messages: [...state.messages, 
                    {from: 'assistant', text: '✅ 步骤4完成：图形绘制完成'},
                    {from: 'system', text: '🎉 所有步骤完成！您可以点击"转换为作品"按钮下载项目。'}
                ]
            }));
        } catch (err) {
            this.setState({
                stepStatus: ['completed', 'completed', 'completed', 'error'],
                error: '步骤4失败: ' + err.message
            });
        }
    }
    
    // 调用AI的通用方法
    async callAI (prompt) {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {role: 'system', content: '你是Scratch专家，只输出代码，不解释。'},
                    {role: 'user', content: prompt}
                ]
            })
        });
        
        const data = await response.json();
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }
        throw new Error('AI响应格式错误');
    }
    
    // 提取JSON
    extractJSON (text) {
        // 首先尝试提取markdown代码块
        const codeBlockMatch = text.match(/```(?:json)?\n?([\s\S]*?)```/);
        if (codeBlockMatch) {
            const extracted = codeBlockMatch[1].trim();
            // 验证提取的内容是否是有效的JSON开头
            if (extracted.startsWith('{') || extracted.startsWith('[')) {
                return extracted;
            }
        }
        
        // 如果没有代码块或提取的内容无效，尝试直接找JSON对象
        // 找第一个 { 和最后一个 }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            return text.substring(firstBrace, lastBrace + 1).trim();
        }
        
        // 如果还是没有找到，返回原始文本
        return text.trim();
    }

    async handleConvertToProject () {
        console.log('=== 开始转换为作品 ===');
        console.log('stepContext:', this.state.stepContext);
        console.log('multiStepMode:', this.state.multiStepMode);
        console.log('stepStatus:', this.state.stepStatus);
        
        // 首先检查stepContext中是否有修复后的代码
        let projectJson = null;
        let codeSource = '';
        
        if (this.state.stepContext && this.state.stepContext.fixedCode) {
            projectJson = this.state.stepContext.fixedCode;
            codeSource = 'stepContext.fixedCode';
            console.log('使用stepContext.fixedCode');
        } else if (this.state.stepContext && this.state.stepContext.code) {
            projectJson = this.state.stepContext.code;
            codeSource = 'stepContext.code';
            console.log('使用stepContext.code');
        } else {
            // 如果stepContext中没有代码，从messages中查找包含JSON的消息
            console.log('从messages中查找JSON代码');
            const jsonMessage = this.state.messages
                .filter(m => m.from === 'assistant' && m.text && m.text.includes('{'))
                .pop();
            
            if (!jsonMessage) {
                console.error('没有找到包含JSON的消息');
                alert('请先让AI生成代码');
                return;
            }
            
            projectJson = jsonMessage.text;
            codeSource = 'messages';
            console.log('使用messages中的代码');
        }
        
        if (!projectJson) {
            console.error('projectJson为空');
            alert('没有可用的代码');
            return;
        }
        
        console.log(`代码来源: ${codeSource}`);
        console.log('代码长度:', projectJson.length);
        console.log('代码前200字符:', projectJson.substring(0, 200));

        try {
            // 如果包含markdown代码块，尝试提取
            const codeBlockMatch = projectJson.match(/```(?:json)?\n?([\s\S]*?)```/);
            if (codeBlockMatch) {
                projectJson = codeBlockMatch[1].trim();
                console.log('从markdown代码块中提取JSON');
            }
            
            // 清理可能的非法字符
            // 移除零宽字符和其他控制字符
            projectJson = projectJson.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
            
            // 尝试修复常见的JSON格式问题
            // 1. 移除尾随逗号
            projectJson = projectJson.replace(/,(\s*[}\]])/g, '$1');
            
            // 2. 修复未转义的换行符
            projectJson = projectJson.replace(/\n/g, '\\n');
            
            // 3. 修复未转义的引号（在字符串值中）
            // 这个比较复杂，先尝试解析，如果失败再提示用户
            
            // 解析JSON验证格式
            let parsed;
            try {
                parsed = JSON.parse(projectJson);
                console.log('JSON解析成功');
                console.log('parsed对象类型:', typeof parsed);
                console.log('parsed对象键:', Object.keys(parsed));
            } catch (parseError) {
                console.error('JSON解析错误:', parseError);
                console.error('问题JSON内容:', projectJson.substring(0, 500));
                
                // 尝试找出问题位置
                const match = parseError.message.match(/position (\d+)/);
                if (match) {
                    const pos = parseInt(match[1]);
                    const context = projectJson.substring(Math.max(0, pos - 50), Math.min(projectJson.length, pos + 50));
                    alert(`JSON格式错误在位置 ${pos}:\n${context}\n\n请检查AI生成的代码格式。`);
                } else {
                    alert('JSON格式错误: ' + parseError.message);
                }
                return;
            }
            
            // 确保是有效的Scratch项目格式
            if (!parsed.targets || !Array.isArray(parsed.targets)) {
                console.error('无效的Scratch项目格式');
                console.error('parsed.targets:', parsed.targets);
                console.error('parsed完整内容:', JSON.stringify(parsed, null, 2));
                alert('无效的Scratch项目格式：缺少targets字段或格式不正确\n\n请查看控制台了解详细信息');
                return;
            }
            
            console.log('targets数量:', parsed.targets.length);
            console.log('targets:', parsed.targets.map(t => ({name: t.name, isStage: t.isStage, blocks: Object.keys(t.blocks || {}).length})));

            // 检查积木结构是否存在循环引用
            const checkForCircularReferences = (target) => {
                if (!target.blocks) return;
                
                // 检查单个积木链是否存在循环引用（通过next字段）
                const checkNextChain = (startBlockId) => {
                    const visited = new Set();
                    let currentId = startBlockId;
                    
                    while (currentId) {
                        if (visited.has(currentId)) {
                            // 找到循环
                            return `积木链存在循环引用: ${Array.from(visited).join(' → ')} → ${currentId}`;
                        }
                        visited.add(currentId);
                        
                        const block = target.blocks[currentId];
                        if (!block) break;
                        
                        currentId = block.next;
                    }
                    
                    return null;
                };
                
                // 检查所有积木链
                for (const [blockId, block] of Object.entries(target.blocks)) {
                    // 只从顶级积木或SUBSTACK入口开始检查
                    if (block.topLevel) {
                        const error = checkNextChain(blockId);
                        if (error) {
                            throw new Error(error);
                        }
                    }
                    
                    // 检查SUBSTACK中的积木链
                    if (block.inputs) {
                        for (const input of Object.values(block.inputs)) {
                            if (Array.isArray(input) && input[0] === 2 && input[1]) {
                                const error = checkNextChain(input[1]);
                                if (error) {
                                    throw new Error(error);
                                }
                            }
                        }
                    }
                }
                
                // 检查是否有积木指向自己
                for (const [blockId, block] of Object.entries(target.blocks)) {
                    if (block.next === blockId) {
                        throw new Error(`积木 ${blockId} 的next字段指向自己`);
                    }
                    
                    if (block.inputs) {
                        for (const [inputName, input] of Object.entries(block.inputs)) {
                            if (Array.isArray(input) && input[0] === 2 && input[1] === blockId) {
                                throw new Error(`积木 ${blockId} 的${inputName}输入指向自己`);
                            }
                        }
                    }
                }
            };

            // 检查所有target的积木结构
            for (const target of parsed.targets) {
                try {
                    checkForCircularReferences(target);
                } catch (error) {
                    console.error('循环引用检测失败:', error);
                    alert('积木结构存在循环引用：' + error.message);
                    return;
                }
            }

            // 修复无效的assetId
            const generateValidAssetId = () => {
                const chars = '0123456789abcdef';
                let result = '';
                for (let i = 0; i < 32; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            };

            const isValidAssetId = (id) => {
                return /^[a-f0-9]{32}$/.test(id);
            };

            // 确保每个target都有至少1个costume
            for (const target of parsed.targets) {
                if (!target.costumes || target.costumes.length === 0) {
                    const assetId = generateValidAssetId();
                    target.costumes = [
                        {
                            name: target.isStage ? 'backdrop1' : 'costume1',
                            bitmapResolution: 1,
                            dataFormat: 'svg',
                            assetId: assetId,
                            md5ext: `${assetId}.svg`,
                            rotationCenterX: target.isStage ? 240 : 50,
                            rotationCenterY: target.isStage ? 180 : 50
                        }
                    ];
                    console.log(`为${target.name}添加了默认costume`);
                }
            }

            // 修复扩展配置 - 移除不存在的events扩展
            if (parsed.extensions) {
                if (Array.isArray(parsed.extensions)) {
                    // 如果是数组，过滤掉events扩展
                    parsed.extensions = parsed.extensions.filter(ext => ext !== 'events' && ext !== 'sensing');
                    console.log('从extensions数组中移除了events扩展');
                } else if (typeof parsed.extensions === 'object') {
                    // 如果是对象，删除events属性
                    if (parsed.extensions.events) {
                        delete parsed.extensions.events;
                        console.log('从extensions对象中移除了events扩展');
                    }
                    if (parsed.extensions.sensing) {
                        delete parsed.extensions.sensing;
                        console.log('从extensions对象中移除了sensing扩展');
                    }
                }
            }

            // 确保所有costumes都有必需的字段
            for (const target of parsed.targets) {
                if (target.costumes) {
                    for (const costume of target.costumes) {
                        // 确保dataFormat存在
                        if (!costume.dataFormat) {
                            costume.dataFormat = 'svg';
                            console.warn(`为${target.name}的costume ${costume.name} 添加默认dataFormat: svg`);
                        }
                        // 确保assetId存在且有效
                        if (!costume.assetId || !isValidAssetId(costume.assetId)) {
                            const newAssetId = generateValidAssetId();
                            costume.assetId = newAssetId;
                            console.warn(`为${target.name}的costume ${costume.name} 修复assetId`);
                        }
                        // 确保md5ext存在且格式正确
                        const md5extPattern = /^[a-fA-F0-9]{32}\.[a-zA-Z]+$/;
                        if (!costume.md5ext || !md5extPattern.test(costume.md5ext)) {
                            // 生成正确格式的md5ext
                            costume.md5ext = `${costume.assetId}.${costume.dataFormat}`;
                            console.warn(`为${target.name}的costume ${costume.name} 修复md5ext: ${costume.md5ext}`);
                        }
                        // 确保rotationCenterX和rotationCenterY存在
                        if (costume.rotationCenterX === undefined || costume.rotationCenterX === null) {
                            costume.rotationCenterX = target.isStage ? 240 : 50;
                        }
                        if (costume.rotationCenterY === undefined || costume.rotationCenterY === null) {
                            costume.rotationCenterY = target.isStage ? 180 : 50;
                        }
                    }
                }
            }

            // 确保所有sounds都有正确的md5ext格式
            for (const target of parsed.targets) {
                if (target.sounds) {
                    for (const sound of target.sounds) {
                        // 确保assetId存在且有效
                        if (!sound.assetId || !isValidAssetId(sound.assetId)) {
                            const newAssetId = generateValidAssetId();
                            sound.assetId = newAssetId;
                            console.warn(`为${target.name}的sound 修复assetId`);
                        }
                        // 确保md5ext存在且格式正确
                        const md5extPattern = /^[a-fA-F0-9]{32}\.[a-zA-Z]+$/;
                        if (!sound.md5ext || !md5extPattern.test(sound.md5ext)) {
                            // 生成正确格式的md5ext
                            sound.md5ext = `${sound.assetId}.wav`;
                            console.warn(`为${target.name}的sound 修复md5ext: ${sound.md5ext}`);
                        }
                    }
                }
            }

            for (const target of parsed.targets) {
                // 修复blocks中的inputs字段 - 确保是对象而不是数组或其他类型
                if (target.blocks) {
                    for (const [blockId, block] of Object.entries(target.blocks)) {
                        if (block && typeof block === 'object') {
                            // 确保inputs是对象
                            if (block.inputs === undefined || block.inputs === null) {
                                block.inputs = {};
                            } else if (Array.isArray(block.inputs)) {
                                // 如果inputs是数组，转换为对象
                                console.warn(`修复block ${blockId}的inputs: 从数组转换为对象`);
                                block.inputs = {};
                            } else if (typeof block.inputs !== 'object') {
                                console.warn(`修复block ${blockId}的inputs: 从${typeof block.inputs}转换为对象`);
                                block.inputs = {};
                            }
                            
                            // 修复inputs中的输入值 - 确保数组第一个元素是数字，第二个元素是字符串
                            if (block.inputs && typeof block.inputs === 'object') {
                                for (const [inputName, inputValue] of Object.entries(block.inputs)) {
                                    if (Array.isArray(inputValue) && inputValue.length > 0) {
                                        // 第一个元素必须是数字（输入类型：1=文字，2=积木，3=变量）
                                        // 注意：SB3规范只允许1、2、3，4是无效的
                                        const inputType = inputValue[0];
                                        if (typeof inputType !== 'number' || ![1, 2, 3].includes(inputType)) {
                                            // 尝试将字符串转换为数字
                                            const numType = Number(inputType);
                                            if (!isNaN(numType) && [1, 2, 3].includes(numType)) {
                                                inputValue[0] = numType;
                                                console.warn(`修复block ${blockId}的${inputName}输入类型: ${inputType} -> ${numType}`);
                                            } else {
                                                // 如果无法转换或值无效，默认为1（文字输入）
                                                inputValue[0] = 1;
                                                console.warn(`修复block ${blockId}的${inputName}输入类型: ${inputType} -> 1 (默认)`);
                                            }
                                        }
                                        
                                        // 第二个元素（输入值）必须是字符串或null
                                        if (inputValue.length > 1) {
                                            const inputVal = inputValue[1];
                                            if (typeof inputVal === 'number') {
                                                // 如果是数字，转换为字符串
                                                inputValue[1] = String(inputVal);
                                                console.warn(`修复block ${blockId}的${inputName}输入值: 从数字 ${inputVal} 转换为字符串`);
                                            } else if (inputVal !== null && typeof inputVal !== 'string') {
                                                // 如果是其他类型，转换为字符串
                                                inputValue[1] = String(inputVal);
                                                console.warn(`修复block ${blockId}的${inputName}输入值: 从${typeof inputVal} 转换为字符串`);
                                            }
                                        }
                                    } else if (inputValue !== undefined && inputValue !== null) {
                                        // 如果输入值不是数组，转换为适当的数组格式
                                        console.warn(`修复block ${blockId}的${inputName}输入值: 从${typeof inputValue}转换为数组`);
                                        // 默认为文字输入类型 (1)，值设置为空字符串
                                        block.inputs[inputName] = [1, ''];
                                    }
                                }
                            }
                            
                            // 确保fields是对象
                            if (block.fields === undefined || block.fields === null) {
                                block.fields = {};
                            } else if (Array.isArray(block.fields)) {
                                console.warn(`修复block ${blockId}的fields: 从数组转换为对象`);
                                block.fields = {};
                            } else if (typeof block.fields !== 'object') {
                                console.warn(`修复block ${blockId}的fields: 从${typeof block.fields}转换为对象`);
                                block.fields = {};
                            }
                        }
                    }
                }
                
                // 修复variables - 确保是对象且值为数组格式
                if (target.variables === undefined || target.variables === null) {
                    target.variables = {};
                } else if (Array.isArray(target.variables)) {
                    console.warn(`修复${target.name}的variables: 从数组转换为对象`);
                    target.variables = {};
                } else if (typeof target.variables !== 'object') {
                    console.warn(`修复${target.name}的variables: 从${typeof target.variables}转换为对象`);
                    target.variables = {};
                } else {
                    // 确保每个变量值都是数组格式: ["变量名", 初始值]
                    for (const [varId, varValue] of Object.entries(target.variables)) {
                        if (!Array.isArray(varValue) || varValue.length < 2) {
                            console.warn(`修复${target.name}的变量 ${varId}: 从${typeof varValue}转换为数组格式`);
                            // 尝试提取变量名和初始值
                            let varName = varId;
                            let initialValue = 0;
                            
                            if (typeof varValue === 'string') {
                                varName = varValue;
                            } else if (typeof varValue === 'number') {
                                initialValue = varValue;
                            } else if (Array.isArray(varValue) && varValue.length > 0) {
                                varName = varValue[0];
                                initialValue = varValue[1] || 0;
                            }
                            
                            target.variables[varId] = [varName, initialValue];
                        }
                    }
                }
                
                // 修复lists - 确保是对象且值为数组格式
                if (target.lists === undefined || target.lists === null) {
                    target.lists = {};
                } else if (Array.isArray(target.lists)) {
                    console.warn(`修复${target.name}的lists: 从数组转换为对象`);
                    target.lists = {};
                } else if (typeof target.lists !== 'object') {
                    console.warn(`修复${target.name}的lists: 从${typeof target.lists}转换为对象`);
                    target.lists = {};
                } else {
                    // 确保每个列表值都是数组格式: ["列表名", []]
                    for (const [listId, listValue] of Object.entries(target.lists)) {
                        if (!Array.isArray(listValue) || listValue.length < 2) {
                            console.warn(`修复${target.name}的列表 ${listId}: 从${typeof listValue}转换为数组格式`);
                            // 尝试提取列表名
                            let listName = listId;
                            if (typeof listValue === 'string') {
                                listName = listValue;
                            } else if (Array.isArray(listValue) && listValue.length > 0) {
                                listName = listValue[0];
                            }
                            target.lists[listId] = [listName, []];
                        }
                    }
                }
                
                // 修复broadcasts - 确保是对象
                if (target.broadcasts === undefined || target.broadcasts === null) {
                    target.broadcasts = {};
                } else if (Array.isArray(target.broadcasts)) {
                    console.warn(`修复${target.name}的broadcasts: 从数组转换为对象`);
                    target.broadcasts = {};
                } else if (typeof target.broadcasts !== 'object') {
                    console.warn(`修复${target.name}的broadcasts: 从${typeof target.broadcasts}转换为对象`);
                    target.broadcasts = {};
                }
                
                // 修复costumes的assetId
                if (target.costumes) {
                    for (const costume of target.costumes) {
                        if (!isValidAssetId(costume.assetId)) {
                            const newAssetId = generateValidAssetId();
                            const oldAssetId = costume.assetId;
                            costume.assetId = newAssetId;
                            if (costume.md5ext) {
                                const ext = costume.md5ext.split('.').pop();
                                costume.md5ext = `${newAssetId}.${ext}`;
                            }
                        }
                    }
                }
                // 修复sounds的assetId
                if (target.sounds) {
                    for (const sound of target.sounds) {
                        if (!isValidAssetId(sound.assetId)) {
                            const newAssetId = generateValidAssetId();
                            sound.assetId = newAssetId;
                            if (sound.md5ext) {
                                const ext = sound.md5ext.split('.').pop();
                                sound.md5ext = `${newAssetId}.${ext}`;
                            }
                        }
                    }
                }
            }

            // 使用JSZip创建SB3文件
            const JSZip = await import('@turbowarp/jszip');
            const zip = new JSZip.default();
            
            // 添加project.json
            zip.file('project.json', JSON.stringify(parsed));
            
            // 为所有costumes和sounds创建对应的文件
            for (const target of parsed.targets) {
                // 添加costumes文件
                if (target.costumes) {
                    for (const costume of target.costumes) {
                        if (costume.dataFormat === 'svg') {
                            // 创建默认的SVG内容
                            if (target.isStage) {
                                const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360"><rect width="480" height="360" fill="transparent"/></svg>`;
                                zip.file(costume.md5ext || `${costume.assetId}.svg`, svgContent);
                            } else {
                                const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ffcc00"/><circle cx="35" cy="40" r="5" fill="#000"/><circle cx="65" cy="40" r="5" fill="#000"/><path d="M 30 60 Q 50 75 70 60" stroke="#000" stroke-width="3" fill="none"/><path d="M 20 30 L 35 40" stroke="#000" stroke-width="3"/><path d="M 80 30 L 65 40" stroke="#000" stroke-width="3"/></svg>`;
                                zip.file(costume.md5ext || `${costume.assetId}.svg`, svgContent);
                            }
                        } else if (costume.dataFormat === 'png') {
                            // 创建一个空的PNG文件（1x1透明像素）
                            const pngData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 11, 73, 68, 65, 84, 120, 156, 99, 96, 0, 0, 0, 2, 0, 1, 233, 7, 13, 10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
                            zip.file(costume.md5ext || `${costume.assetId}.png`, pngData);
                        }
                    }
                }
                // 添加sounds文件
                if (target.sounds) {
                    for (const sound of target.sounds) {
                        // 创建一个空的WAV文件
                        const wavData = new Uint8Array([82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32, 16, 0, 0, 0, 1, 0, 1, 0, 68, 172, 0, 0, 34, 86, 0, 0, 2, 0, 16, 0, 100, 97, 116, 97, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
                        zip.file(sound.md5ext || `${sound.assetId}.wav`, wavData);
                    }
                }
            }
            
            // 生成SB3文件
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE'
            });
            
            // 总是显示保存位置选择
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'ai-project.sb3',
                        types: [
                            {
                                description: 'Scratch 3 Project',
                                accept: {
                                    'application/octet-stream': '.sb3'
                                }
                            }
                        ],
                        excludeAcceptAllOption: true
                    });
                    
                    const writable = await handle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    alert('作品保存成功！');
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error saving file:', error);
                        // 降级到直接下载
                        this.downloadBlob('ai-project.sb3', content);
                    }
                }
            } else {
                // 降级到直接下载
                this.downloadBlob('ai-project.sb3', content);
            }
        } catch (error) {
            console.error('转换失败:', error);
            alert('转换失败：' + error.message);
        }
    }

    downloadBlob (filename, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    render () {
        const {type} = this.props;
        const isAgent = type === 'agent';
        const placeholder = isAgent ? '告诉AI你想做什么？' : '聊聊你的代码...';
        const warningText = isAgent 
            ? '内容为AI生成,请注意仔细鉴别<br/>Bata测试版：有极大的概率会导致作品崩溃或生成积木错误。<br/>分布式创作目前还未完善，建议进行直接发送。<br/>如果项目较复杂，等待时间可能较长,请耐心等待。' 
            : '内容为AI生成,请注意仔细鉴别<br/>此功能仅作为AI辅助编程,不能帮你编写代码。';
        
        return (
            <div className={styles.container}>
                {this.props.showHeader !== false && (
                    <div className={styles.header}>{isAgent ? 'AI Agent' : 'AI Chat'}</div>
                )}
                <div className={styles.scrollableContent}>
                    <div className={styles.messagesWrapper}>
                    <div className={styles.messages}>
                        {this.state.messages.map((m, i) => (
                            <div key={i} className={m.from === 'user' ? styles.userMsg : styles.assistantMsg}>
                                {m.from === 'user' ? (
                                    m.text
                                ) : (
                                    <MarkdownRenderer content={m.text} />
                                )}
                            </div>
                        ))}
                        <div ref={this.messagesEnd} />
                    </div>
                </div>
                {/* 多步骤进度显示 */}
                {isAgent && this.state.multiStepMode && (
                    <div className={classNames(styles.progressContainer, {
                        [styles.progressCollapsed]: !this.state.progressExpanded
                    })}>
                        {this.state.progressExpanded ? (
                            // 展开状态
                            <>
                                <div 
                                    className={styles.progressHeader}
                                    onClick={() => this.setState({progressExpanded: false})}
                                    style={{cursor: 'pointer'}}
                                >
                                    <span className={styles.progressTitle}>🚀 多步骤创作进度</span>
                                    <div className={styles.progressHeaderRight}>
                                        <span className={styles.progressCounter}>步骤 {this.state.currentStep}/4</span>
                                        <button 
                                            className={styles.progressToggle}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                this.setState({progressExpanded: false});
                                            }}
                                        >
                                            ▼
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.progressBar}>
                                    <div 
                                        className={styles.progressFill} 
                                        style={{width: `${(this.state.currentStep / this.state.totalSteps) * 100}%`}}
                                    />
                                </div>
                            </>
                        ) : (
                            // 收缩状态 - 窄条显示
                            <div 
                                className={styles.progressHeaderCollapsed}
                                onClick={() => this.setState({progressExpanded: true})}
                                style={{cursor: 'pointer'}}
                            >
                                <span className={styles.progressStepIndicator}>第{this.state.currentStep}步</span>
                                <div className={styles.progressBarCollapsed}>
                                    <div 
                                        className={styles.progressFillCollapsed} 
                                        style={{width: `${(this.state.currentStep / this.state.totalSteps) * 100}%`}}
                                    />
                                </div>
                                <button 
                                    className={styles.progressToggle}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        this.setState({progressExpanded: true});
                                    }}
                                >
                                    ▶
                                </button>
                            </div>
                        )}
                        {this.state.progressExpanded && (
                            <div className={styles.stepList}>
                                {[
                                    {icon: '📋', name: '设计程序结构'},
                                    {icon: '💻', name: '编写代码'},
                                    {icon: '🔧', name: '修复代码'},
                                    {icon: '🎨', name: '绘制图形'}
                                ].map((step, index) => {
                                    const status = this.state.stepStatus[index];
                                    const isActive = index + 1 === this.state.currentStep;
                                    return (
                                        <div 
                                            key={index} 
                                            className={classNames(styles.stepItem, {
                                                [styles.stepActive]: isActive,
                                                [styles.stepCompleted]: status === 'completed',
                                                [styles.stepError]: status === 'error'
                                            })}
                                        >
                                            <span className={styles.stepIcon}>
                                                {status === 'completed' ? '✅' : 
                                                 status === 'error' ? '❌' : 
                                                 status === 'running' ? '⏳' : 
                                                 step.icon}
                                            </span>
                                            <span className={styles.stepName}>{step.name}</span>
                                            {isActive && <span className={styles.stepStatus}>进行中...</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                
                {this.state.loading && !this.state.multiStepMode && <div className={styles.loading}>思考中...</div>}
                {this.state.error && <div className={styles.error}>{this.state.error}</div>}
                <div className={styles.controls}>
                    <textarea 
                        ref={this.inputRef} 
                        className={styles.input} 
                        value={this.state.input} 
                        onChange={this.handleChange} 
                        placeholder={placeholder} 
                        disabled={this.state.multiStepMode}
                    />
                    <div className={styles.actions}>
                        {isAgent && !this.state.multiStepMode && (
                            <Button 
                                onClick={this.handleMultiStepStart} 
                                className={classNames(styles.multiStepButton, {
                                    [styles.multiStepButtonDisabled]: this.state.loading || !this.state.input
                                })}
                                disabled={this.state.loading || !this.state.input}
                            >
                                🚀 多步骤创作
                            </Button>
                        )}
                        <Button 
                            onClick={this.handleSend} 
                            className={styles.sendButton} 
                            disabled={this.state.loading || this.state.multiStepMode}
                        >
                            发送
                        </Button>
                        {isAgent && (
                            <Button 
                                onClick={this.handleConvertToProject} 
                                className={classNames(styles.convertButton, {
                                    [styles.convertButtonDisabled]: this.state.loading || 
                                        (this.state.multiStepMode ? 
                                            !this.state.stepStatus.every(s => s === 'completed') : 
                                            !this.state.messages.some(m => m.from === 'assistant'))
                                })}
                                disabled={this.state.loading || 
                                    (this.state.multiStepMode ? 
                                        !this.state.stepStatus.every(s => s === 'completed') : 
                                        !this.state.messages.some(m => m.from === 'assistant'))}
                            >
                                转换为作品
                            </Button>
                        )}
                    </div>
                </div>
                {/* 警告消息 - 放在底部 */}
                <div className={styles.warningBanner}>
                    <div className={styles.warningIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
                            <path d="M12 9v4"></path>
                            <path d="M12 17h.01"></path>
                        </svg>
                    </div>
                    <div className={styles.warningContent}>
                        <strong><span>警告：</span></strong>
                        <span dangerouslySetInnerHTML={{__html: warningText}} />
                    </div>
                </div>
            </div>
            </div>
        );
    }
}

AIPanel.propTypes = {
    onRequestClose: PropTypes.func,
    type: PropTypes.string
};

AIPanel.defaultProps = {
    showHeader: true,
    type: 'chat'
};

AIPanel.propTypes = Object.assign({}, AIPanel.propTypes, {
    showHeader: PropTypes.bool
});

export default AIPanel;

// Name: SheepToolkit
// ID: SheepToolkit
// Description: Some strange blocks.
// By: 小小羊 <https://github.com/xiaoxiaoyang-114514/>
// License: GPLv3

class SheepToolkit {
  #KeyValueStore = {};
  #GlobalValue = {
    ticks: 0,
    fps: 0,
    last: Date.now()
  };
  getInfo() {
    return {
      id: 'SheepToolkit',
      name: '小小羊的工具箱',
      color1:'#76a9d2',
      blocks: [
        {
          blockType:"label",
          text:'时间工具'
        },
        {
          opcode: 'datetimes',
          blockType: Scratch.BlockType.REPORTER,
          text: '秒级时间戳'
        },
        {
          opcode: 'datetimems',
          blockType: Scratch.BlockType.REPORTER,
          text: '毫秒级时间戳'
        },
        {
          opcode:'GetWeek',
          blockType: Scratch.BlockType.REPORTER,
          text:'星期几'
        },
        {
          blockType:'label',
          text:'文本处理'
        },
        {
          opcode: 'StrSplit',
          blockType: Scratch.BlockType.REPORTER,
          text: '[a]按[b]分割的第[c]个',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            },
            b:{
              type:Scratch.ArgumentType.STRING
            },
            c:{
              type:Scratch.ArgumentType.NUMBER
            }
          }
        },
        {
          opcode: 'StrSplitLength',
          blockType: Scratch.BlockType.REPORTER,
          text: '[a]按[b]分割的长度',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            },
            b:{
              type:Scratch.ArgumentType.STRING
            },
          }
        },
        {
          opcode:'lower',
          blockType:Scratch.BlockType.REPORTER,
          text:'小写字母[text]',
          arguments:{
            text:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'upper',
          blockType:Scratch.BlockType.REPORTER,
          text:'大写字母[text]',
          arguments:{
            text:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'stringtobase',
          blockType: Scratch.BlockType.REPORTER,
          text:'将字符串[str]转换为Base64',
          arguments:{
            str:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'basetostring',
          blockType: Scratch.BlockType.REPORTER,
          text:'将Base64[str]转换为字符串',
          arguments:{
            str:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'reverse',
          blockType:Scratch.BlockType.REPORTER,
          text:'反转字符串[a]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'StrReplace',
          blockType:Scratch.BlockType.REPORTER,
          text:'将[a]中的[b]替换为[c]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING,
            },
            b:{
              type:Scratch.ArgumentType.STRING
            },
            c:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'StrCut',
          blockType:Scratch.BlockType.REPORTER,
          text:'获取[a]从[b]位到[c]位的数据',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING,
            },
            b:{
              type:Scratch.ArgumentType.NUMBER
            },
            c:{
              type:Scratch.ArgumentType.NUMBER
            }
          }
        },
        {
          opcode: "strRepeat",
          blockType: Scratch.BlockType.REPORTER,
          text: "将[a]重复[b]次",
          arguments: {
            a: { 
              type: Scratch.ArgumentType.STRING 
            },
            b: { 
              type: Scratch.ArgumentType.NUMBER 
            }
          }
        },
        {
          blockType:'label',
          text:'数值相关'
        },
        {
          opcode:'GE',
          blockType:Scratch.BlockType.BOOLEAN,
          text:'[a] >= [b]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.NUMBER,
              defaultValue:2
            },
            b:{
              type:Scratch.ArgumentType.NUMBER,
              defaultValue:1
            }
          }
        },
        {
          opcode:'LE',
          blockType:Scratch.BlockType.BOOLEAN,
          text:'[a] <= [b]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.NUMBER,
              defaultValue:1
            },
            b:{
              type:Scratch.ArgumentType.NUMBER,
              defaultValue:2
            }
          }
        },
        {
          opcode:'prescription',
          blockType:Scratch.BlockType.REPORTER,
          text:'[a]√[b]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.NUMBER,
              defaultValue:2
            },
            b:{
              type:Scratch.ArgumentType.NUMBER,
              defaultValue:4
            }
          }
        },
        {
          opcode:'exponent',
          blockType:Scratch.BlockType.REPORTER,
          text:'[a]^[b]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.NUMBER,
              defaultValue:2
            },
            b:{
              type:Scratch.ArgumentType.NUMBER,
              defaultValue:4
            }
          }
        },
        {
          opcode:'NumRound',
          blockType:Scratch.BlockType.REPORTER,
          text:'四舍五入[a]保留[b]位小数',
          arguments:{
            a:{
              type:Scratch.ArgumentType.NUMBER,
            },
            b:{
              type:Scratch.ArgumentType.NUMBER
            },
          }
        },
        {
          blockType:'label',
          text:'其他功能'
        },
        {
          opcode:'StrictlyEquals',
          blockType:Scratch.BlockType.BOOLEAN,
          text:'[a]===[b]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            },
            b:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'GetOS',
          blockType:Scratch.BlockType.REPORTER,
          text:'用户操作系统'
        },
        {
          opcode:'TF',
          blockType:Scratch.BlockType.BOOLEAN,
          text:'[a]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING,
              menu:'boolean'
            }
          }
        },
        {
          opcode:'FPS',
          blockType:Scratch.BlockType.REPORTER,
          text:'FPS'
        },
        {
          blockType:'label',
          text:'键值对'
        },
        {
          opcode:'CreateKey',
          blockType:Scratch.BlockType.COMMAND,
          text:'初始化键值对[a] (仅小写字母)',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'SetKey',
          blockType:Scratch.BlockType.COMMAND,
          text:'将键值对[a]的键[b]赋值为[c]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            },
            b:{
              type:Scratch.ArgumentType.STRING
            },
            c:{
              type:Scratch.ArgumentType.STRING
            }
          } 
        },
        {
          opcode:'ReturnKey',
          blockType:Scratch.BlockType.REPORTER,
          text:'键值对[a]中键[b]的值',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING,
            },
            b:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'ReturnObj',
          blockType:Scratch.BlockType.REPORTER,
          text:'键值对[a]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode: 'DelKey',
          blockType: Scratch.BlockType.COMMAND,
          text: '删除键值对[a]中的键[b]',
          arguments: {
            a: {
               type: Scratch.ArgumentType.STRING 
            },
            b: { 
               type: Scratch.ArgumentType.STRING 
            }
          }
        },
        {
          opcode: 'DelObj',
          blockType: Scratch.BlockType.COMMAND,
          text: '删除键值对[a]',
          arguments: {
            a: { 
               type: Scratch.ArgumentType.STRING 
            },
          }
        },
        {
          opcode: 'AllObj',
          blockType: Scratch.BlockType.REPORTER,
          text: '所有键值对'
        },
        {
          opcode:'ResetObj',
          blockType:Scratch.BlockType.COMMAND,
          text:'删除所有键值对'
        },
        {
          blockType:'label',
          text:'弹窗'
        },
        {
          opcode:'NormalWindow',
          blockType:Scratch.BlockType.COMMAND,
          text:'显示提示窗口[a]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'ConfirmWindow',
          blockType:Scratch.BlockType.BOOLEAN,
          text:'显示确认窗口[a]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
        {
          opcode:'InputWindow',
          blockType:Scratch.BlockType.REPORTER,
          text:'显示输入窗口[a], 默认值[b]',
          arguments:{
            a:{
              type:Scratch.ArgumentType.STRING
            },
            b:{
              type:Scratch.ArgumentType.STRING
            }
          }
        },
      ],
      menus:{
        boolean:{
          acceptReporters:true,
          items:['真','假']
        },
        Types:{
          acceptReporters:true,
          items:['String','Number']
        }
      }
    };
  }

  StrSplitLength(args){
    return args.a.split(args.b).length;
  }
  datetimes() {
    return Math.floor((Date.now())/1000);
  };
  datetimems(){
    return(Date.now());
  };
  GetWeek(){
   const weekList = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
   const now = new Date();
   return(weekList[now.getDay()])
  };
  StrictlyEquals(args){
    return args.a === args.b;
  };
  lower(args){
    var a = args.text;
    var lower = a.toLowerCase();
    return(lower);
  };
  upper(args){
    var a  = args.text;
    var upper = a.toUpperCase();
    return(upper);
  };
  stringtobase(args){
    const reg = /[\u4e00-\u9fa5]/;
    const str = args.str;
    if(reg.test(str)){
      return btoa(unescape(encodeURIComponent(str)));
    }else{
      return btoa(str);
    }
  };
  basetostring(args){
    const str = args.str;
    return decodeURIComponent(escape(atob(str)));
  };
  GE(args){
    if(args.a > args.b || args.a == args.b){
      return true;
    }else{
      return false;
    }
  };
  LE(args){
    if(args.a < args.b || args.a == args.b){
      return true;
    }else{
      return false;
    }
  };
  TF(args){
    if(args.a === '真'){
      return true;
    }else{
      return false;
    }
  };
  FPS(){
    this.#GlobalValue.ticks += 1;
       const now = Date.now();
       const diff = now - this.#GlobalValue.last;
       if (diff >= 100) {
         this.#GlobalValue.fps = Math.round((1000 / diff) * this.#GlobalValue.ticks);
         this.#GlobalValue.last = now;
         this.#GlobalValue.ticks = 0;
       }
    return(this.#GlobalValue.fps)
  };
  prescription(args){
    return(Math.pow(args.b,1 / args.a))
  };
  exponent(args){
    return(Math.pow(args.a,args.b))
  };
  reverse(args){
    const str = String(args.a)
    return(str.split("").reverse().join(""))
  };
  CreateKey(args){
    var name = args.a;
    this.#KeyValueStore[name] = {}
  };
  SetKey(args){
    try{
    const name = args.a;
    const key = args.b;
    const value = args.c;
    this.#KeyValueStore[name][key] = value
    }catch(e){
      return('error');
    }
  };
  ReturnKey(args){
    try{
    const name = args.a;
    const key = args.b;
    const value = this.#KeyValueStore[name][key];
    return(value)
    }catch(e){
      return('error');
    }
  };
  ReturnObj(args){
    try{
    const name = args.a;
    const value = this.#KeyValueStore[name];
    return JSON.stringify(value)
    }catch(e){
      return('error')
    }
  };
  StrCut(args){
    const str = String(args.a);
    return str?.slice(args.b - 1, args.c) || ""
  };
  StrReplace(args){
    const str = String(args.a);
    return str?.replaceAll(args.b,args.c) || ""
  };
  NumRound(args){
    return Number(args.a.toFixed(args.b))
  };
  DelKey(args){
    delete this.#KeyValueStore[args.a][args.b]
  };
  DelObj(args){
    delete this.#KeyValueStore[args.a]
  };
  AllObj(){
    return JSON.stringify(this.#KeyValueStore)
  };
  StrSplit(args){ 
    const stra = String(args.a);
    const strb = String(args.b)
    const arr = (stra || "").split(strb); 
    return arr[Number(args.c)-1] || ""; 
  };
  strRepeat(args) {
    const str = String(args.a);
    return (str + "").repeat(Math.max(0, args.b | 0));
  };
  GetOS(){
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('windows')) {
     return 'Windows';
   } else if (ua.includes('mac os')) {
     return 'MacOS';
   } else if (ua.includes('android')) {
     return 'Android';
   } else if (ua.includes('linux')) {
     return 'Linux';
   } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
     return 'IOS';
   } else {
     return '未知系统';
   }
  };
  ResetObj(){
    this.#KeyValueStore = {}
  };
  NormalWindow(args){
    alert(args.a);
  };
  ConfirmWindow(args){
    return(confirm(args.a))
  };
  InputWindow(args){
    return(prompt(args.a,args.b))
  }
}

Scratch.extensions.register(new SheepToolkit());
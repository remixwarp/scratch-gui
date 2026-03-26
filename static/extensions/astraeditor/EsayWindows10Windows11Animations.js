// Name: Imitating Windows10&11 window pop-up animations
// ID: EsayWindows10Windows11Animations
// Description: Let your Scratch OS project have window pop-up animations similar to Windows 10 & 11.
// By: 蓝莓是颗果 <https://space.bilibili.com/3546904308746714>
// License: ↓{
// Copyright (c) 蓝莓是颗果 2026
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//}


(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    console.warn("此扩展需要在非沙盒环境下运行");
    return;
  }

  class WindowsPopAnimation {
    constructor() {
      this.runtime = Scratch.vm.runtime;
      this._win11PeakScale = 1.1;
      this._win10PeakScale = 1.08;
    }

    getInfo() {
      return {
        id: "EsayWindows10Windows11Animations",
        name: "仿Windows10、11窗口弹出动画",
        blockIconURI: "data:image/png;base64,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AAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQTAAAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAQF4zE5BQbwKgUffK9/b+BICKSkRYgVyHuhQjAAD8EU2DQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5AB4EOAIBAB4EOAh0AAIGOQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5AB4EOAIBAB4EOAh0AAIGOQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5AB4EOAIBAB4EOAh0AAIGOQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5AB4EOAIBAB4EOAh0AAIGOQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5Ad5gR6AAACHQQ6PDzQ31+dlYAGnWf7JavKh+31/livKw9AqBJ29fFCGQwMwEJDSYAGtWPv1ofmWvvT6Bh/kJJClMTAAAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgmAAAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAgLxKRFgBAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABLpABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEu0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAACC9jwADACn9CdJc1WwjAAAAAElFTkSuQmCC",
        color1: "#50C2FF",
        color2: "#0095E6",
        color3: "#007DC0",
        menuIconURI: "data:image/png;base64,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AAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQAAABAoAMAAIBABwAAAAQ6AAAACHQTAAAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAQF4zE5BQbwKgUffK9/b+BICKSkRYgVyHuhQjAAD8EU2DQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5AB4EOAIBAB4EOAh0AAIGOQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5AB4EOAIBAB4EOAh0AAIGOQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5AB4EOAIBAB4EOAh0AAIGOQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5AB4EOAIBAB4EOAh0AAIGOQAeBDgCAQAeBDgIdAACBjkAHgQ4AgEAHgQ4CHQAAgY5Ad5gR6AAACHQQ6PDzQ31+dlYAGnWf7JavKh+31/livKw9AqBJ29fFCGQwMwEJDSYAGtWPv1ofmWvvT6Bh/kJJClMTAAAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAgEAHAAAABDoAAAAIdAAAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAAAg0AEAAACBDgAAAAIdAAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgAAACAQAcAAACBDgAAAAh0AAAAEOgmAAAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAgLxKRFgBAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABLpABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEOAAAACHQAAAAQ6AAAAIBABwAAAIEu0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAAECgAwAAAAIdAAAABDoAAAAg0AEAACC9jwADACn9CdJc1WwjAAAAAElFTkSuQmCC",
        
        blocks: [
          //仿Windows 11 窗口风格区块
          {
            opcode: "separatorWin11",
            blockType: Scratch.BlockType.LABEL,
            text: "Windows 11",
          },
          {
            opcode: "popAnimationWin11",
            blockType: Scratch.BlockType.COMMAND,
            text: "仿Windows11窗口弹出动画 [DURATION] 秒 [EASING]",
            arguments: {
              DURATION: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0.3,
              },
              EASING: {
                type: Scratch.ArgumentType.STRING,
                menu: "win11EasingMenu",
                defaultValue: "弹性",
              },
            },
          },
          {
            opcode: "popOutAnimationWin11",
            blockType: Scratch.BlockType.COMMAND,
            text: "仿Windows11 收回动画 [DURATION] 秒 [EASING]",
            arguments: {
              DURATION: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0.25,
              },
              EASING: {
                type: Scratch.ArgumentType.STRING,
                menu: "win11EasingMenu",
                defaultValue: "弹性",
              },
            },
          },
          {
            opcode: "setWin11Scale",
            blockType: Scratch.BlockType.COMMAND,
            text: "设置 Windows11弹出峰值倍数为 [SCALE]",
            arguments: {
              SCALE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1.1,
              },
            },
          },
          {
            opcode: "getWin11Scale",
            blockType: Scratch.BlockType.REPORTER,
            text: "Windows11弹出峰值倍数",
          },

          // 仿Windows 10 窗口风格区块
          {
            opcode: "separatorWin10",
            blockType: Scratch.BlockType.LABEL,
            text: "Windows 10",
          },
          {
            opcode: "popAnimationWin10",
            blockType: Scratch.BlockType.COMMAND,
            text: "仿Windows10窗口弹出动画 [DURATION] 秒 [EASING]",
            arguments: {
              DURATION: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0.25,
              },
              EASING: {
                type: Scratch.ArgumentType.STRING,
                menu: "win10EasingMenu",
                defaultValue: "标准",
              },
            },
          },
          {
            opcode: "popOutAnimationWin10",
            blockType: Scratch.BlockType.COMMAND,
            text: "仿Windows10收回动画 [DURATION] 秒 [EASING]",
            arguments: {
              DURATION: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0.2,
              },
              EASING: {
                type: Scratch.ArgumentType.STRING,
                menu: "win10EasingMenu",
                defaultValue: "标准",
              },
            },
          },
          {
            opcode: "setWin10Scale",
            blockType: Scratch.BlockType.COMMAND,
            text: "设置 Windows10弹出峰值倍数为 [SCALE]",
            arguments: {
              SCALE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1.08,
              },
            },
          },
          {
            opcode: "getWin10Scale",
            blockType: Scratch.BlockType.REPORTER,
            text: "Windows10弹出峰值倍数",
          },
        ],

        menus: {
          win11EasingMenu: {
            acceptReporters: true,
            items: ["弹性", "平滑"],
          },
          win10EasingMenu: {
            acceptReporters: true,
            items: ["标准", "快速", "平滑"],
          },
        },
      };
    }

    // Windows11相关方法
    setWin11Scale(args) {
      const scale = Math.max(0.5, Math.min(3, Number(args.SCALE) || 1.1));
      this._win11PeakScale = scale;
    }

    getWin11Scale() {
      return this._win11PeakScale;
    }

    popAnimationWin11(args, util) {
      const duration = Math.max(0.05, Number(args.DURATION) || 0.3);
      const easingType = args.EASING || "弹性";
      const target = util.target;
      const originalScale = target.size;
      const peak = this._win11PeakScale;

      const startTime = performance.now() / 1000;

      return new Promise((resolve) => {
        const animate = () => {
          const now = performance.now() / 1000;
          const elapsed = now - startTime;
          let progress = Math.min(elapsed / duration, 1);
          let scaleFactor;

          if (easingType === "弹性") {
            if (progress < 0.8) {
              const subProgress = progress / 0.8;
              if (subProgress < 0.5) {
                const t = subProgress * 2;
                scaleFactor = 1 + (peak - 1) * t * t * 1.2;
              } else {
                const t = (subProgress - 0.5) * 2;
                const bounce = 0.05 * Math.sin(t * Math.PI * 4);
                scaleFactor = peak - (peak - 1) * t * 0.8 + bounce;
                if (scaleFactor < 1.0) scaleFactor = 1.0 - (1.0 - scaleFactor) * 0.5;
              }
            } else {
              const t = (progress - 0.8) / 0.2;
              scaleFactor = 1.0 + 0.02 * Math.sin(t * Math.PI * 4) * (1 - t);
            }
            scaleFactor = Math.max(0.8, Math.min(peak * 1.2, scaleFactor));
          } else {

            if (progress < 0.5) {
              const subProgress = progress / 0.5;
              const easedSub = subProgress * (2 - subProgress);
              scaleFactor = 1 + (peak - 1) * easedSub;
            } else {
              const subProgress = (progress - 0.5) / 0.5;
              const easedSub = subProgress * subProgress;
              scaleFactor = peak - (peak - 1) * easedSub;
            }
          }

          target.setSize(originalScale * scaleFactor);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            target.setSize(originalScale);
            resolve();
          }
        };
        animate();
      });
    }

    popOutAnimationWin11(args, util) {
      const duration = Math.max(0.05, Number(args.DURATION) || 0.25);
      const easingType = args.EASING || "弹性";
      const target = util.target;
      const originalScale = target.size;

      const startTime = performance.now() / 1000;

      return new Promise((resolve) => {
        const animate = () => {
          const now = performance.now() / 1000;
          const elapsed = now - startTime;
          let progress = Math.min(elapsed / duration, 1);
          let scaleFactor;

          if (easingType === "弹性") {
            if (progress < 0.3) {
              const subProgress = progress / 0.3;
              scaleFactor = 1 + 0.05 * subProgress;
            } else if (progress < 0.7) {
              const subProgress = (progress - 0.3) / 0.4;
              const eased = subProgress * (2 - subProgress);
              scaleFactor = 1.05 - (1.05 - 0.2) * eased;
            } else {
              const subProgress = (progress - 0.7) / 0.3;
              const bounce = 0.03 * Math.sin(subProgress * Math.PI * 6) * (1 - subProgress);
              scaleFactor = 0.2 * (1 - subProgress) + bounce;
              if (scaleFactor < 0) scaleFactor = 0;
            }
          } else {
            const t = progress;
            const eased = t * t * t;
            scaleFactor = 1 - eased;
          }

          target.setSize(originalScale * Math.max(0, scaleFactor));

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            target.setSize(0);
            resolve();
          }
        };
        animate();
      });
    }

    //Windows10相关方法
    setWin10Scale(args) {
      const scale = Math.max(0.5, Math.min(3, Number(args.SCALE) || 1.08));
      this._win10PeakScale = scale;
    }

    getWin10Scale() {
      return this._win10PeakScale;
    }

    popAnimationWin10(args, util) {
      const duration = Math.max(0.05, Number(args.DURATION) || 0.25);
      const easingType = args.EASING || "标准";
      const target = util.target;
      const originalScale = target.size;
      const peak = this._win10PeakScale;

      const startTime = performance.now() / 1000;

      return new Promise((resolve) => {
        const animate = () => {
          const now = performance.now() / 1000;
          const elapsed = now - startTime;
          let progress = Math.min(elapsed / duration, 1);
          let scaleFactor;

          if (easingType === "标准") {
            if (progress < 0.7) {
              const subProgress = progress / 0.7;
              const eased = subProgress * (2 - subProgress);
              scaleFactor = 1 + (peak - 1) * eased * 1.05;
            } else {
              const subProgress = (progress - 0.7) / 0.3;
              const eased = (1 - Math.cos(subProgress * Math.PI)) / 2;
              const undershoot = 0.98;
              scaleFactor = peak - (peak - undershoot) * eased;
              if (progress > 0.95) {
                scaleFactor = 1 + (scaleFactor - 1) * (1 - (progress - 0.95) / 0.05);
              }
            }
          } else if (easingType === "快速") {
            if (progress < 0.5) {
              const subProgress = progress / 0.5;
              const eased = subProgress * (2 - subProgress);
              scaleFactor = 1 + (peak - 1) * eased;
            } else {
              const subProgress = (progress - 0.5) / 0.5;
              const eased = subProgress * subProgress;
              scaleFactor = peak - (peak - 1) * eased;
            }
          } else {
            const t = progress;
            const eased = 1 - Math.pow(1 - t, 3);
            scaleFactor = 1 + (peak - 1) * eased;
          }

          scaleFactor = Math.max(0.5, Math.min(peak * 1.2, scaleFactor));
          target.setSize(originalScale * scaleFactor);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            target.setSize(originalScale);
            resolve();
          }
        };
        animate();
      });
    }

    popOutAnimationWin10(args, util) {
      const duration = Math.max(0.05, Number(args.DURATION) || 0.2);
      const easingType = args.EASING || "标准";
      const target = util.target;
      const originalScale = target.size;

      const startTime = performance.now() / 1000;

      return new Promise((resolve) => {
        const animate = () => {
          const now = performance.now() / 1000;
          const elapsed = now - startTime;
          let progress = Math.min(elapsed / duration, 1);
          let scaleFactor;

          if (easingType === "标准") {
            if (progress < 0.2) {
              const subProgress = progress / 0.2;
              scaleFactor = 1 + 0.03 * subProgress;
            } else if (progress < 0.6) {
              const subProgress = (progress - 0.2) / 0.4;
              const eased = subProgress * (2 - subProgress);
              scaleFactor = 1.03 - (1.03 - 0.2) * eased;
            } else {
              const subProgress = (progress - 0.6) / 0.4;
              const bounce = 0.02 * Math.sin(subProgress * Math.PI * 5) * (1 - subProgress);
              scaleFactor = 0.2 * (1 - subProgress) + bounce;
              if (scaleFactor < 0) scaleFactor = 0;
            }
          } else if (easingType === "快速") {
            const t = progress;
            const eased = t * t * t;
            scaleFactor = 1 - eased;
          } else {
            const t = progress;
            const eased = (1 - Math.cos(t * Math.PI)) / 2;
            scaleFactor = 1 - eased;
          }

          scaleFactor = Math.max(0, Math.min(1.2, scaleFactor));
          target.setSize(originalScale * scaleFactor);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            target.setSize(0);
            resolve();
          }
        };
        animate();
      });
    }

    separatorWin11() {}
    separatorWin10() {}
  }

  Scratch.extensions.register(new WindowsPopAnimation());
})(Scratch);

//
//
//           |            |
//           |            |
//          
//
//
//      |                      |
//        |                  |
//          |              |
//            ||||||||||||
//              
//         Be happy every day!!
//
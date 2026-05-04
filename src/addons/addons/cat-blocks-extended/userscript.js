/**
 * Based on https://github.com/scratchfoundation/scratch-blocks/compare/hotfix/totally-normal-2021 (Apache 2.0)
 * It has been modified to work properly in our environment and fix some bugs.
 */

export default async function ({ addon, console }) {
  const Blockly = await addon.tab.traps.getBlockly();

  const shouldWatchMouseCursor = true;

  Blockly.BlockSvg.prototype.CAT_BLOCKS = true;

  Blockly.BlockSvg.START_HAT_HEIGHT = 31;

  Blockly.BlockSvg.START_HAT_PATH =
    "c2.6,-2.3 5.5,-4.3 8.5,-6.2" +
    "c-1,-12.5 5.3,-23.3 8.4,-24.8c3.7,-1.8 16.5,13.1 18.4,15.4" +
    "c8.4,-1.3 17,-1.3 25.4,0c1.9,-2.3 14.7,-17.2 18.4,-15.4" +
    "c3.1,1.5 9.4,12.3 8.4,24.8c3,1.8 5.9,3.9 8.5,6.1";

  Blockly.BlockSvg.TOP_LEFT_CORNER_DEFINE_HAT =
    "c0,-7.1 3.7,-13.3 9.3,-16.9c1.7,-7.5 5.4,-13.2 7.6,-14.2" +
    "c2.6,-1.3 10,6 14.6,11.1h33c4.6,-5.1 11.9,-12.4 14.6,-11.1" +
    "c1.9,0.9 4.9,5.2 6.8,11.1c2.6,0,5.2,0,7.8,0";

  Blockly.BlockSvg.prototype.renderCatFace_ = function () {
    this.catPath_.svgFace.setAttribute("fill", "#000000");

    var closedEye = Blockly.utils.createSvgElement("path", {}, this.svgFace_);
    closedEye.setAttribute(
      "d",
      "M25.2-1.1c0.1,0,0.2,0,0.2,0l8.3-2.1l-7-4.8" +
        "c-0.5-0.3-1.1-0.2-1.4,0.3s-0.2,1.1,0.3,1.4L29-4.1l-4,1" +
        "c-0.5,0.1-0.9,0.7-0.7,1.2C24.3-1.4,24.7-1.1,25.2-1.1z"
    );
    closedEye.setAttribute("fill-opacity", "0");
    this.catPath_.svgFace.closedEye = closedEye;

    var closedEye2 = Blockly.utils.createSvgElement("path", {}, this.svgFace_);
    closedEye2.setAttribute(
      "d",
      "M62.4-1.1c-0.1,0-0.2,0-0.2,0l-8.3-2.1l7-4.8" +
        "c0.5-0.3,1.1-0.2,1.4,0.3s0.2,1.1-0.3,1.4l-3.4,2.3l4,1" +
        "c0.5,0.1,0.9,0.7,0.7,1.2C63.2-1.4,62.8-1.1,62.4-1.1z"
    );
    closedEye2.setAttribute("fill-opacity", "0");
    this.catPath_.svgFace.closedEye2 = closedEye2;

    var eye = Blockly.utils.createSvgElement("circle", {}, this.svgFace_);
    eye.setAttribute("cx", "59.2");
    eye.setAttribute("cy", "-3.3");
    eye.setAttribute("r", "3.4");
    eye.setAttribute("fill-opacity", "0.6");
    this.catPath_.svgFace.eye = eye;

    var eye2 = Blockly.utils.createSvgElement("circle", {}, this.svgFace_);
    eye2.setAttribute("cx", "29.1");
    eye2.setAttribute("cy", "-3.3");
    eye2.setAttribute("r", "3.4");
    eye2.setAttribute("fill-opacity", "0.6");
    this.catPath_.svgFace.eye2 = eye2;

    var mouth = Blockly.utils.createSvgElement("path", {}, this.svgFace_);
    mouth.setAttribute(
      "d",
      "M45.6,0.1c-0.9,0-1.7-0.3-2.3-0.9" +
        "c-0.6,0.6-1.3,0.9-2.2,0.9c-0.9,0-1.8-0.3-2.3-0.9c-1-1.1-1.1-2.6-1.1-2.8" +
        "c0-0.5,0.5-1,1-1l0,0c0.6,0,1,0.5,1,1c0,0.4,0.1,1.7,1.4,1.7" +
        "c0.5,0,0.7-0.2,0.8-0.3c0.3-0.3,0.4-1,0.4-1.3c0-0.1,0-0.1,0-0.2" +
        "c0-0.5,0.5-1,1-1l0,0c0.5,0,1,0.4,1,1c0,0,0,0.1,0,0.2" +
        "c0,0.3,0.1,0.9,0.4,1.2C44.8-2.2,45-2,45.5-2s0.7-0.2,0.8-0.3" +
        "c0.3-0.4,0.4-1.1,0.3-1.3c0-0.5,0.4-1,0.9-1.1c0.5,0,1,0.4,1.1,0.9" +
        "c0,0.2,0.1,1.8-0.8,2.8C47.5-0.4,46.8,0.1,45.6,0.1z"
    );
    mouth.setAttribute("fill-opacity", "0.6");
    this.catPath_.svgFace.mouth = mouth;

    this.catPath_.ear.setAttribute(
      "d",
      "M73.1-15.6c1.7-4.2,4.5-9.1,5.8-8.5" +
        "c1.6,0.8,5.4,7.9,5,15.4c0,0.6-0.7,0.7-1.1,0.5c-3-1.6-6.4-2.8-8.6-3.6" +
        "C72.8-12.3,72.4-13.7,73.1-15.6z"
    );
    this.catPath_.ear.setAttribute("fill", "#FFD5E6");

    this.catPath_.ear2.setAttribute(
      "d",
      "M22.4-15.6c-1.7-4.2-4.5-9.1-5.8-8.5" +
        "c-1.6,0.8-5.4,7.9-5,15.4c0,0.6,0.7,0.7,1.1,0.5c3-1.6,6.4-2.8,8.6-3.6" +
        "C22.8-12.3,23.2-13.7,22.4-15.6z"
    );
    this.catPath_.ear2.setAttribute("fill", "#FFD5E6");
  };

  Blockly.BlockSvg.prototype.updateHappinessDisplay = function () {
    if (!this.catHappinessDisplay) {
      this.catHappinessDisplay = Blockly.utils.createSvgElement("g", {
        "class": "cat-happiness-display"
      }, this.svgGroup_);
      
      this.happinessBackground = Blockly.utils.createSvgElement("rect", {
        "rx": "3",
        "ry": "3",
        "fill": "#FFF0F5",
        "stroke": "#FFB6C1",
        "stroke-width": "1"
      }, this.catHappinessDisplay);
      
      this.happinessText = Blockly.utils.createSvgElement("text", {
        "fill": "#FF69B4",
        "font-size": "9",
        "font-weight": "bold",
        "text-anchor": "middle",
        "dominant-baseline": "middle"
      }, this.catHappinessDisplay);
      
      this.happinessEmoji = Blockly.utils.createSvgElement("text", {
        "fill": "#FF69B4",
        "font-size": "11",
        "text-anchor": "middle",
        "dominant-baseline": "middle"
      }, this.catHappinessDisplay);
    }
    
    const emoji = this.getHappinessEmoji();
    this.happinessEmoji.textContent = emoji;
    this.happinessText.textContent = this.catHappiness;
    
    const textWidth = (this.catHappiness.toString().length + 1) * 6;
    const totalWidth = textWidth + 20;
    const totalHeight = 16;
    
    this.happinessBackground.setAttribute("width", totalWidth);
    this.happinessBackground.setAttribute("height", totalHeight);
    this.happinessBackground.setAttribute("x", this.width + 2);
    this.happinessBackground.setAttribute("y", -8);
    
    this.happinessText.setAttribute("x", this.width + 12);
    this.happinessText.setAttribute("y", 0);
    
    this.happinessEmoji.setAttribute("x", this.width + totalWidth - 10);
    this.happinessEmoji.setAttribute("y", 0);
    
    this.updateBlockColor();
  };

  Blockly.BlockSvg.prototype.updateBlockColor = function () {
    if (!this.svgPath_) return;
    
    if (this.catHappiness < 10) {
      if (!this.originalFill_) {
        this.originalFill_ = this.svgPath_.getAttribute("fill") || "#ffbf5f";
      }
      if (!this.originalStroke_) {
        this.originalStroke_ = this.svgPath_.getAttribute("stroke") || "#e6a73c";
      }
      this.svgPath_.setAttribute("fill", "#FF6B6B");
      this.svgPath_.setAttribute("stroke", "#FF4444");
    } else {
      if (this.originalFill_) {
        this.svgPath_.setAttribute("fill", this.originalFill_);
        this.originalFill_ = null;
      }
      if (this.originalStroke_) {
        this.svgPath_.setAttribute("stroke", this.originalStroke_);
        this.originalStroke_ = null;
      }
    }
  };

  Blockly.BlockSvg.prototype.hideHappinessDisplay = function () {
    if (this.catHappinessDisplay) {
      this.catHappinessDisplay.setAttribute("display", "none");
    }
  };

  Blockly.BlockSvg.prototype.showHappinessDisplay = function () {
    if (this.catHappinessDisplay) {
      this.catHappinessDisplay.removeAttribute("display");
    }
  };

  Blockly.BlockSvg.prototype.getHappinessEmoji = function () {
    if (this.catHappiness >= 80) return "😻";
    if (this.catHappiness >= 60) return "😸";
    if (this.catHappiness >= 40) return "😺";
    if (this.catHappiness >= 20) return "😿";
    return "😾";
  };

  Blockly.BlockSvg.prototype.initCatStuff = function () {
    if (this.hasInitCatStuff) return;
    this.hasInitCatStuff = true;

    this.catHappiness = 50;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.waveCount = 0;
    this.waveTimer = null;
    this.isHoveringCat = false;

    var LEFT_EAR_UP = "c-1,-12.5 5.3,-23.3 8.4,-24.8c3.7,-1.8 16.5,13.1 18.4,15.4";
    var LEFT_EAR_DOWN = "c-5.8,-4.8 -8,-18 -4.9,-19.5c3.7,-1.8 24.5,11.1 31.7,10.1";
    var RIGHT_EAR_UP = "c1.9,-2.3 14.7,-17.2 18.4,-15.4c3.1,1.5 9.4,12.3 8.4,24.8";
    var RIGHT_EAR_DOWN = "c7.2,1 28,-11.9 31.7,-10.1c3.1,1.5 0.9,14.7 -4.9,19.5";
    var DEFINE_HAT_LEFT_EAR_UP = "c0,-7.1 3.7,-13.3 9.3,-16.9c1.7,-7.5 5.4,-13.2 7.6,-14.2c2.6,-1.3 10,6 14.6,11.1";
    var DEFINE_HAT_RIGHT_EAR_UP = "h33c4.6,-5.1 11.9,-12.4 14.6,-11.1c1.9,0.9 4.9,5.2 6.8,11.1c2.6,0,5.2,0,7.8,0";
    var DEFINE_HAT_LEFT_EAR_DOWN =
      "c0,-4.6 1.6,-8.9 4.3,-12.3c-2.4,-5.6 -2.9,-12.4 -0.7,-13.4c2.1,-1 9.6,2.6 17,5.8" + "c2.6,0 6.2,0 10.9,0";
    var DEFINE_HAT_RIGHT_EAR_DOWN = "c0,0 25.6,0 44,0c7.4,-3.2 14.8,-6.8 16.9,-5.8c1.2,0.6 1.6,2.9 1.3,5.8";

    var that = this;
    this.catPath_.ear = Blockly.utils.createSvgElement("path", {}, this.catPath_);
    this.catPath_.ear2 = Blockly.utils.createSvgElement("path", {}, this.catPath_);
    if (this.RTL) {
      this.catPath_.ear.setAttribute("transform", "scale(-1 1)");
      this.catPath_.ear2.setAttribute("transform", "scale(-1 1)");
    }

    this.catPath_.addEventListener("mouseenter", function (event) {
      that.isHoveringCat = true;
      that.startWaveDetection(event);
      clearTimeout(that.blinkFn);
      if (event.target.svgFace && event.target.svgFace.eye) {
        event.target.svgFace.eye.setAttribute("fill-opacity", "0");
        event.target.svgFace.eye2.setAttribute("fill-opacity", "0");
        event.target.svgFace.closedEye.setAttribute("fill-opacity", "0.6");
        event.target.svgFace.closedEye2.setAttribute("fill-opacity", "0.6");
      }

      that.blinkFn = setTimeout(function () {
        if (event.target.svgFace && event.target.svgFace.eye) {
          event.target.svgFace.eye.setAttribute("fill-opacity", "0.6");
          event.target.svgFace.eye2.setAttribute("fill-opacity", "0.6");
          event.target.svgFace.closedEye.setAttribute("fill-opacity", "0");
          event.target.svgFace.closedEye2.setAttribute("fill-opacity", "0");
        }
      }, 100);
    });

    this.catPath_.addEventListener("mouseleave", function () {
      that.isHoveringCat = false;
      that.stopWaveDetection();
    });

    this.catPath_.addEventListener("mousemove", function (event) {
      if (that.isHoveringCat) {
        that.detectWaveOnCat(event);
      }
    });

    this.catPath_.ear.addEventListener("mouseenter", function (e) {
      that.isHoveringCat = true;
      that.startWaveDetection(e);
      that.triggerEarFlick(true);
      that.addHappiness(5);
    });

    this.catPath_.ear.addEventListener("mouseleave", function () {
      that.isHoveringCat = false;
      that.stopWaveDetection();
    });

    this.catPath_.ear2.addEventListener("mouseenter", function (e) {
      that.isHoveringCat = true;
      that.startWaveDetection(e);
      that.triggerEarFlick(false);
      that.addHappiness(5);
    });

    this.catPath_.ear2.addEventListener("mouseleave", function () {
      that.isHoveringCat = false;
      that.stopWaveDetection();
    });

    if (this.RTL) {
      this.svgFace_.style.transform = "translate(-87px, 0px)";
    }

    if (this.shouldWatchMouse()) {
      this.windowListener = function (event) {
        var time = Date.now();
        if (time < that.lastCallTime + that.CALL_FREQUENCY_MS) return;
        that.lastCallTime = time;
        if (!that.shouldWatchMouse()) return;

        if (that.workspace) {
          var xy = that.getCatFacePosition();
          var dx = event.clientX / that.workspace.scale - xy.x;
          var dy = event.clientY / that.workspace.scale - xy.y;
          var theta = Math.atan2(dx, dy);

          var delta = Math.sqrt(dx * dx + dy * dy);
          var scaleFactor = delta / (delta + 1);

          var a = 2;
          var b = 5;
          var r = (a * b) / Math.sqrt(Math.pow(b * Math.cos(theta), 2) + Math.pow(a * Math.sin(theta), 2));

          dx = r * scaleFactor * Math.sin(theta);
          dy = r * scaleFactor * Math.cos(theta);

          if (that.RTL) dx -= 87;
          that.svgFace_.style.transform = "translate(" + dx + "px, " + dy + "px)";
        }
      };
      document.addEventListener("mousemove", this.windowListener);
    }
  };

  Blockly.BlockSvg.prototype.triggerEarFlick = function (isLeftEar) {
    var LEFT_EAR_UP = "c-1,-12.5 5.3,-23.3 8.4,-24.8c3.7,-1.8 16.5,13.1 18.4,15.4";
    var LEFT_EAR_DOWN = "c-5.8,-4.8 -8,-18 -4.9,-19.5c3.7,-1.8 24.5,11.1 31.7,10.1";
    var RIGHT_EAR_UP = "c1.9,-2.3 14.7,-17.2 18.4,-15.4c3.1,1.5 9.4,12.3 8.4,24.8";
    var RIGHT_EAR_DOWN = "c7.2,1 28,-11.9 31.7,-10.1c3.1,1.5 0.9,14.7 -4.9,19.5";
    var DEFINE_HAT_LEFT_EAR_UP = "c0,-7.1 3.7,-13.3 9.3,-16.9c1.7,-7.5 5.4,-13.2 7.6,-14.2c2.6,-1.3 10,6 14.6,11.1";
    var DEFINE_HAT_RIGHT_EAR_UP = "h33c4.6,-5.1 11.9,-12.4 14.6,-11.1c1.9,0.9 4.9,5.2 6.8,11.1c2.6,0,5.2,0,7.8,0";
    var DEFINE_HAT_LEFT_EAR_DOWN =
      "c0,-4.6 1.6,-8.9 4.3,-12.3c-2.4,-5.6 -2.9,-12.4 -0.7,-13.4c2.1,-1 9.6,2.6 17,5.8" + "c2.6,0 6.2,0 10.9,0";
    var DEFINE_HAT_RIGHT_EAR_DOWN = "c0,0 25.6,0 44,0c7.4,-3.2 14.8,-6.8 16.9,-5.8c1.2,0.6 1.6,2.9 1.3,5.8";

    clearTimeout(this.earFn);
    clearTimeout(this.ear2Fn);
    
    if (isLeftEar) {
      this.catPath_.ear.setAttribute("fill-opacity", "0");
      this.catPath_.ear2.setAttribute("fill-opacity", "");
      var bodyPath = this.catPath_.svgBody.getAttribute("d");
      bodyPath = bodyPath.replace(RIGHT_EAR_UP, RIGHT_EAR_DOWN);
      bodyPath = bodyPath.replace(DEFINE_HAT_RIGHT_EAR_UP, DEFINE_HAT_RIGHT_EAR_DOWN);
      bodyPath = bodyPath.replace(LEFT_EAR_DOWN, LEFT_EAR_UP);
      bodyPath = bodyPath.replace(DEFINE_HAT_LEFT_EAR_DOWN, DEFINE_HAT_LEFT_EAR_UP);
      this.catPath_.svgBody.setAttribute("d", bodyPath);

      this.earFn = setTimeout(() => {
        this.catPath_.ear.setAttribute("fill-opacity", "");
        var bodyPath = this.catPath_.svgBody.getAttribute("d");
        bodyPath = bodyPath.replace(RIGHT_EAR_DOWN, RIGHT_EAR_UP);
        bodyPath = bodyPath.replace(DEFINE_HAT_RIGHT_EAR_DOWN, DEFINE_HAT_RIGHT_EAR_UP);
        this.catPath_.svgBody.setAttribute("d", bodyPath);
      }, 50);
    } else {
      this.catPath_.ear2.setAttribute("fill-opacity", "0");
      this.catPath_.ear.setAttribute("fill-opacity", "");
      var bodyPath = this.catPath_.svgBody.getAttribute("d");
      bodyPath = bodyPath.replace(LEFT_EAR_UP, LEFT_EAR_DOWN);
      bodyPath = bodyPath.replace(DEFINE_HAT_LEFT_EAR_UP, DEFINE_HAT_LEFT_EAR_DOWN);
      bodyPath = bodyPath.replace(RIGHT_EAR_DOWN, RIGHT_EAR_UP);
      bodyPath = bodyPath.replace(DEFINE_HAT_RIGHT_EAR_DOWN, DEFINE_HAT_RIGHT_EAR_UP);
      this.catPath_.svgBody.setAttribute("d", bodyPath);

      this.ear2Fn = setTimeout(() => {
        this.catPath_.ear2.setAttribute("fill-opacity", "");
        var bodyPath = this.catPath_.svgBody.getAttribute("d");
        bodyPath = bodyPath.replace(LEFT_EAR_DOWN, LEFT_EAR_UP);
        bodyPath = bodyPath.replace(DEFINE_HAT_LEFT_EAR_DOWN, DEFINE_HAT_LEFT_EAR_UP);
        this.catPath_.svgBody.setAttribute("d", bodyPath);
      }, 50);
    }
  };

  Blockly.BlockSvg.prototype.startWaveDetection = function (event) {
    if (this.waveDetectionActive) return;
    this.waveDetectionActive = true;
    this.waveCount = 0;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  };

  Blockly.BlockSvg.prototype.stopWaveDetection = function () {
    this.waveDetectionActive = false;
    if (this.waveTimer) {
      clearTimeout(this.waveTimer);
      this.waveTimer = null;
    }
    if (this.waveCount > 0) {
      this.waveCount = 0;
    }
  };

  Blockly.BlockSvg.prototype.detectWaveOnCat = function (event) {
    if (!this.waveDetectionActive) return;
    
    var dx = event.clientX - this.lastMouseX;
    
    if (Math.abs(dx) > 10) {
      this.waveCount++;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      
      if (this.waveTimer) clearTimeout(this.waveTimer);
      this.waveTimer = setTimeout(() => {
        if (this.waveCount >= 3) {
          this.addHappiness(10);
        }
        this.waveCount = 0;
      }, 500);
    }
  };

  Blockly.BlockSvg.prototype.addHappiness = function (amount) {
    if (this.happinessDecayInterval) {
      clearInterval(this.happinessDecayInterval);
    }
    
    this.catHappiness = Math.min(100, Math.max(0, this.catHappiness + amount));
    this.updateHappinessDisplay();
    
    const decay = () => {
      if (this.catHappiness > 0) {
        this.catHappiness = Math.max(0, this.catHappiness - 1);
        this.updateHappinessDisplay();
      } else {
        clearInterval(this.happinessDecayInterval);
        this.happinessDecayInterval = null;
      }
    };
    
    decay();
    
    const randomDelay = () => {
      return 1000 + Math.random() * 1000;
    };
    
    const scheduleNext = () => {
      if (this.catHappiness > 0) {
        this.happinessDecayInterval = setTimeout(() => {
          decay();
          scheduleNext();
        }, randomDelay());
      }
    };
    
    scheduleNext();
  };

  let workspacePositionRect = null;
  Blockly.BlockSvg.prototype.getCatFacePosition = function () {
    if (!workspacePositionRect) {
      workspacePositionRect = this.workspace.getParentSvg().getBoundingClientRect();
    }
    var offset = { x: workspacePositionRect.x, y: workspacePositionRect.y };

    if (!this.isInFlyout && this.workspace.getFlyout()) {
      offset.x += this.workspace.getFlyout().getWidth();
    }

    offset.x += this.workspace.scrollX;
    offset.y += this.workspace.scrollY;

    var xy = this.getRelativeToSurfaceXY(this.svgGroup_);
    if (this.RTL) {
      xy.x = this.workspace.getWidth() - xy.x - this.width;
    }
    xy.x += offset.x / this.workspace.scale;
    xy.y += offset.y / this.workspace.scale;
    xy.x -= 43.5;
    xy.y -= 4;
    xy.x += 60;
    if (this.RTL) {
      xy.x = screen.width - xy.x;
    }
    return xy;
  };

  Blockly.BlockSvg.prototype.shouldWatchMouse = function () {
    if (!shouldWatchMouseCursor) return false;
    var xy = this.getCatFacePosition();
    const MARGIN = 50;
    var blockXOnScreen = xy.x > -MARGIN && xy.x - MARGIN < screen.width / this.workspace.scale;
    var blockYOnScreen = xy.y > -MARGIN && xy.y - MARGIN < screen.height / this.workspace.scale;
    return this.startHat_ && !this.isGlowingStack_ && blockXOnScreen && blockYOnScreen;
  };

  const originalRenderDraw = Blockly.BlockSvg.prototype.renderDraw_;
  Blockly.BlockSvg.prototype.renderDraw_ = function (...args) {
    if (!this.svgFace_) {
      this.sa_catBlockConstructor();
    }
    const r = originalRenderDraw.call(this, ...args);
    if (!this.outputConnection && !this.previousConnection) {
      this.initCatStuff();
    }
    if (this.startHat_ && !this.svgFace_.firstChild) {
      this.renderCatFace_();
    }
    if (this.hasInitCatStuff) {
      if (this.isInFlyout) {
        this.hideHappinessDisplay();
      } else {
        this.updateHappinessDisplay();
      }
    }
    return r;
  };

  const originalDispose = Blockly.BlockSvg.prototype.dispose;
  Blockly.BlockSvg.prototype.dispose = function (...args) {
    clearTimeout(this.blinkFn);
    clearTimeout(this.earFn);
    clearTimeout(this.ear2Fn);
    clearTimeout(this.waveTimer);
    if (this.happinessDecayInterval) {
      clearTimeout(this.happinessDecayInterval);
      this.happinessDecayInterval = null;
    }
    if (this.windowListener) {
      document.removeEventListener("mousemove", this.windowListener);
    }
    return originalDispose.call(this, ...args);
  };

  const originalSetGlowStack = Blockly.BlockSvg.prototype.setGlowStack;
  Blockly.BlockSvg.prototype.setGlowStack = function (isGlowingStack) {
    if (this.windowListener) {
      if (isGlowingStack) {
        document.removeEventListener("mousemove", this.windowListener);
        if (this.workspace && this.svgFace_.style) {
          if (this.RTL) {
            this.svgFace_.style.transform = "translate(-87px, 0px)";
          } else {
            this.svgFace_.style.transform = "";
          }
        }
      } else {
        document.addEventListener("mousemove", this.windowListener);
      }
    }
    return originalSetGlowStack.call(this, isGlowingStack);
  };

  Blockly.BlockSvg.prototype.sa_catBlockConstructor = function () {
    this.catPath_ = Blockly.utils.createSvgElement("g", {}, this.svgGroup_);

    this.svgFace_ = Blockly.utils.createSvgElement("g", {}, this.catPath_);
    this.catPath_.svgFace = this.svgFace_;
    this.catPath_.svgBody = this.svgPath_;
    this.lastCallTime = 0;
    this.CALL_FREQUENCY_MS = 60;
  };

  const workspace = Blockly.getMainWorkspace();
  if (workspace) {
    const vm = addon.tab.traps.vm;
    if (vm.editingTarget) {
      vm.emitWorkspaceUpdate();
    }
    const flyout = workspace.getFlyout();
    if (flyout) {
      Blockly.Events.disable();
      const flyoutWorkspace = flyout.getWorkspace();
      Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.Xml.workspaceToDom(flyoutWorkspace), flyoutWorkspace);
      workspace.getToolbox().refreshSelection();
      workspace.toolboxRefreshEnabled_ = true;
      Blockly.Events.enable();
    }
  }
}
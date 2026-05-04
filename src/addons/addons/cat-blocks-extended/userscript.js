/**
 * Based on https://github.com/scratchfoundation/scratch-blocks/compare/hotfix/totally-normal-2021 (Apache 2.0)
 * It has been modified to work properly in our environment and fix some bugs.
 */

export default async function ({ addon, console }) {
  const Blockly = await addon.tab.traps.getBlockly();

  const shouldWatchMouseCursor = true;

  let yarnBallManager = null;

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
    this.yarnBallOffsetX = 0;
    this.yarnBallOffsetY = 0;
    this.isChasingYarn = false;
    this.yarnTargetX = 0;
    this.yarnTargetY = 0;

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

    this.svgGroup_.addEventListener("pointerdown", function () {
      that.catYarnOffsetX = 0;
      that.catYarnOffsetY = 0;
      if (that.isChasingYarn) {
        that.isChasingYarn = false;
        clearTimeout(that.yarnMoveTimer);
        that.scheduleNextYarnMove();
      }
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

  Blockly.BlockSvg.prototype.updateYarnBall = function () {
    if (!this.yarnBallGroup) {
      this.yarnBallGroup = Blockly.utils.createSvgElement("g", {
        "class": "cat-yarn-ball"
      }, this.svgGroup_);
      
      var paths = [
        "M493.77290073 493.77290073m-437.45037274 0a437.45037275 437.45037275 0 1 0 874.90074548 0 437.45037275 437.45037275 0 1 0-874.90074548 0Z",
        "M493.77290073 56.32252799c241.5919104 0 437.45037275 195.85846235 437.45037274 437.45037274 0 241.5919104-195.85846235 437.45037275-437.45037274 437.45037274-46.4791021 0-91.30119563-7.24941392-133.30637225-20.71261153a434.21920522 434.21920522 0 0 1-42.46085571-141.54999278A472.57896368 472.57896368 0 0 1 165.68512117 420.86450608c0-118.06189037 43.16508372-225.97460029 114.54074668-308.94932574A435.29626146 435.29626146 0 0 1 493.77290073 56.32252799z",
        "M760.75847468 147.20947178a436.7047187 436.7047187 0 0 1 170.46479879 346.56342895c0 241.5919104-195.85846235 437.45037275-437.45037274 437.45037274a436.7047187 436.7047187 0 0 1-346.56342895-170.46479879A435.58623763 435.58623763 0 0 0 414.23646932 851.68684206c241.5919104 0 437.45037275-195.85846235 437.45037274-437.45037274 0-99.00628741-32.89162881-190.34890786-88.36000427-263.67155434z",
        "M493.77290073 56.32252799c241.5919104 0 437.45037275 195.85846235 437.45037274 437.45037274 0 241.5919104-195.85846235 437.45037275-437.45037274 437.45037274C252.18099033 931.22327347 56.32252799 735.36481113 56.32252799 493.77290073 56.32252799 252.18099033 252.18099033 56.32252799 493.77290073 56.32252799z m0 34.2172364C271.07089279 90.53976439 90.53976439 271.07089279 90.53976439 493.77290073s180.53112961 403.23313755 403.23313634 403.23313755 403.23313755-180.53112961 403.23313755-403.23313755S716.47490867 90.53976439 493.77290073 90.53976439z",
        "M908.52225115 838.3064953a17.10861821 17.10861821 0 0 1 19.17987863 28.33485368c-39.35396386 26.59499425-86.28874262 37.57267839-140.22438517 33.14017895l-11.68191337-1.2013307c-52.40290964-6.33805938-126.88546323 3.10689185-222.95055929 28.66625467a17.10861821 17.10861821 0 1 1-8.78214804-33.05732931c94.03526045-24.97941049 169.01491675-35.29429143 225.47749759-30.61324064l10.35630698 1.03563022c51.03587723 6.2137837 93.66243343-2.65121397 128.62532267-26.30501687zM260.13463347 132.75206755a17.10861821 17.10861821 0 1 1 27.79632618 19.88410784c-75.22820764 105.38577162-102.61028196 214.7483648-82.72617412 328.99913532 20.04980835 114.99642334 65.86610725 200.08383525 137.24177021 256.13216427a17.10861821 17.10861821 0 0 1-21.12686459 26.92639524c-78.50080119-61.68215916-128.41819614-154.3503872-149.79361329-277.1347532-21.54111644-123.57144485 8.16076967-242.13043792 88.56713079-354.80704947z",
        "M492.15731697 364.65047537c99.50339011-78.83220219 226.22315164-103.35593601 378.83368061-74.02687572a17.10861821 17.10861821 0 0 1-6.46233505 33.59585683c-143.33127702-27.54777483-259.94328534-4.97102697-351.12020529 67.23313967-114.62359632 90.84551775-156.00739579 183.59659542-164.45814162 300.6642804-4.47392427 61.80643484 17.31574352 160.93699792 32.0631239 185.17075437a17.10861821 17.10861821 0 1 1-29.2047834 17.7714214c-18.59992629-30.48896497-41.92232699-136.70324148-36.99272606-205.38626321 9.11354902-125.97410869 54.47417006-227.63161008 177.34138691-325.02231374z",
        "M908.02514845 441.78424415a17.10861821 17.10861821 0 1 1-8.11934484 33.2230298c-121.50018443-29.74331092-219.59511609-14.37455338-295.7761043 45.48489671-95.81654471 75.26963367-126.96831408 152.81765429-126.96831287 248.50992332 0 34.0515347 11.93046471 81.15201517 29.86758659 128.16964479a17.10861821 17.10861821 0 0 1-31.93884823 12.2204421c-19.3041543-50.62162417-32.14597476-101.24324955-32.14597476-140.43151171 0-105.42719644 35.21144059-193.00012183 140.01725986-275.35346893 85.12883675-66.86031265 193.99432723-83.92750482 325.10516338-51.82295608z",
        "M901.47996255 570.40956682a17.10861821 17.10861821 0 0 1-4.01824639 33.96868384c-70.34003152-8.28504534-128.62532267 6.17235888-175.85007882 43.28936061-72.74269415 57.08395922-96.27222258 115.61780171-96.27222259 188.15337054 0 13.58747329 1.44988327 30.07471312 4.14252207 48.13611069a17.10861821 17.10861821 0 0 1-33.88583299 4.97102697 374.15262981 374.15262981 0 0 1-4.43249945-53.10713766c0-82.27049623 27.54777483-150.82924351 109.32116837-215.07976699 54.68129659-42.95795841 121.99728711-59.65232355 200.9951898-50.29022318zM400.73184688 78.56787365a17.10861821 17.10861821 0 0 1 27.96202667 19.71840736C362.66206459 191.78301273 336.19134601 290.78930015 348.86746476 395.84366956c6.13093285 50.87017552 17.56429486 96.27222258 34.17581037 136.20613879a17.10861821 17.10861821 0 1 1-31.56602121 13.13179663c-17.89569707-42.95795841-30.07471312-91.38404526-36.578473-145.23683817-13.71174897-113.71224178 15.03735657-221.08642418 85.83306596-321.37689316zM553.59092599 86.64579246a17.10861821 17.10861821 0 1 1 29.61903526 17.06719339 399.2977408 399.2977408 0 0 0-53.6870912 194.53285474c-0.41425184 20.83688843 0.16570049 40.88669677 1.73985943 60.19085107a17.10861821 17.10861821 0 1 1-34.09295952 2.77549087 632.27320487 632.27320487 0 0 1-1.82271028-63.67057116A433.47355117 433.47355117 0 0 1 553.59092599 86.64579246zM737.56034845 137.55739402c7.74651662 5.38527881 9.65207776 16.07298677 4.26679774 23.81950459a407.41708444 407.41708444 0 0 0-48.05325984 92.99962904c-6.29663456 17.15004302-11.68191337 34.01010988-16.15583764 50.53877453a17.10861821 17.10861821 0 1 1-32.97447965-8.90642373c4.72247562-17.52287005 10.35630577-35.29429143 16.98434252-53.39711503 13.38034798-36.45419732 30.73751632-70.00862932 52.11293226-100.78757167a17.10861821 17.10861821 0 0 1 23.81950461-4.26679773z",
        "M735.32338631 494.51855477a20.71261275 20.71261275 0 0 1 3.72827022 41.2595238c-53.85279169 4.88817611-109.77684502 49.46171828-166.73652978 135.91616261a20.71261275 20.71261275 0 0 1-34.59006222-22.78387317c63.21489328-95.94082038 128.70817351-148.1366035 197.59832178-154.39181324z"
      ];
      
      var fills = ["#faece0", "#faece0", "#faece0", "#f15571", "#f15571", "#f15571", "#f15571", "#f15571", "#f3848e"];
      
      this.yarnBallPaths = [];
      for (let i = 0; i < paths.length; i++) {
        var path = Blockly.utils.createSvgElement("path", {
          "d": paths[i],
          "fill": fills[i]
        }, this.yarnBallGroup);
        this.yarnBallPaths.push(path);
      }
    }
    
    var scale = 0.03;
    var translateX = this.yarnBallOffsetX + 10;
    var translateY = this.yarnBallOffsetY - 15;
    this.yarnBallGroup.setAttribute("transform", "translate(" + translateX + ", " + translateY + ") scale(" + scale + ")");
  };

  Blockly.BlockSvg.prototype.moveYarnBallRandomly = function () {
    if (!this.workspace || this.isInFlyout) return;
    
    var scale = this.workspace.scale || 1;
    
    var baseX = 30 / scale;
    var baseY = 0 / scale;
    
    var rangeX = 200 / scale;
    var rangeY = 150 / scale;
    
    this.yarnTargetX = baseX + (Math.random() - 0.5) * rangeX * 2;
    this.yarnTargetY = baseY + (Math.random() - 0.5) * rangeY * 2;
    
    this.isChasingYarn = true;
    
    this.animateYarnBall();
  };

  Blockly.BlockSvg.prototype.animateYarnBall = function () {
    if (!this.isChasingYarn || this.isInFlyout) return;
    
    var dx = this.yarnTargetX - this.yarnBallOffsetX;
    var dy = this.yarnTargetY - this.yarnBallOffsetY;
    var distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 3) {
      this.isChasingYarn = false;
      this.scheduleNextYarnMove();
      return;
    }
    
    var speed = 0.06;
    this.yarnBallOffsetX += dx * speed;
    this.yarnBallOffsetY += dy * speed;
    
    var catDx = this.yarnBallOffsetX - (this.catYarnOffsetX || 0);
      var catDy = this.yarnBallOffsetY - (this.catYarnOffsetY || 0);
      
      var catDistance = Math.sqrt(catDx * catDx + catDy * catDy);
      if (catDistance > 0.5) {
        var catSpeed = 0.08;
        this.catYarnOffsetX = (this.catYarnOffsetX || 0) + catDx * catSpeed;
        this.catYarnOffsetY = (this.catYarnOffsetY || 0) + catDy * catSpeed;
        
        var maxOffsetX = 80;
        var maxOffsetY = 60;
        this.catYarnOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.catYarnOffsetX));
        this.catYarnOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.catYarnOffsetY));
        
        var yarnBallScreenX = this.yarnBallOffsetX + this.catYarnOffsetX;
        var yarnBallScreenY = this.yarnBallOffsetY + this.catYarnOffsetY;
        
        var catEyeDx = (yarnBallScreenX - 45) * 0.02;
        var catEyeDy = (yarnBallScreenY + 3) * 0.02;
        catEyeDx = Math.max(-3, Math.min(3, catEyeDx));
        catEyeDy = Math.max(-2, Math.min(2, catEyeDy));
        
        if (this.catPath_.svgFace.eye) {
          this.catPath_.svgFace.eye.setAttribute("cx", 59.2 + catEyeDx);
          this.catPath_.svgFace.eye.setAttribute("cy", -3.3 + catEyeDy);
        }
        if (this.catPath_.svgFace.eye2) {
          this.catPath_.svgFace.eye2.setAttribute("cx", 29.1 + catEyeDx);
          this.catPath_.svgFace.eye2.setAttribute("cy", -3.3 + catEyeDy);
        }
        
        if (this.svgGroup_) {
          this.svgGroup_.setAttribute("transform", "translate(" + this.catYarnOffsetX + ", " + this.catYarnOffsetY + ")");
        }
      }
    
    this.updateYarnBall();
    
    requestAnimationFrame(() => this.animateYarnBall());
  };

  Blockly.BlockSvg.prototype.scheduleNextYarnMove = function () {
    var delay = 2000 + Math.random() * 3000;
    clearTimeout(this.yarnMoveTimer);
    this.yarnMoveTimer = setTimeout(() => {
      if (!this.isInFlyout && this.workspace) {
        this.moveYarnBallRandomly();
      }
    }, delay);
  };

  Blockly.BlockSvg.prototype.startChaseYarn = function () {
    if (this.isInFlyout) return;
    this.moveYarnBallRandomly();
    this.addHappiness(3);
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
        if (this.yarnBallGroup) {
          this.yarnBallGroup.setAttribute("display", "none");
        }
      } else {
        this.updateHappinessDisplay();
        this.updateYarnBall();
        if (this.yarnBallGroup) {
          this.yarnBallGroup.removeAttribute("display");
        }
        if (!this.yarnMoveTimer && !this.isChasingYarn) {
          this.scheduleNextYarnMove();
        }
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
    clearTimeout(this.yarnMoveTimer);
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
    if (isGlowingStack) {
      this.catYarnOffsetX = 0;
      this.catYarnOffsetY = 0;
      if (this.svgGroup_) {
        this.svgGroup_.setAttribute("transform", "");
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
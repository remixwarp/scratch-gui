/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./node_modules/scratch-render/src/shaders/sprite.vert");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/scratch-render/src/shaders/sprite.vert":
/*!*************************************************************!*\
  !*** ./node_modules/scratch-render/src/shaders/sprite.vert ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = \"precision mediump float;\\n\\n#ifdef DRAW_MODE_line\\nuniform vec2 u_stageSize;\\nattribute vec2 a_lineThicknessAndLength;\\nattribute vec4 a_penPoints;\\nattribute vec4 a_lineColor;\\n\\nvarying vec4 v_lineColor;\\nvarying float v_lineThickness;\\nvarying float v_lineLength;\\nvarying vec4 v_penPoints;\\n\\n// Add this to divisors to prevent division by 0, which results in NaNs propagating through calculations.\\n// Smaller values can cause problems on some mobile devices.\\nconst float epsilon = 1e-3;\\n#endif\\n\\n#if !(defined(DRAW_MODE_line) || defined(DRAW_MODE_background))\\nuniform mat4 u_projectionMatrix;\\nuniform mat4 u_modelMatrix;\\nattribute vec2 a_texCoord;\\n#endif\\n\\nattribute vec2 a_position;\\n\\nvarying vec2 v_texCoord;\\n\\nvoid main() {\\n\\t#ifdef DRAW_MODE_line\\n\\t// Calculate a rotated (\\\"tight\\\") bounding box around the two pen points.\\n\\t// Yes, we're doing this 6 times (once per vertex), but on actual GPU hardware,\\n\\t// it's still faster than doing it in JS combined with the cost of uniformMatrix4fv.\\n\\n\\t// Expand line bounds by sqrt(2) / 2 each side-- this ensures that all antialiased pixels\\n\\t// fall within the quad, even at a 45-degree diagonal\\n\\tvec2 position = a_position;\\n\\tfloat expandedRadius = (a_lineThicknessAndLength.x * 0.5) + 1.4142135623730951;\\n\\n\\t// The X coordinate increases along the length of the line. It's 0 at the center of the origin point\\n\\t// and is in pixel-space (so at n pixels along the line, its value is n).\\n\\tv_texCoord.x = mix(0.0, a_lineThicknessAndLength.y + (expandedRadius * 2.0), a_position.x) - expandedRadius;\\n\\t// The Y coordinate is perpendicular to the line. It's also in pixel-space.\\n\\tv_texCoord.y = ((a_position.y - 0.5) * expandedRadius) + 0.5;\\n\\n\\tposition.x *= a_lineThicknessAndLength.y + (2.0 * expandedRadius);\\n\\tposition.y *= 2.0 * expandedRadius;\\n\\n\\t// 1. Center around first pen point\\n\\tposition -= expandedRadius;\\n\\n\\t// 2. Rotate quad to line angle\\n\\tvec2 pointDiff = a_penPoints.zw;\\n\\t// Ensure line has a nonzero length so it's rendered properly\\n\\t// As long as either component is nonzero, the line length will be nonzero\\n\\t// If the line is zero-length, give it a bit of horizontal length\\n\\tpointDiff.x = (abs(pointDiff.x) < epsilon && abs(pointDiff.y) < epsilon) ? epsilon : pointDiff.x;\\n\\t// The `normalized` vector holds rotational values equivalent to sine/cosine\\n\\t// We're applying the standard rotation matrix formula to the position to rotate the quad to the line angle\\n\\t// pointDiff can hold large values so we must divide by u_lineLength instead of calling GLSL's normalize function:\\n\\t// https://asawicki.info/news_1596_watch_out_for_reduced_precision_normalizelength_in_opengl_es\\n\\tvec2 normalized = pointDiff / max(a_lineThicknessAndLength.y, epsilon);\\n\\tposition = mat2(normalized.x, normalized.y, -normalized.y, normalized.x) * position;\\n\\n\\t// 3. Translate quad\\n\\tposition += a_penPoints.xy;\\n\\n\\t// 4. Apply view transform\\n\\tposition *= 2.0 / u_stageSize;\\n\\tgl_Position = vec4(position, 0, 1);\\n\\n\\tv_lineColor = a_lineColor;\\n\\tv_lineThickness = a_lineThicknessAndLength.x;\\n\\tv_lineLength = a_lineThicknessAndLength.y;\\n\\tv_penPoints = a_penPoints;\\n\\t#elif defined(DRAW_MODE_background)\\n\\tgl_Position = vec4(a_position * 2.0, 0, 1);\\n\\t#else\\n\\tgl_Position = u_projectionMatrix * u_modelMatrix * vec4(a_position, 0, 1);\\n\\tv_texCoord = a_texCoord;\\n\\t#endif\\n}\\n\"\n\n//# sourceURL=webpack:///./node_modules/scratch-render/src/shaders/sprite.vert?");

/***/ })

/******/ });
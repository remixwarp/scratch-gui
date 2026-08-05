/**
 * html2canvas 本地 stub。
 * 提供与 html2canvas 兼容的接口签名，但仅返回空白 canvas，
 * 用于在未安装 html2canvas 时保证构建通过和运行时不会崩溃。
 */
const html2canvas = (element, options = {}) => {
  const width = (options && options.width) || (element && element.offsetWidth) || 300;
  const height = (options && options.height) || (element && element.offsetHeight) || 150;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return Promise.resolve(canvas);
};

export default html2canvas;

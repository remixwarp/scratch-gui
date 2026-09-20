/* 示例本地插件：在舞台头部显示一条消息，并输出到控制台。
 * 说明：这是 bilup-addons 本地插件源管线的演示插件。
 */

export default async function ({addon, console}) {
    // 读取用户在设置页里配置的消息
    const message = addon.settings.get('message');

    // 在舞台头部（small/big stage 按钮左侧）插入一个标签
    const element = document.createElement('span');
    element.textContent = message;
    element.style.marginLeft = '10px';
    element.style.opacity = '0.8';
    element.id = 'bilup-sample-label';

    addon.tab.appendToSharedSpace({
        space: 'stageHeader',
        element,
        order: 1
    });

    console.log(`[Bilup Sample] ${message}`);
}

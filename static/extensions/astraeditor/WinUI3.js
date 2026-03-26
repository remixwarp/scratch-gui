// Name: 类WinUI3弹窗
// ID: WinUI3
// Description: 弹窗！更好用的弹窗！
// By: E.R.T.J <https://www.ccw.site/student/627b7cb4353b0e6d7ffca104>
// License: MIT

const EXTENSION_ID = 'winui3';
let inputPopupReturnValue = null;
let selectPopupReturnValue = null;
let sliderPopupReturnValue = null;
let confirmPopupReturnValue = null;
let datePopupReturnValue = null;
let colorPopupReturnValue = null;
let messagePopupReturnValue = null;
let bottomPopupReturnValue = null;
let ratingPopupReturnValue = null;
let isInputPopupOpen = false;
let isSelectPopupOpen = false;
let isSliderPopupOpen = false;
let isConfirmPopupOpen = false;
let isDatePopupOpen = false;
let isColorPopupOpen = false;
let isMessagePopupOpen = false;
let isBottomPopupOpen = false;
let isRatingPopupOpen = false;

const api = {
    getInfo: function () {
        return {
            id: EXTENSION_ID,
            name: 'WinUI 3弹窗',
            color1: '#0078D4',
            color2: '#005A9E',
            blocks: [
                {
                    blockType: Scratch.BlockType.LABEL,
                    text: Scratch.translate("📕 拓展教程"),
                    style: {
                        color: "#666",
                        fontSize: "10px"
                    }
                },
                {
                    blockType: Scratch.BlockType.BUTTON,
                    text: Scratch.translate("📖拓展教程"),
                    onClick: this.docs
                },
                {
                    blockType: Scratch.BlockType.LABEL,
                    text: Scratch.translate("💻️ 弹窗"),
                    style: {
                        color: "#666",
                        fontSize: "10px"
                    }
                },
                {
                    opcode:'showWinUI3LikePopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示提示弹窗，标题为 [TITLE]，内容为 [CONTENT]',
                    arguments: {
                        TITLE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '提示'
                        },
                        CONTENT: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '这是一个弹窗内容'
                        }
                    }
                },
                {
                    opcode:'showConfirmPopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示确认弹窗，标题为 [TITLE]，内容为 [CONTENT]',
                    arguments: {
                        TITLE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '确认提示'
                        },
                        CONTENT: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '请确认操作'
                        }
                    }
                },
                {
                    opcode:'showInputPopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示输入弹窗，标题为 [TITLE]，提示信息为 [HINT]，输入框数量为 [INPUT_COUNT]',
                    arguments: {
                        TITLE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '输入提示'
                        },
                        HINT: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '请输入E.R.T.J'
                        },
                        INPUT_COUNT: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode:'showSelectPopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示选择弹窗，标题为 [TITLE]，选项为 [OPTIONS]',
                    arguments: {
                        TITLE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '选择提示'
                        },
                        OPTIONS: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '选项1,选项2,选项3'
                        }
                    }
                },
                {
                    opcode:'showSliderPopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示滑动条弹窗，标题为 [TITLE]，最小值 [MIN]，最大值 [MAX]，初始值 [INITIAL]',
                    arguments: {
                        TITLE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '滑动条提示'
                        },
                        MIN: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        MAX: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        INITIAL: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 50
                        }
                    }
                },
                {
                    opcode:'showDatePopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示日期选择弹窗，标题为 [TITLE]',
                    arguments: {
                        TITLE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '日期选择提示'
                        }
                    }
                },
                {
                    opcode:'showColorPopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示颜色选择弹窗，标题为 [TITLE]',
                    arguments: {
                        TITLE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '颜色选择提示'
                        }
                    }
                },
                {
                    opcode:'showMessagePopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示右下角消息弹窗，内容为 [CONTENT]，图片URL为 [IMAGE_URL]',
                    arguments: {
                        CONTENT: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '这是一个消息'
                        },
                        IMAGE_URL: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: ''
                        }
                    }
                },
                {
                    opcode:'showBottomPopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示底部弹窗，标题为 [TITLE]，内容为 [CONTENT]',
                    arguments: {
                        TITLE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '底部提示'
                        },
                        CONTENT: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '这是底部弹窗内容'
                        }
                    }
                },
                {
                    opcode:'showRatingPopup',
                    blockType: Scratch.BlockType.COMMAND,
                    text: '显示评分弹窗，标题为 [TITLE]，最小值 [MIN]，最大值 [MAX]，初始值 [INITIAL]',
                    arguments: {
                        TITLE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '评分提示'
                        },
                        MIN: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        MAX: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 10
                        },
                        INITIAL: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                },
                {
                    blockType: Scratch.BlockType.LABEL,
                    text: Scratch.translate("🔙返回值"),
                    style: {
                        color: "#666",
                        fontSize: "10px"
                    }
                },
                {
                    opcode: 'getSliderPopupValue',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '获取滑动条弹窗的值'
                },
                {
                    opcode: 'getInputPopupValue',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '获取输入弹窗的值'
                },
                {
                    opcode: 'getSelectPopupValue',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '获取选择弹窗的值'
                },
                {
                    opcode: 'getConfirmPopupValue',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '获取确认弹窗的值'
                },
                {
                    opcode: 'getDatePopupValue',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '获取日期选择弹窗的值'
                },
                {
                    opcode: 'getColorPopupValue',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '获取颜色选择弹窗的值'
                },
                {
                    opcode: 'getRatingPopupValue',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '获取评分弹窗的值'
                }
            ]
        };
    },
    createPopupElements: function () {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.opacity = 0;
        overlay.style.transition = 'opacity 0.3s ease-in-out';

        const popup = document.createElement('div');
        popup.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; 
        popup.style.backdropFilter = 'blur(8px)'; 
        popup.style.borderRadius = '12px';
        popup.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.15)';
        popup.style.width = '360px';
        popup.style.padding = '24px';
        popup.style.transform = 'scale(0.8)';
        popup.style.transition = 'transform 0.3s ease-in-out';

        return { overlay, popup };
    },
    addShowAnimation: function (overlay, popup) {
        setTimeout(() => {
            overlay.style.opacity = 1;
            popup.style.transform = 'scale(1)';
        }, 50);
    },
    showWinUI3LikePopup: function (args) {
        if (isInputPopupOpen || isSelectPopupOpen || isSliderPopupOpen || isConfirmPopupOpen || 
            isDatePopupOpen || isColorPopupOpen || isMessagePopupOpen || isBottomPopupOpen) {
            return;
        }
        const { overlay, popup } = this.createPopupElements();
        const title = args.TITLE;
        const content = args.CONTENT;

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.marginTop = 0;
        titleElement.style.marginBottom = '12px';
        titleElement.style.color = '#0078D4';
        titleElement.style.fontSize = '24px';

        const contentElement = document.createElement('p');
        contentElement.textContent = content;
        contentElement.style.marginBottom = '24px';
        contentElement.style.color = '#333333';
        contentElement.style.fontSize = '16px';

        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.backgroundColor = '#0078D4';
        closeButton.style.color = '#FFFFFF';
        closeButton.style.border = 'none';
        closeButton.style.padding = '12px 24px';
        closeButton.style.borderRadius = '8px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '16px';
        closeButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#005A9E';
        });
        closeButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#0078D4';
        });
        closeButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#004578';
        });
        closeButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#0078D4';
        });
        closeButton.addEventListener('click', function () {
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.appendChild(closeButton);

        popup.appendChild(titleElement);
        popup.appendChild(contentElement);
        popup.appendChild(buttonContainer);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        this.addShowAnimation(overlay, popup);
    },
    showConfirmPopup: function (args) {
        if (isConfirmPopupOpen) {
            return;
        }
        isConfirmPopupOpen = true;
        const { overlay, popup } = this.createPopupElements();
        const title = args.TITLE;
        const content = args.CONTENT;

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.marginTop = 0;
        titleElement.style.marginBottom = '12px';
        titleElement.style.color = '#0078D4';
        titleElement.style.fontSize = '24px';

        const contentElement = document.createElement('p');
        contentElement.textContent = content;
        contentElement.style.marginBottom = '24px';
        contentElement.style.color = '#333333';
        contentElement.style.fontSize = '16px';

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认';
        confirmButton.style.backgroundColor = '#0078D4';
        confirmButton.style.color = '#FFFFFF';
        confirmButton.style.border = 'none';
        confirmButton.style.padding = '12px 24px';
        confirmButton.style.borderRadius = '8px';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '16px';
        confirmButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#005A9E';
        });
        confirmButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#004578';
        });
        confirmButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('click', function () {
            console.log('用户点击了确认');
            confirmPopupReturnValue = true;
            isConfirmPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.backgroundColor = '#EDEDED';
        cancelButton.style.color = '#333333';
        cancelButton.style.border = 'none';
        cancelButton.style.padding = '12px 24px';
        cancelButton.style.borderRadius = '8px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '16px';
        cancelButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#D6D6D6';
        });
        cancelButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#C2C2C2';
        });
        cancelButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('click', function () {
            console.log('用户点击了取消');
            confirmPopupReturnValue = false;
            isConfirmPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        popup.appendChild(titleElement);
        popup.appendChild(contentElement);
        popup.appendChild(buttonContainer);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        this.addShowAnimation(overlay, popup);
    },
    showInputPopup: function (args) {
        if (isInputPopupOpen) {
            return;
        }
        isInputPopupOpen = true;
        const { overlay, popup } = this.createPopupElements();
        const title = args.TITLE;
        const hint = args.HINT;
        const inputCount = args.INPUT_COUNT;

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.marginTop = 0;
        titleElement.style.marginBottom = '12px';
        titleElement.style.color = '#0078D4';
        titleElement.style.fontSize = '24px';

        const hintElement = document.createElement('p');
        hintElement.textContent = hint;
        hintElement.style.marginBottom = '8px';
        hintElement.style.color = '#333333';
        hintElement.style.fontSize = '16px';

        const inputContainers = [];
        for (let i = 0; i < inputCount; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.style.width = 'calc(100% - 24px)';
            input.style.padding = '12px';
            input.style.marginBottom = '12px'; 
            input.style.border = '1px solid #CCCCCC';
            input.style.borderRadius = '8px';
            input.style.fontSize = '16px';
            input.style.transition = 'border-color 0.3s ease-in-out';
            input.addEventListener('focus', function () {
                this.style.borderColor = '#0078D4';
            });
            input.addEventListener('blur', function () {
                this.style.borderColor = '#CCCCCC';
            });
            inputContainers.push(input);
        }

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认';
        confirmButton.style.backgroundColor = '#0078D4';
        confirmButton.style.color = '#FFFFFF';
        confirmButton.style.border = 'none';
        confirmButton.style.padding = '12px 24px';
        confirmButton.style.borderRadius = '8px';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '16px';
        confirmButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#005A9E';
        });
        confirmButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#004578';
        });
        confirmButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('click', function () {
            inputPopupReturnValue = inputContainers.map(input => input.value);
            console.log('用户输入的内容：', inputPopupReturnValue);
            isInputPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.backgroundColor = '#EDEDED';
        cancelButton.style.color = '#333333';
        cancelButton.style.border = 'none';
        cancelButton.style.padding = '12px 24px';
        cancelButton.style.borderRadius = '8px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '16px';
        cancelButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#D6D6D6';
        });
        cancelButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#C2C2C2';
        });
        cancelButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('click', function () {
            inputPopupReturnValue = null;
            console.log('用户取消了输入');
            isInputPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        popup.appendChild(titleElement);
        popup.appendChild(hintElement);
        inputContainers.forEach(input => popup.appendChild(input));
        popup.appendChild(buttonContainer);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        this.addShowAnimation(overlay, popup);
    },
    getInputPopupValue: function () {
        return inputPopupReturnValue;
    },
    showSelectPopup: function (args) {
        if (isSelectPopupOpen) {
            return;
        }
        isSelectPopupOpen = true;
        const { overlay, popup } = this.createPopupElements();
        const title = args.TITLE;
        const options = args.OPTIONS.split(',');

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.marginTop = 0;
        titleElement.style.marginBottom = '12px';
        titleElement.style.color = '#0078D4';
        titleElement.style.fontSize = '24px';

        const select = document.createElement('select');
        options.forEach(optionText => {
            const option = document.createElement('option');
            option.textContent = optionText;
            select.appendChild(option);
        });
        select.style.width = '100%';
        select.style.padding = '12px';
        select.style.border = '1px solid #ccc';
        select.style.borderRadius = '8px';
        select.style.marginBottom = '24px';
        select.style.fontSize = '16px';

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认';
        confirmButton.style.backgroundColor = '#0078D4';
        confirmButton.style.color = '#FFFFFF';
        confirmButton.style.border = 'none';
        confirmButton.style.padding = '12px 24px';
        confirmButton.style.borderRadius = '8px';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '16px';
        confirmButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#005A9E';
        });
        confirmButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#004578';
        });
        confirmButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('click', function () {
            selectPopupReturnValue = select.value;
            console.log('用户选择的内容：', selectPopupReturnValue);
            isSelectPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.backgroundColor = '#EDEDED';
        cancelButton.style.color = '#333333';
        cancelButton.style.border = 'none';
        cancelButton.style.padding = '12px 24px';
        cancelButton.style.borderRadius = '8px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '16px';
        cancelButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#D6D6D6';
        });
        cancelButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#C2C2C2';
        });
        cancelButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('click', function () {
            selectPopupReturnValue = null;
            console.log('用户取消了选择');
            isSelectPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        popup.appendChild(titleElement);
        popup.appendChild(select);
        popup.appendChild(buttonContainer);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        this.addShowAnimation(overlay, popup);
    },
        getSelectPopupValue: function () {
        return selectPopupReturnValue;
    },
    showSliderPopup: function (args) {
        if (isSliderPopupOpen) {
            return;
        }
        isSliderPopupOpen = true;
        const { overlay, popup } = this.createPopupElements();
        const title = args.TITLE;
        const min = args.MIN;
        const max = args.MAX;
        const initial = args.INITIAL;

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.marginTop = 0;
        titleElement.style.marginBottom = '12px';
        titleElement.style.color = '#0078D4';
        titleElement.style.fontSize = '24px';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = initial;
        slider.style.width = '100%';
        slider.style.marginBottom = '24px';

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = initial;
        valueDisplay.style.display = 'block';
        valueDisplay.style.textAlign = 'center';
        valueDisplay.style.marginBottom = '10px';
        valueDisplay.style.fontSize = '16px';

        slider.addEventListener('input', function () {
            valueDisplay.textContent = this.value;
        });

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认';
        confirmButton.style.backgroundColor = '#0078D4';
        confirmButton.style.color = '#FFFFFF';
        confirmButton.style.border = 'none';
        confirmButton.style.padding = '12px 24px';
        confirmButton.style.borderRadius = '8px';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '16px';
        confirmButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#005A9E';
        });
        confirmButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#004578';
        });
        confirmButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('click', function () {
            sliderPopupReturnValue = slider.value;
            console.log('用户选择的滑动条值：', sliderPopupReturnValue);
            isSliderPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.backgroundColor = '#EDEDED';
        cancelButton.style.color = '#333333';
        cancelButton.style.border = 'none';
        cancelButton.style.padding = '12px 24px';
        cancelButton.style.borderRadius = '8px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '16px';
        cancelButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#D6D6D6';
        });
        cancelButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#C2C2C2';
        });
        cancelButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('click', function () {
            sliderPopupReturnValue = null;
            console.log('用户取消了滑动条选择');
            isSliderPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        popup.appendChild(titleElement);
        popup.appendChild(valueDisplay);
        popup.appendChild(slider);
        popup.appendChild(buttonContainer);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        this.addShowAnimation(overlay, popup);
    },
    getSliderPopupValue: function () {
        return sliderPopupReturnValue;
    },
    getConfirmPopupValue: function () {
        return confirmPopupReturnValue;
    },
    showDatePopup: function (args) {
        if (isDatePopupOpen) {
            return;
        }
        isDatePopupOpen = true;
        const { overlay, popup } = this.createPopupElements();
        const title = args.TITLE;

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.marginTop = 0;
        titleElement.style.marginBottom = '12px';
        titleElement.style.color = '#0078D4';
        titleElement.style.fontSize = '24px';

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.style.width = '100%';
        dateInput.style.padding = '12px';
        dateInput.style.border = '1px solid #ccc';
        dateInput.style.borderRadius = '8px';
        dateInput.style.marginBottom = '24px';
        dateInput.style.fontSize = '16px';

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认';
        confirmButton.style.backgroundColor = '#0078D4';
        confirmButton.style.color = '#FFFFFF';
        confirmButton.style.border = 'none';
        confirmButton.style.padding = '12px 24px';
        confirmButton.style.borderRadius = '8px';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '16px';
        confirmButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#005A9E';
        });
        confirmButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#004578';
        });
        confirmButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('click', function () {
            datePopupReturnValue = dateInput.value;
            console.log('用户选择的日期：', datePopupReturnValue);
            isDatePopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.backgroundColor = '#EDEDED';
        cancelButton.style.color = '#333333';
        cancelButton.style.border = 'none';
        cancelButton.style.padding = '12px 24px';
        cancelButton.style.borderRadius = '8px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '16px';
        cancelButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#D6D6D6';
        });
        cancelButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#C2C2C2';
        });
        cancelButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('click', function () {
            datePopupReturnValue = null;
            console.log('用户取消了日期选择');
            isDatePopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        popup.appendChild(titleElement);
        popup.appendChild(dateInput);
        popup.appendChild(buttonContainer);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        this.addShowAnimation(overlay, popup);
    },
        getDatePopupValue: function () {
        return datePopupReturnValue;
    },
    showColorPopup: function (args) {
        if (isColorPopupOpen) {
            return;
        }
        isColorPopupOpen = true;
        const { overlay, popup } = this.createPopupElements();
        const title = args.TITLE;

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.marginTop = 0;
        titleElement.style.marginBottom = '12px';
        titleElement.style.color = '#0078D4';
        titleElement.style.fontSize = '24px';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.width = '100%';
        colorInput.style.height = '50px';
        colorInput.style.border = 'none';
        colorInput.style.marginBottom = '24px';

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认';
        confirmButton.style.backgroundColor = '#0078D4';
        confirmButton.style.color = '#FFFFFF';
        confirmButton.style.border = 'none';
        confirmButton.style.padding = '12px 24px';
        confirmButton.style.borderRadius = '8px';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '16px';
        confirmButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#005A9E';
        });
        confirmButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#004578';
        });
        confirmButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('click', function () {
            colorPopupReturnValue = colorInput.value;
            console.log('用户选择的颜色：', colorPopupReturnValue);
            isColorPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.backgroundColor = '#EDEDED';
        cancelButton.style.color = '#333333';
        cancelButton.style.border = 'none';
        cancelButton.style.padding = '12px 24px';
        cancelButton.style.borderRadius = '8px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '16px';
        cancelButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#D6D6D6';
        });
        cancelButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#C2C2C2';
        });
        cancelButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('click', function () {
            colorPopupReturnValue = null;
            console.log('用户取消了颜色选择');
            isColorPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        popup.appendChild(titleElement);
        popup.appendChild(colorInput);
        popup.appendChild(buttonContainer);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        this.addShowAnimation(overlay, popup);
    },
    getColorPopupValue: function () {
        return colorPopupReturnValue;
    },
    showMessagePopup: function (args) {
        if (isMessagePopupOpen) {
            return;
        }
        isMessagePopupOpen = true;
        const content = args.CONTENT;
        const imageUrl = args.IMAGE_URL;

        const messagePopup = document.createElement('div');
        messagePopup.style.position = 'fixed';
        messagePopup.style.right = '-400px'; 
        messagePopup.style.bottom = '20px';
        messagePopup.style.backgroundColor = 'white';
        messagePopup.style.border = '1px solid #ccc';
        messagePopup.style.borderRadius = '4px';
        messagePopup.style.padding = '30px';
        messagePopup.style.width = '350px';
        messagePopup.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        messagePopup.style.zIndex = 1000;
        messagePopup.style.opacity = 0;
        messagePopup.style.transition = 'opacity 0.3s ease-in-out, right 0.3s ease-in-out'; 

        if (imageUrl) {
            const imageElement = document.createElement('img');
            imageElement.src = imageUrl;
            imageElement.style.maxWidth = '100%'; 
            imageElement.style.height = 'auto';
            messagePopup.appendChild(imageElement);
        }

        if (content) {
            const messageText = document.createElement('p');
            messageText.textContent = content;
            messageText.style.margin = '10px 0 0 0'; 
            messagePopup.appendChild(messageText);
        }
        document.body.appendChild(messagePopup);
        setTimeout(() => {
            messagePopup.style.opacity = 1;
            messagePopup.style.right = '20px'; 
        }, 100);

        const autoCloseTimer = setTimeout(() => {
            messagePopup.style.opacity = 0;
            messagePopup.style.right = '-400px'; 
            isMessagePopupOpen = false;
            setTimeout(() => {
                document.body.removeChild(messagePopup);
            }, 300);
        }, 5000);

        messagePopup.addEventListener('click', function () {
            clearTimeout(autoCloseTimer);
            messagePopup.style.opacity = 0;
            messagePopup.style.right = '-400px'; 
            isMessagePopupOpen = false;
            setTimeout(() => {
                document.body.removeChild(messagePopup);
            }, 300);
        });
    },
        showBottomPopup: function (args) {
        if (isBottomPopupOpen) {
            return;
        }
        isBottomPopupOpen = true;
        const { overlay, popup } = this.createPopupElements();
        const title = args.TITLE;
        const content = args.CONTENT;

        overlay.style.alignItems = 'flex-end';
        overlay.style.justifyContent = 'center';

        popup.style.width = '80%';
        popup.style.maxWidth = '600px';
        popup.style.marginBottom = '20px';

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.marginTop = 0;
        titleElement.style.marginBottom = '12px';
        titleElement.style.color = '#0078D4';
        titleElement.style.fontSize = '24px';

        const contentElement = document.createElement('p');
        contentElement.textContent = content;
        contentElement.style.marginBottom = '24px';
        contentElement.style.color = '#333333';
        contentElement.style.fontSize = '16px';

        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.backgroundColor = '#0078D4';
        closeButton.style.color = '#FFFFFF';
        closeButton.style.border = 'none';
        closeButton.style.padding = '12px 24px';
        closeButton.style.borderRadius = '8px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '16px';
        closeButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#005A9E';
        });
        closeButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#0078D4';
        });
        closeButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#004578';
        });
        closeButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#0078D4';
        });
        closeButton.addEventListener('click', function () {
            bottomPopupReturnValue = null;
            isBottomPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.appendChild(closeButton);

        popup.appendChild(titleElement);
        popup.appendChild(contentElement);
        popup.appendChild(buttonContainer);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        this.addShowAnimation(overlay, popup);
    },
    showRatingPopup: function (args) {
        if (isRatingPopupOpen) {
            return;
        }
        isRatingPopupOpen = true;
        const { overlay, popup } = this.createPopupElements();
        const title = args.TITLE;
        const min = args.MIN;
        const max = args.MAX;
        const initial = args.INITIAL;

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.marginTop = 0;
        titleElement.style.marginBottom = '12px';
        titleElement.style.color = '#0078D4';
        titleElement.style.fontSize = '24px';

        const ratingInput = document.createElement('input');
        ratingInput.type = 'number';
        ratingInput.min = min;
        ratingInput.max = max;
        ratingInput.value = initial;
        ratingInput.style.width = '100%';
        ratingInput.style.padding = '12px';
        ratingInput.style.marginBottom = '24px';
        ratingInput.style.border = '1px solid #ccc';
        ratingInput.style.borderRadius = '8px';
        ratingInput.style.fontSize = '16px';

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认';
        confirmButton.style.backgroundColor = '#0078D4';
        confirmButton.style.color = '#FFFFFF';
        confirmButton.style.border = 'none';
        confirmButton.style.padding = '12px 24px';
        confirmButton.style.borderRadius = '8px';
        confirmButton.style.cursor = 'pointer';
        confirmButton.style.fontSize = '16px';
        confirmButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#005A9E';
        });
        confirmButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#004578';
        });
        confirmButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#0078D4';
        });
        confirmButton.addEventListener('click', function () {
            ratingPopupReturnValue = ratingInput.value;
            console.log('用户输入的评分：', ratingPopupReturnValue);
            isRatingPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.backgroundColor = '#EDEDED';
        cancelButton.style.color = '#333333';
        cancelButton.style.border = 'none';
        cancelButton.style.padding = '12px 24px';
        cancelButton.style.borderRadius = '8px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '16px';
        cancelButton.addEventListener('mouseover', function () {
            this.style.backgroundColor = '#D6D6D6';
        });
        cancelButton.addEventListener('mouseout', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('mousedown', function () {
            this.style.backgroundColor = '#C2C2C2';
        });
        cancelButton.addEventListener('mouseup', function () {
            this.style.backgroundColor = '#EDEDED';
        });
        cancelButton.addEventListener('click', function () {
            ratingPopupReturnValue = null;
            console.log('用户取消了评分');
            isRatingPopupOpen = false;
            overlay.style.opacity = 0;
            popup.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        popup.appendChild(titleElement);
        popup.appendChild(ratingInput);
        popup.appendChild(buttonContainer);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        this.addShowAnimation(overlay, popup);
    },
    getRatingPopupValue: function () {
        return ratingPopupReturnValue;
    },
    docs: function () {
        window.open('https://example.com/extension-docs', '_blank');
    },
    run: function (args) {
        const { opcode } = args;
        switch (opcode) {
            case'showWinUI3LikePopup':
                this.showWinUI3LikePopup(args);
                break;
            case'showConfirmPopup':
                this.showConfirmPopup(args);
                break;
            case'showInputPopup':
                this.showInputPopup(args);
                break;
            case'showSelectPopup':
                this.showSelectPopup(args);
                break;
            case'showSliderPopup':
                this.showSliderPopup(args);
                break;
            case'showDatePopup':
                this.showDatePopup(args);
                break;
            case'showColorPopup':
                this.showColorPopup(args);
                break;
            case'showMessagePopup':
                this.showMessagePopup(args);
                break;
            case'showBottomPopup':
                this.showBottomPopup(args);
                break;
            case'showRatingPopup':
                this.showRatingPopup(args);
                break;
            case 'getSliderPopupValue':
                return this.getSliderPopupValue();
            case 'getInputPopupValue':
                return this.getInputPopupValue();
            case 'getSelectPopupValue':
                return this.getSelectPopupValue();
            case 'getConfirmPopupValue':
                return this.getConfirmPopupValue();
            case 'getDatePopupValue':
                return this.getDatePopupValue();
            case 'getColorPopupValue':
                return this.getColorPopupValue();
            case 'getRatingPopupValue':
                return this.getRatingPopupValue();
            default:
                console.error(`未知的操作码: ${opcode}`);
        }
    }
};
Scratch.extensions.register(api);
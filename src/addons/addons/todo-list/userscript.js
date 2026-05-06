import WindowManager from '../../window-system/window-manager.js';

export default async function ({ addon, msg, console }) {
    const Point = '_TODO_LIST_';
    const CommentId = 'todo';
    const EmptyTodo = { groups: [], tasks: [] };

    let PROJECT_NAME = 'Project';
    let COMMENT_ID = CommentId;
    let selectedGroup = null;

    const generateId = () => `todo-${Math.random().toString(36).substr(2, 9)}`;

    const getContrastColor = (hexColor) => {
        let r, g, b;
        if (hexColor.startsWith('#')) {
            if (hexColor.length === 4) {
                r = parseInt(hexColor[1] + hexColor[1], 16);
                g = parseInt(hexColor[2] + hexColor[2], 16);
                b = parseInt(hexColor[3] + hexColor[3], 16);
            } else {
                r = parseInt(hexColor.slice(1, 3), 16);
                g = parseInt(hexColor.slice(3, 5), 16);
                b = parseInt(hexColor.slice(5, 7), 16);
            }
        } else if (hexColor.startsWith('rgb')) {
            const match = hexColor.match(/\d+/g);
            r = parseInt(match[0]);
            g = parseInt(match[1]);
            b = parseInt(match[2]);
        } else {
            return '#000000';
        }
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    };

    const getFormattedDateTime = (timestamp) => {
        const date = new Date(timestamp);
        const pad = (num) => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const getFormatComment = (content) => `This comment is for the "todo" addon.\n${Point}\n${JSON.stringify(content)}`;

    const getTodoListContent = () => {
        try {
            const vm = addon.tab.traps.vm;
            if (!vm || !vm.runtime || !vm.runtime.getTargetForStage) return EmptyTodo;

            const comments = vm.runtime.getTargetForStage().comments;
            if (!comments[COMMENT_ID]) return EmptyTodo;

            const text = comments[COMMENT_ID].text;
            const parts = text.split(Point);
            if (parts.length >= 2) {
                return JSON.parse(parts[1]);
            }
        } catch (e) {
            console.warn('TODO: getTodoListContent error:', e);
        }
        return EmptyTodo;
    };

    const createCommentToStage = (content, needRefresh = true) => {
        try {
            const vm = addon.tab.traps.vm;
            if (!vm || !vm.runtime || !vm.runtime.getTargetForStage) return;

            const target = vm.runtime.getTargetForStage();
            delete target.comments[COMMENT_ID];
            target.createComment(COMMENT_ID, null, content, 50, 50, 350, 150, false);
        } catch (e) {
            console.warn('TODO: createCommentToStage error:', e);
        }

        if (needRefresh) {
            refreshTodoWindow();
        }
    };

    let todoWindow = null;

    const createTodoContent = () => {
        const container = document.createElement('div');
        container.className = 'sa-todo-container';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 10px;
            box-sizing: border-box;
        `;

        const title = document.createElement('h1');
        title.textContent = `${PROJECT_NAME} 的待办`;
        title.style.cssText = `
            font-size: 1.2rem;
            margin: 0 0 1rem 0;
            color: white;
        `;
        container.appendChild(title);

        let groupBar = null;
        const data = getTodoListContent();
        const groups = data.groups || [];

        if (groups.length > 0) {
            groupBar = document.createElement('div');
            groupBar.className = 'sa-todo-group-bar';
            groupBar.style.cssText = `
                display: flex;
                gap: 8px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            `;

            const allBtn = document.createElement('button');
            allBtn.style.cssText = `
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                background-color: ${selectedGroup === null ? 'var(--looks-secondary)' : 'var(--looks-secondary)60'};
                color: white;
            `;
            allBtn.textContent = '全部';
            allBtn.addEventListener('click', () => {
                selectedGroup = null;
                refreshTodoWindow();
            });
            groupBar.appendChild(allBtn);

            groups.forEach((group, index) => {
                const btn = document.createElement('button');
                btn.style.cssText = `
                    padding: 6px 12px;
                    border: none;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    background-color: ${selectedGroup === group.id ? group.color : group.color + '60'};
                    color: white;
                    position: relative;
                `;
                btn.textContent = group.name;

                const btnRemoveGroup = document.createElement('button');
                btnRemoveGroup.style.cssText = `
                    position: absolute;
                    right: -8px;
                    top: -8px;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                    background-color: ${group.color};
                    color: ${getContrastColor(group.color)};
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                btnRemoveGroup.textContent = '×';
                btnRemoveGroup.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const currentGroup = getTodoListContent();
                    const nowGroupId = currentGroup.groups[index].id;
                    currentGroup.groups.splice(index, 1);
                    currentGroup.tasks.forEach((task, taskIndex) => {
                        const groupIndex = task.groupId.indexOf(nowGroupId);
                        if (groupIndex !== -1) {
                            currentGroup.tasks[taskIndex].groupId.splice(groupIndex, 1);
                        }
                    });
                    if (selectedGroup === nowGroupId) {
                        selectedGroup = null;
                    }
                    createCommentToStage(getFormatComment(currentGroup));
                });

                btn.addEventListener('click', () => {
                    selectedGroup = group.id;
                    refreshTodoWindow();
                });

                btn.appendChild(btnRemoveGroup);
                groupBar.appendChild(btn);
            });
        }

        if (groupBar) {
            container.appendChild(groupBar);
        }

        const taskList = document.createElement('ul');
        taskList.className = 'sa-todo-list';
        taskList.style.cssText = `
            list-style-type: none;
            padding: 0;
            margin: 0;
            flex: 1;
            overflow: auto;
        `;

        const tasks = data.tasks || [];

        if (tasks.length === 0) {
            const emptyTip = document.createElement('li');
            emptyTip.style.cssText = `
                font-style: italic;
                display: flex;
                justify-content: center;
                width: 100%;
                color: white;
                opacity: 0.6;
                padding: 20px 0;
            `;
            emptyTip.textContent = '这里还没有待办事项，尝试添加一个!';
            taskList.appendChild(emptyTip);
        } else {
            tasks.forEach((task, index) => {
                if (selectedGroup !== null && !(task.groupId || []).includes(selectedGroup)) return;

                const taskItem = document.createElement('li');
                taskItem.style.cssText = `
                    background-color: ${task.color || 'var(--looks-secondary)'}a0;
                    border-radius: 6px;
                    padding: 12px;
                    color: white;
                    margin-bottom: 10px;
                    list-style: none;
                `;

                if ((task.groupId || []).length > 0) {
                    taskItem.style.borderRadius = '0 0 6px 6px';
                }

                if ((task.groupId || []).length > 0) {
                    const groupTip = document.createElement('div');
                    groupTip.style.cssText = `
                        display: flex;
                        gap: 4px;
                        margin-bottom: 8px;
                    `;
                    task.groupId.forEach(tag => {
                        const groupIndex = groups.findIndex(g => g.id === tag);
                        if (groupIndex !== -1) {
                            const groupBlock = document.createElement('div');
                            groupBlock.style.cssText = `
                                width: 12px;
                                height: 12px;
                                border-radius: 2px;
                                background-color: ${groups[groupIndex].color};
                            `;
                            groupTip.appendChild(groupBlock);
                        }
                    });
                    taskItem.appendChild(groupTip);
                }

                const taskHeader = document.createElement('div');
                taskHeader.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 10px;
                `;

                const checkbox = document.createElement('button');
                checkbox.style.cssText = `
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid rgba(255,255,255,0.5);
                    background: ${task.done ? 'white' : 'transparent'};
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    color: ${task.color || 'var(--looks-secondary)'};
                    flex-shrink: 0;
                `;
                checkbox.textContent = task.done ? '✓' : '';
                checkbox.addEventListener('click', () => {
                    const todoData = getTodoListContent();
                    todoData.tasks[index].done = !todoData.tasks[index].done;
                    createCommentToStage(getFormatComment(todoData));
                });

                const taskName = document.createElement('span');
                taskName.style.cssText = `
                    flex: 1;
                    font-size: 15px;
                    ${task.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}
                `;
                taskName.textContent = task.name;

                const deleteBtn = document.createElement('button');
                deleteBtn.style.cssText = `
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 4px;
                    flex-shrink: 0;
                `;
                deleteBtn.textContent = '×';
                deleteBtn.addEventListener('click', () => {
                    const todoData = getTodoListContent();
                    todoData.tasks.splice(index, 1);
                    createCommentToStage(getFormatComment(todoData));
                });

                const taskDate = document.createElement('div');
                taskDate.style.cssText = `
                    font-size: 12px;
                    opacity: 0.8;
                    margin-top: 8px;
                `;
                taskDate.textContent = `${getFormattedDateTime(task.startTime)} → ${getFormattedDateTime(task.endTime)}`;

                taskHeader.appendChild(checkbox);
                taskHeader.appendChild(taskName);
                taskHeader.appendChild(deleteBtn);

                taskItem.appendChild(taskHeader);
                taskItem.appendChild(taskDate);
                taskList.appendChild(taskItem);
            });
        }

        container.appendChild(taskList);

        const addButton = document.createElement('button');
        addButton.className = 'sa-todo-add-button';
        addButton.style.cssText = `
            width: 100%;
            padding: 12px;
            background-color: var(--looks-secondary);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.2s;
            margin-top: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        `;
        addButton.innerHTML = '<span style="font-size: 20px;">+</span><span>添加待办</span>';
        addButton.addEventListener('click', () => {
            showCreateModal();
        });

        container.appendChild(addButton);

        return container;
    };

    const refreshTodoWindow = () => {
        if (todoWindow && todoWindow.contentElement) {
            const newContent = createTodoContent();
            todoWindow.contentElement.innerHTML = '';
            todoWindow.contentElement.appendChild(newContent);
        }
    };

    const showTodoWindow = () => {
        if (todoWindow && todoWindow.isVisible) {
            todoWindow.bringToFront();
            return;
        }

        todoWindow = WindowManager.createWindow({
            id: 'todo-list',
            title: `${PROJECT_NAME} 的待办`,
            width: 450,
            height: 450,
            minWidth: 350,
            minHeight: 300,
            className: 'sa-todo-window',
            onClose: () => {
                todoWindow = null;
            }
        });

        const content = createTodoContent();
        todoWindow.setContent(content);
        todoWindow.show();
    };

    const showCreateModal = () => {
        const createWindow = WindowManager.createWindow({
            id: 'todo-create',
            title: '创建待办',
            width: 400,
            height: 480,
            minWidth: 350,
            minHeight: 400,
            className: 'sa-todo-create-window',
            onClose: () => {
            }
        });

        const container = document.createElement('div');
        container.style.cssText = `
            padding: 15px;
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            background-color: var(--ui-modal-background);
            overflow: hidden;
        `;

        const modeTab = document.createElement('div');
        modeTab.className = 'sa-todo-mode-tab';
        modeTab.style.cssText = `
            display: flex;
            background-color: var(--ui-tertiary);
            border-radius: 4px;
            margin-bottom: 15px;
            overflow: hidden;
            flex-shrink: 0;
        `;

        const taskTabBtn = document.createElement('button');
        taskTabBtn.className = 'sa-todo-mode-tab-btn enable';
        taskTabBtn.style.cssText = `
            flex: 1;
            padding: 10px 8px;
            background-color: var(--looks-secondary);
            border: none;
            cursor: pointer;
            font-size: 14px;
            color: white;
            min-height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
        `;
        taskTabBtn.textContent = '任务';

        const groupTabBtn = document.createElement('button');
        groupTabBtn.className = 'sa-todo-mode-tab-btn unable';
        groupTabBtn.style.cssText = `
            flex: 1;
            padding: 10px 8px;
            background-color: var(--ui-tertiary);
            border: none;
            cursor: pointer;
            font-size: 14px;
            color: var(--text-secondary);
            min-height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
        `;
        groupTabBtn.textContent = '组';

        const defaultColor = '#75C1C4';
        let config = {
            mode: 2,
            id: generateId(),
            name: '新的待办',
            color: defaultColor,
            task: {
                startTime: Date.now(),
                endTime: Date.now() + 86400000,
                done: false,
                tags: [],
                steps: [],
            },
        };

        const taskFields = document.createElement('div');
        const groupFields = document.createElement('div');
        const previewLabel = document.createElement('div');
        const preview = document.createElement('div');
        const preview_steps_create = document.createElement('button');

        const refreshPreview = () => {
            preview_title.value = config.name;
            preview_date.textContent = `${getFormattedDateTime(config.task.startTime)} → ${getFormattedDateTime(config.task.endTime)}`;
            preview.style.backgroundColor = config.color + 'a0';
        };

        preview.className = 'sa-todo-modal-preview';
        preview.style.cssText = `
            background-color: ${defaultColor}a0;
            border-radius: 6px;
            padding: 15px;
            color: white;
            margin-top: 10px;
        `;

        const preview_title = document.createElement('input');
        preview_title.style.cssText = `
            width: 100%;
            background: transparent;
            border: none;
            color: white;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
            outline: none;
        `;
        preview_title.value = config.name;
        preview_title.addEventListener('input', (e) => {
            config.name = e.target.value;
            if (nameInputField) {
                nameInputField.value = e.target.value;
            }
            refreshPreview();
        });
        const updateNameInputFromPreview = () => {
            if (nameInputField) {
                nameInputField.value = config.name;
            }
        };

        const preview_date = document.createElement('span');
        preview_date.style.cssText = `
            font-size: 12px;
            opacity: 0.8;
        `;
        preview_date.textContent = `${getFormattedDateTime(config.task.startTime)} → ${getFormattedDateTime(config.task.endTime)}`;

        preview.appendChild(preview_title);
        preview.appendChild(preview_date);

        previewLabel.style.cssText = `
            font-size: 14px;
            color: var(--text-secondary);
            margin-top: 15px;
            padding-bottom: 5px;
            border-bottom: 1px dashed var(--ui-tertiary);
        `;
        previewLabel.textContent = '预览';

        let nameInputField = null;

        const inputField = (inputType, labelText, keyConfig) => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            `;

            const label = document.createElement('span');
            label.style.cssText = `
                font-size: 14px;
                color: var(--text-secondary);
                width: 80px;
            `;
            label.textContent = labelText;

            const input = document.createElement('input');
            input.type = inputType === 'input' ? 'text' : inputType;
            input.style.cssText = `
                flex: 1;
                padding: 8px;
                border: 1px solid var(--ui-tertiary);
                border-radius: 4px;
                font-size: 14px;
                background-color: var(--ui-secondary);
                color: var(--text-primary);
                outline: none;
            `;

            if (keyConfig.key2) {
                input.value = config[keyConfig.key][keyConfig.key2];
                input.addEventListener('input', (e) => {
                    config[keyConfig.key][keyConfig.key2] = e.target.value;
                    if (keyConfig.key === 'task') {
                        refreshPreview();
                    }
                });
            } else {
                input.value = config[keyConfig.key];
                input.addEventListener('input', (e) => {
                    config[keyConfig.key] = e.target.value;
                    if (keyConfig.key === 'color') {
                        refreshPreview();
                    }
                });
            }

            if (keyConfig.key === 'name' && inputType === 'text') {
                nameInputField = input;
            }

            row.appendChild(label);
            row.appendChild(input);
            return row;
        };

        const groupSelector = document.createElement('div');
        groupSelector.style.cssText = `
            margin-bottom: 15px;
        `;

        const refreshGroupSelector = () => {
            groupSelector.innerHTML = '';
            const groups = getTodoListContent().groups || [];
            if (groups.length === 0) return;

            const selectorLabel = document.createElement('span');
            selectorLabel.style.cssText = `
                font-size: 14px;
                color: var(--text-secondary);
                display: block;
                margin-bottom: 8px;
            `;
            selectorLabel.textContent = '选择组';
            groupSelector.appendChild(selectorLabel);

            const tagsContainer = document.createElement('div');
            tagsContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            `;

            groups.forEach(group => {
                const tag = document.createElement('button');
                tag.style.cssText = `
                    padding: 6px 12px;
                    border: none;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    background-color: ${(config.task.tags || []).includes(group.id) ? group.color : group.color + '60'};
                    color: white;
                `;
                tag.textContent = group.name;
                tag.addEventListener('click', () => {
                    const tags = config.task.tags || [];
                    const idx = tags.indexOf(group.id);
                    if (idx === -1) {
                        tags.push(group.id);
                    } else {
                        tags.splice(idx, 1);
                    }
                    config.task.tags = tags;
                    refreshGroupSelector();
                });
                tagsContainer.appendChild(tag);
            });

            groupSelector.appendChild(tagsContainer);
        };

        taskFields.appendChild(inputField('color', '颜色', { key: 'color' }));
        taskFields.appendChild(inputField('datetime-local', '开始时间', { key: 'task', key2: 'startTime' }));
        taskFields.appendChild(inputField('datetime-local', '结束时间', { key: 'task', key2: 'endTime' }));
        taskFields.appendChild(inputField('text', '名称', { key: 'name' }));
        taskFields.appendChild(groupSelector);

        groupFields.appendChild(inputField('text', '名称', { key: 'name' }));
        groupFields.appendChild(inputField('color', '颜色', { key: 'color' }));

        preview_steps_create.style.cssText = `
            padding: 10px;
            background-color: var(--looks-secondary);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            margin-top: 10px;
            opacity: 0.5;
            pointer-events: none;
        `;
        preview_steps_create.textContent = '新的步骤';

        const doneBtn = document.createElement('button');
        doneBtn.style.cssText = `
            padding: 10px;
            background-color: var(--looks-secondary);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            margin-top: 10px;
        `;
        doneBtn.textContent = '完成';
        doneBtn.addEventListener('click', () => {
            const todoData = getTodoListContent();
            if (config.mode === 1) {
                todoData.groups.push({
                    id: config.id,
                    name: config.name || '新组',
                    color: config.color
                });
            } else {
                todoData.tasks.push({
                    id: config.id,
                    name: config.name,
                    startTime: config.task.startTime,
                    endTime: config.task.endTime,
                    done: config.task.done,
                    groupId: config.task.tags,
                    color: config.color,
                    steps: config.task.steps
                });
            }
            createCommentToStage(getFormatComment(todoData));
            createWindow.close();
        });

        const editHeader = document.createElement('div');
        editHeader.style.cssText = `
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px dashed var(--ui-tertiary);
        `;
        editHeader.textContent = '编辑';

        const switchMode = (newMode) => {
            config.mode = newMode;
            if (newMode === 2) {
                taskTabBtn.className = 'sa-todo-mode-tab-btn enable';
                taskTabBtn.style.backgroundColor = 'var(--looks-secondary)';
                taskTabBtn.style.color = 'white';
                groupTabBtn.className = 'sa-todo-mode-tab-btn unable';
                groupTabBtn.style.backgroundColor = 'var(--ui-tertiary)';
                groupTabBtn.style.color = 'var(--text-secondary)';
                taskFields.style.display = '';
                groupFields.style.display = 'none';
                preview.style.display = '';
                previewLabel.style.display = '';
                preview_steps_create.style.display = '';
                refreshGroupSelector();
            } else {
                groupTabBtn.className = 'sa-todo-mode-tab-btn enable';
                groupTabBtn.style.backgroundColor = 'var(--looks-secondary)';
                groupTabBtn.style.color = 'white';
                taskTabBtn.className = 'sa-todo-mode-tab-btn unable';
                taskTabBtn.style.backgroundColor = 'var(--ui-tertiary)';
                taskTabBtn.style.color = 'var(--text-secondary)';
                taskFields.style.display = 'none';
                groupFields.style.display = '';
                preview.style.display = 'none';
                previewLabel.style.display = 'none';
                preview_steps_create.style.display = 'none';
            }
        };

        taskTabBtn.addEventListener('click', () => switchMode(2));
        groupTabBtn.addEventListener('click', () => switchMode(1));

        modeTab.appendChild(taskTabBtn);
        modeTab.appendChild(groupTabBtn);

        container.appendChild(modeTab);

        const scrollContainer = document.createElement('div');
        scrollContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding-bottom: 80px;
        `;

        scrollContainer.appendChild(editHeader);
        scrollContainer.appendChild(taskFields);
        scrollContainer.appendChild(groupFields);
        scrollContainer.appendChild(previewLabel);
        scrollContainer.appendChild(preview);

        container.appendChild(scrollContainer);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            position: absolute;
            bottom: 15px;
            left: 15px;
            right: 15px;
            display: flex;
            gap: 10px;
        `;

        preview_steps_create.style.cssText = `
            flex: 1;
            padding: 10px;
            background-color: var(--looks-secondary);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            opacity: 0.5;
            pointer-events: none;
        `;
        preview_steps_create.textContent = '新的步骤';

        doneBtn.style.cssText = `
            flex: 1;
            padding: 10px;
            background-color: var(--looks-secondary);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
        `;
        doneBtn.textContent = '完成';

        buttonContainer.appendChild(preview_steps_create);
        buttonContainer.appendChild(doneBtn);

        container.appendChild(buttonContainer);

        refreshGroupSelector();

        createWindow.setContent(container);
        createWindow.show();
    };

    const createButton = async () => {
        const findBar = document.querySelector('.sa-find-bar');
        if (!findBar) {
            setTimeout(createButton, 500);
            return;
        }

        const existingBtn = document.querySelector('.sa-todo-button');
        if (existingBtn) {
            existingBtn.remove();
        }

        const btn = document.createElement('button');
        btn.className = 'sa-find-toggle sa-todo-button';
        btn.textContent = '待办';
        btn.title = '打开待办列表';
        btn.style.cssText = 'min-width: 28px; height: 28px; padding: 4px 6px;';

        addon.tab.displayNoneWhileDisabled(btn);

        btn.addEventListener('click', () => {
            showTodoWindow();
        });

        findBar.appendChild(btn);
    };

    await createButton();
}

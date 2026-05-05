console.log('TODO LIST PLUGIN: Loading...');

export default async function ({ addon, msg, console }) {
  console.log('TODO LIST PLUGIN: Initializing...');

  class TodoList {
    constructor() {
      this.todoButton = null;
      this.todoModal = null;
      this.removeModal = null;
      this.todos = [];
      this.loadTodos();
    }

    loadTodos() {
      try {
        const saved = localStorage.getItem('astraeditor-todos');
        if (saved) {
          this.todos = JSON.parse(saved);
        }
      } catch (e) {
        console.error('TODO LIST: Failed to load todos:', e);
        this.todos = [];
      }
    }

    saveTodos() {
      try {
        localStorage.setItem('astraeditor-todos', JSON.stringify(this.todos));
      } catch (e) {
        console.error('TODO LIST: Failed to save todos:', e);
      }
    }

    async createTodoButton() {
      if (this.todoButton && document.contains(this.todoButton)) {
        console.log('TODO LIST: Button already exists');
        return;
      }

      console.log('TODO LIST: Waiting for tab bar...');

      // 使用 waitForElement 等待标签栏出现
      const tabBar = await addon.tab.waitForElement('[class*="react-tabs_react-tabs__tab-list"]', {
        markAsSeen: true
      });

      if (!tabBar) {
        console.error('TODO LIST: Tab bar not found');
        return;
      }

      console.log('TODO LIST: Found tab bar, creating button...');

      this.todoButton = document.createElement('button');
      this.todoButton.className = addon.tab.scratchClass('menu-bar_menu-bar-button', {
        others: 'todo-list-button'
      });
      this.todoButton.textContent = msg('todo-button', '待办');
      this.todoButton.title = msg('todo-tooltip', '打开待办列表');

      addon.tab.displayNoneWhileDisabled(this.todoButton);

      this.todoButton.addEventListener('click', () => {
        console.log('TODO LIST: Button clicked');
        this.showTodoModal();
      });

      // 将按钮添加到标签栏
      tabBar.appendChild(this.todoButton);
      console.log('TODO LIST: Button added to tab bar');

      this.updateButtonBadge();
    }

    updateButtonBadge() {
      if (!this.todoButton) return;
      const pendingCount = this.todos.filter(t => !t.completed).length;
      if (pendingCount > 0) {
        this.todoButton.dataset.count = pendingCount;
      } else {
        delete this.todoButton.dataset.count;
      }
    }

    showTodoModal() {
      if (this.todoModal) {
        this.todoModal.remove();
      }

      const { backdrop, container, content, closeButton, remove } = addon.tab.createModal(msg('modal-title', '待办列表'), {
        isOpen: true
      });

      this.todoModal = backdrop;
      this.removeModal = remove;

      container.classList.add('todo-modal-popup');
      content.classList.add('todo-modal-content');
      content.innerHTML = this.generateTodoHTML();

      backdrop.addEventListener('click', () => this.closeModal());
      closeButton.addEventListener('click', () => this.closeModal());

      this.bindEvents();
    }

    closeModal() {
      if (this.removeModal) {
        this.removeModal();
        this.todoModal = null;
        this.removeModal = null;
      }
    }

    generateTodoHTML() {
      const todoItems = this.todos.map((todo, index) => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-index="${index}">
          <div class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${todo.completed ? '<path d="M5 13l4 4L19 7"/>' : ''}
            </svg>
          </div>
          <input type="text" class="todo-text" value="${this.escapeHtml(todo.text)}" ${todo.completed ? 'disabled' : ''} />
          <button class="todo-delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      `).join('');

      return `
        <div class="todo-container">
          <div class="todo-header">
            <h2>${msg('modal-title', '待办列表')}</h2>
            <div class="todo-stats">
              <span class="pending-count">${this.todos.filter(t => !t.completed).length} ${msg('pending', '待完成')}</span>
              <span class="total-count">/ ${this.todos.length} ${msg('total', '总计')}</span>
            </div>
          </div>
          <div class="todo-input-container">
            <input type="text" id="todoInput" placeholder="${msg('add-todo', '添加新待办...')}" />
            <button id="addTodoBtn" class="add-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          </div>
          <div class="todo-list" id="todoList">
            ${todoItems || `<p class="empty-message">${msg('no-todos', '暂无待办事项')}</p>`}
          </div>
          <div class="todo-actions">
            <button id="clearCompletedBtn" class="action-btn secondary">
              ${msg('clear-completed', '清除已完成')}
            </button>
            <button id="clearAllBtn" class="action-btn danger">
              ${msg('clear-all', '清除全部')}
            </button>
          </div>
        </div>
      `;
    }

    escapeHtml(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    bindEvents() {
      const input = document.getElementById('todoInput');
      const addBtn = document.getElementById('addTodoBtn');
      const todoList = document.getElementById('todoList');
      const clearCompletedBtn = document.getElementById('clearCompletedBtn');
      const clearAllBtn = document.getElementById('clearAllBtn');

      const addTodo = () => {
        const text = input.value.trim();
        if (text) {
          this.todos.push({ id: Date.now(), text, completed: false, createdAt: new Date().toISOString() });
          this.saveTodos();
          this.updateButtonBadge();
          this.refreshTodoList();
          input.value = '';
        }
      };

      input.addEventListener('keydown', (e) => e.key === 'Enter' && addTodo());
      addBtn.addEventListener('click', addTodo);

      todoList.addEventListener('click', (e) => {
        const item = e.target.closest('.todo-item');
        if (!item) return;
        const index = parseInt(item.dataset.index);

        if (e.target.closest('.todo-checkbox')) {
          this.todos[index].completed = !this.todos[index].completed;
          this.saveTodos();
          this.updateButtonBadge();
          this.refreshTodoList();
        } else if (e.target.closest('.todo-delete')) {
          this.todos.splice(index, 1);
          this.saveTodos();
          this.updateButtonBadge();
          this.refreshTodoList();
        }
      });

      todoList.addEventListener('change', (e) => {
        const inputEl = e.target;
        if (inputEl.classList.contains('todo-text') && !inputEl.disabled) {
          const index = parseInt(inputEl.closest('.todo-item').dataset.index);
          this.todos[index].text = inputEl.value;
          this.saveTodos();
        }
      });

      clearCompletedBtn.addEventListener('click', () => {
        this.todos = this.todos.filter(t => !t.completed);
        this.saveTodos();
        this.updateButtonBadge();
        this.refreshTodoList();
      });

      clearAllBtn.addEventListener('click', () => {
        if (confirm(msg('confirm-clear-all', '确定要清除所有待办事项吗？'))) {
          this.todos = [];
          this.saveTodos();
          this.updateButtonBadge();
          this.refreshTodoList();
        }
      });
    }

    refreshTodoList() {
      const todoList = document.getElementById('todoList');
      if (!todoList) return;

      const todoItems = this.todos.map((todo, index) => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-index="${index}">
          <div class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${todo.completed ? '<path d="M5 13l4 4L19 7"/>' : ''}
            </svg>
          </div>
          <input type="text" class="todo-text" value="${this.escapeHtml(todo.text)}" ${todo.completed ? 'disabled' : ''} />
          <button class="todo-delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      `).join('');

      todoList.innerHTML = todoItems || `<p class="empty-message">${msg('no-todos', '暂无待办事项')}</p>`;

      const stats = document.querySelector('.todo-stats');
      if (stats) {
        stats.innerHTML = `
          <span class="pending-count">${this.todos.filter(t => !t.completed).length} ${msg('pending', '待完成')}</span>
          <span class="total-count">/ ${this.todos.length} ${msg('total', '总计')}</span>
        `;
      }
    }

    async init() {
      console.log('TODO LIST: Starting init...');
      await this.createTodoButton();
      console.log('TODO LIST: Init completed');
    }
  }

  try {
    const todoList = new TodoList();
    await todoList.init();

    setInterval(() => {
      if (todoList.todoButton && document.contains(todoList.todoButton)) return;
      console.log('TODO LIST: Button lost, recreating...');
      todoList.createTodoButton();
    }, 5000);
  } catch (e) {
    console.error('TODO LIST: Error during initialization:', e);
  }
}

console.log('TODO LIST PLUGIN: Module loaded successfully');

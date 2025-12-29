  //auth
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const currentPage = window.location.pathname;

    // Public pages that don't require auth
    const publicPages = ['/index.html', '/login.html', '/register.html'];
    const isPublicPage = publicPages.some(page => currentPage.includes(page));

    if (!token && !isPublicPage) {
        window.location.href = 'login.html';
        return false;
    }

    if (token && isPublicPage) {
        window.location.href = 'dashboard.html';
        return false;
    }

    return true;
}

// Login form submission
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    alert(data.error || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Registration successful! Please login.');
                    window.location.href = 'login.html';
                } else {
                    if (data.errors) {
                        alert(data.errors.map(err => err.msg).join('\n'));
                    } else {
                        alert(data.error || 'Registration failed');
                    }
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('An error occurred during registration');
            }
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
});

//notes

let currentNotes = [];
let categories = [];

// Load notes
async function loadNotes() {
    try {
        const response = await fetch('/api/user-data', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        const data = await response.json();
        
        currentNotes = data.notes;
        categories = data.categories;
        displayNotes(currentNotes);
        populateCategorySelect('noteCategory', categories);
        populateCategoriesFilter(data.categories);
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

// Display notes
function displayNotes(notes) {
    const container = document.getElementById('notesList');
    
    if (!container) return;
    
    if (notes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <h3>No Notes Yet</h3>
                <p>Create your first note to get started!</p>
                <button class="btn btn-primary" onclick="openNoteModal()">
                    <i class="fas fa-plus"></i> Create Note
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notes.map(note => `
        <div class="note-card ${note.is_pinned ? 'pinned' : ''}">
            ${note.is_pinned ? '<div class="pin-badge"><i class="fas fa-thumbtack"></i></div>' : ''}
            <div class="note-header">
                <h3>${note.title}</h3>
                <div class="note-actions">
                    <button onclick="togglePinNote(${note.id}, ${note.is_pinned})" class="btn-icon">
                        <i class="fas ${note.is_pinned ? 'fa-thumbtack' : 'fa-thumbtack'}"></i>
                    </button>
                    <button onclick="editNote(${note.id})" class="btn-icon">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteNote(${note.id})" class="btn-icon">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="note-content">
                <p>${note.content || ''}</p>
            </div>
            <div class="note-footer">
                ${note.category_name ? 
                    `<span class="category-badge" style="background: ${note.category_color}">
                        ${note.category_name}
                    </span>` : 
                    ''
                }
                <span class="note-date">${new Date(note.updated_at).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

// Open note modal
function openNoteModal(note = null) {
    const modal = document.getElementById('noteModal');
    const form = document.getElementById('noteForm');
    
    if (note) {
        document.getElementById('noteId').value = note.id;
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content || '';
        document.getElementById('noteCategory').value = note.category_id || '';
        document.getElementById('notePinned').checked = note.is_pinned;
        modal.querySelector('h3').textContent = 'Edit Note';
    } else {
        form.reset();
        document.getElementById('noteId').value = '';
        modal.querySelector('h3').textContent = 'Add New Note';
    }
    
    modal.classList.add('active');
}

// Save note
document.getElementById('noteForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const noteData = {
        title: formData.get('title'),
        content: formData.get('content'),
        category_id: formData.get('category_id') || null,
        is_pinned: formData.get('is_pinned') ? 1 : 0
    };
    
    const noteId = formData.get('id');
    const url = noteId ? `/api/notes/${noteId}` : '/api/notes';
    const method = noteId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(noteData)
        });
        
        if (response.ok) {
            closeModal('noteModal');
            loadNotes();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadPinnedNotes();
            }
        } else {
            const error = await response.json();
            alert(error.error || 'Error saving note');
        }
    } catch (error) {
        console.error('Error saving note:', error);
        alert('An error occurred while saving the note');
    }
});

// Edit note
function editNote(id) {
    const note = currentNotes.find(n => n.id == id);
    if (note) {
        openNoteModal(note);
    }
}

// Delete note
async function deleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
        const response = await fetch(`/api/notes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            loadNotes();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadPinnedNotes();
            }
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        alert('Error deleting note');
    }
}

// Toggle pin note
async function togglePinNote(id, isPinned) {
    try {
        const response = await fetch(`/api/notes/${id}/pin`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pinned: !isPinned })
        });
        
        if (response.ok) {
            loadNotes();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadPinnedNotes();
            }
        }
    } catch (error) {
        console.error('Error toggling pin:', error);
    }
}

// Populate category select
function populateCategorySelect(selectId, categories) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">No Category</option>' +
        categories.map(cat => 
            `<option value="${cat.id}">${cat.name}</option>`
        ).join('');
}

// Populate categories filter
function populateCategoriesFilter(categories) {
    const container = document.getElementById('noteCategoriesList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="category-filter-item" data-category="all">
            <span class="filter-dot" style="background: #6c757d"></span>
            <span>All Notes</span>
        </div>
        <div class="category-filter-item" data-category="null">
            <span class="filter-dot" style="background: #adb5bd"></span>
            <span>No Category</span>
        </div>
    ` + categories.map(cat => `
        <div class="category-filter-item" data-category="${cat.id}">
            <span class="filter-dot" style="background: ${cat.color}"></span>
            <span>${cat.name}</span>
        </div>
    `).join('');
    container.querySelectorAll('.category-filter-item').forEach(item => {
        item.addEventListener('click', function() {
            const categoryId = this.dataset.category;
            filterNotesByCategory(categoryId);
        });
    });
}

// Filter notes by category
function filterNotesByCategory(categoryId) {
    let filteredNotes = currentNotes;
    
    if (categoryId === 'all') {
    } else if (categoryId === 'null') {
        filteredNotes = currentNotes.filter(note => !note.category_id);
    } else {
        filteredNotes = currentNotes.filter(note => note.category_id == categoryId);
    }
    
    displayNotes(filteredNotes);
}

// Search notes
document.getElementById('noteSearch')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredNotes = currentNotes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) || 
        (note.content && note.content.toLowerCase().includes(searchTerm))
    );
    displayNotes(filteredNotes);
});

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Add event listeners for modals
document.addEventListener('DOMContentLoaded', function() {
    // Close modals when clicking X or cancel
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Add note button
    const addNoteBtn = document.getElementById('addNoteBtn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', function() {
            openNoteModal();
        });
    }
});

// Make functions globally available for HTML onclick
window.openNoteModal = openNoteModal;
window.editNote = editNote;
window.deleteNote = deleteNote;
window.togglePinNote = togglePinNote;
window.closeModal = closeModal;

//reminder

let currentReminders = [];

// Load reminders
async function loadReminders() {
    try {
        const response = await fetch('/api/user-data', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        const data = await response.json();
        
        currentReminders = data.reminders;
        displayReminders(currentReminders);
        populateCategorySelect('reminderCategory', data.categories);
        
        // Setup filter listeners
        setupReminderFilters();
    } catch (error) {
        console.error('Error loading reminders:', error);
    }
}

// Display reminders
function displayReminders(reminders) {
    const container = document.getElementById('remindersList');
    
    if (!container) return;
    
    if (reminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell"></i>
                <h3>No Reminders Yet</h3>
                <p>Add your first reminder to get started!</p>
                <button class="btn btn-primary" onclick="openReminderModal()">
                    <i class="fas fa-plus"></i> Add Reminder
                </button>
            </div>
        `;
        return;
    }
    
    const now = new Date();
    
    container.innerHTML = reminders.map(reminder => {
        const reminderTime = new Date(reminder.reminder_time);
        const isPast = reminderTime < now;
        
        return `
            <div class="reminder-item ${isPast ? 'past' : ''} ${reminder.is_completed ? 'completed' : ''}">
                <div class="reminder-header">
                    <div class="reminder-time">
                        <i class="fas fa-clock"></i>
                        <span>${reminderTime.toLocaleString()}</span>
                        ${reminder.is_completed ? '<span class="completed-badge">Completed</span>' : ''}
                    </div>
                    <div class="reminder-actions">
                        <button onclick="toggleReminderComplete(${reminder.id}, ${reminder.is_completed})" class="btn-icon">
                            <i class="fas ${reminder.is_completed ? 'fa-undo' : 'fa-check'}"></i>
                        </button>
                        <button onclick="editReminder(${reminder.id})" class="btn-icon">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteReminder(${reminder.id})" class="btn-icon">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <h3>${reminder.title}</h3>
                ${reminder.description ? `<p>${reminder.description}</p>` : ''}
                ${reminder.category_name ? 
                    `<span class="category-badge" style="background: ${reminder.category_color}">
                        ${reminder.category_name}
                    </span>` : 
                    ''
                }
            </div>
        `;
    }).join('');
}

// Open reminder modal
function openReminderModal(reminder = null) {
    const modal = document.getElementById('reminderModal');
    const form = document.getElementById('reminderForm');
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    document.getElementById('reminderDateTime').min = localDateTime;
    
    if (reminder) {
        document.getElementById('reminderId').value = reminder.id;
        document.getElementById('reminderTitle').value = reminder.title;
        document.getElementById('reminderDescription').value = reminder.description || '';
        const reminderTime = new Date(reminder.reminder_time);
        const localTime = new Date(reminderTime.getTime() - reminderTime.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        document.getElementById('reminderDateTime').value = localTime;
        
        document.getElementById('reminderCategory').value = reminder.category_id || '';
        modal.querySelector('h3').textContent = 'Edit Reminder';
    } else {
        form.reset();
        document.getElementById('reminderId').value = '';
        modal.querySelector('h3').textContent = 'Add New Reminder';
    }
    
    modal.classList.add('active');
}

// Save reminder
document.getElementById('reminderForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const reminderData = {
        title: formData.get('title'),
        description: formData.get('description') || null,
        reminder_time: formData.get('reminder_time'),
        category_id: formData.get('category_id') || null
    };
    
    const reminderId = formData.get('id');
    const url = reminderId ? `/api/reminders/${reminderId}` : '/api/reminders';
    const method = reminderId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reminderData)
        });
        
        if (response.ok) {
            closeModal('reminderModal');
            loadReminders();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadUpcomingReminders();
            }
        } else {
            const error = await response.json();
            alert(error.error || 'Error saving reminder');
        }
    } catch (error) {
        console.error('Error saving reminder:', error);
        alert('An error occurred while saving the reminder');
    }
});

// Edit reminder
function editReminder(id) {
    const reminder = currentReminders.find(r => r.id == id);
    if (reminder) {
        openReminderModal(reminder);
    }
}

// Delete reminder
async function deleteReminder(id) {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
        const response = await fetch(`/api/reminders/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            loadReminders();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadUpcomingReminders();
            }
        }
    } catch (error) {
        console.error('Error deleting reminder:', error);
        alert('Error deleting reminder');
    }
}

// Toggle reminder completion
async function toggleReminderComplete(id, isCompleted) {
    try {
        const response = await fetch(`/api/complete/reminder/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed: !isCompleted })
        });
        
        if (response.ok) {
            loadReminders();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadUpcomingReminders();
            }
        }
    } catch (error) {
        console.error('Error updating reminder:', error);
    }
}

// Setup reminder filters
function setupReminderFilters() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            applyReminderFilters();
        });
    });
}

// Apply reminder filters
function applyReminderFilters() {
    const activeTab = document.querySelector('.filter-tab.active');
    const filter = activeTab ? activeTab.dataset.filter : 'upcoming';
    const now = new Date();
    
    let filteredReminders = currentReminders;
    
    switch (filter) {
        case 'upcoming':
            filteredReminders = filteredReminders.filter(r => 
                new Date(r.reminder_time) >= now && !r.is_completed
            );
            break;
        case 'past':
            filteredReminders = filteredReminders.filter(r => 
                new Date(r.reminder_time) < now && !r.is_completed
            );
            break;
        case 'completed':
            filteredReminders = filteredReminders.filter(r => r.is_completed);
            break;
    }
    
    displayReminders(filteredReminders);
}

// Make functions globally available
window.openReminderModal = openReminderModal;
window.editReminder = editReminder;
window.deleteReminder = deleteReminder;
window.toggleReminderComplete = toggleReminderComplete;

// todos

let currentTodos = [];
async function loadTodos() {
    try {
        const response = await fetch('/api/user-data', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        const data = await response.json();
        
        currentTodos = data.todos;
        displayTodos(currentTodos);
        populateCategorySelect('todoCategory', data.categories);
        
        // Setup filter listeners
        setupTodoFilters();
    } catch (error) {
        console.error('Error loading todos:', error);
    }
}

// Display todos
function displayTodos(todos) {
    const container = document.getElementById('todosList');
    
    if (!container) return;
    
    if (todos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>No Tasks Yet</h3>
                <p>Add your first task to get started!</p>
                <button class="btn btn-primary" onclick="openTodoModal()">
                    <i class="fas fa-plus"></i> Add Task
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = todos.map(todo => `
        <div class="todo-item ${todo.is_completed ? 'completed' : ''}">
            <div class="todo-content">
                <label class="checkbox">
                    <input type="checkbox" ${todo.is_completed ? 'checked' : ''} 
                           onchange="toggleTodoComplete(${todo.id}, this.checked)">
                    <span class="${todo.is_completed ? 'completed' : ''}">${todo.task}</span>
                </label>
                <div class="todo-details">
                    ${todo.category_name ? 
                        `<span class="category-badge" style="background: ${todo.category_color}">
                            ${todo.category_name}
                        </span>` : 
                        ''
                    }
                    ${todo.due_date ? 
                        `<span class="due-date ${isOverdue(todo.due_date) ? 'overdue' : ''}">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(todo.due_date)}
                        </span>` : 
                        ''
                    }
                    <span class="priority-badge ${todo.priority}">${todo.priority}</span>
                </div>
            </div>
            <div class="todo-actions">
                <button onclick="editTodo(${todo.id})" class="btn-icon">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTodo(${todo.id})" class="btn-icon">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Open todo modal
function openTodoModal(todo = null) {
    const modal = document.getElementById('todoModal');
    const form = document.getElementById('todoForm');
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todoDueDate').min = today;
    
    if (todo) {
        document.getElementById('todoId').value = todo.id;
        document.getElementById('todoTask').value = todo.task;
        document.getElementById('todoPriority').value = todo.priority;
        document.getElementById('todoDueDate').value = todo.due_date || '';
        document.getElementById('todoCategory').value = todo.category_id || '';
        modal.querySelector('h3').textContent = 'Edit Task';
    } else {
        form.reset();
        document.getElementById('todoId').value = '';
        modal.querySelector('h3').textContent = 'Add New Task';
    }
    
    modal.classList.add('active');
}

// Save todo
document.getElementById('todoForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const todoData = {
        task: formData.get('task'),
        priority: formData.get('priority'),
        due_date: formData.get('due_date') || null,
        category_id: formData.get('category_id') || null
    };
    
    const todoId = formData.get('id');
    const url = todoId ? `/api/todos/${todoId}` : '/api/todos';
    const method = todoId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todoData)
        });
        
        if (response.ok) {
            closeModal('todoModal');
            loadTodos();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadTodayTasks();
            }
        } else {
            const error = await response.json();
            alert(error.error || 'Error saving task');
        }
    } catch (error) {
        console.error('Error saving todo:', error);
        alert('An error occurred while saving the task');
    }
});

// Edit todo
function editTodo(id) {
    const todo = currentTodos.find(t => t.id == id);
    if (todo) {
        openTodoModal(todo);
    }
}

// Delete todo
async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            loadTodos();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadTodayTasks();
            }
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
        alert('Error deleting task');
    }
}

// Toggle todo completion
async function toggleTodoComplete(id, completed) {
    try {
        const response = await fetch(`/api/complete/todo/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed })
        });
        
        if (response.ok) {
            loadTodos();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadTodayTasks();
            }
        }
    } catch (error) {
        console.error('Error updating todo:', error);
    }
}

// Setup todo filters
function setupTodoFilters() {
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            applyTodoFilters();
        });
    });
    
    // Priority filter
    const priorityFilter = document.getElementById('priorityFilter');
    if (priorityFilter) {
        priorityFilter.addEventListener('change', applyTodoFilters);
    }
}

// Apply todo filters
function applyTodoFilters() {
    const activeTab = document.querySelector('.filter-tab.active');
    const statusFilter = activeTab ? activeTab.dataset.filter : 'all';
    const priorityFilter = document.getElementById('priorityFilter')?.value || 'all';
    
    let filteredTodos = currentTodos;
    
    // Apply status filter
    if (statusFilter === 'pending') {
        filteredTodos = filteredTodos.filter(todo => !todo.is_completed);
    } else if (statusFilter === 'completed') {
        filteredTodos = filteredTodos.filter(todo => todo.is_completed);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
        filteredTodos = filteredTodos.filter(todo => todo.priority === priorityFilter);
    }
    
    displayTodos(filteredTodos);
}
function isOverdue(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
}
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString();
    }
}

// Make functions globally available
window.openTodoModal = openTodoModal;
window.editTodo = editTodo;
window.deleteTodo = deleteTodo;
window.toggleTodoComplete = toggleTodoComplete;
  

// categories

async function loadCategories() {
    try {
        const response = await fetch('/api/user-data', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        const data = await response.json();
        
        displayCategories(data.categories);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Display categories
function displayCategories(categories) {
    const container = document.getElementById('categoriesList');
    
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <h3>No Categories Yet</h3>
                <p>Create your first category to organize your items!</p>
                <button class="btn btn-primary" onclick="openCategoryModal()">
                    <i class="fas fa-plus"></i> Create Category
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = categories.map(category => `
        <div class="category-card">
            <div class="category-header">
                <div class="category-color" style="background: ${category.color}"></div>
                <h3>${category.name}</h3>
            </div>
            <div class="category-actions">
                <button onclick="editCategory(${category.id})" class="btn-icon">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCategory(${category.id})" class="btn-icon">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Open category modal
function openCategoryModal(category = null) {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    
    if (category) {
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryColor').value = category.color;
        modal.querySelector('h3').textContent = 'Edit Category';
    } else {
        form.reset();
        document.getElementById('categoryId').value = '';
        modal.querySelector('h3').textContent = 'Add New Category';
    }
    
    modal.classList.add('active');
}

// Save category
document.getElementById('categoryForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const categoryData = {
        name: formData.get('name'),
        color: formData.get('color')
    };
    
    const categoryId = formData.get('id');
    const url = categoryId ? `/api/categories/${categoryId}` : '/api/categories';
    const method = categoryId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });
        
        if (response.ok) {
            closeModal('categoryModal');
            loadCategories();
            // Also refresh other sections that use categories
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadDashboardStats();
            }
            if (document.getElementById('notesSection').classList.contains('active')) {
                loadNotes();
            }
            if (document.getElementById('todosSection').classList.contains('active')) {
                loadTodos();
            }
            if (document.getElementById('remindersSection').classList.contains('active')) {
                loadReminders();
            }
        } else {
            const error = await response.json();
            alert(error.error || 'Error saving category');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        alert('An error occurred while saving the category');
    }
});

// Edit category
function editCategory(id) {
    // Get categories from local storage or reload
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const category = userData.categories?.find(c => c.id == id);
    if (category) {
        openCategoryModal(category);
    } else {
        loadCategories().then(() => {
            const updatedData = JSON.parse(localStorage.getItem('userData') || '{}');
            const updatedCategory = updatedData.categories?.find(c => c.id == id);
            if (updatedCategory) {
                openCategoryModal(updatedCategory);
            }
        });
    }
}

const addCategoryBtn = document.getElementById('addCategoryBtn');
if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', function() {
        openCategoryModal();
    });
}

// Delete category
async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category? Notes/Tasks/Reminders using this category will become uncategorized.')) return;
    
    try {
        const response = await fetch(`/api/categories/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            loadCategories();
            loadNotes();
            loadTodos();
            loadReminders();
            if (document.getElementById('dashboardSection').classList.contains('active')) {
                loadDashboardStats();
            }
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category');
    }
}

// Make functions globally available
window.openCategoryModal = openCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;


// Dashboard navigation
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const sectionTitle = document.getElementById('sectionTitle');
    const addButtons = document.querySelectorAll('.header-actions button');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected section
            sections.forEach(sec => {
                sec.classList.remove('active');
                if(sec.id === section + 'Section') {
                    sec.classList.add('active');
                }
            });
            
            // Update title
            sectionTitle.textContent = this.querySelector('span').textContent;
            
            // Show/hide add buttons
            addButtons.forEach(btn => btn.style.display = 'none');
            
            // Show the correct add button based on section
            switch(section) {
                case 'notes':
                    document.getElementById('addNoteBtn').style.display = 'block';
                    break;
                case 'todos':
                    document.getElementById('addTodoBtn').style.display = 'block';
                    break;
                case 'reminders':
                    document.getElementById('addReminderBtn').style.display = 'block';
                    break;
                case 'categories':
                    document.getElementById('addCategoryBtn').style.display = 'block';
                    break;
                default:
                    // For dashboard, hide all add buttons
                    addButtons.forEach(btn => btn.style.display = 'none');
            }
            
            // Load section data
            switch(section) {
                case 'notes':
                    loadNotes();
                    break;
                case 'todos':
                    loadTodos();
                    break;
                case 'reminders':
                    loadReminders();
                    break;
                case 'categories':
                    loadCategories();
                    break;
                case 'dashboard':
                    loadDashboardStats();
                    loadPinnedNotes();
                    loadUpcomingReminders();
                    loadTodayTasks();
                    break;
            }
        });
    });

    // Sidebar toggle for mobile
    document.getElementById('sidebarToggle').addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('collapsed');
    });
    document.getElementById('addNoteBtn')?.addEventListener('click', function() {
        openNoteModal();
    });
    
    document.getElementById('addTodoBtn')?.addEventListener('click', function() {
        openTodoModal();
    });
    
    document.getElementById('addReminderBtn')?.addEventListener('click', function() {
        openReminderModal();
    });
    
    document.getElementById('addCategoryBtn')?.addEventListener('click', function() {
        openCategoryModal();
    });

    // Load initial data
    loadDashboardStats();
    loadPinnedNotes();
    loadUpcomingReminders();
    loadTodayTasks();
    loadCategories();
});
        // Load dashboard statistics
        async function loadDashboardStats() {
            try {
                const response = await fetch('/api/user-data', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                const data = await response.json();
                
                document.getElementById('notesCount').textContent = data.notes.length;
                document.getElementById('todosCount').textContent = data.todos.length;
                document.getElementById('remindersCount').textContent = data.reminders.length;
                document.getElementById('categoriesCount').textContent = data.categories.length;
                
                // Update user info
                const user = JSON.parse(localStorage.getItem('user'));
                if(user) {
                    document.getElementById('usernameDisplay').textContent = user.username;
                    document.getElementById('emailDisplay').textContent = user.email;
                }
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }

        // Load pinned notes
        async function loadPinnedNotes() {
            try {
                const response = await fetch('/api/user-data', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                const data = await response.json();
                
                const pinnedNotes = data.notes.filter(note => note.is_pinned);
                const container = document.getElementById('pinnedNotesList');
                
                if(pinnedNotes.length === 0) {
                    container.innerHTML = '<p class="empty-message">No pinned notes</p>';
                    return;
                }
                
                container.innerHTML = pinnedNotes.slice(0, 5).map(note => `
                    <div class="note-item">
                        <div class="note-header">
                            <h4>${note.title}</h4>
                            <span class="note-category" style="background: ${note.category_color || '#007bff'}">${note.category_name || 'No Category'}</span>
                        </div>
                        <p class="note-preview">${note.content ? note.content.substring(0, 100) : 'No content'}...</p>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading pinned notes:', error);
            }
        }

        // Load upcoming reminders
        async function loadUpcomingReminders() {
            try {
                const response = await fetch('/api/upcoming-reminders', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                const data = await response.json();
                const container = document.getElementById('upcomingReminders');
                
                if(data.length === 0) {
                    container.innerHTML = '<p class="empty-message">No upcoming reminders</p>';
                    return;
                }
                
                container.innerHTML = data.slice(0, 5).map(reminder => `
                    <div class="reminder-item">
                        <div class="reminder-time">
                            <i class="fas fa-clock"></i>
                            <span>${new Date(reminder.reminder_time).toLocaleString()}</span>
                        </div>
                        <h4>${reminder.title}</h4>
                        ${reminder.description ? `<p>${reminder.description.substring(0, 80)}...</p>` : ''}
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading upcoming reminders:', error);
            }
        }

        // Load today's tasks
        async function loadTodayTasks() {
            try {
                const response = await fetch('/api/user-data', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                const data = await response.json();
                
                const today = new Date().toISOString().split('T')[0];
                const todayTasks = data.todos.filter(todo => todo.due_date === today);
                const container = document.getElementById('todaysTasks');
                
                if(todayTasks.length === 0) {
                    container.innerHTML = '<p class="empty-message">No tasks due today</p>';
                    return;
                }
                
                container.innerHTML = todayTasks.map(todo => `
                    <div class="todo-item">
                        <label class="checkbox">
                            <input type="checkbox" ${todo.is_completed ? 'checked' : ''} 
                                   onchange="toggleTodoComplete(${todo.id}, this.checked)">
                            <span class="${todo.is_completed ? 'completed' : ''}">${todo.task}</span>
                        </label>
                        <span class="todo-priority ${todo.priority}">${todo.priority}</span>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading today\'s tasks:', error);
            }
        }

        // Toggle todo completion
        async function toggleTodoComplete(id, completed) {
            try {
                await fetch(`/api/complete/todo/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token'),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ completed })
                });
                loadTodayTasks();
            } catch (error) {
                console.error('Error updating todo:', error);
            }

        }

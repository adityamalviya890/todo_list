/* =============================================
   TaskFlow — Professional To-Do List
   app.js
   ============================================= */

'use strict';

// ─── State ───────────────────────────────────
let tasks       = JSON.parse(localStorage.getItem('taskflow_tasks') || '[]');
let currentFilter = 'all';
let currentSort   = 'created';
let editingId     = null;

// ─── DOM Refs ────────────────────────────────
const taskInput        = document.getElementById('taskInput');
const taskCategory     = document.getElementById('taskCategory');
const taskDue          = document.getElementById('taskDue');
const taskPriority     = document.getElementById('taskPriority');
const taskNote         = document.getElementById('taskNote');
const addTaskBtn       = document.getElementById('addTaskBtn');
const taskList         = document.getElementById('taskList');
const emptyState       = document.getElementById('emptyState');
const searchInput      = document.getElementById('searchInput');
const clearCompletedBtn= document.getElementById('clearCompletedBtn');
const sidebar          = document.getElementById('sidebar');
const mainContent      = document.getElementById('mainContent');
const sidebarToggle    = document.getElementById('sidebarToggle');
const sortBtn          = document.getElementById('sortBtn');
const sortDropdown     = document.getElementById('sortDropdown');
const modalOverlay     = document.getElementById('modalOverlay');
const modalClose       = document.getElementById('modalClose');
const modalCancel      = document.getElementById('modalCancel');
const modalSave        = document.getElementById('modalSave');
const progressBar      = document.getElementById('progressBar');
const progressPercent  = document.getElementById('progressPercent');
const progressSub      = document.getElementById('progressSub');
const pageTitle        = document.getElementById('pageTitle');
const pageDate         = document.getElementById('pageDate');
const toastContainer   = document.getElementById('toastContainer');

// ─── Utilities ───────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function saveTasks() {
  localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function isOverdue(due) {
  return due && due < today();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m-1]} ${+d}, ${y}`;
}

function showToast(msg, type = 'info') {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type]} toast-icon"></i><span>${msg}</span>`;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ─── Background Particles ────────────────────
function spawnParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['#6c63ff','#a78bfa','#34d399','#fbbf24'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 14 + 4;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${Math.random()*18+12}s;
      animation-delay:${Math.random()*10}s;
    `;
    container.appendChild(p);
  }
}
spawnParticles();

// ─── Date Display ────────────────────────────
function setDateDisplay() {
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  pageDate.textContent = now.toLocaleDateString('en-US', opts);
}
setDateDisplay();

// ─── Sidebar Toggle ──────────────────────────
sidebarToggle.addEventListener('click', () => {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('collapsed');
  }
});

// Close sidebar on mobile outside click
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768 &&
      sidebar.classList.contains('mobile-open') &&
      !sidebar.contains(e.target) &&
      !sidebarToggle.contains(e.target)) {
    sidebar.classList.remove('mobile-open');
  }
});

// ─── Sort Dropdown ───────────────────────────
sortBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sortDropdown.classList.toggle('open');
});
document.addEventListener('click', () => sortDropdown.classList.remove('open'));

document.querySelectorAll('.sort-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    renderTasks();
    sortDropdown.classList.remove('open');
  });
});

// ─── Nav Filters ─────────────────────────────
const filterTitles = {
  all: 'All Tasks', today: "Today's Tasks", upcoming: 'Upcoming Tasks',
  completed: 'Completed Tasks', high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority'
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    currentFilter = item.dataset.filter;
    pageTitle.textContent = filterTitles[currentFilter] || 'All Tasks';
    renderTasks();
    if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
  });
});

// ─── Add Task ────────────────────────────────
function addTask() {
  const name = taskInput.value.trim();
  if (!name) {
    taskInput.focus();
    taskInput.style.borderColor = 'var(--red)';
    setTimeout(() => taskInput.style.borderColor = '', 1200);
    showToast('Please enter a task name.', 'error');
    return;
  }
  const task = {
    id:       uid(),
    name,
    category: taskCategory.value.trim(),
    due:      taskDue.value,
    priority: taskPriority.value,
    note:     taskNote.value.trim(),
    completed:false,
    createdAt: Date.now()
  };
  tasks.unshift(task);
  saveTasks();
  renderTasks();
  updateBadges();
  updateProgress();
  showToast('Task added!', 'success');

  // Reset form
  taskInput.value = '';
  taskCategory.value = '';
  taskDue.value = '';
  taskPriority.value = 'medium';
  taskNote.value = '';
  taskInput.focus();
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

// ─── Toggle Complete ─────────────────────────
function toggleComplete(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.completed = !t.completed;
  saveTasks();
  renderTasks();
  updateBadges();
  updateProgress();
  showToast(t.completed ? 'Task completed! 🎉' : 'Task reopened.', t.completed ? 'success' : 'info');
}

// ─── Delete Task ─────────────────────────────
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  updateBadges();
  updateProgress();
  showToast('Task deleted.', 'error');
}

// ─── Clear Completed ─────────────────────────
clearCompletedBtn.addEventListener('click', () => {
  const count = tasks.filter(t => t.completed).length;
  if (!count) { showToast('No completed tasks to clear.', 'info'); return; }
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderTasks();
  updateBadges();
  updateProgress();
  showToast(`Cleared ${count} completed task(s).`, 'success');
});

// ─── Search ──────────────────────────────────
searchInput.addEventListener('input', renderTasks);

// ─── Filter Logic ────────────────────────────
function getFilteredTasks() {
  const q = searchInput.value.trim().toLowerCase();
  const todayStr = today();

  let filtered = tasks.filter(t => {
    if (q && !t.name.toLowerCase().includes(q) && !(t.category||'').toLowerCase().includes(q)) return false;
    switch (currentFilter) {
      case 'all':       return true;
      case 'completed': return t.completed;
      case 'today':     return t.due === todayStr;
      case 'upcoming':  return t.due && t.due > todayStr && !t.completed;
      case 'high':      return t.priority === 'high';
      case 'medium':    return t.priority === 'medium';
      case 'low':       return t.priority === 'low';
      default:          return true;
    }
  });

  // Sort
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'priority': return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'due':
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      case 'alpha':    return a.name.localeCompare(b.name);
      default:         return b.createdAt - a.createdAt;
    }
  });

  return filtered;
}

// ─── Render Tasks ────────────────────────────
function renderTasks() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.add('show');
  } else {
    emptyState.classList.remove('show');
    filtered.forEach(t => taskList.appendChild(createTaskEl(t)));
  }

  updateStats();
}

function createTaskEl(t) {
  const li = document.createElement('li');
  li.className = `task-item ${t.priority} ${t.completed ? 'completed' : ''}`;
  li.dataset.id = t.id;

  const overdue = !t.completed && isOverdue(t.due);

  li.innerHTML = `
    <div class="task-check" role="button" aria-label="Toggle complete" tabindex="0">
      <div class="task-check-inner"></div>
    </div>
    <div class="task-body">
      <p class="task-name">${escapeHtml(t.name)}</p>
      <div class="task-meta-row">
        <span class="task-chip priority-${t.priority}">
          <i class="fa-solid fa-flag"></i> ${t.priority.charAt(0).toUpperCase()+t.priority.slice(1)}
        </span>
        ${t.category ? `<span class="task-chip"><i class="fa-solid fa-tag"></i> ${escapeHtml(t.category)}</span>` : ''}
        ${t.due ? `<span class="task-chip ${overdue ? 'overdue' : ''}">
          <i class="fa-solid fa-calendar-day"></i> ${formatDate(t.due)}${overdue ? ' ⚠ Overdue' : ''}
        </span>` : ''}
      </div>
      ${t.note ? `<p class="task-note"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(t.note)}</p>` : ''}
    </div>
    <div class="task-actions">
      <button class="task-action-btn edit" title="Edit task" aria-label="Edit task">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="task-action-btn delete" title="Delete task" aria-label="Delete task">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;

  // Events
  li.querySelector('.task-check').addEventListener('click', () => toggleComplete(t.id));
  li.querySelector('.task-check').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleComplete(t.id); });
  li.querySelector('.edit').addEventListener('click', () => openEditModal(t.id));
  li.querySelector('.delete').addEventListener('click', () => deleteTask(t.id));

  return li;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// ─── Stats ───────────────────────────────────
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const pending = total - done;
  const overdue = tasks.filter(t => !t.completed && isOverdue(t.due)).length;

  document.getElementById('stat-total-num').textContent  = total;
  document.getElementById('stat-done-num').textContent   = done;
  document.getElementById('stat-pending-num').textContent= pending;
  document.getElementById('stat-overdue-num').textContent= overdue;
}

// ─── Badges ──────────────────────────────────
function updateBadges() {
  const todayStr = today();
  document.getElementById('badge-all').textContent      = tasks.length;
  document.getElementById('badge-today').textContent    = tasks.filter(t => t.due === todayStr).length;
  document.getElementById('badge-upcoming').textContent = tasks.filter(t => t.due && t.due > todayStr && !t.completed).length;
  document.getElementById('badge-completed').textContent= tasks.filter(t => t.completed).length;
  document.getElementById('badge-high').textContent     = tasks.filter(t => t.priority === 'high').length;
  document.getElementById('badge-medium').textContent   = tasks.filter(t => t.priority === 'medium').length;
  document.getElementById('badge-low').textContent      = tasks.filter(t => t.priority === 'low').length;
}

// ─── Progress ────────────────────────────────
function updateProgress() {
  const total = tasks.length;
  const done  = tasks.filter(t => t.completed).length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);
  progressBar.style.width    = pct + '%';
  progressPercent.textContent= pct + '%';
  progressSub.textContent    = `${done} of ${total} tasks done`;
}

// ─── Edit Modal ──────────────────────────────
function openEditModal(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingId = id;
  document.getElementById('editTaskName').value = t.name;
  document.getElementById('editCategory').value  = t.category || '';
  document.getElementById('editDue').value        = t.due || '';
  document.getElementById('editPriority').value   = t.priority;
  document.getElementById('editNote').value       = t.note || '';
  modalOverlay.classList.add('open');
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

modalClose.addEventListener('click',  closeModal);
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

modalSave.addEventListener('click', () => {
  const t = tasks.find(t => t.id === editingId);
  if (!t) return;
  const name = document.getElementById('editTaskName').value.trim();
  if (!name) { showToast('Task name cannot be empty.', 'error'); return; }
  t.name     = name;
  t.category = document.getElementById('editCategory').value.trim();
  t.due      = document.getElementById('editDue').value;
  t.priority = document.getElementById('editPriority').value;
  t.note     = document.getElementById('editNote').value.trim();
  saveTasks();
  renderTasks();
  updateBadges();
  closeModal();
  showToast('Task updated!', 'success');
});

// ─── Keyboard shortcut (N = new task) ────────
document.addEventListener('keydown', e => {
  if (e.key === 'n' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    taskInput.focus();
  }
  if (e.key === 'Escape') closeModal();
});

// ─── Init ────────────────────────────────────
(function init() {
  // Seed demo tasks if first visit
  if (tasks.length === 0) {
    tasks = [
      { id: uid(), name: 'Design project wireframes', category: 'Design', due: today(), priority: 'high',   note: 'Use Figma for mockups', completed: false, createdAt: Date.now()-5000 },
      { id: uid(), name: 'Write project report',      category: 'Study',  due: '',      priority: 'medium', note: '',                     completed: false, createdAt: Date.now()-4000 },
      { id: uid(), name: 'Review literature survey',  category: 'Study',  due: '',      priority: 'low',    note: 'Check IEEE papers',    completed: true,  createdAt: Date.now()-3000 },
      { id: uid(), name: 'Submit assignment',         category: 'Work',   due: today(), priority: 'high',   note: '',                     completed: false, createdAt: Date.now()-2000 },
      { id: uid(), name: 'Team meeting at 3 PM',      category: 'Work',   due: today(), priority: 'medium', note: 'Zoom link in email',   completed: false, createdAt: Date.now()-1000 },
    ];
    saveTasks();
  }
  renderTasks();
  updateBadges();
  updateProgress();
})();

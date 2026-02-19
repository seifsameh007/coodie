// ==================== DASHBOARD LOGIC ====================

// Require auth
if (!requireAuth()) {
    // requireAuth will redirect
}

let currentSection = 'projects';
let deadlineType = 'open';

// ==================== SECTION SWITCHING ====================
function switchSection(section) {
    currentSection = section;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Show/hide sections
    document.querySelectorAll('[id^="section-"]').forEach(el => {
        el.style.display = 'none';
    });
    const target = document.getElementById(`section-${section}`);
    if (target) target.style.display = 'block';
}

// ==================== PROJECTS ====================
async function loadProjects() {
    try {
        const data = await apiRequest('/api/projects');
        renderProjects(data.projects);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function renderProjects(projects) {
    const grid = document.getElementById('projectsGrid');
    const noProjects = document.getElementById('noProjects');

    if (!projects || projects.length === 0) {
        grid.innerHTML = '';
        noProjects.style.display = 'block';
        return;
    }

    noProjects.style.display = 'none';

    grid.innerHTML = projects.map(project => {
        const typeLabels = {
            personal: { label: t('typePersonal'), class: 'type-personal' },
            work: { label: t('typeWork'), class: 'type-work' },
            help: { label: t('typeHelp'), class: 'type-help' }
        };
        const typeInfo = typeLabels[project.type] || typeLabels.personal;

        const startFormatted = new Date(project.startDate).toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        let deadlineText = '';
        if (project.deadlineType === 'open' || !project.deadline) {
            deadlineText = `🔓 ${t('open')}`;
        } else {
            const deadlineDate = new Date(project.deadline);
            deadlineText = `📅 ${deadlineDate.toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            })}`;
        }

        return `
      <div class="project-card" onclick="openProject('${project._id}')">
        <div class="project-card-header">
          <div class="project-card-name">${escapeHtml(project.name)}</div>
          <span class="project-type-badge ${typeInfo.class}">${typeInfo.label}</span>
        </div>
        <div class="project-card-info">
          <div class="info-row">
            <span class="icon">📅</span>
            <span>${t('startDate')}: ${startFormatted}</span>
          </div>
          <div class="info-row">
            <span class="icon">⏰</span>
            <span>${t('deadline')}: ${deadlineText}</span>
          </div>
        </div>
        <div class="project-progress-bar">
          <div class="project-progress-fill" style="width: ${project.completionPercent || 0}%"></div>
        </div>
        <div class="project-progress-label">${project.completionPercent || 0}%</div>
      </div>
    `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== ADD PROJECT MODAL ====================
function openAddProjectModal() {
    document.getElementById('addProjectModal').classList.add('active');
    // Set default start date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('newProjectStartDate').value = today;
    deadlineType = 'open';
}

function closeAddProjectModal() {
    document.getElementById('addProjectModal').classList.remove('active');
    document.getElementById('addProjectForm').reset();
    document.getElementById('newProjectDeadline').style.display = 'none';
    deadlineType = 'open';
    // Reset deadline toggle
    const buttons = document.querySelectorAll('.deadline-toggle button');
    buttons[0].classList.add('active');
    buttons[1].classList.remove('active');
}

function setDeadlineType(type, btn) {
    deadlineType = type;
    // Update toggle buttons
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Show/hide date picker
    document.getElementById('newProjectDeadline').style.display = type === 'fixed' ? 'block' : 'none';
}

async function handleAddProject(e) {
    e.preventDefault();

    const name = document.getElementById('newProjectName').value.trim();
    const startDate = document.getElementById('newProjectStartDate').value;
    const deadline = document.getElementById('newProjectDeadline').value;
    const type = document.getElementById('newProjectType').value;

    if (!name) {
        showToast(t('projectName') + ' is required', 'error');
        return;
    }

    try {
        await apiRequest('/api/projects', {
            method: 'POST',
            body: JSON.stringify({
                name,
                startDate: startDate || new Date().toISOString(),
                deadline: deadlineType === 'fixed' ? deadline : null,
                deadlineType,
                type
            })
        });

        showToast(t('projectCreated'), 'success');
        closeAddProjectModal();
        loadProjects();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ==================== OPEN PROJECT ====================
function openProject(id) {
    window.location.href = `/project?id=${id}`;
}

// ==================== THEME ICON UPDATE ====================
const originalUpdateThemeIcon = updateThemeIcon;
updateThemeIcon = function () {
    const isDark = document.documentElement.classList.contains('dark');
    const sidebarThemeBtn = document.getElementById('themeToggle');
    if (sidebarThemeBtn) {
        const icon = sidebarThemeBtn.querySelector('.icon');
        const text = sidebarThemeBtn.querySelector('span:not(.icon)');
        if (icon) icon.textContent = isDark ? '☀️' : '🌙';
        if (text) text.textContent = isDark ? t('lightMode') : t('darkMode');
    }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    // Set today as default start date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('newProjectStartDate').value = today;
});

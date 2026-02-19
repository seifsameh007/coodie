// ==================== PROJECT DETAIL LOGIC ====================

if (!requireAuth()) {
    // Will redirect
}

let projectId = null;
let projectData = null;
let saveTimeout = null;

// Get project ID from URL
const urlParams = new URLSearchParams(window.location.search);
projectId = urlParams.get('id');

if (!projectId) {
    window.location.href = '/dashboard';
}

// ==================== LOAD PROJECT ====================
async function loadProject() {
    try {
        const data = await apiRequest(`/api/projects/${projectId}`);
        projectData = data.project;
        renderProject();
    } catch (error) {
        showToast(error.message, 'error');
        setTimeout(() => window.location.href = '/dashboard', 2000);
    }
}

function renderProject() {
    const p = projectData;

    // Name
    document.getElementById('projectName').textContent = p.name;
    document.title = `SCIPTIVITY - ${p.name}`;

    // Start Date
    const startFormatted = new Date(p.startDate).toLocaleDateString(
        currentLang === 'ar' ? 'ar-EG' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
    );
    document.getElementById('startDateValue').textContent = startFormatted;

    // Deadline
    if (p.deadlineType === 'open' || !p.deadline) {
        document.getElementById('deadlineValue').innerHTML = `<span style="color:var(--success);">🔓 ${t('open')}</span>`;
    } else {
        const deadlineFormatted = new Date(p.deadline).toLocaleDateString(
            currentLang === 'ar' ? 'ar-EG' : 'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );
        document.getElementById('deadlineValue').textContent = `📅 ${deadlineFormatted}`;
    }

    // Type
    const typeColors = { personal: 'var(--personal-color)', work: 'var(--work-color)', help: 'var(--help-color)' };
    const typeNames = { personal: t('typePersonal'), work: t('typeWork'), help: t('typeHelp') };
    const typeClasses = { personal: 'type-personal', work: 'type-work', help: 'type-help' };
    document.getElementById('typeValue').innerHTML =
        `<span class="project-type-badge ${typeClasses[p.type] || 'type-personal'}">${typeNames[p.type] || p.type}</span>`;

    // Script sections
    renderScriptSections();

    // Notes
    document.getElementById('notesTextarea').value = p.notes || '';

    // Files
    renderFiles();

    // Completion
    document.getElementById('completionInput').value = p.completionPercent || 0;
    document.getElementById('completionBarFill').style.width = `${p.completionPercent || 0}%`;
}

// ==================== SCRIPT SECTIONS ====================
function renderScriptSections() {
    const container = document.getElementById('scriptSections');
    const sections = projectData.script || [];

    if (sections.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:20px; font-size:14px;">${t('addSection')}...</p>`;
        return;
    }

    container.innerHTML = sections.map((section, index) => `
    <div class="script-section" data-index="${index}">
      <div class="script-section-header" onclick="toggleScriptSection(${index})">
        <div class="script-section-title">
          <input type="text" value="${escapeAttr(section.title)}" 
                 onclick="event.stopPropagation()" 
                 onchange="updateSectionTitle(${index}, this.value)"
                 placeholder="${t('sectionTitle')}">
        </div>
        <div class="script-section-actions">
          <button onclick="event.stopPropagation(); moveSection(${index}, -1)" title="Move Up">⬆️</button>
          <button onclick="event.stopPropagation(); moveSection(${index}, 1)" title="Move Down">⬇️</button>
          <button class="delete-section" onclick="event.stopPropagation(); deleteSection(${index})" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="script-section-content" id="scriptContent-${index}">
        <textarea oninput="updateSectionContent(${index}, this.value)"
                  placeholder="${t('sectionContent')}">${section.content || ''}</textarea>
      </div>
    </div>
  `).join('');
}

function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleScriptSection(index) {
    const content = document.getElementById(`scriptContent-${index}`);
    if (content.style.display === 'none') {
        content.style.display = 'block';
    } else {
        content.style.display = 'none';
    }
}

function addScriptSection() {
    if (!projectData.script) projectData.script = [];
    projectData.script.push({
        title: `${t('sectionTitle')} ${projectData.script.length + 1}`,
        content: '',
        order: projectData.script.length
    });
    renderScriptSections();
    autoSave();
}

function updateSectionTitle(index, value) {
    projectData.script[index].title = value;
    autoSave();
}

function updateSectionContent(index, value) {
    projectData.script[index].content = value;
    autoSave();
}

function moveSection(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= projectData.script.length) return;

    const temp = projectData.script[index];
    projectData.script[index] = projectData.script[newIndex];
    projectData.script[newIndex] = temp;

    renderScriptSections();
    autoSave();
}

function deleteSection(index) {
    projectData.script.splice(index, 1);
    renderScriptSections();
    autoSave();
}

// ==================== NOTES ====================
function autoSaveNotes() {
    projectData.notes = document.getElementById('notesTextarea').value;
    autoSave();
}

// ==================== FILES ====================
function renderFiles() {
    const container = document.getElementById('filesList');
    const files = projectData.files || [];

    if (files.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:16px; font-size:14px;">No files yet</p>`;
        return;
    }

    container.innerHTML = files.map(file => {
        const sizeKB = (file.size / 1024).toFixed(1);
        const sizeText = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
        const ext = file.originalName.split('.').pop().toLowerCase();
        const icons = {
            pdf: '📄', doc: '📝', docx: '📝', txt: '📃',
            jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️',
            mp4: '🎬', mp3: '🎵', zip: '📦', rar: '📦',
            js: '⚡', html: '🌐', css: '🎨', json: '📋'
        };
        const icon = icons[ext] || '📎';

        return `
      <div class="file-item">
        <span class="file-icon">${icon}</span>
        <div class="file-info">
          <div class="file-name">${escapeHtml(file.originalName)}</div>
          <div class="file-size">${sizeText}</div>
        </div>
        <div class="file-actions">
          <button onclick="downloadFile('${file._id}')" data-i18n="download">${t('download')}</button>
          <button class="delete-file" onclick="deleteFile('${file._id}')" data-i18n="delete">${t('delete')}</button>
        </div>
      </div>
    `;
    }).join('');
}

async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const uploadBtn = document.querySelector('.upload-btn');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<span class="loading-spinner">↻</span> ${t('saving')}...`;

    try {
        const res = await fetch(`/api/projects/${projectId}/files`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        projectData.files = data.files;
        renderFiles();
        showToast(t('fileUploaded'), 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalText;
        event.target.value = '';
    }
}

function downloadFile(fileId) {
    const link = document.createElement('a');
    link.href = `/api/projects/${projectId}/files/${fileId}`;
    link.setAttribute('download', '');
    // Add auth header via fetch
    fetch(link.href, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    }).then(res => res.blob()).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Get filename from the file list
        const file = projectData.files.find(f => f._id === fileId);
        a.download = file ? file.originalName : 'download';
        a.click();
        window.URL.revokeObjectURL(url);
    }).catch(err => showToast(err.message, 'error'));
}

async function deleteFile(fileId) {
    try {
        const data = await apiRequest(`/api/projects/${projectId}/files/${fileId}`, {
            method: 'DELETE'
        });
        projectData.files = data.files;
        renderFiles();
        showToast(t('fileDeleted'), 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ==================== COMPLETION ====================
function handleCompletionChange() {
    let val = parseInt(document.getElementById('completionInput').value) || 0;
    if (val < 0) val = 0;
    if (val > 100) val = 100;
    document.getElementById('completionInput').value = val;
    document.getElementById('completionBarFill').style.width = `${val}%`;
    projectData.completionPercent = val;
    autoSave();
}

// ==================== EDIT FIELDS ====================
let currentEditField = null;

function editField(field) {
    currentEditField = field;
    const modal = document.getElementById('editFieldModal');
    const title = document.getElementById('editFieldTitle');
    const content = document.getElementById('editFieldContent');

    switch (field) {
        case 'name':
            title.textContent = t('projectName');
            content.innerHTML = `
        <div class="input-group">
          <div class="input-wrapper">
            <input type="text" id="editValue" value="${escapeAttr(projectData.name)}" required>
          </div>
        </div>
      `;
            break;

        case 'startDate':
            title.textContent = t('startDate');
            const startVal = new Date(projectData.startDate).toISOString().split('T')[0];
            content.innerHTML = `
        <div class="input-group">
          <input type="date" id="editValue" value="${startVal}" required>
        </div>
      `;
            break;

        case 'deadline':
            title.textContent = t('deadline');
            const isOpen = projectData.deadlineType === 'open' || !projectData.deadline;
            const dlVal = projectData.deadline ? new Date(projectData.deadline).toISOString().split('T')[0] : '';
            content.innerHTML = `
        <div class="input-group">
          <div class="deadline-toggle">
            <button type="button" class="${isOpen ? 'active' : ''}" onclick="setEditDeadlineType('open', this)" data-i18n="deadlineOpen">${t('deadlineOpen')}</button>
            <button type="button" class="${!isOpen ? 'active' : ''}" onclick="setEditDeadlineType('fixed', this)" data-i18n="deadlineFixed">${t('deadlineFixed')}</button>
          </div>
          <input type="date" id="editDeadlineDate" value="${dlVal}" style="display:${isOpen ? 'none' : 'block'}; margin-top:8px;">
          <input type="hidden" id="editDeadlineType" value="${isOpen ? 'open' : 'fixed'}">
        </div>
      `;
            break;

        case 'type':
            title.textContent = t('projectType');
            content.innerHTML = `
        <div class="input-group">
          <select id="editValue">
            <option value="personal" ${projectData.type === 'personal' ? 'selected' : ''} data-i18n="typePersonal">${t('typePersonal')}</option>
            <option value="work" ${projectData.type === 'work' ? 'selected' : ''} data-i18n="typeWork">${t('typeWork')}</option>
            <option value="help" ${projectData.type === 'help' ? 'selected' : ''} data-i18n="typeHelp">${t('typeHelp')}</option>
          </select>
        </div>
      `;
            break;
    }

    modal.classList.add('active');
}

function setEditDeadlineType(type, btn) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('editDeadlineType').value = type;
    document.getElementById('editDeadlineDate').style.display = type === 'fixed' ? 'block' : 'none';
}

function closeEditField() {
    document.getElementById('editFieldModal').classList.remove('active');
    currentEditField = null;
}

async function saveFieldEdit(e) {
    e.preventDefault();

    const updates = {};

    switch (currentEditField) {
        case 'name':
            updates.name = document.getElementById('editValue').value.trim();
            if (!updates.name) {
                showToast(t('projectName') + ' is required', 'error');
                return;
            }
            break;

        case 'startDate':
            updates.startDate = document.getElementById('editValue').value;
            break;

        case 'deadline':
            updates.deadlineType = document.getElementById('editDeadlineType').value;
            if (updates.deadlineType === 'fixed') {
                updates.deadline = document.getElementById('editDeadlineDate').value;
                if (!updates.deadline) {
                    showToast('Please select a deadline date', 'error');
                    return;
                }
            } else {
                updates.deadline = null;
            }
            break;

        case 'type':
            updates.type = document.getElementById('editValue').value;
            break;
    }

    try {
        const data = await apiRequest(`/api/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        projectData = data.project;
        renderProject();
        closeEditField();
        showToast(t('projectUpdated'), 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ==================== AUTO SAVE ====================
function autoSave() {
    showSaveIndicator('saving');

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            await apiRequest(`/api/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    script: projectData.script,
                    notes: projectData.notes,
                    completionPercent: projectData.completionPercent
                })
            });
            showSaveIndicator('saved');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }, 1000); // Debounce 1 second
}

function showSaveIndicator(state) {
    const indicator = document.getElementById('saveIndicator');
    indicator.className = `save-indicator visible ${state}`;
    indicator.textContent = state === 'saving' ? t('saving') : t('saved');

    if (state === 'saved') {
        setTimeout(() => {
            indicator.classList.remove('visible');
        }, 2000);
    }
}

// ==================== DELETE PROJECT ====================
function confirmDeleteProject() {
    document.getElementById('confirmDeleteOverlay').classList.add('active');
}

function closeConfirmDelete() {
    document.getElementById('confirmDeleteOverlay').classList.remove('active');
}

async function deleteProject() {
    try {
        await apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' });
        showToast(t('projectDeleted'), 'success');
        setTimeout(() => window.location.href = '/dashboard', 1000);
    } catch (error) {
        showToast(error.message, 'error');
    }
    closeConfirmDelete();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadProject();
});

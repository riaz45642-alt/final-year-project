/* ════════════════════════════════════════════════════
   cv_generator.js — TalentBridge CV Generator
   Full logic:
     • Template selector
     • Dynamic sections (Education, Experience, Skills)
     • Live preview updates
     • PDF download via browser print
════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────
   1. TEMPLATES
────────────────────────────────────────────────── */
const CV_TEMPLATES = [
  { id: 'blue',    label: 'Blue',    color: '#4f6ef7' },
  { id: 'classic', label: 'Classic', color: '#1a1a2e' },
  { id: 'green',   label: 'Green',   color: '#0d9e75' },
  { id: 'purple',  label: 'Purple',  color: '#6c4ef7' },
  { id: 'minimal', label: 'Minimal', color: '#fff', border: '#1a1a2e' },
];

let selectedTemplate = 'blue';

function renderTemplateSelector() {
  var grid = document.getElementById('template-selector');
  if (!grid) return;
  grid.innerHTML = CV_TEMPLATES.map(function(t) {
    var isSelected = t.id === selectedTemplate;
    var headerStyle = t.id === 'minimal'
      ? 'background:#fff;border-bottom:2px solid #1a1a2e;'
      : 'background:' + t.color + ';';
    return (
      '<div class="template-thumb' + (isSelected ? ' selected' : '') + '" ' +
           'onclick="selectTemplate(\'' + t.id + '\')" title="' + t.label + '">' +
        '<div class="t-check">✓</div>' +
        '<div class="t-preview">' +
          '<div class="t-header" style="' + headerStyle + '"></div>' +
          '<div class="t-line" style="margin-top:5px"></div>' +
          '<div class="t-line short"></div>' +
          '<div class="t-section-h" style="background:' + (t.id === 'minimal' ? '#1a1a2e' : t.color) + ';margin-top:6px"></div>' +
          '<div class="t-line"></div>' +
          '<div class="t-line short"></div>' +
          '<div class="t-section-h" style="background:' + (t.id === 'minimal' ? '#1a1a2e' : t.color) + ';margin-top:6px"></div>' +
          '<div class="t-line"></div>' +
        '</div>' +
        '<div class="t-label">' + t.label + '</div>' +
      '</div>'
    );
  }).join('');
}

function selectTemplate(id) {
  selectedTemplate = id;
  // Update thumb selection
  document.querySelectorAll('.template-thumb').forEach(function(el, i) {
    el.classList.toggle('selected', CV_TEMPLATES[i].id === id);
  });
  // Update preview panel class
  var panel = document.getElementById('cv-preview-panel');
  if (panel) {
    CV_TEMPLATES.forEach(function(t) { panel.classList.remove('tpl-' + t.id); });
    panel.classList.add('tpl-' + id);
  }
  updatePreview();
}

/* ────────────────────────────────────────────────
   2. DATA MODEL
   Arrays that hold dynamic section entries.
────────────────────────────────────────────────── */
var cvData = {
  education:  [],   // { degree, institution, year, grade }
  experience: [],   // { title, company, duration, desc }
  skills:     [],   // string[]
};

/* ────────────────────────────────────────────────
   3. HELPERS — read static form fields
────────────────────────────────────────────────── */
function getField(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ────────────────────────────────────────────────
   4. DYNAMIC EDUCATION SECTION
────────────────────────────────────────────────── */
function renderEducationEntries() {
  var container = document.getElementById('edu-entries');
  if (!container) return;
  container.innerHTML = cvData.education.map(function(edu, i) {
    return (
      '<div class="entry-card" id="edu-card-' + i + '">' +
        '<div class="entry-card-header">' +
          '<span class="entry-card-title">Education #' + (i + 1) + '</span>' +
          '<button class="entry-remove-btn" onclick="removeEducation(' + i + ')" title="Remove">×</button>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group">' +
            '<label>Degree / Qualification</label>' +
            '<input type="text" value="' + esc(edu.degree) + '" ' +
                   'oninput="cvData.education[' + i + '].degree=this.value;updatePreview()" ' +
                   'placeholder="BS Computer Science">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Year</label>' +
            '<input type="text" value="' + esc(edu.year) + '" ' +
                   'oninput="cvData.education[' + i + '].year=this.value;updatePreview()" ' +
                   'placeholder="2019 – 2023">' +
          '</div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group">' +
            '<label>Institution</label>' +
            '<input type="text" value="' + esc(edu.institution) + '" ' +
                   'oninput="cvData.education[' + i + '].institution=this.value;updatePreview()" ' +
                   'placeholder="FAST-NUCES, Lahore">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Grade / CGPA</label>' +
            '<input type="text" value="' + esc(edu.grade) + '" ' +
                   'oninput="cvData.education[' + i + '].grade=this.value;updatePreview()" ' +
                   'placeholder="3.7 / 4.0">' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function addEducation() {
  cvData.education.push({ degree: '', institution: '', year: '', grade: '' });
  renderEducationEntries();
  // Focus first input of new card
  var cards = document.querySelectorAll('#edu-entries .entry-card');
  if (cards.length) cards[cards.length - 1].querySelector('input').focus();
}

function removeEducation(i) {
  cvData.education.splice(i, 1);
  renderEducationEntries();
  updatePreview();
}

/* ────────────────────────────────────────────────
   5. DYNAMIC EXPERIENCE SECTION
────────────────────────────────────────────────── */
function renderExperienceEntries() {
  var container = document.getElementById('exp-entries');
  if (!container) return;
  container.innerHTML = cvData.experience.map(function(exp, i) {
    return (
      '<div class="entry-card" id="exp-card-' + i + '">' +
        '<div class="entry-card-header">' +
          '<span class="entry-card-title">Position #' + (i + 1) + '</span>' +
          '<button class="entry-remove-btn" onclick="removeExperience(' + i + ')" title="Remove">×</button>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group">' +
            '<label>Job Title</label>' +
            '<input type="text" value="' + esc(exp.title) + '" ' +
                   'oninput="cvData.experience[' + i + '].title=this.value;updatePreview()" ' +
                   'placeholder="Senior Developer">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Duration</label>' +
            '<input type="text" value="' + esc(exp.duration) + '" ' +
                   'oninput="cvData.experience[' + i + '].duration=this.value;updatePreview()" ' +
                   'placeholder="Jan 2022 – Present">' +
          '</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Company</label>' +
          '<input type="text" value="' + esc(exp.company) + '" ' +
                 'oninput="cvData.experience[' + i + '].company=this.value;updatePreview()" ' +
                 'placeholder="TechNova Solutions">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Key Responsibilities / Achievements</label>' +
          '<textarea rows="3" ' +
                    'oninput="cvData.experience[' + i + '].desc=this.value;updatePreview()" ' +
                    'placeholder="Describe your role, impact, and achievements...">' + esc(exp.desc) + '</textarea>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function addExperience() {
  cvData.experience.push({ title: '', company: '', duration: '', desc: '' });
  renderExperienceEntries();
  var cards = document.querySelectorAll('#exp-entries .entry-card');
  if (cards.length) cards[cards.length - 1].querySelector('input').focus();
}

function removeExperience(i) {
  cvData.experience.splice(i, 1);
  renderExperienceEntries();
  updatePreview();
}

/* ────────────────────────────────────────────────
   6. SKILLS TAG SYSTEM
────────────────────────────────────────────────── */
function renderSkillTags() {
  var wrap = document.getElementById('skill-tags-wrap');
  if (!wrap) return;

  // Render existing chips + input
  wrap.innerHTML = cvData.skills.map(function(s, i) {
    return (
      '<span class="skill-chip">' +
        esc(s) +
        '<span class="skill-chip-remove" onclick="removeSkill(' + i + ')">×</span>' +
      '</span>'
    );
  }).join('') +
  '<input class="skill-tag-input" id="skill-tag-input" ' +
         'placeholder="Type skill + Enter" ' +
         'onkeydown="handleSkillInput(event)">';

  // Re-focus input if it was focused
  var inp = document.getElementById('skill-tag-input');
  if (inp) {
    inp.addEventListener('blur', function() {
      var val = inp.value.trim();
      if (val) addSkillFromInput(val);
    });
  }
}

function handleSkillInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    var val = e.target.value.trim().replace(/,$/, '');
    if (val) addSkillFromInput(val);
  } else if (e.key === 'Backspace' && e.target.value === '' && cvData.skills.length) {
    removeSkill(cvData.skills.length - 1);
  }
}

function addSkillFromInput(val) {
  val = val.trim();
  if (val && !cvData.skills.includes(val)) {
    cvData.skills.push(val);
    renderSkillTags();
    updatePreview();
  }
  var inp = document.getElementById('skill-tag-input');
  if (inp) { inp.value = ''; inp.focus(); }
}

function removeSkill(i) {
  cvData.skills.splice(i, 1);
  renderSkillTags();
  updatePreview();
}

// Also allow clicking the wrap to focus the input
function focusSkillInput() {
  var inp = document.getElementById('skill-tag-input');
  if (inp) inp.focus();
}

/* ────────────────────────────────────────────────
   7. LIVE PREVIEW UPDATE
────────────────────────────────────────────────── */
function updatePreview() {
  // ── Static fields ──
  var fname    = getField('cv-fname');
  var lname    = getField('cv-lname');
  var fullName = (fname + ' ' + lname).trim() || 'Your Name';
  var jobTitle = getField('cv-job-title') || 'Professional Title';
  var email    = getField('cv-email')    || '';
  var phone    = getField('cv-phone')    || '';
  var loc      = getField('cv-loc')      || '';
  var summary  = getField('cv-summary')  || '';

  setText('prev-name',      fullName);
  setText('prev-job-title', jobTitle);
  setText('prev-email',     email);
  setText('prev-phone',     phone);
  setText('prev-loc',       loc);
  setText('prev-summary',   summary);

  // ── Education preview ──
  var eduEl = document.getElementById('prev-education-list');
  if (eduEl) {
    if (cvData.education.length === 0) {
      eduEl.innerHTML = '<div class="cv-experience-item"><div class="cv-experience-title" style="color:var(--text-muted)">No education added yet</div></div>';
    } else {
      eduEl.innerHTML = cvData.education.map(function(edu) {
        var line1 = [edu.degree, edu.institution].filter(Boolean).join(' — ');
        var line2 = [edu.year, edu.grade ? 'CGPA: ' + edu.grade : ''].filter(Boolean).join(' · ');
        return (
          '<div class="cv-experience-item">' +
            (line1 ? '<div class="cv-experience-title">' + esc(line1) + '</div>' : '') +
            (line2 ? '<div class="cv-experience-subtitle">' + esc(line2) + '</div>' : '') +
          '</div>'
        );
      }).join('');
    }
  }

  // ── Experience preview ──
  var expEl = document.getElementById('prev-experience-list');
  if (expEl) {
    if (cvData.experience.length === 0) {
      expEl.innerHTML = '<div class="cv-experience-item"><div class="cv-experience-title" style="color:var(--text-muted)">No experience added yet</div></div>';
    } else {
      expEl.innerHTML = cvData.experience.map(function(exp) {
        return (
          '<div class="cv-experience-item">' +
            (exp.title    ? '<div class="cv-experience-title">' + esc(exp.title) + '</div>' : '') +
            (exp.company || exp.duration
              ? '<div class="cv-experience-subtitle">' + esc([exp.company, exp.duration].filter(Boolean).join(' · ')) + '</div>'
              : '') +
            (exp.desc     ? '<div class="cv-experience-desc">' + esc(exp.desc) + '</div>' : '') +
          '</div>'
        );
      }).join('');
    }
  }

  // ── Skills preview ──
  var skillEl = document.getElementById('prev-skills');
  if (skillEl) {
    if (cvData.skills.length === 0) {
      skillEl.innerHTML = '<span class="cv-skill-tag" style="opacity:0.4">No skills added yet</span>';
    } else {
      skillEl.innerHTML = cvData.skills.map(function(s) {
        return '<span class="cv-skill-tag">' + esc(s) + '</span>';
      }).join('');
    }
  }
}

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ────────────────────────────────────────────────
   8. PDF DOWNLOAD
   Uses browser print with @media print CSS to
   isolate the CV preview panel and render it
   cleanly to PDF. No external library needed.
────────────────────────────────────────────────── */
function downloadCV() {
  updatePreview();

  var panel = document.getElementById('cv-preview-panel');
  if (!panel) { if (typeof toast === 'function') toast('Preview not found', 'error'); return; }

  // Build a standalone HTML page for printing
  var tplClass = 'tpl-' + selectedTemplate;
  var panelHTML = panel.outerHTML;

  // Collect CSS from linked stylesheets to embed
  var cssHref = '../css/cv.css';  // relative path from frontend/

  var printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) {
    if (typeof toast === 'function') toast('Pop-up blocked — allow pop-ups to download PDF', 'warning');
    return;
  }

  printWin.document.write(
    '<!DOCTYPE html>' +
    '<html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<title>CV — TalentBridge</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">' +
    '<style>' +
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }' +
    ':root {' +
    '  --accent: #4f6ef7; --accent-light: #e8edff; --accent-mid: #c5d0ff;' +
    '  --success: #0d9e75; --success-light: #e1f5ee;' +
    '  --bg: #f5f6fa; --surface: #ffffff; --border: rgba(0,0,0,0.08); --border-mid: rgba(0,0,0,0.13);' +
    '  --text-primary: #1a1a2e; --text-secondary: #6b7280; --text-muted: #9ca3af;' +
    '  --radius: 12px; --radius-lg: 16px;' +
    '  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);' +
    '  --font-display: "Clash Display", sans-serif; --font-body: "Instrument Sans", sans-serif;' +
    '}' +
    'body { font-family: var(--font-body); background: #fff; color: #1a1a2e; font-size: 14px; }' +
    /* CV preview styles embedded inline */
    '.cv-preview { background:#fff; border-radius:0; border:none; box-shadow:none; width:100%; max-width:700px; margin:0 auto; }' +
    '.cv-preview-header { padding: 28px 28px 20px; color:#fff; page-break-inside: avoid; }' +
    '.tpl-blue    .cv-preview-header { background: #4f6ef7; }' +
    '.tpl-classic .cv-preview-header { background: #1a1a2e; }' +
    '.tpl-green   .cv-preview-header { background: #0d9e75; }' +
    '.tpl-purple  .cv-preview-header { background: #6c4ef7; }' +
    '.tpl-minimal .cv-preview-header { background: #fff; border-bottom: 2px solid #1a1a2e; }' +
    '.tpl-minimal .cv-preview-name   { color: #1a1a2e; }' +
    '.tpl-minimal .cv-preview-job-title { color:#6b7280; opacity:1; }' +
    '.tpl-minimal .cv-preview-contact   { color:#9ca3af; opacity:1; }' +
    '.cv-preview-name      { font-family: var(--font-display); font-size:24px; font-weight:700; }' +
    '.cv-preview-job-title { font-size:13px; opacity:0.85; margin-top:4px; }' +
    '.cv-preview-contact   { font-size:11px; opacity:0.75; margin-top:10px; display:flex; gap:12px; flex-wrap:wrap; }' +
    '.cv-preview-body      { padding:20px 28px; }' +
    '.cv-section-heading   { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; padding-bottom:4px; margin-bottom:10px; margin-top:18px; border-bottom-width:2px; border-bottom-style:solid; }' +
    '.cv-section-heading:first-child { margin-top:0; }' +
    '.tpl-blue   .cv-section-heading { color:#4f6ef7; border-bottom-color:#e8edff; }' +
    '.tpl-classic .cv-section-heading { color:#1a1a2e; border-bottom-color:#e5e5e5; }' +
    '.tpl-green  .cv-section-heading { color:#0d9e75; border-bottom-color:#e1f5ee; }' +
    '.tpl-purple .cv-section-heading { color:#6c4ef7; border-bottom-color:#ede8ff; }' +
    '.tpl-minimal .cv-section-heading { color:#1a1a2e; border-bottom-color:rgba(0,0,0,0.12); border-bottom-width:1px; }' +
    '.cv-experience-item   { margin-bottom:12px; page-break-inside:avoid; }' +
    '.cv-experience-title  { font-size:12px; font-weight:600; color:#1a1a2e; }' +
    '.cv-experience-subtitle { font-size:11px; color:#6b7280; margin-top:1px; }' +
    '.cv-experience-desc   { font-size:11px; color:#6b7280; margin-top:4px; line-height:1.55; }' +
    '.cv-skills-list       { display:flex; flex-wrap:wrap; gap:5px; }' +
    '.cv-skill-tag         { padding:3px 9px; border-radius:20px; font-size:10px; font-weight:600; }' +
    '.tpl-blue   .cv-skill-tag { background:#e8edff; color:#4f6ef7; }' +
    '.tpl-classic .cv-skill-tag { background:#f0f0f0; color:#333; }' +
    '.tpl-green  .cv-skill-tag { background:#e1f5ee; color:#0d9e75; }' +
    '.tpl-purple .cv-skill-tag { background:#ede8ff; color:#6c4ef7; }' +
    '.tpl-minimal .cv-skill-tag { background:#f5f6fa; color:#6b7280; border:1px solid rgba(0,0,0,0.12); }' +
    '.cv-actions-row { display:none; }' +  /* hide action buttons in print */
    '@media print {' +
    '  body { margin:0; }' +
    '  .cv-preview { max-width:100%; }' +
    '}' +
    '</style>' +
    '</head><body>' +
    '<div class="cv-preview ' + tplClass + '">' +
    panelHTML.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '') +  // inner content only
    '</div>' +
    '<script>window.onload=function(){window.print();setTimeout(function(){window.close();},800);};<\/script>' +
    '</body></html>'
  );
  printWin.document.close();

  if (typeof toast === 'function') toast('Opening print dialog for PDF...', 'info');
}

/* ────────────────────────────────────────────────
   9. SAVE TO BACKEND (TiDB)
   Saves current CV data to the cv_data table
   AND syncs name/skills/experience to users table
   so the profile page stays up to date.
────────────────────────────────────────────────── */
async function saveCVToBackend() {
  var user = (typeof AppState !== 'undefined' && AppState.currentUser)
           || (function() { try { return JSON.parse(localStorage.getItem('tb_session')); } catch(e) {} return null; })();

  if (!user) {
    if (typeof toast === 'function') toast('Please sign in to save your CV', 'warning');
    return;
  }

  var apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : 'http://localhost:5000/api';

  // ── 1. Save full CV to cv_data table ──
  var cvPayload = {
    user_id:           user.id,
    first_name:        getField('cv-fname'),
    last_name:         getField('cv-lname'),
    job_title:         getField('cv-job-title'),
    email:             getField('cv-email') || user.email || '',
    phone:             getField('cv-phone'),
    location:          getField('cv-loc'),
    summary:           getField('cv-summary'),
    skills:            cvData.skills.join(', '),
    education:         JSON.stringify(cvData.education),
    experience:        JSON.stringify(cvData.experience),
    selected_template: selectedTemplate,
  };

  // ── 2. Also sync profile fields to users table ──
  var profilePayload = {
    id:         user.id,
    name:       ((cvPayload.first_name + ' ' + cvPayload.last_name).trim()) || user.name,
    email:      cvPayload.email,
    role:       user.role || 'seeker',
    title:      cvPayload.job_title,
    bio:        cvPayload.summary,
    skills:     cvData.skills,
    experience: cvData.experience,
  };

  try {
    var [r1, r2] = await Promise.all([
      fetch(apiBase + '/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cvPayload),
      }),
      fetch(apiBase + '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      }),
    ]);

    var d1 = await r1.json();
    if (d1 && d1.success) {
      if (typeof toast === 'function') toast('CV saved successfully! ✅', 'success');
    } else {
      if (typeof toast === 'function') toast('Save failed — check your connection', 'warning');
    }
  } catch (e) {
    if (typeof toast === 'function') toast('Could not reach server — check your connection', 'error');
    console.error('[saveCVToBackend]', e);
  }
}

/* ────────────────────────────────────────────────
   10. INIT — called on DOMContentLoaded
   Pre-populates fields from TiDB if user is
   logged in. Falls back to session cache.
────────────────────────────────────────────────── */
async function initCVGenerator() {
  var user = (typeof AppState !== 'undefined' && AppState.currentUser)
           || (function() { try { return JSON.parse(localStorage.getItem('tb_session')); } catch(e) {} return null; })();

  if (user && user.id) {
    // Try to load saved CV from TiDB cv_data table
    try {
      var apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : 'http://localhost:5000/api';
      var res = await fetch(apiBase + '/cv/' + user.id);
      if (res.ok) {
        var saved = await res.json();
        if (saved) {
          var set = function(id, val) { var el = document.getElementById(id); if (el && val && !el.value) el.value = val; };
          var nameParts = (saved.name || user.name || '').split(' ');
          set('cv-fname',     saved.first_name || nameParts[0] || '');
          set('cv-lname',     saved.last_name  || nameParts.slice(1).join(' ') || '');
          set('cv-job-title', saved.job_title || saved.title || user.title || '');
          set('cv-email',     saved.email || user.email || '');
          set('cv-phone',     saved.phone || '');
          set('cv-loc',       saved.location || '');
          set('cv-summary',   saved.summary || saved.bio || user.bio || '');

          if (saved.skills && cvData.skills.length === 0) {
            var skills = typeof saved.skills === 'string'
              ? saved.skills.split(',').map(function(s){ return s.trim(); }).filter(Boolean)
              : (Array.isArray(saved.skills) ? saved.skills : []);
            cvData.skills = skills;
          }
          if (saved.education && cvData.education.length === 0) {
            var edu = Array.isArray(saved.education) ? saved.education
              : (typeof saved.education === 'string' ? JSON.parse(saved.education) : []);
            if (edu.length) cvData.education = edu;
          }
          if (saved.experience && cvData.experience.length === 0) {
            var exp = Array.isArray(saved.experience) ? saved.experience
              : (typeof saved.experience === 'string' ? JSON.parse(saved.experience) : []);
            if (exp.length) cvData.experience = exp;
          }
          if (saved.selected_template) selectedTemplate = saved.selected_template;
        }
      }
    } catch(e) {
      // Offline or no CV yet — fall back to session/profile data below
      if (user) {
        var set2 = function(id, val) { var el = document.getElementById(id); if (el && val && !el.value) el.value = val; };
        var parts = (user.name || '').split(' ');
        set2('cv-fname',     parts[0] || '');
        set2('cv-lname',     parts.slice(1).join(' ') || '');
        set2('cv-email',     user.email || '');
        set2('cv-job-title', user.title || '');
        set2('cv-summary',   user.bio   || '');
        if (user.skills && Array.isArray(user.skills) && cvData.skills.length === 0) cvData.skills = user.skills.slice();
        if (user.experience && Array.isArray(user.experience) && cvData.experience.length === 0) cvData.experience = user.experience.slice();
      }
    }
  }

  // Initial renders
  renderTemplateSelector();
  renderEducationEntries();
  renderExperienceEntries();
  renderSkillTags();

  // Wire up static field live preview
  document.querySelectorAll('[data-cv-field]').forEach(function(el) {
    el.addEventListener('input', updatePreview);
  });

  // Skill wrap click
  var wrap = document.getElementById('skill-tags-wrap');
  if (wrap) wrap.addEventListener('click', focusSkillInput);

  updatePreview();

  // Apply template
  var panel = document.getElementById('cv-preview-panel');
  if (panel) {
    CV_TEMPLATES.forEach(function(t) { panel.classList.remove('tpl-' + t.id); });
    panel.classList.add('tpl-' + selectedTemplate);
  }
}

// Expose globals used by inline onclick attributes
window.renderTemplateSelector = renderTemplateSelector;
window.selectTemplate         = selectTemplate;
window.addEducation           = addEducation;
window.removeEducation        = removeEducation;
window.addExperience          = addExperience;
window.removeExperience       = removeExperience;
window.removeSkill            = removeSkill;
window.handleSkillInput       = handleSkillInput;
window.focusSkillInput        = focusSkillInput;
window.updatePreview          = updatePreview;
window.downloadCV             = downloadCV;
window.saveCVToBackend        = saveCVToBackend;
window.initCVGenerator        = initCVGenerator;
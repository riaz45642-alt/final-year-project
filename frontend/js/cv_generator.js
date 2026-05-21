/* ════════════════════════════════════════════════
   cv_generator.js — TalentBridge CV Generator
   • 5 structural templates (not just color)
   • Direct PDF download via html2canvas + jsPDF
   • No print dialog
════════════════════════════════════════════════ */

/* ── 1. TEMPLATES ── */
const CV_TEMPLATES = [
  {
    id: 'classic',
    label: 'Classic',
    desc: 'Traditional top-header layout',
    accent: '#1a1a2e',
    accentLight: '#e5e7eb',
    skillBg: '#f0f0f0',
    skillColor: '#333',
    headerBg: '#1a1a2e',
    headerText: '#ffffff',
  },
  {
    id: 'sidebar',
    label: 'Sidebar',
    desc: 'Two-column with left sidebar',
    accent: '#4f6ef7',
    accentLight: '#e8edff',
    skillBg: '#e8edff',
    skillColor: '#4f6ef7',
    headerBg: '#4f6ef7',
    headerText: '#ffffff',
  },
  {
    id: 'modern',
    label: 'Modern',
    desc: 'Bold name + right-aligned contact',
    accent: '#0d9e75',
    accentLight: '#e1f5ee',
    skillBg: '#e1f5ee',
    skillColor: '#0d9e75',
    headerBg: 'linear-gradient(135deg,#0d9e75,#06766a)',
    headerText: '#ffffff',
  },
  {
    id: 'compact',
    label: 'Compact',
    desc: 'Dense timeline-style layout',
    accent: '#6c4ef7',
    accentLight: '#ede8ff',
    skillBg: '#ede8ff',
    skillColor: '#6c4ef7',
    headerBg: '#6c4ef7',
    headerText: '#ffffff',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    desc: 'Clean white with thin borders',
    accent: '#111827',
    accentLight: '#f3f4f6',
    skillBg: '#f3f4f6',
    skillColor: '#374151',
    headerBg: '#ffffff',
    headerText: '#111827',
  },
];

let selectedTemplate = 'classic';

/* ── 2. DATA MODEL ── */
var cvData = {
  education:  [],
  experience: [],
  skills:     [],
};

/* ── 3. HELPERS ── */
function getField(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── 4. TEMPLATE SELECTOR THUMBNAILS ── */
function renderTemplateSelector() {
  var grid = document.getElementById('template-selector');
  if (!grid) return;
  grid.innerHTML = CV_TEMPLATES.map(function(t) {
    var isSelected = t.id === selectedTemplate;
    var hStyle = 'background:' + t.headerBg + ';';
    return (
      '<div class="template-thumb' + (isSelected ? ' selected' : '') + '" ' +
           'onclick="selectTemplate(\'' + t.id + '\')" title="' + t.label + '">' +
        '<div class="t-check">✓</div>' +
        '<div class="t-preview">' +
          (t.id === 'sidebar'
            ? '<div style="display:flex;height:100%;gap:3px">' +
                '<div style="width:35%;' + hStyle + 'border-radius:2px;padding:3px"></div>' +
                '<div style="flex:1;padding:3px">' +
                  '<div class="t-line" style="margin-bottom:3px"></div>' +
                  '<div class="t-line short"></div>' +
                  '<div class="t-section-h" style="background:' + t.accent + ';margin-top:5px"></div>' +
                  '<div class="t-line" style="margin-top:3px"></div>' +
                '</div>' +
              '</div>'
            : '<div class="t-header" style="' + hStyle + '"></div>' +
              '<div class="t-line" style="margin-top:5px"></div>' +
              '<div class="t-line short"></div>' +
              '<div class="t-section-h" style="background:' + t.accent + ';margin-top:6px"></div>' +
              '<div class="t-line"></div>' +
              '<div class="t-line short"></div>'
          ) +
        '</div>' +
        '<div class="t-label">' + t.label + '</div>' +
      '</div>'
    );
  }).join('');
}

function selectTemplate(id) {
  selectedTemplate = id;
  document.querySelectorAll('.template-thumb').forEach(function(el, i) {
    el.classList.toggle('selected', CV_TEMPLATES[i].id === id);
  });
  updatePreview();
}

/* ── 5. EDUCATION ENTRIES ── */
function renderEducationEntries() {
  var container = document.getElementById('edu-entries');
  if (!container) return;
  if (cvData.education.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">No education added yet. Click below to add.</div>';
    return;
  }
  container.innerHTML = cvData.education.map(function(edu, i) {
    return (
      '<div class="entry-card" id="edu-card-' + i + '">' +
        '<div class="entry-card-header">' +
          '<span class="entry-card-title">Education #' + (i+1) + '</span>' +
          '<button class="entry-remove-btn" onclick="removeEducation(' + i + ')">×</button>' +
        '</div>' +
        '<div class="cv-form-row">' +
          '<div class="cv-form-group"><label>Degree</label><input type="text" value="' + esc(edu.degree) + '" oninput="cvData.education[' + i + '].degree=this.value;updatePreview()" placeholder="BS Computer Science"></div>' +
          '<div class="cv-form-group"><label>Year</label><input type="text" value="' + esc(edu.year) + '" oninput="cvData.education[' + i + '].year=this.value;updatePreview()" placeholder="2019–2023"></div>' +
        '</div>' +
        '<div class="cv-form-row">' +
          '<div class="cv-form-group"><label>Institution</label><input type="text" value="' + esc(edu.institution) + '" oninput="cvData.education[' + i + '].institution=this.value;updatePreview()" placeholder="FAST-NUCES"></div>' +
          '<div class="cv-form-group"><label>Grade / CGPA</label><input type="text" value="' + esc(edu.grade) + '" oninput="cvData.education[' + i + '].grade=this.value;updatePreview()" placeholder="3.7/4.0"></div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function addEducation() {
  cvData.education.push({ degree:'', institution:'', year:'', grade:'' });
  renderEducationEntries();
  var cards = document.querySelectorAll('#edu-entries .entry-card');
  if (cards.length) cards[cards.length-1].querySelector('input').focus();
}
function removeEducation(i) {
  cvData.education.splice(i,1);
  renderEducationEntries();
  updatePreview();
}

/* ── 6. EXPERIENCE ENTRIES ── */
function renderExperienceEntries() {
  var container = document.getElementById('exp-entries');
  if (!container) return;
  if (cvData.experience.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">No experience added yet. Click below to add.</div>';
    return;
  }
  container.innerHTML = cvData.experience.map(function(exp, i) {
    return (
      '<div class="entry-card" id="exp-card-' + i + '">' +
        '<div class="entry-card-header">' +
          '<span class="entry-card-title">Position #' + (i+1) + '</span>' +
          '<button class="entry-remove-btn" onclick="removeExperience(' + i + ')">×</button>' +
        '</div>' +
        '<div class="cv-form-row">' +
          '<div class="cv-form-group"><label>Job Title</label><input type="text" value="' + esc(exp.title) + '" oninput="cvData.experience[' + i + '].title=this.value;updatePreview()" placeholder="Senior Developer"></div>' +
          '<div class="cv-form-group"><label>Duration</label><input type="text" value="' + esc(exp.duration) + '" oninput="cvData.experience[' + i + '].duration=this.value;updatePreview()" placeholder="Jan 2022–Present"></div>' +
        '</div>' +
        '<div class="cv-form-group"><label>Company</label><input type="text" value="' + esc(exp.company) + '" oninput="cvData.experience[' + i + '].company=this.value;updatePreview()" placeholder="TechNova Solutions"></div>' +
        '<div class="cv-form-group"><label>Key Responsibilities</label><textarea rows="3" oninput="cvData.experience[' + i + '].desc=this.value;updatePreview()" placeholder="Describe your role...">' + esc(exp.desc) + '</textarea></div>' +
      '</div>'
    );
  }).join('');
}

function addExperience() {
  cvData.experience.push({ title:'', company:'', duration:'', desc:'' });
  renderExperienceEntries();
  var cards = document.querySelectorAll('#exp-entries .entry-card');
  if (cards.length) cards[cards.length-1].querySelector('input').focus();
}
function removeExperience(i) {
  cvData.experience.splice(i,1);
  renderExperienceEntries();
  updatePreview();
}

/* ── 7. SKILLS ── */
function renderSkillTags() {
  var wrap = document.getElementById('skill-tags-wrap');
  if (!wrap) return;
  wrap.innerHTML = cvData.skills.map(function(s, i) {
    return '<span class="skill-chip">' + esc(s) + '<span class="skill-chip-remove" onclick="removeSkill(' + i + ')">×</span></span>';
  }).join('') +
  '<input class="skill-tag-input" id="skill-tag-input" placeholder="Type skill + Enter" onkeydown="handleSkillInput(event)">';
  var inp = document.getElementById('skill-tag-input');
  if (inp) inp.addEventListener('blur', function() { var v=inp.value.trim(); if(v) addSkillFromInput(v); });
}
function handleSkillInput(e) {
  if (e.key==='Enter'||e.key===',') {
    e.preventDefault();
    var val = e.target.value.trim().replace(/,$/,'');
    if (val) addSkillFromInput(val);
  } else if (e.key==='Backspace' && e.target.value==='' && cvData.skills.length) {
    removeSkill(cvData.skills.length-1);
  }
}
function addSkillFromInput(val) {
  val = val.trim();
  if (val && !cvData.skills.includes(val)) { cvData.skills.push(val); renderSkillTags(); updatePreview(); }
  var inp = document.getElementById('skill-tag-input');
  if (inp) { inp.value=''; inp.focus(); }
}
function removeSkill(i) { cvData.skills.splice(i,1); renderSkillTags(); updatePreview(); }
function focusSkillInput() { var inp=document.getElementById('skill-tag-input'); if(inp) inp.focus(); }

/* ── 8. PREVIEW HTML BUILDERS ── */
// Shared data getter
function getCVData() {
  return {
    fname:    getField('cv-fname'),
    lname:    getField('cv-lname'),
    title:    getField('cv-job-title') || 'Professional Title',
    email:    getField('cv-email'),
    phone:    getField('cv-phone'),
    loc:      getField('cv-loc'),
    linkedin: getField('cv-linkedin'),
    summary:  getField('cv-summary'),
    education:  cvData.education,
    experience: cvData.experience,
    skills:     cvData.skills,
  };
}

// s = scale multiplier: 1 for preview, 2 for PDF
function buildEducationHTML(education, accent, s) {
  s = s||1;
  if (!education.length) return '<p style="color:#9ca3af;font-size:'+(11*s)+'px">No education added.</p>';
  return education.map(function(edu) {
    var line1 = [edu.degree, edu.institution].filter(Boolean).join(' — ');
    var line2 = [edu.year, edu.grade ? 'CGPA: '+edu.grade : ''].filter(Boolean).join(' · ');
    return '<div style="margin-bottom:'+(14*s)+'px">' +
      (line1 ? '<div style="font-size:'+(13*s)+'px;font-weight:600;color:#1a1a2e;line-height:1.4">' + esc(line1) + '</div>' : '') +
      (line2 ? '<div style="font-size:'+(12*s)+'px;color:#6b7280;margin-top:'+(3*s)+'px">' + esc(line2) + '</div>' : '') +
    '</div>';
  }).join('');
}

function buildExperienceHTML(experience, s) {
  s = s||1;
  if (!experience.length) return '<p style="color:#9ca3af;font-size:'+(11*s)+'px">No experience added.</p>';
  return experience.map(function(exp) {
    return '<div style="margin-bottom:'+(16*s)+'px">' +
      (exp.title ? '<div style="font-size:'+(13*s)+'px;font-weight:600;color:#1a1a2e;line-height:1.4">' + esc(exp.title) + '</div>' : '') +
      ((exp.company||exp.duration) ? '<div style="font-size:'+(12*s)+'px;color:#6b7280;margin-top:'+(3*s)+'px">' + esc([exp.company,exp.duration].filter(Boolean).join(' · ')) + '</div>' : '') +
      (exp.desc ? '<div style="font-size:'+(12*s)+'px;color:#6b7280;margin-top:'+(5*s)+'px;line-height:1.6">' + esc(exp.desc) + '</div>' : '') +
    '</div>';
  }).join('');
}

function buildSkillsHTML(skills, bg, color, s) {
  s = s||1;
  if (!skills.length) return '<span style="color:#9ca3af;font-size:'+(11*s)+'px">No skills added.</span>';
  return skills.map(function(sk) {
    return '<span style="display:inline-block;padding:'+(4*s)+'px '+(10*s)+'px;border-radius:'+(20*s)+'px;font-size:'+(11*s)+'px;font-weight:600;background:'+bg+';color:'+color+';margin:'+(3*s)+'px">' + esc(sk) + '</span>';
  }).join('');
}

function sectionHead(label, accent, borderColor, s) {
  s = s||1;
  return '<div style="font-size:'+(11*s)+'px;font-weight:700;text-transform:uppercase;letter-spacing:'+(1*s)+'px;color:'+accent+';border-bottom:2px solid '+borderColor+';padding-bottom:'+(5*s)+'px;margin:'+(20*s)+'px 0 '+(12*s)+'px">' + label + '</div>';
}

// ── TEMPLATE 1: CLASSIC (standard top header, single column) ──
function buildClassicHTML(d, s) {
  s = s||1;
  return (
    '<div style="font-family:\'Instrument Sans\',sans-serif;background:#fff;width:100%">' +
      '<div style="background:#1a1a2e;padding:'+(28*s)+'px '+(36*s)+'px;color:#fff">' +
        '<div style="font-family:\'Clash Display\',sans-serif;font-size:'+(30*s)+'px;font-weight:700;line-height:1.2">' + esc((d.fname+' '+d.lname).trim()||'Your Name') + '</div>' +
        '<div style="font-size:'+(14*s)+'px;opacity:0.85;margin-top:'+(5*s)+'px">' + esc(d.title) + '</div>' +
        '<div style="display:flex;gap:'+(16*s)+'px;flex-wrap:wrap;font-size:'+(12*s)+'px;opacity:0.75;margin-top:'+(12*s)+'px">' +
          (d.email?'<span>✉ '+esc(d.email)+'</span>':'') +
          (d.phone?'<span>📞 '+esc(d.phone)+'</span>':'') +
          (d.loc?'<span>📍 '+esc(d.loc)+'</span>':'') +
          (d.linkedin?'<span>🔗 '+esc(d.linkedin)+'</span>':'') +
        '</div>' +
      '</div>' +
      '<div style="padding:'+(28*s)+'px '+(36*s)+'px">' +
        (d.summary ? sectionHead('Profile Summary','#1a1a2e','#e5e7eb',s) + '<p style="font-size:'+(13*s)+'px;color:#4b5563;line-height:1.7;margin:0">' + esc(d.summary) + '</p>' : '') +
        sectionHead('Education','#1a1a2e','#e5e7eb',s) + buildEducationHTML(d.education,'#1a1a2e',s) +
        sectionHead('Work Experience','#1a1a2e','#e5e7eb',s) + buildExperienceHTML(d.experience,s) +
        sectionHead('Skills','#1a1a2e','#e5e7eb',s) + '<div style="display:flex;flex-wrap:wrap;gap:'+(5*s)+'px">' + buildSkillsHTML(d.skills,'#f0f0f0','#333',s) + '</div>' +
      '</div>' +
    '</div>'
  );
}

// ── TEMPLATE 2: SIDEBAR (two-column, colored left sidebar) ──
function buildSidebarHTML(d, s) {
  s = s||1;
  var sideW = Math.round(220*s);
  return (
    '<div style="font-family:\'Instrument Sans\',sans-serif;background:#fff;width:100%;display:flex;min-height:'+(600*s)+'px">' +
      '<div style="width:'+sideW+'px;background:#4f6ef7;color:#fff;padding:'+(28*s)+'px '+(22*s)+'px;flex-shrink:0">' +
        '<div style="font-family:\'Clash Display\',sans-serif;font-size:'+(22*s)+'px;font-weight:700;line-height:1.25;margin-bottom:'+(5*s)+'px">' + esc((d.fname+' '+d.lname).trim()||'Your Name') + '</div>' +
        '<div style="font-size:'+(13*s)+'px;opacity:0.85;margin-bottom:'+(20*s)+'px;line-height:1.4">' + esc(d.title) + '</div>' +
        '<div style="border-top:1px solid rgba(255,255,255,0.3);padding-top:'+(14*s)+'px;margin-bottom:'+(14*s)+'px">' +
          '<div style="font-size:'+(10*s)+'px;font-weight:700;text-transform:uppercase;letter-spacing:'+(1*s)+'px;opacity:0.7;margin-bottom:'+(8*s)+'px">Contact</div>' +
          (d.email?'<div style="font-size:'+(12*s)+'px;margin-bottom:'+(6*s)+'px;opacity:0.9;word-break:break-all">✉ '+esc(d.email)+'</div>':'') +
          (d.phone?'<div style="font-size:'+(12*s)+'px;margin-bottom:'+(6*s)+'px;opacity:0.9">📞 '+esc(d.phone)+'</div>':'') +
          (d.loc?'<div style="font-size:'+(12*s)+'px;margin-bottom:'+(6*s)+'px;opacity:0.9">📍 '+esc(d.loc)+'</div>':'') +
        '</div>' +
        (d.skills.length ? '<div style="border-top:1px solid rgba(255,255,255,0.3);padding-top:'+(14*s)+'px">' +
          '<div style="font-size:'+(10*s)+'px;font-weight:700;text-transform:uppercase;letter-spacing:'+(1*s)+'px;opacity:0.7;margin-bottom:'+(10*s)+'px">Skills</div>' +
          d.skills.map(function(sk){ return '<div style="background:rgba(255,255,255,0.2);border-radius:'+(12*s)+'px;padding:'+(4*s)+'px '+(10*s)+'px;font-size:'+(12*s)+'px;margin-bottom:'+(5*s)+'px;display:inline-block">' + esc(sk) + '</div> '; }).join('') +
        '</div>' : '') +
      '</div>' +
      '<div style="flex:1;padding:'+(28*s)+'px '+(28*s)+'px">' +
        (d.summary ? '<div style="font-size:'+(13*s)+'px;color:#4b5563;line-height:1.7;margin-bottom:'+(18*s)+'px;padding-bottom:'+(14*s)+'px;border-bottom:1px solid #e5e7eb">' + esc(d.summary) + '</div>' : '') +
        sectionHead('Education','#4f6ef7','#e8edff',s) + buildEducationHTML(d.education,'#4f6ef7',s) +
        sectionHead('Work Experience','#4f6ef7','#e8edff',s) + buildExperienceHTML(d.experience,s) +
      '</div>' +
    '</div>'
  );
}

// ── TEMPLATE 3: MODERN (gradient header, two-column body) ──
function buildModernHTML(d, s) {
  s = s||1;
  return (
    '<div style="font-family:\'Instrument Sans\',sans-serif;background:#fff;width:100%">' +
      '<div style="background:linear-gradient(135deg,#0d9e75,#06766a);padding:'+(32*s)+'px '+(36*s)+'px;color:#fff">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:'+(10*s)+'px">' +
          '<div>' +
            '<div style="font-family:\'Clash Display\',sans-serif;font-size:'+(32*s)+'px;font-weight:700;line-height:1.2">' + esc((d.fname+' '+d.lname).trim()||'Your Name') + '</div>' +
            '<div style="font-size:'+(15*s)+'px;opacity:0.85;margin-top:'+(5*s)+'px;font-weight:500">' + esc(d.title) + '</div>' +
          '</div>' +
          '<div style="text-align:right;font-size:'+(12*s)+'px;opacity:0.9;line-height:2">' +
            (d.email?'<div>'+esc(d.email)+'</div>':'') +
            (d.phone?'<div>'+esc(d.phone)+'</div>':'') +
            (d.loc?'<div>'+esc(d.loc)+'</div>':'') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0">' +
        '<div style="padding:'+(24*s)+'px '+(24*s)+'px '+(24*s)+'px '+(32*s)+'px;border-right:1px solid #e5e7eb">' +
          sectionHead('Profile','#0d9e75','#e1f5ee',s) +
          (d.summary ? '<p style="font-size:'+(13*s)+'px;color:#4b5563;line-height:1.7;margin:0">' + esc(d.summary) + '</p>' : '') +
          sectionHead('Education','#0d9e75','#e1f5ee',s) + buildEducationHTML(d.education,'#0d9e75',s) +
        '</div>' +
        '<div style="padding:'+(24*s)+'px '+(32*s)+'px '+(24*s)+'px '+(24*s)+'px">' +
          sectionHead('Experience','#0d9e75','#e1f5ee',s) + buildExperienceHTML(d.experience,s) +
          sectionHead('Skills','#0d9e75','#e1f5ee',s) + '<div style="display:flex;flex-wrap:wrap;gap:'+(5*s)+'px">' + buildSkillsHTML(d.skills,'#e1f5ee','#0d9e75',s) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ── TEMPLATE 4: COMPACT (timeline dots, left accent bar) ──
function buildCompactHTML(d, s) {
  s = s||1;
  function timelineItem(title, sub, desc) {
    return '<div style="display:flex;gap:'+(12*s)+'px;margin-bottom:'+(14*s)+'px">' +
      '<div style="display:flex;flex-direction:column;align-items:center">' +
        '<div style="width:'+(9*s)+'px;height:'+(9*s)+'px;border-radius:50%;background:#6c4ef7;margin-top:'+(4*s)+'px;flex-shrink:0"></div>' +
        '<div style="width:1px;flex:1;background:#ede8ff;margin-top:'+(3*s)+'px"></div>' +
      '</div>' +
      '<div>' +
        (title?'<div style="font-size:'+(13*s)+'px;font-weight:600;color:#1a1a2e;line-height:1.4">'+esc(title)+'</div>':'') +
        (sub?'<div style="font-size:'+(12*s)+'px;color:#6b7280;margin-top:'+(3*s)+'px">'+esc(sub)+'</div>':'') +
        (desc?'<div style="font-size:'+(12*s)+'px;color:#6b7280;margin-top:'+(5*s)+'px;line-height:1.6">'+esc(desc)+'</div>':'') +
      '</div>' +
    '</div>';
  }
  return (
    '<div style="font-family:\'Instrument Sans\',sans-serif;background:#fff;width:100%">' +
      '<div style="background:#6c4ef7;padding:'+(26*s)+'px '+(32*s)+'px;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:'+(12*s)+'px">' +
        '<div>' +
          '<div style="font-family:\'Clash Display\',sans-serif;font-size:'+(28*s)+'px;font-weight:700;line-height:1.2">' + esc((d.fname+' '+d.lname).trim()||'Your Name') + '</div>' +
          '<div style="font-size:'+(13*s)+'px;opacity:0.85;margin-top:'+(4*s)+'px">' + esc(d.title) + '</div>' +
        '</div>' +
        '<div style="font-size:'+(12*s)+'px;opacity:0.85;text-align:right;line-height:2">' +
          (d.email?esc(d.email)+'<br>':'') + (d.phone?esc(d.phone)+'<br>':'') + (d.loc?esc(d.loc):'') +
        '</div>' +
      '</div>' +
      '<div style="display:flex">' +
        '<div style="width:'+(5*s)+'px;background:#ede8ff;flex-shrink:0"></div>' +
        '<div style="padding:'+(24*s)+'px '+(28*s)+'px;flex:1">' +
          (d.summary ? '<div style="font-size:'+(13*s)+'px;color:#4b5563;line-height:1.7;background:#faf9ff;border-left:'+(3*s)+'px solid #6c4ef7;padding:'+(10*s)+'px '+(14*s)+'px;margin-bottom:'+(20*s)+'px">' + esc(d.summary) + '</div>' : '') +
          sectionHead('Education','#6c4ef7','#ede8ff',s) +
          (d.education.length ? d.education.map(function(edu){
            return timelineItem(
              [edu.degree,edu.institution].filter(Boolean).join(' — '),
              [edu.year, edu.grade?'CGPA: '+edu.grade:''].filter(Boolean).join(' · '),
              null
            );
          }).join('') : '<p style="color:#9ca3af;font-size:'+(12*s)+'px">No education added.</p>') +
          sectionHead('Experience','#6c4ef7','#ede8ff',s) +
          (d.experience.length ? d.experience.map(function(exp){
            return timelineItem(exp.title, [exp.company,exp.duration].filter(Boolean).join(' · '), exp.desc);
          }).join('') : '<p style="color:#9ca3af;font-size:'+(12*s)+'px">No experience added.</p>') +
          sectionHead('Skills','#6c4ef7','#ede8ff',s) +
          '<div style="display:flex;flex-wrap:wrap;gap:'+(5*s)+'px">' + buildSkillsHTML(d.skills,'#ede8ff','#6c4ef7',s) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ── TEMPLATE 5: MINIMAL (white, thin lines, uppercase section labels) ──
function buildMinimalHTML(d, s) {
  s = s||1;
  function minSection(label) {
    return '<div style="font-size:'+(10*s)+'px;font-weight:700;text-transform:uppercase;letter-spacing:'+(2*s)+'px;color:#9ca3af;border-bottom:1px solid #f3f4f6;padding-bottom:'+(6*s)+'px;margin:'+(22*s)+'px 0 '+(12*s)+'px">' + label + '</div>';
  }
  return (
    '<div style="font-family:\'Instrument Sans\',sans-serif;background:#fff;width:100%;padding:'+(40*s)+'px '+(44*s)+'px">' +
      '<div style="border-bottom:2px solid #111827;padding-bottom:'+(20*s)+'px;margin-bottom:'+(4*s)+'px">' +
        '<div style="font-family:\'Clash Display\',sans-serif;font-size:'+(32*s)+'px;font-weight:700;color:#111827;letter-spacing:-0.5px;line-height:1.2">' + esc((d.fname+' '+d.lname).trim()||'Your Name') + '</div>' +
        '<div style="font-size:'+(14*s)+'px;color:#6b7280;margin-top:'+(5*s)+'px">' + esc(d.title) + '</div>' +
        '<div style="display:flex;gap:'+(20*s)+'px;flex-wrap:wrap;font-size:'+(12*s)+'px;color:#9ca3af;margin-top:'+(12*s)+'px">' +
          (d.email?'<span>'+esc(d.email)+'</span>':'') +
          (d.phone?'<span>'+esc(d.phone)+'</span>':'') +
          (d.loc?'<span>'+esc(d.loc)+'</span>':'') +
        '</div>' +
      '</div>' +
      (d.summary ? minSection('Profile') + '<p style="font-size:'+(13*s)+'px;color:#4b5563;line-height:1.75;margin:0">' + esc(d.summary) + '</p>' : '') +
      minSection('Education') + buildEducationHTML(d.education,'#111827',s) +
      minSection('Experience') + buildExperienceHTML(d.experience,s) +
      minSection('Skills') + '<div style="display:flex;flex-wrap:wrap;gap:'+(5*s)+'px">' + buildSkillsHTML(d.skills,'#f3f4f6','#374151',s) + '</div>' +
    '</div>'
  );
}

/* ── 9. UPDATE PREVIEW ── */
function buildTemplateHTML(d, s) {
  s = s||1;
  switch(selectedTemplate) {
    case 'classic':  return buildClassicHTML(d,s);
    case 'sidebar':  return buildSidebarHTML(d,s);
    case 'modern':   return buildModernHTML(d,s);
    case 'compact':  return buildCompactHTML(d,s);
    case 'minimal':  return buildMinimalHTML(d,s);
    default:         return buildClassicHTML(d,s);
  }
}

function updatePreview() {
  var panel = document.getElementById('cv-preview-panel');
  if (!panel) return;
  panel.innerHTML = buildTemplateHTML(getCVData(), 1);
}

/* ── 10. PDF DOWNLOAD ──
   Strategy: render template into a dedicated off-screen div at exactly
   794px (= A4 210mm at 96dpi). Capture with html2canvas at scale=1
   so 1px = 1px — no compression, no shrinking.
   Then place image into jsPDF at the correct mm dimensions.
*/
async function downloadCV() {
  var d = getCVData();
  if (typeof toast==='function') toast('Generating PDF, please wait...','info');

  // A4 at 96dpi = 794 × 1123 px
  var A4_PX_W = 794;

  // Create off-screen container at exact A4 width
  var container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    'width:'+A4_PX_W+'px',
    'background:#ffffff',
    'overflow:visible',
    'z-index:-999',
    'font-size:16px',  // reset base font
  ].join(';');

  // Build HTML with s=1 (normal sizes, but at 794px width = proper A4 scale)
  container.innerHTML = buildTemplateHTML(d, 1);
  document.body.appendChild(container);

  // Wait for fonts/images to render
  await new Promise(function(r){ setTimeout(r, 400); });

  try {
    var canvas = await html2canvas(container, {
      scale: 2,                         // 2x for crisp PDF output
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: A4_PX_W,
      height: container.scrollHeight,
      windowWidth: A4_PX_W,
    });

    document.body.removeChild(container);

    // canvas is @2x → logical pixels = canvas.width/2, canvas.height/2
    // A4: 210mm wide. 794 logical px = 210mm → 1 logical px = 210/794 mm
    var PX2MM = 210 / A4_PX_W;
    var pdfW  = 210;                               // mm
    var pdfH  = 297;                               // mm
    var imgW  = canvas.width  / 2;                 // logical px
    var imgH  = canvas.height / 2;                 // logical px
    var contentH = imgH * PX2MM;                   // mm

    var imgData = canvas.toDataURL('image/png');

    var { jsPDF } = window.jspdf;
    var doc = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' });

    if (contentH <= pdfH) {
      // Single page — place at top, full width
      doc.addImage(imgData, 'PNG', 0, 0, pdfW, contentH);
    } else {
      // Multi-page: slice canvas into A4-height chunks
      var pageH_logical = pdfH / PX2MM;            // logical px per page
      var pageH_canvas  = pageH_logical * 2;        // canvas px per page (@2x)
      var totalCanvas   = canvas.height;
      var yCanvas       = 0;
      var first         = true;

      while (yCanvas < totalCanvas) {
        if (!first) doc.addPage();
        first = false;

        var sliceH = Math.min(pageH_canvas, totalCanvas - yCanvas);
        var slice  = document.createElement('canvas');
        slice.width  = canvas.width;
        slice.height = sliceH;
        slice.getContext('2d').drawImage(
          canvas, 0, yCanvas, canvas.width, sliceH,
          0, 0, canvas.width, sliceH
        );
        var sliceMM = (sliceH / 2) * PX2MM;
        doc.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pdfW, sliceMM);
        yCanvas += pageH_canvas;
      }
    }

    var fname = getField('cv-fname') || 'CV';
    var lname = getField('cv-lname') || '';
    var filename = (fname+'_'+lname).replace(/\s+/g,'_').replace(/^_+|_+$/g,'') + '_CV.pdf';
    doc.save(filename);
    if (typeof toast==='function') toast('PDF downloaded! ✅','success');

  } catch(e) {
    if (document.body.contains(container)) document.body.removeChild(container);
    console.error('[downloadCV]', e);
    if (typeof toast==='function') toast('PDF failed: '+e.message,'error');
  }
}

/* ── 11. SAVE TO BACKEND ── */
async function saveCVToBackend() {
  var user = (typeof AppState!=='undefined' && AppState.currentUser)
           || (function(){ try{ return JSON.parse(localStorage.getItem('tb_session')); }catch(e){} return null; })();
  if (!user) { if(typeof toast==='function') toast('Please sign in to save your CV','warning'); return; }
  var apiBase = (typeof API_BASE!=='undefined') ? API_BASE : 'http://localhost:5000/api';
  var cvPayload = {
    user_id: user.id,
    first_name: getField('cv-fname'),
    last_name:  getField('cv-lname'),
    job_title:  getField('cv-job-title'),
    email:      getField('cv-email') || user.email || '',
    phone:      getField('cv-phone'),
    location:   getField('cv-loc'),
    summary:    getField('cv-summary'),
    skills:     cvData.skills.join(', '),
    education:  JSON.stringify(cvData.education),
    experience: JSON.stringify(cvData.experience),
    selected_template: selectedTemplate,
  };
  var profilePayload = {
    id:         user.id,
    name:       ((cvPayload.first_name+' '+cvPayload.last_name).trim())||user.name,
    email:      cvPayload.email,
    role:       user.role||'seeker',
    title:      cvPayload.job_title,
    bio:        cvPayload.summary,
    skills:     cvData.skills,
    experience: cvData.experience,
  };
  try {
    var [r1] = await Promise.all([
      fetch(apiBase+'/cv', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(cvPayload) }),
      fetch(apiBase+'/users', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(profilePayload) }),
    ]);
    var d1 = await r1.json();
    if (d1&&d1.success) { if(typeof toast==='function') toast('CV saved successfully! ✅','success'); }
    else { if(typeof toast==='function') toast('Save failed — check your connection','warning'); }
  } catch(e) {
    if(typeof toast==='function') toast('Could not reach server','error');
    console.error('[saveCVToBackend]',e);
  }
}

/* ── 12. INIT ── */
async function initCVGenerator() {
  var user = (typeof AppState!=='undefined' && AppState.currentUser)
           || (function(){ try{ return JSON.parse(localStorage.getItem('tb_session')); }catch(e){} return null; })();

  if (user && user.id) {
    try {
      var apiBase = (typeof API_BASE!=='undefined') ? API_BASE : 'http://localhost:5000/api';
      var res = await fetch(apiBase+'/cv/'+user.id);
      if (res.ok) {
        var saved = await res.json();
        if (saved) {
          var set = function(id,val){ var el=document.getElementById(id); if(el&&val&&!el.value) el.value=val; };
          var nameParts = (saved.name||user.name||'').split(' ');
          set('cv-fname',     saved.first_name||nameParts[0]||'');
          set('cv-lname',     saved.last_name||nameParts.slice(1).join(' ')||'');
          set('cv-job-title', saved.job_title||saved.title||user.title||'');
          set('cv-email',     saved.email||user.email||'');
          set('cv-phone',     saved.phone||'');
          set('cv-loc',       saved.location||'');
          set('cv-summary',   saved.summary||saved.bio||user.bio||'');
          if (saved.skills && cvData.skills.length===0) {
            cvData.skills = typeof saved.skills==='string'
              ? saved.skills.split(',').map(function(s){return s.trim();}).filter(Boolean)
              : (Array.isArray(saved.skills)?saved.skills:[]);
          }
          if (saved.education && cvData.education.length===0) {
            var edu = Array.isArray(saved.education)?saved.education:(typeof saved.education==='string'?JSON.parse(saved.education):[]);
            if(edu.length) cvData.education=edu;
          }
          if (saved.experience && cvData.experience.length===0) {
            var exp = Array.isArray(saved.experience)?saved.experience:(typeof saved.experience==='string'?JSON.parse(saved.experience):[]);
            if(exp.length) cvData.experience=exp;
          }
          if (saved.selected_template) selectedTemplate=saved.selected_template;
        }
      }
    } catch(e) {
      if (user) {
        var set2=function(id,val){var el=document.getElementById(id);if(el&&val&&!el.value)el.value=val;};
        var parts=(user.name||'').split(' ');
        set2('cv-fname',parts[0]||'');
        set2('cv-lname',parts.slice(1).join(' ')||'');
        set2('cv-email',user.email||'');
        set2('cv-job-title',user.title||'');
        set2('cv-summary',user.bio||'');
        if(user.skills&&Array.isArray(user.skills)&&cvData.skills.length===0) cvData.skills=user.skills.slice();
        if(user.experience&&Array.isArray(user.experience)&&cvData.experience.length===0) cvData.experience=user.experience.slice();
      }
    }
  }

  // Seed default data if nothing loaded
  if (cvData.education.length===0) {
    cvData.education = [{ degree:'BS Computer Science', institution:'FAST-NUCES, Lahore', year:'2015–2019', grade:'3.7/4.0' }];
  }
  if (cvData.experience.length===0) {
    cvData.experience = [{ title:'Senior Developer', company:'TechNova Solutions', duration:'Jan 2022–Present', desc:'Led a team of 5 developers. Improved app performance by 40%.' }];
  }
  if (cvData.skills.length===0) {
    cvData.skills = ['React.js','Node.js','TypeScript','Python','PostgreSQL','Docker','AWS','Git'];
  }

  renderTemplateSelector();
  renderEducationEntries();
  renderExperienceEntries();
  renderSkillTags();

  document.querySelectorAll('[data-cv-field]').forEach(function(el) {
    el.addEventListener('input', updatePreview);
  });
  var wrap = document.getElementById('skill-tags-wrap');
  if (wrap) wrap.addEventListener('click', focusSkillInput);

  updatePreview();
}

// Expose globals
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
window.buildTemplateHTML       = buildTemplateHTML;
window.downloadCV             = downloadCV;
window.saveCVToBackend        = saveCVToBackend;
window.initCVGenerator        = initCVGenerator;

/* ──────────────────────────────────────────────
   11. CV GENERATOR
────────────────────────────────────────────── */
const CV_TEMPLATES = [
  { id: 'blue',    name: 'Blue Pro',  headerBg: '#4f6ef7', accentColor: '#4f6ef7', sectionBg: '#e8edff' },
  { id: 'classic', name: 'Classic',   headerBg: '#1a1a2e', accentColor: '#1a1a2e', sectionBg: '#f0f0f0' },
  { id: 'green',   name: 'Emerald',   headerBg: '#0d9e75', accentColor: '#0d9e75', sectionBg: '#e1f5ee' },
  { id: 'purple',  name: 'Purple',    headerBg: '#6c4ef7', accentColor: '#6c4ef7', sectionBg: '#ede8ff' },
  { id: 'minimal', name: 'Minimal',   headerBg: '#fff',    accentColor: '#1a1a2e', sectionBg: '#f5f6fa' },
];

function renderTemplateSelector() {
  const templateGrid = document.getElementById('template-selector');
  if (!templateGrid) return;
  templateGrid.innerHTML = CV_TEMPLATES.map(tpl => `
    <div class="template-thumb ${AppState.selectedTemplate === tpl.id ? 'selected' : ''}" onclick="selectTemplate('${tpl.id}')" title="${tpl.name}">
      <div class="t-preview">
        <div class="t-header" style="background:${tpl.headerBg};border-radius:2px"></div>
        <div class="t-line" style="margin-top:5px;background:rgba(0,0,0,0.12)"></div>
        <div class="t-line short" style="background:rgba(0,0,0,0.08)"></div>
        <div class="t-section-h" style="background:${tpl.accentColor};opacity:0.5"></div>
        <div class="t-dot-line"><div class="t-dot" style="background:${tpl.accentColor}"></div><div class="t-line" style="flex:1;background:rgba(0,0,0,0.08)"></div></div>
        <div class="t-dot-line"><div class="t-dot" style="background:${tpl.accentColor}"></div><div class="t-line short" style="flex:1;background:rgba(0,0,0,0.06)"></div></div>
        <div class="t-section-h" style="background:${tpl.accentColor};opacity:0.5"></div>
        <div class="t-dot-line"><div class="t-dot" style="background:${tpl.accentColor}"></div><div class="t-line" style="flex:1;background:rgba(0,0,0,0.08)"></div></div>
      </div>
      <div class="t-check">✓</div>
      <div class="t-label">${tpl.name}</div>
    </div>`).join('');
}

function selectTemplate(templateId) {
  AppState.selectedTemplate = templateId;
  renderTemplateSelector();
  const selectedTpl = CV_TEMPLATES.find(t => t.id === templateId);
  const previewPanel = document.getElementById('cv-preview-panel');
  if (previewPanel && selectedTpl) {
    previewPanel.className = `cv-preview tpl-${templateId}`;
  }
  toast(`Template "${selectedTpl?.name}" selected`, 'info');
  updatePreview();
}

function updatePreview() {
  const getVal = id => (document.getElementById(id)?.value || '').trim();
  const firstName   = getVal('cv-fname');
  const lastName    = getVal('cv-lname');
  const jobTitle    = getVal('cv-job-title');
  const email       = getVal('cv-email');
  const phone       = getVal('cv-phone');
  const location    = getVal('cv-loc');
  const summary     = getVal('cv-summary');
  const skills      = getVal('cv-skills');
  const degree      = getVal('cv-degree');
  const school      = getVal('cv-school');
  const eduYear     = getVal('cv-edu-year');
  const expTitle    = getVal('cv-exp-title');
  const expCompany  = getVal('cv-exp-company');
  const expDuration = getVal('cv-exp-dur');

  const getEl = id => document.getElementById(id);
  if (getEl('prev-name'))      getEl('prev-name').textContent      = (firstName + ' ' + lastName).trim() || 'Your Name';
  if (getEl('prev-job-title')) getEl('prev-job-title').textContent = jobTitle || 'Your Title';
  if (getEl('prev-email'))     getEl('prev-email').textContent     = email || 'email@example.com';
  if (getEl('prev-phone'))     getEl('prev-phone').textContent     = phone || '+92 300 0000000';
  if (getEl('prev-loc'))       getEl('prev-loc').textContent       = location || 'City, Pakistan';
  if (getEl('prev-summary'))   getEl('prev-summary').textContent   = summary || 'Your professional summary will appear here.';
  if (getEl('prev-degree'))    getEl('prev-degree').textContent    = (degree || 'Your Degree') + (school ? ' — ' + school : '') + (eduYear ? ' · ' + eduYear : '');
  if (getEl('prev-exp-title')) getEl('prev-exp-title').textContent = expTitle || 'Your Job Title';
  if (getEl('prev-exp-sub'))   getEl('prev-exp-sub').textContent   = (expCompany || 'Company') + (expDuration ? ' · ' + expDuration : '');

  const skillsContainer = getEl('prev-skills');
  if (skillsContainer) {
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    skillsContainer.innerHTML = skillList.map(skill => `<span class="cv-skill">${skill}</span>`).join('') || '<span class="cv-skill">Add skills above</span>';
  }
}

function downloadCV() {
  const currentUser = AppState.currentUser;
  if (!currentUser) { toast('Please sign in to download your CV', 'warning'); openAuth('login'); return; }

  const downloadBtn = document.getElementById('download-cv-btn');
  if (downloadBtn) { downloadBtn.textContent = 'Generating PDF...'; downloadBtn.disabled = true; }

  setTimeout(() => {
    const getVal = id => (document.getElementById(id)?.value || '').trim();
    const firstName   = getVal('cv-fname') || 'Your';
    const lastName    = getVal('cv-lname') || 'Name';
    const jobTitle    = getVal('cv-job-title') || 'Professional';
    const email       = getVal('cv-email') || '';
    const phone       = getVal('cv-phone') || '';
    const location    = getVal('cv-loc') || '';
    const summary     = getVal('cv-summary') || '';
    const skills      = getVal('cv-skills') || '';
    const degree      = getVal('cv-degree') || '';
    const school      = getVal('cv-school') || '';
    const eduYear     = getVal('cv-edu-year') || '';
    const expTitle    = getVal('cv-exp-title') || '';
    const expCompany  = getVal('cv-exp-company') || '';
    const expDuration = getVal('cv-exp-dur') || '';
    const expDesc     = getVal('cv-exp-desc') || '';
    const activeTpl   = CV_TEMPLATES.find(t => t.id === AppState.selectedTemplate) || CV_TEMPLATES[0];

    const skillTagList = skills.split(',').map(s => s.trim()).filter(Boolean);
    const headerStyle  = activeTpl.id === 'minimal'
      ? `background:#fff;color:#1a1a2e;border-bottom:3px solid #1a1a2e;`
      : `background:${activeTpl.headerBg};color:white;`;

    const cvHTMLContent = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${firstName} ${lastName} — CV</title>
<style>
  body{margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#333;}
  .header{padding:28px 32px;${headerStyle}}
  .header h1{margin:0;font-size:22px;letter-spacing:-0.3px;}
  .header .sub{margin:4px 0 0;font-size:13px;opacity:0.85;}
  .header .contact{margin-top:10px;font-size:11px;opacity:0.75;display:flex;gap:18px;flex-wrap:wrap;}
  .body{padding:20px 32px;}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${activeTpl.accentColor};border-bottom:2px solid ${activeTpl.sectionBg};padding-bottom:4px;margin:18px 0 10px;}
  .section-title:first-child{margin-top:0;}
  .exp-item{margin-bottom:12px;}
  .exp-title{font-weight:700;font-size:12.5px;}
  .exp-sub{font-size:11px;color:#666;margin-top:2px;}
  .exp-desc{font-size:11px;color:#555;margin-top:4px;line-height:1.55;}
  .skills-wrap{display:flex;flex-wrap:wrap;gap:6px;}
  .skill-tag{padding:3px 9px;border-radius:12px;background:${activeTpl.sectionBg};color:${activeTpl.accentColor};font-size:10.5px;font-weight:600;}
  p.summary{font-size:12px;color:#555;line-height:1.65;margin:0;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="header">
  <h1>${firstName} ${lastName}</h1>
  <div class="sub">${jobTitle}</div>
  <div class="contact">
    ${email ? `<span>${email}</span>` : ''}
    ${phone ? `<span>${phone}</span>` : ''}
    ${location ? `<span>${location}</span>` : ''}
  </div>
</div>
<div class="body">
  ${summary ? `<div class="section-title">Profile Summary</div><p class="summary">${summary}</p>` : ''}
  ${degree  ? `<div class="section-title">Education</div><div class="exp-item"><div class="exp-title">${degree}</div><div class="exp-sub">${school}${eduYear ? ' · ' + eduYear : ''}</div></div>` : ''}
  ${expTitle ? `<div class="section-title">Work Experience</div><div class="exp-item"><div class="exp-title">${expTitle}</div><div class="exp-sub">${expCompany}${expDuration ? ' · ' + expDuration : ''}</div>${expDesc ? `<div class="exp-desc">${expDesc}</div>` : ''}</div>` : ''}
  ${skillTagList.length ? `<div class="section-title">Skills</div><div class="skills-wrap">${skillTagList.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>` : ''}
</div>
</body></html>`;

    const blob  = new Blob([cvHTMLContent], { type: 'text/html' });
    const url   = URL.createObjectURL(blob);
    const link  = document.createElement('a');
    link.href   = url;
    link.download = `${firstName}_${lastName}_CV.html`;
    link.click();
    URL.revokeObjectURL(url);

    if (downloadBtn) { downloadBtn.textContent = '⬇️ Download CV'; downloadBtn.disabled = false; }
    toast('CV downloaded! Open the file and Print → Save as PDF', 'success', 4000);
  }, 1000);
}

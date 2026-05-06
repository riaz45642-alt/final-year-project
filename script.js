// script.js
// ─────────────────────────────────────────────
// JobPortal — Frontend Script
// ─────────────────────────────────────────────

// ── Job Data ──────────────────────────────────
// Sample jobs used across multiple pages
const JOBS = [
  { id: 1,  title: 'Senior Frontend Developer', company: 'TechNova Solutions', logo: '🚀', location: 'Lahore',     type: 'Full-time', category: 'tech',    experience: '3-5',  salary: 'Rs 150K–200K', match: 96, skills: ['React', 'TypeScript', 'CSS'],        posted: '2 days ago' },
  { id: 2,  title: 'UI/UX Designer',            company: 'Arbisoft',           logo: '🎨', location: 'Karachi',    type: 'Full-time', category: 'design',  experience: '1-2',  salary: 'Rs 80K–120K',  match: 88, skills: ['Figma', 'Adobe XD', 'Prototyping'], posted: '3 days ago' },
  { id: 3,  title: 'Backend Engineer',           company: 'Systems Ltd',        logo: '⚙️', location: 'Islamabad', type: 'Full-time', category: 'tech',    experience: '3-5',  salary: 'Rs 130K–180K', match: 91, skills: ['Node.js', 'PostgreSQL', 'Docker'],  posted: '1 day ago'  },
  { id: 4,  title: 'Data Analyst',              company: 'NetSol Technologies', logo: '📊', location: 'Lahore',    type: 'Full-time', category: 'tech',    experience: '1-2',  salary: 'Rs 70K–100K',  match: 79, skills: ['Python', 'Excel', 'Tableau'],       posted: '5 days ago' },
  { id: 5,  title: 'Primary School Teacher',    company: 'Beaconhouse School',  logo: '📚', location: 'Lahore',    type: 'Full-time', category: 'teaching',experience: 'Fresh',salary: 'Rs 45K–65K',   match: 72, skills: ['Teaching', 'English', 'Classroom'], posted: '1 week ago' },
  { id: 6,  title: 'Civil Engineer',            company: 'FWO Pakistan',        logo: '🏗️', location: 'Islamabad', type: 'Full-time', category: 'civil',   experience: '3-5',  salary: 'Rs 90K–130K',  match: 68, skills: ['AutoCAD', 'Surveying', 'Concrete'], posted: '3 days ago' },
  { id: 7,  title: 'React Developer',           company: '10Pearls',            logo: '💻', location: 'Remote',    type: 'Remote',    category: 'tech',    experience: '1-2',  salary: 'Rs 120K–160K', match: 94, skills: ['React', 'Redux', 'REST API'],       posted: '4 hours ago'},
  { id: 8,  title: 'Financial Analyst',         company: 'Habib Bank Ltd',      logo: '💰', location: 'Karachi',   type: 'Full-time', category: 'finance', experience: '1-2',  salary: 'Rs 85K–110K',  match: 75, skills: ['Excel', 'Financial Modeling', 'SAP'],posted: '2 days ago' },
  { id: 9,  title: 'Flutter Developer',         company: 'Folio3 Software',     logo: '📱', location: 'Lahore',    type: 'Full-time', category: 'tech',    experience: '1-2',  salary: 'Rs 100K–140K', match: 82, skills: ['Flutter', 'Dart', 'Firebase'],      posted: '6 hours ago'},
  { id: 10, title: 'Content Writer',            company: 'Digital Eggheads',    logo: '✍️', location: 'Remote',    type: 'Remote',    category: 'design',  experience: 'Fresh',salary: 'Rs 30K–50K',   match: 65, skills: ['Writing', 'SEO', 'WordPress'],      posted: '1 day ago'  },
  { id: 11, title: 'Python Developer',          company: 'Programmers Force',   logo: '🐍', location: 'Lahore',    type: 'Full-time', category: 'tech',    experience: '3-5',  salary: 'Rs 110K–160K', match: 89, skills: ['Python', 'Django', 'REST API'],     posted: '2 days ago' },
  { id: 12, title: 'Internship – Web Dev',      company: 'Techlogix',           logo: '🎓', location: 'Karachi',   type: 'Internship',category: 'tech',    experience: 'Fresh',salary: 'Rs 20K–35K',   match: 70, skills: ['HTML', 'CSS', 'JavaScript'],        posted: '3 days ago' },
];

// ── State ──────────────────────────────────────
// Saved job IDs and applied job IDs stored in sessionStorage so they
// persist while browsing between pages in the same session.

function getSaved()   { return JSON.parse(sessionStorage.getItem('savedJobs')   || '[]'); }
function getApplied() { return JSON.parse(sessionStorage.getItem('appliedJobs') || '[]'); }
function setSaved(arr)   { sessionStorage.setItem('savedJobs',   JSON.stringify(arr)); }
function setApplied(arr) { sessionStorage.setItem('appliedJobs', JSON.stringify(arr)); }

// ── Toast Notification ─────────────────────────
/**
 * Show a brief toast notification at the bottom of the screen.
 * @param {string} msg  - Message to show
 * @param {string} type - 'success' | 'info' | 'error' (default plain dark)
 */
function showToast(msg, type) {
  let el = document.getElementById('toast');
  if (!el) {
    // Create a toast element if the page doesn't have one
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast ' + (type || '');
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Build a Job Card HTML String ───────────────
/**
 * Create the HTML for a single job card.
 * @param {Object}  job        - Job object from JOBS array
 * @param {boolean} showRemove - Show a "Remove" button instead of save icon
 */
function buildJobCard(job, showRemove) {
  const saved   = getSaved();
  const applied = getApplied();
  const isSaved   = saved.includes(job.id);
  const isApplied = applied.some(a => a.id === job.id);

  const skillTags = job.skills.map(s => `<span class="job-tag">${s}</span>`).join('');

  const saveBtn = showRemove
    ? `<button class="job-save-btn" onclick="removeSaved(${job.id})" title="Remove">🗑️</button>`
    : `<button class="job-save-btn ${isSaved ? 'saved' : ''}"
         onclick="toggleSave(${job.id})" title="${isSaved ? 'Unsave' : 'Save'}">
         ${isSaved ? '🔖' : '🔖'}
       </button>`;

  const applyLabel = isApplied ? '✅ Applied' : 'Apply Now';
  const applyClass = isApplied ? 'apply-btn applied' : 'apply-btn';
  const applyClick = isApplied ? '' : `onclick="applyJob(${job.id})"`;

  return `
    <div class="job-card" id="job-card-${job.id}">
      <div class="job-card-header">
        <div class="job-company-logo">${job.logo}</div>
        ${saveBtn}
      </div>
      <div class="job-title">${job.title}</div>
      <div class="job-company">${job.company} · ${job.location}</div>
      <div class="job-tags">
        <span class="job-tag">${job.type}</span>
        <span class="job-tag green">${job.experience === 'Fresh' ? 'Fresh OK' : job.experience + ' yrs'}</span>
        <span class="job-tag orange">Match ${job.match}%</span>
        ${skillTags}
      </div>
      <div class="job-footer">
        <div class="job-salary">${job.salary}</div>
        <button class="${applyClass}" ${applyClick}>${applyLabel}</button>
      </div>
      <div style="font-size:11.5px;color:var(--text-muted);margin-top:8px">🕒 ${job.posted}</div>
    </div>
  `;
}

// ── Toggle Save ────────────────────────────────
function toggleSave(id) {
  let saved = getSaved();
  if (saved.includes(id)) {
    saved = saved.filter(s => s !== id);
    showToast('Job removed from saved', 'info');
  } else {
    saved.push(id);
    showToast('Job saved! 🔖', 'success');
  }
  setSaved(saved);

  // Re-render if we're on the saved page
  if (document.getElementById('saved-jobs-grid')) renderSavedJobs();
  // Re-render if we're on the jobs page
  if (document.getElementById('jobs-list')) filterJobs();
  updateProfileCounts();
}

// ── Remove Saved (from saved page) ────────────
function removeSaved(id) {
  let saved = getSaved().filter(s => s !== id);
  setSaved(saved);
  showToast('Job removed', 'info');
  renderSavedJobs();
  updateProfileCounts();
}

// ── Apply Job ──────────────────────────────────
function applyJob(id) {
  const job = JOBS.find(j => j.id === id);
  if (!job) return;

  let applied = getApplied();
  if (applied.some(a => a.id === id)) return;

  applied.push({
    id:      job.id,
    title:   job.title,
    company: job.company,
    date:    new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
    status:  'Reviewing',
  });
  setApplied(applied);
  showToast('Application submitted! 🎉', 'success');

  // Update button on page
  const btn = document.querySelector(`#job-card-${id} .apply-btn`);
  if (btn) { btn.textContent = '✅ Applied'; btn.className = 'apply-btn applied'; btn.onclick = null; }

  // Update counts
  updateProfileCounts();
  if (document.getElementById('applications-list')) renderApplications();
}

// ── Update profile stat counts ─────────────────
function updateProfileCounts() {
  const appsEl  = document.getElementById('prof-apps-count');
  const savedEl = document.getElementById('prof-saved-count');
  if (appsEl)  appsEl.textContent  = getApplied().length;
  if (savedEl) savedEl.textContent = getSaved().length;
}

// ═══════════════════════════════════════════════
// PAGE: HOME (index.html)
// ═══════════════════════════════════════════════

// Render first 6 featured jobs on the home page
function renderFeaturedJobs() {
  const grid = document.getElementById('featured-jobs');
  if (!grid) return;
  grid.innerHTML = JOBS.slice(0, 6).map(j => buildJobCard(j)).join('');
}

// Hero search → redirect to jobs page with query in sessionStorage
function heroSearch() {
  const query    = document.getElementById('hero-search-input')?.value.trim();
  const location = document.getElementById('hero-location-input')?.value.trim();
  if (query)    sessionStorage.setItem('searchQuery', query);
  if (location) sessionStorage.setItem('searchCity',  location);
  window.location.href = '/page2';
}

// Quick-search chip click
function quickSearch(term) {
  sessionStorage.setItem('searchQuery', term);
  window.location.href = '/page2';
}

// ═══════════════════════════════════════════════
// PAGE: BROWSE JOBS (page2.html)
// ═══════════════════════════════════════════════

let filteredJobs = [...JOBS]; // currently displayed jobs

// Main filter function: reads all filter inputs and re-renders
function filterJobs() {
  const query    = (document.getElementById('search-input')?.value      || '').toLowerCase();
  const category = document.getElementById('filter-category')?.value    || '';
  const type     = document.getElementById('filter-type')?.value        || '';
  const city     = document.getElementById('filter-city')?.value        || '';
  const exp      = document.getElementById('filter-exp')?.value         || '';

  filteredJobs = JOBS.filter(job => {
    const matchQuery    = !query    || job.title.toLowerCase().includes(query) || job.company.toLowerCase().includes(query) || job.skills.some(s => s.toLowerCase().includes(query));
    const matchCategory = !category || job.category === category;
    const matchType     = !type     || job.type === type;
    const matchCity     = !city     || job.location === city;
    const matchExp      = !exp      || job.experience === exp;
    return matchQuery && matchCategory && matchType && matchCity && matchExp;
  });

  renderJobsList();
}

// Sort jobs
function sortJobs(order) {
  if (order === 'salary') {
    filteredJobs.sort((a, b) => b.match - a.match); // use match as salary proxy
  } else if (order === 'match') {
    filteredJobs.sort((a, b) => b.match - a.match);
  } else {
    // newest — keep original order from JOBS array
    filteredJobs.sort((a, b) => a.id - b.id);
  }
  renderJobsList();
}

// Render the filtered job list
function renderJobsList() {
  const list      = document.getElementById('jobs-list');
  const noResults = document.getElementById('no-results');
  const countEl   = document.getElementById('results-count');
  if (!list) return;

  if (filteredJobs.length === 0) {
    list.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    if (countEl)   countEl.textContent = 'No jobs found';
    return;
  }

  if (noResults) noResults.style.display = 'none';
  if (countEl)   countEl.textContent = `${filteredJobs.length} jobs found`;
  list.innerHTML = filteredJobs.map(j => buildJobCard(j)).join('');
}

// Clear all filters
function clearFilters() {
  ['search-input','filter-category','filter-type','filter-city','filter-exp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  filteredJobs = [...JOBS];
  renderJobsList();
}

// ═══════════════════════════════════════════════
// PAGE: SAVED JOBS (page3.html)
// ═══════════════════════════════════════════════

function renderSavedJobs() {
  const grid  = document.getElementById('saved-jobs-grid');
  const empty = document.getElementById('saved-empty');
  if (!grid) return;

  const savedIds = getSaved();
  const savedJobs = JOBS.filter(j => savedIds.includes(j.id));

  if (savedJobs.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  grid.innerHTML = savedJobs.map(j => buildJobCard(j, true)).join('');
}

// ═══════════════════════════════════════════════
// PAGE: MY APPLICATIONS (page4.html)
// ═══════════════════════════════════════════════

function renderApplications() {
  const list  = document.getElementById('applications-list');
  const empty = document.getElementById('apps-empty');
  if (!list) return;

  const applied = getApplied();

  // Update stat counters
  const setCount = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setCount('app-total',     applied.length);
  setCount('app-reviewing', applied.filter(a => a.status === 'Reviewing').length);
  setCount('app-interview', applied.filter(a => a.status === 'Interview').length);
  setCount('app-rejected',  applied.filter(a => a.status === 'Rejected').length);

  if (applied.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  list.innerHTML = applied.map(app => `
    <div class="application-card">
      <div class="app-info">
        <div class="app-title">${app.title}</div>
        <div class="app-company">${app.company}</div>
        <div class="app-date">Applied on ${app.date}</div>
      </div>
      <span class="app-status ${app.status.toLowerCase()}">${app.status}</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════
// PAGE: AI ASSISTANT (page5.html)
// ═══════════════════════════════════════════════

// Simple AI response logic — matches keywords and returns helpful replies
function getAIResponse(msg) {
  const m = msg.toLowerCase();

  // Job matching keywords
  if (m.includes('react') || m.includes('frontend') || m.includes('web developer')) {
    const matches = JOBS.filter(j => j.skills.some(s => s.toLowerCase().includes('react')));
    const titles  = matches.map(j => `• ${j.title} at ${j.company} — ${j.salary}`).join('\n');
    return `Great! I found ${matches.length} React-related jobs for you:\n\n${titles}\n\nWould you like to apply to any of these? 🎯`;
  }
  if (m.includes('python') || m.includes('django')) {
    const matches = JOBS.filter(j => j.skills.some(s => s.toLowerCase().includes('python')));
    return `I found ${matches.length} Python jobs! Top pick: "${matches[0]?.title}" at ${matches[0]?.company} paying ${matches[0]?.salary}. Match score: ${matches[0]?.match}% ✅`;
  }
  if (m.includes('teacher') || m.includes('teaching') || m.includes('education')) {
    return 'Teaching jobs in Pakistan are in high demand right now! I found jobs at Beaconhouse, The City School, and LGS. Average salary: Rs 45K–80K/month. Shall I show you the listings?';
  }
  if (m.includes('civil') || m.includes('engineer')) {
    return 'Civil Engineering roles have a 23% growth rate in Pakistan this year! Check out FWO, NESPAK, and NHA. Experience: 3–5 years preferred. Salary: Rs 90K–130K.';
  }
  if (m.includes('salary') || m.includes('pay') || m.includes('earn')) {
    return 'Here are typical salaries in Pakistan:\n\n• Junior Dev: Rs 60K–90K\n• Mid-level Dev: Rs 100K–160K\n• Senior Dev: Rs 180K–250K+\n• UI/UX Designer: Rs 80K–140K\n• Data Analyst: Rs 70K–120K\n\nYour match score suggests Rs 160K–180K is realistic! 💰';
  }
  if (m.includes('interview') || m.includes('prepare')) {
    return "Great question! Here are top tips:\n\n1. Research the company thoroughly\n2. Practice LeetCode medium problems (for tech roles)\n3. Prepare the STAR method for behavioral questions\n4. Review your projects and be ready to explain decisions\n5. Ask smart questions at the end\n\nYou've got this! 💪";
  }
  if (m.includes('cv') || m.includes('resume')) {
    return 'Your CV score is currently 78%. Key improvements:\n\n✅ Add a professional summary\n✅ Quantify achievements (e.g., "improved speed by 40%")\n✅ List relevant certifications\n✅ Keep it to 1–2 pages\n\nTry the CV Generator to build a polished version! 📄';
  }
  if (m.includes('remote') || m.includes('work from home')) {
    const remoteJobs = JOBS.filter(j => j.type === 'Remote' || j.location === 'Remote');
    return `I found ${remoteJobs.length} remote jobs: ${remoteJobs.map(j => j.title).join(', ')}. Remote roles in Pakistan pay competitively! Shall I show details?`;
  }
  if (m.includes('fresh') || m.includes('no experience') || m.includes('entry level')) {
    const freshJobs = JOBS.filter(j => j.experience === 'Fresh');
    return `Great news! I found ${freshJobs.length} entry-level jobs perfect for freshers: ${freshJobs.map(j => j.title).join(', ')}. Companies love fresh talent! 🌟`;
  }
  if (m.includes('hi') || m.includes('hello') || m.includes('hey')) {
return "Hello! 👋 I'm TalentBot. Tell me about your skills or the kind of job you want, and I'll find the best matches for you right away!";
  }

  // Default
  const random = JOBS[Math.floor(Math.random() * JOBS.length)];
  return `Based on your message, I'd recommend looking at "${random.title}" roles — they're trending in Pakistan right now! Your profile has a strong ${random.match}% match. Want me to narrow down jobs by your specific skills or location? 🤖`;
}

// Add a message bubble to the chat
function addChatMessage(text, role) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const isUser = role === 'user';
  const row = document.createElement('div');
  row.className = 'chat-row' + (isUser ? ' user' : '');

  // Format newlines as <br>
  const formatted = text.replace(/\n/g, '<br>');

  row.innerHTML = `
    <div class="msg-avatar ${isUser ? 'user' : 'ai'}">${isUser ? 'AK' : '🤖'}</div>
    <div class="msg-bubble ${isUser ? 'user' : 'ai'}">${formatted}</div>
  `;

  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

// Send a user chat message
function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;

  addChatMessage(msg, 'user');
  input.value = '';

  // Simulate a short typing delay before AI replies
  setTimeout(() => {
    const reply = getAIResponse(msg);
    addChatMessage(reply, 'ai');
  }, 700);
}

// Fill the chat input from a suggestion chip
function fillChat(text) {
  const input = document.getElementById('chat-input');
  if (input) { input.value = text; input.focus(); }
}

// Clear chat history
function clearChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = `
    <div class="chat-row">
      <div class="msg-avatar ai">🤖</div>
      <div class="msg-bubble ai">👋 Chat cleared! I'm ready to help. What kind of job are you looking for?</div>
    </div>`;
}

// Send message on Enter (Shift+Enter = new line)
function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

// ═══════════════════════════════════════════════
// PAGE: CV BUILDER (page6.html)
// ═══════════════════════════════════════════════

// Read a form field value safely
function cvVal(id) { return (document.getElementById(id)?.value || '').trim(); }

// Update the live CV preview panel from form inputs
function updateCVPreview() {
  const fname = cvVal('cv-fname');
  const lname = cvVal('cv-lname');

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('prev-name',      `${fname} ${lname}`);
  set('prev-job-title', cvVal('cv-title'));
  set('prev-email',     cvVal('cv-email'));
  set('prev-phone',     cvVal('cv-phone'));
  set('prev-location',  cvVal('cv-location'));
  set('prev-summary',   cvVal('cv-summary'));
  set('prev-degree',    `${cvVal('cv-degree')} — ${cvVal('cv-school')} · ${cvVal('cv-edu-year')}`);
  set('prev-exp-title', cvVal('cv-exp-title'));
  set('prev-exp-sub',   `${cvVal('cv-exp-company')} · ${cvVal('cv-exp-dur')}`);
  set('prev-exp-desc',  cvVal('cv-exp-desc'));

  // Skills chips
  const skillsContainer = document.getElementById('prev-skills');
  if (skillsContainer) {
    const skills = cvVal('cv-skills').split(',').map(s => s.trim()).filter(Boolean);
    skillsContainer.innerHTML = skills.map(s => `<span class="cv-skill">${s}</span>`).join('');
  }
}

// ═══════════════════════════════════════════════
// PAGE: PROFILE (page7.html)
// ═══════════════════════════════════════════════

function openEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'flex';
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'none';
}

// Save edited profile fields back to the hero banner
function saveProfile() {
  const name   = document.getElementById('edit-name')?.value.trim();
  const title  = document.getElementById('edit-title-field')?.value.trim();
  const skills = document.getElementById('edit-skills')?.value.trim();

  if (name)  { const el = document.getElementById('prof-name');     if (el) el.textContent = name; }
  if (title) { const el = document.getElementById('prof-subtitle'); if (el) el.textContent = title; }

  // Update skills display
  if (skills) {
    const container = document.getElementById('profile-skills-display');
    if (container) {
      const list = skills.split(',').map(s => s.trim()).filter(Boolean);
      container.innerHTML = list.map(s => `<span class="skill-chip">${s}</span>`).join('');
    }
  }

  // Update avatar initials
  if (name) {
    const parts = name.split(' ');
    const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    const avatar = document.getElementById('prof-avatar');
    if (avatar) avatar.textContent = initials.toUpperCase();
  }

  closeEditModal();
  showToast('Profile updated! ✅', 'success');
}

// ═══════════════════════════════════════════════
// PAGE: EMPLOYER HUB (page8.html)
// ═══════════════════════════════════════════════

// Switch between the employer tab panels
function showTab(tabId) {
  // Hide all panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  // Deactivate all buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  // Activate chosen panel
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');

  // Activate corresponding button
  const btn = document.getElementById('btn-' + tabId);
  if (btn) btn.classList.add('active');
}

// Validate and "post" a new job
function postJob() {
  const title = document.getElementById('pj-title')?.value.trim();
  const loc   = document.getElementById('pj-location')?.value.trim();
  const desc  = document.getElementById('pj-desc')?.value.trim();

  if (!title) { showToast('Please enter a job title', 'error'); return; }
  if (!loc)   { showToast('Please enter a location',  'error'); return; }
  if (!desc)  { showToast('Please add a description', 'error'); return; }

  showToast(`"${title}" posted successfully! 🎉`, 'success');

  // Reset form
  ['pj-title','pj-dept','pj-location','pj-desc','pj-skills','pj-deadline','pj-sal-min','pj-sal-max']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

// ═══════════════════════════════════════════════
// PAGE: CONTACT (page9.html)
// ═══════════════════════════════════════════════

// Toggle an FAQ accordion item
function toggleFaq(el) {
  const answer = el.nextElementSibling;
  const symbol = el.querySelector('span');
  const isOpen = answer.classList.contains('open');

  // Close all open FAQs first
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q span').forEach(s => s.textContent = '+');

  // Open clicked one (unless it was already open)
  if (!isOpen) {
    answer.classList.add('open');
    if (symbol) symbol.textContent = '−';
  }
}

// Submit contact form with basic validation
function submitContact() {
  const name  = document.getElementById('contact-name')?.value.trim();
  const email = document.getElementById('contact-email')?.value.trim();
  const msg   = document.getElementById('contact-message')?.value.trim();

  if (!name)  { showToast('Please enter your name', 'error');  return; }
  if (!email) { showToast('Please enter your email', 'error'); return; }
  if (!msg)   { showToast('Please write a message', 'error');  return; }

  showToast("Message sent! We'll reply within 24 hours. ✅", 'success');

  // Clear form
  ['contact-name','contact-email','contact-message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ═══════════════════════════════════════════════
// PAGE INIT — run the right setup for each page
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path === '/' || path === '/index.html') {
    renderFeaturedJobs();
  }

  if (path === '/page2') {
    // Apply any pre-set search from home page
    const q = sessionStorage.getItem('searchQuery');
    const c = sessionStorage.getItem('searchCity');
    if (q) { const el = document.getElementById('search-input');   if (el) el.value = q; }
    if (c) { const el = document.getElementById('filter-city');    if (el) el.value = c; }
    sessionStorage.removeItem('searchQuery');
    sessionStorage.removeItem('searchCity');
    filterJobs();
  }

  if (path === '/page3') {
    renderSavedJobs();
  }

  if (path === '/page4') {
    renderApplications();
  }

  if (path === '/page6') {
    updateCVPreview(); // initialize the live preview
  }

  if (path === '/page7') {
    updateProfileCounts();
  }

  // Always update profile counts if the elements are on the page
  updateProfileCounts();
});
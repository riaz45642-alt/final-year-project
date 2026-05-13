/* ──────────────────────────────────────────────
   12. AI ASSISTANT — Powered by Google Gemini
   Real AI replacing keyword-based bot
────────────────────────────────────────────── */

// ── State ──
let chatHistory = [];
let isSending   = false;

// ── Gemini config ──
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL   = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';

const SYSTEM_CONTEXT = `You are TalentBot, a friendly AI career assistant for TalentBridge — a Pakistani job portal.

Your role:
- Help users find jobs that match their skills
- Give career advice, CV tips, salary info for Pakistan job market
- Suggest interview preparation strategies
- Discuss trending skills in Pakistan

Pakistan salary context (2024-2025):
- Fresh graduate tech: Rs 60K-100K/month
- Mid-level developer (2-4 yrs): Rs 120K-220K/month
- Senior developer (5+ yrs): Rs 250K-450K/month
- Doctors/specialists: Rs 150K-500K/month
- Teachers: Rs 40K-120K/month
- Civil engineers: Rs 80K-200K/month
- Finance roles: Rs 70K-180K/month
- Remote/freelance (Upwork/Fiverr): USD 500-3000/month

Job categories on TalentBridge: tech, medical, teaching, design, civil, finance, remote.
Keep answers concise and helpful. Use bullet points for lists. If user writes in Urdu or Roman Urdu, reply in same language. Be encouraging and practical.`;

// ── API key helpers ──
function getGeminiKey() {
  return localStorage.getItem('tb_gemini_key') || '';
}
function saveGeminiKey(key) {
  localStorage.setItem('tb_gemini_key', key.trim());
}

// ── Show API key prompt inside chat ──
function showApiKeyPrompt() {
  var list = document.getElementById('chat-messages');
  if (!list) return;

  var old = document.getElementById('api-key-row');
  if (old) old.remove();

  var row = document.createElement('div');
  row.className = 'chat-message-row';
  row.id = 'api-key-row';
  row.innerHTML =
    '<div class="message-avatar ai">🤖</div>' +
    '<div class="message-bubble ai" style="max-width:440px">' +
      '<strong>🔑 Gemini API Key Chahiye</strong><br><br>' +
      'Real AI use karne ke liye apni <strong>Google Gemini API key</strong> enter karein.<br><br>' +
      '<span style="font-size:12px;opacity:.75">Free key: ' +
        '<a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--primary)">aistudio.google.com</a>' +
        ' — bilkul free!' +
      '</span><br><br>' +
      '<input type="password" id="gkey-input" placeholder="AIza..." ' +
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border-radius:8px;' +
        'border:1.5px solid var(--border);background:var(--bg-secondary);' +
        'color:var(--text-primary);font-size:13px;outline:none;margin-bottom:8px" />' +
      '<button id="gkey-save-btn" ' +
        'style="padding:9px 20px;background:var(--primary);color:#fff;border:none;' +
        'border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;width:100%">' +
        'Save & Start Chat' +
      '</button>' +
      '<div id="gkey-error" style="color:#ef4444;font-size:12px;margin-top:6px;display:none">' +
        'Key galat hai — "AIza" se shuru honi chahiye.' +
      '</div>' +
    '</div>';

  list.appendChild(row);
  list.scrollTop = list.scrollHeight;

  // Attach events after DOM insertion (no inline onclick — avoids race condition)
  var input   = document.getElementById('gkey-input');
  var saveBtn = document.getElementById('gkey-save-btn');

  if (input) {
    input.focus();
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); doSaveKey(); }
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', doSaveKey);
  }
}

function doSaveKey() {
  var input = document.getElementById('gkey-input');
  var errEl = document.getElementById('gkey-error');
  if (!input) return;

  var key = input.value.trim();
  if (!key.startsWith('AIza') || key.length < 20) {
    if (errEl) { errEl.textContent = 'Key galat hai — "AIza" se shuru honi chahiye.'; errEl.style.display = 'block'; }
    return;
  }

  saveGeminiKey(key);

  var row = document.getElementById('api-key-row');
  if (row) row.remove();

  appendAIMessage('✅ API key save hogayi! Ab main Gemini AI se connected hoon. Apna sawaal poochein — job search, CV tips, salary info, kuch bhi!', []);
}

// ── Call Gemini REST API ──
async function callGemini(userMessage) {
  var apiKey = getGeminiKey();
  if (!apiKey) {
    showApiKeyPrompt();
    return null;
  }

  // Build contents: seed system context + history + new message
  var contents = [];

  contents.push({ role: 'user',  parts: [{ text: SYSTEM_CONTEXT + '\n\nAcknowledge your role in one line.' }] });
  contents.push({ role: 'model', parts: [{ text: "Got it — I'm TalentBot, TalentBridge's AI career assistant for Pakistan job seekers!" }] });

  for (var i = 0; i < chatHistory.length; i++) {
    contents.push(chatHistory[i]);
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  var payload = {
    contents: contents,
    generationConfig: { temperature: 0.75, maxOutputTokens: 700, topP: 0.9 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ]
  };

  var response;
  try {
    response = await fetch(GEMINI_URL + '?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (netErr) {
    throw new Error('Network error — internet check karein.');
  }

  if (!response.ok) {
    var errMsg = 'HTTP ' + response.status;
    try { var ed = await response.json(); errMsg = (ed && ed.error && ed.error.message) ? ed.error.message : errMsg; } catch(e) {}

    if (response.status === 400 || response.status === 403 || response.status === 401) {
      localStorage.removeItem('tb_gemini_key');
      showApiKeyPrompt();
      var errEl2 = document.getElementById('gkey-error');
      if (errEl2) { errEl2.textContent = 'API key invalid ya expired. Dobara enter karein.'; errEl2.style.display = 'block'; }
      return null;
    }
    throw new Error(errMsg);
  }

  var data;
  try { data = await response.json(); } catch(e) { throw new Error('Gemini se invalid response aaya.'); }

  var aiText = (data && data.candidates && data.candidates[0] &&
    data.candidates[0].content && data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text)
    ? data.candidates[0].content.parts[0].text
    : 'Sorry, response generate nahi hua. Dobara try karein.';

  // Save to history
  chatHistory.push({ role: 'user',  parts: [{ text: userMessage }] });
  chatHistory.push({ role: 'model', parts: [{ text: aiText }] });
  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  return aiText;
}

// ── Job suggestions based on AI reply keywords ──
function extractJobSuggestions(aiText) {
  if (typeof getAllJobs !== 'function') return [];
  var lower   = aiText.toLowerCase();
  var allJobs = getAllJobs();
  var results = [];

  var map = {
    tech:     ['developer','software','react','python','javascript','flutter','devops','cloud','ai','ml','backend','frontend','full stack','mobile','programmer'],
    medical:  ['doctor','medical','healthcare','nurse','hospital','physician','mbbs','specialist'],
    teaching: ['teacher','lecturer','professor','tutor','school','university','education'],
    design:   ['designer','ui','ux','graphic','figma','creative','design'],
    civil:    ['civil','structural','construction','architecture','surveyor'],
    finance:  ['finance','accountant','accounting','banking','cfa','acca','audit']
  };

  var cats = Object.keys(map);
  for (var c = 0; c < cats.length; c++) {
    var cat = cats[c];
    var kws = map[cat];
    var matched = false;
    for (var k = 0; k < kws.length; k++) {
      if (lower.indexOf(kws[k]) !== -1) { matched = true; break; }
    }
    if (matched) {
      var catJobs = allJobs.filter(function(j) { return j.category === cat; }).slice(0, 3);
      results = results.concat(catJobs);
      if (results.length >= 3) break;
    }
  }

  if (lower.indexOf('remote') !== -1 || lower.indexOf('freelance') !== -1) {
    results = results.concat(allJobs.filter(function(j) { return j.remote; }).slice(0, 2));
  }

  var seen = {};
  return results.filter(function(j) {
    if (seen[j.id]) return false;
    seen[j.id] = true;
    return true;
  }).slice(0, 3);
}

// ── Markdown-lite to HTML ──
function formatAIText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/^#{1,3}\s(.+)$/gm, '<strong>$1</strong>')
    .replace(/^[-•]\s(.+)$/gm,  '• $1')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g,     '<br>');
}

// ── MAIN SEND FUNCTION ──
async function sendMsg() {
  if (isSending) return;

  var chatInput   = document.getElementById('chat-input');
  var messageText = chatInput ? chatInput.value.trim() : '';
  if (!messageText) return;

  // No key? show message then prompt
  if (!getGeminiKey()) {
    appendMessage(messageText, 'user');
    if (chatInput) chatInput.value = '';
    showApiKeyPrompt();
    return;
  }

  isSending = true;
  appendMessage(messageText, 'user');
  if (chatInput) chatInput.value = '';

  if (typeof DB !== 'undefined' && typeof DB.addChat === 'function') {
    DB.addChat({ role: 'user', text: messageText, timestamp: Date.now() });
  }

  var typingEl = appendTypingIndicator();

  try {
    var aiText = await callGemini(messageText);
    typingEl.remove();

    if (aiText) {
      var html = formatAIText(aiText);
      var jobs = extractJobSuggestions(aiText);
      appendAIMessage(html, jobs);

      if (typeof DB !== 'undefined' && typeof DB.addChat === 'function') {
        DB.addChat({ role: 'ai', text: html, timestamp: Date.now() });
      }
    }
  } catch (err) {
    typingEl.remove();
    console.error('Gemini error:', err);
    appendAIMessage('⚠️ Error: <em>' + (err.message || 'Unknown error') + '</em><br><br>Internet ya API key check karein phir dobara try karein.', []);
  } finally {
    isSending = false;
  }
}

// ── DOM Helpers ──
function appendMessage(text, role) {
  var list = document.getElementById('chat-messages');
  if (!list) return null;
  var initials = (typeof AppState !== 'undefined' && AppState.currentUser && AppState.currentUser.avatar) ? AppState.currentUser.avatar : '👤';
  var row = document.createElement('div');
  row.className = 'msg-row' + (role === 'user' ? ' user' : '');
  row.innerHTML = (role === 'user')
    ? '<div class="msg-avatar user-av">' + initials + '</div><div class="msg-bubble user">' + text + '</div>'
    : '<div class="msg-avatar ai">🤖</div><div class="msg-bubble ai">' + text + '</div>';
  list.appendChild(row);
  list.scrollTop = list.scrollHeight;
  return row;
}

function appendTypingIndicator() {
  var list = document.getElementById('chat-messages');
  var row  = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = '<div class="msg-avatar ai">🤖</div><div class="ai-typing"><span></span><span></span><span></span></div>';
  list.appendChild(row);
  list.scrollTop = list.scrollHeight;
  return row;
}

function appendAIMessage(text, jobs) {
  var list = document.getElementById('chat-messages');
  var row  = document.createElement('div');
  row.className = 'msg-row';
  var sugHtml = '';
  if (jobs && jobs.length > 0) {
    sugHtml = '<br><br><strong style="font-size:11.5px;opacity:.65;letter-spacing:.5px">MATCHING JOBS</strong>';
    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i];
      sugHtml +=
        '<div class="ai-job-suggestion" onclick="openJobDetail(\'' + job.id + '\')">' +
          '<div>' +
            '<div class="job-sug-title">' + job.title + '</div>' +
            '<div class="job-sug-co">' + job.company + ' · ' + job.location + '</div>' +
          '</div>' +
          '<span class="match-badge">' + (70 + Math.floor(Math.random() * 28)) + '% Match</span>' +
        '</div>';
    }
  }
  row.innerHTML = '<div class="msg-avatar ai">🤖</div><div class="msg-bubble ai">' + text + sugHtml + '</div>';
  list.appendChild(row);
  list.scrollTop = list.scrollHeight;
}

function fillChat(text) {
  var input = document.getElementById('chat-input');
  if (input) { input.value = text.replace(/"/g, ''); input.focus(); }
}

function clearChat() {
  if (typeof DB !== 'undefined' && typeof DB.clearChat === 'function') DB.clearChat();
  chatHistory = [];
  isSending   = false;

  var list = document.getElementById('chat-messages');
  if (!list) return;
  list.innerHTML =
    '<div class="msg-row">' +
      '<div class="msg-avatar ai">🤖</div>' +
      '<div class="msg-bubble ai">' +
        '👋 Hi! Main TalentBot hoon — <strong>Google Gemini</strong> se powered real AI career assistant. ' +
        'Job search, salary info, CV tips, interview prep — kuch bhi poochein!<br><br>' +
        '<em style="font-size:12.5px;color:var(--text-muted)">' +
          'Try: "I am a React developer" ya "Mujhe Lahore mein civil engineering job chahiye"' +
        '</em>' +
      '</div>' +
    '</div>';

  if (typeof toast !== 'undefined') toast('Chat cleared', 'info');
}

function changeApiKey() {
  localStorage.removeItem('tb_gemini_key');
  chatHistory = [];
  showApiKeyPrompt();
}

// ── Attach Enter key to textarea on load ──
(function() {
  function attachEnterKey() {
    var input = document.getElementById('chat-input');
    if (!input) return;
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMsg();
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachEnterKey);
  } else {
    attachEnterKey();
  }
})();
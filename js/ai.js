/* ──────────────────────────────────────────────
   12. AI ASSISTANT
────────────────────────────────────────────── */
const AI_RESPONSE_MAP = {
  default: (msg) => {
    const topJobs = getAllJobs().slice(0, 3);
    return { text: `Great! Based on your message, here are some top matches from our portal:`, suggestions: topJobs };
  },
  keywords: {
    'web developer': ()  => ({ text: `Web development is in high demand! Here are the best matches for you:`,           suggestions: getAllJobs().filter(j => j.category === 'tech').slice(0, 3) }),
    'react':         ()  => ({ text: `Excellent React skills! These roles are a great match:`,                          suggestions: getAllJobs().filter(j => (j.tags || []).some(t => t.toLowerCase().includes('react'))).slice(0, 3) }),
    'python':        ()  => ({ text: `Python is one of the hottest skills right now! Check these out:`,                 suggestions: getAllJobs().filter(j => (j.tags || []).some(t => t.toLowerCase().includes('python'))).slice(0, 3) }),
    'doctor':        ()  => ({ text: `Healthcare roles require specialized skills. Here are matching positions:`,       suggestions: getAllJobs().filter(j => j.category === 'medical') }),
    'teacher':       ()  => ({ text: `Teaching opportunities in top institutions — here are the best:`,                 suggestions: getAllJobs().filter(j => j.category === 'teaching') }),
    'design':        ()  => ({ text: `Creative roles for designers — perfect matches for your skills:`,                 suggestions: getAllJobs().filter(j => j.category === 'design') }),
    'civil':         ()  => ({ text: `Civil engineering roles are available across Pakistan:`,                          suggestions: getAllJobs().filter(j => j.category === 'civil') }),
    'finance':       ()  => ({ text: `Finance roles with excellent packages — here's what matched:`,                    suggestions: getAllJobs().filter(j => j.category === 'finance') }),
    'cv':            ()  => ({ text: `Sure! Here are 3 quick tips to boost your CV score:<br><br>✅ <strong>Add a portfolio/GitHub link</strong> — employers love seeing real work<br>✅ <strong>Quantify achievements</strong> — e.g., "Increased performance by 40%"<br>✅ <strong>Certifications</strong> — AWS, React, or Google certs stand out<br><br>Would you like me to auto-generate a professional summary for your CV?`, suggestions: [] }),
    'salary':        ()  => ({ text: `Based on your skills, the average market salary in Pakistan for tech roles ranges from <strong>Rs 120K–250K/month</strong>. Senior developers can earn up to <strong>Rs 400K+</strong>. Want me to filter by salary range?`, suggestions: [] }),
    'remote':        ()  => ({ text: `Here are remote-friendly jobs in our portal that you can work from anywhere:`,    suggestions: getAllJobs().filter(j => j.remote) }),
    'interview':     ()  => ({ text: `🎯 Interview Tips:<br><br>1. Research the company thoroughly<br>2. Prepare STAR method answers<br>3. Have 3 questions ready to ask<br>4. Practice coding challenges on LeetCode<br>5. Dress professionally even for video calls`, suggestions: [] }),
  }
};

function getAIResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  for (const [keyword, responseFn] of Object.entries(AI_RESPONSE_MAP.keywords)) {
    if (lowerMessage.includes(keyword)) return responseFn(userMessage);
  }
  return AI_RESPONSE_MAP.default(userMessage);
}

function sendMsg() {
  const chatInput = document.getElementById('chat-input');
  const messageText = (chatInput?.value || '').trim();
  if (!messageText) return;

  appendMessage(messageText, 'user');
  chatInput.value = '';
  DB.addChat({ role: 'user', text: messageText, timestamp: Date.now() });

  const typingIndicator = appendTypingIndicator();
  setTimeout(() => {
    typingIndicator.remove();
    const aiResponse = getAIResponse(messageText);
    appendAIMessage(aiResponse.text, aiResponse.suggestions);
    DB.addChat({ role: 'ai', text: aiResponse.text, timestamp: Date.now() });
  }, 900 + Math.random() * 600);
}

function appendMessage(text, role) {
  const messagesList = document.getElementById('chat-messages');
  if (!messagesList) return;
  const userInitials = AppState.currentUser?.avatar || '👤';
  const messageRow   = document.createElement('div');
  messageRow.className = `msg-row ${role === 'user' ? 'user' : ''}`;
  messageRow.innerHTML = role === 'user'
    ? `<div class="msg-avatar user-av">${userInitials}</div><div class="msg-bubble user">${text}</div>`
    : `<div class="msg-avatar ai">🤖</div><div class="msg-bubble ai">${text}</div>`;
  messagesList.appendChild(messageRow);
  messagesList.scrollTop = messagesList.scrollHeight;
  return messageRow;
}

function appendTypingIndicator() {
  const messagesList = document.getElementById('chat-messages');
  const typingRow    = document.createElement('div');
  typingRow.className = 'msg-row';
  typingRow.innerHTML = `<div class="msg-avatar ai">🤖</div><div class="ai-typing"><span></span><span></span><span></span></div>`;
  messagesList.appendChild(typingRow);
  messagesList.scrollTop = messagesList.scrollHeight;
  return typingRow;
}

function appendAIMessage(text, jobSuggestions) {
  const messagesList = document.getElementById('chat-messages');
  const messageRow   = document.createElement('div');
  messageRow.className = 'msg-row';
  const suggestionsHTML = jobSuggestions.map(job => `
    <div class="ai-job-suggestion" onclick="openJobDetail('${job.id}')">
      <div>
        <div class="job-sug-title">${job.title}</div>
        <div class="job-sug-co">${job.company} · ${job.location}</div>
      </div>
      <span class="match-badge">${70 + Math.floor(Math.random() * 28)}% Match</span>
    </div>`).join('');
  messageRow.innerHTML = `<div class="msg-avatar ai">🤖</div><div class="msg-bubble ai">${text}${suggestionsHTML}</div>`;
  messagesList.appendChild(messageRow);
  messagesList.scrollTop = messagesList.scrollHeight;
}

function fillChat(text) {
  const chatInput = document.getElementById('chat-input');
  if (chatInput) { chatInput.value = text.replace(/"/g, ''); chatInput.focus(); }
}

function clearChat() {
  DB.clearChat();
  const messagesList = document.getElementById('chat-messages');
  if (!messagesList) return;
  messagesList.innerHTML = `
  <div class="msg-row">
    <div class="msg-avatar ai">🤖</div>
    <div class="msg-bubble ai">
      👋 Hi! I'm TalentBot. Tell me about your skills or what kind of job you're looking for, and I'll find the best matches from our portal.<br><br>
      <em style="font-size:12.5px;color:var(--text-muted)">Try: "I am a web developer with React experience"</em>
    </div>
  </div>`;
  toast('Chat cleared', 'info');
}

const DB = {
  _get(key) {
    try { 
        return JSON.parse(localStorage.getItem('tb_' + key)) || null;
     }
    catch { 
        return null; 
    }
  },
  _set(key, val) { 
    localStorage.setItem('tb_' + key, JSON.stringify(val)); 
},

  // Users table
  getUsers() { 
    return this._get('users') || []; 
},
  saveUsers(users) { 
    this._set('users', users); 
},
  addUser(user) { 
    const allUsers = this.getUsers(); allUsers.push(user); this.saveUsers(allUsers); 
},
  getUserByEmail(email) { 
    return this.getUsers().find(u => u.email === email) || null; 
},

  // Session
  getSession() {
     return this._get('session'); 
    },
  setSession(user) { 
    this._set('session', user); 
},
  clearSession() { 
    localStorage.removeItem('tb_session'); 
},

  // Saved jobs
  getSaved() { 
    return this._get('saved') || []; 
},
  toggleSave(jobId) {
    let savedList = this.getSaved();
    if (savedList.includes(jobId)) savedList = savedList.filter(id => id !== jobId);
    else savedList.push(jobId);
    this._set('saved', savedList);
    return savedList.includes(jobId);
  },
  isSaved(jobId) { 
    return this.getSaved().includes(jobId); 
},

  // Applications
  getApps() { 
    return this._get('apps') || []; 
},
  addApp(app) { 
    const allApps = this.getApps(); allApps.push(app); this._set('apps', allApps); 
},
  hasApplied(jobId) { 
    return this.getApps().some(app => app.jobId === jobId); 
},

  // Posted jobs (employer)
  getPostedJobs() { 
    return this._get('posted') || []; 
},
  addPostedJob(job) { 
    const postedList = this.getPostedJobs(); postedList.push(job); this._set('posted', postedList); 
},

  // Chat history
  getChat() { 
    return this._get('chat') || []; 
},
  addChat(message) { 
    const chatLog = this.getChat(); chatLog.push(message); this._set('chat', chatLog); 
},
  clearChat() { 
    this._set('chat', []); 
},
};

(function seedDemoAccounts() {
  if (!DB.getUserByEmail('demo@employer.com')) {
    DB.addUser({ 
        id: 'u_demo_emp', 
        name: 'TechNova HR', 
        email: 'demo@employer.com', 
        password: 'demo123', 
        role: 'employer', 
        avatar: 'TH', 
        joinedAt: Date.now() 
    });
  }
  if (!DB.getUserByEmail('ahmed@talentbridge.com')) {
    DB.addUser({ 
        id: 'u_demo_seeker', 
        name: 'Ahmed Khan', 
        email: 'ahmed@talentbridge.com', 
        password: 'ahmed123', 
        role: 'seeker', 
        avatar: 'AK', 
        joinedAt: Date.now() 
    });
  }
})();

const STATIC_JOBS = [];

function getAllJobs() {
  const postedJobs = DB.getPostedJobs().map(job => ({ ...job, id: job.id || 'pj_' + job.postedAt, posted: 'Just posted' }));
  return [...postedJobs, ...STATIC_JOBS];
}

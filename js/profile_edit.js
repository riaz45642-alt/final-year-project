/* ──────────────────────────────────────────────
   14. PROFILE EDIT
────────────────────────────────────────────── */
function openEditProfile() {
  if (!AppState.currentUser) { toast('Please sign in first', 'warning'); openAuth(); return; }
  const currentUser = AppState.currentUser;
  document.getElementById('edit-name').value  = currentUser.name  || '';
  document.getElementById('edit-email').value = currentUser.email || '';
  document.getElementById('profile-edit-modal').classList.add('open');
}
function closeEditProfile() { document.getElementById('profile-edit-modal').classList.remove('open'); }

function saveProfile() {
  const newName  = document.getElementById('edit-name').value.trim();
  const newEmail = document.getElementById('edit-email').value.trim();
  if (!newName || !newEmail) { toast('Name and email are required', 'error'); return; }

  const saveBtn = document.getElementById('save-profile-btn');
  saveBtn.textContent = 'Saving...'; saveBtn.disabled = true;
  setTimeout(() => {
    AppState.currentUser.name  = newName;
    AppState.currentUser.email = newEmail;
    AppState.currentUser.avatar = (newName.split(' ').map(word => word[0]).join('').slice(0, 2)).toUpperCase();

    const updatedUsers = DB.getUsers().map(u => u.id === AppState.currentUser.id ? { ...u, name: newName, email: newEmail } : u);
    DB.saveUsers(updatedUsers);
    DB.setSession(AppState.currentUser);
    updateAuthUI();
    closeEditProfile();
    saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
    toast('Profile updated successfully!', 'success');
  }, 700);
}

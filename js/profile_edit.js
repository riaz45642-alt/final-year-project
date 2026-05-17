/* ──────────────────────────────────────────────
   14. PROFILE EDIT
   - openEditProfile / closeEditProfile: legacy modal (used from other pages)
   - saveProfile: legacy save (basic name/email only)
   - All skill & experience logic lives in Profile_Edit.html
     but globals are exposed here for reuse.
────────────────────────────────────────────── */

function openEditProfile() {
  if (!AppState.currentUser) { toast('Please sign in first', 'warning'); openAuth(); return; }
  const currentUser = AppState.currentUser;
  const nameEl  = document.getElementById('edit-name');
  const emailEl = document.getElementById('edit-email');
  if (nameEl)  nameEl.value  = currentUser.name  || '';
  if (emailEl) emailEl.value = currentUser.email || '';
  const modal = document.getElementById('profile-edit-modal');
  if (modal) modal.classList.add('open');
}

function closeEditProfile() {
  const modal = document.getElementById('profile-edit-modal');
  if (modal) modal.classList.remove('open');
}

function saveProfile() {
  const newName  = document.getElementById('edit-name')?.value.trim();
  const newEmail = document.getElementById('edit-email')?.value.trim();
  if (!newName || !newEmail) { toast('Name and email are required', 'error'); return; }

  const saveBtn = document.getElementById('save-profile-btn');
  if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }

  setTimeout(() => {
    AppState.currentUser.name   = newName;
    AppState.currentUser.email  = newEmail;
    AppState.currentUser.avatar = newName.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

    DB.setSession(AppState.currentUser);
    if (typeof updateAuthUI === 'function') updateAuthUI();
    closeEditProfile();
    if (saveBtn) { saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false; }
    toast('Profile updated successfully!', 'success');
  }, 700);
}

/* ── Expose globals ── */
window.openEditProfile  = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.saveProfile      = saveProfile;
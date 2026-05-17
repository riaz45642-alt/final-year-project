/* ──────────────────────────────────────────────
   PROFILE EDIT — profile_edit.js
   TiDB Edition: profile data saved to TiDB via
   /api/users endpoint. No localStorage for data.
────────────────────────────────────────────── */

function openEditProfile() {
  if (!AppState.currentUser) { toast("Please sign in first","warning"); openAuth(); return; }
  var u = AppState.currentUser;
  var nameEl  = document.getElementById("edit-name");
  var emailEl = document.getElementById("edit-email");
  if (nameEl)  nameEl.value  = u.name  || "";
  if (emailEl) emailEl.value = u.email || "";
  var modal = document.getElementById("profile-edit-modal");
  if (modal) modal.classList.add("open");
}

function closeEditProfile() {
  var modal = document.getElementById("profile-edit-modal");
  if (modal) modal.classList.remove("open");
}

async function saveProfile() {
  var newName  = document.getElementById("edit-name")  ? document.getElementById("edit-name").value.trim()  : "";
  var newEmail = document.getElementById("edit-email") ? document.getElementById("edit-email").value.trim() : "";
  if (!newName || !newEmail) { toast("Name and email are required","error"); return; }

  var saveBtn = document.getElementById("save-profile-btn");
  if (saveBtn) { saveBtn.textContent = "Saving..."; saveBtn.disabled = true; }

  // Update local session cache first (Firebase UID + updated display name)
  // 🔥 Firebase: update the cached session so the nav updates immediately
  AppState.currentUser.name  = newName;
  AppState.currentUser.email = newEmail;
  AppState.currentUser.avatar = newName.split(" ").map(function(w){ return w[0]||""; }).join("").slice(0,2).toUpperCase();
  DB.setSession(AppState.currentUser);

  // 🔧 TiDB: POST /api/users  → upsert profile row in TiDB users table
  await DB.saveProfile(AppState.currentUser);

  if (typeof updateAuthUI === "function") updateAuthUI();
  closeEditProfile();
  if (saveBtn) { saveBtn.textContent = "Save Changes"; saveBtn.disabled = false; }
  toast("Profile updated successfully!","success");
}

window.openEditProfile  = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.saveProfile      = saveProfile;

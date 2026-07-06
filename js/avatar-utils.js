// avatar-utils.js
// Shared avatar rendering helpers with graceful fallback to initials.

function blEscapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function blEscapeAttr(value) {
  return String(value == null ? "" : value).replace(/"/g, "&quot;");
}

function blGetAvatarUrl(profile) {
  if (!profile) return "";
  return profile.avatar_url || profile.avatarurl || "";
}

function blGetInitials(name) {
  const source = (name || "U").trim();
  if (!source) return "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function renderAvatar(profile, sizeClass) {
  const username = profile && profile.username ? profile.username : "Unknown";
  const initials = blGetInitials(username);
  const avatarUrl = blGetAvatarUrl(profile);
  const cls = "bl-avatar " + (sizeClass || "bl-avatar-sm");

  if (avatarUrl) {
    return '<img class="' + cls + '" src="' + blEscapeAttr(avatarUrl) + '" alt="' + blEscapeAttr(username) + '" />';
  }

  return '<span class="' + cls + ' bl-avatar-fallback">' + blEscapeHtml(initials) + "</span>";
}

document.addEventListener("DOMContentLoaded", initGuildsApplyPage);

async function initGuildsApplyPage() {
  if (typeof renderCategoryPosts === "function") {
    renderCategoryPosts("guilds");
  }

  const form = document.getElementById("guildApplyForm");
  if (!form) return;

  form.addEventListener("submit", handleGuildApplicationSubmit);
}

async function handleGuildApplicationSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  const err = document.getElementById("guildApplyError");
  const ok = document.getElementById("guildApplySuccess");
  const submitBtn = document.getElementById("guildApplySubmit");

  err.style.display = "none";
  ok.style.display = "none";

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData || !sessionData.session) {
    err.textContent = "Please log in before submitting a guild application.";
    err.style.display = "block";
    return;
  }

  const authorId = sessionData.session.user.id;

  const guildName = getInputValue("guildName");
  const founder = getInputValue("guildFounder");
  const members = parseInt(getInputValue("guildMemberCount"), 10);
  const website = getInputValue("guildWebsite");
  const discordInvite = getInputValue("guildDiscordInvite");
  const motivation = getInputValue("guildMotivation");
  const description = getInputValue("guildDescription");

  if (!guildName || !founder || !motivation || !description || !discordInvite || Number.isNaN(members)) {
    err.textContent = "Please complete all required fields.";
    err.style.display = "block";
    return;
  }

  if (members < 20) {
    err.textContent = "Guild applications require at least 20 members.";
    err.style.display = "block";
    return;
  }

  if (!isValidUrl(discordInvite) || (website && !isValidUrl(website))) {
    err.textContent = "Please provide a valid Discord invite URL (and website URL if used).";
    err.style.display = "block";
    return;
  }

  submitBtn.disabled = true;

  const title = guildName + " - Guild Recruitment";
  const postHtml = buildGuildPostHtml({
    guildName,
    founder,
    members,
    website,
    discordInvite,
    motivation,
    description,
  });

  const payload = {
    author_id: authorId,
    title,
    content: postHtml,
    status: "pending",
    post_type: "discovery",
    category: "guilds",
    guide_subcategory: null,
    is_discovery: true,
  };

  const { error } = await supabase.from("posts").insert(payload);

  submitBtn.disabled = false;

  if (error) {
    err.textContent = "Failed to submit guild application: " + error.message;
    err.style.display = "block";
    return;
  }

  if (form && typeof form.reset === "function") {
    form.reset();
  }
  ok.textContent = "Guild application submitted. After admin approval, it will automatically appear in the guild listings.";
  ok.style.display = "block";
}

function buildGuildPostHtml(data) {
  const websiteBlock = data.website
    ? '<tr><td><strong>Website</strong></td><td><a href="' + escapeAttr(data.website) + '" target="_blank" rel="noopener">' + escapeHtml(data.website) + "</a></td></tr>"
    : "";

  return '' +
    '<section style="padding:18px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;background:linear-gradient(135deg,rgba(255,140,0,0.08),rgba(255,255,255,0.02));">' +
      '<h2 style="margin:0 0 8px;font-family:Cinzel,serif;">' + escapeHtml(data.guildName) + '</h2>' +
      '<p style="margin:0;color:#bdbdca;">A community guild listing approved on BoundLore.</p>' +
    '</section>' +
    '<section style="margin-top:14px;">' +
      '<h3 style="font-family:Cinzel,serif;">Guild Overview</h3>' +
      '<p>' + escapeHtml(data.description) + '</p>' +
    '</section>' +
    '<section style="margin-top:14px;">' +
      '<h3 style="font-family:Cinzel,serif;">Motivation</h3>' +
      '<p>' + escapeHtml(data.motivation) + '</p>' +
    '</section>' +
    '<section style="margin-top:14px;">' +
      '<h3 style="font-family:Cinzel,serif;">Guild Data</h3>' +
      '<table style="width:100%;border-collapse:collapse;">' +
        '<tr><td style="padding:8px 0;"><strong>Founder</strong></td><td>' + escapeHtml(data.founder) + '</td></tr>' +
        '<tr><td style="padding:8px 0;"><strong>Members</strong></td><td>' + escapeHtml(String(data.members)) + '</td></tr>' +
        '<tr><td style="padding:8px 0;"><strong>Discord Invite</strong></td><td><a href="' + escapeAttr(data.discordInvite) + '" target="_blank" rel="noopener">Join Guild</a></td></tr>' +
        websiteBlock +
      '</table>' +
    '</section>';
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function escapeAttr(value) {
  return String(value == null ? "" : value).replace(/"/g, "&quot;");
}

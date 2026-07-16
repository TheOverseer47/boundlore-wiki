document.addEventListener("DOMContentLoaded", initGuildsApplyPage);
let guildSubmitInFlight = false;

function patchModeUserMessageGA(err) {
  if (typeof WikiPatchMode !== "undefined" && WikiPatchMode && typeof WikiPatchMode.getUserMessage === "function") {
    return WikiPatchMode.getUserMessage(err);
  }
  return "This action cannot be used right now for safety reasons.";
}

async function enforcePatchModeBeforeWriteGA(errorEl) {
  try {
    if (typeof WikiPatchMode === "undefined" || typeof WikiPatchMode.assertCanSubmit !== "function") {
      var missing = new Error(patchModeUserMessageGA({ code: "PATCH_MODE_UNAVAILABLE" }));
      missing.code = "PATCH_MODE_UNAVAILABLE";
      throw missing;
    }
    await WikiPatchMode.assertCanSubmit();
    return true;
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = patchModeUserMessageGA(err);
      errorEl.style.display = "block";
    }
    return false;
  }
}

async function initGuildsApplyPage() {
  if (typeof renderCategoryPosts === "function") {
    renderCategoryPosts("guilds");
  }

  const form = document.getElementById("guildApplyForm");
  if (!form) return;
  if (typeof WikiPatchMode !== "undefined" && WikiPatchMode.bindForm) {
    WikiPatchMode.bindForm(form);
  } else {
    const submitBtn = document.getElementById("guildApplySubmit");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute("aria-disabled", "true");
    }
  }

  form.addEventListener("submit", handleGuildApplicationSubmit);
}

async function handleGuildApplicationSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  if (guildSubmitInFlight) {
    return;
  }

  const err = document.getElementById("guildApplyError");
  const ok = document.getElementById("guildApplySuccess");
  const submitBtn = document.getElementById("guildApplySubmit");

  err.style.display = "none";
  ok.style.display = "none";

  if (!(await enforcePatchModeBeforeWriteGA(err))) return;

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
  const discordServerId = getInputValue("guildDiscordServerId");
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

  if (discordServerId && !/^\d{10,30}$/.test(discordServerId)) {
    err.textContent = "Discord Server ID must be numeric (10-30 digits).";
    err.style.display = "block";
    return;
  }

  guildSubmitInFlight = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  if (!(await enforcePatchModeBeforeWriteGA(err))) {
    guildSubmitInFlight = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Guild Application";
    return;
  }

  const title = guildName + " - Guild Recruitment";
  const postHtml = buildGuildPostHtml({
    guildName,
    founder,
    members,
    website,
    discordInvite,
    discordServerId,
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

  guildSubmitInFlight = false;
  submitBtn.disabled = false;
  submitBtn.textContent = "Submit Guild Application";

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
  const discordWidget = data.discordServerId
    ? '<div style="margin-top:12px;border:1px solid rgba(88,101,242,0.35);border-radius:10px;overflow:hidden;">' +
        '<iframe src="https://discord.com/widget?id=' + escapeAttr(data.discordServerId) + '&theme=dark" width="100%" height="360" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>' +
      '</div>'
    : '<p style="margin-top:10px;color:#bfc7ff;font-size:0.92rem;">No live widget configured. Join using the invite link below.</p>';

  const websiteBlock = data.website
    ? '<tr><td><strong>Website</strong></td><td><a href="' + escapeAttr(data.website) + '" target="_blank" rel="noopener">' + escapeHtml(data.website) + "</a></td></tr>"
    : "";

  return '' +
    '<section style="padding:20px;border:1px solid rgba(88,101,242,0.45);border-radius:12px;background:linear-gradient(145deg,rgba(88,101,242,0.2),rgba(17,17,24,0.88));">' +
      '<h2 style="margin:0 0 8px;font-family:Cinzel,serif;">' + escapeHtml(data.guildName) + '</h2>' +
      '<p style="margin:0;color:#bfc7ff;">Discord-first guild listing approved on BoundLore.</p>' +
      '<p style="margin:14px 0 0;"><a href="' + escapeAttr(data.discordInvite) + '" target="_blank" rel="noopener" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#5865f2;color:#fff;text-decoration:none;font-weight:700;">Join Discord Server</a></p>' +
    '</section>' +
    '<section style="margin-top:14px;">' +
      '<h3 style="font-family:Cinzel,serif;margin-bottom:6px;">Discord Hub</h3>' +
      '<p style="color:#b8bfdf;">Primary coordination for this guild happens on Discord.</p>' +
      discordWidget +
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
        '<tr><td style="padding:8px 0;"><strong>Discord Invite</strong></td><td><a href="' + escapeAttr(data.discordInvite) + '" target="_blank" rel="noopener">Open Invite</a></td></tr>' +
        (data.discordServerId ? '<tr><td style="padding:8px 0;"><strong>Discord Server ID</strong></td><td>' + escapeHtml(data.discordServerId) + '</td></tr>' : '') +
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

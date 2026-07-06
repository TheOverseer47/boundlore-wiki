// auth-nav.js
// Dynamically updates the "nav-right" area of the navbar based on login/role state.
// Include this AFTER supabase-config.js on every page.
// Requires: a <span id="authArea"></span> element inside .nav-right in the navbar.

async function renderAuthNav() {
  await ensureNotificationsScript();
  const authArea = document.getElementById('authArea');
  if (!authArea) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (session) {
    let { data: banCheck, error: banError } = await supabase
      .from('profiles')
      .select('is_banned, timeout_until')
      .eq('id', session.user.id)
      .single();

    if (banError) {
      const fallback = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', session.user.id)
        .single();
      banCheck = fallback.data || null;
      banError = fallback.error || null;
    }

    if (banError) {
      console.error('Ban check failed:', banError);
    }

    if (banCheck?.is_banned) {
      await supabase.auth.signOut();
      alert('Dein Account wurde gesperrt. Bitte kontaktiere den Support.');
      window.location.href = '/wiki/login/';
      return;
    }

    if (banCheck && banCheck.timeout_until) {
      const timeoutTs = new Date(banCheck.timeout_until).getTime();
      if (!isNaN(timeoutTs) && timeoutTs > Date.now()) {
        await supabase.auth.signOut();
        alert('Dein Account hat aktuell einen Timeout bis ' + new Date(timeoutTs).toLocaleString() + '.');
        window.location.href = '/wiki/login/';
        return;
      }
    }
  }

  if (!session) {
    authArea.innerHTML = '<a href="/wiki/login/" class="btn-contribute">Login</a>';
    return;
  }

  const { data: profile } = await supabase
    .from('profiles').select('username, role').eq('id', session.user.id).single();

  const username = profile ? profile.username : 'Account';
  const isAdmin = profile && profile.role === 'admin';

  const adminTaskCount = isAdmin ? await getPendingAdminTasks() : 0;
  let notifCount = 0;
  if (window.BLNotify && typeof window.BLNotify.fetchUnreadCount === 'function') {
    notifCount = await window.BLNotify.fetchUnreadCount(session.user.id);
  }
  const totalBellCount = (notifCount || 0) + (adminTaskCount || 0);

  let html =
    '<div class="account-menu" style="display:inline-flex;align-items:center;gap:8px;">' +
    '<button class="btn-contribute" id="notifBellBtn" title="Notifications" style="padding:7px 11px;line-height:1;position:relative;">&#128276;' +
      (totalBellCount > 0 ? ('<span style="position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;background:#e05555;border-radius:999px;font-size:0.65rem;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;">' + totalBellCount + '</span>') : '') +
    '</button>' +
    '<div class="account-dropdown" id="notifDropdown" style="min-width:320px;right:0;left:auto;">' +
      '<div style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;">' +
        '<strong style="font-size:0.9rem;">Notifications</strong>' +
        '<button id="markAllReadBtn" class="link-btn" style="font-size:0.75rem;">Mark all read</button>' +
      '</div>' +
      '<div id="notifList" style="max-height:300px;overflow:auto;"></div>' +
    '</div>' +
    '<button class="btn-contribute" id="accountMenuBtn">' + username + ' ▾</button>' +
    '<div class="account-dropdown" id="accountDropdown">' +
    '<a href="/wiki/account/">My Account</a>';

  if (isAdmin) {
    html += '<a href="/wiki/admin/">Admin Dashboard</a>';
  }

  html += '<a href="#" id="logoutBtn">Log Out</a></div></div>';

  authArea.innerHTML = html;

  document.getElementById('accountMenuBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('accountDropdown').classList.toggle('open');
  });

  const bellBtn = document.getElementById('notifBellBtn');
  if (bellBtn) {
    bellBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const dd = document.getElementById('notifDropdown');
      if (dd) dd.classList.toggle('open');
    });
  }

  const markAllReadBtn = document.getElementById('markAllReadBtn');
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async function(e) {
      e.stopPropagation();
      if (window.BLNotify && typeof window.BLNotify.markAllRead === 'function') {
        await window.BLNotify.markAllRead(session.user.id);
      }
      await renderAuthNav();
    });
  }

  await renderNotificationDropdown(session.user.id, isAdmin, adminTaskCount);

  document.addEventListener('click', function() {
    const dd = document.getElementById('accountDropdown');
    if (dd) dd.classList.remove('open');
    const nd = document.getElementById('notifDropdown');
    if (nd) nd.classList.remove('open');
  });

  document.getElementById('logoutBtn').addEventListener('click', async function(e) {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/';
  });
}

async function getPendingAdminTasks() {
  const { count: pendingPosts } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: reports } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true });

  return (pendingPosts || 0) + (reports || 0);
}

async function renderNotificationDropdown(userId, isAdmin, adminTaskCount) {
  const listEl = document.getElementById('notifList');
  if (!listEl) return;

  const rows = [];
  if (isAdmin && adminTaskCount > 0) {
    rows.push({
      title: 'Admin tasks pending',
      message: 'There are ' + adminTaskCount + ' pending moderation tasks.',
      target_url: '/wiki/admin/',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  if (window.BLNotify && typeof window.BLNotify.fetchLatest === 'function') {
    const dbRows = await window.BLNotify.fetchLatest(userId, 8);
    dbRows.forEach(function(item) { rows.push(item); });
  }

  if (rows.length === 0) {
    listEl.innerHTML = '<p style="padding:12px;color:var(--text-muted);font-size:0.85rem;">No new notifications.</p>';
    return;
  }

  listEl.innerHTML = rows.map(function(item) {
    const time = item.created_at ? new Date(item.created_at).toLocaleString() : '';
    const style = item.is_read ? 'opacity:0.75;' : '';
    const title = navEscape(item.title || 'Notification');
    const msg = navEscape(item.message || '');
    const href = item.target_url || '#';
    return '<a href="' + href + '" style="display:block;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);text-decoration:none;color:inherit;' + style + '">' +
      '<p style="margin:0 0 4px;font-size:0.86rem;font-weight:600;">' + title + '</p>' +
      '<p style="margin:0 0 4px;font-size:0.8rem;color:var(--text-muted);">' + msg + '</p>' +
      '<p style="margin:0;font-size:0.72rem;color:var(--text-muted);">' + navEscape(time) + '</p>' +
      '</a>';
  }).join('');
}

function navEscape(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

async function ensureNotificationsScript() {
  if (window.BLNotify) return;
  if (document.getElementById('bl-notifications-script')) return;

  await new Promise(function(resolve) {
    const script = document.createElement('script');
    script.id = 'bl-notifications-script';
    script.src = '/js/notifications.js';
    script.onload = function() { resolve(); };
    script.onerror = function() { resolve(); };
    document.head.appendChild(script);
  });
}

renderAuthNav();

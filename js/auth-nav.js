// auth-nav.js
// Dynamically updates the "nav-right" area of the navbar based on login/role state.
// Include this AFTER supabase-config.js on every page.
// Requires: a <span id="authArea"></span> element inside .nav-right in the navbar.

async function renderAuthNav() {
  const authArea = document.getElementById('authArea');
  if (!authArea) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (session) {
    const { data: banCheck, error: banError } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', session.user.id)
      .single();

    if (banError) {
      console.error('Ban check failed:', banError);
    }

    if (banCheck?.is_banned) {
      await supabase.auth.signOut();
      alert('Dein Account wurde gesperrt. Bitte kontaktiere den Support.');
      window.location.href = '/wiki/login/';
      return;
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

  let html = '<div class="account-menu">' +
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

  document.addEventListener('click', function() {
    const dd = document.getElementById('accountDropdown');
    if (dd) dd.classList.remove('open');
  });

  document.getElementById('logoutBtn').addEventListener('click', async function(e) {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/';
  });
}

renderAuthNav();

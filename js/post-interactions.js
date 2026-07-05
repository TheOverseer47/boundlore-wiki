// post-interactions.js
// Shared widget for comments, ratings (fire/thumbsdown), and reporting on a post detail page.
// Usage: include this script on any post page after supabase-config.js, then call:
//   initPostInteractions('POST_ID_HERE');

let piCurrentUser = null;
let piPostId = null;

async function initPostInteractions(postId) {
  piPostId = postId;

  const { data: sessionData } = await supabase.auth.getSession();
  piCurrentUser = sessionData.session ? sessionData.session.user : null;

  await loadRatings();
  await loadComments();
  setupRatingButtons();
  setupCommentForm();
  setupReportButton();
}

async function loadRatings() {
  const { count: fireCount } = await supabase
    .from('ratings').select('id', { count: 'exact', head: true })
    .eq('post_id', piPostId).eq('value', 'fire');
  const { count: downCount } = await supabase
    .from('ratings').select('id', { count: 'exact', head: true })
    .eq('post_id', piPostId).eq('value', 'down');

  document.getElementById('fireCount').textContent = fireCount || 0;
  document.getElementById('downCount').textContent = downCount || 0;

  if (piCurrentUser) {
    const { data: myRating } = await supabase
      .from('ratings').select('value').eq('post_id', piPostId).eq('user_id', piCurrentUser.id).maybeSingle();
    if (myRating) {
      document.getElementById('btn-' + myRating.value).classList.add('active-rating');
    }
  }
}

function setupRatingButtons() {
  document.getElementById('btn-fire').addEventListener('click', function() { setRating('fire'); });
  document.getElementById('btn-down').addEventListener('click', function() { setRating('down'); });
}

async function setRating(value) {
  if (!piCurrentUser) {
    alert('Please log in to rate this post.');
    window.location.href = '../../login/';
    return;
  }

  const { data: existing } = await supabase
    .from('ratings').select('id, value').eq('post_id', piPostId).eq('user_id', piCurrentUser.id).maybeSingle();

  if (existing && existing.value === value) {
    await supabase.from('ratings').delete().eq('id', existing.id);
  } else if (existing) {
    await supabase.from('ratings').update({ value: value }).eq('id', existing.id);
  } else {
    await supabase.from('ratings').insert({ post_id: piPostId, user_id: piCurrentUser.id, value: value });
  }

  document.getElementById('btn-fire').classList.remove('active-rating');
  document.getElementById('btn-down').classList.remove('active-rating');
  await loadRatings();
}

async function loadComments() {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('id, content, created_at, author_id, profiles(username)')
    .eq('post_id', piPostId)
    .order('created_at', { ascending: true });

  const list = document.getElementById('commentsList');
  list.innerHTML = '';

  if (error || !comments || comments.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);">No comments yet. Be the first to share your thoughts!</p>';
    document.getElementById('commentCount').textContent = '0';
    return;
  }

  document.getElementById('commentCount').textContent = comments.length;

  comments.forEach(function(c) {
    const authorName = c.profiles ? c.profiles.username : 'Unknown';
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.style.cssText = 'padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.08);';
    div.innerHTML =
      '<p style="font-weight:600;margin-bottom:4px;">' + piEscape(authorName) +
      ' <span style="font-weight:400;color:var(--text-muted);font-size:0.8rem;">' + new Date(c.created_at).toLocaleString() + '</span></p>' +
      '<p style="color:var(--text-secondary);white-space:pre-wrap;">' + piEscape(c.content) + '</p>';
    list.appendChild(div);
  });
}

function setupCommentForm() {
  const form = document.getElementById('commentForm');
  if (!form) return;

  if (!piCurrentUser) {
    form.innerHTML = '<p style="color:var(--text-muted);">Please <a href="../../login/">log in</a> to leave a comment.</p>';
    return;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const input = document.getElementById('commentInput');
    const content = input.value.trim();
    if (content.length < 2) return;

    const btn = document.getElementById('commentSubmitBtn');
    btn.disabled = true;

    const { error } = await supabase.from('comments').insert({
      post_id: piPostId,
      author_id: piCurrentUser.id,
      content: content
    });

    if (!error) {
      input.value = '';
      await loadComments();
    }
    btn.disabled = false;
  });
}

function setupReportButton() {
  const btn = document.getElementById('reportPostBtn');
  if (!btn) return;

  btn.addEventListener('click', async function() {
    if (!piCurrentUser) {
      alert('Please log in to report a post.');
      window.location.href = '../../login/';
      return;
    }
    const reason = prompt('Why are you reporting this post? Please describe the issue:');
    if (!reason || reason.trim().length < 3) return;

    const { error } = await supabase.from('reports').insert({
      post_id: piPostId,
      reporter_id: piCurrentUser.id,
      reason: reason.trim()
    });

    if (!error) {
      alert('Thank you. Your report has been submitted to the moderators.');
    } else {
      alert('Could not submit report: ' + error.message);
    }
  });
}

function piEscape(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

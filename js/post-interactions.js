// post-interactions.js
// Shared widget for comments, ratings (fire/thumbsdown), and reporting on a post detail page.
// Usage: include this script on any post page after supabase-config.js, then call:
//   initPostInteractions('POST_ID_HERE');

let piCurrentUser = null;
let piPostId = null;
let piIsAdmin = false;

async function initPostInteractions(postId) {
  piPostId = postId;

  const { data: sessionData } = await supabase.auth.getSession();
  piCurrentUser = sessionData.session ? sessionData.session.user : null;

  if (piCurrentUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', piCurrentUser.id)
      .single();
    piIsAdmin = profile && profile.role === 'admin';
  }

  await loadRatings();
  await loadComments();
  setupRatingButtons();
  setupCommentForm();
  setupReportButton();
}

async function loadRatings() {
  const { count: fireCount } = await supabase
    .from('ratings').select('id', { count: 'exact', head: true })
    .eq('post_id', piPostId).eq('rating_type', 'fire');
  const { count: downCount } = await supabase
    .from('ratings').select('id', { count: 'exact', head: true })
    .eq('post_id', piPostId).eq('rating_type', 'down');

  document.getElementById('fireCount').textContent = fireCount || 0;
  document.getElementById('downCount').textContent = downCount || 0;

  if (piCurrentUser) {
    const { data: myRating } = await supabase
      .from('ratings').select('rating_type').eq('post_id', piPostId).eq('user_id', piCurrentUser.id).maybeSingle();
    if (myRating) {
      document.getElementById('btn-' + myRating.rating_type).classList.add('active-rating');
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
    .from('ratings').select('id, rating_type').eq('post_id', piPostId).eq('user_id', piCurrentUser.id).maybeSingle();

    if (existing && existing.rating_type === value) {
    await supabase.from('ratings').delete().eq('id', existing.id);
  } else if (existing) {
    await supabase.from('ratings').update({ rating_type: value }).eq('id', existing.id);
  } else {
    await supabase.from('ratings').insert({ post_id: piPostId, user_id: piCurrentUser.id, rating_type: value });
  }

  document.getElementById('btn-fire').classList.remove('active-rating');
  document.getElementById('btn-down').classList.remove('active-rating');
  await loadRatings();
}

async function loadComments() {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*, profiles:author_id(username)')
    .eq('post_id', piPostId)
    .order('created_at', { ascending: true });

  const list = document.getElementById('commentsList');
  document.getElementById('commentCount').textContent = comments ? comments.length : 0;

  if (error || !comments || comments.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);">No comments yet. Be the first to share your thoughts!</p>';
    return;
  }

  list.innerHTML = comments.map(c => renderComment(c)).join('');

  comments.forEach(function(c) {
    if (piCurrentUser && (piCurrentUser.id === c.author_id || piIsAdmin)) {
      const delBtn = document.getElementById(`del-${c.id}`);
      if (delBtn) delBtn.onclick = () => deleteComment(c.id, piPostId);
    }
    if (piCurrentUser && piCurrentUser.id === c.author_id) {
      const editBtn = document.getElementById(`edit-${c.id}`);
      if (editBtn) editBtn.onclick = () => enableCommentEdit(c, piPostId);
    }
  });
}

function renderComment(c) {
  const date = new Date(c.created_at).toLocaleDateString();
  const editedTag = c.updated_at && c.updated_at !== c.created_at ? ' (edited)' : '';
  const canEdit = piCurrentUser && piCurrentUser.id === c.author_id;
  const canDelete = piCurrentUser && (piCurrentUser.id === c.author_id || piIsAdmin);

  return `
    <div class="comment-item" id="comment-${c.id}" style="border-bottom:1px solid rgba(255,255,255,0.08);padding:14px 0;">
      <div style="color:var(--text-muted);font-size:0.9rem;margin-bottom:6px;">
        <strong>${piEscape(c.profiles?.username || 'Unknown')}</strong> &middot; ${date}${editedTag}
      </div>
      <div class="comment-text" id="text-${c.id}" style="color:var(--text-secondary);white-space:pre-wrap;">${piEscape(c.content)}</div>
      <div class="comment-actions" style="margin-top:8px;display:flex;gap:8px;">
        ${canEdit ? `<button id="edit-${c.id}" class="link-btn">Edit</button>` : ''}
        ${canDelete ? `<button id="del-${c.id}" class="link-btn">Delete</button>` : ''}
      </div>
    </div>
  `;
}

function enableCommentEdit(comment, postId) {
  const textEl = document.getElementById(`text-${comment.id}`);
  if (!textEl) return;
  textEl.innerHTML = `
    <textarea id="editArea-${comment.id}" class="form-input" rows="3">${piEscape(comment.content)}</textarea>
    <button id="saveEdit-${comment.id}" class="btn-contribute" style="margin-top:8px;">Save</button>
  `;
  document.getElementById(`saveEdit-${comment.id}`).onclick = async () => {
    const newText = document.getElementById(`editArea-${comment.id}`).value.trim();
    if (!newText) return;
    await supabase.from('comments').update({ content: newText }).eq('id', comment.id);
    loadComments();
  };
}

async function deleteComment(commentId, postId) {
  if (!confirm('Delete this comment?')) return;
  await supabase.from('comments').delete().eq('id', commentId);
  loadComments();
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

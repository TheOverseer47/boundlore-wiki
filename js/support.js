let reportCurrentUser = null;

document.addEventListener('DOMContentLoaded', initSupportPage);

async function initSupportPage() {
  const { data: sessionData } = await supabase.auth.getSession();
  const gateBox = document.getElementById('reportGateBox');
  const formBox = document.getElementById('reportFormBox');

  if (!sessionData.session) {
    gateBox.innerHTML = '<p style="text-align:center">Please <a href="/wiki/login">log in</a> to submit a report.</p>';
    return;
  }

  reportCurrentUser = sessionData.session.user;
  gateBox.style.display = 'none';
  formBox.style.display = 'block';

  document.getElementById('btnSubmitReport').addEventListener('click', submitReport);
}

async function submitReport() {
  const btn = document.getElementById('btnSubmitReport');
  const category = document.getElementById('reportCategory').value;
  const target = document.getElementById('reportTarget').value.trim();
  const description = document.getElementById('reportDescription').value.trim();
  const fileInput = document.getElementById('reportScreenshot');
  const file = fileInput ? fileInput.files[0] : null;

  if (!description) {
    alert('Please add a description.');
    return;
  }
  if (category !== 'general' && category !== 'bug' && !target) {
    alert('Please specify the username or post/comment link you are reporting.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Submitting...';

  let screenshotUrl = null;
  if (file) {
    const ext = file.name.split('.').pop();
    const path = `${reportCurrentUser.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('report-screenshots')
      .upload(path, file);
    if (uploadError) {
      alert('Screenshot upload failed: ' + uploadError.message);
      btn.disabled = false;
      btn.textContent = 'Submit Report';
      return;
    }
    const { data: urlData } = supabase.storage.from('report-screenshots').getPublicUrl(path);
    screenshotUrl = urlData.publicUrl;
  }

  const targetType = (category === 'user' || category === 'post') ? category : null;

  const { error } = await supabase.from('reports').insert({
    reporter_id: reportCurrentUser.id,
    category: category,
    target_type: targetType,
    description: description,
    reason: target ? `Target: ${target} — ${description}` : description,
    screenshot_url: screenshotUrl
  });

  if (error) {
    alert('Failed to submit report: ' + error.message);
    btn.disabled = false;
    btn.textContent = 'Submit Report';
    return;
  }

  document.getElementById('reportFormBox').querySelectorAll('input,textarea,select,button').forEach(el => el.disabled = true);
  document.getElementById('reportSuccessMsg').style.display = 'block';
}

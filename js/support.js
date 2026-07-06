let reportCurrentUser = null;

document.addEventListener('DOMContentLoaded', initSupportPage);

async function initSupportPage() {
  const { data: sessionData } = await supabase.auth.getSession();
  const gateBox = document.getElementById('reportGateBox');
  const formBox = document.getElementById('reportFormBox');
  const category = document.getElementById('reportCategory');

  if (!sessionData.session) {
    gateBox.innerHTML = '<p style="text-align:center">Please <a href="/wiki/login">log in</a> to submit a report.</p>';
    return;
  }

  reportCurrentUser = sessionData.session.user;
  gateBox.style.display = 'none';
  formBox.style.display = 'block';

  if (category) {
    category.addEventListener('change', applySupportCategoryUi);
    applySupportCategoryUi();
  }

  document.getElementById('btnSubmitReport').addEventListener('click', submitReport);
}

async function submitReport() {
  const btn = document.getElementById('btnSubmitReport');
  const status = document.getElementById('reportStatus');
  const category = document.getElementById('reportCategory').value;
  const target = document.getElementById('reportTarget').value.trim();
  const description = document.getElementById('reportDescription').value.trim();
  const fileInput = document.getElementById('reportScreenshot');
  const file = fileInput ? fileInput.files[0] : null;

  setReportStatus('', '');

  if (!description) {
    setReportStatus('Please add a description.', 'error');
    return;
  }
  if (category !== 'general' && category !== 'bug' && !target) {
    setReportStatus('Please specify the username or post/comment link you are reporting.', 'error');
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
      setReportStatus('Screenshot upload failed: ' + uploadError.message, 'error');
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
    setReportStatus('Failed to submit report: ' + error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Submit Report';
    return;
  }

  document.getElementById('reportFormBox').querySelectorAll('input,textarea,select,button').forEach(el => el.disabled = true);
  document.getElementById('reportSuccessMsg').style.display = 'block';
  setReportStatus('Report submitted successfully.', 'success');
}

function applySupportCategoryUi() {
  const category = document.getElementById('reportCategory');
  const label = document.getElementById('reportTargetLabel');
  const target = document.getElementById('reportTarget');
  if (!category || !label || !target) return;

  if (category.value === 'general') {
    label.textContent = 'Reference Link (optional)';
    target.placeholder = 'Optional context link';
  } else if (category.value === 'bug') {
    label.textContent = 'Page/Feature Link (recommended)';
    target.placeholder = 'https://boundlore.com/wiki/...';
  } else if (category.value === 'user') {
    label.textContent = 'Username (required)';
    target.placeholder = 'e.g. FireFrog44';
  } else {
    label.textContent = 'Post or Comment Link (required)';
    target.placeholder = 'https://boundlore.com/wiki/post/?slug=...';
  }
}

function setReportStatus(message, kind) {
  const status = document.getElementById('reportStatus');
  if (!status) return;

  status.classList.remove('error', 'success');
  if (!message) {
    status.style.display = 'none';
    status.textContent = '';
    return;
  }

  status.textContent = message;
  status.style.display = 'block';
  if (kind) status.classList.add(kind);
}

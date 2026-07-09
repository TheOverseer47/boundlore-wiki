(function() {
  const checkbox = document.getElementById("tutorialConfirmCheckbox");
  const button = document.getElementById("tutorialConfirmBtn");
  const status = document.getElementById("tutorialConfirmStatus");

  if (!checkbox || !button || !status) return;

  checkbox.addEventListener("change", function() {
    button.disabled = !checkbox.checked;
  });

  function getReturnTo() {
    const params = new URLSearchParams(window.location.search || "");
    const returnTo = (params.get("returnTo") || "").trim();
    if (!returnTo) return "/wiki/create-post/";
    if (!returnTo.startsWith("/")) return "/wiki/create-post/";
    if (returnTo.startsWith("//")) return "/wiki/create-post/";
    return returnTo;
  }

  async function loadState() {
    await supabase.auth.refreshSession();
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData && sessionData.session ? sessionData.session.user : null;

    if (!user) {
      status.textContent = "Status: please log in first, then confirm this tutorial.";
      button.disabled = true;
      checkbox.disabled = true;
      return;
    }

    let accepted = false;
    if (typeof TutorialAck !== "undefined") {
      const ack = await TutorialAck.hasAcknowledgement(supabase, { userId: user.id, isAdmin: false });
      if (ack.tableMissing) {
        status.textContent = ack.message || "Tutorial acknowledgement migration is not applied yet.";
        button.disabled = true;
        checkbox.disabled = true;
        return;
      }
      accepted = !!(ack.ok && ack.hasAck);
    }

    if (accepted) {
      status.textContent = "Status: already confirmed for this account.";
      checkbox.checked = true;
      checkbox.disabled = true;
      button.disabled = false;
      button.textContent = "Continue To Submit";
      button.dataset.accepted = "1";
    } else {
      status.textContent = "Status: not confirmed yet.";
    }
  }

  button.addEventListener("click", async function() {
    const returnTo = getReturnTo();

    if (button.dataset.accepted === "1") {
      window.location.href = returnTo;
      return;
    }

    button.disabled = true;
    status.textContent = "Saving confirmation...";

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData && sessionData.session ? sessionData.session.user : null;
    if (!user) {
      status.textContent = "Status: please log in first, then confirm this tutorial.";
      button.disabled = false;
      return;
    }

    if (typeof TutorialAck === "undefined") {
      status.textContent = "Tutorial acknowledgement module is not loaded. Please refresh.";
      button.disabled = false;
      return;
    }

    const saved = await TutorialAck.saveAcknowledgement(supabase, user.id);
    if (!saved.ok) {
      status.textContent = saved.message || ("Could not save confirmation: " + (saved.reason || "unknown error"));
      button.disabled = false;
      return;
    }

    // UX cache only — not used for RLS/security decisions.
    const nextMeta = Object.assign({}, user.user_metadata || {}, {
      submission_tutorial_v1_accepted: true,
      submission_tutorial_v1_accepted_at: new Date().toISOString(),
    });
    await supabase.auth.updateUser({ data: nextMeta });
    await supabase.auth.refreshSession();

    status.textContent = "Confirmed. Redirecting to submit page...";
    window.location.href = returnTo;
  });

  loadState();
})();

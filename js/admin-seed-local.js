(function() {
  const LEAD_ADMIN_ID = "58d9cffb-6e21-438b-92fa-4b0f650f267b";
  const EXAMPLE_TITLE = "Aquatic Biome - Trailer Reference";

  function setStatus(message, type) {
    const box = document.getElementById("seedStatus");
    if (!box) return;
    box.textContent = message || "";
    box.style.display = message ? "block" : "none";
    box.style.color = type === "error" ? "#ff8b8b" : (type === "success" ? "#50c878" : "var(--text-muted)");
  }

  function buildExampleContent() {
    return [
      '<div class="bl-seed-entry">',
      '  <p><strong>Aquatic Biome (Trailer Observation)</strong></p>',
      '  <p>This entry summarizes clearly visible aquatic-environment cues from the official Light No Fire announcement trailer. Water traversal, broad water surfaces, and shoreline transitions are visually indicated, but gameplay mechanics (for example exact swim stats or resource tables) are not confirmed yet.</p>',
      '  <h3>Observed Elements</h3>',
      '  <ul>',
      '    <li>Large continuous water area integrated into traversable world spaces.</li>',
      '    <li>Biome contrast between aquatic zones and adjacent landmass.</li>',
      '    <li>Atmospheric lighting and visibility consistent with exploration-focused traversal.</li>',
      '  </ul>',
      '  <h3>Reference Frame</h3>',
      '  <p><img src="/public/images/wiki-seed/bl-trailer-2023-biome-aquatic-001.png" alt="Aquatic biome frame from Light No Fire trailer" style="max-width:100%;border-radius:10px;" /></p>',
      '  <p><strong>Source:</strong> Official Light No Fire Announcement Trailer (YouTube, Hello Games).</p>',
      '</div>',
      '<!--BLMETA {"update_phase":"pre-update","patch_tag":"Trailer-2023-12","source_url":"https://www.youtube.com/watch?v=jKQem4Z6ioQ"} -->'
    ].join("\n");
  }

  async function upsertBiomeSeed() {
    if (typeof supabase === "undefined") {
      setStatus("Supabase client not available on this page.", "error");
      return;
    }

    setStatus("Checking admin session...", "info");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData || !sessionData.session) {
      setStatus("No active session found. Please log in as lead admin first.", "error");
      return;
    }

    const sessionUserId = sessionData.session.user.id;
    if (sessionUserId !== LEAD_ADMIN_ID) {
      setStatus("Logged-in account is not the configured lead admin. Please use TheOverseer47 account.", "error");
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from("posts")
      .select("id, slug")
      .eq("title", EXAMPLE_TITLE)
      .eq("author_id", LEAD_ADMIN_ID)
      .maybeSingle();

    if (existingError) {
      setStatus("Failed to check existing example: " + existingError.message, "error");
      return;
    }

    const payload = {
      author_id: sessionUserId,
      title: EXAMPLE_TITLE,
      content: buildExampleContent(),
      status: "pending",
      category: "biomes",
      post_type: "wiki",
      guide_subcategory: null,
      is_discovery: false
    };

    if (existing && existing.id) {
      setStatus("Updating existing example post...", "info");
      const { error: updateError } = await supabase
        .from("posts")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) {
        setStatus("Update failed: " + updateError.message, "error");
        return;
      }

      const { error: publishError } = await supabase
        .from("posts")
        .update({ status: "published" })
        .eq("id", existing.id);

      if (publishError) {
        setStatus("Update succeeded, but publish failed (RLS/policy): " + publishError.message, "error");
        return;
      }

      const target = existing.slug
        ? ("/wiki/post/?slug=" + encodeURIComponent(existing.slug))
        : ("/wiki/post/?id=" + encodeURIComponent(existing.id));
      setStatus("Example updated successfully. Open: " + target, "success");
      return;
    }

    setStatus("Creating example post (pending first for policy-safe flow)...", "info");
    const { data: created, error: insertError } = await supabase
      .from("posts")
      .insert(payload)
      .select("id, slug")
      .single();

    if (insertError) {
      setStatus("Insert failed: " + insertError.message, "error");
      return;
    }

    const { error: publishError } = await supabase
      .from("posts")
      .update({ status: "published" })
      .eq("id", created.id);

    if (publishError) {
      setStatus("Insert succeeded, but publish failed (RLS/policy): " + publishError.message, "error");
      return;
    }

    const target = created.slug
      ? ("/wiki/post/?slug=" + encodeURIComponent(created.slug))
      : ("/wiki/post/?id=" + encodeURIComponent(created.id));
    setStatus("Example created successfully. Open: " + target, "success");
  }

  document.addEventListener("DOMContentLoaded", function() {
    const runBtn = document.getElementById("runBiomeSeed");
    if (!runBtn) return;
    runBtn.addEventListener("click", function() {
      upsertBiomeSeed().catch(function(err) {
        setStatus("Unexpected error: " + (err && err.message ? err.message : String(err)), "error");
      });
    });
  });
})();

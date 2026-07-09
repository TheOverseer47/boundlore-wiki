// Server-side tutorial acknowledgement helper.
// Security source of truth: public.user_submission_acks (not user_metadata).
window.TutorialAck = (function() {
  const TABLE = "user_submission_acks";
  const VERSION = "v1";
  let cache = null;

  function isMissingTableError(error) {
    if (!error) return false;
    const code = String(error.code || "");
    const msg = String(error.message || "").toLowerCase();
    return code === "42P01" || msg.indexOf("does not exist") !== -1
      || (msg.indexOf("relation") !== -1 && msg.indexOf(TABLE) !== -1);
  }

  function clearCache() {
    cache = null;
  }

  async function hasAcknowledgement(client, options) {
    const opts = options || {};
    if (!client) return { ok: false, hasAck: false, reason: "no_client" };
    if (opts.isAdmin) return { ok: true, hasAck: true, adminBypass: true };

    const userId = opts.userId;
    if (!userId) return { ok: false, hasAck: false, reason: "no_user" };

    if (cache && cache.userId === userId && cache.checkedAt) {
      return cache.result;
    }

    const { data, error } = await client
      .from(TABLE)
      .select("user_id, tutorial_version, accepted_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        const result = {
          ok: false,
          hasAck: false,
          tableMissing: true,
          reason: "migration_required",
          message: "Tutorial acknowledgement is not configured yet. An admin must run supabase/fix_tutorial_ack_rls.sql in the Supabase SQL Editor.",
        };
        cache = { userId: userId, checkedAt: Date.now(), result: result };
        return result;
      }
      return { ok: false, hasAck: false, reason: error.message || "query_failed" };
    }

    const result = { ok: true, hasAck: !!data, row: data || null };
    cache = { userId: userId, checkedAt: Date.now(), result: result };
    return result;
  }

  async function saveAcknowledgement(client, userId) {
    if (!client || !userId) return { ok: false, reason: "missing_client_or_user" };

    // Insert only — ignoreDuplicates => ON CONFLICT DO NOTHING (no UPDATE grant).
    const { error } = await client
      .from(TABLE)
      .upsert({
        user_id: userId,
        tutorial_version: VERSION,
        accepted_at: new Date().toISOString(),
      }, { onConflict: "user_id", ignoreDuplicates: true });

    if (error) {
      if (isMissingTableError(error)) {
        return {
          ok: false,
          tableMissing: true,
          reason: "migration_required",
          message: "Could not save acknowledgement. Run supabase/fix_tutorial_ack_rls.sql in the Supabase SQL Editor first.",
        };
      }
      return { ok: false, reason: error.message || "insert_failed" };
    }

    clearCache();
    return { ok: true };
  }

  return {
    TABLE: TABLE,
    VERSION: VERSION,
    hasAcknowledgement: hasAcknowledgement,
    saveAcknowledgement: saveAcknowledgement,
    clearCache: clearCache,
  };
})();

(function() {
  let notificationsTableAvailable = null;
  const CLEAR_PREFIX = "bl_notifications_cleared_at_";

  function getClearKey(userId) {
    return CLEAR_PREFIX + userId;
  }

  function getClearedAt(userId) {
    if (!userId) return null;
    try {
      return localStorage.getItem(getClearKey(userId));
    } catch (err) {
      return null;
    }
  }

  function setClearedAt(userId, isoDate) {
    if (!userId) return;
    try {
      localStorage.setItem(getClearKey(userId), isoDate);
    } catch (err) {
      // Ignore localStorage failures.
    }
  }

  async function detectNotificationsTable() {
    if (notificationsTableAvailable !== null) return notificationsTableAvailable;
    try {
      const { error } = await supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      notificationsTableAvailable = !error;
    } catch (err) {
      notificationsTableAvailable = false;
    }
    return notificationsTableAvailable;
  }

  async function fetchUnreadCount(userId) {
    if (!userId) return 0;
    if (!(await detectNotificationsTable())) return 0;

    let query = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    const clearedAt = getClearedAt(userId);
    if (clearedAt) {
      query = query.gt("created_at", clearedAt);
    }

    const { count, error } = await query;

    if (error) return 0;
    return count || 0;
  }

  async function fetchLatest(userId, limit) {
    if (!userId) return [];
    if (!(await detectNotificationsTable())) return [];

    let query = supabase
      .from("notifications")
      .select("id, type, title, message, target_url, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit || 8);

    const clearedAt = getClearedAt(userId);
    if (clearedAt) {
      query = query.gt("created_at", clearedAt);
    }

    const { data, error } = await query;

    if (error || !data) return [];
    return data;
  }

  async function markAllRead(userId) {
    if (!userId) return;
    if (!(await detectNotificationsTable())) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  }

  async function clearAll(userId) {
    if (!userId) return { ok: false };
    if (!(await detectNotificationsTable())) return { ok: false, skipped: true };

    // Policy-safe behavior: mark all as read server-side, then locally hide everything up to now.
    await markAllRead(userId);
    setClearedAt(userId, new Date().toISOString());
    return { ok: true };
  }

  async function createNotification(payload) {
    if (!payload || !payload.user_id || !payload.title) return { ok: false, skipped: true };
    if (!(await detectNotificationsTable())) return { ok: false, skipped: true };

    const record = {
      user_id: payload.user_id,
      type: payload.type || "system",
      title: payload.title,
      message: payload.message || null,
      target_url: payload.target_url || null,
      is_read: false,
    };

    const { error } = await supabase.from("notifications").insert(record);
    if (error) return { ok: false, error };
    return { ok: true };
  }

  window.BLNotify = {
    detectNotificationsTable,
    fetchUnreadCount,
    fetchLatest,
    markAllRead,
    clearAll,
    createNotification,
  };
})();

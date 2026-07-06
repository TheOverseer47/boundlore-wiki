(function() {
  let notificationsTableAvailable = null;

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

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) return 0;
    return count || 0;
  }

  async function fetchLatest(userId, limit) {
    if (!userId) return [];
    if (!(await detectNotificationsTable())) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, message, target_url, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit || 8);

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
    createNotification,
  };
})();

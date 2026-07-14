(function() {
  const LEAD_ADMIN_ID = "58d9cffb-6e21-438b-92fa-4b0f650f267b";
  const SEED_TOOL_QUERY_FLAG = "enableSeedTool";
  const EXAMPLE_TITLE = "Aquatic Biome - Trailer Reference";
  const TRAILER_URL = "https://www.youtube.com/watch?v=jKQem4Z6ioQ";
  const RACES_PAGE_URL = "https://lightnofire.miraheze.org/wiki/Races";
  const WEAPONS_PAGE_URL = "https://lightnofire.miraheze.org/wiki/Weapons";

  function isSeedToolEnabled() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return params.get(SEED_TOOL_QUERY_FLAG) === "1";
    } catch (_) {
      return false;
    }
  }

  function setSeedToolUiEnabled(enabled) {
    const panel = document.getElementById("seedToolPanel");
    const disabledBox = document.getElementById("seedDisabledBox");
    const runBtn = document.getElementById("runBiomeSeed");
    const runPackBtn = document.getElementById("runKnowledgePackSeed");

    if (panel) panel.style.display = enabled ? "block" : "none";
    if (disabledBox) disabledBox.style.display = enabled ? "none" : "block";
    if (runBtn) runBtn.disabled = !enabled;
    if (runPackBtn) runPackBtn.disabled = !enabled;
  }

  function setStatus(message, type) {
    const box = document.getElementById("seedStatus");
    if (!box) return;
    box.textContent = message || "";
    box.style.display = message ? "block" : "none";
    box.style.color = type === "error" ? "#ff8b8b" : (type === "success" ? "#50c878" : "var(--text-muted)");
  }

  const KNOWLEDGE_PACK = [
    {
      title: "Aquatic Biome - Trailer Reference",
      category: "biomes",
      subcategory: "aquatic",
      image: "/public/images/wiki-seed/bl-trailer-2023-biome-aquatic-001.png",
      summary: "This entry summarizes clearly visible aquatic-environment cues from the official Light No Fire announcement trailer.",
      bullets: [
        "Large continuous water areas integrated into traversable world spaces.",
        "Visible transition zones between water and nearby terrain.",
        "Exploration framing suggests aquatic travel relevance, while gameplay values remain unconfirmed."
      ]
    },
    {
      title: "Palm Desert Biome - Trailer Reference",
      category: "biomes",
      subcategory: "deserts",
      image: "/public/images/wiki-seed/bl-trailer-2023-biome-desert-001.png",
      summary: "Desert-like biome framing in trailer material with clear vegetation contrast and open-space traversal visibility.",
      bullets: [
        "Arid terrain with palm vegetation visible in scene composition.",
        "Open sightlines suitable for route-planning documentation.",
        "No confirmed gameplay modifiers are asserted at this stage."
      ]
    },
    {
      title: "Temperate Woodland Biome - Trailer Reference",
      category: "biomes",
      subcategory: "forests",
      image: "/public/images/wiki-seed/bl-trailer-2023-biome-forest-001.png",
      summary: "Woodland environment framing from trailer shots with dense foliage and temperate visual mood.",
      bullets: [
        "Dense tree coverage and layered landscape depth.",
        "Natural route complexity compared to open biomes.",
        "Useful as a baseline reference for future biome differentiation."
      ]
    },
    {
      title: "Frozen Biome - Trailer Reference",
      category: "biomes",
      subcategory: "frozen",
      image: "/public/images/wiki-seed/bl-trailer-2023-biome-frozen-001.png",
      summary: "Frozen terrain imagery appears in trailer footage and supports early environmental classification.",
      bullets: [
        "Cold-region visual markers and reduced vegetation profile.",
        "Terrain readability suggests traversal and scouting relevance.",
        "No assumed survival penalties until official confirmation."
      ]
    },
    {
      title: "Grasslands Biome - Trailer Reference",
      category: "biomes",
      subcategory: "grasslands",
      image: "/public/images/wiki-seed/bl-trailer-2023-biome-grasslands-001.png",
      summary: "Grassland scene composition from trailer captures broad movement space and weather-rich atmosphere.",
      bullets: [
        "Wide open terrain framing with long-range visibility.",
        "Weather and lighting changes visible in captured frame.",
        "Valuable as reference for exploration and orientation articles."
      ]
    },
    {
      title: "Rocky and Mountainous Biome - Trailer Reference",
      category: "biomes",
      subcategory: "rocky-mountainous",
      image: "/public/images/wiki-seed/bl-trailer-2023-biome-rocky-001.png",
      summary: "Rocky terrain and elevation-heavy scene framing in trailer material.",
      bullets: [
        "Steeper terrain profile and denser obstacle silhouette.",
        "Potentially distinct route constraints versus plains/grassland.",
        "Current article remains observation-only, pending release validation."
      ]
    },
    {
      title: "Badger Humanoid",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-trailer-2023-creature-badger-001.png",
      summary: "Badger-like humanoid form observed in trailer footage. Role classification is currently unconfirmed.",
      bullets: [
        "Distinct anthropomorphic silhouette and species-style variation.",
        "Visual evidence supports creature/race catalog inclusion.",
        "Playable/NPC status is intentionally left open until official confirmation."
      ]
    },
    {
      title: "Frog Humanoid",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-trailer-2023-creature-frog-001.png",
      summary: "Frog-like humanoid visual from trailer footage, included as evidence-based creature catalog entry.",
      bullets: [
        "Non-human morphology visible in close shot framing.",
        "Consistent with broad species diversity in trailer material.",
        "Gameplay role remains unspecified and is not assumed in this entry."
      ]
    },
    {
      title: "Human Adventurer",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-races-human-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Human adventurer imagery is included on the Miraheze Races reference page and supports a documented humanoid-race entry.",
      bullets: [
        "Human-like body plan and tool-use framing are clearly visible.",
        "Reference image supports cataloging species diversity without assigning class or faction roles.",
        "Playable status remains unconfirmed and is not assumed here."
      ]
    },
    {
      title: "Elf Humanoid",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-races-elf-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Elf-like humanoid imagery appears on the Miraheze Races page and is suitable for a non-speculative species reference entry.",
      bullets: [
        "Slim humanoid silhouette and distinct fantasy-race styling are visible in the reference image.",
        "The page serves as evidence of represented race variety rather than gameplay role confirmation.",
        "No faction, class, or stat assumptions are made in this entry."
      ]
    },
    {
      title: "Giant or Ogre Humanoid",
      category: "creatures",
      subcategory: "monsters",
      image: "/public/images/wiki-seed/bl-races-giant-ogre-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Large-bodied humanoid imagery listed under Giants/Ogres on the Miraheze Races page is currently better treated as a monster reference than a standard race entry.",
      bullets: [
        "Reference framing emphasizes scale difference compared to standard humanoid silhouettes.",
        "Current evidence supports visual classification only, not final naming certainty between giant and ogre.",
        "Behavior, hostility, and playability remain unconfirmed."
      ]
    },
    {
      title: "Skeleton Humanoid",
      category: "creatures",
      subcategory: "monsters",
      image: "/public/images/wiki-seed/bl-races-skeleton-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Skeleton-like humanoid imagery appears on the Miraheze Races page and is currently better categorized as a monster reference.",
      bullets: [
        "Undead-style skeletal body structure is directly visible in the reference image.",
        "Entry records representation only and does not infer enemy type or encounter rules.",
        "Further classification should wait for official confirmation."
      ]
    },
    {
      title: "Unknown Horned Humanoid",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-races-horned-humanoid-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Horned humanoid imagery on the Miraheze Races page is visually distinct but not definitively identified, so it remains documented as unknown.",
      bullets: [
        "Prominent horned silhouette separates this reference from other humanoid race examples.",
        "The current label intentionally preserves uncertainty instead of forcing a species claim.",
        "Gameplay role remains open until official material clarifies it."
      ]
    },
    {
      title: "Bear Humanoid",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-races-bear-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Bear-like humanoid imagery listed on the Miraheze Races page expands the documented animal-folk range beyond the trailer seed set.",
      bullets: [
        "Large bear-like facial structure and humanoid posture are both visible.",
        "Work/hauling framing suggests social-world presence but does not confirm mechanics or role.",
        "Entry remains evidence-based and classification-light."
      ]
    },
    {
      title: "Fox Humanoid",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-races-fox-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Fox-like humanoid imagery is included under Foxes on the Miraheze Races page and is documented here as an evidence-based race reference.",
      bullets: [
        "Animal-folk silhouette and walking pose support humanoid-race cataloging.",
        "The entry follows the race page label while avoiding deeper lore assumptions.",
        "Playable/NPC distinction is still unknown."
      ]
    },
    {
      title: "Otter Humanoid",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-races-otter-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Otter-like humanoid imagery appears on the Miraheze Races page and adds another documented water-adjacent animal-folk reference.",
      bullets: [
        "Otter-like morphology is visible in the referenced image.",
        "Current evidence supports inclusion in the race catalog without role assumptions.",
        "Any traversal or aquatic-bonus speculation is intentionally omitted."
      ]
    },
    {
      title: "Pig Humanoid",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-races-pig-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Pig-like humanoid imagery on the Miraheze Races page supports another documented species entry for the local race catalog.",
      bullets: [
        "Pig-like facial structure and humanoid body framing are visible in the reference image.",
        "Entry records visible representation only, not confirmed lore or faction identity.",
        "Further detail should be added only from official material or direct in-game evidence."
      ]
    },
    {
      title: "Rabbit or Hare Humanoid",
      category: "creatures",
      subcategory: "races",
      image: "/public/images/wiki-seed/bl-races-rabbit-001.png",
      sourceUrl: RACES_PAGE_URL,
      sourceLabel: "Miraheze Races page reference image",
      summary: "Rabbit-like humanoid imagery listed under Rabbits/Bunnies/Hares on the Miraheze Races page is documented here as a cautious species reference.",
      bullets: [
        "Long-eared humanoid silhouette is clearly visible in the reference image.",
        "The title preserves the page's broader uncertainty around rabbit/bunny/hare naming.",
        "Role, origin, and mechanics remain unconfirmed."
      ]
    },
    {
      title: "Bow and Arrow - Trailer Weapon Reference",
      category: "items",
      subcategory: "weapons",
      image: "/public/images/wiki-seed/bl-trailer-2023-weapon-bow-001.jpg",
      sourceUrl: WEAPONS_PAGE_URL,
      sourceLabel: "Miraheze Weapons page reference image",
      summary: "Bow-and-arrow loadout visible in trailer footage and suitable for early weapon catalog indexing.",
      bullets: [
        "Ranged combat silhouette is clearly identifiable.",
        "Supports initial weapon family taxonomy in Items > Weapons.",
        "No assumptions about stats, stamina cost, or progression tiers."
      ]
    },
    {
      title: "Staff",
      category: "items",
      subcategory: "weapons",
      image: "/public/images/wiki-seed/bl-weapons-staff-001.jpg",
      sourceUrl: WEAPONS_PAGE_URL,
      sourceLabel: "Miraheze Weapons page reference image",
      summary: "Staff imagery is listed on the Miraheze Weapons page and is documented here as a cautious prerelease weapon reference.",
      bullets: [
        "Long-form weapon silhouette is visible in the referenced prerelease image.",
        "Current documentation records observed weapon variety without asserting class-locks or spell mechanics.",
        "Further gameplay interpretation should wait for official confirmation."
      ]
    },
    {
      title: "Fire Sword",
      category: "items",
      subcategory: "weapons",
      image: "/public/images/wiki-seed/bl-weapons-fire-sword-001.jpg",
      sourceUrl: WEAPONS_PAGE_URL,
      sourceLabel: "Miraheze Weapons page reference image",
      summary: "Fire Sword imagery is listed on the Miraheze Weapons page and is documented here as a separate prerelease weapon reference.",
      bullets: [
        "The referenced image shows a distinct sword variant associated with a fire-themed visual treatment.",
        "This entry captures the visible variation without assuming elemental systems or upgrade rules.",
        "Combat behavior and acquisition details remain unconfirmed."
      ]
    },
    {
      title: "Sword and Shield - Trailer Weapon Reference",
      category: "items",
      subcategory: "weapons",
      image: "/public/images/wiki-seed/bl-trailer-2023-weapon-sword-shield-001.jpg",
      sourceUrl: WEAPONS_PAGE_URL,
      sourceLabel: "Miraheze Weapons page reference image",
      summary: "Sword-and-shield setup observed in trailer material as a melee reference archetype.",
      bullets: [
        "Melee profile clearly distinguishable in frame evidence.",
        "Useful baseline for later comparative weapon pages.",
        "Mechanics and balance details deferred until official release data."
      ]
    }
  ];

  function withMeta(content, subcategory, item) {
    const meta = {
      update_phase: "pre-update",
      patch_tag: "Trailer-2023-12",
      source_url: (item && item.sourceUrl) || TRAILER_URL
    };
    if (subcategory) meta.subcategory = subcategory;
    return content + "\n<!--BLMETA " + JSON.stringify(meta).replace(/-->/g, "--\\>") + " -->";
  }

  function buildSeedContent(item) {
    const bullets = (item.bullets || []).map(function(line) {
      return "    <li>" + line + "</li>";
    }).join("\n");

    const html = [
      '<div class="bl-seed-entry">',
      '  <p><strong>' + item.title + '</strong></p>',
      '  <p>' + item.summary + '</p>',
      '  <h3>Observed Elements</h3>',
      '  <ul>',
      bullets,
      '  </ul>',
      '  <h3>Reference Frame</h3>',
      '  <p><img src="' + item.image + '" alt="' + item.title + ' from Light No Fire trailer" style="max-width:100%;border-radius:10px;" /></p>',
      '  <p><strong>Source:</strong> ' + ((item && item.sourceLabel) || 'Official Light No Fire Announcement Trailer (YouTube, Hello Games).') + '</p>',
      '</div>'
    ].join("\n");

    return withMeta(html, item.subcategory || "", item);
  }

  async function getLeadAdminSessionUserId() {
    if (typeof supabase === "undefined") {
      setStatus("Supabase client not available on this page.", "error");
      return null;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData || !sessionData.session) {
      setStatus("No active session found. Please log in as lead admin first.", "error");
      return null;
    }

    const sessionUserId = sessionData.session.user.id;
    if (sessionUserId !== LEAD_ADMIN_ID) {
      setStatus("Logged-in account is not the configured lead admin. Please use TheOverseer47 account.", "error");
      return null;
    }

    return sessionUserId;
  }

  async function upsertOneSeed(item, sessionUserId) {
    const lookupTitles = [item.title];
    if (!/ - (Reference|Trailer) Observation$/i.test(item.title)) {
      lookupTitles.push(item.title + " - Reference Observation");
      lookupTitles.push(item.title + " - Trailer Observation");
    }

    let existing = null;
    for (let i = 0; i < lookupTitles.length; i += 1) {
      const lookupTitle = lookupTitles[i];
      const { data: candidate, error: existingError } = await supabase
        .from("posts")
        .select("id, slug")
        .eq("title", lookupTitle)
        .eq("author_id", LEAD_ADMIN_ID)
        .maybeSingle();

      if (existingError) {
        return { ok: false, message: "Lookup failed for '" + lookupTitle + "': " + existingError.message };
      }

      if (candidate && candidate.id) {
        existing = candidate;
        break;
      }
    }

    const payload = {
      author_id: sessionUserId,
      title: item.title,
      content: buildSeedContent(item),
      status: "pending",
      category: item.category,
      post_type: "wiki",
      guide_subcategory: null,
      is_discovery: false
    };

    if (existing && existing.id) {
      const { error: updateError } = await supabase
        .from("posts")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) {
        return { ok: false, message: "Update failed for '" + item.title + "': " + updateError.message };
      }
      const { error: publishError } = await supabase
        .from("posts")
        .update({ status: "published" })
        .eq("id", existing.id);
      if (publishError) {
        return { ok: false, message: "Publish failed for '" + item.title + "': " + publishError.message };
      }
      return { ok: true, mode: "updated", id: existing.id, slug: existing.slug, title: item.title };
    }

    const { data: created, error: insertError } = await supabase
      .from("posts")
      .insert(payload)
      .select("id, slug")
      .single();

    if (insertError) {
      return { ok: false, message: "Insert failed for '" + item.title + "': " + insertError.message };
    }

    const { error: publishError } = await supabase
      .from("posts")
      .update({ status: "published" })
      .eq("id", created.id);
    if (publishError) {
      return { ok: false, message: "Publish failed for '" + item.title + "': " + publishError.message };
    }

    return { ok: true, mode: "created", id: created.id, slug: created.slug, title: item.title };
  }

  async function upsertBiomeSeed() {
    setStatus("Checking admin session...", "info");
    const sessionUserId = await getLeadAdminSessionUserId();
    if (!sessionUserId) return;

    const result = await upsertOneSeed(KNOWLEDGE_PACK[0], sessionUserId);
    if (!result.ok) {
      setStatus(result.message, "error");
      return;
    }

    const target = result.slug
      ? BoundLoreEntityRoutes.buildEntityPostHref({ slug: result.slug })
      : BoundLoreEntityRoutes.buildEntityPostHref({ id: result.id });
    setStatus("Biome example " + result.mode + " successfully. Open: " + target, "success");
  }

  async function upsertKnowledgePack() {
    setStatus("Checking admin session...", "info");
    const sessionUserId = await getLeadAdminSessionUserId();
    if (!sessionUserId) return;

    let created = 0;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < KNOWLEDGE_PACK.length; i += 1) {
      const item = KNOWLEDGE_PACK[i];
      setStatus("Processing " + (i + 1) + "/" + KNOWLEDGE_PACK.length + ": " + item.title, "info");
      const result = await upsertOneSeed(item, sessionUserId);
      if (!result.ok) {
        errors.push(result.message);
        continue;
      }
      if (result.mode === "created") created += 1;
      if (result.mode === "updated") updated += 1;
    }

    if (errors.length) {
      setStatus("Pack completed with issues. Created: " + created + ", Updated: " + updated + ". First error: " + errors[0], "error");
      return;
    }

    setStatus("Pack completed successfully. Created: " + created + ", Updated: " + updated + ".", "success");
  }

  document.addEventListener("DOMContentLoaded", function() {
    const toolEnabled = isSeedToolEnabled();
    setSeedToolUiEnabled(toolEnabled);

    if (!toolEnabled) {
      setStatus("Seed tool disabled. Add ?enableSeedTool=1 to unlock intentionally.", "info");
      return;
    }

    const runBtn = document.getElementById("runBiomeSeed");
    if (runBtn) {
      runBtn.addEventListener("click", function() {
        upsertBiomeSeed().catch(function(err) {
          setStatus("Unexpected error: " + (err && err.message ? err.message : String(err)), "error");
        });
      });
    }

    const runPackBtn = document.getElementById("runKnowledgePackSeed");
    if (runPackBtn) {
      runPackBtn.addEventListener("click", function() {
        upsertKnowledgePack().catch(function(err) {
          setStatus("Unexpected error: " + (err && err.message ? err.message : String(err)), "error");
        });
      });
    }
  });
})();

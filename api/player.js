// api/player.js — Vercel Serverless Function (with diagnostics)

const API1 = "https://freefireinfo-zy9l.onrender.com/api/v1";
const API2 = "https://free-ff-api-src-5plp.onrender.com/api/v1";

async function tryFetch(url) {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(50000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) {}
    return { status: r.status, ok: r.ok, json, preview: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, ok: false, json: null, preview: "FETCH ERROR: " + e.message };
  }
}

export default async function handler(req, res) {
  const { uid, region } = req.query;
  if (!uid || !region) {
    return res.status(400).json({ error: "uid aur region dono zaroori hain" });
  }

  const diag = {};

  // ── API 1 ──
  const r1 = await tryFetch(
    `${API1}/player-profile?uid=${encodeURIComponent(uid)}&server=${encodeURIComponent(region)}`
  );
  diag.api1 = { status: r1.status, preview: r1.preview };

  if (r1.ok && r1.json && (r1.json.basicinfo || r1.json.basicInfo)) {
    const d = r1.json;
    const b   = d.basicinfo        || d.basicInfo        || {};
    const p   = d.profileinfo      || d.profileInfo      || {};
    const c   = d.clanBasicInfo    || d.claninfo         || {};
    const cap = d.captainBasicInfo || d.captaininfo      || {};
    return res.status(200).json({
      player: {
        name:   b.nickname  || "N/A",
        uid:    b.accountid || b.accountId || uid,
        level:  b.level     || null,
        likes:  b.liked     ?? b.likes ?? null,
        region: b.region    || region,
      },
      guild: {
        name:    c.clanName  || c.clanname || "Guild me nahi hai",
        id:      c.clanId    || c.clanid   || "N/A",
        level:   c.clanLevel || c.clanlevel || null,
        members: c.memberNum || c.membernum || null,
      },
      leader: {
        name: cap.nickname  || "N/A",
        uid:  cap.accountId || cap.accountid || c.captainId || c.captainid || "N/A",
      },
      outfitIds: (p.clothes || p.equippedOutfit || []).filter(id => id && id !== 0),
      _source: "API1",
    });
  }

  // ── API 2 ──
  const r2 = await tryFetch(
    `${API2}/account?region=${encodeURIComponent(region)}&uid=${encodeURIComponent(uid)}`
  );
  diag.api2 = { status: r2.status, preview: r2.preview };

  if (r2.ok && r2.json && (r2.json.basicInfo || r2.json.basicinfo)) {
    const d = r2.json;
    const b   = d.basicInfo        || {};
    const p   = d.profileInfo      || {};
    const c   = d.clanBasicInfo    || {};
    const cap = d.captainBasicInfo || {};
    return res.status(200).json({
      player: {
        name:   b.nickname  || "N/A",
        uid:    b.accountId || uid,
        level:  b.level     || null,
        likes:  b.likes     ?? b.liked ?? null,
        region: b.region    || region,
      },
      guild: {
        name:    c.clanName  || "Guild me nahi hai",
        id:      c.clanId    || "N/A",
        level:   c.clanLevel || null,
        members: c.memberNum || null,
      },
      leader: {
        name: cap.nickname  || "N/A",
        uid:  cap.accountId || c.captainId || "N/A",
      },
      outfitIds: (p.equippedOutfit || p.clothes || []).filter(id => id && id !== 0),
      _source: "API2",
    });
  }

  // ── Dono fail — diagnostics wapas bhejo ──
  return res.status(502).json({
    error: "Dono APIs fail. Neeche diagnostics dekho:",
    diagnostics: diag,
  });
}

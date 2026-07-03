// api/player.js  —  Vercel Serverless Function
// Ye function 2 free APIs try karta hai (pehli fail ho to dusri)
// Vercel pe Node 18+ hai, fetch built-in hai — koi package nahi chahiye

const API1 = "https://freefireinfo-zy9l.onrender.com/api/v1";
const API2 = "https://free-ff-api-src-5plp.onrender.com/api/v1";

export default async function handler(req, res) {
  const { uid, region } = req.query;
  if (!uid || !region) {
    return res.status(400).json({ error: "uid aur region dono zaroori hain" });
  }

  let data = null;
  let source = "";

  // ── TRY API 1 (PRINCE — better response, has clothes/guild in one call) ──
  try {
    const r = await fetch(
      `${API1}/player-profile?uid=${encodeURIComponent(uid)}&server=${encodeURIComponent(region)}`,
      { signal: AbortSignal.timeout(50000) }
    );
    if (r.ok) {
      data = await r.json();
      source = "API1";
    }
  } catch (_) {}

  // ── FALLBACK: API 2 (jinix6) ──
  if (!data) {
    try {
      const r = await fetch(
        `${API2}/account?region=${encodeURIComponent(region)}&uid=${encodeURIComponent(uid)}`,
        { signal: AbortSignal.timeout(50000) }
      );
      if (r.ok) {
        data = await r.json();
        source = "API2";
      }
    } catch (_) {}
  }

  if (!data) {
    return res.status(502).json({
      error: "Dono APIs se data nahi aa saka. APIs down ho sakti hain ya UID/region galat hai. 1-2 min baad try karo."
    });
  }

  // ── PARSE — dono APIs ka structure alag hai, dono handle karo ──
  let result = {};

  if (source === "API1") {
    // Response: { basicinfo: {}, profileinfo: {}, clanBasicInfo: {}, captainBasicInfo: {} }
    const b   = data.basicinfo        || {};
    const p   = data.profileinfo      || {};
    const c   = data.clanBasicInfo    || {};
    const cap = data.captainBasicInfo || {};

    result = {
      player: {
        name:   b.nickname   || "N/A",
        uid:    b.accountid  || uid,
        level:  b.level      || null,
        likes:  b.liked      ?? null,
        region: b.region     || region,
      },
      guild: {
        name:    c.clanName  || "Guild me nahi hai",
        id:      c.clanId    || "N/A",
        level:   c.clanLevel || null,
        members: c.memberNum || null,
      },
      leader: {
        name: cap.nickname  || "N/A",
        uid:  cap.accountId || cap.accountid || c.captainId || "N/A",
      },
      outfitIds: (p.clothes || []).filter(id => id && id !== 0),
    };

  } else {
    // API2 Response: { basicInfo: {}, profileInfo: {}, clanBasicInfo: {}, captainBasicInfo: {} }
    const b   = data.basicInfo        || data.AccountInfo        || {};
    const p   = data.profileInfo      || data.AccountProfileInfo || {};
    const c   = data.clanBasicInfo    || data.GuildInfo          || {};
    const cap = data.captainBasicInfo || data.leaderInfo         || {};

    result = {
      player: {
        name:   b.nickname  || b.username || "N/A",
        uid:    b.accountId || uid,
        level:  b.level     || null,
        likes:  b.likes     ?? b.liked ?? null,
        region: b.region    || region,
      },
      guild: {
        name:    c.clanName  || c.GuildName || "Guild me nahi hai",
        id:      c.clanId   || c.Guildid   || c.guildID || "N/A",
        level:   c.clanLevel || null,
        members: c.memberNum || null,
      },
      leader: {
        name: cap.nickname  || "N/A",
        uid:  cap.accountId || c.captainId || "N/A",
      },
      outfitIds: (p.equippedOutfit || p.EquippedOutfit || p.clothes || []).filter(id => id && id !== 0),
    };
  }

  result._source = source;
  res.status(200).json(result);
}

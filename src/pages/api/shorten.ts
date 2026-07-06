import type { APIRoute } from 'astro';
import { readDB, writeDB, generateId, generateSecretKey, hashPassword, migrateDB } from '../../lib/db.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { url, customId, maxClicks, password, message, expiry, rouletteUrls } = body;

    // Check if roulette mode
    const isRoulette = Array.isArray(rouletteUrls) && rouletteUrls.length >= 2;

    if (isRoulette) {
      // Validate all roulette URLs
      for (const rUrl of rouletteUrls) {
        if (!rUrl || !/^https?:\/\//i.test(rUrl)) {
          return new Response(
            JSON.stringify({ error: `URL roulette tidak valid: "${rUrl}". Semua URL harus diawali http:// atau https://` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      if (rouletteUrls.length > 10) {
        return new Response(
          JSON.stringify({ error: 'Maksimal 10 URL untuk mode roulette.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Validate single URL
      if (!url || !/^https?:\/\//i.test(url)) {
        return new Response(
          JSON.stringify({ error: 'URL tidak valid. Harus diawali http:// atau https://' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Migrate DB if needed
    migrateDB();
    const db = readDB();

    // Handle custom ID
    let id = customId ? customId.trim() : '';

    if (id) {
      // Validate custom ID
      if (!/^[a-zA-Z0-9\-]+$/.test(id)) {
        return new Response(
          JSON.stringify({ error: 'Custom link hanya boleh huruf, angka, dan strip (-).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (id.length > 30) {
        return new Response(
          JSON.stringify({ error: 'Custom link maksimal 30 karakter.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Check reserved routes
      if (['api', 'kelola', 'manage', 'admin'].includes(id.toLowerCase())) {
        return new Response(
          JSON.stringify({ error: 'Kata tersebut sudah direservasi oleh sistem.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (db[id]) {
        return new Response(
          JSON.stringify({ error: 'Custom link tersebut sudah dipakai. Coba yang lain.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Auto-generate unique ID
      do {
        id = generateId();
      } while (db[id]);
    }

    // Build link entry
    const secretKey = generateSecretKey();
    const linkEntry: Record<string, any> = {
      secretKey,
      currentClicks: 0,
      createdAt: new Date().toISOString(),
    };

    // Single URL or Roulette URLs
    if (isRoulette) {
      linkEntry.urls = rouletteUrls;
      linkEntry.url = rouletteUrls[0]; // fallback display URL
      linkEntry.mode = 'roulette';
    } else {
      linkEntry.url = url;
    }

    // Optional: Burn After Read
    if (maxClicks && Number.isInteger(maxClicks) && maxClicks > 0 && maxClicks <= 100) {
      linkEntry.maxClicks = maxClicks;
    }

    // Optional: Password
    if (password && typeof password === 'string' && password.length <= 50) {
      linkEntry.password = hashPassword(password);
    }

    // Optional: Hidden Message
    if (message && typeof message === 'string' && message.length <= 200) {
      linkEntry.message = message;
    }

    // Optional: Expiry
    if (expiry) {
      const now = new Date();
      switch (expiry) {
        case '1h':
          now.setHours(now.getHours() + 1);
          break;
        case '24h':
          now.setHours(now.getHours() + 24);
          break;
        case '7d':
          now.setDate(now.getDate() + 7);
          break;
        case '30d':
          now.setDate(now.getDate() + 30);
          break;
      }
      linkEntry.expiresAt = now.toISOString();
    }

    // Save
    db[id] = linkEntry;
    writeDB(db);

    // Response features for badges
    const features: Record<string, any> = {};
    if (linkEntry.maxClicks) features.burn = linkEntry.maxClicks;
    if (linkEntry.password) features.password = true;
    if (linkEntry.message) features.message = true;
    if (linkEntry.expiresAt) features.expiry = expiry;
    if (linkEntry.mode === 'roulette') features.roulette = rouletteUrls.length;

    return new Response(
      JSON.stringify({ success: true, id, secretKey, features }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

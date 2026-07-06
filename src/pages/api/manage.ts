import type { APIRoute } from 'astro';
import { readDB, writeDB, migrateDB } from '../../lib/db.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, secretKey, url } = body;

    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: 'Secret Key wajib diisi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    migrateDB();
    const db = readDB();

    // Find link by secret key
    let foundId: string | null = null;
    let foundLink: any = null;

    for (const [id, link] of Object.entries(db)) {
      if (typeof link === 'object' && link !== null && (link as any).secretKey === secretKey) {
        foundId = id;
        foundLink = link;
        break;
      }
    }

    if (!foundId || !foundLink) {
      return new Response(
        JSON.stringify({ error: 'Secret Key tidak valid atau link tidak ditemukan.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ---- GET: Return link details ----
    if (action === 'get') {
      // Don't expose the actual password hash
      const safeLink = { ...foundLink };
      if (safeLink.password) safeLink.password = true;
      delete safeLink.secretKey;

      return new Response(
        JSON.stringify({ success: true, id: foundId, link: safeLink }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ---- UPDATE: Change target URL ----
    if (action === 'update') {
      if (!url || !/^https?:\/\//i.test(url)) {
        return new Response(
          JSON.stringify({ error: 'URL baru tidak valid.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      db[foundId].url = url;
      writeDB(db);

      return new Response(
        JSON.stringify({ success: true, message: 'URL berhasil diperbarui.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ---- DELETE: Remove link ----
    if (action === 'delete') {
      delete db[foundId];
      writeDB(db);

      return new Response(
        JSON.stringify({ success: true, message: 'Link berhasil dihapus.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Action tidak valid. Gunakan: get, update, delete.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

import type { APIRoute } from 'astro';
import { readDB, verifyPassword, recordClick, isLinkActive, migrateDB } from '../../lib/db.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, password } = body;

    if (!id || !password) {
      return new Response(
        JSON.stringify({ error: 'ID dan password wajib diisi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    migrateDB();
    const db = readDB();
    const link = db[id];

    if (!link) {
      return new Response(
        JSON.stringify({ error: 'Tautan tidak ditemukan.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!link.password) {
      return new Response(
        JSON.stringify({ error: 'Tautan ini tidak memiliki password.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if link is still active
    if (!isLinkActive(link)) {
      return new Response(
        JSON.stringify({ error: 'Tautan sudah kadaluwarsa atau hangus.' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    if (!verifyPassword(password, link.password)) {
      return new Response(
        JSON.stringify({ error: 'Password salah. Coba lagi.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Password correct — record click and return URL
    recordClick(id);

    return new Response(
      JSON.stringify({ success: true, url: link.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

import type { APIRoute } from 'astro';
import { recordClick } from '../../../lib/db.js';

export const POST: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(
      JSON.stringify({ error: 'ID tidak valid.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const link = recordClick(id);

  if (!link) {
    return new Response(
      JSON.stringify({ error: 'Link tidak ditemukan.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, clicks: link.currentClicks }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

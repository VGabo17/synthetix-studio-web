export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API Cloudflare KV (Lectura y Escritura)
    if (url.pathname === '/api/kv' && request.method === 'POST') {
      try {
        const { key, value } = await request.json();
        if (!key) return Response.json({ error: 'Clave requerida' }, { status: 400 });
        await env.SYNTHETIX_KV.put(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        return Response.json({ success: true, key, value });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (url.pathname.startsWith('/api/kv/')) {
      const key = url.pathname.replace('/api/kv/', '');
      const value = await env.SYNTHETIX_KV.get(key);
      return Response.json({ key, value: value ?? null });
    }

    // API Cloudflare R2 Storage (Subida y Descarga de Archivos)
    if (url.pathname.startsWith('/api/r2/')) {
      const filename = url.pathname.replace('/api/r2/', '');

      if (request.method === 'GET') {
        const object = await env.SYNTHETIX_R2.get(filename);
        if (!object) return new Response('Objeto no encontrado en R2', { status: 404 });
        
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        return new Response(object.body, { headers });
      }

      if (request.method === 'PUT' || request.method === 'POST') {
        await env.SYNTHETIX_R2.put(filename, request.body);
        return Response.json({ success: true, filename });
      }
    }

    // Servir Frontend desde Cloudflare Assets
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Synthetix Studio Web Worker Activo');
  }
};

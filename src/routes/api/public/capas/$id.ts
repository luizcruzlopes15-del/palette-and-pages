import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/capas/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Only public catalog cover IDs are accepted; arbitrary URLs cannot be proxied.
        if (!/^[1-9]\d{0,8}$/.test(params.id)) return new Response(null, { status: 400 });
        try {
          const upstream = await fetch(`https://covers.openlibrary.org/b/id/${params.id}-L.jpg?default=false`, { signal: AbortSignal.timeout(12000) });
          if (!upstream.ok || !upstream.headers.get("content-type")?.startsWith("image/jpeg")) return new Response(null, { status: 404 });
          const bytes = await upstream.arrayBuffer();
          if (bytes.byteLength > 2 * 1024 * 1024) return new Response(null, { status: 413 });
          return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
        } catch {
          return new Response(null, { status: 503 });
        }
      },
    },
  },
});
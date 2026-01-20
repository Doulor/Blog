
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*", // Or specific origin like "https://blog.doulor.cn"
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Range",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Only allow GET and HEAD requests
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Initialize R2 bucket (assuming binding name is 'BUCKET')
    // Ensure you have bound your R2 bucket to 'BUCKET' in wrangler.toml or Cloudflare Dashboard
    const bucket = env.BUCKET; 
    
    if (!bucket) {
      return new Response("Bucket not found", { status: 500 });
    }

    // Support Range requests (video seeking)
    const range = request.headers.get("range");
    let options = {};
    if (range) {
      options.range = parseRange(range);
    }

    const object = await bucket.get(key, options);

    if (!object) {
      return new Response("Object Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    
    // Set CORS headers for the actual response
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Accept-Ranges", "bytes");

    // Ensure Content-Type is set correctly
    if (!headers.has("content-type")) {
      if (key.endsWith(".mp4")) headers.set("content-type", "video/mp4");
      else if (key.endsWith(".webm")) headers.set("content-type", "video/webm");
      else if (key.endsWith(".ogg")) headers.set("content-type", "video/ogg");
    }
    
    // Handle Range responses
    if (range && object.range) {
      headers.set("content-range", `bytes ${object.range.offset}-${object.range.end}/${object.size}`);
    }
    
    const status = object.body ? (range ? 206 : 200) : 304;

    return new Response(object.body, {
      headers,
      status
    });
  },
};

// Helper to parse Range header
function parseRange(encoded) {
  if (encoded === null) {
    return undefined;
  }
  const parts = encoded.split("bytes=")[1]?.split("-") ?? [];
  if (parts.length !== 2) {
    return undefined;
  }
  return {
    offset: Number(parts[0]),
    length: parts[1] ? Number(parts[1]) - Number(parts[0]) + 1 : undefined,
  };
}

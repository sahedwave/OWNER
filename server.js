const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 4173;
const ROOT_DIR = __dirname;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(ROOT_DIR, "uploads");
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 404, { error: "File not found." });
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

function listUploads() {
  return fs
    .readdirSync(UPLOADS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => {
      const absolutePath = path.join(UPLOADS_DIR, entry.name);
      const stats = fs.statSync(absolutePath);
      return {
        filename: entry.name,
        createdAt: stats.birthtime.toISOString(),
        url: `/uploads/${encodeURIComponent(entry.name)}`,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function parseImageDataUrl(imageDataUrl) {
  const match = /^data:(image\/png|image\/jpeg|image\/webp);base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
  if (!match) {
    throw new Error("Unsupported image format.");
  }

  const mimeType = match[1];
  const base64 = match[2];
  const ext = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
  return {
    buffer: Buffer.from(base64, "base64"),
    ext,
  };
}

function handleUpload(request, response) {
  let rawBody = "";
  let bodyTooLarge = false;

  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    rawBody += chunk;
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      bodyTooLarge = true;
      request.destroy();
    }
  });

  request.on("close", () => {
    if (bodyTooLarge) {
      sendJson(response, 413, { error: "Upload payload is too large." });
    }
  });

  request.on("end", () => {
    if (bodyTooLarge) {
      return;
    }

    try {
      const payload = JSON.parse(rawBody || "{}");
      const { imageDataUrl } = payload;
      if (typeof imageDataUrl !== "string" || !imageDataUrl) {
        sendJson(response, 400, { error: "Missing image data." });
        return;
      }

      const { buffer, ext } = parseImageDataUrl(imageDataUrl);
      const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, buffer);
      sendJson(response, 201, { filename });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "Upload failed." });
    }
  });
}

function resolveStaticPath(urlPath) {
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const absolutePath = path.normalize(path.join(ROOT_DIR, safePath));
  if (!absolutePath.startsWith(ROOT_DIR)) {
    return null;
  }
  return absolutePath;
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === "/healthz") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/uploads") {
    sendJson(response, 200, { uploads: listUploads() });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/uploads") {
    handleUpload(request, response);
    return;
  }

  const filePath = resolveStaticPath(requestUrl.pathname);
  if (!filePath) {
    sendJson(response, 403, { error: "Forbidden." });
    return;
  }

  sendFile(response, filePath);
});

server.listen(PORT, () => {
  console.log(`OWNER running at http://localhost:${PORT}`);
});

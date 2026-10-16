const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8"
};

http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const requestedPath = path.resolve(root, `.${pathname}`);

    if (!requestedPath.startsWith(`${root}${path.sep}`) && requestedPath !== root) {
        response.writeHead(403).end("Forbidden");
        return;
    }

    const filePath = requestedPath === root
        ? path.join(root, "index.html")
        : requestedPath;

    fs.readFile(filePath, (error, content) => {
        if (error) {
            response.writeHead(404).end("Not found");
            return;
        }

        response.writeHead(200, {
            "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
        });
        response.end(content);
    });
}).listen(4173, "127.0.0.1");

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import serverRoutes from "./routes/serverRoutes";
import channelRoutes from "./routes/channelRoutes";
import userRoutes from "./routes/userRoutes";
import dmRoutes from "./routes/dmRoutes";
import embedRoutes from "./routes/embedRoutes";
import { initSocket } from "./sockets";

const app = express();
const server = http.createServer(app);
const io = initSocket(server);
const backendVersion = (() => {
  try {
    const packageJsonPath = path.resolve(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: string };
    return packageJson.version ?? "unknown";
  } catch {
    return "unknown";
  }
})();

const normalizeOrigin = (value: string): string => {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/$/, "");
  }
};

const allowedOrigins = `${process.env.FRONTEND_ORIGIN ?? ""},${process.env.ADMIN_TOOL_ORIGIN ?? ""}`
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

app.set("io", io);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const requestOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/uploads/attachments/:fileName", (req, res, next) => {
  const requestedName = typeof req.query.name === "string" && req.query.name.trim().length > 0
    ? req.query.name
    : req.params.fileName;
  const safeName = path.basename(requestedName).replace(/[\r\n"]/g, "_");
  const dispositionType = req.query.download === "1" ? "attachment" : "inline";
  const encodedName = encodeURIComponent(safeName);

  res.setHeader("Content-Disposition", `${dispositionType}; filename="${safeName}"; filename*=UTF-8''${encodedName}`);
  next();
});

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads"), { maxAge: "7d" }));

const healthHandler = (_req: express.Request, res: express.Response): void => {
  res.json({ ok: true, service: "windcord-backend", version: backendVersion });
};

const versionHandler = (_req: express.Request, res: express.Response): void => {
  res.json({ version: backendVersion });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);
app.get("/version", versionHandler);
app.get("/api/version", versionHandler);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/chat", channelRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dms", dmRoutes);
app.use("/api/embeds", embedRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ message: err.message || "Internal server error" });
});

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Windcord backend listening on http://localhost:${port}`);
});




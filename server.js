import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { connect } from "./database/index.js";
import { initWebSocketServer } from "./utils/webSocket.js";
import { autoRegisterRoutes } from "./utils/autoRoute.js";
import { fileURLToPath } from "url";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 3000;

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

// http服务器
const app = express();
const server = http.createServer(app);

// WebSocket服务器并配置跨域
initWebSocketServer(server);

// Express配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 连接MongoDB及Minio
await connect();

// 自动注册路由
autoRegisterRoutes(app, path.join(DIRNAME, "routes"));

server.listen(PORT, HOST, () => {
    console.log(`服务启动于：${HOST}:${PORT}\n`);
});

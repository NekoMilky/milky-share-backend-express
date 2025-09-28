import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { HttpError } from "./utils/errorHandler.js";
import { connect } from "./database.js";
import { initWebSocketServer } from "./utils/webSocket.js";
import { autoRegisterRoutes } from "./utils/autoRoute.js";
import { fileURLToPath } from "url";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "3000");

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

// 启动服务
const boot = async () => {
    // 连接MongoDB及Minio
    await connect();
    // 拒绝http请求
    app.use((request: Request, response: Response, next: NextFunction) => {
        const isHttps = request.secure || 
            (request.headers["x-forwarded-proto"] && 
            request.headers["x-forwarded-proto"] === "https");
        if (!isHttps) {
            return response.status(403).json({ message: "请使用https协议" });
        }
        next();
    });
    // 自动注册路由
    await autoRegisterRoutes(app, path.join(DIRNAME, "routes"));
    // 错误处理
    app.use((error: Error, request: Request, response: Response, next: NextFunction) => {
        console.error(error);
        if (error instanceof HttpError) {
            return response.status(error.statusCode).json({ message: error.message });
        }
        response.status(500).json({ message: "服务器内部错误" });
    });
    // 启动服务
    server.listen(PORT, HOST, () => {
        console.log(`服务启动于：${HOST}:${PORT}\n`);
    });
};
boot();

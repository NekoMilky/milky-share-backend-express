import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import { connect } from "./database/index.js";

import uploadMusicRoute from "./routes/music/upload.js";
import getMusicRoute from "./routes/music/get.js";
import getMusicListRoute from "./routes/music/get_all.js";
import starMusicRoute from "./routes/music/star.js";
import getStaredMusicListRoute from "./routes/music/get_all_stared.js";
import registerRoute from "./routes/user/register.js";
import loginRoute from "./routes/user/login.js";
import getUserRoute from "./routes/user/get.js";
import saveUserProfileRoute from "./routes/user/save_profile.js";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;

// http服务器
const app = express();
const server = http.createServer(app);

// WebSocket服务器并配置跨域
export const wss = new WebSocketServer({
    server, 
    cors: {
        origin: FRONTEND_URL, 
        methods: ["GET", "POST"]
    }
});
wss.on("connection", (ws) => {
    ws.on("error", (error) => {
        console.error("WebSocket错误：", error);
    });
});

// Express配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 连接MongoDB及Minio
await connect();

app.use("/", uploadMusicRoute);
app.use("/", getMusicRoute);
app.use("/", getMusicListRoute);
app.use("/", starMusicRoute);
app.use("/", getStaredMusicListRoute);
app.use("/", registerRoute);
app.use("/", loginRoute);
app.use("/", getUserRoute);
app.use("/", saveUserProfileRoute);

server.listen(PORT, HOST, () => {
    console.log(`服务启动于：${HOST}:${PORT}\n`);
});

import http from "http";
import { WebSocketServer, WebSocket } from "ws";

const FRONTEND_URL = process.env.FRONTEND_URL;

let wss: WebSocketServer | null = null;
export const initWebSocketServer = (server: http.Server) => {
    wss = new WebSocketServer({ server });
    // 连接
    wss.on("connection", (ws) => {
        ws.on("error", (error) => {
            console.error("WebSocket错误：", error);
        });
    });
};

export const sentToClients = (object: Object) => {
    if (!wss) {
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(object));
        }
    });
};

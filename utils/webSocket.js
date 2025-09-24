import { WebSocketServer, WebSocket } from "ws";

const FRONTEND_URL = process.env.FRONTEND_URL;

let wss = null;
export const initWebSocketServer = (server) => {
    wss = new WebSocketServer({
        server, 
        cors: {
            origin: FRONTEND_URL, 
            methods: ["GET", "POST"]
        }
    });

    // 连接
    wss.on("connection", (ws) => {
        ws.on("error", (error) => {
            console.error("WebSocket错误：", error);
        });
    });
};

export const sentToClients = (object) => {
    if (!wss) {
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(object));
        }
    });
};

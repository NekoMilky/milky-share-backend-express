import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { WebSocket } from "ws";
import { wss } from "../../server.js";
import { user, s3Client, BUCKETNAME } from "../../database/index.js";

const router = express.Router();
const storage = multer.diskStorage({
    destination: (request, file, cb) => {
        const tempDir = "temp";
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (request, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({
    storage: storage
});

// 保存档案接口
router.post("/user/save_profile",
    upload.fields([
        { name: "avatar", maxCount: 1 }
    ]),
    // 处理请求
    async (request, response) => {
        try {
            const avatarFile = request.files["avatar"] ? request.files["avatar"][0] : null;
            // 解析元数据
            const { id, nickname } = request.body;
            const requiredFields = { id, nickname };
            for (const [key, value] of Object.entries(requiredFields)) {
                if (!value || value === "") {
                    return response.status(400).json({ message: `缺少${key}参数` });
                }
            }
            // 根据id查询数据库
            const userInfo = await user.findById(id);
            if (!userInfo) {
                return response.status(404).json({ message: "未找到id对应的用户" });
            }
            // 上传头像文件
            let avatarObjectName = null;
            if (avatarFile) {
                const avatarFilePostfix = path.extname(avatarFile.originalname);
                avatarObjectName = `avatar/${id}${avatarFilePostfix}`;
                await s3Client.fPutObject(BUCKETNAME, avatarObjectName, avatarFile.path);
            }
            // 存储元数据
            userInfo.nickname = nickname;
            userInfo.avatar_path = avatarObjectName || userInfo.avatar_path;
            await user.findByIdAndUpdate(id, userInfo);
            // 向客户端发送更新消息
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "profile_updated",
                        id: id
                    }));
                }
            });
            response.json({ message: "档案保存成功" });
        }
        catch (error) {
            console.error("档案保存失败：", error);
            response.status(500).json({ message: "档案保存失败" });
        }
        finally {
            // 清理临时文件
            if (request.files) {
                const files = Object.values(request.files).flat();
                await Promise.all(files.map((file) => 
                    fs.promises.unlink(file.path).catch(() => {})
                ));
            }
        }
    });

export default router;

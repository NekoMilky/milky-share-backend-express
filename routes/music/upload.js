import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { WebSocket } from "ws";
import { wss } from "../../server.js";
import { song, s3Client, BUCKETNAME } from "../../database/index.js";

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

const removeSpecialChar = (string) => {
    return string.replace(/[\/\\:*?"<>|]/g, " ");
}

// 上传音乐接口
router.post("/music/upload",
    // 同时处理音乐文件和封面文件
    upload.fields([
        { name: "file", maxCount: 1 },
        { name: "cover", maxCount: 1 }
    ]),
    // 处理请求
    async (request, response) => {
        try {
            const musicFile = request.files["file"] ? request.files["file"][0] : null;
            const coverFile = request.files["cover"] ? request.files["cover"][0] : null;
            if (!musicFile) {
                return response.status(400).json({ message: "没有上传音频文件" });
            }
            // 解析元数据
            const { title, artist, album, duration } = request.body;
            const requiredFields = { title, artist, album, duration };
            for (const [key, value] of Object.entries(requiredFields)) {
                if (!value || value === "") {
                    return response.status(400).json({ message: `缺少${key}参数` });
                }
            }
            // 生成文件名
            const filenameTitle = removeSpecialChar(title);
            const filenameArtist = removeSpecialChar(artist);
            const filenameAlbum = removeSpecialChar(album);
            const filename = `${filenameTitle}_${filenameArtist}_${filenameAlbum}`;
            // 禁止重复上传
            const musicFilePostfix = path.extname(musicFile.originalname);
            const musicObjectName = `music/${filename}${musicFilePostfix}`;
            try {
                await s3Client.statObject(BUCKETNAME, musicObjectName);
                return response.status(409).json({ message: "音频文件已存在，请勿重复上传" });
            } catch (error) {
                if (error.code !== "NotFound") {
                    return response.status(500).json({ message: "检查音频文件时出错" });
                }
            }
            // 上传音乐文件
            await s3Client.fPutObject(BUCKETNAME, musicObjectName, musicFile.path);
            // 上传封面文件
            let coverObjectName = null;
            if (coverFile) {
                const coverFilePostfix = path.extname(coverFile.originalname);
                coverObjectName = `cover/${filename}_cover${coverFilePostfix}`;
                await s3Client.fPutObject(BUCKETNAME, coverObjectName, coverFile.path);
            }
            // 存储元数据
            await song.create({
                title: title,
                artist: artist,
                album: album,
                duration: duration,
                music_path: musicObjectName,
                cover_path: coverObjectName,
            });
            // 向客户端发送更新消息
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "music_uploaded"
                    }));
                }
            });
            response.json({ message: "音乐上传成功" });
        }
        catch (error) {
            console.error("音乐上传失败：", error);
            response.status(500).json({ message: "音乐上传失败" });
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

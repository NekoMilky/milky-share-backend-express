import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { checkEmptyFields } from "../../utils/utility.js";
import { sentToClients } from "../../utils/webSocket.js";
import { playlist, s3Client, BUCKETNAME } from "../../database/index.js";

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

// 保存歌单信息接口
router.post("/",
    upload.fields([
        { name: "cover", maxCount: 1 }
    ]),
    // 处理请求
    async (request, response) => {
        try {
            const coverFile = request.files["cover"] ? request.files["cover"][0] : null;
            const { playlistId, name } = request.body;
            const empty = checkEmptyFields({ playlistId, name }, { playlistId: "歌单id", name: "歌单名" });
            if (empty) {
                return response.status(400).json({ message: empty });
            }
            // 查询存在性
            const playlistInfo = await playlist.findById(playlistId).select("cover_path create_user");
            if (!playlistInfo) {
                return response.status(404).json({ message: "未找到对应歌单" });
            }
            // 上传封面文件
            let coverObjectName = null;
            if (coverFile) {
                const coverFilePostfix = path.extname(coverFile.originalname);
                coverObjectName = `playlist_cover/${playlistId}${coverFilePostfix}`;
                await s3Client.fPutObject(BUCKETNAME, coverObjectName, coverFile.path);
            }
            // 存储元数据
            playlistInfo.name = name;
            playlistInfo.cover_path = coverObjectName || playlistInfo.cover_path;
            await playlist.findByIdAndUpdate(playlistId, playlistInfo);
            // 向客户端发送更新消息
            sentToClients({ message: "update_playlist", userId: playlistInfo.create_user });
            response.json({ message: "歌单信息保存成功" });
        }
        catch (error) {
            console.error("歌单信息保存失败：", error);
            response.status(500).json({ message: "歌单信息保存失败" });
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

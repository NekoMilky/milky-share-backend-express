import express from "express";
import multer from "multer";
import { song, s3Client, BUCKETNAME } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 获取音乐接口
router.post("/music/get", upload.none(), async (request, response) => {
    try {
        const { id } = request.body;
        if (!id || id === "") {
            return response.status(400).json({ message: "缺少id参数" });
        }
        // 根据id查询数据库
        const musicInfo = await song.findById(id);
        if (!musicInfo) {
            return response.status(404).json({ message: "未找到id对应的音乐" });
        }
        // 音乐url
        const url = await s3Client.presignedGetObject(BUCKETNAME, musicInfo.music_path, 24 * 60 * 60);
        // 封面url
        let cover = null;
        if (musicInfo.cover_path) {
            cover = await s3Client.presignedGetObject(BUCKETNAME, musicInfo.cover_path, 24 * 60 * 60);
        }
        response.json({
            message: "获取音乐成功",
            song: {
                id: id,
                url: url,
                cover: cover,
                title: musicInfo.title,
                artist: musicInfo.artist,
                album: musicInfo.album
            }
        });
    } 
    catch (error) {
        console.error("获取音乐失败：", error);
        response.status(500).json({ message: "获取音乐失败" });
    }
});

export default router;

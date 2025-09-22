import express from "express";
import multer from "multer";
import { star, s3Client, BUCKETNAME } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 获取收藏音乐列表接口
router.post("/music/get_all_stared", upload.none(), async (request, response) => {
    try {
        const { userId } = request.body;
        if (!userId || userId === "") {
            return response.status(400).json({ message: `缺少userId参数` });
        }
        const stars = await star.find({ user: userId }).populate("song", "_id title artist album duration cover_path");
        const musicList = await Promise.all(
            stars.map(async (item) => {
                const song = item.song;
                // 封面url
                let cover = null;
                if (song.cover_path) {
                    cover = await s3Client.presignedGetObject(BUCKETNAME, song.cover_path, 24 * 60 * 60);
                }
                return {
                    id: song._id,
                    title: song.title,
                    artist: song.artist,
                    album: song.album,
                    duration: song.duration,
                    cover: cover
                };
            })
        );
        response.json({ 
            message: "获取收藏音乐列表成功",
            songs: musicList
        });
    }
    catch (error) {
        console.error("获取收藏音乐列表失败：", error);
        response.status(500).json({ message: "获取收藏音乐列表失败" });
    }
});

export default router;

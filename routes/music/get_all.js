import express from "express";
import { song, s3Client, BUCKETNAME } from "../../database/index.js";

const router = express.Router();

// 获取音乐列表接口
router.get("/music/get_all", async (request, response) => {
    try {
        // 获取元数据
        const songs = await song.find();
        const musicList = await Promise.all(
            songs.map(async (song) => {
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
            message: "获取音乐列表成功",
            songs: musicList
        });
    } 
    catch (error) {
        console.error("获取音乐列表失败：", error);
        response.status(500).json({ message: "获取音乐列表失败" });
    }
});

export default router;

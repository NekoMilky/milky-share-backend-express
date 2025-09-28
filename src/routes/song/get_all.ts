import express from "express";
import { song, s3Client, BUCKETNAME } from "../../database.js";
import { errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 获取歌曲列表接口
router.get("/", errorHandler(async (request, response) => {
    // 获取元数据
    const songs = await song.find().select("_id title artist album duration cover_path uploader");
    const songList = await Promise.all(
        songs.map(async (item) => {
            // 封面url
            let cover = null;
            if (item.cover_path) {
                cover = await s3Client.presignedGetObject(BUCKETNAME, item.cover_path, 24 * 60 * 60);
            }
            return {
                id: item._id,
                title: item.title,
                artist: item.artist,
                album: item.album,
                duration: item.duration,
                uploader: item.uploader,
                cover: cover
            };
        })
    );
    response.json({
        message: "获取歌曲列表成功",
        songs: songList
    });
}));

export default router;

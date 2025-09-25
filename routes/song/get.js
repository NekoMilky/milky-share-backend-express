import express from "express";
import multer from "multer";
import { checkEmptyField } from "../../utils/utility.js";
import { song, s3Client, BUCKETNAME } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 获取歌曲接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { songId } = request.body;
        const empty = checkEmptyField(songId, "歌曲id");
        if (empty) {
            return response.status(400).json({ message: empty });
        }
        // 查询存在性
        const songInfo = await song.findById(songId).select("_id title artist album song_path cover_path uploader");
        if (!songInfo) {
            return response.status(404).json({ message: "未找到对应歌曲" });
        }
        // 歌曲url
        const url = await s3Client.presignedGetObject(BUCKETNAME, songInfo.song_path, 24 * 60 * 60);
        // 封面url
        let cover = null;
        if (songInfo.cover_path) {
            cover = await s3Client.presignedGetObject(BUCKETNAME, songInfo.cover_path, 24 * 60 * 60);
        }
        response.json({
            message: "获取歌曲成功",
            song: {
                id: songId,
                url: url,
                cover: cover,
                title: songInfo.title,
                artist: songInfo.artist,
                album: songInfo.album,
                uploader: songInfo.uploader
            }
        });
    } 
    catch (error) {
        console.error("获取歌曲失败：", error);
        response.status(500).json({ message: "获取歌曲失败" });
    }
});

export default router;

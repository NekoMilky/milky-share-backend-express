import express from "express";
import multer from "multer";
import { playlist, song, playlistSong, s3Client, BUCKETNAME } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 获取歌单的歌曲列表接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { playlistId } = request.body;
        const requiredFields = { playlistId };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value || value === "") {
                return response.status(400).json({ message: `缺少${key}参数` });
            }
        }
        // 查询存在性
        if (!await playlist.findById(playlistId).select("id")) {
            return response.status(404).json({ message: "未找到对应歌单" });
        }
        // 获取元数据
        const songs = await playlistSong.find({ playlist_id: playlistId }).select("song_id");
        const songList = await Promise.all(
            songs.map(async (item) => {
                const songId = item.song_id;
                const songInfo = await song.findById(songId).select("title artist album duration cover_path uploader");
                // 封面url
                let cover = null;
                if (songInfo.cover_path) {
                    cover = await s3Client.presignedGetObject(BUCKETNAME, songInfo.cover_path, 24 * 60 * 60);
                }
                return {
                    id: songId,
                    title: songInfo.title,
                    artist: songInfo.artist,
                    album: songInfo.album,
                    duration: songInfo.duration,
                    uploader: songInfo.uploader,
                    cover: cover
                };
            })
        );
        response.json({
            message: "获取歌单的歌曲列表成功",
            songs: songList
        });
    } 
    catch (error) {
        console.error("获取歌单的歌曲列表失败：", error);
        response.status(500).json({ message: "获取歌单的歌曲列表失败" });
    }
});

export default router;

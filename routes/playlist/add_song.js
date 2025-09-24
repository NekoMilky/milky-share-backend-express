import express from "express";
import multer from "multer";
import { playlist, song, playlistSong } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 往歌单添加歌曲接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { playlistId, songId } = request.body;
        const requiredFields = { playlistId, songId };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value || value === "") {
                return response.status(400).json({ message: `缺少${key}参数` });
            }
        }
        // 查询存在性
        if (!await playlist.findById(playlistId).select("_id")) {
            return response.status(404).json({ message: "未找到对应歌单" });
        }
        if (!await song.findById(songId).select("_id")) {
            return response.status(404).json({ message: "未找到对应歌曲" });
        }
        // 存储数据
        await playlistSong.create({
            playlist_id: playlistId,
            song_id: songId
        });
        response.json({ message: "添加歌曲成功" });
    } 
    catch (error) {
        console.error("添加歌曲失败：", error);
        response.status(500).json({ message: "添加歌曲失败" });
    }
});

export default router;

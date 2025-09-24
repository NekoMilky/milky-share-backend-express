import express from "express";
import multer from "multer";
import { song, playlistSong, s3Client, BUCKETNAME } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 删除歌曲接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { userId, songId } = request.body;
        const requiredFields = { userId, songId };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value || value === "") {
                return response.status(400).json({ message: `缺少${key}参数` });
            }
        }
        // 查询存在性
        const songInfo = await song.findById(songId).select("song_path cover_path uploader");
        if (!songInfo) {
            return response.status(404).json({ message: "未找到对应歌曲" });
        }
        if (songInfo.uploader.toString() !== userId) {
            return response.status(403).json({ message: "你没有权限删除歌曲" });
        }
        // 删除歌曲文件
        await s3Client.removeObject(BUCKETNAME, songInfo.song_path);
        // 删除封面文件
        if (songInfo.cover_path) {
            await s3Client.removeObject(BUCKETNAME, songInfo.cover_path);
        }
        // 删除元数据
        await playlistSong.deleteMany({ song_id: songId });
        await song.findByIdAndDelete(songId);
        response.json({
            message: "删除歌曲成功"
        });
    } 
    catch (error) {
        console.error("删除歌曲失败：", error);
        response.status(500).json({ message: "删除歌曲失败" });
    }
});

export default router;

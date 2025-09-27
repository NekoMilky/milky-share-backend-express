import express from "express";
import multer from "multer";
import { checkEmptyFields } from "../../utils/utility.js";
import { user, playlist, song, playlistSong } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 获取用户创建的歌单中包含当前歌曲接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { userId, songId } = request.body;
        const empty = checkEmptyFields({ userId, songId }, { userId: "用户id", songId: "歌曲id" });
        if (empty) {
            return response.status(400).json({ message: empty });
        }
        // 查询存在性
        if (!await user.findById(userId).select("_id")) {
            return response.status(404).json({ message: "未找到对应用户" });
        }
        if (!await song.findById(songId).select("_id")) {
            return response.status(404).json({ message: "未找到对应歌曲" });
        }
        // 查询用户创建的所有歌单
        const playlists = await playlist.find({ create_user: userId }).select("_id name");
        const playlistList = await Promise.all(
            playlists.map(async (item) => {
                const starData = await playlistSong.findOne({ playlist_id: item._id, song_id: songId }).select("_id");
                return {
                    id: item._id,
                    name: item.name,
                    hasStared: starData ? true : false
                };
            })
        );
        response.json({ 
            message: "查询歌单成功",
            playlists: playlistList
        });
    } 
    catch (error) {
        console.error("查询歌单失败：", error);
        response.status(500).json({ message: "查询歌单失败" });
    }
});

export default router;

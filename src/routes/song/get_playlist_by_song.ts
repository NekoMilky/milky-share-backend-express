import express from "express";
import { checkEmptyFields } from "../../utils/utility.js";
import { user, playlist, song, playlistSong } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 获取用户创建的歌单中包含当前歌曲接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { userId, songId } = request.body;
    const empty = checkEmptyFields(
        { userId, songId }, 
        { userId: "用户id", songId: "歌曲id" }
    );
    if (empty) {
        throw new HttpError(empty, 400);
    }
    // 查询存在性
    if (!await user.findById(userId).select("_id")) {
        throw new HttpError("未找到用户", 404);
    }
    if (!await song.findById(songId).select("_id")) {
        throw new HttpError("未找到歌曲", 404);
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
}));

export default router;

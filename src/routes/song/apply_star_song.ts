import express from "express";
import { checkEmptyFields } from "../../utils/utility.js";
import { user, playlist, song, playlistSong } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 批量收藏歌曲接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { userId, songId, starInfo } = request.body;
    const empty = checkEmptyFields(
        { userId, songId, starInfo }, 
        { userId: "用户id", songId: "歌曲id", starInfo: "收藏映射" }
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
    // 遍历收藏映射并执行收藏/取消
    const result = await Promise.all(
        Object.keys(starInfo).map(async (playlistId) => {
            try {
                const playlistInfo = await playlist.findById(playlistId).select("create_user");
                if (!playlistInfo) {
                    throw new Error("未找到歌单");
                }
                if (playlistInfo.create_user.toString() !== userId) {
                    throw new Error("权限不足");
                }
                const starData = await playlistSong.findOne({ playlist_id: playlistId, song_id: songId }).select("_id");
                if (starInfo[playlistId]) {
                    // 收藏
                    if (!starData) {
                        await playlistSong.create({ playlist_id: playlistId, song_id: songId });
                    }
                    return 1;
                }
                // 取消收藏
                else if (starData) {
                    await playlistSong.deleteOne({ playlist_id: playlistId, song_id: songId });
                }
                return 0;
            }
            catch (error) {
                console.error(`对歌单${playlistId}操作时发生了错误：`, error);
                return 0;
            }
        })
    );
    const count = result.reduce((answer: number, current: number) => {
        return answer + current;
    }, 0);
    response.json({ message: `已添加歌曲至${count}个歌单中` });
}));

export default router;

import express from "express";
import { checkEmptyFields } from "../../utils/utility.js";
import { user, playlist, song, playlistSong } from "../../database/index.js";

const router = express.Router();

// 批量收藏歌曲接口
router.post("/", express.json(), async (request, response) => {
    try {
        const { userId, songId, starInfo } = request.body;
        const empty = checkEmptyFields({ userId, songId, starInfo }, { userId: "用户id", songId: "歌曲id", starInfo: "收藏映射" });
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
        // 遍历收藏映射并执行收藏/取消
        const result = await Promise.all(
            Object.keys(starInfo).map(async (playlistId) => {
                try {
                    const playlistInfo = await playlist.findById(playlistId).select("create_user");
                    if (!playlistInfo) {
                        throw Error("无法找到对应的歌单");
                    }
                    if (playlistInfo.create_user.toString() !== userId) {
                        throw Error("当前用户没有操作权限");
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
        const count = result.reduce((answer, current) => {
            return answer + current;
        }, 0);
        response.json({ message: `已收藏歌曲至${count}个收藏夹中` });
    } 
    catch (error) {
        console.error("收藏歌曲失败：", error);
        response.status(500).json({ message: "收藏歌曲失败" });
    }
});

export default router;

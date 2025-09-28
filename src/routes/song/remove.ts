import express from "express";
import { checkEmptyFields } from "../../utils/utility.js";
import { song, playlistSong, s3Client, BUCKETNAME } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 删除歌曲接口
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
    const songInfo = await song.findById(songId).select("song_path cover_path uploader");
    if (!songInfo) {
        throw new HttpError("未找到歌曲", 404);
    }
    // 权限校验
    if (songInfo.uploader.toString() !== userId) {
        throw new HttpError("权限不足", 403);
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
}));

export default router;

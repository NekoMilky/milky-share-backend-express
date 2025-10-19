import express from "express";
import { checkEmptyField } from "../../utils/utility.js";
import { user, song, s3Client, BUCKETNAME } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 获取歌曲接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { songId } = request.body;
    const empty = checkEmptyField(songId, "歌曲id");
    if (empty) {
        throw new HttpError(empty, 400);
    }
    // 查询存在性
    const songInfo = await song.findById(songId).select("_id title artist album song_path cover_path uploader lyrics");
    if (!songInfo) {
        throw new HttpError("未找到歌曲", 404);
    }
    // 歌曲url
    const url = await s3Client.presignedGetObject(BUCKETNAME, songInfo.song_path, 24 * 60 * 60);
    // 封面url
    let cover = null;
    if (songInfo.cover_path) {
        cover = await s3Client.presignedGetObject(BUCKETNAME, songInfo.cover_path, 24 * 60 * 60);
    }
    // 上传者
    const uploaderInfo = await user.findById(songInfo.uploader).select("nickname avatar_path");
    if (!uploaderInfo) {
        throw new HttpError("未找到上传者信息", 404);
    }
    // 头像url
    let avatar = null;
    if (uploaderInfo.avatar_path) {
        avatar = await s3Client.presignedGetObject(BUCKETNAME, uploaderInfo.avatar_path, 24 * 60 * 60);
    }
    const uploaderObject = { 
        id: songInfo.uploader, 
        nickname: uploaderInfo.nickname, 
        avatar: avatar 
    };
    response.json({
        message: "获取歌曲成功",
        song: {
            id: songId,
            url: url,
            cover: cover,
            title: songInfo.title,
            artist: songInfo.artist,
            album: songInfo.album,
            uploader: uploaderObject,
            lyrics: songInfo.lyrics
        }
    });
}));

export default router;

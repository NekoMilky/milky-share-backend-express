import express from "express";
import { user, song, s3Client, BUCKETNAME } from "../../database.js";
import { errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 获取歌曲列表接口
router.get("/", errorHandler(async (request, response) => {
    // 获取元数据
    const uploaderInfos: Record<string, unknown> = {};
    const songs = await song.find().select("_id title artist album duration cover_path uploader");
    const songList = await Promise.all(
        songs.map(async (item) => {
            const songId = item._id;
            try {
                // 封面url
                let cover = null;
                if (item.cover_path) {
                    cover = await s3Client.presignedGetObject(BUCKETNAME, item.cover_path, 24 * 60 * 60);
                }
                // 上传者
                const uploaderId = item.uploader.toString();
                let uploaderObject;
                if (Object.keys(uploaderInfos).includes(uploaderId)) {
                    uploaderObject = uploaderInfos[uploaderId];
                }
                else {
                    const uploaderInfo = await user.findById(item.uploader).select("nickname avatar_path");
                    if (!uploaderInfo) {
                        throw new Error("未找到上传者信息");
                    }
                    let uploaderAvatar = null;
                    // 头像url
                    if (uploaderInfo.avatar_path) {
                        uploaderAvatar = await s3Client.presignedGetObject(BUCKETNAME, uploaderInfo.avatar_path, 24 * 60 * 60);
                    }
                    uploaderObject = { 
                        id: item.uploader, 
                        nickname: uploaderInfo.nickname, 
                        avatar: uploaderAvatar 
                    };
                    uploaderInfos[uploaderId] = uploaderObject;
                }
                return {
                    id: songId,
                    title: item.title,
                    artist: item.artist,
                    album: item.album,
                    duration: item.duration,
                    uploader: uploaderObject,
                    cover: cover
                };
            }
            catch (error) {
                console.error(`获取歌曲${songId}时发生了错误：`, error);
            }
        })
    );
    response.json({
        message: "获取歌曲列表成功",
        songs: songList
    });
}));

export default router;

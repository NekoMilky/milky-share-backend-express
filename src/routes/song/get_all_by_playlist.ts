import express from "express";
import { checkEmptyField } from "../../utils/utility.js";
import { playlist, song, playlistSong, s3Client, BUCKETNAME } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 获取歌单的歌曲列表接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { playlistId } = request.body;
    const empty = checkEmptyField(playlistId, "歌单id");
    if (empty) {
        throw new HttpError(empty, 400);
    }
    // 查询存在性
    if (!await playlist.findById(playlistId).select("id")) {
        throw new HttpError("未找到歌单", 404);
    }
    // 获取元数据
    const songs = await playlistSong.find({ playlist_id: playlistId }).select("song_id");
    const songList = await Promise.all(
        songs.map(async (item) => {
            const songId = item.song_id;
            try {
                const songInfo = await song.findById(songId).select("title artist album duration cover_path uploader");
                if (!songInfo) {
                    throw new Error("未找到歌曲");
                }
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
            }
            catch (error) {
                console.error(`获取歌单${playlistId}的歌曲${songId}时发生了错误：`, error);
                return {};
            }
        })
    );
    response.json({
        message: "获取歌单的歌曲列表成功",
        songs: songList
    });
}));

export default router;

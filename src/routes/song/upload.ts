import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { S3Error } from "minio";
import { HttpError } from "../../utils/errorHandler.js";
import { checkEmptyFields } from "../../utils/utility.js";
import { sentToClients } from "../../utils/webSocket.js";
import { song, user, s3Client, BUCKETNAME } from "../../database.js";

const router = express.Router();
const storage = multer.diskStorage({
    destination: (request, file, cb) => {
        const tempDir = "temp";
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (request, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage: storage });

const removeSpecialChar = (string: string) => {
    return string.replace(/[\/\\:*?"<>|]/g, " ");
}

// 上传歌曲接口
router.post("/",
    // 同时处理歌曲文件和封面文件
    upload.fields([
        { name: "song", maxCount: 1 },
        { name: "cover", maxCount: 1 }
    ]),
    // 处理请求
    async (request, response, next) => {
        try {
            const files = request.files as { [name: string]: Express.Multer.File[] } | undefined;
            const songFile = files?.["song"] ? files["song"][0] : null;
            if (!songFile) {
                throw new HttpError("缺失音频文件", 400);
            }
            const coverFile = files?.["cover"] ? files["cover"][0] : null;
            // 解析元数据
            const { title, artist, album, duration, userId } = request.body;
            const empty = checkEmptyFields(
                { title, artist, album, duration, userId }, 
                { title: "标题", artist: "艺术家", album: "专辑", duration: "时长", userId: "用户id" }
            );
            if (empty) {
                throw new HttpError(empty, 400);
            }
            // 查询存在性
            if (!await user.findById(userId).select("_id")) {
                throw new HttpError("未找到用户", 404);
            }
            // 生成文件名
            const filenameTitle = removeSpecialChar(title);
            const filenameArtist = removeSpecialChar(artist);
            const filenameAlbum = removeSpecialChar(album);
            const filename = `${filenameTitle}_${filenameArtist}_${filenameAlbum}`;
            // 禁止重复上传
            const songFilePostfix = path.extname(songFile.originalname);
            const songObjectName = `song/${filename}${songFilePostfix}`;
            try {
                await s3Client.statObject(BUCKETNAME, songObjectName);
                throw new HttpError("请勿重复上传", 409);
            } catch (error) {
                if (error instanceof HttpError) {
                    throw error;
                }
                const S3Error = error as S3Error;
                if (S3Error.code !== "NotFound") {
                    throw new HttpError("检查音频文件时出错", 500);
                }
            }
            // 上传音乐文件
            await s3Client.fPutObject(BUCKETNAME, songObjectName, songFile.path);
            // 上传封面文件
            let coverObjectName = null;
            if (coverFile) {
                const coverFilePostfix = path.extname(coverFile.originalname);
                coverObjectName = `cover/${filename}_cover${coverFilePostfix}`;
                await s3Client.fPutObject(BUCKETNAME, coverObjectName, coverFile.path);
            }
            // 存储元数据
            const newSong = await song.create({
                title: title,
                artist: artist,
                album: album,
                duration: duration,
                uploader: userId,
                song_path: songObjectName,
                cover_path: coverObjectName,
            });
            // 向客户端发送更新消息
            sentToClients({ message: "update_all_song" });
            response.json({ 
                message: "歌曲上传成功",
                song: {
                    id: newSong._id
                } 
            });
        }
        catch (error) {
            next(error);
        }
        finally {
            // 清理临时文件
            if (request.files) {
                const files = Object.values(request.files).flat();
                await Promise.all(files.map((file) => 
                    fs.promises.unlink(file.path).catch(() => {})
                ));
            }
        }
    });

export default router;

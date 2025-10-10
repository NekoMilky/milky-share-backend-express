import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { checkEmptyFields } from "../../utils/utility.js";
import { sentToClients } from "../../utils/webSocket.js";
import { HttpError } from "../../utils/errorHandler.js";
import { playlist, s3Client, BUCKETNAME } from "../../database.js";

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

// 保存歌单信息接口
router.post("/",
    // 处理封面文件
    upload.fields([
        { name: "cover", maxCount: 1 }
    ]),
    // 处理请求
    async (request, response, next) => {
        try {
            const files = request.files as { [name: string]: Express.Multer.File[] } | undefined;
            const coverFile = files?.["cover"] ? files["cover"][0] : null;
            const { operatorUserId, playlistId, name } = request.body;
            const empty = checkEmptyFields(
                { operatorUserId, playlistId, name }, 
                { operatorUserId: "操作用户id", playlistId: "歌单id", name: "歌单名" }
            );
            if (empty) {
                throw new HttpError(empty, 400);
            }
            // 查询存在性
            const playlistInfo = await playlist.findById(playlistId).select("cover_path create_user");
            if (!playlistInfo) {
                throw new HttpError("未找到歌单", 404);
            }
            // 权限校验
            if (playlistInfo.create_user.toString() !== operatorUserId) {
                throw new HttpError("权限不足", 403);
            }
            // 上传封面文件
            let coverObjectName = null;
            if (coverFile) {
                const coverFilePostfix = path.extname(coverFile.originalname);
                coverObjectName = `playlist/cover/${playlistId}${coverFilePostfix}`;
                await s3Client.fPutObject(BUCKETNAME, coverObjectName, coverFile.path);
            }
            // 存储元数据
            playlistInfo.name = name;
            playlistInfo.cover_path = coverObjectName || playlistInfo.cover_path;
            await playlist.findByIdAndUpdate(playlistId, playlistInfo);
            // 向客户端发送更新消息
            sentToClients({ message: "update_playlist", userId: playlistInfo.create_user });
            response.json({ message: "歌单信息保存成功" });
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
    }
);

export default router;

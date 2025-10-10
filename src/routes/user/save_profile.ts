import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { checkEmptyFields } from "../../utils/utility.js";
import { sentToClients } from "../../utils/webSocket.js";
import { user, s3Client, BUCKETNAME } from "../../database.js";
import { HttpError } from "../../utils/errorHandler.js";

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

// 保存档案接口
router.post("/",
    // 处理头像文件
    upload.fields([
        { name: "avatar", maxCount: 1 }
    ]),
    // 处理请求
    async (request, response, next) => {
        try {
            const files = request.files as { [name: string]: Express.Multer.File[] } | undefined;
            const avatarFile = files?.["avatar"] ? files["avatar"][0] : null;
            const { operatorUserId, userId, nickname } = request.body;
            const empty = checkEmptyFields(
                { operatorUserId, userId, nickname }, 
                { operatorUserId: "操作用户id", userId: "用户id", nickname: "昵称" }
            );
            if (empty) {
                throw new HttpError(empty, 400);
            }
            // 查询存在性
            if (await user.findOne({ _id: { $ne: userId }, nickname: nickname })) {
                throw new HttpError("昵称已被占用", 409);
            }
            const userInfo = await user.findById(userId).select("avatar_path");
            if (!userInfo) {
                throw new HttpError("未找到用户", 404);
            }
            // 权限校验
            if (userId !== operatorUserId) {
                throw new HttpError("权限不足", 403);
            }
            // 上传头像文件
            let avatarObjectName = null;
            if (avatarFile) {
                const avatarFilePostfix = path.extname(avatarFile.originalname);
                avatarObjectName = `user/avatar/${userId}${avatarFilePostfix}`;
                await s3Client.fPutObject(BUCKETNAME, avatarObjectName, avatarFile.path);
            }
            // 存储元数据
            userInfo.nickname = nickname;
            userInfo.avatar_path = avatarObjectName || userInfo.avatar_path;
            await user.findByIdAndUpdate(userId, userInfo);
            // 向客户端发送更新消息
            sentToClients({ message: "update_profile", userId: userId });
            response.json({ message: "档案保存成功" });
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

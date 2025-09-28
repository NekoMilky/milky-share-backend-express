import express from "express";
import { checkEmptyField } from "../../utils/utility.js";
import { user, s3Client, BUCKETNAME } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 获取用户接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { userId } = request.body;
    const empty = checkEmptyField(userId, "用户id");
    if (empty) {
        throw new HttpError(empty, 400);
    }
    // 查询存在性
    const userInfo = await user.findById(userId).select("nickname avatar_path");
    if (!userInfo) {
        throw new HttpError("未找到用户", 404);
    }
    // 头像url
    let avatar = null;
    if (userInfo.avatar_path) {
        avatar = await s3Client.presignedGetObject(BUCKETNAME, userInfo.avatar_path, 24 * 60 * 60);
    }
    response.json({
        message: "获取用户成功",
        user: {
            id: userId,
            nickname: userInfo.nickname,
            avatar: avatar
        }
    });
}));

export default router;

import express from "express";
import { checkEmptyField } from "../../utils/utility.js";
import { user, s3Client, BUCKETNAME } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 获取用户接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { userId, nickname } = request.body;
    const userIdEmpty = checkEmptyField(userId, "用户id");
    const nicknameEmpty = checkEmptyField(nickname, "昵称");
    if (userIdEmpty && nicknameEmpty) {
        throw new HttpError(userIdEmpty, 400);
    }
    // 查询存在性
    let userInfo = null;
    if (userIdEmpty) {
        userInfo = await user.findOne({ nickname: nickname }).select("_id nickname join_time avatar_path");
    }
    else {
        userInfo = await user.findById(userId).select("_id nickname join_time avatar_path");
    }
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
            id: userInfo._id,
            nickname: userInfo.nickname,
            joinTime: userInfo.join_time, 
            avatar: avatar
        }
    });
}));

export default router;

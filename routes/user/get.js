import express from "express";
import multer from "multer";
import { user, s3Client, BUCKETNAME } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 获取用户接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { userId } = request.body;
        const requiredFields = { userId };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value || value === "") {
                return response.status(400).json({ message: `缺少${key}参数` });
            }
        }
        // 查询存在性
        const userInfo = await user.findById(userId).select("nickname avatar_path");
        if (!userInfo) {
            return response.status(404).json({ message: "未找到对应用户" });
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
    } 
    catch (error) {
        console.error("获取用户失败：", error);
        response.status(500).json({ message: "获取用户失败" });
    }
});

export default router;

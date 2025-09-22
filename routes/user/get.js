import express from "express";
import multer from "multer";
import { user, s3Client, BUCKETNAME } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 获取用户接口
router.post("/user/get", upload.none(), async (request, response) => {
    try {
        const { id } = request.body;
        if (!id || id === "") {
            return response.status(400).json({ message: "缺少id参数" });
        }
        // 根据id查询数据库
        const userInfo = await user.findById(id);
        if (!userInfo) {
            return response.status(404).json({ message: "未找到id对应的用户" });
        }
        // 头像url
        let avatar = null;
        if (userInfo.avatar_path) {
            avatar = await s3Client.presignedGetObject(BUCKETNAME, userInfo.avatar_path, 24 * 60 * 60);
        }
        response.json({
            message: "获取用户成功",
            user: {
                id: id,
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

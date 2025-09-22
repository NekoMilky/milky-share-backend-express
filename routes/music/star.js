import express from "express";
import multer from "multer";
import { star } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 音乐收藏接口
router.post("/music/star", upload.none(), async (request, response) => {
    try {
        const { songId, userId } = request.body;
        const requiredFields = { songId, userId };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value || value === "") {
                return response.status(400).json({ message: `缺少${key}参数` });
            }
        }
        // 检查是否已收藏
        const stared = await star.findOne({ user: userId, song: songId });
        if (stared) {
            await star.deleteOne({ 
                user: userId, 
                song: songId 
            });
            response.json({ message: "取消收藏成功" });
        }
        else {
            await star.create({ 
                user: userId, 
                song: songId 
            });
            response.json({ message: "收藏成功" });
        }
    } 
    catch (error) {
        console.error("操作收藏夹失败：", error);
        response.status(500).json({ message: "操作收藏夹失败" });
    }
});

export default router;

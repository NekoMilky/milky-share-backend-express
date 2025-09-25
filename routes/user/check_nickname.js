import express from "express";
import multer from "multer";
import { checkEmptyField } from "../../utils/utility.js";
import { user } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 检查昵称存在性接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { nickname } = request.body;
        const empty = checkEmptyField(nickname, "昵称");
        if (empty) {
            return response.status(400).json({ message: empty });
        }
        // 检查用户存在性
        const userInfo = await user.findOne({ nickname: nickname }).select("_id");
        response.json({ 
            message: "检查昵称成功",
            usable: !userInfo
        });
    } 
    catch (error) {
        console.error("检查昵称：", error);
        response.status(500).json({ message: "检查昵称" });
    }
});

export default router;

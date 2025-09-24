import express from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { user } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 用户登录接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { nickname, password } = request.body;
        const requiredFields = { nickname, password };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value || value === "") {
                return response.status(400).json({ message: `缺少${key}参数` });
            }
        }
        // 检查用户存在性并验证
        const userInfo = await user.findOne({ nickname: nickname }).select("_id password");
        if (!userInfo) {
            return response.status(401).json({ message: "昵称或密码错误" });
        }
        const passVerified = await bcrypt.compare(password, userInfo.password);
        if (!passVerified) {
            return response.status(401).json({ message: "昵称或密码错误" });
        }
        response.json({ 
            message: `登录成功，欢迎${nickname}`,
            user: {
                id: userInfo._id
            }
        });
    } 
    catch (error) {
        console.error("登录失败：", error);
        response.status(500).json({ message: "登录失败" });
    }
});

export default router;

import express from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { checkEmptyFields } from "../../utils/utility.js";
import { user } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 检查密码强度
const checkPassSafety = (pass) => {
    if (pass.length < 8 || pass.length > 24) {
        return false;
    }
    const hasNumber = /\d/.test(pass);
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    return hasNumber && hasLetter && hasSpecialChar;
};

// 用户注册接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { nickname, password } = request.body;
        const empty = checkEmptyFields({ nickname, password }, { nickname: "昵称", password: "密码" });
        if (empty) {
            return response.status(400).json({ message: empty });
        }
        // 检查密码强度
        if (!checkPassSafety(password)) {
            return response.status(400).json({ message: "密码强度低" });
        }
        // 检查用户存在性
        if (await user.findOne({ nickname: nickname })) {
            return response.status(409).json({ message: "此昵称已被占用" });
        }
        // 密码加密
        const salt = await bcrypt.genSalt(8);
        const encryptedPass = await bcrypt.hash(password, salt);
        // 存储数据
        const newUser = await user.create({
            nickname: nickname,
            password: encryptedPass,
            avatar_path: null
        });
        response.json({ 
            message: `注册成功，欢迎${nickname}`,
            user: {
                id: newUser._id
            }
        });
    } 
    catch (error) {
        console.error("注册失败：", error);
        response.status(500).json({ message: "注册失败" });
    }
});

export default router;

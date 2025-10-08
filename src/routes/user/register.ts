import express from "express";
import bcrypt from "bcryptjs";
import { checkEmptyFields } from "../../utils/utility.js";
import { user } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 检查密码强度
const checkPassSafety = (pass: string) => {
    if (pass.length < 8 || pass.length > 24) {
        return false;
    }
    const hasNumber = /\d/.test(pass);
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    return hasNumber && hasLetter && hasSpecialChar;
};

// 用户注册接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { nickname, password } = request.body;
    const empty = checkEmptyFields(
        { nickname, password }, 
        { nickname: "昵称", password: "密码" }
    );
    if (empty) {
        throw new HttpError(empty, 400);
    }
    // 检查密码强度
    if (!checkPassSafety(password)) {
        throw new HttpError("密码强度低", 400);
    }
    // 检查存在性
    if (await user.findOne({ nickname: nickname })) {
        throw new HttpError("昵称已被占用", 409);
    }
    // 密码加密
    const salt = await bcrypt.genSalt(8);
    const encryptedPass = await bcrypt.hash(password, salt);
    // 存储数据
    const newUser = await user.create({
        nickname: nickname,
        password: encryptedPass,
        join_time: new Date(),
        avatar_path: null
    });
    response.json({ 
        message: `注册成功，欢迎${nickname}`,
        user: {
            id: newUser._id
        }
    });
}));

export default router;

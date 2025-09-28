import express from "express";
import bcrypt from "bcryptjs";
import { checkEmptyFields } from "../../utils/utility.js";
import { user } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 用户登录接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { nickname, password } = request.body;
    const empty = checkEmptyFields(
        { nickname, password }, 
        { nickname: "昵称", password: "密码" }
    );
    if (empty) {
        throw new HttpError(empty, 400);
    }
    // 检查存在性
    const userInfo = await user.findOne({ nickname: nickname }).select("_id password");
    if (!userInfo) {
        throw new HttpError("昵称或密码错误", 401);
    }
    // 验证
    const passVerified = await bcrypt.compare(password, userInfo.password);
    if (!passVerified) {
        throw new HttpError("昵称或密码错误", 401);
    }
    response.json({ 
        message: `登录成功，欢迎${nickname}`,
        user: {
            id: userInfo._id
        }
    });
}));

export default router;

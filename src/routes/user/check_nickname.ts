import express from "express";
import { checkEmptyField } from "../../utils/utility.js";
import { user } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 检查昵称存在性接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { nickname } = request.body;
    const empty = checkEmptyField(nickname, "昵称");
    if (empty) {
        throw new HttpError(empty, 400);
    }
    // 查询存在性
    const userInfo = await user.findOne({ nickname: nickname }).select("_id");
    response.json({ 
        message: "检查昵称成功",
        usable: userInfo ? false : true
    });
}));

export default router;

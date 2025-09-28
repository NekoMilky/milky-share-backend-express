import express from "express";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";
import { checkEmptyFields } from "../../utils/utility.js";
import { sentToClients } from "../../utils/webSocket.js";
import { playlist, user } from "../../database.js";

const router = express.Router();

// 创建歌单接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { userId, name } = request.body;
    const empty = checkEmptyFields(
        { userId, name }, { userId: "用户id", name: "歌单名" }
    );
    if (empty) {
        throw new HttpError(empty, 400);
    }
    // 查询存在性
    if (!await user.findById(userId).select("_id")) {
        throw new HttpError("未找到用户", 404);
    }
    // 存储数据
    const newPlaylist = await playlist.create({
        name: name,
        create_user: userId,
        create_time: new Date(),
        cover_path: null
    });
    // 向客户端发送更新消息
    sentToClients({ message: "update_playlist" });
    response.json({
        message: "创建歌单成功",
        playlist: {
            id: newPlaylist._id
        }
    });
}));

export default router;

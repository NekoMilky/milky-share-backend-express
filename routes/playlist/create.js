import express from "express";
import multer from "multer";
import { checkEmptyFields } from "../../utils/utility.js";
import { sentToClients } from "../../utils/webSocket.js";
import { playlist, user } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 创建歌单接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { userId, name } = request.body;
        const empty = checkEmptyFields({ userId, name }, { userId: "用户id", name: "歌单名" });
        if (empty) {
            return response.status(400).json({ message: empty });
        }
        // 查询存在性
        if (!await user.findById(userId).select("_id")) {
            return response.status(404).json({ message: "未找到对应用户" });
        }
        // 存储数据
        const newPlaylist = await playlist.create({
            name: name,
            create_user: userId,
            create_time: new Date()
        });
        // 向客户端发送更新消息
        sentToClients({ message: "update_playlist" });
        response.json({
            message: "创建歌单成功",
            playlist: {
                id: newPlaylist._id
            }
        });
    } 
    catch (error) {
        console.error("创建歌单失败：", error);
        response.status(500).json({ message: "创建歌单失败" });
    }
});

export default router;

import express from "express";
import multer from "multer";
import { checkEmptyField } from "../../utils/utility.js";
import { user, playlist, userPlaylist } from "../../database/index.js";

const router = express.Router();
const upload = multer();

// 查询用户所有歌单接口
router.post("/", upload.none(), async (request, response) => {
    try {
        const { userId } = request.body;
        const empty = checkEmptyField(userId, "用户id");
        if (empty) {
            return response.status(400).json({ message: empty });
        }
        // 查询存在性
        const userInfo = await user.findById(userId).select("nickname");
        if (!userInfo) {
            return response.status(404).json({ message: "未找到对应用户" });
        }
        // 创建的歌单
        const createPlaylists = await playlist.find({ create_user: userId }).select("_id name create_time");
        const createPlaylistList = createPlaylists.map((item) => {
            return {
                id: item._id,
                name: item.name,
                create_time: item.create_time,
                create_user: {
                    nickname: userInfo.nickname
                }
            };
        })
        // 收藏的歌单
        const starPlaylists = await userPlaylist.find({ user_id: userId }).select("playlist_id");
        let userIdAndNickname = {};
        const starPlaylistList = await Promise.all(
            starPlaylists.map(async (item) => {
                const playlistId = item.playlist_id;
                const playlistInfo = await playlist.findById(playlistId).select("name create_time create_user");
                const createUserId = playlistInfo.create_user;
                let createUserNickname;
                if (createUserId in userIdAndNickname) {
                    createUserNickname = userIdAndNickname[createUserId];
                }
                else {
                    const createUserInfo = await user.findById(createUserId).select("nickname");
                    createUserNickname = createUserInfo.nickname;
                    userIdAndNickname[createUserId] = createUserNickname;
                }
                return {
                    id: playlistId,
                    name: playlistInfo.name,
                    create_time: playlistInfo.create_time,
                    create_user: {
                        nickname: createUserNickname
                    }
                };
            })
        );
        response.json({ 
            message: "获取歌单列表成功",
            createPlaylists: createPlaylistList,
            starPlaylists: starPlaylistList
        });
    } 
    catch (error) {
        console.error("获取歌单列表失败：", error);
        response.status(500).json({ message: "获取歌单列表失败" });
    }
});

export default router;

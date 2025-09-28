import express from "express";
import { checkEmptyField } from "../../utils/utility.js";
import { user, playlist, userPlaylist, s3Client, BUCKETNAME } from "../../database.js";
import { HttpError, errorHandler } from "../../utils/errorHandler.js";

const router = express.Router();

// 查询用户所有歌单接口
router.post("/", express.json(), errorHandler(async (request, response) => {
    const { userId } = request.body;
    const empty = checkEmptyField(userId, "用户id");
    if (empty) {
        throw new HttpError(empty, 400);
    }
    // 查询存在性
    let userInfos: Record<string, unknown> = {};
    const userInfo = await user.findById(userId).select("_id nickname avatar_path");
    if (!userInfo) {
        throw new HttpError("未找到用户", 404);
    }
    // 头像url
    let avatar = null;
    if (userInfo.avatar_path) {
        avatar = await s3Client.presignedGetObject(BUCKETNAME, userInfo.avatar_path, 24 * 60 * 60);
    }
    const userObject = { 
        id: userInfo._id, 
        nickname: userInfo.nickname, 
        avatar: avatar 
    };
    userInfos[userId] = userObject;
    // 创建的歌单
    const createPlaylists = await playlist.find({ create_user: userId }).select("_id name create_time cover_path");
    const createPlaylistList = await Promise.all(
        createPlaylists.map(async (item) => {
            // 封面url
            let cover = null;
            if (item.cover_path) {
                cover = await s3Client.presignedGetObject(BUCKETNAME, item.cover_path, 24 * 60 * 60);
            }
            return {
                id: item._id,
                name: item.name,
                cover: cover,
                create_time: item.create_time,
                create_user: userObject,
            };
        })
    )
    // 收藏的歌单
    const starPlaylists = await userPlaylist.find({ user_id: userId }).select("playlist_id");
    const starPlaylistList = await Promise.all(
        starPlaylists.map(async (item) => {
            const playlistId = item.playlist_id;
            try {
                const playlistInfo = await playlist.findById(playlistId).select("name create_time create_user cover_path");
                if (!playlistInfo) {
                    throw new Error("无法找到对应的歌单");
                }
                // 封面url
                let cover = null;
                if (playlistInfo.cover_path) {
                    cover = await s3Client.presignedGetObject(BUCKETNAME, playlistInfo.cover_path, 24 * 60 * 60);
                }
                const createUserId = playlistInfo.create_user.toString();
                let createUserObject;
                if (Object.keys(userInfos).includes(createUserId)) {
                    createUserObject = userInfos[createUserId];
                }
                else {
                    const createUserInfo = await user.findById(createUserId).select("_id nickname avatar_path");
                    if (!createUserInfo) {
                        throw new Error("无法找到此歌单对应的创建者信息");
                    }
                    let createUserAvatar = null;
                    // 头像url
                    if (createUserInfo.avatar_path) {
                        createUserAvatar = await s3Client.presignedGetObject(BUCKETNAME, createUserInfo.avatar_path, 24 * 60 * 60);
                    }
                    createUserObject = { 
                        id: createUserInfo._id, 
                        nickname: createUserInfo.nickname, 
                        avatar: createUserAvatar 
                    };
                    userInfos[createUserId] = createUserObject;
                }
                return {
                    id: playlistId,
                    name: playlistInfo.name,
                    cover: cover,
                    create_time: playlistInfo.create_time,
                    create_user: createUserObject
                };
            }
            catch (error) {
                console.error(`获取用户${userId}收藏的歌单${playlistId}时发生了错误：`, error);
                return {};
            }
        })
    );
    response.json({ 
        message: "获取歌单列表成功",
        createPlaylists: createPlaylistList,
        starPlaylists: starPlaylistList
    });
}));

export default router;

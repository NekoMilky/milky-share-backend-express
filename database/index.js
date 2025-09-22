import "dotenv/config";
import mongoose from "mongoose";
import * as minio from "minio";

const MONGODB_URL = process.env.MONGODB_URL;

const MINIO_END_POINT = process.env.MINIO_END_POINT || "objectstorageapi.gzg.sealos.run";
const ACCESSKEY = process.env.MINIO_ACCESSKEY;
const SECRETKEY = process.env.MINIO_SECRETKEY;
export const BUCKETNAME = ACCESSKEY + "-milky-share-store";

// s3Client
if (!MINIO_END_POINT || !ACCESSKEY || !SECRETKEY) {
    throw new Error("MinIO环境变量MINIO_END_POINT、MINIO_ACCESSKEY、MINIO_SECRETKEY可能未配置");
}
export const s3Client = new minio.Client({
    endPoint: MINIO_END_POINT,
    accessKey: ACCESSKEY,
    secretKey: SECRETKEY,
    useSSL: true
});

export const connect = async () => {
    // MongoDB
    if (!MONGODB_URL) {
        throw new Error("MongoDB环境变量MONGODB_URL可能未配置");
    }
    try {
        await mongoose.connect(MONGODB_URL);
        console.log("MongoDB连接成功");
    } 
    catch (error) {
        console.error("MongoDB连接失败：", error);
        throw error;
    }
    // MinIO
    try {
        const bucketExists = await s3Client.bucketExists(BUCKETNAME);
        if (!bucketExists) {
            await s3Client.makeBucket(BUCKETNAME, "us-east-1");
            console.log(`存储桶${BUCKETNAME}不存在，已创建`);
        }
        console.log("MinIO连接成功");
    } 
    catch (minioError) {
        console.error("MinIO连接失败：", minioError);
        throw minioError;
    }
};

// 歌曲元信息
const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    album: { type: String, required: true },
    duration: { type: Number, required: true },
    music_path: { type: String, required: true },
    cover_path: { type: String }
}, { versionKey: false });
export const song = mongoose.model("song", songSchema);

// 用户信息
const userSchema = new mongoose.Schema({
    nickname: { type: String, required: true },
    password: { type: String, required: true },
    avatar_path: { type: String }
}, { versionKey: false });
export const user = mongoose.model("user", userSchema);

// 收藏夹
const starSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    song: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "song",
        required: true
    }
}, { versionKey: false });
starSchema.index({ user: 1, song: 1 }, { unique: true });
export const star = mongoose.model("star", starSchema);

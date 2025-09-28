import express, { Express, Router } from "express";
import path from "path";
import fs from "fs";

// 自动注册路由
export const autoRegisterRoutes = async (app: Express, rootDirectory: string) => {
    // 递归遍历
    const traverse = async (currentDirectory: string) => {
        const files = fs.readdirSync(currentDirectory);
        for (const file of files) { 
            const filePath = path.join(currentDirectory, file);
            const stats = fs.statSync(filePath);
            // 遇到目录继续递归
            if (stats.isDirectory()) {
                await traverse(filePath);
            }
            // 遇到.ts或.js注册路由
            else if ((file.endsWith(".ts") || file.endsWith(".js")) && !file.startsWith(".")) {
                // 生成路径
                const relativePath = path.relative(rootDirectory, filePath);
                const apiPath = "/" + relativePath.replace(/\.(ts|js)$/, "");
                const module = await import(`file://${filePath}`);
                const router = module.default || module;
                // 注册路由
                if (router instanceof express.Router) {
                    app.use(apiPath, router as Router);
                    console.log(`已注册路由：${apiPath}`);
                }
            }
        }
    };

    await traverse(rootDirectory);
};

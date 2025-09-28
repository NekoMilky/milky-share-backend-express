import { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
    statusCode: number = 500;

    constructor(message: string, statusCode: number) {
        super(message);
        if (statusCode < 100 || statusCode >= 600) {
            throw new Error(`不合法的http状态码${statusCode}`);
        }
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}

export const errorHandler = (func: (request: Request, response: Response, next: NextFunction) => any) =>
    (request: Request, response: Response, next: NextFunction) => {
        Promise.resolve(func(request, response, next)).catch(next);
    };

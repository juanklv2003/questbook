import { Request, Response, NextFunction } from 'express';

export const catchAsync = (fn: Function): any => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

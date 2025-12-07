import { Response, NextFunction } from "express";
import { AuthRequest } from "./checkAuth";

export const checkAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.id_rol !== 1) {
    return res.status(403).json({ msg: "Acceso denegado. Solo administradores pueden realizar esta acción." });
  }
  next();
};

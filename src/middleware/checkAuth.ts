import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import pool from "../config/database";

export interface AuthRequest extends Request {
  user?: any;
  tokenExp?: number; // 👈 agregar esta propiedad
}

export const checkAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ Leer el token desde la cookie
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ msg: "Token no proporcionado" });
    }

    // ✅ Verificar JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    // ✅ Buscar el usuario
    const query = `
      SELECT id, nombre, email, id_rol
      FROM usuario
      WHERE id = $1
    `;
    const result = await pool.query(query, [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error("❌ Error en checkAuth:", error);
    return res.status(401).json({ msg: "Token no válido o expirado" });
  }
};





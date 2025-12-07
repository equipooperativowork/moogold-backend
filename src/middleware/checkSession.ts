// sessionControl.ts
import { AuthRequest } from "./checkAuth";
import { Response, NextFunction } from "express";
import pool from "../config/database";
import jwt from "jsonwebtoken";

export const checkSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    const ahora = Date.now();
    const ultimaActividad = user.last_activity
      ? new Date(user.last_activity).getTime()
      : ahora;

    const INACTIVO_MS = 10 * 60 * 1000; // 10 min

    // 1️⃣ VALIDAR INACTIVIDAD
    if (ahora - ultimaActividad > INACTIVO_MS) {
      res.clearCookie("token");
      return res.status(401).json({ msg: "Sesión expirada por inactividad" });
    }

    // 2️⃣ ACTUALIZAR ACTIVITY
    await pool.query(
      "UPDATE usuario SET last_activity = NOW() WHERE id = $1",
      [user.id]
    );

    // 3️⃣ RENOVAR TOKEN — si tokenExp existe
    if (req.tokenExp) {
      const tiempoActual = Math.floor(Date.now() / 1000);
      const tiempoRestante = req.tokenExp - tiempoActual;

      if (tiempoRestante < 180) {
        const nuevoToken = jwt.sign(
          { id: user.id },
          process.env.JWT_SECRET!,
          { expiresIn: "10m" }
        );

        res.cookie("token", nuevoToken, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 10 * 60 * 1000
        });
      }
    }

    next();
  } catch (e) {
    console.error("❌ Error en sessionControl:", e);
    return res.status(401).json({ msg: "Error de sesión" });
  }
};

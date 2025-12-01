import jwt from "jsonwebtoken";

/**
 * Genera un token JWT con el ID del usuario.
 * @param id - Identificador del usuario.
 * @returns Token JWT válido por 30 días.
 */
const generarJwt = (id: string | number): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("❌ JWT_SECRET no está definido en las variables de entorno");
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

export default generarJwt;

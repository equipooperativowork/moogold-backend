import { Request, Response } from "express";
import pool from "../config/database";
import generarjwt from "../helpers/generarjwt";
import bcrypt from "bcrypt";
import { AuthRequest } from "../middleware/checkAuth"; // importa la interfaz desde tu middleware
import generarTokenReset from "../helpers/generarTokenReset";
import { enviarEmail } from "../helpers/enviarEmail";
import crypto from "crypto";
/** -------------------------------
 * Registrar usuario //OK
---------------------------------- */


export const registrar = async (req: Request, res: Response) => {
  const { nombre, email, password, id_rol } = req.body;

  try {
    const existeUsuario = await pool.query(
      "SELECT * FROM usuario WHERE email = $1",
      [email]
    );

    if (existeUsuario.rows.length > 0) {
      return res.status(400).json({ msg: "El usuario ya está registrado." });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear token de verificación
    const tokenVerificacion = crypto.randomBytes(32).toString("hex");
    const expiracion = new Date(Date.now() + 3600000); // 1 hora

    // Guardar usuario
    const nuevoUsuario = await pool.query(
      `INSERT INTO usuario (nombre, email, password, id_rol, verificado, token_verificacion, token_verificacion_expira)
       VALUES ($1, $2, $3, $4, false, $5, $6)
       RETURNING id, nombre, email, id_rol`,
      [nombre, email, passwordHash, id_rol, tokenVerificacion, expiracion]
    );

    // Enviar correo de verificación
    const url = `${process.env.FRONTEND_URL}/verificar/${tokenVerificacion}`;

    // Enviar correo
    await enviarEmail({
      email,
      asunto: "Verifica tu cuenta",
      mensaje: `
        <h2>Hola ${nombre}</h2>
        <p>Para activar tu cuenta haz clic en el siguiente enlace:</p>
        <a href="${url}">Verificar cuenta</a>
        <p>Este enlace expira en 1 hora.</p>
      `,
    });

    res.status(201).json({
      msg: "Usuario registrado. Revisa tu correo para verificar tu cuenta.",
      usuario: nuevoUsuario.rows[0]
    });

  } catch (error: any) {
    console.error("❌ Error al registrar usuario:", error);
    res.status(500).json({ msg: "Error al registrar el usuario." });
  }
};

//----------------------------------------
//Verificacion de dos pasos del usuario
//-------------------------------------------

export const verificarCuenta = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM usuario 
       WHERE token_verificacion = $1
       AND token_verificacion_expira > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ msg: "Token inválido o expirado." });
    }

    const usuario = result.rows[0];

    // Marcar como verificado y limpiar token
    await pool.query(
      `UPDATE usuario 
       SET verificado = true, token_verificacion = NULL, token_verificacion_expira = NULL
       WHERE id = $1`,
      [usuario.id]
    );

    res.json({ msg: "Cuenta verificada exitosamente." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al verificar la cuenta." });
  }
};


export const reenviarVerificacion = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const result = await pool.query("SELECT * FROM usuario WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado." });
    }

    const usuario = result.rows[0];

    if (usuario.verificado) {
      return res.status(400).json({ msg: "La cuenta ya está verificada." });
    }

    // Nuevo token de verificación
    const token = crypto.randomBytes(32).toString("hex");
    const expiracion = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token en BD
    await pool.query(
      `UPDATE usuario 
       SET token_verificacion = $1, token_verificacion_expira = $2 
       WHERE id = $3`,
      [token, expiracion, usuario.id]
    );

    const url = `https://tu-frontend.com/verificar/${token}`;

    // 📧 ENVIAR CORREO USANDO TU HELPER
    await enviarEmail({
      email: usuario.email,
      asunto: "Reenvío de verificación de cuenta",
      mensaje: `
        <h2>Hola ${usuario.nombre}</h2>
        <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
        <a href="${url}"
           style="display:inline-block; padding: 10px 18px; background:#4F46E5; color:white; border-radius: 6px; text-decoration:none;">
          Verificar cuenta
        </a>
        <p>Si no solicitaste este correo, simplemente ignóralo.</p>
      `,
    });

    res.json({ msg: "Correo de verificación reenviado." });

  } catch (error) {
    console.error("Error en reenviarVerificacion:", error);
    res.status(500).json({ msg: "Error al reenviar verificación." });
  }
};



/** -------------------------------
 * Autenticar usuario (login)
---------------------------------- */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // 🔹 Traemos el usuario + su rol
    const usuario = await pool.query(
      `
      SELECT 
        u.id,
        u.nombre,
        u.email,
        u.password,
        u.verificado,
        r.id AS id_rol,
        r.nombre AS rol_nombre
      FROM usuario u
      INNER JOIN rol r ON r.id = u.id_rol
      WHERE u.email = $1
      `,
      [email]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ msg: "El usuario no existe." });
    }

    const user = usuario.rows[0];

    // 🔹 Validar contraseña
    const passwordValida = await bcrypt.compare(password, user.password);
    if (!passwordValida) {
      return res.status(401).json({ msg: "Contraseña incorrecta." });
    }

    // 🔹 Bloquear login si no está verificado
    if (!user.verificado) {
      return res.status(403).json({
        msg: "Tu cuenta no está verificada. Revisa tu correo para activarla.",
      });
    }

    // 🔹 Generar JWT
    const token = generarjwt(user.id);

    // 🔹 Guardar JWT en cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,     // true si usas HTTPS
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, 
    });

    // 🔹 ENVIAMOS AL FRONT: rol incluido
    return res.json({
      msg: "Inicio de sesión exitoso",
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      id_rol: user.id_rol,
      rol_nombre: user.rol_nombre,
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ msg: "Error en el servidor" });
  }
};



/** ------------------------------------
 * Solicitar restablecimiento de contraseña
-------------------------------------- */

export const solicitarReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    // Buscar usuario
    const result = await pool.query("SELECT * FROM usuario WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "No existe una cuenta con ese correo." });
    }

    const usuario = result.rows[0];

    // Generar token y fecha de expiración (1 hora)
    const token = generarTokenReset();
    const expira = new Date(Date.now() + 60 * 60 * 1000);

    // Guardar en la BD
    await pool.query(
      "UPDATE usuario SET token_reset = $1, token_expira = $2 WHERE id = $3",
      [token, expira, usuario.id]
    );

    // Crear enlace para el correo
    const enlace = `${process.env.FRONTEND_URL}/restablecer/${token}`;

    // Enviar correo
    await enviarEmail({
      email,
      asunto: "Restablece tu contraseña",
      mensaje: `
        <p>Hola ${usuario.nombre},</p>
        <p>Has solicitado restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva:</p>
        <a href="${enlace}">${enlace}</a>
        <p>Este enlace expirará en 1 hora.</p>
      `,
    });

    return res.json({ msg: "Hemos enviado un correo con las instrucciones." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al procesar la solicitud." });
  }
};



/** ------------------------------------
 * Restablecer contraseña
-------------------------------------- */
export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Verificar token
    const result = await pool.query(
      "SELECT * FROM usuario WHERE token_reset = $1 AND token_expira > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ msg: "Token inválido o expirado." });
    }

    const usuario = result.rows[0];

    // Cifrar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Actualizar contraseña y limpiar token
    await pool.query(
      "UPDATE usuario SET password = $1, token_reset = NULL, token_expira = NULL WHERE id = $2",
      [hashedPassword, usuario.id]
    );

    res.json({ msg: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al restablecer la contraseña." });
  }
};



/** -------------------------------
 * Mostrar todos los usuarios (Excusivo para admins) OK
---------------------------------- */
export const mostrar = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.nombre, 
        u.email, 
        u.saldo,
        u.estado,  
        r.nombre AS rol
      FROM usuario u
      INNER JOIN rol r 
        ON u.id_rol = r.id
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ msg: "Error al obtener los usuarios desde controller" });
  }
};

/** -------------------------------
 * Mostrar datos del Perfil OK
---------------------------------- */


export const mostrarPerfil = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user.id;

    const result = await pool.query(
      `SELECT 
          u.id, 
          u.nombre, 
          u.email, 
          u.saldo,
          u.estado,
          r.nombre AS rol
        FROM usuario u
        INNER JOIN rol r ON u.id_rol = r.id
        WHERE u.id = $1`,
      [usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado." });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ msg: "Error al obtener el perfil del usuario." });
  }
};

//-----------------------------------------------
//Para mostrar usuarios segun su ID, exclusivo para admins
//---------------------------------------------------------

export const mostrarPerfilPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
          u.id,
          u.nombre,
          u.email,
          u.saldo,
          u.estado,
          r.nombre AS rol
        FROM usuario u
        INNER JOIN rol r ON u.id_rol = r.id
        WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al obtener el usuario." });
  }
};



/** ---------------------------------------------------
 * Editar usuario rol, saldo, estado, exclusivo para admin OK
------------------------------------------------------- */
export const editUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id_rol, saldo, estado } = req.body;

  try {
    // Construir consulta dinámica
    const fields = [];
    const values = [];
    let index = 1;

    if (id_rol !== undefined) {
      fields.push(`id_rol = $${index++}`);
      values.push(id_rol);
    }

    if (saldo !== undefined) {
      fields.push(`saldo = $${index++}`);
      values.push(saldo);
    }

    if (estado !== undefined) {
      fields.push(`estado = $${index++}`);
      values.push(estado);
    }

    if (fields.length === 0) {
      return res.status(400).json({ msg: "No se enviaron datos para actualizar." });
    }

    values.push(id);

    const query = `
      UPDATE usuario
      SET ${fields.join(", ")}
      WHERE id = $${index}
      RETURNING id, nombre, email, id_rol, saldo, estado
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "El usuario no existe." });
    }

    res.json({
      msg: "Usuario actualizado exitosamente.",
      usuario: result.rows[0]
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ msg: "Error al actualizar el usuario." });
  }
};



/** -------------------------------
 * Editar perfil propio OK
---------------------------------- */

export const editarPerfil = async (req: AuthRequest, res: Response) => {
  const { nombre, email } = req.body;

  try {
    const usuarioId = req.user.id;

    // Crear dinámicamente los campos a actualizar
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 1;

    if (nombre) {
      campos.push(`nombre = $${indice++}`);
      valores.push(nombre);
    }

    if (email) {
      campos.push(`email = $${indice++}`);
      valores.push(email);
    }

    // Si no se envió ningún campo, devolvemos error
    if (campos.length === 0) {
      return res.status(400).json({ msg: "No se proporcionaron campos para actualizar." });
    }

    // Agregar el id al final del array de valores
    valores.push(usuarioId);

    // Construir la consulta dinámicamente
    const query = `
      UPDATE usuario
      SET ${campos.join(", ")}
      WHERE id = $${indice}
      RETURNING id, nombre, email, id_rol
    `;

    const result = await pool.query(query, valores);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "El usuario no existe o no está autorizado." });
    }

    res.json({
      msg: "Perfil actualizado correctamente.",
      usuario: result.rows[0],
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ msg: "Error al actualizar el perfil." });
  }
};


/** -------------------------------
 * Eliminar usuario OK
---------------------------------- */
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM usuario WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ msg: "El usuario no existe." });
    }

    res.json({ msg: "Usuario eliminado correctamente." });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ msg: "Error al eliminar el usuario." });
  }
};

/** -------------------------------
 * Perfil del usuario autenticado OK
---------------------------------- */


export const perfil = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ msg: "No autorizado" });
  }

  res.json({
    msg: "Usuario autenticado correctamente.",
    usuario: req.user,
  });


};


export const autenticarRol = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        u.nombre,
        u.email,
        r.id AS id_rol,
        r.nombre AS rol_nombre
      FROM usuario u
      INNER JOIN rol r ON u.id_rol = r.id
      WHERE u.id = $1;
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    res.json(result.rows[0]); // 👉 Devuelve nombre, email, id_rol y rol_nombre
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al obtener el usuario autenticado" });
  }
};


//Funcion para cerrar sesión

export const logout = async (req: Request, res: Response) => {
  try {

    //---------------------------------------------
    //Cambiar en produccion secure: false; por true
    //---------------------------------------------

    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(200).json({ msg: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Error al cerrar sesión" });
  }
};

import express, { Router } from "express";
import {
  registrar,
  verificarCuenta,
  login,
  perfil,
  solicitarReset,
  resetPassword,
  editUser,
  editarPerfil,
  deleteUser,
  mostrar,
  mostrarPerfil,
  mostrarPerfilPorId,
  autenticarRol,
  logout,
} from "../controller/userController";
import { checkAuth } from "../middleware/checkAuth";
import { checkAdmin } from "../middleware/checkAdmin";
import { checkSession } from "../middleware/checkSession";

const router: Router = express.Router();


router.post("/", checkAuth, checkSession, checkAdmin, registrar);
router.get("/verificar/:token", verificarCuenta);
router.post("/login", login);
router.get("/perfil", checkAuth, checkSession, perfil);
router.post("/olvide-password", solicitarReset);
router.post("/reset-password/:token", resetPassword);
router.put("/editarPerfil", checkAuth, checkSession, editarPerfil);
router.put("/editUser/:id",checkAuth, checkSession, checkAdmin, editUser);
router.get("/mostrar", checkAuth, checkSession, checkAdmin, mostrar);
router.get("/mostrarPerfil", checkAuth, checkSession, mostrarPerfil);
router.get("/perfil/:id", checkAuth, checkSession, checkAdmin, mostrarPerfilPorId);
router.delete("/delete/:id", deleteUser);
router.get("/authRol", checkAuth, checkSession, autenticarRol);
router.post("/logout", logout);


export default router;

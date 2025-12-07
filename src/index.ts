import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/database";
import globalRoutes from "./routes/globalRoutes";
import userRouters from "./routes/userRoutes";
import cookieParser from "cookie-parser";

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

const app: Application = express();

// Middlewares
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));
app.use(cookieParser());

// -------------------------
// 🔥 CORS SIMPLE Y SEGURO
// -----------------------

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://207.180.207.223"
  ],
  credentials: true
}));

// -------------------------
// 🔥 RUTAS
// -------------------------
app.use("/api/usuario", userRouters);
app.use("/api", globalRoutes);

// -------------------------
// 🔥 SERVIDOR
// -------------------------
const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

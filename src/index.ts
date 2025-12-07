import express, { Application } from "express";
import dotenv from "dotenv";
import cors, { CorsOptions } from "cors";
import { connectDB } from "./config/database"; // ✅ Importación correcta
import globalRoutes from "./routes/globalRoutes";
import userRouters from "./routes/userRoutes";
import cookieParser from "cookie-parser";


// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

const app: Application = express();

// Middlewares para manejar JSON y formularios grandes
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));
app.use(cookieParser());

// CORS CONFIG CORRECTA
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://[::1]:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir llamadas desde herramientas tipo Postman o curl (sin origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS: Origin no permitido: " + origin));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Rutas principales
app.use("/api/usuario", userRouters);
app.use("/api", globalRoutes);

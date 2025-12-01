import express, { Application } from "express";
import dotenv from "dotenv";
import cors, { CorsOptions } from "cors";
import { connectDB } from "./config/database"; // ✅ Importación correcta
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

// ✅ Configurar CORS
const whitelist = ["http://localhost:5173"]; // <-- Cambia esto si tienes dominio real

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Error de CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

// ✅ Rutas principales
app.use("/api/usuario", userRouters);




// ✅ Puerto de ejecución
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});


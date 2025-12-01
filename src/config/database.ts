// src/config/database.ts
import dotenv from "dotenv";
import { Pool } from "pg";

// Cargar variables desde .env
dotenv.config();

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: Number(process.env.PG_PORT) || 5432,
  //ssl: { rejectUnauthorized: false },
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(`✅ Conexión a PostgreSQL exitosa en: ${process.env.PG_HOST}:${process.env.PG_PORT}`);
    
    // Prueba simple
    const result = await client.query("SELECT NOW()");
    console.log("🕒 Fecha/hora actual del servidor:", result.rows[0]);

    client.release();
  } catch (error: any) {
    console.error("❌ Error al conectar con PostgreSQL:", error.message);
    process.exit(1);
  }
};

export default pool;

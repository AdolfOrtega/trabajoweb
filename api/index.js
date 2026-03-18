const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "4000"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 5,
};

let pool;
async function getPool() {
  if (!pool) pool = mysql.createPool(dbConfig);
  return pool;
}

// Ruta de salud y creación de tablas
app.get("/api/health", async (req, res) => {
  try {
    const db = await getPool();
    // Intenta crear la tabla de conceptos por si acaso
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conceptos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT
      )
    `);
    res.json({ status: "ok", message: "Conectado a TiDB y tablas listas" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/conceptos", async (req, res) => {
  try {
    const db = await getPool();
    const [rows] = await db.execute("SELECT * FROM conceptos ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/conceptos", async (req, res) => {
  const { nombre, descripcion } = req.body;
  try {
    const db = await getPool();
    await db.execute("INSERT INTO conceptos (nombre, descripcion) VALUES (?, ?)", [nombre, descripcion]);
    res.json({ mensaje: "Guardado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
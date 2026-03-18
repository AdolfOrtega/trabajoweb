const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de conexión profesional para TiDB Cloud
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

// Inicialización: Crea las tablas si no existen al verificar la conexión
app.get("/api/health", async (req, res) => {
  try {
    const db = await getPool();
    // Crear tablas una por una
    await db.execute("CREATE TABLE IF NOT EXISTS conceptos (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100), descripcion TEXT)");
    await db.execute("CREATE TABLE IF NOT EXISTS destinos (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100), responsable VARCHAR(100))");
    await db.execute("CREATE TABLE IF NOT EXISTS productos (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100), precio DECIMAL(10,2))");
    await db.execute("CREATE TABLE IF NOT EXISTS unidades (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100), abreviatura VARCHAR(10))");
    
    res.json({ status: "ok", message: "Tablas verificadas y BD conectada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FUNCIÓN GENÉRICA PARA CRUD (Ahorra mucho código)
const createCRUDRoutes = (route, table, columns) => {
  // Obtener todos
  app.get(`/api/${route}`, async (req, res) => {
    try {
      const db = await getPool();
      const [rows] = await db.execute(`SELECT * FROM ${table} ORDER BY id DESC`);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Insertar uno
  app.post(`/api/${route}`, async (req, res) => {
    try {
      const db = await getPool();
      const fields = columns.join(", ");
      const values = columns.map(c => req.body[c]);
      const placeholders = columns.map(() => "?").join(", ");
      await db.execute(`INSERT INTO ${table} (${fields}) VALUES (${placeholders})`, values);
      res.json({ mensaje: "Guardado correctamente" });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Eliminar uno
  app.delete(`/api/${route}/:id`, async (req, res) => {
    try {
      const db = await getPool();
      await db.execute(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      res.json({ mensaje: "Eliminado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
};

// Configurar las rutas para cada catálogo
createCRUDRoutes("conceptos", "conceptos", ["nombre", "descripcion"]);
createCRUDRoutes("destinos", "destinos", ["nombre", "responsable"]);
createCRUDRoutes("productos", "productos", ["nombre", "precio"]);
createCRUDRoutes("unidades", "unidades", ["nombre", "abreviatura"]);

module.exports = app;
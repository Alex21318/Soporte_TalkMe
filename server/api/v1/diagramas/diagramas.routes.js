const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

// Cargar variables de entorno desde archivo .env (en server/)
require('dotenv').config({ 
  path: path.join(__dirname, '..', '..', '..', '.env'),
  quiet: true 
});

// 🔴 Usamos Router para que pueda ser importado en index.js
const router = express.Router(); 

const pool = mysql.createPool({
  host: process.env.DIAGRAMAS_HOST,
  user: process.env.DIAGRAMAS_USER,
  password: process.env.DIAGRAMAS_PASSWORD,
  database: process.env.DIAGRAMAS_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 1. Guardar o Actualizar un Bot
router.post('/bots', async (req, res) => {
  const { botName, welcomeMessage, fileName, nodes, edges } = req.body;
  try {
    const [existingRows] = await pool.query('SELECT id FROM bots WHERE bot_name = ?', [botName]);
    if (existingRows.length > 0) {
      await pool.query(
        'UPDATE bots SET welcome_message = ?, file_name = ?, nodes_data = ?, edges_data = ? WHERE bot_name = ?',
        [welcomeMessage, fileName, JSON.stringify(nodes), JSON.stringify(edges), botName]
      );
      res.json({ message: 'Bot actualizado exitosamente' });
    } else {
      await pool.query(
        'INSERT INTO bots (bot_name, welcome_message, file_name, nodes_data, edges_data) VALUES (?, ?, ?, ?, ?)',
        [botName, welcomeMessage, fileName, JSON.stringify(nodes), JSON.stringify(edges)]
      );
      res.json({ message: 'Bot guardado exitosamente' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
});

// 2. Obtener la lista de todos los bots guardados
router.get('/bots', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, bot_name, updated_at FROM bots ORDER BY updated_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la lista de bots' });
  }
});

// 3. Cargar un bot específico por ID
router.get('/bots/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Bot no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar el bot' });
  }
});

// 🔴 ESTA ES LA LÍNEA QUE QUITA EL ERROR 🔴
module.exports = router;
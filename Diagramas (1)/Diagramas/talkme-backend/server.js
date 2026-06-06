const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = 3001;

app.use(cors()); 
app.use(express.json({ limit: '50mb' })); 

// 🔴 REEMPLAZA CON TUS DATOS DE ALWAYSDATA 🔴
const pool = mysql.createPool({
  host: 'mysql-diagramas.alwaysdata.net', // Ej: mysql-miempresa.alwaysdata.net
  user: 'diagramas',              // Ej: miempresa_admin
  password: 'Diagramas1234$',     // Tu contraseña
  database: 'diagramas_flow',        // Ej: miempresa_talkme
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 1. Guardar o Actualizar un Bot
app.post('/api/bots', async (req, res) => {
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
app.get('/api/bots', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, bot_name, updated_at FROM bots ORDER BY updated_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la lista de bots' });
  }
});

// 3. Cargar un bot específico por ID
app.get('/api/bots/:id', async (req, res) => {
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

app.listen(port, () => {
  console.log(`Backend de TalkMe corriendo en http://localhost:${port}`);
});
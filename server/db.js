const mysql = require('mysql2/promise');
const path = require('path');

// Apunta al archivo .env en la raiz del proyecto
// quiet: true para evitar logs excesivos de dotenv
require('dotenv').config({ 
  path: path.join(__dirname, '.env'),
  quiet: true 
});

// Configuración de zona horaria de Guatemala para que coincida con tus reportes
const dbOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true, 
    timezone: '-06:00',
    multipleStatements: true,
    charset: 'utf8mb4',
    connectTimeout: 10000
};

const pools = {
    control: mysql.createPool({
        host: process.env.AD_HOST,
        user: process.env.AD_USER,
        password: process.env.AD_PASSWORD,
        database: process.env.AD_DBNAME,
        ...dbOptions
    }),
    db_1: mysql.createPool({
        host: process.env.DB1_HOST,
        user: process.env.DB1_USER,
        password: process.env.DB1_PASSWORD,
        database: process.env.DB1_NAME,
        ...dbOptions
    }),
    db_2: mysql.createPool({
        host: process.env.DB2_HOST,
        user: process.env.DB2_USER,
        password: process.env.DB2_PASSWORD,
        database: process.env.DB2_NAME,
        ...dbOptions
    }),
    db_3: mysql.createPool({
        host: process.env.DB3_HOST,
        user: process.env.DB3_USER,
        password: process.env.DB3_PASSWORD,
        database: process.env.DB3_NAME,
        ...dbOptions
    }),
    db_4: mysql.createPool({
        host: process.env.DB4_HOST,
        user: process.env.DB4_USER,
        password: process.env.DB4_PASSWORD,
        database: process.env.DB4_NAME,
        ...dbOptions
    }),
    db_5: mysql.createPool({
        host: process.env.DB5_HOST,
        user: process.env.DB5_USER,
        password: process.env.DB5_PASSWORD,
        database: process.env.DB5_NAME,
        ...dbOptions
    }),
    db_6: mysql.createPool({
        host: process.env.DB6_HOST,
        user: process.env.DB6_USER,
        password: process.env.DB6_PASSWORD,
        database: process.env.DB6_NAME,
        ...dbOptions
    }),
    db_7: mysql.createPool({
        host: process.env.DB7_HOST,
        user: process.env.DB7_USER,
        password: process.env.DB7_PASSWORD,
        database: process.env.DB7_NAME,
        ...dbOptions
    }),
    db_8: mysql.createPool({
        host: process.env.DB8_HOST,
        user: process.env.DB8_USER,
        password: process.env.DB8_PASSWORD,
        database: process.env.DB8_NAME,
        ...dbOptions
    }),
    db_9: mysql.createPool({
        host: process.env.DB9_HOST,
        user: process.env.DB9_USER,
        password: process.env.DB9_PASSWORD,
        database: process.env.DB9_NAME,
        ...dbOptions
    }),
    db_10: mysql.createPool({
        host: process.env.DB10_HOST,
        user: process.env.DB10_USER,
        password: process.env.DB10_PASSWORD,
        database: process.env.DB10_NAME,
        ...dbOptions
    }),
    db_11: mysql.createPool({
        host: process.env.DB11_HOST,
        user: process.env.DB11_USER,
        password: process.env.DB11_PASSWORD,
        database: process.env.DB11_NAME,
        ...dbOptions
    }),
    db_12: mysql.createPool({
        host: process.env.DB12_HOST,
        user: process.env.DB12_USER,
        password: process.env.DB12_PASSWORD,
        database: process.env.DB12_NAME,
        ...dbOptions
    })
};

module.exports = pools;
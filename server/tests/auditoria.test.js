/**
 * Script de prueba para verificar que el endpoint de auditoría funciona
 * Ejecutar: node test-auditoria.js
 */

const http = require('http');

const testData = {
  tipo_accion: 'TEST',
  entidad: 'TEST_ENTITY',
  db_key: 'db_1',
  descripcion: 'Prueba de auditoría',
  metadata: { test: true, fecha: new Date().toISOString() }
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auditoria/log',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Enviando petición de prueba a auditoría...');
console.log('Datos:', testData);

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('RESPONSE:', data);
    try {
      const parsed = JSON.parse(data);
      if (parsed.success) {
        console.log('✅ AUDITORÍA FUNCIONANDO - Log insertado con ID:', parsed.id_log);
      } else {
        console.log('❌ Error en respuesta:', parsed.error);
      }
    } catch (e) {
      console.log('❌ Error parseando respuesta:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error en petición: ${e.message}`);
  console.log('Asegúrate de que el servidor esté corriendo en puerto 3001');
});

req.write(postData);
req.end();

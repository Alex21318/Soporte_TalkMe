import * as XLSX from 'xlsx';

const normalizeKey = (key) => {
  if (!key) return '';
  return key.toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
};

const normalizeRow = (row) => {
  const normalized = {};
  for (let key in row) {
    normalized[normalizeKey(key)] = row[key];
  }
  return normalized;
};

const extractDataFromSheet = (sheet) => {
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rows.length === 0) return [];

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const rowStr = (rows[i] || []).join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (rowStr.includes('id del menu') || rowStr.includes('id menu') || rowStr.includes('valor')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) return XLSX.utils.sheet_to_json(sheet);

  const headers = rows[headerRowIndex];
  const dataRows = rows.slice(headerRowIndex + 1);
  
  const result = [];
  for (const row of dataRows) {
    if (!row || row.length === 0 || row.every(c => c === undefined || c === null || String(c).trim() === '')) continue;
    
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = row[j] !== undefined ? row[j] : '';
      }
    }
    result.push(obj);
  }
  return result;
};

export const parseTalkMeExcel = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetNames = workbook.SheetNames;
        if (sheetNames.length === 0) throw new Error("El archivo Excel está vacío.");

        const generalSheet = workbook.Sheets[sheetNames[0]];
        const questionsSheet = sheetNames.length > 1 ? workbook.Sheets[sheetNames[1]] : null;
        
        let routingsSheet = null;
        const derivacionesTabName = sheetNames.find(name => name.toLowerCase().includes('derivacion') || name.toLowerCase().includes('derivar'));
        
        if (derivacionesTabName) {
            routingsSheet = workbook.Sheets[derivacionesTabName];
        } else if (sheetNames.length > 3) {
            routingsSheet = workbook.Sheets[sheetNames[3]];
        } else if (sheetNames.length > 2) {
            routingsSheet = workbook.Sheets[sheetNames[2]];
        }

        const rawGeneralData = extractDataFromSheet(generalSheet);
        const rawQuestions = extractDataFromSheet(questionsSheet);
        const rawRoutings = extractDataFromSheet(routingsSheet);

        if (rawGeneralData.length === 0) throw new Error("No hay datos legibles en la hoja principal.");

        const questionsData = rawQuestions.map(normalizeRow);
        const routingsData = rawRoutings.map(normalizeRow);

        const nodes = [];
        const edges = [];

        const generalData = rawGeneralData.map((row, index) => ({
          normalized: normalizeRow(row),
          original: rawGeneralData[index]
        }));

        const idToNameMap = {};
        generalData.forEach((item) => {
          const id = item.normalized['id del menu'] || item.original['Id del menu'];
          const nombre = item.original['Nombre'] || item.normalized['nombre'] || 'Desconocido';
          if (id !== undefined && id !== null) idToNameMap[String(id).trim()] = nombre;
        });

        generalData.sort((a, b) => {
          const valA = a.original['Orden'] || a.normalized['orden'];
          const valB = b.original['Orden'] || b.normalized['orden'];
          const numA = parseInt(valA, 10);
          const numB = parseInt(valB, 10);
          return (isNaN(numA) ? 999 : numA) - (isNaN(numB) ? 999 : numB);
        });

        generalData.forEach((item) => {
          const row = item.normalized;
          const originalRow = item.original;
          const id = row['id del menu'] !== undefined ? String(row['id del menu']).trim() : null;
          if (!id) return;

          const parentId = row['id padre'] !== undefined ? String(row['id padre']).trim() : null;
          
          const rawIdEncadenar = originalRow['ID menú encadenar'] || row['id menú encadenar'] || row['id menu encadenar'];
          const idEncadenar = rawIdEncadenar !== undefined && rawIdEncadenar !== null ? String(rawIdEncadenar).trim() : '';
          
          const nodeQuestions = questionsData.filter(q => {
             const qIdKey = Object.keys(q).find(k => k.includes('id'));
             return qIdKey && String(q[qIdKey]).trim() === id;
          });
          
          const nodeType = (originalRow['Opción'] || row['opcion'] || '').toLowerCase();
          const isMenuType = nodeType.includes('menú') || nodeType.includes('menu');
          
          const jumpsTo = [];
          if (idEncadenar) {
            jumpsTo.push({ type: 'chain', targetName: idToNameMap[idEncadenar] || idEncadenar });
          }
          const nodeRoutings = routingsData.filter(r => Object.keys(r).some(k => !k.includes('derivar') && !k.includes('destino') && String(r[k]).trim() === id));
          nodeRoutings.forEach(routing => {
            const derivarKey = Object.keys(routing).find(k => k.includes('derivar') || k.includes('destino'));
            const targetId = derivarKey ? String(routing[derivarKey]).trim() : null;
            const valorKey = Object.keys(routing).find(k => k === 'valor' || k.includes('valor'));
            if (targetId) {
                jumpsTo.push({ type: 'route', targetName: idToNameMap[targetId] || targetId, sourceValue: valorKey ? String(routing[valorKey]).trim() : '' });
            }
          });

          const getDetails = (url) => {
            if (!url || typeof url !== 'string' || !url.startsWith('http')) return { type: 'none', url: '' };
            const cleanUrl = url.trim();
            const ext = cleanUrl.split('.').pop().toLowerCase().split('?')[0];
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return { type: 'image', url: cleanUrl };
            if (ext === 'pdf') return { type: 'pdf', url: cleanUrl };
            if (['doc', 'docx'].includes(ext)) return { type: 'word', url: cleanUrl };
            if (['xls', 'xlsx', 'csv'].includes(ext)) return { type: 'excel', url: cleanUrl };
            if (['mp4', 'mov', 'avi'].includes(ext)) return { type: 'video', url: cleanUrl };
            
            return { type: 'file', url: cleanUrl };
          };

          const rawImg = String(originalRow['IMAGEN'] || row['imagen'] || '').trim();
          const rawFile = String(originalRow['ARCHIVO'] || row['archivo'] || '').trim();
          
          let fileDetails = getDetails(rawImg);
          if (fileDetails.type === 'none') {
            fileDetails = getDetails(rawFile);
          }

          nodes.push({
            id: id,
            type: 'botNode',
            data: {
              label: originalRow['Nombre'] || row['nombre'] || 'Sin Título',
              type: originalRow['Opción'] || row['opcion'] || 'Desconocido',
              keyword: originalRow['Palabra clave'] || row['palabra clave'] || '',
              responseText: originalRow['Texto de respuesta'] || row['texto de respuesta'] || '',
              
              // 🔴 EXTRACCIÓN DE COORDENADAS GPS
              latitud: originalRow['Latitud'] || row['latitud'] || '',
              longitud: originalRow['Longitud'] || row['longitud'] || '',
              
              imagen: fileDetails.type === 'image' ? fileDetails.url : '',
              fileType: fileDetails.type, 
              fileUrl: fileDetails.type !== 'image' ? fileDetails.url : '',
              archivo: fileDetails.type === 'none' ? (rawImg || rawFile) : '', 

              respuestaFinal: originalRow['Respuesta Final Formulario'] || row['respuesta final formulario'] || '',
              skill: originalRow['Skill'] || row['skill'] || '',
              visible: originalRow['Visible'] || row['visible'] || '',
              cierreTipologia: originalRow['Cierre de tipologia'] || row['cierre de tipologia'] || '',
              parentId: parentId,
              isMenuType: isMenuType,
              isRootMenu: isMenuType && (!parentId || parentId === '0'),
              isSubMenu: isMenuType && parentId && parentId !== '0',
              questions: nodeQuestions,
              jumpsTo: jumpsTo 
            }
          });

          if (parentId && parentId !== '0' && parentId !== 'undefined' && parentId !== 'null') {
            edges.push({
              id: `e${parentId}-${id}`,
              source: parentId,
              target: id,
              sourceHandle: 'source-bottom',
              targetHandle: 'target-top',
              type: 'treeEdge' 
            });
          }
        });

        resolve({ nodes, edges });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("Error de lectura del archivo."));
    reader.readAsArrayBuffer(file);
  });
};
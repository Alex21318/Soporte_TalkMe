import React, { useState, useEffect } from 'react';

export default function Sidebar({ selectedNode, onClose, onUpdateNode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    if (selectedNode) {
      setEditedData(selectedNode.data);
      setIsEditing(false);
    }
  }, [selectedNode]);

  if (!selectedNode) return null;
  const { data } = selectedNode;

  const isValido = (val) => {
    if (val === null || val === undefined) return false;
    const strVal = String(val).trim();
    return strVal !== '' && strVal.toLowerCase() !== 'no aplica';
  };

  const handleSave = () => {
    onUpdateNode(selectedNode.id, editedData);
    setIsEditing(false);
  };

  let displayType = data.type || 'N/A';
  if (data.isMenuType) {
    displayType = data.isRootMenu ? 'MENÚ' : 'SUB-MENÚ';
  }

  return (
    <div className="w-96 border-l border-slate-200 bg-white h-full shadow-2xl flex flex-col overflow-hidden">
      
      <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-none">Detalle de Nodo</h2>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">✕</button>
      </div>
      
      <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6">
        
        {/* BOTÓN DE MODO EDICIÓN */}
        <div className="flex justify-end">
          {isEditing ? (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300">Cancelar</button>
              <button onClick={handleSave} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700">Guardar Cambios</button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Editar Modo
            </button>
          )}
        </div>

        {isValido(data.idEncadenar) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-2">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Redirección Activa
            </span>
            <p className="text-sm font-semibold text-slate-800">Al terminar este nodo, el flujo salta al destino: <span className="text-amber-600 font-bold">{data.nombreEncadenar || 'Siguiente Nodo'}</span></p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nombre</label>
            {isEditing ? (
              <input type="text" className="w-full bg-slate-50 border border-blue-300 rounded p-2 text-sm font-semibold text-slate-800 focus:outline-none" value={editedData.label || ''} onChange={e => setEditedData({...editedData, label: e.target.value})} />
            ) : (
              <p className="text-sm font-semibold text-slate-800">{data.label}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tipo</label>
              <p className="text-sm text-slate-700">{displayType}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Visibilidad</label>
              <p className="text-sm text-slate-700">{data.visible || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Palabra Clave</label>
              {isEditing ? (
                <input type="text" className="w-full bg-slate-50 border border-blue-300 rounded p-1.5 text-sm font-mono text-slate-600" value={editedData.keyword || ''} onChange={e => setEditedData({...editedData, keyword: e.target.value})} />
              ) : (
                <p className="text-sm font-mono bg-slate-50 border border-slate-100 px-2 py-1 rounded inline-block text-slate-600">{data.keyword || '-'}</p>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Skill Asignada</label>
              <p className="text-sm text-slate-700">{data.skill || 'Ninguna'}</p>
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cierre de Tipología</label>
            <p className="text-sm text-slate-700">{data.cierreTipologia || 'Ninguno'}</p>
          </div>
        </div>

        {(isValido(data.responseText) || isEditing) && (
          <div className="pt-4 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Texto de Respuesta Inicial</label>
            {isEditing ? (
              <textarea rows={4} className="w-full bg-blue-50/50 border border-blue-300 rounded-lg p-3 text-sm text-slate-700 focus:outline-none" value={editedData.responseText || ''} onChange={e => setEditedData({...editedData, responseText: e.target.value})} />
            ) : (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap font-medium">{data.responseText}</div>
            )}
          </div>
        )}

        {(isValido(data.imagen) || isValido(data.archivo)) && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Multimedia Adjunta</label>
            
            {isValido(data.imagen) && (
              <a href={data.imagen} target="_blank" rel="noopener noreferrer" className="block border border-slate-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors group">
                <div className="bg-slate-100 p-2 flex items-center justify-center h-48">
                   <img 
                     src={`https://wsrv.nl/?url=${encodeURIComponent(data.imagen)}`} 
                     alt="Preview" 
                     crossOrigin="anonymous"
                     className="max-w-full max-h-full object-contain" 
                   />
                </div>
              </a>
            )}

            {isValido(data.archivo) && !isValido(data.imagen) && (
              <a href={data.archivo} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-slate-700 font-semibold text-sm">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span className="truncate">Descargar Archivo</span>
              </a>
            )}
          </div>
        )}

        {data.questions && data.questions.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Preguntas ({data.questions.length})</label>
            <div className="space-y-2">
              {data.questions.map((q, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded text-xs">
                  <span className="font-bold text-slate-700">{q.orden || q.Orden}.</span> {q.pregunta || q.Pregunta}
                </div>
              ))}
            </div>
          </div>
        )}

        {(isValido(data.respuestaFinal) || isEditing) && (
          <div className="pt-4 border-t border-slate-100">
            <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-2">Respuesta Final Formulario</label>
            {isEditing ? (
              <textarea rows={3} className="w-full bg-blue-50/80 border border-blue-400 rounded-lg p-3 text-sm text-slate-800 focus:outline-none" value={editedData.respuestaFinal || ''} onChange={e => setEditedData({...editedData, respuestaFinal: e.target.value})} />
            ) : (
              <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-sm text-slate-800 whitespace-pre-wrap font-medium">{data.respuestaFinal}</div>
            )}
          </div>
        )}

        {data.routings && data.routings.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Derivaciones ({data.routings.length})</label>
            <div className="space-y-2">
              {data.routings.map((r, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded text-xs flex justify-between">
                  <span className="font-semibold text-slate-700">Valor: {r.valor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
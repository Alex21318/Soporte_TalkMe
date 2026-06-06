import React, { useState, useEffect } from 'react';

export default function Sidebar({ 
  selectedNode, 
  updateNodeData,
  onExport,
  isExporting,
  botName,
  setBotName,
  welcomeMessage,
  setWelcomeMessage,
  showWelcome,
  setShowWelcome,
  showKeywords,
  setShowKeywords,
  showNodeTypes,
  setShowNodeTypes,
  fileName,
  rawProjectData,
  onClear,
  clientLogo,
  onClientLogoUpload,
  // Props para modo BD
  isBDMode = false,
  dbKey,
  setDbKey,
  empresaId,
  setEmpresaId,
  botId,
  setBotId,
  empresas,
  bots,
  onLoadFromDB,
  onFitView,
  loading
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [activeTab, setActiveTab] = useState('datos'); // 'datos' | 'config'

  useEffect(() => {
    if (selectedNode) {
      setEditedData(selectedNode.data);
      setIsEditing(false);
      setActiveTab('datos');
    }
  }, [selectedNode]);

  const isValido = (val) => {
    if (val === null || val === undefined) return false;
    const strVal = String(val).trim();
    return strVal !== '' && strVal.toLowerCase() !== 'no aplica';
  };

  const handleSave = () => {
    updateNodeData(selectedNode.id, editedData);
    setIsEditing(false);
  };

  // Handler para logo del cliente
  const handleLogoUpload = (event) => {
    if (onClientLogoUpload) {
      onClientLogoUpload(event);
    }
  };

  // DB Names mapping
  const dbNames = {
    'db_1': 'Talkme S1',
    'db_2': 'Talkme S2', 
    'db_3': 'Talkme S3',
    'db_4': 'Talkme S4',
    'db_5': 'Talkme MDD',
    'db_6': 'Ficohsa S1',
    'db_7': 'Ficohsa S2',
    'db_8': 'Ficohsa S3',
    'db_9': 'Modulo Seguridad Talkme',
    'db_10': 'Modulo Seguridad Ficohsa'
  };

  return (
    <div className="w-96 border-l border-slate-200 bg-white h-full shadow-2xl flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-none">
            {isBDMode ? 'Diagramas desde BD' : 'Diagramas'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isBDMode ? 'Datos desde BOT_MENU' : 'Cargar desde Excel'}
          </p>
        </div>
      </div>

      {/* Filtros de BD */}
      {isBDMode && (
        <div className="p-4 border-b border-slate-100 bg-blue-50/30">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Filtros Base de Datos
          </h3>
          
          <div className="space-y-3">
            {/* Base de datos */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Base de Datos
              </label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={dbKey}
                onChange={(e) => {
                  setDbKey(e.target.value);
                  setEmpresaId('');
                  setBotId('');
                }}
              >
                {Object.entries(dbNames).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            {/* Empresa */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Empresa {empresas.length > 0 && `(${empresas.length})`}
              </label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                value={empresaId}
                onChange={(e) => {
                  setEmpresaId(e.target.value);
                  setBotId('');
                }}
                disabled={!empresas.length}
              >
                <option value="">Seleccionar empresa...</option>
                {empresas.map(emp => (
                  <option key={emp.ID_EMPRESA} value={emp.ID_EMPRESA}>
                    {emp.NOMBRE}
                  </option>
                ))}
              </select>
            </div>

            {/* Bot */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Bot {bots.length > 0 && `(${bots.length})`}
              </label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                value={botId}
                onChange={(e) => setBotId(e.target.value)}
                disabled={!bots.length}
              >
                <option value="">Seleccionar bot...</option>
                {bots.map(bot => (
                  <option key={bot.ID_BOT} value={bot.ID_BOT}>
                    {bot.DESCRIPCION || `Bot ${bot.ID_BOT}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón cargar */}
            <button
              onClick={onLoadFromDB}
              disabled={loading || !dbKey || !empresaId || !botId}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cargando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Cargar Diagrama desde BD
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'datos' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('datos')}
        >
          {selectedNode ? 'Detalle Nodo' : 'Configuración'}
        </button>
        <button 
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'config' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('config')}
        >
          Ajustes
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        
        {/* Tab: Datos del Nodo */}
        {activeTab === 'datos' && selectedNode && (
          <div className="p-4 space-y-4">
            {/* Botón de edición */}
            <div className="flex justify-end">
              {isEditing ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave} 
                    className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Editar
                </button>
              )}
            </div>

            {/* Info del nodo */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nombre</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-blue-300 rounded p-2 text-sm font-semibold text-slate-800 focus:outline-none"
                    value={editedData.label || ''} 
                    onChange={e => setEditedData({...editedData, label: e.target.value})} 
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-800">{selectedNode.data.label}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tipo</label>
                  <p className="text-sm text-slate-700">{selectedNode.data.type || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ID</label>
                  <p className="text-sm font-mono text-slate-600">{selectedNode.id}</p>
                </div>
              </div>

              {selectedNode.data.keyword && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Palabra Clave</label>
                  <p className="text-sm font-mono bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-600">
                    {selectedNode.data.keyword}
                  </p>
                </div>
              )}

              {selectedNode.data.responseText && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Texto Respuesta</label>
                  {isEditing ? (
                    <textarea 
                      rows={3}
                      className="w-full bg-blue-50/50 border border-blue-300 rounded-lg p-2 text-sm text-slate-700 focus:outline-none"
                      value={editedData.responseText || ''} 
                      onChange={e => setEditedData({...editedData, responseText: e.target.value})}
                    />
                  ) : (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2 text-sm text-slate-700 whitespace-pre-wrap">
                      {selectedNode.data.responseText}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Configuración / Sin nodo seleccionado */}
        {(activeTab === 'config' || !selectedNode) && (
          <div className="p-4 space-y-4">
            {/* Nombre del Bot */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Nombre del Proyecto
              </label>
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Nombre del bot..."
              />
            </div>

            {/* Mensaje de bienvenida */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mensaje de Bienvenida
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showWelcome}
                    onChange={(e) => setShowWelcome(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600">Mostrar</span>
                </label>
              </div>
              {showWelcome && (
                <textarea 
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Texto de bienvenida..."
                />
              )}
            </div>

            {/* Logo del cliente */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Logo del Cliente
              </label>
              <div className="flex items-center gap-3">
                {clientLogo && (
                  <img src={clientLogo} alt="Client Logo" className="h-10 w-auto object-contain border border-slate-200 rounded p-1" />
                )}
                <label className="flex-1 cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <span className="block w-full text-center px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-200 transition-colors">
                    {clientLogo ? 'Cambiar logo...' : 'Subir logo...'}
                  </span>
                </label>
                {clientLogo && (
                  <button 
                    onClick={() => onClientLogoUpload({ target: { files: [] } })}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Eliminar logo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Toggles de visualización */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Opciones de Visualización
              </label>
              
              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                <input 
                  type="checkbox" 
                  checked={showNodeTypes}
                  onChange={(e) => setShowNodeTypes(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Mostrar tipo de nodos</span>
              </label>
              
              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                <input 
                  type="checkbox" 
                  checked={showKeywords}
                  onChange={(e) => setShowKeywords(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Mostrar palabras clave</span>
              </label>
            </div>

            {/* Acciones */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={onFitView}
                disabled={!rawProjectData}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Centrar Diagrama
              </button>

              <button
                onClick={onExport}
                disabled={isExporting || !rawProjectData}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exportando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar a PDF
                  </>
                )}
              </button>

              <button
                onClick={onClear}
                disabled={!rawProjectData}
                className="w-full bg-slate-100 text-slate-600 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpiar Diagrama
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

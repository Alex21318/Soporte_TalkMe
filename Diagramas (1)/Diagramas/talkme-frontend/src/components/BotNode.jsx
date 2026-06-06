import React, { useRef, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

// Paleta de colores para las líneas externas
const LINE_COLORS = ['#0ea5e9', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#84cc16', '#6366f1'];

export default function BotNode({ id, data, selected }) {
  const { setCenter, getNode } = useReactFlow();
  const nodeRef = useRef(null);
  const sourceRefs = useRef({});
  const targetRefs = useRef({});
  const [lines, setLines] = useState([]);

  const isValido = (val) => val && String(val).trim() !== '' && String(val).trim().toLowerCase() !== 'no aplica';

  const jumpsWithColors = (data.jumpsTo || []).map((jump, idx) => ({
    ...jump,
    color: LINE_COLORS[idx % LINE_COLORS.length]
  }));

  useEffect(() => {
    const drawLines = () => {
      if (!nodeRef.current) return;
      const container = nodeRef.current;
      const newLines = [];

      const getRelativePos = (el) => {
        let top = 0;
        let left = 0;
        let curr = el;
        while (curr && curr !== container && curr !== document.body) {
          top += curr.offsetTop;
          left += curr.offsetLeft;
          curr = curr.offsetParent;
        }
        return { top, left, width: el.offsetWidth, height: el.offsetHeight };
      };

      jumpsWithColors.forEach((jump, idx) => {
        let sourceEl = null;
        
        if (jump.type === 'chain') {
          sourceEl = sourceRefs.current['main-header'];
        } else {
          const possibleKeys = Object.keys(sourceRefs.current);
          const jumpVal = String(jump.sourceValue || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchKey = possibleKeys.find(k => k.includes(jumpVal) || jumpVal.includes(k));
          sourceEl = sourceRefs.current[matchKey];
        }

        const targetEl = targetRefs.current[`jump-${idx}`];

        if (sourceEl && targetEl) {
          const sPos = getRelativePos(sourceEl);
          const tPos = getRelativePos(targetEl);

          const startX = sPos.left;
          const startY = sPos.top + (sPos.height / 2);
          
          const endX = tPos.left;
          const endY = tPos.top + (tPos.height / 2);

          const trackX = -12 - (idx * 6); 

          newLines.push({
            path: `M ${startX} ${startY} L ${trackX} ${startY} L ${trackX} ${endY} L ${endX} ${endY}`,
            startX, startY, endX, endY, color: jump.color
          });
        }
      });
      setLines(newLines);
    };

    const t1 = setTimeout(drawLines, 50);
    const t2 = setTimeout(drawLines, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [data, selected]);

  if (data.type === 'BOT') {
    return (
      <div className={`bg-violet-600 text-white border-4 ${selected ? 'border-violet-300 ring-4 ring-violet-100' : 'border-violet-700'} rounded-2xl shadow-2xl w-[340px] h-[80px] flex items-center justify-center transition-all duration-200 relative`}>
        <div className="text-xl font-black uppercase tracking-widest text-center px-4 drop-shadow-lg">
          {data.label}
        </div>
        <Handle type="source" id="source-bottom" position={Position.Bottom} className="opacity-0 hover:opacity-100 !w-3 !h-3 !bg-slate-300 !border-2 !border-white transition-all z-50 cursor-crosshair" />
      </div>
    );
  }

  if (data.type === 'LOGO') {
    return (
      <div className="flex items-center justify-center p-4 bg-transparent pointer-events-none opacity-90">
        <img 
          src={data.imageUrl.startsWith('data:') ? data.imageUrl : `https://wsrv.nl/?url=${encodeURIComponent(data.imageUrl)}`} 
          alt="Logo" 
          crossOrigin="anonymous"
          className="max-w-[280px] max-h-[120px] object-contain drop-shadow-xl" 
        />
      </div>
    );
  }

  const getTypeColor = (type) => {
    const base = type ? String(type).toLowerCase() : '';
    if (base.includes('bienvenida')) return 'border-t-pink-500';
    if (base.includes('consumo') || base.includes('servicio web') || base.includes('dinamico')) return 'border-t-rose-500';
    if (base.includes('menú') || base.includes('menu') || base.includes('submenú') || base.includes('submenu')) return 'border-t-amber-500';
    if (base.includes('texto')) return 'border-t-blue-500';
    if (base.includes('skill')) return 'border-t-green-500';
    if (base.includes('formulario')) return 'border-t-orange-500';
    if (base.includes('sucursal')) return 'border-t-indigo-500';
    
    return 'border-t-slate-300';
  };

  const getFileInfo = (url) => {
    if (!url) return { label: 'ARCHIVO' };
    const ext = url.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return { label: 'PDF' };
    if (['doc', 'docx'].includes(ext)) return { label: 'WORD' };
    if (['xls', 'xlsx', 'csv'].includes(ext)) return { label: 'EXCEL' };
    return { label: ext.toUpperCase() };
  };

  const topBorderColor = getTypeColor(data.type);
  const nodeTypeStr = data.type ? String(data.type).toLowerCase() : '';
  const isMenuNode = nodeTypeStr.includes('menú') || nodeTypeStr.includes('menu') || nodeTypeStr.includes('submenú') || nodeTypeStr.includes('submenu');
  const isNotVisible = data.visible === 'No Visible';
  
  const hasResponseText = isValido(data.responseText);
  const hasRespuestaFinal = isValido(data.respuestaFinal);
  const hasQuestions = data.questions && data.questions.length > 0;
  
  const hasLocation = isValido(data.latitud) && isValido(data.longitud);
  
  // 🔴 CONSTRUIMOS LA URL REAL DE GOOGLE MAPS
  const mapsUrl = hasLocation ? `https://www.google.com/maps?q=$${data.latitud},${data.longitud}` : null;

  const isImage = data.fileType === 'image' || (!data.fileType && isValido(data.imagen));
  const showImage = isImage && isValido(data.imagen);

  const isUrlFile = data.fileType && data.fileType !== 'none' && data.fileType !== 'image';
  const showUrlFile = isUrlFile && isValido(data.fileUrl);

  const showPlainArchivo = (!showImage && !showUrlFile) && isValido(data.archivo);
  const hasSkill = isValido(data.skill);
  const hasCierre = isValido(data.cierreTipologia);
  const hasJumps = jumpsWithColors.length > 0;
  
  const showFooter = hasSkill || hasCierre;

  let displayType = data.type || 'NODO';
  let typeBadgeClass = "text-slate-600 border-slate-200 bg-slate-100";

  if (data.isMenuType) {
    if (data.isRootMenu) { displayType = 'MENÚ'; typeBadgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; } 
    else if (data.isSubMenu) { displayType = 'SUB-MENÚ'; typeBadgeClass = "bg-amber-100 text-amber-700 border-amber-200"; }
  } else {
    const colorMap = {
      'bienvenida': 'text-pink-600 border-pink-200 bg-pink-50',
      'texto': 'text-blue-600 border-blue-200 bg-blue-50',
      'skill': 'text-green-600 border-green-200 bg-green-50',
      'formulario': 'text-orange-600 border-orange-200 bg-orange-50',
      'consumo': 'text-rose-600 border-rose-200 bg-rose-50',
      'servicio web': 'text-rose-600 border-rose-200 bg-rose-50',
      'dinamico': 'text-rose-600 border-rose-200 bg-rose-50',
      'sucursal': 'text-indigo-600 border-indigo-200 bg-indigo-50', 
    };
    for (let [key, cls] of Object.entries(colorMap)) {
      if (nodeTypeStr.includes(key)) { typeBadgeClass = cls; break; }
    }
  }

  // Comportamiento de configuración visual
  const showTypeBadge = data.showNodeTypes !== false;
  const showKeywordBadge = data.showKeywords !== false && data.keyword;

  return (
    <div 
      ref={nodeRef}
      className={`bg-white flex flex-col ${selected ? 'ring-4 ring-blue-100' : ''} border border-slate-200 ${hasJumps ? 'rounded-t-xl rounded-b-md' : 'rounded-xl'} shadow-lg w-[340px] transition-all duration-200 overflow-visible ${isNotVisible ? 'opacity-70 border-dashed' : ''} border-t-4 ${topBorderColor} z-30 relative`}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40" style={{ overflow: 'visible' }}>
        {lines.map((l, i) => (
          <g key={i}>
            <path d={l.path} stroke={l.color} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
            <circle cx={l.startX} cy={l.startY} r="3.5" fill={l.color} />
            <circle cx={l.endX} cy={l.endY} r="3.5" fill={l.color} />
          </g>
        ))}
      </svg>
      
      <div className={`border-b border-slate-200 bg-white z-20 relative ${isMenuNode && !hasJumps ? 'rounded-b-xl' : ''}`}>
        
        {/* 🔴 TIPO DE NODO CONDICIONAL */}
        {showTypeBadge && (
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-center text-center rounded-t-xl relative">
            <div ref={el => sourceRefs.current['main-header'] = el} className="absolute left-0 top-1/2 w-1 h-1"></div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md border shadow-sm ${typeBadgeClass}`}>
              {displayType}
            </span>
          </div>
        )}

        <div className="flex w-full">
          <div className={`p-3 flex-1 flex flex-col gap-0.5 min-w-0 ${showKeywordBadge ? 'border-r border-slate-100' : ''}`}>
            {!showTypeBadge && <div ref={el => sourceRefs.current['main-header'] = el} className="absolute left-0 top-4 w-1 h-1"></div>}
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nombre:</span>
            <span className="font-black text-slate-800 text-xs uppercase break-words whitespace-normal leading-tight">{data.label}</span>
          </div>
          
          {/* 🔴 PALABRA CLAVE CONDICIONAL */}
          {showKeywordBadge && (
            <div className="p-3 w-[120px] shrink-0 flex flex-col gap-0.5 bg-slate-50/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Palabra Clave:</span>
              <span className="font-mono font-bold text-slate-600 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded inline-block break-all whitespace-normal shadow-sm w-full">{data.keyword}</span>
            </div>
          )}
        </div>
      </div>

      {!isMenuNode && (
        <div className="flex flex-col flex-grow z-20 relative">
          {hasResponseText && (
            <div className="p-4 bg-white border-b border-slate-50 w-full overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Texto de respuesta:</span>
              <div className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium break-all">
                {/* 🔴 GOOGLE MAPS LINK CONDICIONAL */}
                {data.responseText.split('@URL').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      mapsUrl ? (
                        <a 
                          href={mapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 mt-1 mb-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shadow-sm hover:bg-blue-100 transition-colors font-mono text-[10px] break-all max-w-full"
                          title="Abrir en Google Maps"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          {mapsUrl}
                        </a>
                      ) : (
                        <span className="text-rose-500 font-bold bg-rose-50 px-1 rounded border border-rose-200 text-[10px] inline-block mt-1 mb-1">
                          [@URL sin coordenadas en Excel]
                        </span>
                      )
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {hasLocation && (
            <div className="p-3 border-b border-slate-50 bg-indigo-50/40 w-full overflow-hidden">
              <div className="flex items-center gap-3 p-2 bg-white border border-indigo-100 rounded-xl shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                </div>
                <div className="overflow-hidden w-full flex flex-col">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Coordenadas GPS</span>
                  <span className="text-xs font-bold text-slate-700 font-mono tracking-tight">
                    {data.latitud}, {data.longitud}
                  </span>
                </div>
              </div>
            </div>
          )}

          {showImage && (
            <div className="p-2 border-b border-slate-50 bg-white">
              <div className="w-full h-40 bg-slate-50 rounded-lg flex items-center justify-center p-1 overflow-hidden shadow-inner border border-slate-100">
                 <img 
                   src={`https://wsrv.nl/?url=${encodeURIComponent(data.imagen)}`} 
                   alt="Media" 
                   crossOrigin="anonymous" 
                   loading="lazy" 
                   className="max-w-full max-h-full object-contain"
                   onError={(e) => { e.target.style.display = 'none'; }} 
                 />
              </div>
            </div>
          )}

          {/* 🔴 NUEVOS NOMBRES DE ICONOS */}
          {showUrlFile && (
            <div className="p-3 border-b border-slate-50 bg-white overflow-hidden w-full">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white rounded-lg p-0.5 shadow-sm border border-slate-100">
                  {data.fileType === 'pdf' && <img src="/PDF.png" alt="PDF" className="w-full h-full object-contain" />}
                  {data.fileType === 'word' && <img src="/WORD.png" alt="Word" className="w-full h-full object-contain" />}
                  {data.fileType === 'excel' && <img src="/EXCEL.png" alt="Excel" className="w-full h-full object-contain" />}
                  {data.fileType === 'video' && <img src="/MP4.png" alt="Video" className="w-full h-full object-contain" />}
                  
                  {!['pdf', 'word', 'excel', 'video'].includes(data.fileType) && (
                    <div className="w-full h-full rounded flex items-center justify-center text-white font-bold text-[9px] bg-slate-400">
                      {data.fileType.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden w-full">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Archivo Adjunto</p>
                  <p className="text-xs font-bold text-slate-700 break-all whitespace-normal leading-tight">
                    {String(data.fileUrl).split('/').pop().split('?')[0]}
                  </p>
                </div>
              </div>
            </div>
          )}

          {showPlainArchivo && (
            <div className="p-3 pt-2 bg-white border-b border-slate-50 flex justify-center w-full overflow-hidden">
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border shadow-sm bg-slate-50 text-slate-600 border-slate-200 w-full">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest break-words whitespace-normal leading-tight text-center">
                  {getFileInfo(data.archivo).label || 'Documento'} Adjunto
                </span>
              </div>
            </div>
          )}

          {hasQuestions && (
            <div className={`p-4 w-full overflow-hidden ${topBorderColor.replace('border-t-', 'bg-').replace('-500', '-50/30')}`}>
              <span className={`text-[11px] font-bold ${topBorderColor.replace('border-t-', 'text-').replace('-500', '-600')} uppercase tracking-wider block mb-3 flex items-center gap-1`}>
                PREGUNTAS ({data.questions.length})
              </span>
              <div className="space-y-3">
                {data.questions.map((q, idx) => {
                  const orden = q.orden || q.Orden || (idx + 1);
                  const preguntaTexto = q.pregunta || q.Pregunta || 'Pregunta sin definir';
                  const esCombo = String(q['tipo de respuesta'] || q['Tipo de respuesta'] || '').toLowerCase().includes('combo');
                  const respuestasOpciones = q.respuestas || q.Respuestas || '';

                  return (
                    <div key={idx} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                      <div className="text-[12px] font-bold text-slate-800 leading-snug break-words whitespace-normal">
                        <span className={`${topBorderColor.replace('border-t-', 'text-').replace('-500', '-500')} mr-1 text-[13px]`}>{orden}.</span>
                        {preguntaTexto}
                      </div>
                      
                      {esCombo && isValido(respuestasOpciones) ? (
                        <div className="w-full flex flex-col gap-2 mt-3">
                          {String(respuestasOpciones).split(',').map((opt, i) => {
                            const optionText = opt.trim();
                            const sourceKey = optionText.toLowerCase().replace(/[^a-z0-9]/g, '');

                            return (
                              <div 
                                key={i} 
                                ref={el => sourceRefs.current[sourceKey] = el}
                                className="w-full bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] text-center shadow-sm z-30 relative break-words whitespace-normal"
                              >
                                {optionText}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-3 mb-1 w-full flex items-center">
                          <div className="flex-grow border-b-[2.5px] border-dashed border-slate-200"></div><span className="text-[10px] text-slate-300 font-mono ml-2">Escribir...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasRespuestaFinal && (
            <div className="p-4 bg-sky-50/30 border-t border-sky-100 flex-grow w-full overflow-hidden">
              <span className="text-[10px] font-bold text-sky-600 uppercase block mb-2 flex items-center gap-1">
                ✓ Respuesta Final Formulario:
              </span>
              <div className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium break-all">{data.respuestaFinal}</div>
            </div>
          )}
          
          {showFooter && (
            <div className={`bg-slate-50 flex flex-col border-t border-slate-200 px-3 py-3 gap-1.5 w-full overflow-hidden ${hasJumps ? '' : 'rounded-b-xl'}`}>
               {hasCierre && (
                  <div className="bg-slate-800 text-white text-[10px] font-bold px-2.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="uppercase tracking-wider break-words whitespace-normal leading-tight">Cierre: {data.cierreTipologia}</span>
                  </div>
               )}
               {hasSkill && (
                  <div className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <svg className="w-4 h-4 shrink-0 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    <span className="uppercase tracking-wider break-words whitespace-normal leading-tight">Derivar: {data.skill}</span>
                  </div>
               )}
            </div>
          )}
        </div>
      )}

      {hasJumps && (
        <div className="mt-auto flex flex-col gap-2 bg-slate-100 p-3 rounded-b-xl z-20 relative w-full overflow-hidden">
          {jumpsWithColors.map((jump, idx) => (
            <div 
              key={idx} 
              ref={el => targetRefs.current[`jump-${idx}`] = el}
              className="relative bg-white border-2 px-3 py-2.5 rounded-lg shadow-sm flex flex-col justify-center leading-tight w-full"
              style={{ borderColor: jump.color }}
            >
               <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0" style={{ color: jump.color }}>
                 {jump.type === 'chain' ? (
                   <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> ENCADENADO A:</>
                 ) : (
                   <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg> DERIVA A:</>
                 )}
               </span>
               <span className="text-[13px] font-bold text-slate-800 break-words whitespace-normal mt-0.5">{jump.targetName}</span>
            </div>
          ))}
        </div>
      )}
      
      <Handle type="target" id="target-top" position={Position.Top} className="opacity-0 w-1 h-1" />
      <Handle type="source" id="source-bottom" position={Position.Bottom} className="opacity-0 w-1 h-1" />
    </div>
  );
}
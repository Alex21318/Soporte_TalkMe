# 🗂️ Índice de Funcionalidades por Pantallas

Este documento sirve como mapa de navegación y control de las especificaciones de diseño técnico de la aplicación. Mapea cada una de las pantallas y pestañas del sistema con sus respectivas carpetas de documentación.

---

## 🤖 Módulo: Automatizaciones (Cierres)
* **Código Frontend:** [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx) | [Cierres.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.css)
* **Código Backend:** [skills.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/skills.js) | [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js)

La ventana de **Automatizaciones** (históricamente llamada *Cierres*) cuenta con un menú lateral (sidebar) que hospeda 7 pestañas independientes. Cada pestaña cuenta con su propia documentación detallada:

### 1. Conversaciones (Cierre +30 días)
Automatiza el cierre de aquellas conversaciones que lleven abiertas más de 30 días en el sistema.
* **Carpeta de Documentación:** [Cierre de conversaciones mayores a 30 dias/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Cierre%20de%20conversaciones%20mayores%20a%2030%20dias/)
* **Funcionalidades Documentadas:**
  * [Ver conversaciones por cerrar](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Cierre%20de%20conversaciones%20mayores%20a%2030%20dias/ver_conversaciones_a_cerrar.md)
  * [Configuración de automatización diaria](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Cierre%20de%20conversaciones%20mayores%20a%2030%20dias/configuracion_de_automatizacion.md)
  * [Historial de ejecuciones y logs](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Cierre%20de%20conversaciones%20mayores%20a%2030%20dias/historial.md)
  * [Eliminar configuración de automatización](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Cierre%20de%20conversaciones%20mayores%20a%2030%20dias/eliminar_configuracion_de_automatizacion.md)
  * [Ejecutar manualmente (forzar cron o listado)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Cierre%20de%20conversaciones%20mayores%20a%2030%20dias/boton_de_ejecutar_manualmente.md)

### 2. Facebook (Eliminación solicitudes)
Limpia y marca como "completado" las solicitudes de eliminación de datos de usuarios de Facebook.
* **Carpeta de Documentación:** [Eliminacion de solicitudes de Facebook/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Eliminacion%20de%20solicitudes%20de%20Facebook/)
* **Funcionalidades Documentadas:**
  * [Ver solicitudes pendientes](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Eliminacion%20de%20solicitudes%20de%20Facebook/ver_solicitudes_pendientes.md)
  * [Configuración de automatización diaria](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Eliminacion%20de%20solicitudes%20de%20Facebook/configuracion_de_automatizacion.md)
  * [Historial de ejecuciones y logs](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Eliminacion%20de%20solicitudes%20de%20Facebook/historial.md)
  * [Eliminar configuración de automatización](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Eliminacion%20de%20solicitudes%20de%20Facebook/eliminar_configuracion_de_automatizacion.md)
  * [Ejecutar manualmente](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Eliminacion%20de%20solicitudes%20de%20Facebook/boton_de_ejecutar_manualmente.md)

### 3. Tags Bot (Validar palabras)
Permite buscar coincidencias en palabras clave (TAGs) asociadas a menús de los bots conversacionales para evitar solapamientos.
* **Carpeta de Documentación:** [Validacion de Tags Bot/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Validacion%20de%20Tags%20Bot/)
* **Funcionalidades Documentadas:**
  * [Buscar coincidencias de palabras clave](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Validacion%20de%20Tags%20Bot/buscar_coincidencias_tags.md)
  * [Detalles de búsqueda en la Base de Datos (MATCH AGAINST)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Validacion%20de%20Tags%20Bot/detalles_de_la_busqueda_en_base_de_datos.md)

### 4. Plantillas WA (Plantillas WhatsApp)
Muestra y permite editar detalles estéticos y técnicos de las plantillas oficiales homologadas por Gupshup.
* **Carpeta de Documentación:** [Plantillas de WhatsApp/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Plantillas%20de%20WhatsApp/)
* **Funcionalidades Documentadas:**
  * [Consulta y renderizado de plantillas](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Plantillas%20de%20WhatsApp/consulta_de_plantillas.md)
  * [Editar URL multimedia y asignación de pantallas](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Plantillas%20de%20WhatsApp/editar_plantilla.md)
  * [Exportación consolidada a Excel](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Plantillas%20de%20WhatsApp/exportar_plantillas_a_excel.md)

### 5. Reportes Auto (Descarga programada)
Módulo completo de descargas automatizadas de reportes consolidados y motor de plantillas de correo tipo Outlook.
* **Carpeta de Documentación:** [Reportes Automaticos/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Reportes%20Automaticos/)
* **Funcionalidades Documentadas:**
  * [Configuración general del Scheduler de Reportes](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Reportes%20Automaticos/configuracion_de_descargas.md)
  * [Gestión de destinatarios (PARA, CC, CCO)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Reportes%20Automaticos/gestion_de_destinatarios.md)
  * [Editor de plantillas de correo Outlook](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Reportes%20Automaticos/editor_de_plantillas_de_correo.md)
  * [Historial de ejecuciones y reintentos manuales](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Reportes%20Automaticos/historial_y_reintentos.md)

### 6. Auditoría (Logs del sistema)
Visor central de auditoría del sistema para revisar las acciones críticas realizadas por los usuarios de soporte.
* **Carpeta de Documentación:** [Auditoria/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Auditoria/)
* **Funcionalidades Documentadas:**
  * [Visor y filtros de logs de auditoría](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Auditoria/consulta_de_logs.md)

### 7. Configuraciones (Tema y apariencia)
Permite al administrador personalizar la visual de la aplicación.
* **Carpeta de Documentación:** [Configuraciones/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Configuraciones/)
* **Funcionalidades Documentadas:**
  * [Personalización de apariencia y paletas de colores](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Automatizaciones/Configuraciones/personalizacion_de_apariencia.md)

---

## 📦 Módulo: Creaciones
Módulo para crear y configurar nuevas instancias empresariales en el sistema TalkMe.
* **Código Frontend:** [Creaciones.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Creaciones/Creaciones.jsx) | [Creaciones.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Creaciones/Creaciones.css)
* **Carpeta de Documentación:** [Creaciones/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Creaciones/)

### 1. Creación de Instancia
Genera y ejecuta el script SQL completo para crear una nueva empresa en la plataforma (BOT, HORARIOS, SKILLS, BOT_REDES, PARAMETROS, etc.).
* [creacion_de_instancia.md](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Creaciones/creacion_de_instancia.md)

### 2. Integración WhatsApp (API Oficial)
Configura la integración con Gupshup: inserta configuraciones en BOT_RED_CONF_VALORES, crea tabla de mensajes y habilita parámetros.
* [integracion_whatsapp.md](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Creaciones/integracion_whatsapp.md)

### 3. Integración Facebook / Instagram
Configura FB Mensajes, FB Comentarios, IG Mensajes e IG Comentarios. Detecta redes disponibles automáticamente y crea tablas de mensajes.
* [integracion_facebook_ig.md](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Creaciones/integracion_facebook_ig.md)

### 4. Números Demos
Catálogo de números WhatsApp para demostraciones. Permite crear, editar, liberar y validar números contra bases de datos de producción.
* [numeros_demos.md](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Creaciones/numeros_demos.md)

---

## 📊 Módulo: Diagramas
Visualización y gestión de diagramas de flujo del sistema.
* **Código Frontend:** [Diagramas.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Diagramas/Diagramas.jsx) | [Diagramas.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Diagramas/Diagramas.css)
* **Carpeta de Documentación:** [Diagramas/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Diagramas/)
* **Funcionalidades Documentadas:**
  * [Visualización y gestión de diagramas](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Diagramas/visualizacion_de_diagramas.md)

---

## 🗄️ Módulo: DiagramasBD
Modelos de entidad-relación y esquemas de tablas de la base de datos.
* **Carpeta de Documentación:** [DiagramasBD/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/DiagramasBD/)
* **Funcionalidades Documentadas:**
  * [Modelos ER y esquemas de tablas](file:///d:/Proyectos/Soporte_TalkMe/Contexto/DiagramasBD/modelos_er.md)

---

## 🕐 Módulo: Horarios
Gestión de horarios de atención y programación de skills.
* **Código:** [Skills.jsx → pestaña HorariosBots](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Skills/Skills.jsx)
* **Carpeta de Documentación:** [Horarios/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Horarios/)
* **Funcionalidades Documentadas:**
  * [Gestión y programación de horarios de skills](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Horarios/gestion_de_horarios.md)

---

## 🤖 Módulo: HorariosBot
Programación de horarios de atención por Bot.
* **Código:** [HorariosBots.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Skills/HorariosBots.jsx)
* **Carpeta de Documentación:** [HorariosBot/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/HorariosBot/)
* **Funcionalidades Documentadas:**
  * [Horarios de Bots por empresa](file:///d:/Proyectos/Soporte_TalkMe/Contexto/HorariosBot/horarios_de_bots.md)

---

## 🔐 Módulo: Login
Pantalla de autenticación del sistema de soporte TalkMe.
* **Código Frontend:** [Login.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Login/Login.jsx) | [Login.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Login/Login.css) | [InitAdmin.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Login/InitAdmin.jsx)
* **Carpeta de Documentación:** [Login/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Login/)
* **Funcionalidades Documentadas:**
  * [Flujo de autenticación y recordar usuario](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Login/flujo_de_autenticacion.md)
  * [Inicialización de administrador (InitAdmin)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Login/inicializacion_admin.md)

---

## 📈 Módulo: Reportes
Descarga y visualización de reportes del sistema.
* **Código Frontend:** [Reportes2.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Reportes/Reportes2.jsx) | [Reportes2.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Reportes/Reportes2.css)
* **Carpeta de Documentación:** [Reportes/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Reportes/)
* **Funcionalidades Documentadas:**
  * [Descarga y filtrado de reportes](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Reportes/descarga_de_reportes.md)

---

## 🎯 Módulo: Skills
Gestión de skills (colas de atención), horarios y permisos de usuarios.
* **Código Frontend:** [Skills.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Skills/Skills.jsx) | [Skills.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Skills/Skills.css)
* **Carpeta de Documentación:** [Skills/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Skills/)
* **Funcionalidades Documentadas:**
  * [Búsqueda y listado de skills](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Skills/busqueda_de_skills.md)
  * [Gestión de horarios de skills (CRUD)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Skills/gestion_de_horarios_skills.md)
  * [Programación masiva de cambios de horario](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Skills/programacion_masiva_horarios.md)
  * [Edición de mensajes de skill](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Skills/edicion_de_mensajes.md)
  * [Asignación/eliminación de permisos de skill a usuarios](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Skills/permisos_de_skills.md)
  * [Cola activa e historial de cambios programados](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Skills/cola_activa_e_historial.md)
  * [Horarios de Bots (pestaña interna)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Skills/horarios_de_bots.md)

---

## 👥 Módulo: Usuarios
Gestión completa de usuarios, permisos, seguridad y estados de plataforma.
* **Código Frontend:** [Usuarios.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Usuarios/Usuarios.jsx) | [aSeguridad.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Usuarios/aSeguridad.jsx) | [UsuariosQRM.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Usuarios/UsuariosQRM.jsx) | [SistemaUsuarios.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Usuarios/SistemaUsuarios.jsx)
* **Carpeta de Documentación:** [Usuarios/](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Usuarios/)
* **Funcionalidades Documentadas:**
  * [Revisar permisos de un usuario](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Usuarios/revisar_permisos_usuario.md)
  * [Asignación masiva de permisos](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Usuarios/asignacion_masiva_de_permisos.md)
  * [Asignación por ejemplo (copiar permisos)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Usuarios/asignacion_por_ejemplo.md)
  * [Gestión masiva de permisos (CRUD bulk)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Usuarios/gestion_masiva_de_permisos.md)
  * [Historial de estados de usuarios](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Usuarios/historial_de_estados.md)
  * [Vista QRM (gestión por sociedad/marca)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Usuarios/vista_qrm.md)
  * [Seguridad (perfiles y accesos)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Usuarios/seguridad.md)
  * [Sistema de Usuarios (gestión interna)](file:///d:/Proyectos/Soporte_TalkMe/Contexto/Usuarios/sistema_usuarios.md)

---

> [!NOTE]
> **Aviso para desarrolladores y asistentes de codificación (Windsurf, Cascade, Cursor, Gemini):** De acuerdo a las reglas definidas en [.windsurfrules](file:///d:/Proyectos/Soporte_TalkMe/.windsurfrules), cualquier modificación de código en frontend o backend que afecte estas pantallas debe ser reflejada y actualizada en los correspondientes archivos Markdown listados arriba.

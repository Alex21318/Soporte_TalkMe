# 🎯 Búsqueda y Listado de Skills

## Descripción General
Vista principal del módulo Skills. Permite buscar skills (colas de atención) de una empresa, filtrar por usuario, estado y estado de eliminación. Muestra los resultados en una tabla paginada con los horarios de cada skill expandibles.

## Código Fuente
- **Frontend:** [Skills.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Skills/Skills.jsx)

---

## Filtros Disponibles

| Filtro               | Descripción                                              |
|----------------------|----------------------------------------------------------|
| Base de Datos        | Selección de BD (db_1 a db_10, Talkme + Ficohsa)        |
| Empresa              | Dropdown searchable con paginación scroll infinito       |
| Skills               | Multi-selección de skills específicos                    |
| Usuarios             | Multi-selección de usuarios para ver sus skills          |
| Estado               | Activo / Inactivo / Todos                               |
| Eliminado            | Mostrar/ocultar skills eliminados                        |

---

## Tabla de Resultados

Columnas principales:
- **ID_SKILL** (ordenable)
- **Nombre Skill** (ordenable)
- **Empresa / DB**
- **Mensaje de fuera de horario** (editable directamente)
- **Horarios** (expandibles por fila)

Cada fila de skill puede expandirse para ver sus horarios con:
- Rango de hora (DESDE - HASTA, en horario Guatemala)
- Días de la semana activos (L, M, M, J, V, S, D)
- Botones de acción (editar, eliminar horario)

---

## Persistencia de Estado
Los filtros y datos cargados se guardan en `sessionStorage` para no re-fetchear al cambiar de pestaña:

| Clave sessionStorage      | Contenido                |
|---------------------------|--------------------------|
| `skills_filtros`          | Filtros activos          |
| `skills_data`             | Skills cargados          |
| `skills_seleccionados`    | Skills seleccionados     |
| `skills_empresas`         | Lista de empresas        |
| `skills_usuarios_lista`   | Lista de usuarios        |
| `skills_skills_lista`     | Lista de skills          |
| `skills_currentPage`      | Página actual            |
| `skills_sortConfig`       | Configuración de orden   |

---

## Endpoints Usados

| Método | Endpoint                                              | Descripción                        |
|--------|-------------------------------------------------------|------------------------------------|
| GET    | `/api/empresas/{dbKey}`                               | Empresas para dropdown             |
| GET    | `/api/usuarios/{dbKey}/{idEmp}?search={s}&page={p}`  | Usuarios con paginación            |
| GET    | `/api/skills-lista/{dbKey}/{idEmp}?search={s}&page={p}` | Skills para dropdown            |
| GET    | `/api/skills/{dbKey}/{idEmp}?ids_skill=&ids_usuario=&estado=&eliminado=` | Buscar skills |

---

## Notas para Desarrolladores
- Los dropdowns usan scroll infinito para cargar más páginas.
- Los filtros de skills y usuarios son multi-select (chips).
- Ver `.windsurfrules` para las reglas de actualización.

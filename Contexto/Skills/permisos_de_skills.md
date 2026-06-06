# 🔑 Permisos de Skills a Usuarios

## Descripción General
Funcionalidad para asignar o eliminar el permiso de atención de un skill específico a uno o más usuarios. Un usuario con permiso en un skill puede ser incluido en esa cola de atención.

## Código Fuente
- **Frontend:** [Skills.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Skills/Skills.jsx)

---

## Flujo de Asignación de Permisos

```
1. En el filtro, seleccionar uno o más usuarios (multi-select).
2. Buscar los skills de la empresa.
3. En la tabla, cada skill muestra botones + Agregar / - Eliminar.
4. Al hacer clic, el permiso se aplica a TODOS los usuarios seleccionados simultáneamente.
```

---

## Acciones de Permisos

| Acción        | Endpoint                                           | Método  |
|---------------|----------------------------------------------------|---------|
| Agregar permiso | `POST /api/permisos/usuario`                     | POST    |
| Eliminar permiso | `DELETE /api/permisos/usuario/{idUsuario}/{idSkill}` | DELETE |

El sistema envía una petición por cada usuario seleccionado en paralelo (`Promise.all`).

---

## Respuesta

Tras ejecutar la acción, el sistema:
1. Muestra el conteo de operaciones exitosas (`X de Y usuarios actualizados`).
2. Re-ejecuta la búsqueda de skills para actualizar la vista.

---

## Notas para Desarrolladores
- Si no hay usuarios seleccionados en el filtro, el botón de permisos muestra un warning toast.
- La tabla de skills muestra el estado de permiso por usuario cuando hay usuarios en el filtro.
- Ver `.windsurfrules` para las reglas de actualización.

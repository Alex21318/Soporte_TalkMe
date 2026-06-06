# 🗓️ Gestión de Horarios de Skills (CRUD)

## Descripción General
Funcionalidad para agregar, editar y eliminar horarios de atención de un skill individual. Cada skill puede tener múltiples horarios con diferentes rangos y días de la semana.

## Código Fuente
- **Frontend:** [Skills.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Skills/Skills.jsx)

---

## Acciones Disponibles

### Agregar Horario
- Botón **+ Horario** en la fila del skill.
- Abre modal con campos: Hora Desde (HH:MM:SS), Hora Hasta (HH:MM:SS), Días de la semana (checkboxes L-D).
- Valores por defecto: 08:00:00 - 17:00:00, Lunes a Viernes activos.
- Endpoint: `POST /api/horarios`

### Editar Horario
- Ícono ✏️ en la fila del horario (dentro del skill expandido).
- Reutiliza el mismo modal, precargado con los valores actuales.
- Los valores de hora se muestran en horario de **Guatemala (UTC-6)**.
- Endpoint: `PUT /api/horarios/{dbKey}/{idHorario}`

### Eliminar Horario
- Ícono 🗑️ en la fila del horario.
- Requiere confirmación modal.
- El horario se elimina **permanentemente** de la base de datos.
- Endpoint: `DELETE /api/horarios/{dbKey}/{idHorario}`

---

## Modal de Horario

| Campo              | Descripción                            |
|--------------------|----------------------------------------|
| Hora Desde         | Hora de inicio (formato HH:MM:SS)      |
| Hora Hasta         | Hora de fin (formato HH:MM:SS)         |
| Días de la semana  | Checkboxes: L, M, M, J, V, S, D        |

Los días se almacenan como una cadena binaria de 7 caracteres: `1110000` = Lunes, Martes, Miércoles.

---

## Edición Masiva de Horarios
Permite editar los horarios de múltiples skills a la vez:
1. Activar modo **Edición Masiva** (botón en toolbar).
2. Los campos Desde/Hasta de cada skill se vuelven editables inline.
3. Botón **Guardar Masivo**: aplica todos los cambios en paralelo.
- Endpoint: `PUT /api/horarios/{dbKey}/{idHorario}` (una llamada por horario modificado)

---

## Endpoints Backend

| Método | Endpoint                              | Descripción                        |
|--------|---------------------------------------|------------------------------------|
| POST   | `/api/horarios`                       | Crea un nuevo horario              |
| PUT    | `/api/horarios/{dbKey}/{idHorario}`   | Actualiza un horario existente     |
| DELETE | `/api/horarios/{dbKey}/{idHorario}`   | Elimina un horario                 |

---

## Notas para Desarrolladores
- Las horas en BD están en UTC. El frontend muestra `DESDE_GUATE` y `HASTA_GUATE` (convertidas a Guatemala).
- La cadena de días `DIAS` es un string de 7 bits (posición 0 = Lunes, posición 6 = Domingo).
- Ver `.windsurfrules` para las reglas de actualización.

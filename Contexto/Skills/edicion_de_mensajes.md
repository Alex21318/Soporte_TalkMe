# ✉️ Edición de Mensajes de Skill

## Descripción General
Funcionalidad para editar el mensaje de fuera de horario de un skill, tanto de forma individual como masiva durante la programación de cambios temporales.

## Código Fuente
- **Frontend:** [Skills.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Skills/Skills.jsx)

---

## Edición Individual de Mensaje
1. En la tabla de skills, cada fila muestra el campo **Mensaje** del skill (truncado).
2. Clic en el mensaje o en el ícono de edición → abre el modal de edición directa.
3. El usuario modifica el texto y presiona **Guardar**.
4. Endpoint: `PUT /api/skills/{dbKey}/{idSkill}/mensaje`

---

## Modal de Edición de Mensaje

| Campo    | Descripción                          |
|----------|--------------------------------------|
| Mensaje  | Área de texto con el mensaje actual  |

---

## Edición de Mensaje en Programación Masiva
Dentro del modal de **Programación Masiva**, hay una sección colapsable por skill que permite definir un mensaje temporal diferente por skill:

| Campo               | Descripción                                     |
|---------------------|-------------------------------------------------|
| Nuevo Mensaje       | Mensaje temporal mientras está el horario activo |
| Fecha Aplicación    | Cuándo se aplica el mensaje                     |
| Fecha Reversión     | Cuándo se revierte al mensaje original          |
| Habilitado          | Checkbox para incluir/excluir este skill        |

---

## Programación Individual de Mensaje
Existe también una opción de programar el cambio de mensaje de un skill individual con fecha de aplicación y reversión (modal propio: `showProgramarMensajeModal`).

---

## Endpoints Backend

| Método | Endpoint                                       | Descripción                        |
|--------|------------------------------------------------|------------------------------------|
| PUT    | `/api/skills/{dbKey}/{idSkill}/mensaje`        | Guarda el nuevo mensaje del skill  |
| POST   | `/api/skills/programar-mensaje`                | Programa cambio de mensaje         |

---

## Notas para Desarrolladores
- El mensaje de skill es el texto que responde el bot cuando un usuario contacta fuera de horario de atención.
- Ver `.windsurfrules` para las reglas de actualización.

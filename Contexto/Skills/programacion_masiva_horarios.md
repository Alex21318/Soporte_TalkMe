# 📅 Programación Masiva de Cambios de Horario

## Descripción General
Funcionalidad avanzada que permite programar un cambio temporal de horario para múltiples skills seleccionados, con fecha de aplicación y fecha de reversión automática.

## Código Fuente
- **Frontend:** [Skills.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Skills/Skills.jsx)
- **Backend:** [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js)

---

## Flujo de Programación Masiva

```
1. Usuario busca y selecciona los skills objetivo.
2. Abre modal de "Programar cambio masivo".
3. Define: nuevo horario (Desde/Hasta/Días), fecha de aplicación, fecha de reversión (opcional).
4. Opcionalmente configura un mensaje diferente por skill (colapsable por skill).
5. Confirma → el backend crea horarios temporales y programa jobs de reversión.
```

---

## Modal de Programación Masiva

| Campo               | Descripción                                            |
|---------------------|--------------------------------------------------------|
| Nuevo Desde         | Hora de inicio del nuevo horario temporal              |
| Nuevo Hasta         | Hora de fin del nuevo horario temporal                 |
| Días                | Checkboxes L-D para los días a aplicar                 |
| Fecha de Aplicación | Fecha en que se aplica el cambio                      |
| Fecha de Reversión  | Fecha en que se revierte al horario original (opcional)|
| Mensajes por skill  | Sección colapsable con campo de mensaje por cada skill |

---

## Función de Copiar/Pegar Fechas
- **Clipboard de fechas**: permite copiar la fecha_aplicacion y fecha_reversion de un skill y pegarla en otro dentro del modal, agilizando la configuración cuando múltiples skills comparten las mismas fechas.

---

## Horarios Temporales
Los horarios programados se muestran en la sección **Cola Activa** (tab inferior):
- Skill afectado
- Horario temporal aplicado
- Fecha de aplicación / reversión
- Estado: pendiente / aplicado / revertido

---

## Endpoints Backend

| Método | Endpoint                          | Descripción                              |
|--------|-----------------------------------|------------------------------------------|
| GET    | `/api/skills/programados`         | Cola activa de cambios programados       |
| GET    | `/api/skills/historial`           | Historial de cambios ejecutados          |
| POST   | `/api/skills/programar`           | Programa un cambio masivo                |
| DELETE | `/api/skills/programados/{id}`    | Cancela un cambio programado             |

---

## Notas para Desarrolladores
- La cola activa se refresca automáticamente cada **10 segundos** mediante `setInterval`.
- Los jobs de reversión son ejecutados por el `scheduler.js` del servidor.
- Ver `.windsurfrules` para las reglas de actualización.

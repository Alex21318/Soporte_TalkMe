# Personalización de Temas y Apariencia

Esta sección documenta la pestaña de configuración visual de la aplicación, la cual permite cambiar el tema de colores global o elegir un color HEX personalizado y propagarlo reactivamente a todos los elementos del frontend.

---

## 🖥️ Interfaz de Usuario (Frontend)

La interfaz se implementa en [ContenidoConfiguraciones.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/ContenidoConfiguraciones.jsx) y su hoja de estilos en `src/pages/Cierres/Configuraciones.css`.

### 1. Integración con el Contexto de Temas (`ThemeContext`)
El componente consume el hook global `useTheme()` definido en [ThemeContext.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/context/ThemeContext.jsx):
* Expone el tema activo (`tema`), el modificador del tema (`setTema`), el color personalizado actual (`colorCustom`), el modificador del color (`setColorCustom`), la lista de temas disponibles (`temas`) y la constante de identificación del tema personalizado (`CUSTOM_THEME_ID`).

### 2. Panel: Color Personalizado (Custom Color)
El usuario puede cambiar el color principal de toda la aplicación utilizando dos métodos en pantalla:
* **Selector Visual (Color Picker):** Un control nativo de paleta de colores (`<input type="color">`) camuflado bajo un contenedor interactivo con el color activo de fondo. Mover el selector dispara `handlePickerChange` y actualiza inmediatamente el color.
* **Entrada de Texto HEX:** Un campo de texto formateado con el prefijo `#` que permite ingresar el código hexadecimal de 6 dígitos. La función `handleHexChange` valida mediante expresión regular (`/^#[0-9a-fA-F]{6}$/`) que sea un color HEX sintácticamente correcto antes de guardar el cambio.
* **Presets de Colores Rápidos:** Una lista de 15 círculos pre-coloreados (`COLORES_RAPIDOS`) con paletas sugeridas (ej: índigo, verde esmeralda, naranja, violeta). Hacer clic sobre alguno aplica directamente el color correspondiente a toda la aplicación.
* **Indicación de Estado:** Si el tema activo coincide con `CUSTOM_THEME_ID`, muestra una etiqueta verde que indica "Color personalizado activo". De lo contrario, indica "Usando tema predefinido".

### 3. Panel: Temas Predefinidos
Muestra una cuadrícula con tarjetas de temas prediseñados:
* Cada tarjeta muestra una previsualización con el gradiente de fondo del tema (`t.gradiente`) y un checkmark (✓) en caso de estar activo.
* Al hacer clic en una tarjeta, se invoca `setTema(t.id)` para activar la paleta predefinida correspondiente (ej: tema clásico, tema verde, etc.).

---

## ⚙️ Mecanismo de Propagación de Estilos

* Al modificar el tema o el color personalizado, el contexto `ThemeContext` actualiza las variables CSS globales (`custom-properties`) en el documento raíz (como `--tm-primary-500`, `--tm-primary-600`, etc.).
* El módulo de Cierres (`Cierres.css`) utiliza estas variables CSS (e.g. `var(--tm-primary-300)`) para pintar los bordes de campos de búsqueda, colores de fondo de botones de acción, sombras de tarjetas y estados de hover.
* Los cambios se persisten de forma local e inmediata en el navegador mediante `localStorage` utilizando las llaves `talkme_theme` y `talkme_theme_custom_color`.

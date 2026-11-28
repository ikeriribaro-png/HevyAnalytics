# Entorno Público (versionesgit/HevyAnalytics)

Reglas y directrices estrictas para el desarrollo y mantenimiento en el repositorio público:

1. **Privacidad de Datos:** Está terminantemente prohibido subir archivos `.csv` con datos de entrenamientos reales, sesiones, exportaciones personales o rutas absolutas locales.
2. **Seguridad DOM:** Todas las inserciones dinámicas de contenido deben usar `textContent`, `setAttribute` o `addEventListener`. Queda totalmente prohibido el uso de `innerHTML` con datos dinámicos o de usuario, así como atributos `onclick` inline.
3. **Compatibilidad:** Mantener el cliente web autocontenido y funcional sin dependencias externas de servidores complejos.
4. **Traducciones y Textos:** Conservar intactos los botones y etiquetas predeterminados (como `<button id="btnCalAll">TODO</button>` en `index.html`).

# Dashboard Turismo - Jalisco

Página web interactiva que muestra los pueblos mágicos de Jalisco en un mapa con información turística actualizada dinámicamente desde Google Sheets.

## Características

- **Mapa interactivo** con Leaflet.js
- **Carga dinámica de datos** desde Google Sheets (CSV)
- **Pop-ups mejorados** sin truncamiento de información
- **Links descriptivos** (no URLs visibles)
- **Actualización automática** de datos cada 5 segundos
- **Botón de actualización manual** para forzar recarga de datos
- **Indicador de estado** en tiempo real
- **Responsive design** para dispositivos móviles

## Archivos

- `index.html` - Estructura HTML principal
- `app.js` - Lógica de la aplicación y carga de datos desde Google Sheets
- `styles.css` - Estilos CSS mejorados
- `jalisco_municipios.geojson` - Datos geográficos de municipios
- `pueblo-magico-icon.png` - Icono para marcadores de pueblos mágicos
- `README.md` - Este archivo

## Instalación en GitHub Pages

1. Clona este repositorio en tu cuenta de GitHub
2. Accede a Settings > Pages
3. Selecciona "Deploy from a branch"
4. Elige la rama `main` y carpeta `/ (root)`
5. Guarda los cambios

La página estará disponible en: `https://tu-usuario.github.io/Turismo3/`

## Estructura de datos del Google Sheet

El archivo espera un Google Sheet con las siguientes columnas (A-H):

| Columna | Nombre | Ejemplo |
|---------|--------|---------|
| A | # | 1 |
| B | Pueblo Mágico | Ajijic |
| C | Latitud | 20.3005337 |
| D | Longitud | -103.262198 |
| E | Consejos de Seguridad | Disfruta el centro a pie... |
| F | Distancia / Tiempo | 1.5 hrs / 60km |
| G | Ruta/Viaje desde GDL | https://waze.com/... |
| H | Link Turismo | https://pueblosmagicos.com/... |

## Cómo funciona

1. Al cargar la página, se obtiene automáticamente el CSV del Google Sheet
2. Se parsean los datos y se crean marcadores en el mapa
3. Al hacer clic en un marcador, se abre un modal con la información completa
4. Los links se muestran con texto descriptivo ("Ver ruta en Waze", "Visitar sitio turístico")
5. Cada 5 segundos se verifica si hay cambios en los datos

## Actualización de datos

Para actualizar los datos del mapa:
1. Modifica el Google Sheet
2. Haz clic en el botón "🔄 Actualizar" en la página
3. Los datos se cargarán automáticamente

## Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- Leaflet.js (mapas)
- Google Sheets (base de datos)
- OpenStreetMap (mapa base)

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## Autor

Desarrollado para mejorar la experiencia de turismo en Jalisco.

---

**Última actualización:** 18 de Febrero de 2026

/*
 * Dashboard Turismo - Jalisco (Versión Final Corregida)
 * Script principal para la gestión del mapa interactivo con carga dinámica desde Google Sheets
 * 
 * Funcionalidades:
 * - Carga dinámica de datos desde Google Sheets (CSV)
 * - Renderizado de municipios desde GeoJSON
 * - Interactividad: hover transparente y click para mostrar información
 * - Pop-ups mejorados con información turística sin truncamiento
 * - Links con texto descriptivo (no URLs visibles)
 * - Actualización manual de datos
 */

// ============================================
// VARIABLES GLOBALES
// ============================================

let map;
let geojsonLayer;
let turismoDatos = {};
let currentActiveFeature = null;
let pueblosMagicosMarkers = [];
let dataManager;
let currentLanguage = 'es';
let turismoDatosEnglish = {};

const STYLES = {
    default: {
        color: '#666',
        weight: 2,
        opacity: 0.7,
        fillColor: '#d0d0d0',
        fillOpacity: 0.7
    },
    hover: {
        color: '#2a5298',
        weight: 2.5,
        opacity: 1,
        fillColor: '#2a5298',
        fillOpacity: 0.3
    },
    active: {
        color: '#1e3c72',
        weight: 3,
        opacity: 1,
        fillColor: '#2a5298',
        fillOpacity: 0.5
    }
};

// ============================================
// CLASE GESTOR DE DATOS DESDE GOOGLE SHEETS
// ============================================

class TurismoDataManager {
    constructor() {
        this.googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/1x8jI4RYM6nvhydMfxBn68x7shxyEuf_KWNC0iDq8mzw/export?format=csv&gid=0';
        this.updateInterval = 5000;
        this.lastDataHash = null;
        this.isUpdating = false;
        this.statusElement = null;
        this.createStatusIndicator();
        this.startAutoUpdate();
    }

    createStatusIndicator() {
        const headerContent = document.querySelector('.header-content');
        if (headerContent) {
            this.statusElement = document.querySelector('.status-indicator');
        }
    }

    updateStatus(icon, text) {
        const statusIcon = document.getElementById('status-icon');
        const statusText = document.getElementById('status-text');
        if (statusIcon) statusIcon.textContent = icon;
        if (statusText) statusText.textContent = text;
    }

    startAutoUpdate() {
        setInterval(() => {
            this.updateData();
        }, this.updateInterval);

        const manualUpdateBtn = document.getElementById('manual-update');
        if (manualUpdateBtn) {
            manualUpdateBtn.addEventListener('click', () => {
                this.updateData(true);
            });
        }
    }

    async updateData(manual = false) {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        if (manual) {
            this.updateStatus('🔄', 'Actualizando datos...');
        }

        try {
            const newData = await this.fetchDataFromGoogleSheets();
            const newHash = JSON.stringify(newData).split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);

            if (newHash !== this.lastDataHash || manual) {
                turismoDatos = {};
                newData.forEach(pueblo => {
                    turismoDatos[pueblo.nombre] = pueblo;
                });
                this.lastDataHash = newHash;
                
                if (typeof updatePueblosMagicosMarkers === 'function') {
                    updatePueblosMagicosMarkers();
                }
                
                this.updateStatus('🟢', 'Datos actualizados');
                console.log('✓ Datos actualizados:', Object.keys(turismoDatos).length, 'pueblos');
            } else {
                this.updateStatus('🟢', 'Sin cambios');
            }
        } catch (error) {
            console.error('Error actualizando datos:', error);
            this.updateStatus('❌', 'Error de conexión');
        }

        this.isUpdating = false;
    }

    async fetchDataFromGoogleSheets() {
        try {
            const response = await fetch(this.googleSheetsUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            return this.parseCSVData(csvText);
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    parseCSVData(csvText) {
        const data = [];
        const rows = this.parseCSVText(csvText);
        
        if (rows.length < 2) return data;
        
        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        let latitudIndex = 2;
        let longitudIndex = 3;
        let nombreIndex = 1;
        let seguridadIndex = 4;
        let distanciaIndex = 5;
        let rutaIndex = 6;
        let linkTurismoIndex = 7;
        let securityTipsIndex = 8;
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            try {
                const nombre = nombreIndex >= 0 && nombreIndex < row.length ? row[nombreIndex].trim() : '';
                const latitudStr = latitudIndex >= 0 && latitudIndex < row.length ? row[latitudIndex].trim() : '';
                const longitudStr = longitudIndex >= 0 && longitudIndex < row.length ? row[longitudIndex].trim() : '';
                const seguridad = seguridadIndex >= 0 && seguridadIndex < row.length ? row[seguridadIndex].trim() : '';
                const distancia = distanciaIndex >= 0 && distanciaIndex < row.length ? row[distanciaIndex].trim() : '';
                const ruta = rutaIndex >= 0 && rutaIndex < row.length ? row[rutaIndex].trim() : '';
                const linkTurismo = linkTurismoIndex >= 0 && linkTurismoIndex < row.length ? row[linkTurismoIndex].trim() : '';
                const securityTips = securityTipsIndex >= 0 && securityTipsIndex < row.length ? row[securityTipsIndex].trim() : '';
                
                if (!nombre || !latitudStr || !longitudStr) continue;
                
                let latitud = parseFloat(latitudStr.replace(',', '.'));
                let longitud = parseFloat(longitudStr.replace(',', '.'));
                
                if (isNaN(latitud) || isNaN(longitud)) continue;
                
                const record = {
                    nombre: nombre,
                    latitud: latitud,
                    longitud: longitud,
                    seguridad: seguridad || 'Información no disponible',
                    securityTips: securityTips || 'Information not available',
                    distancia: distancia || 'N/A',
                    ruta: ruta || '#',
                    linkTurismo: linkTurismo || '#'
                };
                
                data.push(record);
                
            } catch (error) {
                console.warn('Error procesando fila:', error);
            }
        }
        
        return data;
    }

    parseCSVText(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                if (currentField || currentRow.length > 0) {
                    currentRow.push(currentField);
                    if (currentRow.some(field => field.trim().length > 0)) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentField = '';
                }
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            } else {
                currentField += char;
            }
        }
        
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim().length > 0)) {
                rows.push(currentRow);
            }
        }
        
        return rows;
    }
}

// ============================================
// INICIALIZAR MAPA
// ============================================

function initMap() {
    map = L.map('map').setView([20.5, -103.5], 7);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    loadTurismoData();
}

function loadTurismoData() {
    dataManager = new TurismoDataManager();
}

// ============================================
// ACTUALIZAR MARCADORES DE PUEBLOS MÁGICOS
// ============================================

function updatePueblosMagicosMarkers() {
    pueblosMagicosMarkers.forEach(marker => map.removeLayer(marker));
    pueblosMagicosMarkers = [];
    
    const pueblosConDatos = Object.values(turismoDatos);
    
    pueblosConDatos.forEach(pueblo => {
        const marker = L.marker([pueblo.latitud, pueblo.longitud], {
            icon: L.icon({
                iconUrl: 'pueblo-magico-icon.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            })
        }).addTo(map);
        
        marker.on('click', function() {
            showPuebloInfo(pueblo.nombre);
        });
        
        pueblosMagicosMarkers.push(marker);
    });
}

// ============================================
// CARGAR GEOJSON Y CONFIGURAR EVENTOS
// ============================================

function loadGeoJSON() {
    fetch('jalisco_municipios.geojson')
        .then(response => response.json())
        .then(data => {
            geojsonLayer = L.geoJSON(data, {
                style: STYLES.default,
                onEachFeature: onEachFeature
            }).addTo(map);
        })
        .catch(error => console.error('Error cargando GeoJSON:', error));
}

function onEachFeature(feature, layer) {
    const municipioNombre = feature.properties.NOMBRE || 'Municipio desconocido';
    
    layer.on('mouseover', function() {
        this.setStyle(STYLES.hover);
        this.bringToFront();
    });
    
    layer.on('mouseout', function() {
        if (currentActiveFeature !== this) {
            this.setStyle(STYLES.default);
        }
    });
    
    layer.on('click', function() {
        if (currentActiveFeature && currentActiveFeature !== this) {
            currentActiveFeature.setStyle(STYLES.default);
        }
        currentActiveFeature = this;
        this.setStyle(STYLES.active);
        showPuebloInfo(municipioNombre);
    });
}

// ============================================
// MOSTRAR INFORMACIÓN DEL PUEBLO
// ============================================

function showPuebloInfo(nombrePueblo) {
    const pueblo = turismoDatos[nombrePueblo] || {
        nombre: nombrePueblo,
        distancia: 'N/A',
        seguridad: 'Información no disponible',
        securityTips: 'Information not available',
        ruta: '#',
        linkTurismo: '#'
    };
    
    loadInfografia(nombrePueblo, currentLanguage);
    
    const modalBody = document.getElementById('modalBody');
    
    const infoSeguridad = currentLanguage === 'en' ? pueblo.securityTips : pueblo.seguridad;
    const labelSeguridad = currentLanguage === 'en' ? 'SECURITY TIPS' : 'CONSEJOS DE SEGURIDAD';
    const labelRuta = currentLanguage === 'en' ? 'ROUTE FROM GDL' : 'RUTA DESDE GDL';
    const labelTurismo = currentLanguage === 'en' ? 'TOURISM LINK' : 'LINK TURISMO';
    const labelLlamar = currentLanguage === 'en' ? 'CALL 911' : 'LLAMAR AL 911';
    const labelDesde = currentLanguage === 'en' ? 'FROM GUADALAJARA:' : 'DESDE GUADALAJARA:';
    
    let contenido = `
        <h2>${pueblo.nombre}</h2>
        
        <div class="info-section">
            <div class="info-label-inline">📍 ${labelDesde}&nbsp;&nbsp;${pueblo.distancia}</div>
        </div>
    `;
    
    if (pueblo.ruta && pueblo.ruta !== '#' && pueblo.ruta.length > 0) {
        contenido += `
        <div class="info-section">
            <a href="${pueblo.ruta}" target="_blank" rel="noopener noreferrer" class="info-link-direct">🗺️ ${labelRuta}</a>
        </div>
        `;
    } else {
        contenido += `
        <div class="info-section">
            <span class="info-label-disabled">🗺️ ${labelRuta}</span>
        </div>
        `;
    }
    
    if (pueblo.linkTurismo && pueblo.linkTurismo !== '#' && pueblo.linkTurismo.length > 0) {
        contenido += `
        <div class="info-section">
            <a href="${pueblo.linkTurismo}" target="_blank" rel="noopener noreferrer" class="info-link-direct">🌍 ${labelTurismo}</a>
        </div>
        `;
    } else {
        contenido += `
        <div class="info-section">
            <span class="info-label-disabled">🌍 ${labelTurismo}</span>
        </div>
        `;
    }
    
    contenido += `
        <div class="info-section">
            <div class="info-label">🛡️ ${labelSeguridad}</div>
            <div class="info-value recomendaciones">
                <div class="recomendaciones-text">${infoSeguridad}</div>
            </div>
        </div>

        <div class="info-section">
            <a href="tel:911" class="clicktocall-btn">
                <span class="clicktocall-icon">📞</span>
                ${labelLlamar}
            </a>
        </div>
    `;
    
    modalBody.innerHTML = contenido;
    
    const modal = document.getElementById('infoModal');
    modal.style.display = 'block';
}

// ============================================
// CARGAR INFOGRAFÍA DINÁMICAMENTE
// ============================================

function loadInfografia(nombrePueblo, idioma) {
    const sufijo = idioma === 'en' ? 'English' : 'Final';
    const nombreArchivo = `Infografia_Seguridad_${nombrePueblo}_${sufijo}.png`;
    
    const infografiaImg = document.getElementById('infografiaImg');
    const infografiaPlaceholder = document.getElementById('infografiaPlaceholder');
    
    const pueblosConInfografias = [
        'Ajijic',
        'Cocula',
        'Lagos de Moreno',
        'Mascota',
        'Mazamitla',
        'San Sebastián del Oeste',
        'Sayula',
        'Talpa de Allende',
        'Tapalpa',
        'Temacapulín',
        'Tequila',
        'Tlaquepaque'
    ];
    
    if (pueblosConInfografias.includes(nombrePueblo)) {
        infografiaImg.src = nombreArchivo;
        infografiaImg.style.display = 'block';
        infografiaPlaceholder.style.display = 'none';
        
        infografiaImg.onerror = function() {
            infografiaImg.style.display = 'none';
            infografiaPlaceholder.style.display = 'flex';
        };
    } else {
        infografiaImg.style.display = 'none';
        infografiaPlaceholder.style.display = 'flex';
    }
}

// ============================================
// CERRAR MODAL
// ============================================

function closeModal() {
    const modal = document.getElementById('infoModal');
    modal.style.display = 'none';
    
    if (currentActiveFeature) {
        currentActiveFeature.setStyle(STYLES.default);
        currentActiveFeature = null;
    }
}

// ============================================
// CAMBIAR IDIOMA
// ============================================

function changeLanguage(lang) {
    currentLanguage = lang;
    
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById('lang-' + lang);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    const modal = document.getElementById('infoModal');
    if (modal.style.display === 'block') {
        const h2 = modal.querySelector('h2');
        if (h2) {
            const puebloNombre = h2.textContent;
            showPuebloInfo(puebloNombre);
        }
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Loaded - Initializing map...');
    initMap();
    loadGeoJSON();
    
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    const modal = document.getElementById('infoModal');
    if (modal) {
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
    
    console.log('Initialization complete');
});

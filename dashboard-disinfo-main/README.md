# Dashboard de Desinformación Electoral

Dashboard para visualización de datos de desinformación electoral boliviana, desarrollado con Node.js, Express y D3.js. Se conecta a la plataforma Check API de checkmedia.org para obtener datos verificados de desinformación.

## ✨ Características

- **🔗 Integración Check API** - Conexión directa con checkmedia.org
- **⚡ Actualización automática** - Polling periódico para mantener datos actualizados
- **📊 Visualización interactiva** - Gráficos de burbujas y barras con D3.js
- **📱 Responsive design** - Adaptado para todos los dispositivos
- **🗄️ Base de datos local** - SQLite para almacenamiento eficiente
- **🔄 Sincronización automática** - Mantiene consistencia con la API externa

## Estructura del Proyecto

```
dashboard-disinfo/
├── server.js                 # Servidor Express principal con API REST
├── package.json              # Dependencias Node.js  
├── database/
│   ├── init.js              # Configuración SQLite y operaciones BD
│   └── data.db              # Base de datos (auto-generada)
├── public/                   # Frontend SPA
│   ├── index.html           # Interfaz de usuario
│   ├── script.js            # Dashboard interactivo con D3.js
│   └── styles.css           # Estilos responsivos
├── services/                 # Servicios backend
│   ├── apiPoller.js         # Polling de Check API
│   └── checkApiClient.js    # Cliente GraphQL para Check API  
├── config/
│   └── sources.js           # Configuración de Check API
└── docs/
    ├── sample.csv           # Ejemplo de estructura de datos
    └── schema.csv           # Esquema de campos disponibles
```

## Instalación y Configuración

1. **Clonar y navegar al directorio:**
   ```bash
   git clone <repo-url>
   cd dashboard-disinfo
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   
   Crear archivo `.env` con la configuración de Check API:
   ```env
   PORT=3000
   DB_PATH=./database/data.db
   
   # Configuración Check API
   CHECK_API_TOKEN=tu_token_de_check_api
   CHECK_TEAM_SLUG=chequeabolivia-verificaciones
   CHECK_API_URL=https://check-api.checkmedia.org/api/graphql
   CHECK_API_INTERVAL=300000
   ```

4. **Ejecutar el dashboard:**
   ```bash
   npm start
   ```

   El dashboard estará disponible en `http://localhost:3000`

## ⚙️ Configuración de Check API

Para obtener acceso a la Check API de checkmedia.org:

1. **Contactar al equipo de Check**
   - Solicitar token de API para el team `chequeabolivia-verificaciones`
   - El token debe tener permisos de lectura para obtener medias y tasks

2. **Verificar la conexión**
   ```bash
   # Una vez configurado el .env, probar la conexión
   curl http://localhost:3000/api/check/test
   ```

3. **Configurar intervalo de polling**
   - `CHECK_API_INTERVAL`: Tiempo en milisegundos entre consultas (recomendado: 300000 = 5 minutos)
   - La API tiene límites de rate limiting, no configurar intervalos muy pequeños

## Esquema de Datos

El sistema consume datos de Check API y los transforma al siguiente formato para visualización:

### Campos Principales
```javascript
{
  "claim": "Texto del claim o descripción",
  "item_page_url": "https://checkmedia.org/chequeabolivia-verificaciones/media/ID",
  "status": "Verificado|Falso|Engañoso|Sin iniciar|Inconcluso|En progreso",
  "submitted_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z",
  "tags": "Etiquetas separadas por comas",
  "red_social": "Facebook|TikTok|Twitter/X|Instagram|YouTube|WhatsApp|Telegram|Web",
  "formato": "Audiovisual|Imagen|Texto",
  "reacciones": 100,
  "comentarios": 25,
  "compartidos": 10,
  "visualizaciones": 1000,
  "check_id": "ID único de Check API",
  "check_dbid": 123
}
```

### Campos Específicos del Schema Chequeabolivia
```javascript
{
  "fue_creado_con_ia": "Sí|No",
  "ataca_candidato": "Sí|No", 
  "candidato_atacado": "Nombre del candidato",
  "ataca_tse": "Sí|No",
  "narrativa_tse": "Descripción de la narrativa",
  "es_caso_es": "Desinformación|Rumor",
  "narrativa_desinformacion": "Tipo de narrativa",
  "imita_medio": "Sí|No",
  "medio_imitado": "Nombre del medio",
  "tipo_rumor": "Clasificación del rumor",
  "rumor_promovido": "Descripción del rumor"
}
```

## API Endpoints

### Endpoints de Datos
- `GET /api/posts` - Obtener datos históricos con paginación
- `GET /api/posts/recent` - Posts recientes desde una fecha específica
- `GET /api/stats` - Estadísticas generales del dashboard

### Endpoints de Check API
- `GET /api/check/test` - Probar conexión con Check API
- `GET /api/check/stats` - Estadísticas de Check API
- `GET /api/check/medias` - Obtener medias directamente de Check API
- `POST /api/check/refresh` - Forzar actualización de datos (solo lectura)

### Endpoints de Estado
- `GET /api/mode` - Información del modo actual y estado del poller
- Actualización automática vía polling del frontend

## 🎨 Funcionalidades del Dashboard

### Visualización Principal
- **Gráfico de burbujas temporales** - Cada burbuja representa un caso de desinformación
- **Tamaño proporcional** - Basado en total de interacciones (reacciones + comentarios + compartidos + visualizaciones)
- **Colores dinámicos** - Diferenciación por categoría seleccionada (red social, status, formato, tipo de caso)
- **Actualización automática** - Refresh periódico para mostrar nuevos datos
- **Tooltips informativos** - Detalles al hacer hover

### Controles Interactivos
- **Selector de día** - Filtro por fecha específica
- **Tipo de caso** - Filtro por Desinformación/Rumor/Todos
- **Selector de horas** - Rango horario de visualización
- **Categorización** - Vista por Red Social, Status, Formato o Tipo de Caso

### Gráfico de Barras
- **Conteo por categoría** - Distribución automática según filtros
- **Ordenamiento dinámico** - Por volumen de casos
- **Actualización automática** - Refleja cambios tras refresh de datos
- **Tooltips con totales** - Números formateados

### Indicadores de Estado
- **Estado de conexión** - Check API y estado del sistema
- **Modo actual** - Indica fuente de datos activa  
- **Estadísticas automáticas** - Total de posts y contadores
- **Notificaciones** - Indicadores de actualización de datos

## 🛠️ Desarrollo

### Scripts Disponibles
- `npm start` - Iniciar servidor en modo producción
- `npm run dev` - Servidor con nodemon para desarrollo (requiere instalación de nodemon)

### Estructura Técnica

**Backend:**
- **Express.js** - Servidor web y API REST
- **SQLite3** - Base de datos local embedded
- **Axios** - Cliente HTTP para Check API

**Frontend:**
- **D3.js v7** - Visualizaciones interactivas
- **Vanilla JavaScript** - Sin frameworks adicionales
- **CSS3** - Responsive design con flexbox/grid
- **Fetch API** - Para consultas HTTP al backend

### Flujo de Datos

1. **Polling Backend** - `apiPoller.js` consulta Check API cada 5 minutos
2. **Transformación** - `checkApiClient.js` mapea datos de GraphQL al schema local
3. **Almacenamiento** - `database/init.js` guarda en SQLite con deduplicación
4. **Sincronización** - Detecta posts eliminados en la API para mantener consistencia
5. **API REST** - Server.js sirve datos via endpoints HTTP
6. **Polling Frontend** - Dashboard consulta `/api/posts` periódicamente para actualizarse

## 🚀 Tecnologías

- **Backend:** Node.js, Express, SQLite3, Axios
- **Frontend:** D3.js v7, HTML5, CSS3, JavaScript
- **API:** Check API (GraphQL) de checkmedia.org
- **Base de datos:** SQLite (portable y eficiente)
- **Actualización:** Polling automático desde el frontend

## 🔒 Consideraciones de Seguridad

- **Modo solo lectura** - El dashboard no modifica datos en Check API
- **Rate limiting** - Respeta los límites de la API externa
- **Sincronización local** - Solo elimina datos locales que no existen en la API
- **Validación de datos** - Sanitización de inputs de la API
- **Headers de seguridad** - CORS configurado para el dominio específico

## 📋 Limitaciones Conocidas

- **Dependencia de Check API** - Requiere conectividad constante
- **Rate limits** - Limitado por los límites de la API externa  
- **Datos históricos** - Solo mantiene datos mientras estén en la API
- **Schema específico** - Optimizado para el schema de chequeabolivia-verificaciones
- **Sin autenticación propia** - Depende del token de Check API

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch feature (`git checkout -b feature/NuevaFuncionalidad`)
3. Commit cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push al branch (`git push origin feature/NuevaFuncionalidad`)
5. Crear Pull Request

## 📄 Licencia

MIT

---

Desarrollado por **Lab TecnoSocial** | [labtecnosocial.org](https://labtecnosocial.org)
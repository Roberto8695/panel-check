require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const Database = require('./database/init');
const ApiPoller = require('./services/apiPoller');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar base de datos
const database = new Database();
let apiPoller = null;

// Configurar Socket.IO
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// API Routes
app.get('/api/posts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10000; // Aumentado de 1000 a 10000
        const offset = parseInt(req.query.offset) || 0;

        const posts = await database.getPosts(limit, offset);
        const total = await database.getPostsCount();

        res.json({
            posts,
            total,
            limit,
            offset
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Error fetching posts' });
    }
});

app.get('/api/posts/recent', async (req, res) => {
    try {
        const since = req.query.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const posts = await database.getRecentPosts(since);

        res.json({ posts });
    } catch (error) {
        console.error('Error fetching recent posts:', error);
        res.status(500).json({ error: 'Error fetching recent posts' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const total = await database.getPostsCount();
        const recent = await database.getRecentPosts(new Date(Date.now() - 60 * 60 * 1000).toISOString());

        res.json({
            totalPosts: total,
            recentPosts: recent.length,
            lastUpdate: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Error fetching stats' });
    }
});

app.get('/api/mode', (req, res) => {
    const config = require('./config/sources');
    const status = apiPoller ? apiPoller.getStatus() : { mode: config.type };

    res.json({
        mode: status.mode || config.type,
        status: status
    });
});

// Endpoint para probar conexión con Check API
app.get('/api/check/test', async (req, res) => {
    try {
        if (!apiPoller) {
            return res.status(500).json({
                error: 'API Poller no inicializado'
            });
        }

        const status = await apiPoller.getCheckApiStatus();
        res.json(status);
    } catch (error) {
        console.error('Error testing Check API:', error);
        res.status(500).json({
            error: 'Error testing Check API',
            message: error.message
        });
    }
});

// Endpoint para obtener estadísticas de Check API
app.get('/api/check/stats', async (req, res) => {
    try {
        if (!apiPoller || !apiPoller.checkClient) {
            return res.status(500).json({
                error: 'Check API client no disponible'
            });
        }

        const stats = await apiPoller.checkClient.getStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching Check API stats:', error);
        res.status(500).json({
            error: 'Error fetching Check API statistics',
            message: error.message
        });
    }
});

// Endpoint para obtener medias directamente de Check API
app.get('/api/check/medias', async (req, res) => {
    try {
        if (!apiPoller || !apiPoller.checkClient) {
            return res.status(500).json({
                error: 'Check API client no disponible'
            });
        }

        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const medias = await apiPoller.checkClient.getMedias(limit, offset);
        res.json({
            medias,
            limit,
            offset,
            count: medias.length
        });
    } catch (error) {
        console.error('Error fetching Check API medias:', error);
        res.status(500).json({
            error: 'Error fetching Check API medias',
            message: error.message
        });
    }
});


// ⚠️  ENDPOINTS DE ELIMINACIÓN DESACTIVADOS POR SEGURIDAD ⚠️
// Estos endpoints permitían eliminar datos, lo cual viola el principio de solo lectura

// DESACTIVADO: Endpoint para limpiar datos de Check API
app.post('/api/check/clear', async (req, res) => {
    res.status(403).json({
        error: 'Operación no permitida',
        message: 'Este proyecto está configurado en modo de solo lectura por seguridad'
    });
});

// DESACTIVADO: Endpoint para limpiar TODOS los datos
app.post('/api/clear-all', async (req, res) => {
    res.status(403).json({
        error: 'Operación no permitida',
        message: 'Este proyecto está configurado en modo de solo lectura por seguridad'
    });
});

// Endpoint para forzar refetch de datos de Check API (SOLO LECTURA)
app.post('/api/check/refresh', async (req, res) => {
    try {
        if (!apiPoller || !apiPoller.checkClient) {
            return res.status(500).json({
                error: 'Check API client no disponible'
            });
        }

        // ⚠️  MODIFICADO POR SEGURIDAD: No limpiar datos existentes
        // Solo agregar/actualizar datos nuevos sin eliminar los existentes

        // Obtener nuevos datos
        const medias = await apiPoller.checkClient.getMedias(100, 0);

        // Guardar nuevos datos usando el método interno del poller
        let savedPosts = [];
        for (const media of medias) {
            try {
                const processedPost = media; // Ya vienen procesados del checkClient

                const result = await database.insertPost(processedPost);

                if (result.changes > 0) {
                    savedPosts.push({
                        ...processedPost,
                        id: result.id
                    });
                }
            } catch (error) {
                console.error('Error guardando post:', error.message);
            }
        }

        // Emitir a clientes conectados
        if (savedPosts.length > 0) {
            emitNewData(savedPosts);
        }

        res.json({
            message: `Datos refrescados: ${savedPosts.length} nuevos posts`,
            success: true,
            count: savedPosts.length
        });
    } catch (error) {
        console.error('Error refreshing Check API data:', error);
        res.status(500).json({
            error: 'Error refreshing Check API data',
            message: error.message
        });
    }
});

// Función para emitir nuevos datos a clientes conectados
function emitNewData(newPosts, syncInfo = null) {
    if (newPosts && newPosts.length > 0) {
        console.log(`Emitiendo ${newPosts.length} nuevos posts a clientes`);
        io.emit('newPosts', newPosts);
    }

    // Manejar eventos de sincronización (eliminaciones)
    if (syncInfo && syncInfo.type === 'sync' && syncInfo.deletedCount > 0) {
        console.log(`🔄 Emitiendo evento de sincronización: ${syncInfo.deletedCount} posts eliminados`);
        io.emit('postsDeleted', { deletedCount: syncInfo.deletedCount });
    }
}

// Inicializar aplicación
async function initializeApp() {
    try {
        // Inicializar base de datos
        const shouldClearData = false; // Solo limpiamos manualmente cuando sea necesario

        await database.init(shouldClearData);
        console.log('Base de datos inicializada');

        console.log('✅ Base de datos lista para Check API');

        // Inicializar poller de API
        apiPoller = new ApiPoller(database, emitNewData);
        await apiPoller.start();
        console.log('Poller de API iniciado');

        // Iniciar servidor
        server.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        process.exit(1);
    }
}

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    console.log('Cerrando aplicación...');

    if (apiPoller) {
        apiPoller.stop();
    }

    database.close();

    server.close(() => {
        console.log('Aplicación cerrada');
        process.exit(0);
    });
});

// Inicializar
initializeApp();
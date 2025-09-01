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
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());

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

// API Routes compatibles con el frontend Next.js

// Endpoint para obtener artículos (compatible con /api/articles)
app.get('/api/articles', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const posts = await database.getPosts(limit, offset);
        const total = await database.getPostsCount();

        // Transformar formato para compatibilidad con frontend
        const articles = posts.map(post => ({
            id: post.id,
            title: post.claim,
            status: post.status,
            url: post.item_page_url,
            source: post.red_social,
            format: post.formato,
            createdAt: post.submitted_at,
            updatedAt: post.updated_at,
            tags: post.tags ? post.tags.split(', ') : [],
            engagement: {
                reactions: post.reacciones || 0,
                comments: post.comentarios || 0,
                shares: post.compartidos || 0,
                views: post.visualizaciones || 0
            },
            // Campos adicionales del schema
            metadata: {
                fue_creado_con_ia: post.fue_creado_con_ia,
                ataca_candidato: post.ataca_candidato,
                candidato_atacado: post.candidato_atacado,
                ataca_tse: post.ataca_tse,
                narrativa_tse: post.narrativa_tse,
                es_caso_es: post.es_caso_es,
                narrativa_desinformacion: post.narrativa_desinformacion,
                imita_medio: post.imita_medio,
                medio_imitado: post.medio_imitado,
                tipo_rumor: post.tipo_rumor,
                rumor_promovido: post.rumor_promovido
            }
        }));

        res.json({
            articles,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ error: 'Error fetching articles' });
    }
});

// Endpoint para obtener artículo por ID
app.get('/api/articles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const posts = await database.getPosts(1, 0);
        const post = posts.find(p => p.id == id);

        if (!post) {
            return res.status(404).json({ error: 'Artículo no encontrado' });
        }

        const article = {
            id: post.id,
            title: post.claim,
            status: post.status,
            url: post.item_page_url,
            source: post.red_social,
            format: post.formato,
            createdAt: post.submitted_at,
            updatedAt: post.updated_at,
            tags: post.tags ? post.tags.split(', ') : [],
            engagement: {
                reactions: post.reacciones || 0,
                comments: post.comentarios || 0,
                shares: post.compartidos || 0,
                views: post.visualizaciones || 0
            },
            metadata: {
                fue_creado_con_ia: post.fue_creado_con_ia,
                ataca_candidato: post.ataca_candidato,
                candidato_atacado: post.candidato_atacado,
                ataca_tse: post.ataca_tse,
                narrativa_tse: post.narrativa_tse,
                es_caso_es: post.es_caso_es,
                narrativa_desinformacion: post.narrativa_desinformacion,
                imita_medio: post.imita_medio,
                medio_imitado: post.medio_imitado,
                tipo_rumor: post.tipo_rumor,
                rumor_promovido: post.rumor_promovido
            }
        };

        res.json(article);
    } catch (error) {
        console.error('Error fetching article:', error);
        res.status(500).json({ error: 'Error fetching article' });
    }
});

// Endpoint para búsqueda
app.get('/api/search', async (req, res) => {
    try {
        const { query, status, source, limit = 100, offset = 0 } = req.query;
        
        // Por ahora retornamos todos los posts y filtraremos en memoria
        // En el futuro se puede optimizar con filtros SQL
        const allPosts = await database.getPosts(1000, 0);
        
        let filteredPosts = allPosts;

        if (query) {
            filteredPosts = filteredPosts.filter(post => 
                post.claim.toLowerCase().includes(query.toLowerCase()) ||
                (post.tags && post.tags.toLowerCase().includes(query.toLowerCase()))
            );
        }

        if (status) {
            filteredPosts = filteredPosts.filter(post => post.status === status);
        }

        if (source) {
            filteredPosts = filteredPosts.filter(post => post.red_social === source);
        }

        const start = parseInt(offset);
        const end = start + parseInt(limit);
        const paginatedPosts = filteredPosts.slice(start, end);

        const articles = paginatedPosts.map(post => ({
            id: post.id,
            title: post.claim,
            status: post.status,
            url: post.item_page_url,
            source: post.red_social,
            format: post.formato,
            createdAt: post.submitted_at,
            updatedAt: post.updated_at,
            tags: post.tags ? post.tags.split(', ') : [],
            engagement: {
                reactions: post.reacciones || 0,
                comments: post.comentarios || 0,
                shares: post.compartidos || 0,
                views: post.visualizaciones || 0
            }
        }));

        res.json({
            articles,
            total: filteredPosts.length,
            page: Math.floor(start / parseInt(limit)) + 1,
            totalPages: Math.ceil(filteredPosts.length / parseInt(limit))
        });
    } catch (error) {
        console.error('Error searching articles:', error);
        res.status(500).json({ error: 'Error searching articles' });
    }
});

// Endpoint para estadísticas
app.get('/api/statistics', async (req, res) => {
    try {
        const total = await database.getPostsCount();
        const recent = await database.getRecentPosts(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        
        // Obtener estadísticas por status
        const allPosts = await database.getPosts(10000, 0);
        const statusStats = {
            'Verificado': 0,
            'Falso': 0,
            'Engañoso': 0,
            'Sin iniciar': 0,
            'Inconcluso': 0,
            'En progreso': 0
        };

        allPosts.forEach(post => {
            if (statusStats.hasOwnProperty(post.status)) {
                statusStats[post.status]++;
            }
        });

        res.json({
            totalPosts: total,
            recentPosts: recent.length,
            lastUpdate: new Date().toISOString(),
            byStatus: statusStats
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
});

// Endpoint para estadísticas de interacciones acumuladas
app.get('/api/interactions-stats', async (req, res) => {
    try {
        const allPosts = await database.getPosts(10000, 0);
        
        // Estadísticas por Red Social
        const socialStats = {
            'TikTok': 0,
            'Facebook': 0,
            'Instagram': 0,
            'Twitter/X': 0,
            'YouTube': 0,
            'WhatsApp': 0,
            'Telegram': 0,
            'Web': 0,
            'Otros': 0
        };
        // Estadísticas por Status
        const statusStats = {
            'Verificado': 0,
            'Falso': 0,
            'Engañoso': 0,
            'Sin iniciar': 0,
            'En progreso': 0,
            'Inconcluso': 0
        };
        // Estadísticas por Formato
        const formatStats = {
            'Audiovisual': 0,
            'Imagen': 0,
            'Texto': 0,
            'Audio': 0,
            'Otros': 0
        };
        // Estadísticas por Tags
        const tagStats = {};
        
        allPosts.forEach(post => {
            const interactions = (post.reacciones || 0) + (post.comentarios || 0) + 
                               (post.compartidos || 0) + (post.visualizaciones || 0);
            
            // Por Red Social
            const social = post.red_social || 'Otros';
            if (socialStats.hasOwnProperty(social)) {
                socialStats[social] += interactions;
            } else {
                socialStats['Otros'] += interactions;
            }
            
            // Por Status
            const status = post.status || 'Sin iniciar';
            if (statusStats.hasOwnProperty(status)) {
                statusStats[status] += interactions;
            } else {
                statusStats['Sin iniciar'] += interactions;
            }
            
            // Por Formato
            const format = post.formato || 'Otros';
            if (formatStats.hasOwnProperty(format)) {
                formatStats[format] += interactions;
            } else {
                formatStats['Otros'] += interactions;
            }
            
            // Por Tags
            if (post.tags && post.tags.trim()) {
                const tags = post.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
                tags.forEach(tag => {
                    if (tag && tag !== '') {
                        tagStats[tag] = (tagStats[tag] || 0) + interactions;
                    }
                });
            } else {
                tagStats['Sin tags'] = (tagStats['Sin tags'] || 0) + interactions;
            }
        });

        res.json({
            socialMedia: socialStats,
            status: statusStats,
            format: formatStats,
            tags: tagStats,
            totalInteractions: Object.values(socialStats).reduce((a, b) => a + b, 0)
        });
    } catch (error) {
        console.error('Error fetching interaction statistics:', error);
        res.status(500).json({ error: 'Error fetching interaction statistics' });
    }
});

// Endpoint para estadísticas de interacciones acumuladas por Red Social
app.get('/api/statistics/by-social-network', async (req, res) => {
    try {
        const allPosts = await database.getPosts(10000, 0);
        const socialNetworkStats = {};

        allPosts.forEach(post => {
            const redSocial = post.red_social || 'Sin especificar';
            
            if (!socialNetworkStats[redSocial]) {
                socialNetworkStats[redSocial] = {
                    count: 0,
                    totalReactions: 0,
                    totalComments: 0,
                    totalShares: 0,
                    totalViews: 0,
                    totalInteractions: 0
                };
            }

            socialNetworkStats[redSocial].count++;
            socialNetworkStats[redSocial].totalReactions += post.reacciones || 0;
            socialNetworkStats[redSocial].totalComments += post.comentarios || 0;
            socialNetworkStats[redSocial].totalShares += post.compartidos || 0;
            socialNetworkStats[redSocial].totalViews += post.visualizaciones || 0;
            socialNetworkStats[redSocial].totalInteractions += 
                (post.reacciones || 0) + (post.comentarios || 0) + (post.compartidos || 0) + (post.visualizaciones || 0);
        });

        res.json({
            success: true,
            data: socialNetworkStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching social network statistics:', error);
        res.status(500).json({ error: 'Error fetching social network statistics' });
    }
});

// Endpoint para estadísticas de interacciones acumuladas por Status
app.get('/api/statistics/by-status', async (req, res) => {
    try {
        const allPosts = await database.getPosts(10000, 0);
        const statusStats = {};

        allPosts.forEach(post => {
            const status = post.status || 'Sin estado';
            
            if (!statusStats[status]) {
                statusStats[status] = {
                    count: 0,
                    totalReactions: 0,
                    totalComments: 0,
                    totalShares: 0,
                    totalViews: 0,
                    totalInteractions: 0
                };
            }

            statusStats[status].count++;
            statusStats[status].totalReactions += post.reacciones || 0;
            statusStats[status].totalComments += post.comentarios || 0;
            statusStats[status].totalShares += post.compartidos || 0;
            statusStats[status].totalViews += post.visualizaciones || 0;
            statusStats[status].totalInteractions += 
                (post.reacciones || 0) + (post.comentarios || 0) + (post.compartidos || 0) + (post.visualizaciones || 0);
        });

        res.json({
            success: true,
            data: statusStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching status statistics:', error);
        res.status(500).json({ error: 'Error fetching status statistics' });
    }
});

// Endpoint para estadísticas de interacciones acumuladas por Formato
app.get('/api/statistics/by-format', async (req, res) => {
    try {
        const allPosts = await database.getPosts(10000, 0);
        const formatStats = {};

        allPosts.forEach(post => {
            const formato = post.formato || 'Sin formato';
            
            if (!formatStats[formato]) {
                formatStats[formato] = {
                    count: 0,
                    totalReactions: 0,
                    totalComments: 0,
                    totalShares: 0,
                    totalViews: 0,
                    totalInteractions: 0
                };
            }

            formatStats[formato].count++;
            formatStats[formato].totalReactions += post.reacciones || 0;
            formatStats[formato].totalComments += post.comentarios || 0;
            formatStats[formato].totalShares += post.compartidos || 0;
            formatStats[formato].totalViews += post.visualizaciones || 0;
            formatStats[formato].totalInteractions += 
                (post.reacciones || 0) + (post.comentarios || 0) + (post.compartidos || 0) + (post.visualizaciones || 0);
        });

        res.json({
            success: true,
            data: formatStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching format statistics:', error);
        res.status(500).json({ error: 'Error fetching format statistics' });
    }
});

// Endpoint consolidado para todas las estadísticas de interacciones
app.get('/api/statistics/interactions-accumulated', async (req, res) => {
    try {
        const allPosts = await database.getPosts(10000, 0);
        
        const socialNetworkStats = {};
        const statusStats = {};
        const formatStats = {};

        allPosts.forEach(post => {
            // Estadísticas por Red Social
            const redSocial = post.red_social || 'Sin especificar';
            if (!socialNetworkStats[redSocial]) {
                socialNetworkStats[redSocial] = {
                    count: 0,
                    totalInteractions: 0
                };
            }
            socialNetworkStats[redSocial].count++;
            socialNetworkStats[redSocial].totalInteractions += 
                (post.reacciones || 0) + (post.comentarios || 0) + (post.compartidos || 0) + (post.visualizaciones || 0);

            // Estadísticas por Status
            const status = post.status || 'Sin estado';
            if (!statusStats[status]) {
                statusStats[status] = {
                    count: 0,
                    totalInteractions: 0
                };
            }
            statusStats[status].count++;
            statusStats[status].totalInteractions += 
                (post.reacciones || 0) + (post.comentarios || 0) + (post.compartidos || 0) + (post.visualizaciones || 0);

            // Estadísticas por Formato
            const formato = post.formato || 'Sin formato';
            if (!formatStats[formato]) {
                formatStats[formato] = {
                    count: 0,
                    totalInteractions: 0
                };
            }
            formatStats[formato].count++;
            formatStats[formato].totalInteractions += 
                (post.reacciones || 0) + (post.comentarios || 0) + (post.compartidos || 0) + (post.visualizaciones || 0);
        });

        res.json({
            success: true,
            data: {
                bySocialNetwork: socialNetworkStats,
                byStatus: statusStats,
                byFormat: formatStats
            },
            totalPosts: allPosts.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching accumulated interactions statistics:', error);
        res.status(500).json({ error: 'Error fetching accumulated interactions statistics' });
    }
});

// Endpoints del dashboard original para compatibilidad
app.get('/api/posts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10000;
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

// Endpoint para refrescar datos de Check API
app.post('/api/check/refresh', async (req, res) => {
    try {
        if (!apiPoller || !apiPoller.checkClient) {
            return res.status(500).json({
                error: 'Check API client no disponible'
            });
        }

        const medias = await apiPoller.checkClient.getMedias(100, 0);

        let savedPosts = [];
        for (const media of medias) {
            try {
                const result = await database.insertPost(media);

                if (result.changes > 0) {
                    savedPosts.push({
                        ...media,
                        id: result.id
                    });
                }
            } catch (error) {
                console.error('Error guardando post:', error.message);
            }
        }

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

    if (syncInfo && syncInfo.type === 'sync' && syncInfo.deletedCount > 0) {
        console.log(`🔄 Emitiendo evento de sincronización: ${syncInfo.deletedCount} posts eliminados`);
        io.emit('postsDeleted', { deletedCount: syncInfo.deletedCount });
    }
}

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        apiPoller: apiPoller ? apiPoller.getStatus() : 'not initialized'
    });
});

// Endpoint de salud para API
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        apiPoller: apiPoller ? apiPoller.getStatus() : 'not initialized'
    });
});

// Inicializar aplicación
async function initializeApp() {
    try {
        // Inicializar base de datos
        await database.init(false);
        console.log('Base de datos inicializada');

        // Inicializar poller de API
        apiPoller = new ApiPoller(database, emitNewData);
        await apiPoller.start();
        console.log('Poller de API iniciado');

        // Iniciar servidor
        server.listen(PORT, () => {
            console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
            console.log(`✅ API Check Media conectada y funcionando`);
            console.log(`✅ Frontend esperado en: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
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

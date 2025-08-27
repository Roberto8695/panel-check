const config = require('../config/sources');
const CheckApiClient = require('./checkApiClient');

class ApiPoller {
    constructor(database, emitCallback) {
        this.database = database;
        this.emitCallback = emitCallback;
        this.intervalId = null;
        this.isRunning = false;
        this.lastCheck = new Date();

        console.log('🔧 Check API poller inicializando...');

        this.checkClient = new CheckApiClient(
            config.check.token,
            config.check.teamSlug,
            config.check.apiUrl
        );
    }

    async start() {
        if (this.isRunning) {
            console.log('Poller ya está ejecutándose');
            return;
        }

        this.isRunning = true;
        console.log(`🌐 Iniciando Check API poller con intervalo de ${config.check.interval}ms`);

        // Primera ejecución inmediata
        await this.poll();

        // Programar ejecuciones periódicas
        this.intervalId = setInterval(() => {
            this.poll().catch(error => {
                console.error('Error en polling Check API:', error);
            });
        }, config.check.interval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        console.log('Check API poller detenido');
    }

    async poll() {
        try {
            console.log('Polling Check API...');
            const currentApiData = await this.checkClient.getMedias(100, 0);

            if (currentApiData && currentApiData.length > 0) {
                // 1. Guardar/actualizar posts nuevos o existentes
                const savedPosts = await this.saveNewData(currentApiData);

                // 2. Sincronizar eliminaciones locales
                await this.syncDeletedPosts(currentApiData);

                // 3. Emitir solo posts verdaderamente nuevos
                if (savedPosts.length > 0) {
                    console.log(`${savedPosts.length} nuevos posts guardados`);
                    this.emitCallback(savedPosts);
                }
            }

            this.lastCheck = new Date();

        } catch (error) {
            console.error('Error en polling Check API:', error.message);
        }
    }

    async syncDeletedPosts(currentApiData) {
        try {
            // Obtener IDs actuales de la API
            const currentApiDbIds = currentApiData.map(post => post.check_dbid).filter(id => id != null);

            // Obtener IDs que tenemos en la base de datos local
            const localDbIds = await this.database.getCurrentCheckDbIds();

            // Encontrar IDs que están en local pero no en la API
            const deletedIds = localDbIds.filter(localId => !currentApiDbIds.includes(localId));

            if (deletedIds.length > 0) {
                console.log(`🔄 Detectados ${deletedIds.length} posts eliminados en la API externa, sincronizando DB local:`, deletedIds);
                const result = await this.database.deletePostsByCheckDbId(deletedIds);

                if (result.changes > 0) {
                    console.log(`🗑️ Eliminados ${result.changes} posts de la base de datos local para mantener sincronización`);
                    this.emitCallback([], { type: 'sync', deletedCount: result.changes });
                }
            }
        } catch (error) {
            console.error('Error sincronizando posts eliminados en DB local:', error.message);
        }
    }

    async saveNewData(rawData) {
        const savedPosts = [];

        for (const item of rawData) {
            try {
                const processedPost = this.processDataItem(item);
                const result = await this.database.insertPost(processedPost);

                if (result.isNew) {
                    savedPosts.push({
                        ...processedPost,
                        id: result.id
                    });
                }

            } catch (error) {
                if (!error.message.includes('UNIQUE constraint failed')) {
                    console.error('Error guardando post:', error.message);
                }
            }
        }

        return savedPosts;
    }

    processDataItem(item) {
        return item;
    }

    getStatus() {
        return {
            mode: 'check',
            isRunning: this.isRunning,
            lastCheck: this.lastCheck
        };
    }

    async getCheckApiStatus() {
        if (!this.checkClient) {
            return { connected: false, message: 'Check API client not initialized' };
        }

        try {
            const result = await this.checkClient.testConnection();
            return result;
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }
}

module.exports = ApiPoller;

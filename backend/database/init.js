const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
        this.db = null;
    }

    async init(clearData = false) {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.createTables()
                        .then(() => {
                            if (clearData) {
                                return this.clearAllData();
                            }
                        })
                        .then(() => resolve())
                        .catch(reject);
                }
            });
        });
    }

    async clearAllData() {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM posts', (err) => {
                if (err) {
                    console.error('Error clearing data:', err);
                    reject(err);
                } else {
                    console.log('🗑️  Base de datos limpiada');
                    resolve();
                }
            });
        });
    }

    async clearCheckApiData() {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM posts WHERE source = 'check_api'", (err) => {
                if (err) {
                    console.error('Error clearing Check API data:', err);
                    reject(err);
                } else {
                    console.log('🗑️  Datos de Check API limpiados de la base de datos');
                    resolve();
                }
            });
        });
    }

    async createTables() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                claim TEXT,
                item_page_url TEXT,
                status TEXT,
                created_by TEXT,
                submitted_at DATETIME,
                updated_at DATETIME,
                social_media_posted_at DATETIME,
                report_published_at DATETIME,
                number_of_media INTEGER DEFAULT 1,
                tags TEXT,
                red_social TEXT,
                reacciones INTEGER DEFAULT 0,
                formato TEXT,
                comentarios INTEGER DEFAULT 0,
                compartidos INTEGER DEFAULT 0,
                visualizaciones INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                source TEXT DEFAULT 'check_api',
                check_id TEXT,
                check_dbid INTEGER UNIQUE,
                -- Nuevos campos del schema chequeabolivia-verificaciones
                fue_creado_con_ia TEXT,
                ataca_candidato TEXT,
                candidato_atacado TEXT,
                ataca_tse TEXT,
                narrativa_tse TEXT,
                es_caso_es TEXT, -- Desinformación|Rumor
                narrativa_desinformacion TEXT,
                imita_medio TEXT,
                medio_imitado TEXT,
                tipo_rumor TEXT,
                rumor_promovido TEXT
            )
        `;

        return new Promise((resolve, reject) => {
            this.db.run(createTableSQL, (err) => {
                if (err) {
                    console.error('Error creating table:', err);
                    reject(err);
                } else {
                    console.log('Posts table created or already exists');
                    resolve();
                }
            });
        });
    }

    async insertPost(postData) {
        const {
            claim, item_page_url, status, created_by, submitted_at, updated_at,
            social_media_posted_at, report_published_at, number_of_media,
            tags, red_social, reacciones, formato, comentarios,
            compartidos, visualizaciones, source, check_id, check_dbid,
            // Nuevos campos
            fue_creado_con_ia, ataca_candidato, candidato_atacado,
            ataca_tse, narrativa_tse, es_caso_es, narrativa_desinformacion,
            imita_medio, medio_imitado, tipo_rumor, rumor_promovido
        } = postData;

        // Primero verificar si el post ya existe usando check_dbid
        const existsSQL = 'SELECT id FROM posts WHERE check_dbid = ?';
        
        return new Promise((resolve, reject) => {
            this.db.get(existsSQL, [check_dbid], (err, existingPost) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const isNewPost = !existingPost;
                
                const insertSQL = `
                    INSERT OR REPLACE INTO posts (
                        claim, item_page_url, status, created_by, submitted_at, updated_at,
                        social_media_posted_at, report_published_at, number_of_media,
                        tags, red_social, reacciones, formato, comentarios,
                        compartidos, visualizaciones, source, check_id, check_dbid,
                        fue_creado_con_ia, ataca_candidato, candidato_atacado,
                        ataca_tse, narrativa_tse, es_caso_es, narrativa_desinformacion,
                        imita_medio, medio_imitado, tipo_rumor, rumor_promovido
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                this.db.run(insertSQL, [
                    claim, item_page_url, status, created_by, submitted_at, updated_at,
                    social_media_posted_at, report_published_at, number_of_media || 1,
                    tags, red_social, reacciones || 0, formato, comentarios || 0,
                    compartidos || 0, visualizaciones || 0, source || 'check_api', check_id, check_dbid,
                    fue_creado_con_ia, ataca_candidato, candidato_atacado,
                    ataca_tse, narrativa_tse, es_caso_es, narrativa_desinformacion,
                    imita_medio, medio_imitado, tipo_rumor, rumor_promovido
                ], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ 
                            id: existingPost ? existingPost.id : this.lastID, 
                            changes: isNewPost ? 1 : 0,
                            isNew: isNewPost
                        });
                    }
                });
            });
        });
    }

    async getPosts(limit = 1000, offset = 0) {
        const selectSQL = `
            SELECT * FROM posts 
            ORDER BY updated_at DESC, created_at DESC 
            LIMIT ? OFFSET ?
        `;

        return new Promise((resolve, reject) => {
            this.db.all(selectSQL, [limit, offset], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getRecentPosts(since) {
        const selectSQL = `
            SELECT * FROM posts 
            WHERE created_at > ? 
            ORDER BY updated_at DESC, created_at DESC
        `;

        return new Promise((resolve, reject) => {
            this.db.all(selectSQL, [since], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getPostsCount() {
        const countSQL = 'SELECT COUNT(*) as count FROM posts';

        return new Promise((resolve, reject) => {
            this.db.get(countSQL, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }

    async deletePostsByCheckDbId(checkDbIds) {
        if (!Array.isArray(checkDbIds) || checkDbIds.length === 0) {
            return { changes: 0 };
        }

        const placeholders = checkDbIds.map(() => '?').join(',');
        const deleteSQL = `DELETE FROM posts WHERE check_dbid IN (${placeholders})`;

        return new Promise((resolve, reject) => {
            this.db.run(deleteSQL, checkDbIds, function (err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`🗑️  Eliminados ${this.changes} posts que ya no están en Check API`);
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    async getCurrentCheckDbIds() {
        const selectSQL = 'SELECT DISTINCT check_dbid FROM posts WHERE source = "check_api"';

        return new Promise((resolve, reject) => {
            this.db.all(selectSQL, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const dbIds = rows.map(row => row.check_dbid).filter(id => id != null);
                    resolve(dbIds);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;

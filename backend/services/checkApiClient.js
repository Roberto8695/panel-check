const axios = require('axios');

class CheckApiClient {
    constructor(token, teamSlug, apiUrl = 'https://check-api.checkmedia.org/api/graphql') {
        this.token = token;
        this.teamSlug = teamSlug;
        this.apiUrl = apiUrl;

        this.headers = {
            'X-Check-Token': token,
            'X-Check-Team': teamSlug,
            'Content-Type': 'application/json',
            'User-Agent': 'Panel-Check-Backend/1.0'
        };
    }

    async testConnection() {
        const query = `
            query {
                me {
                    name
                }
            }
        `;

        try {
            const response = await axios.post(this.apiUrl,
                { query },
                {
                    headers: this.headers,
                    timeout: 30000
                }
            );

            if (response.data.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
            }

            return {
                success: true,
                data: response.data.data,
                message: 'Conexión exitosa con Check API'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Error conectando con Check API'
            };
        }
    }

    async getMedias(limit = 200, offset = 0) {
        const query = `
            query getMedias($query: String!) {
                search(query: $query) {
                    medias {
                        edges {
                            node {
                                id
                                dbid
                                url
                                quote
                                created_at
                                updated_at
                                last_status
                                title
                                description
                                media {
                                    url
                                    metadata
                                    type
                                }
                                claim_description {
                                    description
                                    context
                                }
                                tags {
                                    edges {
                                        node {
                                            tag
                                            tag_text
                                        }
                                    }
                                }
                                tasks {
                                    edges {
                                        node {
                                            id
                                            label
                                            type
                                            first_response_value
                                            responses {
                                                edges {
                                                    node {
                                                        content
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                team {
                                    name
                                    slug
                                }
                            }
                        }
                    }
                }
            }
        `;

        const searchQuery = {
            eslimit: limit,
            sort: "recent_added"
        };

        try {
            const response = await axios.post(this.apiUrl,
                {
                    query,
                    variables: {
                        query: JSON.stringify(searchQuery)
                    }
                },
                {
                    headers: this.headers,
                    timeout: 120000
                }
            );

            if (response.data.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
            }

            const medias = response.data.data?.search?.medias?.edges || [];
            console.log(`Check API devolvió ${medias.length} medias`);
            
            return this.transformMediasToPostFormat(medias);

        } catch (error) {
            console.error('Error fetching medias from Check API:', error.message);
            throw error;
        }
    }

    transformMediasToPostFormat(medias) {
        return medias.map((edge, index) => {
            const media = edge.node;
            const tags = media.tags?.edges?.map(tagEdge => tagEdge.node.tag_text || tagEdge.node.tag).join(', ') || '';

            // Inicializar datos de engagement
            let engagement = { reacciones: 0, comentarios: 0, compartidos: 0, visualizaciones: 0 };
            let redSocial = 'Web';
            let formato = 'Texto';

            // Extraer datos de tasks y annotations si están disponibles
            const extractedData = this.extractDataFromTasksAndAnnotations(media, engagement, redSocial, formato);
            engagement = extractedData.engagement;
            redSocial = extractedData.redSocial;
            formato = extractedData.formato;
            
            const claim = media.title || media.description || media.quote || media.claim_description?.description || `Media ${media.dbid}`;
            
            // Mejorar detección de red social y datos usando metadata
            const mediaUrl = media.media?.url || media.url;
            const metadata = media.media?.metadata;

            // Detectar red social desde URL
            redSocial = this.detectSocialMediaFromUrl(mediaUrl) || redSocial;

            // También verificar el provider en metadata
            const provider = metadata?.provider;
            if (provider) {
                redSocial = this.detectSocialMediaFromProvider(provider) || redSocial;
            }

            // Detectar formato automáticamente
            formato = this.detectMediaFormat(mediaUrl, metadata) || formato;

            // Mapear status de Check API al formato CSV
            let rawStatus = media.last_status || 'undetermined';
            const statusMapping = {
                'verified': 'Verificado',
                'false': 'Falso',
                'misleading': 'Engañoso',
                'unverified': 'Sin iniciar',
                'inconclusive': 'Inconcluso',
                'in_progress': 'En progreso',
                'undetermined': 'Sin iniciar'
            };
            let mappedStatus = statusMapping[rawStatus.toLowerCase()] || 'Sin iniciar';

            // Convertir timestamp Unix a fecha ISO si es necesario
            let submittedAt, updatedAt;
            
            // Procesar created_at
            if (media.created_at) {
                if (typeof media.created_at === 'number' || /^\d+$/.test(media.created_at)) {
                    const timestamp = parseInt(media.created_at);
                    if (timestamp > 1640995200) {
                        submittedAt = new Date(timestamp * 1000).toISOString();
                    } else {
                        submittedAt = new Date(timestamp).toISOString();
                    }
                } else {
                    submittedAt = media.created_at;
                }
            } else {
                submittedAt = new Date().toISOString();
            }
            
            // Procesar updated_at
            if (media.updated_at) {
                if (typeof media.updated_at === 'number' || /^\d+$/.test(media.updated_at)) {
                    const timestamp = parseInt(media.updated_at);
                    if (timestamp > 1640995200) {
                        updatedAt = new Date(timestamp * 1000).toISOString();
                    } else {
                        updatedAt = new Date(timestamp).toISOString();
                    }
                } else {
                    updatedAt = media.updated_at;
                }
            } else {
                updatedAt = submittedAt;
            }

            // Extraer datos de los nuevos campos del schema chequeabolivia-verificaciones
            const newSchemaData = this.extractNewSchemaFields(media);

            return {
                claim: claim,
                item_page_url: `https://checkmedia.org/chequeabolivia-verificaciones/media/${media.dbid}`,
                status: mappedStatus,
                created_by: '',
                submitted_at: submittedAt,
                updated_at: updatedAt,
                social_media_posted_at: null,
                report_published_at: null,
                number_of_media: 1,
                tags: tags,
                red_social: redSocial,
                reacciones: engagement.reacciones,
                formato: formato,
                comentarios: engagement.comentarios,
                compartidos: engagement.compartidos,
                visualizaciones: engagement.visualizaciones,
                source: 'check_api',
                check_id: media.id,
                check_dbid: media.dbid,
                // Nuevos campos del schema
                ...newSchemaData
            };
        });
    }

    extractDataFromTasksAndAnnotations(media, engagement, redSocial, formato) {
        if (media.tasks && media.tasks.edges) {
            media.tasks.edges.forEach((taskEdge, index) => {
                const task = taskEdge.node;
                const label = task.label?.toLowerCase() || '';
                const value = task.first_response_value || '';

                // Buscar campos de engagement en las tasks
                if (label.includes('reacciones') || label.includes('reactions') || label.includes('likes')) {
                    const numValue = parseInt(value) || 0;
                    if (numValue > 0) {
                        engagement.reacciones = numValue;
                    }
                } else if (label.includes('comentarios') || label.includes('comments')) {
                    const numValue = parseInt(value) || 0;
                    if (numValue > 0) {
                        engagement.comentarios = numValue;
                    }
                } else if (label.includes('compartidos') || label.includes('shares') || label.includes('compartir')) {
                    const numValue = parseInt(value) || 0;
                    if (numValue > 0) {
                        engagement.compartidos = numValue;
                    }
                } else if (label.includes('visualizaciones') || label.includes('views') || label.includes('vistas')) {
                    const numValue = parseInt(value) || 0;
                    if (numValue > 0) {
                        engagement.visualizaciones = numValue;
                    }
                } else if (label.includes('red social') || label.includes('plataforma') || label.includes('platform')) {
                    redSocial = this.mapSocialNetwork(value) || redSocial;
                } else if (label.includes('formato') || label.includes('format') || label.includes('tipo')) {
                    formato = this.mapFormat(value) || formato;
                }
            });
        }

        return { engagement, redSocial, formato };
    }

    detectSocialMediaFromUrl(mediaUrl) {
        if (!mediaUrl) return null;

        const url = mediaUrl.toLowerCase();
        if (url.includes('facebook.com')) return 'Facebook';
        else if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter/X';
        else if (url.includes('tiktok.com')) return 'TikTok';
        else if (url.includes('instagram.com')) return 'Instagram';
        else if (url.includes('youtube.com')) return 'YouTube';
        else if (url.includes('whatsapp')) return 'WhatsApp';
        else if (url.includes('telegram')) return 'Telegram';

        return null;
    }

    detectSocialMediaFromProvider(provider) {
        if (!provider) return null;

        const p = provider.toLowerCase();
        if (p.includes('tiktok')) return 'TikTok';
        else if (p.includes('facebook')) return 'Facebook';
        else if (p.includes('twitter')) return 'Twitter/X';
        else if (p.includes('instagram')) return 'Instagram';
        else if (p.includes('youtube')) return 'YouTube';

        return null;
    }

    detectMediaFormat(mediaUrl, metadata) {
        const mediaType = metadata?.type;
        if (mediaType === 'video') return 'Audiovisual';
        if (mediaType === 'image') return 'Imagen';

        if (!mediaUrl) return 'Texto';

        const url = mediaUrl.toLowerCase();
        if (url.includes('youtube.com') || url.includes('tiktok.com') || url.includes('video') || url.match(/\.(mp4|avi|mov|mkv)$/)) {
            return 'Audiovisual';
        }
        if (url.includes('image') || url.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            return 'Imagen';
        }
        return 'Texto';
    }

    mapSocialNetwork(value) {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes('facebook')) return 'Facebook';
        if (lowerValue.includes('twitter') || lowerValue.includes('x ')) return 'Twitter/X';
        if (lowerValue.includes('tiktok')) return 'TikTok';
        if (lowerValue.includes('instagram')) return 'Instagram';
        if (lowerValue.includes('youtube')) return 'YouTube';
        if (lowerValue.includes('whatsapp')) return 'WhatsApp';
        if (lowerValue.includes('telegram')) return 'Telegram';
        return value;
    }

    mapFormat(value) {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes('imagen') || lowerValue.includes('image')) return 'Imagen';
        if (lowerValue.includes('video') || lowerValue.includes('audiovisual')) return 'Audiovisual';
        if (lowerValue.includes('texto') || lowerValue.includes('text')) return 'Texto';
        return value;
    }

    extractNewSchemaFields(media) {
        const schemaData = {
            fue_creado_con_ia: null,
            ataca_candidato: null,
            candidato_atacado: null,
            ataca_tse: null,
            narrativa_tse: null,
            es_caso_es: null,
            narrativa_desinformacion: null,
            imita_medio: null,
            medio_imitado: null,
            tipo_rumor: null,
            rumor_promovido: null
        };

        if (media.tasks && media.tasks.edges) {
            media.tasks.edges.forEach((taskEdge) => {
                const task = taskEdge.node;
                const label = task.label?.toLowerCase() || '';
                const value = task.first_response_value || '';

                if (label === '¿fue creado con ia?') {
                    schemaData.fue_creado_con_ia = this.normalizeYesNoField(value);
                } else if (label === '¿ataca a un candidato?') {
                    schemaData.ataca_candidato = this.normalizeYesNoField(value);
                } else if (label === '¿a qué candidato?') {
                    schemaData.candidato_atacado = value;
                } else if (label === '¿ataca al tse o al proceso electoral?') {
                    schemaData.ataca_tse = this.normalizeYesNoField(value);
                } else if (label === '¿qué narrativa se utiliza para atacar al tse o al proceso electoral?') {
                    schemaData.narrativa_tse = value;
                } else if (label === 'es caso es: ' || label === 'es caso es:') {
                    schemaData.es_caso_es = this.normalizeCaseType(value);
                } else if (label === 'señale qué narrativa de desinformación se utiliza ' || label === 'señale qué narrativa de desinformación se utiliza') {
                    schemaData.narrativa_desinformacion = value;
                } else if (label === '¿imita a un medio de comunicación?') {
                    schemaData.imita_medio = this.normalizeYesNoField(value);
                } else if (label === '¿a qué medio?') {
                    schemaData.medio_imitado = value;
                } else if (label === '¿qué tipo de rumor es?') {
                    schemaData.tipo_rumor = value;
                } else if (label === 'el rumor que se promueve es: ' || label === 'el rumor que se promueve es:') {
                    schemaData.rumor_promovido = value;
                }
            });
        }

        return schemaData;
    }

    normalizeYesNoField(value) {
        if (!value) return null;
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue.includes('sí') || lowerValue.includes('si') || lowerValue === 'yes') {
            return 'Sí';
        } else if (lowerValue.includes('no')) {
            return 'No';
        }
        return value;
    }

    normalizeCaseType(value) {
        if (!value) return null;
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue.includes('desinformación') || lowerValue.includes('desinformacion')) {
            return 'Desinformación';
        } else if (lowerValue.includes('rumor')) {
            return 'Rumor';
        }
        return value;
    }

    async getStatistics() {
        const query = `
            query getStatistics($query: String!) {
                search(query: $query) {
                    medias {
                        edges {
                            node {
                                last_status
                                created_at
                            }
                        }
                    }
                }
            }
        `;

        const searchQuery = {
            eslimit: 1000,
            sort: "recent_activity"
        };

        try {
            const response = await axios.post(this.apiUrl,
                {
                    query,
                    variables: {
                        query: JSON.stringify(searchQuery)
                    }
                },
                {
                    headers: this.headers,
                    timeout: 120000
                }
            );

            if (response.data.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
            }

            const medias = response.data.data?.search?.medias?.edges || [];

            const stats = {
                total: medias.length,
                verified: 0,
                false: 0,
                misleading: 0,
                unverified: 0,
                recent_24h: 0
            };

            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            medias.forEach(edge => {
                const media = edge.node;
                const status = (media.last_status || '').toLowerCase();

                if (status === 'verified') stats.verified++;
                else if (status === 'false') stats.false++;
                else if (status === 'misleading') stats.misleading++;
                else stats.unverified++;

                if (new Date(media.created_at) > yesterday) {
                    stats.recent_24h++;
                }
            });

            return stats;

        } catch (error) {
            console.error('Error fetching statistics from Check API:', error.message);
            throw error;
        }
    }
}

module.exports = CheckApiClient;

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
            'User-Agent': 'Dashboard-Disinfo/1.0'
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

        // Use search query with larger limit to get more data
        // Try different sorting approaches to get the most recent data
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
            
            // Log para debugging: mostrar estructura de datos disponibles
            if (medias.length > 0) {
                const sampleMedia = medias[0].node;
                console.log('🔍 Estructura de datos disponibles en Check API:');
                console.log('- Tasks disponibles:', sampleMedia.tasks?.edges?.length || 0);
                console.log('- Annotations disponibles:', sampleMedia.annotations?.edges?.length || 0);
                
                if (sampleMedia.tasks?.edges?.length > 0) {
                    console.log('- Labels de tasks:', sampleMedia.tasks.edges.map(e => e.node.label).slice(0, 5));
                }
                if (sampleMedia.annotations?.edges?.length > 0) {
                    console.log('- Tipos de annotations:', sampleMedia.annotations.edges.map(e => e.node.annotation_type).slice(0, 5));
                }
            }
            
            return this.transformMediasToPostFormat(medias);

        } catch (error) {
            console.error('Error fetching medias from Check API:', error.message);
            throw error;
        }
    }

    async getRecentMedias(hours = 24) {
        const fromDate = new Date();
        fromDate.setHours(fromDate.getHours() - hours);

        const query = `
            query getRecentMedias($query: String!) {
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
                                claim_description {
                                    description
                                }
                                tags {
                                    edges {
                                        node {
                                            tag
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const searchQuery = {
            eslimit: 500
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
            return this.transformMediasToPostFormat(medias);

        } catch (error) {
            console.error('Error fetching recent medias from Check API:', error.message);
            throw error;
        }
    }

    transformMediasToPostFormat(medias) {
        return medias.map((edge, index) => {
            const media = edge.node;
            const factCheck = media.claim_description?.fact_check;
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
            
            // También extraer datos de annotations generales - DESACTIVADO por problemas de GraphQL
            // this.extractDataFromAnnotations(media, engagement);
            
            // Obtener claim antes de usar en logging
            const claim = media.title || media.description || media.quote || media.claim_description?.description || `Media ${media.dbid}`;
            
            // Log detallado para debugging: rastrear de dónde vienen los valores
            const hasEngagement = engagement.reacciones > 0 || engagement.comentarios > 0 || engagement.compartidos > 0 || engagement.visualizaciones > 0;
            
            // Caso específico problema reportado: Caso 233
            const isCase233 = claim.includes("video muestra papeletas marcadas a favor de Doria Medina") || 
                             claim.includes("papeletas marcadas") || 
                             media.dbid === 233;
            
            if (hasEngagement || isCase233) {
                console.log(`📊 Media ${media.dbid} - "${claim.substring(0, 50)}..."`);
                console.log(`   Engagement final:`, engagement);
                
                if (isCase233) {
                    console.log(`🚨 CASO 233 DETECTADO - DEBUGGING ESPECÍFICO:`);
                    console.log(`   Claim completo: "${claim}"`);
                }
                
                // Mostrar datos de tasks para verificar
                if (media.tasks?.edges?.length > 0) {
                    console.log(`   Tasks disponibles:`);
                    media.tasks.edges.forEach(taskEdge => {
                        const task = taskEdge.node;
                        console.log(`     - Label: "${task.label}" | Value: "${task.first_response_value || 'N/A'}" | Type: ${task.type}`);
                        
                        // Mostrar responses también
                        if (task.responses?.edges?.length > 0) {
                            task.responses.edges.forEach((respEdge, respIdx) => {
                                console.log(`       Response ${respIdx}: "${respEdge.node.content}"`);
                            });
                        }
                    });
                }
                
                // Mostrar annotations si hay
                if (media.annotations?.edges?.length > 0) {
                    console.log(`   Annotations disponibles:`);
                    media.annotations.edges.forEach((annEdge, annIdx) => {
                        const ann = annEdge.node;
                        console.log(`     ${annIdx}. Type: ${ann.annotation_type}`);
                        console.log(`        Content: ${ann.content?.substring(0, 100) || 'N/A'}`);
                        console.log(`        Data: ${ann.data?.substring(0, 100) || 'N/A'}`);
                    });
                }
                console.log('---');
            }

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

            // Los datos de engagement deben venir de las tasks/annotations de la API
            // No usar datos simulados - solo usar lo que venga de extractDataFromTasksAndAnnotations

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
                // Los timestamps parecen estar en formato Unix pero necesitan conversión especial
                if (typeof media.created_at === 'number' || /^\d+$/.test(media.created_at)) {
                    // Si el timestamp es muy grande, podría estar en milisegundos
                    const timestamp = parseInt(media.created_at);
                    if (timestamp > 1640995200) { // Si es después del 2022-01-01, tratarlo como segundos
                        submittedAt = new Date(timestamp * 1000).toISOString();
                    } else {
                        submittedAt = new Date(timestamp).toISOString();
                    }
                } else {
                    // Si ya es una fecha ISO, usarla directamente
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
                // Si no hay updated_at, usar created_at como fallback
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
                social_media_posted_at: null, // Este campo requiere análisis adicional
                report_published_at: null, // Este campo requiere análisis adicional  
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
        // Extraer datos de tasks (respuestas de campos personalizados)
        // Versión simplificada que permite múltiples valores y usa el más reciente/válido
        
        if (media.tasks && media.tasks.edges) {
            media.tasks.edges.forEach((taskEdge, index) => {
                const task = taskEdge.node;
                const label = task.label?.toLowerCase() || '';
                const value = task.first_response_value || '';

                // Buscar campos de engagement en las tasks
                if (label.includes('reacciones') || label.includes('reactions') || label.includes('likes')) {
                    const numValue = parseInt(value) || 0;
                    if (numValue > 0) {
                        console.log(`🔍 TASK REACCIONES: Label "${task.label}" -> Value "${value}" -> Parsed ${numValue}`);
                        engagement.reacciones = numValue;
                    }
                } else if (label.includes('comentarios') || label.includes('comments')) {
                    const numValue = parseInt(value) || 0;
                    if (numValue > 0) {
                        console.log(`🔍 TASK COMENTARIOS: Label "${task.label}" -> Value "${value}" -> Parsed ${numValue}`);
                        engagement.comentarios = numValue;
                    }
                } else if (label.includes('compartidos') || label.includes('shares') || label.includes('compartir')) {
                    const numValue = parseInt(value) || 0;
                    if (numValue > 0) {
                        console.log(`🔍 TASK COMPARTIDOS: Label "${task.label}" -> Value "${value}" -> Parsed ${numValue}`);
                        engagement.compartidos = numValue;
                    }
                } else if (label.includes('visualizaciones') || label.includes('views') || label.includes('vistas')) {
                    const numValue = parseInt(value) || 0;
                    if (numValue > 0) {
                        console.log(`🔍 TASK VISUALIZACIONES: Label "${task.label}" -> Value "${value}" -> Parsed ${numValue}`);
                        engagement.visualizaciones = numValue;
                    }
                } else if (label.includes('red social') || label.includes('plataforma') || label.includes('platform')) {
                    redSocial = this.mapSocialNetwork(value) || redSocial;
                } else if (label.includes('formato') || label.includes('format') || label.includes('tipo')) {
                    formato = this.mapFormat(value) || formato;
                }
                
                // NO revisar responses - causan datos incorrectos (extraen IDs en lugar de valores)
                // Los valores correctos están en first_response_value
            });
        }

        return { engagement, redSocial, formato };
    }

    extractDataFromAnnotations(media, engagement) {
        // Extraer datos de annotations generales
        if (media.annotations && media.annotations.edges) {
            media.annotations.edges.forEach(annotationEdge => {
                const annotation = annotationEdge.node;
                const type = annotation.annotation_type;
                const content = annotation.content;
                const data = annotation.data;

                // Buscar datos de engagement en diferentes tipos de annotations
                if (type && content) {
                    this.extractEngagementFromAnnotation(type, content, data, engagement);
                }
            });
        }
    }

    extractEngagementFromResponse(responseContent, engagement, taskLabel) {
        // Extraer números de respuestas de tasks
        if (typeof responseContent === 'string') {
            const numbers = responseContent.match(/\d+/g);
            if (numbers && numbers.length > 0) {
                const value = parseInt(numbers[0]);
                if (value > 0) {
                    if (taskLabel.includes('reacciones') || taskLabel.includes('likes')) {
                        console.log(`🔍 RESPONSE REACCIONES: TaskLabel "${taskLabel}" -> Content "${responseContent}" -> Parsed ${value} (Current: ${engagement.reacciones})`);
                        // Solo usar el último valor encontrado, no Math.max para evitar acumulación incorrecta
                        engagement.reacciones = value;
                    } else if (taskLabel.includes('comentarios') || taskLabel.includes('comments')) {
                        console.log(`🔍 RESPONSE COMENTARIOS: TaskLabel "${taskLabel}" -> Content "${responseContent}" -> Parsed ${value} (Current: ${engagement.comentarios})`);
                        engagement.comentarios = value;
                    } else if (taskLabel.includes('compartidos') || taskLabel.includes('shares')) {
                        console.log(`🔍 RESPONSE COMPARTIDOS: TaskLabel "${taskLabel}" -> Content "${responseContent}" -> Parsed ${value} (Current: ${engagement.compartidos})`);
                        engagement.compartidos = value;
                    } else if (taskLabel.includes('visualizaciones') || taskLabel.includes('views')) {
                        console.log(`🔍 RESPONSE VISUALIZACIONES: TaskLabel "${taskLabel}" -> Content "${responseContent}" -> Parsed ${value} (Current: ${engagement.visualizaciones})`);
                        engagement.visualizaciones = value;
                    }
                }
            }
        }
    }

    extractEngagementFromAnnotation(type, content, data, engagement) {
        // Extraer datos de diferentes tipos de annotations
        try {
            let parsedData = null;
            if (typeof data === 'string') {
                parsedData = JSON.parse(data);
            } else if (typeof data === 'object') {
                parsedData = data;
            }

            // Buscar campos de engagement en la data de la annotation
            if (parsedData) {
                Object.keys(parsedData).forEach(key => {
                    const lowerKey = key.toLowerCase();
                    const value = parsedData[key];
                    
                    if (typeof value === 'number' && value > 0) {
                        if (lowerKey.includes('reacciones') || lowerKey.includes('likes') || lowerKey.includes('reactions')) {
                            console.log(`🔍 ANNOTATION REACCIONES: Type "${type}" -> Key "${key}" -> Value ${value} (Current: ${engagement.reacciones})`);
                            // Solo usar el valor si es más específico o el primero encontrado
                            engagement.reacciones = value;
                        } else if (lowerKey.includes('comentarios') || lowerKey.includes('comments')) {
                            console.log(`🔍 ANNOTATION COMENTARIOS: Type "${type}" -> Key "${key}" -> Value ${value} (Current: ${engagement.comentarios})`);
                            engagement.comentarios = value;
                        } else if (lowerKey.includes('compartidos') || lowerKey.includes('shares')) {
                            console.log(`🔍 ANNOTATION COMPARTIDOS: Type "${type}" -> Key "${key}" -> Value ${value} (Current: ${engagement.compartidos})`);
                            engagement.compartidos = value;
                        } else if (lowerKey.includes('visualizaciones') || lowerKey.includes('views')) {
                            console.log(`🔍 ANNOTATION VISUALIZACIONES: Type "${type}" -> Key "${key}" -> Value ${value} (Current: ${engagement.visualizaciones})`);
                            engagement.visualizaciones = value;
                        }
                    }
                });
            }

            // También revisar el content por si contiene números
            if (typeof content === 'string') {
                const numbers = content.match(/\d+/g);
                if (numbers && numbers.length > 0) {
                    // Este es un parsing más conservador - solo si el annotation type sugiere engagement
                    if (type && (type.includes('engagement') || type.includes('metric') || type.includes('stats'))) {
                        const value = parseInt(numbers[0]);
                        if (value > 0) {
                            console.log(`🔍 ANNOTATION CONTENT REACCIONES: Type "${type}" -> Content "${content}" -> Parsed ${value} (Current: ${engagement.reacciones})`);
                            // Asignar a reacciones por defecto si no podemos determinar el tipo específico
                            engagement.reacciones = value;
                        }
                    }
                }
            }
        } catch (error) {
            // Si no se puede parsear la data, continuar silenciosamente
        }
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
        // Determinar formato basado en metadata primero, luego URL
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

    generateUniqueKey(dbid) {
        // Simplificado: usar directamente el check_dbid de la API
        return dbid;
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
        return value; // Retornar valor original si no coincide
    }

    mapFormat(value) {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes('imagen') || lowerValue.includes('image')) return 'Imagen';
        if (lowerValue.includes('video') || lowerValue.includes('audiovisual')) return 'Audiovisual';
        if (lowerValue.includes('texto') || lowerValue.includes('text')) return 'Texto';
        return value; // Retornar valor original si no coincide
    }

    determineFormat(media) {
        // Determinar formato basado en metadata primero, luego URL
        const mediaType = media.media?.metadata?.type;
        if (mediaType === 'video') return 'Audiovisual';
        if (mediaType === 'image') return 'Imagen';

        const mediaUrl = media.media?.url || media.url;
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

            // Calcular estadísticas
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

                // Contar por status
                if (status === 'verified') stats.verified++;
                else if (status === 'false') stats.false++;
                else if (status === 'misleading') stats.misleading++;
                else stats.unverified++;

                // Contar recientes
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

    extractNewSchemaFields(media) {
        // Inicializar campos con valores por defecto
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

        // Extraer datos de tasks si están disponibles
        if (media.tasks && media.tasks.edges) {
            media.tasks.edges.forEach((taskEdge) => {
                const task = taskEdge.node;
                const label = task.label?.toLowerCase() || '';
                const value = task.first_response_value || '';

                // Mapear etiquetas a campos del schema usando nombres exactos encontrados en la API
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
        return value; // Retornar valor original si no es reconocido
    }

    normalizeCaseType(value) {
        if (!value) return null;
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue.includes('desinformación') || lowerValue.includes('desinformacion')) {
            return 'Desinformación';
        } else if (lowerValue.includes('rumor')) {
            return 'Rumor';
        }
        return value; // Retornar valor original si no es reconocido
    }
}

module.exports = CheckApiClient;
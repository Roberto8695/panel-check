import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';

export async function GET() {
  try {
    console.log('🔄 Proxy: Redirigiendo petición de estadísticas al backend...');
    
    const response = await fetch(`${BACKEND_URL}/statistics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Error del backend:', response.status, response.statusText);
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Estadísticas obtenidas del backend');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error en proxy de estadísticas:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error de conexión con el backend',
        details: error instanceof Error ? error.message : 'Error desconocido',
        data: {
          total: 0,
          published: 0,
          unpublished: 0,
          draft: 0,
          byNetwork: {},
          byFormat: {},
          byStatus: {},
          totalEngagement: { reacciones: 0, comentarios: 0, compartidos: 0, visualizaciones: 0 },
          recent24h: 0,
          lastUpdated: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      },
      { status: 500 }
    );
  }
}

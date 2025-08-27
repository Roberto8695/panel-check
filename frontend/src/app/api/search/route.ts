import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('🔄 Proxy: Redirigiendo búsqueda al backend...');
    
    const response = await fetch(`${BACKEND_URL}/search?${searchParams.toString()}`, {
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
    console.log('✅ Búsqueda completada en el backend');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error en proxy de búsqueda:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error de búsqueda en el backend',
        details: error instanceof Error ? error.message : 'Error desconocido',
        data: [],
        meta: { 
          total: 0, 
          limit: 0, 
          offset: 0, 
          page: 1, 
          totalPages: 0, 
          hasMore: false,
          lastUpdated: new Date().toISOString(),
          source: 'error'
        }
      },
      { status: 500 }
    );
  }
}

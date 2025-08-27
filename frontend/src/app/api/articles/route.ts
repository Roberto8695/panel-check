import { NextResponse } from 'next/server';

// Mock data de artículos
const mockArticles = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  title: `Verificación ${i + 1}`,
  summary: `Resumen de la verificación ${i + 1}`,
  status: ['Verificado', 'Falso', 'Engañoso', 'Sin iniciar', 'En progreso'][Math.floor(Math.random() * 5)],
  url: `https://example.com/article-${i + 1}`,
  source: ['Facebook', 'Twitter', 'WhatsApp', 'Instagram'][Math.floor(Math.random() * 4)],
  format: ['Texto', 'Imagen', 'Video', 'Audio'][Math.floor(Math.random() * 4)],
  createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  engagement: {
    reactions: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
    shares: Math.floor(Math.random() * 500),
    views: Math.floor(Math.random() * 5000)
  }
}));

export async function GET() {
  try {
    return NextResponse.json({
      articles: mockArticles,
      total: mockArticles.length,
      page: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Error fetching articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newArticle = {
      id: mockArticles.length + 1,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0,
        views: 0
      }
    };

    mockArticles.push(newArticle);

    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'Error creating article' },
      { status: 500 }
    );
  }
}
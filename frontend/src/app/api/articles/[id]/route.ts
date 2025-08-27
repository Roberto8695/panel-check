import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params.id;
    
    // Mock data para un artículo específico
    const article = {
      id: id,
      title: `Artículo ${id}`,
      summary: `Resumen del artículo ${id}`,
      content: `Contenido completo del artículo ${id}`,
      status: 'Verificado',
      url: `https://example.com/article-${id}`,
      source: 'Facebook',
      format: 'Texto',
      createdAt: new Date().toISOString(),
      engagement: {
        reactions: 150,
        comments: 25,
        shares: 80,
        views: 1200
      }
    };

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Article not found' },
      { status: 404 }
    );
  }
}
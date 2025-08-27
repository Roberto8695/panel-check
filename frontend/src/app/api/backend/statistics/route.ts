import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Estadísticas mockadas
    const stats = {
      total: 100,
      verified: 25,
      false: 15,
      misleading: 20,
      inProgress: 30,
      notStarted: 10,
      totalEngagement: {
        reactions: 12500,
        comments: 3400,
        shares: 8900,
        views: 45000
      },
      recent24h: 9,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Error fetching statistics' },
      { status: 500 }
    );
  }
}

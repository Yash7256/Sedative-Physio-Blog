import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Check if the API key is configured
  const hasApiKey = !!process.env.GROK_API_KEY;
  
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      ai_integration: hasApiKey,
      api_key_configured: hasApiKey,
      service_endpoint: '/api/ai/chat'
    }
  });
}
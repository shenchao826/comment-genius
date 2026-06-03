export default async function healthCheck(request: Request, env: Env) {
  const startTime = Date.now();
  
  try {
    // Check database connection
    let dbStatus = 'ok';
    let dbLatency = 0;
    
    try {
      const dbStart = Date.now();
      await env.DB.prepare('SELECT 1').first();
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      dbStatus = 'error';
      console.error('Database health check failed:', error);
    }
    
    // Check KV store (if available)
    let kvStatus = 'ok';
    if (env.RATE_LIMIT_KV) {
      try {
        await env.RATE_LIMIT_KV.get('health-check-test');
      } catch (error) {
        kvStatus = 'error';
        console.error('KV health check failed:', error);
      }
    }
    
    const totalLatency = Date.now() - startTime;
    
    const isHealthy = dbStatus === 'ok' && kvStatus === 'ok';
    
    const response = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime?.() || 0,
      version: '1.0.0',
      environment: env.ENVIRONMENT || 'production',
      checks: {
        database: {
          status: dbStatus,
          latency_ms: dbLatency
        },
        kv: {
          status: kvStatus
        }
      },
      latency_ms: totalLatency
    };
    
    return new Response(JSON.stringify(response, null, 2), {
      status: isHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

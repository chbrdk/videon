/**
 * PrismVid After Effects Proxy Server
 * 
 * Ein einfacher Proxy-Server, der HTTP-Requests vom After Effects ExtendScript
 * an das Backend weiterleitet.
 * 
 * Usage:
 *   node server.js
 * 
 * Dann im ExtendScript nutzen:
 *   http://localhost:8080/proxy/search?q=test
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4001';
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Parse request
    const parsedUrl = url.parse(req.url, true);
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Proxy route: /proxy/search?q=...
    if (parsedUrl.pathname === '/proxy/search' && req.method === 'GET') {
        const query = parsedUrl.query.q;
        
        if (!query) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing query parameter "q"' }));
            return;
        }
        
        // Forward request to backend
        const backendUrl = `${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&limit=20`;
        
        console.log(`Forwarding to: ${backendUrl}`);
        
        http.get(backendUrl, (backendRes) => {
            let data = '';
            
            backendRes.on('data', (chunk) => {
                data += chunk;
            });
            
            backendRes.on('end', () => {
                res.writeHead(backendRes.statusCode, {
                    'Content-Type': 'application/json'
                });
                res.end(data);
                console.log(`Response: ${backendRes.statusCode}`);
            });
            
        }).on('error', (err) => {
            console.error('Backend request failed:', err);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Backend not reachable', details: err.message }));
        });
        
        return;
    }
    
    // Health check
    if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            proxy: true, 
            backend: BACKEND_URL 
        }));
        return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`PrismVid AE Proxy Server running`);
    console.log(`========================================`);
    console.log(`Port: ${PORT}`);
    console.log(`Backend: ${BACKEND_URL}`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`  Search: http://localhost:${PORT}/proxy/search?q=<query>`);
    console.log(`\n========================================\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});


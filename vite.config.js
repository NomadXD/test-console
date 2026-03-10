import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function proxyPlugin() {
  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const body = await readBody(req);
        const { url, method, headers, body: reqBody } = JSON.parse(body);

        try {
          const fetchOptions = {
            method: method || 'GET',
            headers: headers || {},
          };

          if (reqBody && method !== 'GET' && method !== 'HEAD') {
            fetchOptions.body = reqBody;
          }

          const response = await fetch(url, fetchOptions);

          const responseHeaders = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          let responseBody;
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            responseBody = await response.json();
          } else {
            responseBody = await response.text();
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body: responseBody,
            requestHeaders: headers || {},
          }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      server.middlewares.use('/api/token', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const body = await readBody(req);
        const { tokenUrl, clientId, clientSecret } = JSON.parse(body);

        try {
          const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: clientId,
              client_secret: clientSecret,
            }),
          });

          const data = await response.json();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), proxyPlugin()],
})

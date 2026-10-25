import { Router } from 'express';
import { openApiSpec } from '../spec.js';

export const docsRouter = Router();

const specJson = JSON.stringify(openApiSpec);

const customHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DevHibernate API Docs</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      var spec = ${specJson};
      window.ui = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout'
      });
    };
  </script>
</body>
</html>`;

docsRouter.get('/docs/json', (_req, res) => res.json(openApiSpec));
docsRouter.get('/docs', (_req, res) => {
  // Swagger UI is loaded from unpkg with an inline init script, so relax the
  // strict global CSP for this one HTML route (the rest of the app stays strict).
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline' https://unpkg.com; " +
    "img-src 'self' data: https://unpkg.com; " +
    "font-src 'self' https://unpkg.com; " +
    "connect-src 'self'"
  );
  res.set('Content-Type', 'text/html');
  res.send(customHtml);
});
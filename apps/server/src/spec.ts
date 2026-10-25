export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DevHibernate API',
    version: '1.0.0',
    description: 'Local development-project hibernation tool',
  },
  servers: [{ url: 'http://127.0.0.1:4317' }],
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/bootstrap': {
      get: {
        summary: 'Get access token',
        responses: { 200: { description: 'Token' } },
      },
    },
    '/api/roots': {
      get: {
        summary: 'List roots',
        responses: { 200: { description: 'Array of roots' } },
      },
      post: {
        summary: 'Register root',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['path'],
                properties: { path: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Root registered' },
          400: { description: 'Invalid path' },
          403: { description: 'Path blocked' },
        },
      },
    },
    '/api/scans': {
      post: {
        summary: 'Start scan',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rootId'],
                properties: { rootId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Scan queued' },
          400: { description: 'rootId required' },
          404: { description: 'Root not found' },
        },
      },
    },
    '/api/scans/{id}': {
      get: {
        summary: 'Get scan status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Scan with projects' },
          404: { description: 'Scan not found' },
        },
      },
    },
    '/api/projects': {
      get: {
        summary: 'List projects',
        parameters: [{ name: 'rootId', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Array of projects' } },
      },
    },
    '/api/projects/{id}': {
      patch: {
        summary: 'Update project (pin/shelve)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pinned: { type: 'boolean' },
                  userShelved: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated project' },
          404: { description: 'Project not found' },
        },
      },
    },
    '/api/candidates/{projectId}': {
      post: {
        summary: 'Inventory candidate',
        responses: {
          200: { description: 'Candidate IDs' },
          400: { description: 'No node_modules' },
          404: { description: 'Project not found' },
        },
      },
      get: {
        summary: 'Get candidates',
        responses: { 200: { description: 'Array of candidates' } },
      },
    },
    '/api/plans/{projectId}': {
      post: {
        summary: 'Generate plan with local model',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['scanId'],
                properties: { scanId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Plan generated' },
          503: { description: 'Model unavailable' },
        },
      },
    },
    '/api/plans/{id}': {
      get: {
        summary: 'Get plan',
        responses: {
          200: { description: 'Plan with model result' },
          404: { description: 'Plan not found' },
        },
      },
    },
  },
};
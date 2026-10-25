import { Router } from 'express';
import { openApiSpec } from '../spec.js';
import swaggerUi from 'swagger-ui-express';

export const docsRouter = Router();

docsRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
docsRouter.get('/docs/json', (_req, res) => res.json(openApiSpec));
import {type FastifyInstance} from 'fastify';
import {HealthcheckResponseSchema, type HealthcheckResponse} from '@ion/api-contracts';

export default async function routes(server: FastifyInstance) {
  server.get<{Reply: HealthcheckResponse}>(
    '/healthcheck',
    {schema: {response: {200: HealthcheckResponseSchema}}},
      healthCheck
  );
}

async function healthCheck(): Promise<HealthcheckResponse> {
    return {ok: true};
}
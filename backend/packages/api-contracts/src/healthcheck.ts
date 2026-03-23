import {Type, Static} from '@sinclair/typebox';

export const HealthcheckResponseSchema = Type.Object({
  ok: Type.Boolean(),
});

export type HealthcheckResponse = Static<typeof HealthcheckResponseSchema>;

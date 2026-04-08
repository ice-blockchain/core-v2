import { Agent } from 'undici';
import type { Dispatcher } from 'undici';

export default function createPinnedDispatcher(
  validatedIp: string,
  family: 4 | 6,
): Dispatcher {
  return new Agent({
    connect: {
      lookup: (
        _hostname,
        options,
        callback,
      ) => {
        if (options && typeof options === 'object' && 'all' in options && options.all) {
          (callback as (...args: unknown[]) => void)(
            null, [{ address: validatedIp, family }],
          );
        } else {
          callback(null, validatedIp, family);
        }
      },
    },
  });
}

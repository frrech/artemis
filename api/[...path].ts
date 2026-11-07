import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../apps/api/dist/create-app';

type ExpressHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => void;

let handlerPromise: Promise<ExpressHandler> | undefined;

async function getHandler(): Promise<ExpressHandler> {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      const app = await createApp();
      await app.init();
      return app.getHttpAdapter().getInstance() as ExpressHandler;
    })();
    void handlerPromise.catch(() => {
      handlerPromise = undefined;
    });
  }

  return handlerPromise;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const expressHandler = await getHandler();
  expressHandler(request, response);
}
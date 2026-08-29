import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parseConfig } from './config.mjs';
import { readRawBody } from './body-reader.mjs';
import { createDedupeStore } from './dedupe-store.mjs';
import { createSanitizedLogger } from './logger.mjs';
import { createLineClient } from './line-client.mjs';
import { createWebhookHandler } from './webhook-handler.mjs';

const HEALTH_BODY = Object.freeze({
  ok: true,
  service: 'drs-line-test',
  mode: 'transport_only',
});

function send(response, status, { allow, json } = {}) {
  response.statusCode = status;
  if (allow) response.setHeader('allow', allow);
  if (json !== undefined) {
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(json));
    return;
  }
  response.end();
}

function sendAndClose(request, response, status) {
  response.shouldKeepAlive = false;
  response.setHeader('connection', 'close');
  response.once('finish', () => request.destroy());
  send(response, status);
}

function contentTypeIsJson(request) {
  const contentType = request.headers['content-type'];
  return typeof contentType === 'string'
    && contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

export function createDrsLineServer({
  webhookHandler,
  readBody = readRawBody,
  requestIdFactory = randomUUID,
  createServerImpl = createServer,
} = {}) {
  return createServerImpl(async (request, response) => {
    let pathname;
    try {
      pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    } catch {
      send(response, 400);
      return;
    }

    if (pathname === '/health') {
      if (request.method !== 'GET') {
        send(response, 405, { allow: 'GET' });
        return;
      }
      send(response, 200, { json: HEALTH_BODY });
      return;
    }

    if (pathname !== '/line/webhook') {
      send(response, 404);
      return;
    }

    if (request.method !== 'POST') {
      send(response, 405, { allow: 'POST' });
      return;
    }

    if (!contentTypeIsJson(request)) {
      send(response, 415);
      return;
    }

    let rawBody;
    try {
      rawBody = await readBody(request);
    } catch (error) {
      const status = error?.httpStatus === 408 || error?.httpStatus === 413
        ? error.httpStatus
        : 400;
      if (error?.closeConnection === true) {
        sendAndClose(request, response, status);
      } else {
        send(response, status);
      }
      return;
    }

    try {
      const result = await webhookHandler({
        rawBody,
        signature: request.headers['x-line-signature'],
        requestId: requestIdFactory(),
      });
      send(response, result?.status ?? 500);
    } catch (error) {
      send(response, error?.httpStatus === 503 ? 503 : 500);
    }
  });
}

export async function startServer({
  env = process.env,
  createServerImpl = createServer,
  fetchImpl = fetch,
  write,
} = {}) {
  const config = parseConfig(env);
  const logger = createSanitizedLogger({ write });
  const lineClient = createLineClient({
    accessToken: config.lineChannelAccessToken,
    fetchImpl,
  });
  const webhookHandler = createWebhookHandler({
    channelSecret: config.lineChannelSecret,
    lineClient,
    dedupeStore: createDedupeStore(),
    logger,
  });
  const server = createDrsLineServer({ webhookHandler, createServerImpl });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: '0.0.0.0', port: config.port }, resolve);
  });

  return server;
}

const isMainModule = Boolean(process.argv[1])
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;

export class BodyReadError extends Error {
  constructor(message, httpStatus) {
    super(message);
    this.name = 'BodyReadError';
    this.httpStatus = httpStatus;
    this.closeConnection = httpStatus === 408 || httpStatus === 413;
  }
}

export function readRawBody(request, {
  maxBytes = DEFAULT_MAX_BYTES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
} = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let byteLength = 0;
    let settled = false;
    let timer;

    const cleanup = () => {
      if (timer !== undefined) clearTimeoutFn(timer);
      request.off('data', onData);
      request.off('end', onEnd);
      request.off('error', onError);
      request.off('aborted', onAborted);
    };

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };

    const fail = (error) => finish(reject, error);

    const onData = (chunk) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteLength += bytes.length;
      if (byteLength > maxBytes) {
        request.pause?.();
        fail(new BodyReadError('Request body too large', 413));
        return;
      }
      chunks.push(bytes);
    };

    const onEnd = () => finish(resolve, Buffer.concat(chunks, byteLength));
    const onError = () => fail(new BodyReadError('Request body read failed', 400));
    const onAborted = () => fail(new BodyReadError('Request body read aborted', 400));

    request.on('data', onData);
    request.on('end', onEnd);
    request.on('error', onError);
    request.on('aborted', onAborted);

    timer = setTimeoutFn(() => {
      request.pause?.();
      fail(new BodyReadError('Request body timeout', 408));
    }, timeoutMs);
  });
}

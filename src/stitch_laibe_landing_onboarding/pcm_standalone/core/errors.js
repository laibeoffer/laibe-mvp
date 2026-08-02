export class PcmCoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PcmCoreError";
    this.code = code;
  }
}

export function fail(code, message) {
  throw new PcmCoreError(code, message);
}

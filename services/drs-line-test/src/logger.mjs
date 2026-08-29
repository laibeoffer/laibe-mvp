const ALLOWED_FIELDS = [
  'requestId',
  'eventId',
  'eventType',
  'sourceType',
  'outcome',
  'httpStatus',
  'durationMs',
];

export function createSanitizedLogger({
  now = () => new Date(),
  write = (line) => process.stdout.write(line),
} = {}) {
  return (entry = {}) => {
    const at = entry.at ?? now().toISOString();
    const record = { at };
    for (const field of ALLOWED_FIELDS) {
      if (entry[field] !== undefined) record[field] = entry[field];
    }
    write(`${JSON.stringify(record)}\n`);
  };
}

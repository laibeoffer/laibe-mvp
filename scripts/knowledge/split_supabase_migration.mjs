import {
  createHash,
} from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  join,
  resolve,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

export function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let index = 0;
  let mode = "normal";
  let blockDepth = 0;
  let dollarTag = "";

  while (index < sql.length) {
    const current = sql[index];
    const next = sql[index + 1];

    if (mode === "line-comment") {
      if (current === "\n") {
        mode = "normal";
      }
      index += 1;
      continue;
    }

    if (mode === "block-comment") {
      if (current === "/" && next === "*") {
        blockDepth += 1;
        index += 2;
        continue;
      }
      if (current === "*" && next === "/") {
        blockDepth -= 1;
        index += 2;
        if (blockDepth === 0) {
          mode = "normal";
        }
        continue;
      }
      index += 1;
      continue;
    }

    if (mode === "single-quote") {
      if (current === "'" && next === "'") {
        index += 2;
        continue;
      }
      if (current === "\\") {
        index += Math.min(2, sql.length - index);
        continue;
      }
      if (current === "'") {
        mode = "normal";
      }
      index += 1;
      continue;
    }

    if (mode === "double-quote") {
      if (current === '"' && next === '"') {
        index += 2;
        continue;
      }
      if (current === '"') {
        mode = "normal";
      }
      index += 1;
      continue;
    }

    if (mode === "dollar-quote") {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length;
        mode = "normal";
      } else {
        index += 1;
      }
      continue;
    }

    if (current === "-" && next === "-") {
      mode = "line-comment";
      index += 2;
      continue;
    }
    if (current === "/" && next === "*") {
      mode = "block-comment";
      blockDepth = 1;
      index += 2;
      continue;
    }
    if (current === "'") {
      mode = "single-quote";
      index += 1;
      continue;
    }
    if (current === '"') {
      mode = "double-quote";
      index += 1;
      continue;
    }
    if (current === "$") {
      const match = sql.slice(index).match(
        /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/,
      );
      if (match) {
        dollarTag = match[0];
        mode = "dollar-quote";
        index += dollarTag.length;
        continue;
      }
    }
    if (current === ";") {
      const statement = sql.slice(start, index + 1).trim();
      if (statement) {
        statements.push(statement);
      }
      start = index + 1;
    }
    index += 1;
  }

  const tail = sql.slice(start).trim();
  if (tail) {
    statements.push(tail);
  }
  if (mode !== "normal" && mode !== "line-comment") {
    throw new Error(`Unclosed SQL token state: ${mode}`);
  }
  return statements;
}

export function groupSqlStatements(statements, maxChars = 18_000) {
  if (!Number.isInteger(maxChars) || maxChars < 1_000) {
    throw new Error("maxChars must be an integer of at least 1000");
  }

  const groups = [];
  let current = "";
  for (const statement of statements) {
    const candidate = current ? `${current}\n\n${statement}` : statement;
    if (current && candidate.length > maxChars) {
      groups.push(current);
      current = statement;
    } else {
      current = candidate;
    }
  }
  if (current) {
    groups.push(current);
  }
  return groups;
}

export function unwrapOuterTransaction(statements) {
  const first = statements[0]?.trim().toLowerCase();
  const last = statements.at(-1)?.trim().toLowerCase();
  if (
    (first === "begin;" || first === "begin transaction;") &&
    last === "commit;"
  ) {
    return statements.slice(1, -1);
  }
  return statements;
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function writeMigrationChunks({
  inputPath,
  outputDir,
  maxChars = 18_000,
  prefix = "pcm_knowledge_foundation_20260726",
}) {
  const input = resolve(inputPath);
  const output = resolve(outputDir);
  const sql = readFileSync(input, "utf8");
  const sourceStatements = splitSqlStatements(sql);
  const statements = unwrapOuterTransaction(sourceStatements);
  const groups = groupSqlStatements(statements, maxChars);
  mkdirSync(output, { recursive: true });

  const width = Math.max(2, String(groups.length).length);
  const chunks = groups.map((content, index) => {
    const ordinal = String(index + 1).padStart(width, "0");
    const file = `${prefix}_${ordinal}.sql`;
    writeFileSync(join(output, file), `${content}\n`, "utf8");
    return {
      ordinal: index + 1,
      file,
      char_length: content.length,
      sha256: sha256(content),
      statement_count: splitSqlStatements(content).length,
    };
  });

  const manifest = {
    schema_version: "supabase_migration_chunks.v1",
    source_file: basename(input),
    source_char_length: sql.length,
    source_sha256: sha256(sql),
    source_statement_count: sourceStatements.length,
    statement_count: statements.length,
    outer_transaction_removed:
      sourceStatements.length === statements.length + 2,
    max_chars: maxChars,
    chunk_count: chunks.length,
    chunks,
  };
  writeFileSync(
    join(output, `${prefix}_manifest.json`),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return manifest;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? "<end>"}`);
    }
    options[key.slice(2)] = value;
  }
  if (!options.input || !options.output) {
    throw new Error("--input and --output are required");
  }
  return {
    inputPath: options.input,
    outputDir: options.output,
    maxChars: options["max-chars"]
      ? Number(options["max-chars"])
      : 18_000,
    prefix: options.prefix ?? "pcm_knowledge_foundation_20260726",
  };
}

const isCli = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const manifest = writeMigrationChunks(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

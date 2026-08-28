import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import {
  createServer as createHttpServer,
  request as httpRequest,
} from "node:http";
import { connect as connectPipe } from "node:net";
import process from "node:process";
import { pathToFileURL } from "node:url";

const MAX_CREATE_BODY_BYTES = 1_048_576;
const MAX_CHILD_OUTPUT_BYTES = 8_388_608;
const PROJECT_ID = "a17-s1ar-20260827";
const BACKEND_PIPE = String.raw`\\.\pipe\dockerDesktopLinuxEngine`;
const SUPABASE_EXECUTABLE = String
  .raw`C:\Users\J\scoop\apps\supabase\current\supabase.exe`;
const PIPE_PREFIX = "a17-s1ar-loopback-";
const STABLE_CODES = new Set([
  "A17_DOCKER_LOOPBACK_PROXY_CAPABILITY_REJECTED",
  "A17_DOCKER_LOOPBACK_PROXY_CHILD_REJECTED",
  "A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED",
  "A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED",
  "A17_DOCKER_LOOPBACK_PROXY_LISTEN_REJECTED",
  "A17_DOCKER_LOOPBACK_PROXY_OUTPUT_REJECTED",
  "A17_DOCKER_LOOPBACK_PROXY_REQUEST_TARGET_REJECTED",
  "A17_DOCKER_LOOPBACK_PROXY_RUNTIME_REJECTED",
]);

function fail(code) {
  throw new Error(code);
}

function isPlainObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function normalizedCreateTail(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    fail("A17_DOCKER_LOOPBACK_PROXY_REQUEST_TARGET_REJECTED");
  }
  if (decoded.includes("%")) {
    fail("A17_DOCKER_LOOPBACK_PROXY_REQUEST_TARGET_REJECTED");
  }
  const segments = [];
  for (const segment of decoded.replaceAll("\\", "/").split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  if (/^v\d+\.\d+$/iu.test(segments[0] ?? "")) segments.shift();
  return `/${segments.join("/")}`.toLowerCase();
}

function hasInvalidTargetCharacter(target) {
  if (target.includes("\\")) return true;
  for (const character of target) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 31 || codePoint === 127 || codePoint > 127) return true;
  }
  return false;
}

export function classifyDockerRequestTarget({
  method,
  target,
  allowedContainerNames,
}) {
  if (
    typeof method !== "string" ||
    typeof target !== "string" ||
    !Array.isArray(allowedContainerNames) ||
    target.length === 0 ||
    target.length > 8192 ||
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.includes("#") ||
    hasInvalidTargetCharacter(target)
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_REQUEST_TARGET_REJECTED");
  }

  const queryIndex = target.indexOf("?");
  const pathname = queryIndex === -1 ? target : target.slice(0, queryIndex);
  const rawQuery = queryIndex === -1 ? "" : target.slice(queryIndex + 1);
  const createAlias = normalizedCreateTail(pathname) === "/containers/create";
  if (!createAlias) return { kind: "passthrough" };

  const canonicalPath = /^\/v([1-9]\d*)\.(0|[1-9]\d*)\/containers\/create$/u;
  const pathMatch = canonicalPath.exec(pathname);
  if (
    method === "POST" &&
    pathname === "/v1.51/containers/create" &&
    queryIndex === -1
  ) {
    return { kind: "project-helper-create" };
  }
  const queryMatch = /^name=([A-Za-z0-9_-]+)$/u.exec(rawQuery);
  if (
    method !== "POST" ||
    pathMatch === null ||
    queryMatch === null ||
    !allowedContainerNames.includes(queryMatch[1])
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_REQUEST_TARGET_REJECTED");
  }
  return { kind: "container-create", containerName: queryMatch[1] };
}

function collectRawHeaders(rawHeaders) {
  if (!Array.isArray(rawHeaders) || rawHeaders.length % 2 !== 0) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED");
  }
  const values = new Map();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index];
    const value = rawHeaders[index + 1];
    if (typeof name !== "string" || typeof value !== "string") {
      fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED");
    }
    const lowerName = name.toLowerCase();
    const existing = values.get(lowerName) ?? [];
    existing.push(value);
    values.set(lowerName, existing);
  }
  return values;
}

function validateCreateFraming(rawHeaders) {
  const headers = collectRawHeaders(rawHeaders);
  const contentTypes = headers.get("content-type") ?? [];
  const contentLengths = headers.get("content-length") ?? [];
  const contentEncodings = headers.get("content-encoding") ?? [];
  if (
    contentTypes.length !== 1 ||
    contentTypes[0] !== "application/json" ||
    contentLengths.length !== 1 ||
    !/^[1-9]\d*$/u.test(contentLengths[0]) ||
    (contentEncodings.length !== 0 &&
      (contentEncodings.length !== 1 || contentEncodings[0] !== "identity")) ||
    headers.has("transfer-encoding") ||
    headers.has("trailer") ||
    headers.has("expect")
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED");
  }
  const contentLength = Number(contentLengths[0]);
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > MAX_CREATE_BODY_BYTES
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED");
  }
  return { headers, contentLength };
}

function parseCreateRequest({ rawHeaders, body }) {
  const framing = validateCreateFraming(rawHeaders);
  if (!Buffer.isBuffer(body) || body.byteLength !== framing.contentLength) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED");
  }

  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
  }
  return { framing, value };
}

function serializeCreateRequest({ framing, value }) {
  const rewrittenBody = Buffer.from(JSON.stringify(value), "utf8");
  const rewrittenHeaders = Object.create(null);
  for (const [name, values] of framing.headers.entries()) {
    if (
      name === "content-length" ||
      name === "content-encoding" ||
      name === "transfer-encoding" ||
      name === "trailer" ||
      name === "expect"
    ) continue;
    rewrittenHeaders[name] = values.length === 1 ? values[0] : [...values];
  }
  rewrittenHeaders["content-length"] = String(rewrittenBody.byteLength);
  return { body: rewrittenBody, headers: rewrittenHeaders };
}

export function rewriteContainerCreateRequest({ rawHeaders, body }) {
  const { framing, value } = parseCreateRequest({ rawHeaders, body });
  if (
    !isPlainObject(value) ||
    !Object.hasOwn(value, "HostConfig") ||
    !isPlainObject(value.HostConfig)
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
  }
  const hasPortBindings = Object.hasOwn(value.HostConfig, "PortBindings");
  if (hasPortBindings && !isPlainObject(value.HostConfig.PortBindings)) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
  }
  const portBindings = hasPortBindings ? value.HostConfig.PortBindings : {};

  for (
    const [containerPort, bindings] of Object.entries(portBindings)
  ) {
    const portMatch = /^([1-9]\d{0,4})\/(tcp|udp|sctp)$/u.exec(containerPort);
    if (
      portMatch === null ||
      Number(portMatch[1]) > 65_535 ||
      !Array.isArray(bindings) ||
      bindings.length === 0
    ) {
      fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
    }
    for (const binding of bindings) {
      if (!isPlainObject(binding)) {
        fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
      }
      const keys = Object.keys(binding).sort();
      if (
        !keys.includes("HostPort") ||
        keys.some((key) => key !== "HostIp" && key !== "HostPort") ||
        typeof binding.HostPort !== "string" ||
        !/^[1-9]\d{0,4}$/u.test(binding.HostPort) ||
        Number(binding.HostPort) > 65_535
      ) {
        fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
      }
      if (!Object.hasOwn(binding, "HostIp") || binding.HostIp === "") {
        binding.HostIp = "127.0.0.1";
      } else if (binding.HostIp !== "127.0.0.1") {
        fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
      }
    }
  }

  return serializeCreateRequest({ framing, value });
}

const PROJECT_HELPER_ENVIRONMENT_NAMES = Object.freeze([
  "API_JWT_JWKS",
  "API_JWT_SECRET",
  "APP_NAME",
  "DB_AFTER_CONNECT_QUERY",
  "DB_ENC_KEY",
  "DB_HOST",
  "DB_NAME",
  "DB_PASSWORD",
  "DB_PORT",
  "DB_USER",
  "DNS_NODES",
  "ERL_AFLAGS",
  "MAX_HEADER_LENGTH",
  "METRICS_JWT_SECRET",
  "PORT",
  "RLIMIT_NOFILE",
  "RUN_JANITOR",
  "SECRET_KEY_BASE",
  "SEED_SELF_HOST",
]);

const PROJECT_HELPER_FIXED_VALUE = Object.freeze({
  Hostname: "",
  Domainname: "",
  User: "",
  AttachStdin: false,
  AttachStdout: false,
  AttachStderr: false,
  Tty: false,
  OpenStdin: false,
  StdinOnce: false,
  Cmd: Object.freeze([
    "/app/bin/realtime",
    "eval",
    '{:ok, _} = Application.ensure_all_started(:realtime)\n{:ok, _} = Realtime.Tenants.health_check("realtime-dev")',
  ]),
  Image: "public.ecr.aws/supabase/realtime:v2.112.6",
  Volumes: null,
  WorkingDir: "",
  Entrypoint: null,
  OnBuild: null,
  Labels: Object.freeze({
    "com.docker.compose.project": PROJECT_ID,
    "com.supabase.cli.project": PROJECT_ID,
  }),
  NetworkingConfig: Object.freeze({ EndpointsConfig: null }),
});

const PROJECT_HELPER_HOST_CONFIG = Object.freeze({
  Binds: null,
  ContainerIDFile: "",
  LogConfig: Object.freeze({ Type: "", Config: null }),
  NetworkMode: `supabase_network_${PROJECT_ID}`,
  PortBindings: null,
  RestartPolicy: Object.freeze({ Name: "", MaximumRetryCount: 0 }),
  AutoRemove: false,
  VolumeDriver: "",
  VolumesFrom: null,
  ConsoleSize: Object.freeze([0, 0]),
  CapAdd: null,
  CapDrop: null,
  CgroupnsMode: "",
  Dns: null,
  DnsOptions: null,
  DnsSearch: null,
  ExtraHosts: null,
  GroupAdd: null,
  IpcMode: "",
  Cgroup: "",
  Links: null,
  OomScoreAdj: 0,
  PidMode: "",
  Privileged: false,
  PublishAllPorts: false,
  ReadonlyRootfs: false,
  SecurityOpt: null,
  UTSMode: "",
  UsernsMode: "",
  ShmSize: 0,
  Isolation: "",
  CpuShares: 0,
  Memory: 0,
  NanoCpus: 0,
  CgroupParent: "",
  BlkioWeight: 0,
  BlkioWeightDevice: null,
  BlkioDeviceReadBps: null,
  BlkioDeviceWriteBps: null,
  BlkioDeviceReadIOps: null,
  BlkioDeviceWriteIOps: null,
  CpuPeriod: 0,
  CpuQuota: 0,
  CpuRealtimePeriod: 0,
  CpuRealtimeRuntime: 0,
  CpusetCpus: "",
  CpusetMems: "",
  Devices: null,
  DeviceCgroupRules: null,
  DeviceRequests: null,
  MemoryReservation: 0,
  MemorySwap: 0,
  MemorySwappiness: null,
  OomKillDisable: null,
  PidsLimit: null,
  Ulimits: null,
  CpuCount: 0,
  CpuPercent: 0,
  IOMaximumIOps: 0,
  IOMaximumBandwidth: 0,
  MaskedPaths: null,
  ReadonlyPaths: null,
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${
      Object.keys(value).sort().map((key) =>
        `${JSON.stringify(key)}:${canonicalJson(value[key])}`
      ).join(",")
    }}`;
  }
  return JSON.stringify(value);
}

export function rewriteProjectHelperCreateRequest({ rawHeaders, body }) {
  const { framing, value } = parseCreateRequest({ rawHeaders, body });
  if (!isPlainObject(value)) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
  }
  const exactKeys = [
    ...Object.keys(PROJECT_HELPER_FIXED_VALUE),
    "Env",
    "HostConfig",
  ].sort();
  if (
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(exactKeys) ||
    !Array.isArray(value.Env) ||
    value.Env.length !== PROJECT_HELPER_ENVIRONMENT_NAMES.length ||
    !isPlainObject(value.HostConfig)
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
  }
  const environmentNames = [];
  for (const entry of value.Env) {
    if (
      typeof entry !== "string" ||
      entry.length > 16_384 ||
      /[\0\r\n]/u.test(entry)
    ) {
      fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
    }
    const match = /^([A-Z][A-Z0-9_]*)=/u.exec(entry);
    if (match === null) {
      fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
    }
    environmentNames.push(match[1]);
  }
  if (
    JSON.stringify(environmentNames.sort()) !==
      JSON.stringify(PROJECT_HELPER_ENVIRONMENT_NAMES) ||
    canonicalJson(value.HostConfig) !==
      canonicalJson(PROJECT_HELPER_HOST_CONFIG)
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
  }
  for (const [key, expected] of Object.entries(PROJECT_HELPER_FIXED_VALUE)) {
    if (canonicalJson(value[key]) !== canonicalJson(expected)) {
      fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED");
    }
  }
  return serializeCreateRequest({ framing, value });
}

export function createTaskPipeCapability(
  { randomBytesImpl = randomBytes } = {},
) {
  let bytes;
  try {
    bytes = randomBytesImpl(16);
  } catch {
    fail("A17_DOCKER_LOOPBACK_PROXY_CAPABILITY_REJECTED");
  }
  if (!Buffer.isBuffer(bytes) || bytes.byteLength !== 16) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CAPABILITY_REJECTED");
  }
  const suffix = bytes.toString("hex");
  if (!/^[0-9a-f]{32}$/u.test(suffix)) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CAPABILITY_REJECTED");
  }
  return {
    pipePath: `\\\\.\\pipe\\${PIPE_PREFIX}${suffix}`,
    dockerHost: `npipe:////./pipe/${PIPE_PREFIX}${suffix}`,
  };
}

function sendStableResponse(response, statusCode) {
  if (response.headersSent || response.destroyed) return;
  const body = "A17_DOCKER_LOOPBACK_PROXY_REJECTED";
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-length": String(Buffer.byteLength(body)),
    "content-type": "text/plain; charset=utf-8",
  });
  response.end(body);
}

async function readBoundedCreateBody(request, expectedLength) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.byteLength;
    if (total > MAX_CREATE_BODY_BYTES || total > expectedLength) {
      request.destroy();
      fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED");
    }
    chunks.push(chunk);
  }
  if (total !== expectedLength) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED");
  }
  return Buffer.concat(chunks, total);
}

function trackSocket(set, socket) {
  set.add(socket);
  socket.once("close", () => set.delete(socket));
}

async function assertPipeAbsent(pipePath) {
  await new Promise((resolve, reject) => {
    const socket = connectPipe(pipePath);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("A17_DOCKER_LOOPBACK_PROXY_RUNTIME_REJECTED"));
    }, 1000);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      reject(new Error("A17_DOCKER_LOOPBACK_PROXY_RUNTIME_REJECTED"));
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export async function createDockerLoopbackProxyServer({
  pipePath,
  backendPipe,
  allowedContainerNames,
}) {
  if (
    typeof pipePath !== "string" ||
    !/^\\\\\.\\pipe\\a17-s1ar-(?:loopback|frontend)-[0-9a-f]{32}$/u.test(
      pipePath,
    ) ||
    typeof backendPipe !== "string" ||
    !backendPipe.startsWith("\\\\.\\pipe\\") ||
    !Array.isArray(allowedContainerNames)
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CAPABILITY_REJECTED");
  }
  const frontendSockets = new Set();
  const backendSockets = new Set();
  const server = createHttpServer(async (request, response) => {
    let classification;
    try {
      classification = classifyDockerRequestTarget({
        method: request.method,
        target: request.url,
        allowedContainerNames,
      });
    } catch {
      sendStableResponse(response, 400);
      return;
    }

    const upstreamHeaders = { ...request.headers };
    let body = null;
    if (
      classification.kind === "container-create" ||
      classification.kind === "project-helper-create"
    ) {
      try {
        const framing = validateCreateFraming(request.rawHeaders);
        body = await readBoundedCreateBody(request, framing.contentLength);
        const rewritten = classification.kind === "container-create"
          ? rewriteContainerCreateRequest({
            rawHeaders: request.rawHeaders,
            body,
          })
          : rewriteProjectHelperCreateRequest({
            rawHeaders: request.rawHeaders,
            body,
          });
        body = rewritten.body;
        for (const key of Object.keys(upstreamHeaders)) {
          delete upstreamHeaders[key];
        }
        Object.assign(upstreamHeaders, rewritten.headers);
      } catch {
        sendStableResponse(response, 400);
        return;
      }
    }

    const upstream = httpRequest(
      {
        socketPath: backendPipe,
        method: request.method,
        path: request.url,
        headers: upstreamHeaders,
      },
      (upstreamResponse) => {
        response.writeHead(
          upstreamResponse.statusCode ?? 502,
          upstreamResponse.statusMessage,
          upstreamResponse.headers,
        );
        upstreamResponse.pipe(response);
      },
    );
    upstream.once("socket", (socket) => trackSocket(backendSockets, socket));
    upstream.once("error", () => sendStableResponse(response, 502));
    if (body === null) request.pipe(upstream);
    else upstream.end(body);
  });

  server.on("connection", (socket) => trackSocket(frontendSockets, socket));
  server.on("upgrade", (request, socket, head) => {
    let classification;
    try {
      classification = classifyDockerRequestTarget({
        method: request.method,
        target: request.url,
        allowedContainerNames,
      });
    } catch {
      socket.destroy();
      return;
    }
    if (
      classification.kind === "container-create" ||
      classification.kind === "project-helper-create"
    ) {
      socket.destroy();
      return;
    }
    const backend = connectPipe(backendPipe);
    trackSocket(backendSockets, backend);
    backend.once("connect", () => {
      const requestHead = [
        `${request.method} ${request.url} HTTP/${request.httpVersion}`,
      ];
      for (let index = 0; index < request.rawHeaders.length; index += 2) {
        requestHead.push(
          `${request.rawHeaders[index]}: ${request.rawHeaders[index + 1]}`,
        );
      }
      backend.write(`${requestHead.join("\r\n")}\r\n\r\n`);
      if (head.byteLength > 0) backend.write(head);
      socket.pipe(backend).pipe(socket);
    });
    backend.once("error", () => socket.destroy());
  });

  try {
    await new Promise((resolve, reject) => {
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      const onError = () => {
        server.off("listening", onListening);
        reject(new Error("A17_DOCKER_LOOPBACK_PROXY_LISTEN_REJECTED"));
      };
      server.once("listening", onListening);
      server.once("error", onError);
      server.listen(pipePath);
    });
  } catch {
    if (server.listening) server.close();
    fail("A17_DOCKER_LOOPBACK_PROXY_LISTEN_REJECTED");
  }

  let closed = false;
  return {
    async close() {
      if (closed) return;
      closed = true;
      for (const socket of frontendSockets) socket.destroy();
      for (const socket of backendSockets) socket.destroy();
      if (server.listening) {
        server.close();
        await once(server, "close");
      }
      await assertPipeAbsent(pipePath);
    },
  };
}

function collectChildOutput(stream, onOverflow) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;
    stream.on("data", (chunk) => {
      if (settled) return;
      total += chunk.byteLength;
      if (total > MAX_CHILD_OUTPUT_BYTES) {
        settled = true;
        onOverflow();
        reject(new Error("A17_DOCKER_LOOPBACK_PROXY_OUTPUT_REJECTED"));
        return;
      }
      chunks.push(chunk);
    });
    stream.once("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks, total));
    });
    stream.once("error", () => {
      if (settled) return;
      settled = true;
      reject(new Error("A17_DOCKER_LOOPBACK_PROXY_OUTPUT_REJECTED"));
    });
  });
}

export async function runDockerCliWithLoopbackProxy({
  backendPipe,
  childExecutable,
  childArguments,
  environment,
  allowedContainerNames,
  randomBytesImpl = randomBytes,
  spawnImpl = spawn,
}) {
  if (
    typeof childExecutable !== "string" ||
    !Array.isArray(childArguments) ||
    !isPlainObject(environment) ||
    Object.keys(environment).some(
      (name) =>
        name.toLowerCase() === "docker_host" ||
        typeof environment[name] !== "string",
    )
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CHILD_REJECTED");
  }
  const capability = createTaskPipeCapability({ randomBytesImpl });
  const proxy = await createDockerLoopbackProxyServer({
    pipePath: capability.pipePath,
    backendPipe,
    allowedContainerNames,
  });
  let child;
  try {
    try {
      child = spawnImpl(childExecutable, childArguments, {
        env: { ...environment, DOCKER_HOST: capability.dockerHost },
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch {
      fail("A17_DOCKER_LOOPBACK_PROXY_CHILD_REJECTED");
    }
    if (
      child === null ||
      typeof child !== "object" ||
      child.stdout === null ||
      child.stderr === null
    ) {
      fail("A17_DOCKER_LOOPBACK_PROXY_CHILD_REJECTED");
    }
    const stopChild = () => {
      try {
        child.kill();
      } catch {
        // The outer PowerShell process-tree deadline remains authoritative.
      }
    };
    const stdoutPromise = collectChildOutput(child.stdout, stopChild);
    const stderrPromise = collectChildOutput(child.stderr, stopChild);
    const childResultPromise = new Promise((resolve, reject) => {
      child.once(
        "error",
        () => reject(new Error("A17_DOCKER_LOOPBACK_PROXY_CHILD_REJECTED")),
      );
      child.once("close", (exitCode, signal) => {
        if (!Number.isInteger(exitCode) || signal !== null) {
          reject(new Error("A17_DOCKER_LOOPBACK_PROXY_CHILD_REJECTED"));
          return;
        }
        resolve(exitCode);
      });
    });
    const [childResult, stdoutResult, stderrResult] = await Promise.allSettled([
      childResultPromise,
      stdoutPromise,
      stderrPromise,
    ]);
    if (
      stdoutResult.status === "rejected" || stderrResult.status === "rejected"
    ) {
      fail("A17_DOCKER_LOOPBACK_PROXY_OUTPUT_REJECTED");
    }
    if (childResult.status === "rejected") {
      fail("A17_DOCKER_LOOPBACK_PROXY_CHILD_REJECTED");
    }
    const stdoutBytes = stdoutResult.value;
    const stderrBytes = stderrResult.value;
    const stdout = stdoutBytes.toString("utf8");
    const stderr = stderrBytes.toString("utf8");
    const suffix = capability.dockerHost.slice(-32);
    for (const output of [stdout, stderr]) {
      if (
        output.includes(capability.pipePath) ||
        output.includes(capability.dockerHost) ||
        output.includes(suffix)
      ) {
        fail("A17_DOCKER_LOOPBACK_PROXY_OUTPUT_REJECTED");
      }
    }
    return { exitCode: childResult.value, stdout, stderr };
  } finally {
    await proxy.close();
  }
}

function exactAllowedContainerNames(projectId) {
  return ["auth", "db", "kong", "rest"].map(
    (name) => `supabase_${name}_${projectId}`,
  );
}

function parseMainArguments(arguments_) {
  if (
    arguments_.length < 6 ||
    arguments_[0] !== "--supabase-executable" ||
    arguments_[1] !== SUPABASE_EXECUTABLE ||
    arguments_[2] !== "--project-id" ||
    arguments_[3] !== PROJECT_ID ||
    arguments_[4] !== "--"
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CHILD_REJECTED");
  }
  return arguments_.slice(5);
}

function assertMainEnvironment(environment) {
  const keys = Object.keys(environment).sort();
  if (
    JSON.stringify(keys) !==
      JSON.stringify([
        "DO_NOT_TRACK",
        "SUPABASE_TELEMETRY_DISABLED",
        "SystemRoot",
      ]) ||
    environment.DO_NOT_TRACK !== "1" ||
    environment.SUPABASE_TELEMETRY_DISABLED !== "1" ||
    environment.SystemRoot !== String.raw`C:\WINDOWS`
  ) {
    fail("A17_DOCKER_LOOPBACK_PROXY_CHILD_REJECTED");
  }
}

async function main() {
  const childArguments = parseMainArguments(process.argv.slice(2));
  const mainEnvironment = { ...process.env };
  assertMainEnvironment(mainEnvironment);
  const result = await runDockerCliWithLoopbackProxy({
    backendPipe: BACKEND_PIPE,
    childExecutable: SUPABASE_EXECUTABLE,
    childArguments,
    environment: mainEnvironment,
    allowedContainerNames: exactAllowedContainerNames(PROJECT_ID),
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}

if (
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch (error) {
    const code = error instanceof Error && STABLE_CODES.has(error.message)
      ? error.message
      : "A17_DOCKER_LOOPBACK_PROXY_RUNTIME_REJECTED";
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  }
}

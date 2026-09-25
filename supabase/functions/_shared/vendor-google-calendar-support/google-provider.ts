import { isRecord, VENDOR_CALENDAR_GOOGLE_SCOPES } from "./contracts.ts";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const GOOGLE_SCOPES = VENDOR_CALENDAR_GOOGLE_SCOPES;
export type CalendarProviderFailureState =
  | "provider_unavailable"
  | "incomplete"
  | "scope_not_supported"
  | "reconnect_required"
  | "not_found"
  | "revision_conflict";
type ProviderResult<T> = ({ ok: true } & T) | {
  ok: false;
  state: CalendarProviderFailureState;
};
type CalendarSelection = Readonly<
  {
    selectionRef: string;
    calendarId: string;
    shareMode: "busy_only" | "title_time";
  }
>;
export type CalendarReadEvent = Readonly<
  {
    providerEventId: string;
    selectionRef: string;
    allDay: boolean;
    start: string;
    end: string;
    title?: string;
  }
>;
export type CalendarCredential = Readonly<
  {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    scopes: string[];
  }
>;

class ProviderBoundaryError extends Error {
  readonly state: CalendarProviderFailureState;
  constructor(state: CalendarProviderFailureState) {
    super(state);
    this.state = state;
  }
}

function exactCalendarScopes(value: unknown): value is string[] {
  return Array.isArray(value) && value.length === GOOGLE_SCOPES.length &&
    new Set(value).size === GOOGLE_SCOPES.length &&
    value.every((scope) => GOOGLE_SCOPES.includes(scope));
}

function boundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length <= maximum && !/\p{C}/u.test(value);
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
}

function taipeiTime(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u
      .test(value)
  ) return null;
  if (
    !validDate(value.slice(0, 10)) || Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59
  ) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed + 8 * 3600000).toISOString().replace(
    /\.000Z$/u,
    "+08:00",
  ).replace(/Z$/u, "+08:00");
}

function projectReadEvent(
  value: unknown,
  selection: CalendarSelection,
): CalendarReadEvent | null {
  if (!isRecord(value)) throw new ProviderBoundaryError("incomplete");
  if (value.status === "cancelled" || value.transparency === "transparent") {
    return null;
  }
  if (
    !boundedString(value.id, 2048) || !isRecord(value.start) ||
    !isRecord(value.end)
  ) throw new ProviderBoundaryError("incomplete");
  let start: string, end: string, allDay: boolean;
  if (Object.hasOwn(value.start, "date") || Object.hasOwn(value.end, "date")) {
    if (
      !validDate(value.start.date) || !validDate(value.end.date) ||
      value.end.date <= value.start.date ||
      Object.hasOwn(value.start, "dateTime") ||
      Object.hasOwn(value.end, "dateTime")
    ) throw new ProviderBoundaryError("incomplete");
    start = value.start.date;
    end = value.end.date;
    allDay = true;
  } else {
    const from = taipeiTime(value.start.dateTime),
      to = taipeiTime(value.end.dateTime);
    if (!from || !to || Date.parse(to) <= Date.parse(from)) {
      throw new ProviderBoundaryError("incomplete");
    }
    start = from;
    end = to;
    allDay = false;
  }
  const event: CalendarReadEvent = {
    providerEventId: value.id,
    selectionRef: selection.selectionRef,
    allDay,
    start,
    end,
  };
  if (selection.shareMode === "title_time") {
    if (
      value.summary !== undefined &&
      (typeof value.summary !== "string" || value.summary.length > 200 ||
        /\p{C}/u.test(value.summary))
    ) throw new ProviderBoundaryError("incomplete");
    return { ...event, title: value.summary ?? "" };
  }
  return event;
}

export async function sealCalendarV2(
  value: unknown,
  encodedKey: string,
  binding: Readonly<Record<string, unknown>>,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: textEncoder.encode(JSON.stringify(binding)),
    },
    await encryptionKey(encodedKey),
    textEncoder.encode(JSON.stringify(value)),
  );
  return `v2.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function unsealCalendarV2<T = unknown>(
  envelope: string,
  encodedKey: string,
  binding: Readonly<Record<string, unknown>>,
): Promise<T> {
  const [version, iv, ciphertext, extra] = envelope.split(".");
  if (version !== "v2" || !iv || !ciphertext || extra !== undefined) {
    throw new Error("Invalid envelope");
  }
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(fromBase64Url(iv)),
      additionalData: textEncoder.encode(JSON.stringify(binding)),
    },
    await encryptionKey(encodedKey),
    toArrayBuffer(fromBase64Url(ciphertext)),
  );
  return JSON.parse(textDecoder.decode(plaintext)) as T;
}

export async function calendarEventReference(
  encodedKey: string,
  bindingRef: string,
  selectionRef: string,
  providerId: string,
  occurrenceStart: string,
): Promise<string> {
  const keyBytes = fromBase64Url(encodedKey);
  if (keyBytes.length !== 32) throw new Error("Invalid key");
  const material = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    "HKDF",
    false,
    ["deriveKey"],
  );
  const subkey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: textEncoder.encode("laibe.calendar.v2"),
      info: textEncoder.encode("event-reference"),
    },
    material,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    subkey,
    textEncoder.encode(
      JSON.stringify([bindingRef, selectionRef, providerId, occurrenceStart]),
    ),
  );
  return toBase64Url(new Uint8Array(signature));
}

export function createGoogleCalendarProvider(config: ProviderConfig) {
  const request = config.fetch ?? globalThis.fetch;
  const now = config.now ?? Date.now;
  type Budget = {
    controller: AbortController;
    timer: ReturnType<typeof setTimeout>;
    remainingBytes: number;
    items: number;
  };
  function budget(bytes: number, milliseconds: number): Budget {
    const controller = new AbortController();
    return {
      controller,
      timer: setTimeout(() => controller.abort(), milliseconds),
      remainingBytes: bytes,
      items: 0,
    };
  }
  async function readJson(
    url: string | URL,
    init: RequestInit,
    limit: Budget,
  ): Promise<Record<string, unknown>> {
    if (limit.controller.signal.aborted) {
      throw new ProviderBoundaryError("incomplete");
    }
    const response = await request(url, {
      ...init,
      redirect: "error",
      signal: limit.controller.signal,
    });
    const tokenError = String(url) === "https://oauth2.googleapis.com/token" &&
      response.status === 400;
    if (!response.ok && !tokenError) {
      await response.body?.cancel();
      throw new ProviderBoundaryError(
        response.status === 401
          ? "reconnect_required"
          : response.status === 404
          ? "not_found"
          : response.status === 409 || response.status === 412
          ? "revision_conflict"
          : "provider_unavailable",
      );
    }
    if (
      !response.body ||
      !/^application\/json(?:\s*;|$)/iu.test(
        response.headers.get("content-type") ?? "",
      )
    ) throw new ProviderBoundaryError("provider_unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        total += next.value.byteLength;
        limit.remainingBytes -= next.value.byteLength;
        if (limit.remainingBytes < 0) {
          limit.controller.abort();
          await reader.cancel();
          throw new ProviderBoundaryError("incomplete");
        }
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!isRecord(value)) {
      throw new ProviderBoundaryError("provider_unavailable");
    }
    if (tokenError) {
      throw new ProviderBoundaryError(
        value.error === "invalid_grant"
          ? "reconnect_required"
          : "provider_unavailable",
      );
    }
    return value;
  }
  async function operation<T extends object>(
    bytes: number,
    milliseconds: number,
    action: (limit: Budget) => Promise<T>,
  ): Promise<ProviderResult<T>> {
    const limit = budget(bytes, milliseconds);
    try {
      return { ok: true, ...await action(limit) };
    } catch (error) {
      return {
        ok: false,
        state: error instanceof ProviderBoundaryError
          ? error.state
          : limit.controller.signal.aborted
          ? "incomplete"
          : "provider_unavailable",
      };
    } finally {
      clearTimeout(limit.timer);
      limit.controller.abort();
    }
  }
  function createAuthorizationUrl(
    material: { state: string; codeChallenge: string },
  ): string {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    for (
      const [key, value] of Object.entries({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: "code",
        scope: GOOGLE_SCOPES.join(" "),
        access_type: "offline",
        state: material.state,
        code_challenge: material.codeChallenge,
        code_challenge_method: "S256",
        prompt: "consent",
      })
    ) url.searchParams.set(key, value);
    return url.toString();
  }
  async function token(
    body: URLSearchParams,
    knownScopes?: readonly string[],
    existingRefreshToken = "",
  ): Promise<ProviderResult<{ credential: CalendarCredential }>> {
    return await operation(32768, 8000, async (limit) => {
      const value = await readJson("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }, limit);
      const scopes = typeof value.scope === "string"
        ? value.scope.split(/\s+/u).filter(Boolean)
        : knownScopes;
      if (!exactCalendarScopes(scopes)) {
        throw new ProviderBoundaryError("scope_not_supported");
      }
      if (
        !boundedString(value.access_token, 16384) ||
        typeof value.expires_in !== "number" ||
        !Number.isFinite(value.expires_in) || value.expires_in <= 0 ||
        value.expires_in > 86400 ||
        (value.refresh_token !== undefined &&
          !boundedString(value.refresh_token, 16384))
      ) throw new ProviderBoundaryError("provider_unavailable");
      return {
        credential: {
          accessToken: value.access_token,
          refreshToken: value.refresh_token ?? existingRefreshToken,
          expiresAt: new Date(now() + value.expires_in * 1000).toISOString(),
          scopes: [...scopes],
        },
      };
    });
  }
  function exchangeAuthorizationCode(
    input: { code: string; codeVerifier: string },
  ) {
    return token(
      new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: input.code,
        code_verifier: input.codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    );
  }
  function refreshAccessToken(
    refreshToken: string,
    knownScopes: readonly string[],
  ) {
    return token(
      new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      knownScopes,
      refreshToken,
    );
  }
  function resolveSubject(accessToken: string) {
    return operation(16384, 8000, async (limit) => {
      const value = await readJson(
        "https://openidconnect.googleapis.com/v1/userinfo",
        { headers: { authorization: `Bearer ${accessToken}` } },
        limit,
      );
      if (!boundedString(value.sub, 255)) {
        throw new ProviderBoundaryError("provider_unavailable");
      }
      return { googleSubject: value.sub };
    });
  }
  function listOwnedCalendars(accessToken: string) {
    return operation(524288, 8000, async (limit) => {
      const calendars: {
        calendarId: string;
        label: string;
        timeZone: string;
      }[] = [];
      const ids = new Set<string>(), tokens = new Set<string>();
      let pageToken = "";
      for (let page = 0; page < 3; page++) {
        const url = new URL(
          "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        );
        for (
          const [key, value] of Object.entries({
            minAccessRole: "owner",
            showHidden: "false",
            maxResults: "100",
            fields: "nextPageToken,items(id,summary,timeZone,accessRole)",
          })
        ) url.searchParams.set(key, value);
        if (pageToken) url.searchParams.set("pageToken", pageToken);
        const value = await readJson(url, {
          headers: { authorization: `Bearer ${accessToken}` },
        }, limit);
        if (!Array.isArray(value.items)) {
          throw new ProviderBoundaryError("incomplete");
        }
        limit.items += value.items.length;
        if (limit.items > 250) throw new ProviderBoundaryError("incomplete");
        for (const item of value.items) {
          if (!isRecord(item)) throw new ProviderBoundaryError("incomplete");
          if (item.accessRole !== "owner") continue;
          if (
            !boundedString(item.id, 1024) ||
            !boundedString(item.summary, 200) ||
            !boundedString(item.timeZone, 100)
          ) throw new ProviderBoundaryError("incomplete");
          try {
            new Intl.DateTimeFormat("en", { timeZone: item.timeZone });
          } catch {
            throw new ProviderBoundaryError("incomplete");
          }
          if (!ids.has(item.id)) {
            ids.add(item.id);
            calendars.push({
              calendarId: item.id,
              label: item.summary,
              timeZone: item.timeZone,
            });
          }
        }
        if (!value.nextPageToken) return { calendars };
        if (
          !boundedString(value.nextPageToken, 2048) ||
          tokens.has(value.nextPageToken)
        ) throw new ProviderBoundaryError("incomplete");
        pageToken = value.nextPageToken;
        tokens.add(pageToken);
      }
      throw new ProviderBoundaryError("incomplete");
    });
  }
  function readSelectedEvents(
    input: {
      accessToken: string;
      selections: readonly CalendarSelection[];
      timeMin: string;
      timeMax: string;
    },
  ) {
    return operation(1048576, 12000, async (limit) => {
      const from = taipeiTime(input.timeMin), to = taipeiTime(input.timeMax);
      if (
        !from || !to || Date.parse(to) <= Date.parse(from) ||
        Date.parse(to) - Date.parse(from) > 31 * 86400000 ||
        input.selections.length < 1 || input.selections.length > 8 ||
        new Set(input.selections.map((s) => s.selectionRef)).size !==
          input.selections.length ||
        input.selections.some((s) =>
          !boundedString(s.calendarId, 1024) ||
          !boundedString(s.selectionRef, 128) ||
          !["busy_only", "title_time"].includes(s.shareMode)
        )
      ) throw new ProviderBoundaryError("incomplete");
      const results: CalendarReadEvent[][] = new Array(input.selections.length);
      let index = 0;
      async function worker() {
        while (index < input.selections.length) {
          const selectedIndex = index++,
            selection = input.selections[selectedIndex];
          const events: CalendarReadEvent[] = [];
          let pageToken = "", count = 0, completed = false;
          const tokens = new Set<string>();
          for (let page = 0; page < 4; page++) {
            const url = new URL(
              `https://www.googleapis.com/calendar/v3/calendars/${
                encodeURIComponent(selection.calendarId)
              }/events`,
            );
            for (
              const [key, value] of Object.entries({
                timeMin: input.timeMin,
                timeMax: input.timeMax,
                timeZone: "Asia/Taipei",
                singleEvents: "true",
                orderBy: "startTime",
                maxResults: "250",
                fields: `nextPageToken,items(id,status,transparency,start,end${
                  selection.shareMode === "title_time" ? ",summary" : ""
                })`,
              })
            ) url.searchParams.set(key, value);
            if (pageToken) url.searchParams.set("pageToken", pageToken);
            const value = await readJson(url, {
              headers: { authorization: `Bearer ${input.accessToken}` },
            }, limit);
            if (!Array.isArray(value.items)) {
              throw new ProviderBoundaryError("incomplete");
            }
            count += value.items.length;
            limit.items += value.items.length;
            if (count > 1000 || limit.items > 2000) {
              throw new ProviderBoundaryError("incomplete");
            }
            for (const item of value.items) {
              const event = projectReadEvent(item, selection);
              if (event) events.push(event);
            }
            if (!value.nextPageToken) {
              completed = true;
              break;
            }
            if (
              !boundedString(value.nextPageToken, 2048) ||
              tokens.has(value.nextPageToken)
            ) throw new ProviderBoundaryError("incomplete");
            pageToken = value.nextPageToken;
            tokens.add(pageToken);
          }
          if (!completed) throw new ProviderBoundaryError("incomplete");
          results[selectedIndex] = events;
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(2, input.selections.length) }, worker),
      );
      return { events: results.flat() };
    });
  }
  function shareCalendarWithRecipients(input: {
    accessToken: string;
    calendarId: string;
    recipients: readonly string[];
    accessLevel: "busy_only" | "calendar_details";
    beforeWrite(): Promise<void>;
  }) {
    return operation(262144, 12000, async (limit) => {
      if (!["busy_only", "calendar_details"].includes(input.accessLevel)) {
        throw new ProviderBoundaryError("scope_not_supported");
      }
      if (
        !boundedString(input.calendarId, 1024) ||
        !Array.isArray(input.recipients) || input.recipients.length !== 2 ||
        new Set(input.recipients).size !== 2 || input.recipients.some((x) =>
          !boundedString(x, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(x)
        ) ||
        typeof input.beforeWrite !== "function"
      ) {
        throw new ProviderBoundaryError("incomplete");
      }
      const base = `https://www.googleapis.com/calendar/v3/calendars/${
        encodeURIComponent(input.calendarId)
      }/acl`;
      const headers = {
        authorization: `Bearer ${input.accessToken}`,
        "content-type": "application/json",
      };
      const wanted = input.accessLevel === "busy_only"
        ? "freeBusyReader"
        : "reader";
      const roles = [
        "none",
        "freeBusyReader",
        "reader",
        "writerWithoutPrivateAccess",
        "writer",
        "owner",
      ];
      const rules: Record<string, unknown>[] = [], pages = new Set<string>();
      let pageToken = "";
      for (let page = 0; page < 3; page++) {
        const url = new URL(base);
        url.searchParams.set("maxResults", "100");
        url.searchParams.set(
          "fields",
          "nextPageToken,items(id,etag,role,scope)",
        );
        if (pageToken) {
          url.searchParams.set("pageToken", pageToken);
        }
        const listed = await readJson(url, { headers }, limit);
        if (
          !Array.isArray(listed.items) || listed.items.some((x) =>
            !isRecord(x)
          )
        ) throw new ProviderBoundaryError("incomplete");
        rules.push(...listed.items as Record<string, unknown>[]);
        if (rules.length > 250) throw new ProviderBoundaryError("incomplete");
        if (!listed.nextPageToken) break;
        if (
          page === 2 || !boundedString(listed.nextPageToken, 2048) ||
          pages.has(listed.nextPageToken)
        ) throw new ProviderBoundaryError("incomplete");
        pageToken = listed.nextPageToken;
        pages.add(pageToken);
      }
      const receipts: {
        recipient: string;
        ruleId: string;
        etag: string;
        role: string;
        preservedHigherAccess: boolean;
      }[] = [];
      for (const recipient of input.recipients) {
        const matching = rules.filter((x) =>
          isRecord(x.scope) && x.scope.type === "user" &&
          x.scope.value === recipient
        );
        if (matching.length > 1) throw new ProviderBoundaryError("incomplete");
        let rule = matching[0];
        if (
          rule &&
          (!boundedString(rule.id, 2048) || !boundedString(rule.etag, 512) ||
            !roles.includes(String(rule.role)))
        ) {
          throw new ProviderBoundaryError("revision_conflict");
        }
        // Connecting this case must not remove access already granted in Google Calendar.
        const effectiveRole =
          rule && roles.indexOf(String(rule.role)) >= roles.indexOf(wanted)
            ? String(rule.role)
            : wanted;
        if (!rule || rule.role !== effectiveRole) {
          await input.beforeWrite();
          const url = new URL(
            rule ? `${base}/${encodeURIComponent(rule.id as string)}` : base,
          );
          url.searchParams.set("sendNotifications", "false");
          rule = await readJson(url, {
            method: rule ? "PUT" : "POST",
            headers: rule
              ? { ...headers, "if-match": rule.etag as string }
              : headers,
            body: JSON.stringify({
              role: wanted,
              scope: { type: "user", value: recipient },
            }),
          }, limit);
        }
        if (!boundedString(rule.id, 2048)) {
          throw new ProviderBoundaryError("incomplete");
        }
        const verified = await readJson(
          `${base}/${encodeURIComponent(rule.id)}`,
          { headers },
          limit,
        );
        if (
          verified.id !== rule.id || !boundedString(verified.etag, 512) ||
          verified.role !== effectiveRole ||
          !isRecord(verified.scope) || verified.scope.type !== "user" ||
          verified.scope.value !== recipient
        ) throw new ProviderBoundaryError("revision_conflict");
        receipts.push({
          recipient,
          ruleId: rule.id,
          etag: verified.etag,
          role: effectiveRole,
          preservedHigherAccess: effectiveRole !== wanted,
        });
      }
      return { receipts };
    });
  }
  function upsertAcceptanceEvent(input: {
    accessToken: string;
    calendarId: string;
    providerEventId: string;
    eventRef: string;
    operationRef: string;
    contentDigest: string;
    title: string;
    description?: string;
    start: string;
    end: string;
    mode: "create" | "update";
    expectedEtag?: string;
    beforeWrite(): Promise<void>;
  }) {
    return operation(131072, 12000, async (limit) => {
      const start = taipeiTime(input.start), end = taipeiTime(input.end);
      if (
        !boundedString(input.calendarId, 1024) ||
        !/^[a-v0-9]{5,1024}$/u.test(input.providerEventId) ||
        !boundedString(input.eventRef, 128) ||
        !boundedString(input.operationRef, 128) ||
        !/^[a-f0-9]{64}$/u.test(input.contentDigest) ||
        !boundedString(input.title, 200) ||
        (input.description !== undefined &&
          !boundedString(input.description, 1000)) ||
        !start || !end || Date.parse(end) <= Date.parse(start) ||
        Date.parse(end) - Date.parse(start) > 86400000 ||
        !["create", "update"].includes(input.mode) ||
        typeof input.beforeWrite !== "function"
      ) throw new ProviderBoundaryError("incomplete");
      const base = `https://www.googleapis.com/calendar/v3/calendars/${
        encodeURIComponent(input.calendarId)
      }/events`;
      const url = `${base}/${encodeURIComponent(input.providerEventId)}`;
      const headers = {
        authorization: `Bearer ${input.accessToken}`,
        "content-type": "application/json",
      };
      let existing: Record<string, unknown> | null = null;
      try {
        existing = await readJson(url, { headers }, limit);
      } catch (error) {
        if (
          !(error instanceof ProviderBoundaryError) ||
          error.state !== "not_found"
        ) throw error;
      }
      function matches(value: Record<string, unknown>) {
        const tags = isRecord(value.extendedProperties) &&
            isRecord(value.extendedProperties.private)
          ? value.extendedProperties.private
          : null;
        return value.id === input.providerEventId &&
          value.status === "confirmed" &&
          tags?.laibeEventRef === input.eventRef &&
          tags?.laibeOperation === input.operationRef &&
          tags?.laibeContentDigest === input.contentDigest &&
          value.summary === input.title &&
          (input.description === undefined ||
            value.description === input.description) &&
          isRecord(value.start) && isRecord(value.end) &&
          taipeiTime(value.start.dateTime) === start &&
          taipeiTime(value.end.dateTime) === end;
      }
      const tags = existing && isRecord(existing.extendedProperties) &&
          isRecord(existing.extendedProperties.private)
        ? existing.extendedProperties.private
        : null;
      if (
        existing &&
        (existing.id !== input.providerEventId ||
          existing.status !== "confirmed" ||
          tags?.laibeEventRef !== input.eventRef ||
          !boundedString(existing.etag, 512) ||
          existing.recurrence !== undefined ||
          (existing.eventType !== undefined &&
            existing.eventType !== "default"))
      ) {
        throw new ProviderBoundaryError("revision_conflict");
      }
      if (!existing || !matches(existing)) {
        if (
          (input.mode === "create" && existing) ||
          (input.mode === "update" &&
            (!existing || !input.expectedEtag ||
              existing.etag !== input.expectedEtag))
        ) {
          throw new ProviderBoundaryError("revision_conflict");
        }
        await input.beforeWrite();
        const body = {
          ...(existing ? {} : { id: input.providerEventId }),
          summary: input.title,
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          start: { dateTime: start, timeZone: "Asia/Taipei" },
          end: { dateTime: end, timeZone: "Asia/Taipei" },
          extendedProperties: {
            private: {
              ...(tags ?? {}),
              laibeEventRef: input.eventRef,
              laibeOperation: input.operationRef,
              laibeContentDigest: input.contentDigest,
            },
          },
        };
        await readJson(existing ? url : base, {
          method: existing ? "PATCH" : "POST",
          headers: existing
            ? { ...headers, "if-match": existing.etag as string }
            : headers,
          body: JSON.stringify(body),
        }, limit);
        existing = await readJson(url, { headers }, limit);
      }
      if (!matches(existing) || !boundedString(existing.etag, 512)) {
        throw new ProviderBoundaryError("revision_conflict");
      }
      return {
        event: {
          providerEventId: input.providerEventId,
          etag: existing.etag,
          status: "confirmed" as const,
          eventRef: input.eventRef,
          operationRef: input.operationRef,
          contentDigest: input.contentDigest,
        },
      };
    });
  }
  return {
    createAuthorizationUrl,
    exchangeAuthorizationCode,
    refreshAccessToken,
    resolveSubject,
    listOwnedCalendars,
    readSelectedEvents,
    shareCalendarWithRecipients,
    upsertAcceptanceEvent,
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(
    /=+$/gu,
    "",
  );
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/gu, "+").replace(/_/gu, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(value),
  );
  return toBase64Url(new Uint8Array(digest));
}

export async function digestVendorCalendarOAuthState(
  value: string,
): Promise<string> {
  return await sha256(value);
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

function equalText(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function issueVendorCalendarOAuthMaterial(
  options: { nowMs?: number; lifetimeMs?: number } = {},
) {
  const nowMs = options.nowMs ?? Date.now();
  const state = randomBase64Url(48);
  const codeVerifier = randomBase64Url(64);
  return {
    state,
    stateDigest: await sha256(state),
    codeVerifier,
    codeChallenge: await sha256(codeVerifier),
    expiresAt: new Date(nowMs + (options.lifetimeMs ?? 10 * 60 * 1000))
      .toISOString(),
  };
}

export async function validateVendorCalendarOAuthPending(
  rawState: string,
  pending: {
    stateDigest?: string;
    expiresAt?: string;
    consumedAt?: string | null;
  } | null,
  nowMs = Date.now(),
): Promise<boolean> {
  if (
    !pending || rawState.length < 40 || !pending.stateDigest ||
    !pending.expiresAt
  ) {
    return false;
  }
  if (pending.consumedAt || Date.parse(pending.expiresAt) <= nowMs) {
    return false;
  }
  const actualDigest = await sha256(rawState);
  return equalText(actualDigest, pending.stateDigest);
}

async function encryptionKey(encodedKey: string): Promise<CryptoKey> {
  const rawKey = fromBase64Url(encodedKey);
  if (rawKey.byteLength !== 32) throw new Error("invalid encryption key");
  return await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(rawKey),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptVendorCalendarEnvelope(
  value: unknown,
  encodedKey: string,
): Promise<string> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(encodedKey),
    textEncoder.encode(JSON.stringify(value)),
  );
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptVendorCalendarEnvelope<T = unknown>(
  envelope: string,
  encodedKey: string,
): Promise<T> {
  const [version, ivValue, ciphertextValue, extra] = envelope.split(".");
  if (version !== "v1" || !ivValue || !ciphertextValue || extra) {
    throw new Error("invalid encrypted envelope");
  }
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(toArrayBuffer(fromBase64Url(ivValue))),
    },
    await encryptionKey(encodedKey),
    toArrayBuffer(fromBase64Url(ciphertextValue)),
  );
  return JSON.parse(textDecoder.decode(plaintext)) as T;
}

type ProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetch?: typeof fetch;
  now?: () => number;
};

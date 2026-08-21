import {
  type AttachmentRecord,
  type AttachmentTransportResolver,
  buildLinePushRequest,
  computeFinalSnapshotSha256,
  createDeterministicAdvisoryPort,
  createMemoryDrsLineStore,
  createPublicSafeText,
  type FinalAttachmentRef,
  finalizeDrsGroupSend,
  type ReceiptRecord,
  reviewDrsOutboundContent,
  signLineBody,
} from "../../src/lib/drs-linebot/w1.ts";
import {
  createOpenAiResponsesAdvisoryPort,
  type DrsRuntimeRepository,
  finalizeSpecialistGroupSendRuntime,
  handleLineWebhookRuntime,
  pushFinalMessageRuntime,
  type RuntimeFetch,
  type RuntimeLineContentClient,
} from "../../src/lib/drs-linebot/runtime/mod.ts";

function assert(
  condition: boolean,
  message = "Assertion failed",
): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message ?? `Expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

async function assertRejectsAsync(
  fn: () => Promise<unknown>,
  messageIncludes: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(
      message.includes(messageIncludes),
      `Expected rejection containing ${messageIncludes}, got ${message}`,
    );
    return;
  }
  throw new Error(`Expected rejection containing ${messageIncludes}`);
}

function createSequentialUuidFactory(): () => string {
  let next = 1;
  return () => {
    const suffix = String(next++).padStart(12, "0");
    return `00000000-0000-4000-8000-${suffix}`;
  };
}

async function signedWebhook(input: {
  secret: string;
  destination: string;
  events: readonly unknown[];
}): Promise<{ rawBody: string; signature: string }> {
  const rawBody = JSON.stringify({
    destination: input.destination,
    events: input.events,
  });
  return {
    rawBody,
    signature: await signLineBody(input.secret, rawBody),
  };
}

function groupTextEvent(overrides: Record<string, unknown> = {}): unknown {
  return {
    type: "message",
    mode: "active",
    timestamp: Date.parse("2026-08-21T10:00:00.000Z"),
    webhookEventId: "w2-event-1",
    deliveryContext: { isRedelivery: false },
    source: { type: "group", groupId: "CdrsGroup", userId: "Uowner" },
    message: { id: "line-msg-1", type: "text", text: "這是業主已送出的原文" },
    ...overrides,
  };
}

class FakeRuntimeRepository implements DrsRuntimeRepository {
  readonly claims: unknown[] = [];
  readonly recorded: unknown[] = [];
  readonly attachments: unknown[] = [];
  readonly transportResults: unknown[] = [];
  readonly releases: unknown[] = [];
  readonly commits: unknown[] = [];
  readonly activeClaims = new Map<
    string,
    { token: string; fingerprint: string }
  >();
  readonly committedClaims = new Map<string, string>();
  linked = true;
  resolvedLineGroupId = "CdrsGroup";
  duplicate = false;
  collision = false;
  sendable = true;
  failNextRecord = false;
  failNextCommitInRecord = false;
  leaseExpiresAt = "2026-08-21T10:01:00.000Z";
  nextLease = 1;

  claimLineEventForProcessing(
    input: Parameters<DrsRuntimeRepository["claimLineEventForProcessing"]>[0],
  ) {
    this.claims.push(input);
    const key =
      `${input.provider}:${input.providerChannelId}:${input.providerEventId}`;
    const committed = this.committedClaims.get(key);
    if (committed) {
      return Promise.resolve({
        status: committed === input.fingerprintSha256
          ? "duplicate" as const
          : "collision" as const,
      });
    }
    if (this.collision) {
      return Promise.resolve({ status: "collision" as const });
    }
    if (this.duplicate) {
      return Promise.resolve({ status: "duplicate" as const });
    }
    if (this.activeClaims.has(key)) {
      return Promise.resolve({ status: "busy" as const });
    }
    const token = `lease-${this.nextLease++}`;
    this.activeClaims.set(key, { token, fingerprint: input.fingerprintSha256 });
    return Promise.resolve({
      status: "claimed" as const,
      leaseToken: token,
      leaseExpiresAt: this.leaseExpiresAt,
    });
  }

  commitLineEventClaim(
    input: Parameters<DrsRuntimeRepository["commitLineEventClaim"]>[0],
  ) {
    this.commits.push(input);
    const key =
      `${input.provider}:${input.providerChannelId}:${input.providerEventId}`;
    const active = this.activeClaims.get(key);
    if (!active || active.token !== input.leaseToken) {
      return Promise.reject(new Error("claim_lease_conflict"));
    }
    this.committedClaims.set(key, input.fingerprintSha256);
    this.activeClaims.delete(key);
    return Promise.resolve();
  }

  releaseLineEventClaim(
    input: Parameters<DrsRuntimeRepository["releaseLineEventClaim"]>[0],
  ) {
    this.releases.push(input);
    for (const [key, active] of this.activeClaims.entries()) {
      if (active.token === input.leaseToken) {
        this.activeClaims.delete(key);
      }
    }
    return Promise.resolve();
  }

  resolveFormalLinkedGroupForInbound() {
    if (!this.linked) return Promise.resolve(undefined);
    return Promise.resolve({
      formalLinkId: "formal-link-1",
      caseId: "00000000-0000-4000-8000-000000000201",
      linkedGroupId: "00000000-0000-4000-8000-000000000202",
      lineGroupId: this.resolvedLineGroupId,
      groupType: "OWNER_DRS_PRIVATE" as const,
      actorType: "OWNER" as const,
    });
  }

  recordInboundSentMessage(
    input: Parameters<DrsRuntimeRepository["recordInboundSentMessage"]>[0],
  ) {
    if (input.claimLeaseToken === undefined) {
      return Promise.reject(new Error("missing_claim_lease_context"));
    }
    if (Date.parse(input.claimLeaseExpiresAt) <= Date.parse(input.receivedAt)) {
      return Promise.reject(new Error("claim_lease_expired"));
    }
    const key =
      `${input.provider}:${input.providerChannelId}:${input.providerEventId}`;
    const active = this.activeClaims.get(key);
    if (!active || active.token !== input.claimLeaseToken) {
      return Promise.reject(new Error("claim_lease_conflict_before_record"));
    }
    if (this.failNextRecord) {
      this.failNextRecord = false;
      return Promise.reject(new Error("record_failed_once"));
    }
    if (this.failNextCommitInRecord) {
      this.failNextCommitInRecord = false;
      return Promise.reject(new Error("commit_failed_before_record_visible"));
    }
    this.recorded.push(input);
    this.commits.push({
      provider: input.provider,
      providerChannelId: input.providerChannelId,
      providerEventId: input.providerEventId,
      providerMessageId: input.providerMessageId,
      lineGroupId: input.lineGroupId,
      lineSenderUserId: input.lineSenderUserId,
      fingerprintSha256: input.fingerprintSha256,
      leaseToken: input.claimLeaseToken,
      receiptId: "00000000-0000-4000-8000-000000000301",
      committedAt: input.receivedAt,
    });
    this.committedClaims.set(key, input.fingerprintSha256);
    this.activeClaims.delete(key);
    return Promise.resolve({
      receiptId: "00000000-0000-4000-8000-000000000301",
    });
  }

  stageInboundAttachment(
    input: Parameters<DrsRuntimeRepository["stageInboundAttachment"]>[0],
  ) {
    this.attachments.push(input);
    return Promise.resolve({
      attachmentId: "00000000-0000-4000-8000-000000000401",
    });
  }

  revalidateGroupSend() {
    return Promise.resolve({ ok: this.sendable });
  }

  recordTransportAttempt(
    input: Parameters<DrsRuntimeRepository["recordTransportAttempt"]>[0],
  ) {
    this.transportResults.push(input);
    return Promise.resolve();
  }
}

const contentClient: RuntimeLineContentClient = {
  getMessageContent(messageId: string) {
    return Promise.resolve({
      body: new TextEncoder().encode(`content:${messageId}`),
      mimeType: "image/png",
    });
  },
};

function collectFetch(
  response: Response | Promise<Response>,
): { calls: { url: string; init: RequestInit }[]; fetch: RuntimeFetch } {
  const calls: { url: string; init: RequestInit }[] = [];
  return {
    calls,
    fetch: (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return Promise.resolve(response);
    },
  };
}

Deno.test("W2 verifies LINE signature from raw bytes before JSON parse and never logs secret values", async () => {
  const repo = new FakeRuntimeRepository();
  const logs: string[] = [];
  const rawBody = "{bad json";
  const result = await handleLineWebhookRuntime({
    rawBody,
    headers: {
      "x-line-signature": await signLineBody("wrong-secret", rawBody),
    },
    config: { channelSecret: "w2-secret-value", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
    logger: { warn: (message: string) => logs.push(message) },
  });

  assertEquals(result.status, "bad_signature");
  assertEquals(repo.claims.length, 0);
  assert(!JSON.stringify(logs).includes("w2-secret-value"));
});

Deno.test("W2 returns bad request for malformed JSON only after a valid raw-body signature", async () => {
  const repo = new FakeRuntimeRepository();
  const rawBody = "{bad json";
  const result = await handleLineWebhookRuntime({
    rawBody,
    headers: { "x-line-signature": await signLineBody("secret", rawBody) },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });

  assertEquals(result.status, "bad_request");
  assertEquals(repo.claims.length, 0);
  assertEquals(repo.recorded.length, 0);
});

Deno.test("W2 accepts only linked sent group text and stores Owner/Vendor messages unchanged without AI review", async () => {
  const repo = new FakeRuntimeRepository();
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [groupTextEvent()],
  });

  const result = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "X-Line-Signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });

  assertEquals(result.status, "ok");
  assertEquals(result.acceptedCount, 1);
  assertEquals(repo.recorded.length, 1);
  const record = repo.recorded[0] as { text?: string; actorType?: string };
  assertEquals(record.text, "這是業主已送出的原文");
  assertEquals(record.actorType, "OWNER");
});

Deno.test("W2 denies unlinked groups and duplicate or colliding LINE event identities without case records", async () => {
  const repo = new FakeRuntimeRepository();
  repo.linked = false;
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [groupTextEvent()],
  });
  const denied = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });
  assertEquals(denied.deniedCount, 1);
  assertEquals(repo.recorded.length, 0);

  const duplicateRepo = new FakeRuntimeRepository();
  duplicateRepo.duplicate = true;
  const duplicate = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: duplicateRepo,
    now: "2026-08-21T10:00:01.000Z",
  });
  assertEquals(duplicate.duplicateCount, 1);
  assertEquals(duplicateRepo.recorded.length, 0);

  const collisionRepo = new FakeRuntimeRepository();
  collisionRepo.collision = true;
  const collision = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: collisionRepo,
    now: "2026-08-21T10:00:01.000Z",
  });
  assertEquals(collision.collisionCount, 1);
  assertEquals(collisionRepo.recorded.length, 0);
});

Deno.test("W2 denies linked-group identity mismatch before claim, staging or record", async () => {
  const repo = new FakeRuntimeRepository();
  repo.resolvedLineGroupId = "CwrongGroup";
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [groupTextEvent()],
  });

  const result = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });

  assertEquals(result.deniedCount, 1);
  assertEquals(repo.claims.length, 0);
  assertEquals(repo.attachments.length, 0);
  assertEquals(repo.recorded.length, 0);
});

Deno.test("W2 releases event claim after transient attachment failure so redelivery can succeed", async () => {
  const repo = new FakeRuntimeRepository();
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [
      groupTextEvent({
        webhookEventId: "w2-redelivery-attachment",
        message: { id: "line-img-redelivery", type: "image" },
      }),
    ],
  });

  const first = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    contentClient: {
      getMessageContent() {
        return Promise.reject(new Error("transient_content_failure"));
      },
    },
    now: "2026-08-21T10:00:01.000Z",
  });
  assertEquals(first.retryableCount, 1);
  assertEquals(repo.releases.length, 1);
  assertEquals(repo.commits.length, 0);

  const replay = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    contentClient,
    now: "2026-08-21T10:00:02.000Z",
  });
  assertEquals(replay.acceptedCount, 1);
  assertEquals(repo.recorded.length, 1);
  assertEquals(repo.commits.length, 1);
});

Deno.test("W2 releases event claim after transient record failure so redelivery can succeed", async () => {
  const repo = new FakeRuntimeRepository();
  repo.failNextRecord = true;
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [groupTextEvent({ webhookEventId: "w2-record-redelivery" })],
  });

  const first = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });
  assertEquals(first.retryableCount, 1);
  assertEquals(repo.releases.length, 1);
  assertEquals(repo.commits.length, 0);

  const replay = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:02.000Z",
  });
  assertEquals(replay.acceptedCount, 1);
  assertEquals(repo.recorded.length, 1);
  assertEquals(repo.commits.length, 1);
});

Deno.test("W2 rejects expired event claim lease before staging, record or commit", async () => {
  const repo = new FakeRuntimeRepository();
  repo.leaseExpiresAt = "2026-08-21T10:00:00.999Z";
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [
      groupTextEvent({
        webhookEventId: "w2-expired-lease",
        message: { id: "line-img-expired-lease", type: "image" },
      }),
    ],
  });

  const result = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    contentClient,
    now: "2026-08-21T10:00:01.000Z",
  });

  assertEquals(result.retryableCount, 1);
  assertEquals(repo.releases.length, 1);
  assertEquals(repo.attachments.length, 0);
  assertEquals(repo.recorded.length, 0);
  assertEquals(repo.commits.length, 0);
});

Deno.test("W2 passes current lease ownership into case receipt persistence", async () => {
  const repo = new FakeRuntimeRepository();
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [groupTextEvent({ webhookEventId: "w2-record-lease-context" })],
  });

  const result = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });

  assertEquals(result.acceptedCount, 1);
  const record = repo.recorded[0] as {
    claimLeaseToken?: string;
    claimLeaseExpiresAt?: string;
  };
  assertEquals(record.claimLeaseToken, "lease-1");
  assertEquals(record.claimLeaseExpiresAt, "2026-08-21T10:01:00.000Z");
});

Deno.test("W2 commit failure during receipt persistence leaves no uncommitted case record and redelivery succeeds", async () => {
  const repo = new FakeRuntimeRepository();
  repo.failNextCommitInRecord = true;
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [groupTextEvent({ webhookEventId: "w2-commit-record-atomicity" })],
  });

  const first = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });

  assertEquals(first.retryableCount, 1);
  assertEquals(repo.recorded.length, 0);
  assertEquals(repo.commits.length, 0);
  assertEquals(repo.releases.length, 1);

  const replay = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:02.000Z",
  });

  assertEquals(replay.acceptedCount, 1);
  assertEquals(repo.recorded.length, 1);
  assertEquals(repo.commits.length, 1);
});

Deno.test("W2 event claim lifecycle handles concurrent claim, committed duplicate and conflicting payload", async () => {
  const repo = new FakeRuntimeRepository();
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [groupTextEvent({ webhookEventId: "w2-lifecycle-event" })],
  });

  const busyKey = "line:Ubot:w2-lifecycle-event";
  repo.activeClaims.set(busyKey, {
    token: "lease-other-worker",
    fingerprint: "c".repeat(64),
  });
  const busy = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });
  assertEquals(busy.retryableCount, 1);
  assertEquals(repo.recorded.length, 0);
  repo.activeClaims.clear();

  const accepted = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:02.000Z",
  });
  assertEquals(accepted.acceptedCount, 1);

  const duplicate = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:03.000Z",
  });
  assertEquals(duplicate.duplicateCount, 1);

  const conflictingBody = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [
      groupTextEvent({
        webhookEventId: "w2-lifecycle-event",
        message: {
          id: "line-msg-1",
          type: "text",
          text: "同 event id 但 payload 已變更",
        },
      }),
    ],
  });
  const collision = await handleLineWebhookRuntime({
    rawBody: conflictingBody.rawBody,
    headers: { "x-line-signature": conflictingBody.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:04.000Z",
  });
  assertEquals(collision.collisionCount, 1);
});

Deno.test("W2 ingests sent image/file attachments only after content retrieval, MIME, size and SHA staging", async () => {
  const repo = new FakeRuntimeRepository();
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [
      groupTextEvent({
        webhookEventId: "w2-event-image",
        message: { id: "line-img-1", type: "image" },
      }),
    ],
  });

  const result = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    contentClient,
    now: "2026-08-21T10:00:01.000Z",
  });

  assertEquals(result.acceptedCount, 1);
  assertEquals(repo.attachments.length, 1);
  const staged = repo.attachments[0] as { mimeType?: string; sha256?: string };
  assertEquals(staged.mimeType, "image/png");
  assert(/^[0-9a-f]{64}$/u.test(staged.sha256 ?? ""));

  const failingRepo = new FakeRuntimeRepository();
  const failed = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: failingRepo,
    contentClient: {
      getMessageContent() {
        return Promise.resolve({
          body: new Uint8Array(10 * 1024 * 1024 + 1),
          mimeType: "image/png",
        });
      },
    },
    now: "2026-08-21T10:00:01.000Z",
  });
  assertEquals(failed.deniedCount, 1);
  assertEquals(failingRepo.recorded.length, 0);
});

Deno.test("W2 safely acknowledges unsupported source and event types without modeling drafts or private chats", async () => {
  const repo = new FakeRuntimeRepository();
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [
      groupTextEvent({
        webhookEventId: "room-event",
        source: { type: "room", roomId: "Rprivate", userId: "Uowner" },
      }),
      {
        type: "things",
        webhookEventId: "not-message",
        source: { type: "group", groupId: "CdrsGroup" },
      },
    ],
  });

  const result = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });

  assertEquals(result.unsupportedCount, 2);
  assertEquals(repo.recorded.length, 0);
});

Deno.test("W2 rejects missing config and invalid timestamps fail closed without leaking config values", async () => {
  const repo = new FakeRuntimeRepository();
  const logs: string[] = [];
  const body = await signedWebhook({
    secret: "secret",
    destination: "Ubot",
    events: [groupTextEvent({ timestamp: Number.NaN })],
  });

  const missingConfig = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
    logger: { warn: (message: string) => logs.push(message) },
  });
  assertEquals(missingConfig.status, "configuration_error");
  assert(!JSON.stringify(logs).includes("secret"));

  const invalidTimestamp = await handleLineWebhookRuntime({
    rawBody: body.rawBody,
    headers: { "x-line-signature": body.signature },
    config: { channelSecret: "secret", expectedDestination: "Ubot" },
    repository: repo,
    now: "2026-08-21T10:00:01.000Z",
  });
  assertEquals(invalidTimestamp.deniedCount, 1);
});

Deno.test("W2 OpenAI adapter sends only explicit submitted snapshot and maps results to allowed statuses", async () => {
  const { fetch, calls } = collectFetch(
    new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          status: "REVIEW_COMPLETED_ATTENTION",
          findings: ["需要人工確認"],
          evidenceRefs: ["snapshot"],
          recommendations: ["請補充依據"],
          proposedText: "建議送出文字",
        }),
      }),
      { status: 200 },
    ),
  );
  const port = createOpenAiResponsesAdvisoryPort({
    apiKey: "test-openai-key-not-real",
    model: "gpt-test",
    fetch,
  });

  const review = await port.review({
    text: "EXPLICIT-SPECIALIST-SUBMITTED-SNAPSHOT",
    now: "2026-08-21T10:00:01.000Z",
  });

  assertEquals(review.status, "REVIEW_COMPLETED_ATTENTION");
  assertEquals(calls.length, 1);
  assert(
    JSON.stringify(calls[0].init.body).includes(
      "EXPLICIT-SPECIALIST-SUBMITTED-SNAPSHOT",
    ),
  );
  assert(!JSON.stringify(review).includes("test-openai-key-not-real"));
});

Deno.test("W2 OpenAI adapter maps timeout, 429, 5xx and malformed JSON to safe unavailable review", async () => {
  const cases: RuntimeFetch[] = [
    () => Promise.reject(new Error("network secret should not leak")),
    () => Promise.resolve(new Response("rate", { status: 429 })),
    () => Promise.resolve(new Response("server", { status: 503 })),
    () => Promise.resolve(new Response("{", { status: 200 })),
  ];

  for (const fetch of cases) {
    const port = createOpenAiResponsesAdvisoryPort({
      apiKey: "test-openai-key-not-real",
      model: "gpt-test",
      fetch,
    });
    const review = await port.review({
      text: "submitted",
      now: "2026-08-21T10:00:01.000Z",
    });
    assertEquals(review.status, "REVIEW_SERVICE_UNAVAILABLE");
    assert(!JSON.stringify(review).includes("network secret"));
    assert(!JSON.stringify(review).includes("test-openai-key-not-real"));
  }
});

Deno.test("W2 specialist final send wrapper preserves Human-only authority and required metadata", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  store.linkGroup({
    formalLinkId: "formal-link-1",
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
    lineGroupId: "CdrsGroup",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-21T00:00:00.000Z",
    validTo: "2026-08-22T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  store.assignSpecialist({
    assignmentId: "00000000-0000-4000-8000-000000000501",
    caseId: "00000000-0000-4000-8000-000000000201",
    specialistId: "00000000-0000-4000-8000-000000000502",
    verifiedAuthSubject: "auth-specialist",
    specialistEmailSnapshot: "specialist@example.invalid",
    validFrom: "2026-08-21T00:00:00.000Z",
    validTo: "2026-08-22T00:00:00.000Z",
    assignedBy: "00000000-0000-4000-8000-000000000503",
    status: "active",
    privateControlLineUserId: "UspecialistPrivate",
  });
  const review = await reviewDrsOutboundContent({
    actorType: "DRS",
    text: "DRS 建議文字",
    advisoryPort: createDeterministicAdvisoryPort({ mode: "unavailable" }),
    now: "2026-08-21T10:00:01.000Z",
    store,
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
  });
  const finalSnapshot = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText("DRS 緊急人工通知"),
    attachments: [],
  });

  await assertRejectsAsync(
    () =>
      finalizeSpecialistGroupSendRuntime({
        store,
        caseId: "00000000-0000-4000-8000-000000000201",
        linkedGroupId: "00000000-0000-4000-8000-000000000202",
        lineGroupId: "CdrsGroup",
        assignmentId: "00000000-0000-4000-8000-000000000501",
        specialistAuthSubject: "wrong-auth",
        decision: {
          type: "MANUAL_EXCEPTION_SEND",
          reason: "服務中斷",
          urgency: "high",
          serviceIncidentId: "incident-1",
          finalText: "DRS 緊急人工通知",
          finalSnapshotSha256: finalSnapshot,
        },
        aiReview: review,
        finalizationKey: "finalization-1",
        expectedFinalSnapshotHash: finalSnapshot,
        now: "2026-08-21T10:00:02.000Z",
      }),
    "specialist_identity_mismatch",
  );

  const sent = await finalizeSpecialistGroupSendRuntime({
    store,
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
    lineGroupId: "CdrsGroup",
    assignmentId: "00000000-0000-4000-8000-000000000501",
    specialistAuthSubject: "auth-specialist",
    decision: {
      type: "MANUAL_EXCEPTION_SEND",
      reason: "服務中斷",
      urgency: "high",
      serviceIncidentId: "incident-1",
      finalText: "DRS 緊急人工通知",
      finalSnapshotSha256: finalSnapshot,
    },
    aiReview: review,
    finalizationKey: "finalization-1",
    expectedFinalSnapshotHash: finalSnapshot,
    now: "2026-08-21T10:00:02.000Z",
  });
  assertEquals(sent.status, "queued");
});

Deno.test("W2 group push dispatch revalidates send authority and separates transport accepted from recipient read", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  store.linkGroup({
    formalLinkId: "formal-link-1",
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
    lineGroupId: "CdrsGroup",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-21T00:00:00.000Z",
    validTo: "2026-08-22T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  store.assignSpecialist({
    assignmentId: "00000000-0000-4000-8000-000000000501",
    caseId: "00000000-0000-4000-8000-000000000201",
    specialistId: "00000000-0000-4000-8000-000000000502",
    verifiedAuthSubject: "auth-specialist",
    specialistEmailSnapshot: "specialist@example.invalid",
    validFrom: "2026-08-21T00:00:00.000Z",
    validTo: "2026-08-22T00:00:00.000Z",
    assignedBy: "00000000-0000-4000-8000-000000000503",
    status: "active",
    privateControlLineUserId: "UspecialistPrivate",
  });
  const text = "DRS 最終通知";
  const review = await reviewDrsOutboundContent({
    actorType: "DRS",
    text,
    advisoryPort: createDeterministicAdvisoryPort({ mode: "no_flag" }),
    now: "2026-08-21T10:00:01.000Z",
    store,
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
  });
  const finalSnapshot = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText(text),
    attachments: [],
  });
  await finalizeDrsGroupSend({
    store,
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
    lineGroupId: "CdrsGroup",
    assignmentId: "00000000-0000-4000-8000-000000000501",
    specialistAuthSubject: "auth-specialist",
    decision: {
      type: "EDIT_AND_SEND",
      finalText: text,
      reason: "專家確認後送出",
      finalSnapshotSha256: finalSnapshot,
    },
    aiReview: review,
    finalizationKey: "finalization-push",
    expectedFinalSnapshotHash: finalSnapshot,
    now: "2026-08-21T10:00:02.000Z",
  });
  const repo = new FakeRuntimeRepository();
  const { fetch, calls } = collectFetch(new Response("{}", { status: 200 }));

  const result = await pushFinalMessageRuntime({
    store,
    outboxId: store.outbox[0].outboxId,
    endpointBaseUrl: "https://api.line.local.invalid/v2/bot",
    channelAccessToken: "line-channel-token-secret",
    repository: repo,
    fetch,
    now: "2026-08-21T10:00:03.000Z",
  });

  assertEquals(result.status, "transport_accepted");
  assertEquals(result.recipientReadConfirmed, false);
  assertEquals(calls.length, 1);
  assertEquals(repo.transportResults.length, 1);
  assert(
    !JSON.stringify(repo.transportResults).includes(
      "line-channel-token-secret",
    ),
  );

  repo.sendable = false;
  await assertRejectsAsync(
    () =>
      pushFinalMessageRuntime({
        store,
        outboxId: store.outbox[0].outboxId,
        endpointBaseUrl: "https://api.line.local.invalid/v2/bot",
        channelAccessToken: "line-channel-token-secret",
        repository: repo,
        fetch,
        now: "2026-08-21T10:00:03.000Z",
      }),
    "linked_group_not_sendable",
  );
});

Deno.test("W2 group push reports 429, 5xx, timeout and transport failure without leaking secrets", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  store.linkGroup({
    formalLinkId: "formal-link-1",
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
    lineGroupId: "CdrsGroup",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-21T00:00:00.000Z",
    validTo: "2026-08-22T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  store.assignSpecialist({
    assignmentId: "00000000-0000-4000-8000-000000000501",
    caseId: "00000000-0000-4000-8000-000000000201",
    specialistId: "00000000-0000-4000-8000-000000000502",
    verifiedAuthSubject: "auth-specialist",
    specialistEmailSnapshot: "specialist@example.invalid",
    validFrom: "2026-08-21T00:00:00.000Z",
    validTo: "2026-08-22T00:00:00.000Z",
    assignedBy: "00000000-0000-4000-8000-000000000503",
    status: "active",
    privateControlLineUserId: "UspecialistPrivate",
  });
  const review = await reviewDrsOutboundContent({
    actorType: "DRS",
    text: "DRS 最終通知",
    advisoryPort: createDeterministicAdvisoryPort({ mode: "no_flag" }),
    now: "2026-08-21T10:00:01.000Z",
    store,
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
  });
  const finalSnapshot = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText("DRS 最終通知"),
    attachments: [],
  });
  await finalizeDrsGroupSend({
    store,
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
    lineGroupId: "CdrsGroup",
    assignmentId: "00000000-0000-4000-8000-000000000501",
    specialistAuthSubject: "auth-specialist",
    decision: {
      type: "EDIT_AND_SEND",
      finalText: "DRS 最終通知",
      reason: "專家確認後送出",
      finalSnapshotSha256: finalSnapshot,
    },
    aiReview: review,
    finalizationKey: "finalization-failure",
    expectedFinalSnapshotHash: finalSnapshot,
    now: "2026-08-21T10:00:02.000Z",
  });

  const timeoutFetch: RuntimeFetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new Error("line timeout secret should not leak")),
      );
    });

  for (
    const [fetch, expected] of [
      [
        () => Promise.resolve(new Response("rate", { status: 429 })),
        "rate_limited",
      ],
      [
        () => Promise.resolve(new Response("server", { status: 503 })),
        "retryable_failure",
      ],
      [
        () => Promise.reject(new Error("transport secret should not leak")),
        "retryable_failure",
      ],
      [timeoutFetch, "retryable_failure"],
    ] as const
  ) {
    const repo = new FakeRuntimeRepository();
    const result = await pushFinalMessageRuntime({
      store,
      outboxId: store.outbox[0].outboxId,
      endpointBaseUrl: "https://api.line.local.invalid/v2/bot",
      channelAccessToken: "line-channel-token-secret",
      repository: repo,
      fetch,
      now: "2026-08-21T10:00:03.000Z",
      timeoutMs: fetch === timeoutFetch ? 1 : undefined,
    });
    assertEquals(result.status, expected);
    assert(
      !JSON.stringify(repo.transportResults).includes(
        "line-channel-token-secret",
      ),
    );
    assert(!JSON.stringify(repo.transportResults).includes("transport secret"));
  }
});

Deno.test("W2 can prepare attachment-backed final transport through W1 resolver without live LINE or storage calls", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  store.linkGroup({
    formalLinkId: "formal-link-1",
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
    lineGroupId: "CdrsGroup",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-21T00:00:00.000Z",
    validTo: "2026-08-22T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  store.assignSpecialist({
    assignmentId: "00000000-0000-4000-8000-000000000501",
    caseId: "00000000-0000-4000-8000-000000000201",
    specialistId: "00000000-0000-4000-8000-000000000502",
    verifiedAuthSubject: "auth-specialist",
    specialistEmailSnapshot: "specialist@example.invalid",
    validFrom: "2026-08-21T00:00:00.000Z",
    validTo: "2026-08-22T00:00:00.000Z",
    assignedBy: "00000000-0000-4000-8000-000000000503",
    status: "active",
    privateControlLineUserId: "UspecialistPrivate",
  });
  const attachment: FinalAttachmentRef = {
    attachmentId: "00000000-0000-4000-8000-000000000601",
    mimeType: "image/png" as const,
    byteSize: 42,
    sha256: "a".repeat(64),
    storageRef: "private://line/00000000-0000-4000-8000-000000000601",
  };
  const sourceReceipt: ReceiptRecord = {
    receiptId: "00000000-0000-4000-8000-000000000701",
    provider: "line",
    providerChannelId: "Ubot",
    providerReceiptKey: "line:Ubot:w2-attachment:CdrsGroup:line-img",
    webhookEventId: "w2-attachment",
    lineMessageId: "line-img",
    lineGroupId: "CdrsGroup",
    lineSenderUserId: "Uowner",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
    caseId: "00000000-0000-4000-8000-000000000201",
    groupType: "OWNER_DRS_PRIVATE",
    messageType: "image",
    actorType: "OWNER",
    occurredAt: "2026-08-21T10:00:00.000Z",
    receivedAt: "2026-08-21T10:00:01.000Z",
    fingerprintSha256: "b".repeat(64),
    processingState: "accepted",
  };
  store.receipts.push(sourceReceipt);
  const stagedAttachment: AttachmentRecord = {
    ...attachment,
    mimeType: "image/png",
    provider: "line",
    receiptId: "00000000-0000-4000-8000-000000000701",
    lineMessageId: "line-img",
    status: "private_staged",
  };
  store.attachments.push(stagedAttachment);
  const resolver: AttachmentTransportResolver = {
    resolve() {
      return [{
        type: "image",
        purpose: "attachment_payload",
        originalContentUrl:
          "https://drs.local.invalid/images/00000000-0000-4000-8000-000000000601/original",
        previewImageUrl:
          "https://drs.local.invalid/images/00000000-0000-4000-8000-000000000601/preview",
        attachmentRef: attachment,
      }];
    },
  };
  const review = await reviewDrsOutboundContent({
    actorType: "DRS",
    text: "DRS 附件通知",
    advisoryPort: createDeterministicAdvisoryPort({ mode: "no_flag" }),
    now: "2026-08-21T10:00:01.000Z",
    store,
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
  });
  const finalSnapshot = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText("DRS 附件通知"),
    attachments: [attachment],
    deliverableMessages: [
      {
        type: "text",
        purpose: "final_text",
        text: createPublicSafeText("DRS 附件通知"),
      },
      ...(await resolver.resolve({ attachments: [attachment] })),
    ],
  });
  await finalizeSpecialistGroupSendRuntime({
    store,
    caseId: "00000000-0000-4000-8000-000000000201",
    linkedGroupId: "00000000-0000-4000-8000-000000000202",
    lineGroupId: "CdrsGroup",
    assignmentId: "00000000-0000-4000-8000-000000000501",
    specialistAuthSubject: "auth-specialist",
    decision: {
      type: "EDIT_AND_SEND",
      finalText: "DRS 附件通知",
      reason: "專家確認附件後送出",
      finalSnapshotSha256: finalSnapshot,
    },
    aiReview: review,
    finalizationKey: "finalization-attachment",
    expectedFinalSnapshotHash: finalSnapshot,
    finalAttachments: [attachment],
    attachmentTransportResolver: resolver,
    now: "2026-08-21T10:00:02.000Z",
  });

  const request = await buildLinePushRequest({
    endpointBaseUrl: "https://api.line.local.invalid/v2/bot",
    store,
    outboxId: store.outbox[0].outboxId,
  });
  assert(
    JSON.parse(request.body).messages.some((message: { type: string }) =>
      message.type === "image"
    ),
  );
});

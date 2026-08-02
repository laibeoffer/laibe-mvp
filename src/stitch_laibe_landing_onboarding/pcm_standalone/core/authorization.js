const CASE_OWNER = "case_owner";
const CASE_PRO = "case_pro";
const PCM_REVIEWER = "pcm_reviewer";

function includesActor(actorIds, actorId) {
  return Array.isArray(actorIds) && actorIds.includes(actorId);
}

export function canAccessCase({ actorId, actorCapability, caseRecord } = {}) {
  if (!actorId || !caseRecord || typeof caseRecord !== "object") {
    return false;
  }

  if (actorCapability === CASE_OWNER) {
    return caseRecord.ownerActorId === actorId;
  }

  if (actorCapability === CASE_PRO) {
    return includesActor(caseRecord.proActorIds, actorId);
  }

  if (actorCapability === PCM_REVIEWER) {
    return includesActor(caseRecord.pcmAuthorizedActorIds, actorId);
  }

  return false;
}

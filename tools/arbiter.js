#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli.ts
var import_node_child_process = require("child_process");
var import_node_crypto = require("crypto");
var path = __toESM(require("path"));

// src/types.ts
var POLICY_DIGEST_UNAVAILABLE = "UNAVAILABLE";

// src/util/id.ts
var import_uuid = require("uuid");
function generateEventId() {
  return (0, import_uuid.v4)();
}
function generateTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString();
}

// src/context/ingest.ts
function ingestContext(inputs) {
  return {
    event_id: generateEventId(),
    timestamp: generateTimestamp(),
    repository: inputs.repository,
    pull_request: inputs.pull_request,
    actor_type: inputs.actor_type,
    actor_name: inputs.actor_name,
    session_id: inputs.session_id,
    changed_paths: inputs.changed_paths
  };
}

// src/provenance/validate.ts
var fs = __toESM(require("fs"));
function validateProvenance(provenancePath, requiredFields) {
  if (!fs.existsSync(provenancePath)) {
    return {
      provenance_valid: false,
      failure_reasons: [`Provenance artifact not found at ${provenancePath}`]
    };
  }
  let raw;
  try {
    raw = fs.readFileSync(provenancePath, "utf-8");
  } catch {
    return {
      provenance_valid: false,
      failure_reasons: [`Provenance artifact unreadable at ${provenancePath}`]
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      provenance_valid: false,
      failure_reasons: ["Provenance artifact is not valid JSON"]
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      provenance_valid: false,
      failure_reasons: ["Provenance artifact is not a JSON object"]
    };
  }
  const missingFields = [];
  for (const field of requiredFields) {
    const value = parsed[field];
    if (value === void 0 || value === null || value === "") {
      missingFields.push(field);
    }
  }
  if (missingFields.length > 0) {
    return {
      provenance_valid: false,
      failure_reasons: missingFields.map(
        (f) => `Missing required provenance field: ${f}`
      )
    };
  }
  return { provenance_valid: true, failure_reasons: [] };
}

// src/paths/evaluate.ts
var import_picomatch = __toESM(require("picomatch"));
function evaluateProtectedPaths(changedPaths, protectedPathRules) {
  const touched = /* @__PURE__ */ new Set();
  for (const rule of protectedPathRules) {
    const isMatch = (0, import_picomatch.default)(rule.pattern);
    for (const changedPath of changedPaths) {
      if (isMatch(changedPath)) {
        touched.add(rule.pattern);
      }
    }
  }
  const protected_paths_touched = Array.from(touched).sort();
  return {
    protected_paths_touched,
    is_protected_context: protected_paths_touched.length > 0
  };
}

// src/evidence/check.ts
var fs2 = __toESM(require("fs"));
var import_picomatch2 = __toESM(require("picomatch"));
function evidenceSortKey(pathPattern, type, path2) {
  return `${pathPattern}\0${type}\0${path2}`;
}
function checkEvidence(protectedPathsTouched, changedPaths, evidenceRequirements) {
  const requiredArtifacts = [];
  for (const req of evidenceRequirements) {
    const isMatch = (0, import_picomatch2.default)(req.path_pattern);
    const applies = changedPaths.some((p) => isMatch(p));
    if (applies) {
      for (const artifact of req.required_artifacts) {
        const key = evidenceSortKey(req.path_pattern, artifact.type, artifact.path);
        const label = `${artifact.type}:${artifact.path}`;
        if (!requiredArtifacts.some((a) => a.key === key)) {
          requiredArtifacts.push({ key, label, path: artifact.path });
        }
      }
    }
  }
  requiredArtifacts.sort((a, b) => a.key.localeCompare(b.key));
  const sortedLabels = requiredArtifacts.map((a) => a.label);
  const missing = [];
  for (const artifact of requiredArtifacts) {
    if (!fs2.existsSync(artifact.path)) {
      missing.push(artifact.label);
    }
  }
  return {
    evidence_requirements: sortedLabels,
    evidence_present: missing.length === 0,
    missing_evidence: missing
  };
}

// src/policy/evaluate.ts
var import_picomatch3 = __toESM(require("picomatch"));

// src/policy/reason-codes.ts
var REASON_CODE_REGISTRY = [
  {
    reason_code: "POLICY_UNAVAILABLE",
    rationale_template_id: "tmpl_policy_unavailable",
    template: "Policy bundle unreadable: {failure_detail}"
  },
  {
    reason_code: "ESCALATION_REQUIRED",
    rationale_template_id: "tmpl_escalation_required",
    template: "Escalation triggered: {trigger}"
  },
  {
    reason_code: "PROVENANCE_INVALID",
    rationale_template_id: "tmpl_provenance_invalid",
    template: "Provenance validation failed: {failure_reasons}"
  },
  {
    reason_code: "EVIDENCE_MISSING",
    rationale_template_id: "tmpl_evidence_missing",
    template: "Required evidence missing for protected paths: {missing_evidence}"
  },
  {
    reason_code: "CONDITIONS_SATISFIED",
    rationale_template_id: "tmpl_conditions_satisfied",
    template: "All policy conditions satisfied"
  },
  {
    reason_code: "NO_PROTECTED_PATHS",
    rationale_template_id: "tmpl_no_protected_paths",
    template: "No protected paths affected; provenance valid"
  },
  {
    reason_code: "DEFAULT_DENY",
    rationale_template_id: "tmpl_default_deny",
    template: "Default fail-closed: unhandled evaluation state"
  },
  {
    reason_code: "EVALUATION_FAILED",
    rationale_template_id: "tmpl_evaluation_failed",
    template: "Evaluation failed: {failure_context}"
  }
];
function getEntry(code) {
  const entry = REASON_CODE_REGISTRY.find((e) => e.reason_code === code);
  if (!entry) {
    throw new Error(`Unknown reason code: ${code}`);
  }
  return entry;
}
function getTemplateId(code) {
  return getEntry(code).rationale_template_id;
}
function renderRationale(code, inputs = {}) {
  const entry = getEntry(code);
  let result = entry.template;
  for (const [key, value] of Object.entries(inputs).sort(([a], [b]) => a.localeCompare(b))) {
    result = result.replace(`{${key}}`, value);
  }
  return result;
}

// src/policy/evaluate.ts
var DECISION_TABLE = [
  // Row 2: Explicit escalation rule matched → ESCALATE
  {
    priority: 2,
    reason_code: "ESCALATION_REQUIRED",
    decision: "ESCALATE",
    condition: (ctx) => {
      for (const cond of ctx.policy.escalation_conditions ?? []) {
        if (matchesEscalationCondition(cond, ctx.policy.protected_paths, ctx.changedPaths)) {
          ctx.matchedEscalation = { trigger: cond.trigger, category: cond.category };
          return true;
        }
      }
      return false;
    },
    templateInputs: (ctx) => ({
      trigger: ctx.matchedEscalation?.trigger ?? "unknown"
    })
  },
  // Row 3: Provenance invalid/missing → DENY
  {
    priority: 3,
    reason_code: "PROVENANCE_INVALID",
    decision: "DENY",
    condition: (ctx) => !ctx.provenanceResult.provenance_valid,
    templateInputs: (ctx) => ({
      failure_reasons: ctx.provenanceResult.failure_reasons.join("; ")
    })
  },
  // Row 4: Protected path + missing evidence → DENY
  {
    priority: 4,
    reason_code: "EVIDENCE_MISSING",
    decision: "DENY",
    condition: (ctx) => ctx.pathResult.is_protected_context && !ctx.evidenceResult.evidence_present,
    templateInputs: (ctx) => ({
      missing_evidence: ctx.evidenceResult.missing_evidence.join(", ")
    })
  },
  // Row 5: Protected path + valid evidence + valid provenance → ALLOW
  {
    priority: 5,
    reason_code: "CONDITIONS_SATISFIED",
    decision: "ALLOW",
    condition: (ctx) => ctx.pathResult.is_protected_context && ctx.evidenceResult.evidence_present && ctx.provenanceResult.provenance_valid,
    templateInputs: () => ({})
  },
  // Row 6: No protected path + valid provenance → ALLOW
  {
    priority: 6,
    reason_code: "NO_PROTECTED_PATHS",
    decision: "ALLOW",
    condition: (ctx) => !ctx.pathResult.is_protected_context && ctx.provenanceResult.provenance_valid,
    templateInputs: () => ({})
  },
  // Row 7: Else → DENY (fail-closed)
  {
    priority: 7,
    reason_code: "DEFAULT_DENY",
    decision: "DENY",
    condition: () => true,
    templateInputs: () => ({})
  }
];
function evaluatePolicy(provenanceResult, pathResult, evidenceResult, policy, changedPaths) {
  const ctx = {
    provenanceResult,
    pathResult,
    evidenceResult,
    policy,
    changedPaths
  };
  for (const rule of DECISION_TABLE) {
    if (rule.condition(ctx)) {
      const inputs = rule.templateInputs(ctx);
      return {
        decision: rule.decision,
        reason_code: rule.reason_code,
        rationale_template_id: getTemplateId(rule.reason_code),
        rendered_rationale: renderRationale(rule.reason_code, inputs),
        escalation_trigger: ctx.matchedEscalation?.trigger,
        escalation_category: ctx.matchedEscalation?.category
      };
    }
  }
  return {
    decision: "DENY",
    reason_code: "DEFAULT_DENY",
    rationale_template_id: getTemplateId("DEFAULT_DENY"),
    rendered_rationale: renderRationale("DEFAULT_DENY")
  };
}
function matchesEscalationCondition(condition, protectedPathRules, changedPaths) {
  const c = condition.condition;
  if (c.type === "input_unavailable") {
    return false;
  }
  if (c.risk_class) {
    const matchingRules = protectedPathRules.filter(
      (r) => r.risk_class === c.risk_class
    );
    for (const rule of matchingRules) {
      const isMatch = (0, import_picomatch3.default)(rule.pattern);
      if (changedPaths.some((p) => isMatch(p))) {
        return true;
      }
    }
  }
  return false;
}

// src/policy/loader.ts
var fs3 = __toESM(require("fs"));
var import_yaml = require("yaml");

// src/util/canonical.ts
var crypto = __toESM(require("crypto"));
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectKeys(obj[key]);
  }
  return sorted;
}
function canonicalizeJson(obj) {
  return JSON.stringify(sortObjectKeys(obj));
}
function computeDigest(content) {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}
function stableStringify(obj) {
  return JSON.stringify(sortObjectKeys(obj), null, 2);
}

// src/util/errors.ts
var SentryError = class extends Error {
  constructor(message, category) {
    super(message);
    this.category = category;
    this.name = "SentryError";
  }
  category;
};
var PolicyLoadError = class extends SentryError {
  constructor(message) {
    super(message, "policy_load_failure");
    this.name = "PolicyLoadError";
  }
};

// src/policy/loader.ts
function loadPolicy(path2) {
  let raw;
  try {
    raw = fs3.readFileSync(path2, "utf-8");
  } catch {
    return {
      ok: false,
      error: new PolicyLoadError(`Policy bundle not found or unreadable at ${path2}`)
    };
  }
  let parsed;
  try {
    parsed = (0, import_yaml.parse)(raw);
  } catch {
    return {
      ok: false,
      error: new PolicyLoadError(`Policy bundle at ${path2} is not valid YAML`)
    };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return {
      ok: false,
      error: new PolicyLoadError(`Policy bundle at ${path2} is not a valid object`)
    };
  }
  const p = parsed;
  if (typeof p.version !== "string") {
    return {
      ok: false,
      error: new PolicyLoadError("Policy bundle missing required field: version")
    };
  }
  if (!p.provenance || typeof p.provenance !== "object") {
    return {
      ok: false,
      error: new PolicyLoadError("Policy bundle missing required field: provenance")
    };
  }
  if (!Array.isArray(p.protected_paths)) {
    return {
      ok: false,
      error: new PolicyLoadError("Policy bundle missing required field: protected_paths")
    };
  }
  if (!Array.isArray(p.evidence_requirements)) {
    return {
      ok: false,
      error: new PolicyLoadError("Policy bundle missing required field: evidence_requirements")
    };
  }
  const canonical = canonicalizeJson(parsed);
  const policyDigest = computeDigest(canonical);
  return { ok: true, policy: parsed, policyDigest };
}

// src/artifact/emit.ts
var fs4 = __toESM(require("fs"));
var import_ajv = __toESM(require("ajv"));
var import_ajv_formats = __toESM(require("ajv-formats"));

// src/artifact/hmac.ts
var crypto2 = __toESM(require("crypto"));
function computeHmac(artifact, secret) {
  const { hmac: _, ...withoutHmac } = artifact;
  const canonical = canonicalizeJson(withoutHmac);
  return crypto2.createHmac("sha256", secret).update(canonical).digest("hex");
}

// src/artifact/emit.ts
function buildArtifact(inputs) {
  const artifact = {
    event_id: inputs.context.event_id ?? "unknown",
    timestamp: inputs.context.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(),
    repository: inputs.context.repository ?? "unknown",
    pull_request: inputs.context.pull_request ?? 0,
    actor_type: inputs.context.actor_type ?? "unknown",
    actor_name: inputs.context.actor_name ?? "unknown",
    session_id: inputs.context.session_id ?? "unknown",
    policy_version: inputs.policyVersion,
    policy_digest: inputs.policyDigest,
    protected_paths_touched: inputs.pathResult.protected_paths_touched,
    evidence_requirements: inputs.evidenceResult.evidence_requirements,
    evidence_present: inputs.evidenceResult.evidence_present,
    decision: inputs.policyDecision.decision,
    reason_code: inputs.policyDecision.reason_code,
    rationale_template_id: inputs.policyDecision.rationale_template_id,
    rendered_rationale: inputs.policyDecision.rendered_rationale,
    rollout_mode: inputs.rolloutMode
  };
  if (inputs.evidenceResult.missing_evidence.length > 0) {
    artifact.missing_evidence = inputs.evidenceResult.missing_evidence;
  }
  artifact.provenance_valid = inputs.provenanceResult.provenance_valid;
  if (inputs.provenanceResult.failure_reasons.length > 0) {
    artifact.provenance_failure_reasons = inputs.provenanceResult.failure_reasons;
  }
  if (inputs.policyDecision.escalation_trigger) {
    artifact.escalation_trigger = inputs.policyDecision.escalation_trigger;
  }
  if (inputs.policyDecision.escalation_category) {
    artifact.escalation_category = inputs.policyDecision.escalation_category;
  }
  if (inputs.failureContext) {
    artifact.failure_context = inputs.failureContext;
  }
  if (inputs.hmacSecret) {
    artifact.hmac = computeHmac(artifact, inputs.hmacSecret);
  }
  return artifact;
}
function writeArtifact(artifact, outputPath) {
  const json = stableStringify(artifact);
  fs4.writeFileSync(outputPath, json, "utf-8");
}

// src/phase1c/replay/layers.ts
var REPLAY_LAYER_ENUM = Object.freeze([
  "authoritative_evaluator_facts",
  "constrained_derived_view",
  "non_authoritative_summary",
  "interpretive_narrative",
  "advisory_recommendation"
]);
var NON_AUTHORITATIVE_DISCLAIMER = "This surface is non-authoritative. It derives from the authorization artifact but does not carry independent authority. Refer to the authorization artifact for authoritative evaluation results.";
var AUTHORITATIVE_DISCLAIMER = "This surface contains authoritative evaluator facts derived directly from deterministic policy evaluation.";
var REPLAY_LAYER_AUTHORITY_MATRIX = Object.freeze({
  authoritative_evaluator_facts: {
    layer_type: "authoritative_evaluator_facts",
    authority_status: "authoritative",
    authority_disclaimer: AUTHORITATIVE_DISCLAIMER
  },
  constrained_derived_view: {
    layer_type: "constrained_derived_view",
    authority_status: "non_authoritative",
    authority_disclaimer: NON_AUTHORITATIVE_DISCLAIMER
  },
  non_authoritative_summary: {
    layer_type: "non_authoritative_summary",
    authority_status: "non_authoritative",
    authority_disclaimer: NON_AUTHORITATIVE_DISCLAIMER
  },
  interpretive_narrative: {
    layer_type: "interpretive_narrative",
    authority_status: "non_authoritative",
    authority_disclaimer: NON_AUTHORITATIVE_DISCLAIMER
  },
  advisory_recommendation: {
    layer_type: "advisory_recommendation",
    authority_status: "non_authoritative",
    authority_disclaimer: NON_AUTHORITATIVE_DISCLAIMER
  }
});

// src/phase1c/replay/surface-registry.ts
var REPLAY_SURFACE_REGISTRY = Object.freeze([
  {
    surface_id: "pr_comment_rationale",
    surface_path: "src/surface/rationale.ts",
    required_layer_contract: "non_authoritative_summary",
    requires_omitted_by_design_marker: true
  }
]);
function getRegistryEntry(surfaceId) {
  return REPLAY_SURFACE_REGISTRY.find((e) => e.surface_id === surfaceId);
}

// src/phase1c/replay/surface-enforcement.ts
var ReplaySurfaceValidationError = class extends Error {
  constructor(surfaceId, violations) {
    super(`Replay surface validation failed for "${surfaceId}": ${violations.join("; ")}`);
    this.surfaceId = surfaceId;
    this.violations = violations;
    this.name = "ReplaySurfaceValidationError";
  }
  surfaceId;
  violations;
};
function attachReplaySurfaceMetadata(surfaceId, payload, layerType, omittedMarker) {
  const layerLabel = REPLAY_LAYER_AUTHORITY_MATRIX[layerType];
  return {
    content: payload,
    metadata: {
      surface_id: surfaceId,
      layer_type: layerType,
      authority_status: layerLabel.authority_status,
      authority_disclaimer: layerLabel.authority_disclaimer,
      omitted_by_design_marker: omittedMarker
    }
  };
}
function validateReplaySurfacePayload(surfaceId, payload) {
  const violations = [];
  const entry = getRegistryEntry(surfaceId);
  if (!entry) {
    violations.push(`Surface "${surfaceId}" not found in replay surface registry`);
  }
  if (!payload.metadata) {
    violations.push("Missing authority metadata");
    throw new ReplaySurfaceValidationError(surfaceId, violations);
  }
  if (!REPLAY_LAYER_ENUM.includes(payload.metadata.layer_type)) {
    violations.push(`Invalid layer_type: "${payload.metadata.layer_type}"`);
  }
  if (payload.metadata.authority_status === "non_authoritative") {
    if (!payload.metadata.authority_disclaimer || !payload.metadata.authority_disclaimer.toLowerCase().includes("non-authoritative")) {
      violations.push("Non-authoritative surface missing required non-authoritative disclaimer");
    }
  }
  if (entry?.requires_omitted_by_design_marker && !payload.metadata.omitted_by_design_marker) {
    violations.push("Missing required omitted_by_design marker");
  }
  if (violations.length > 0) {
    throw new ReplaySurfaceValidationError(surfaceId, violations);
  }
}

// src/phase1c/invariants.ts
var AUTHORITY_LAYER_MODEL = Object.freeze({
  authorization_artifact: "authoritative",
  policy_bundle: "authoritative",
  canonical_decision_table: "authoritative",
  pr_comments: "non_authoritative",
  github_checks: "non_authoritative_transport",
  logs: "non_authoritative",
  reviewer_summaries: "non_authoritative"
});
var OMISSION_DOCTRINE = Object.freeze({
  omitted_by_design_categories: Object.freeze([
    "off_platform_coordination",
    "verbal_approvals",
    "generalized_institutional_context",
    "total_organizational_chronology"
  ]),
  prohibitions: Object.freeze([
    "inferred_backfill_of_omitted_context",
    "heuristic_reconstruction_of_omitted_domains",
    "learned_reconstruction_of_omitted_domains"
  ]),
  doctrine_statement: "Omission pressure is observable; omission expansion is prohibited."
});

// src/phase1c/omission/boundaries.ts
function createOmissionBoundaryMarker() {
  return {
    omitted_by_design: OMISSION_DOCTRINE.omitted_by_design_categories,
    omission_doctrine: OMISSION_DOCTRINE.doctrine_statement
  };
}

// src/surface/rationale.ts
var COMMENT_MARKER = "<!-- agentic-sentry-decision -->";
var SURFACE_ID = "pr_comment_rationale";
function formatRationaleComment(artifact) {
  const badge = formatDecisionBadge(artifact.decision);
  const lines = [
    COMMENT_MARKER,
    `## ${badge} Agentic Sentry \u2014 ${artifact.decision}`,
    "",
    `**Rationale:** ${artifact.rendered_rationale}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Policy Version | \`${artifact.policy_version}\` |`,
    `| Policy Digest | \`${artifact.policy_digest}\` |`,
    `| Reason Code | \`${artifact.reason_code}\` |`,
    `| Actor | ${artifact.actor_name} (${artifact.actor_type}) |`,
    `| Session | \`${artifact.session_id}\` |`,
    `| Rollout Mode | ${artifact.rollout_mode} |`,
    `| Evidence Present | ${artifact.evidence_present ? "Yes" : "No"} |`
  ];
  if (artifact.protected_paths_touched.length > 0) {
    lines.push(
      `| Protected Paths | ${artifact.protected_paths_touched.map((p) => `\`${p}\``).join(", ")} |`
    );
  }
  if (artifact.missing_evidence && artifact.missing_evidence.length > 0) {
    lines.push(
      `| Missing Evidence | ${artifact.missing_evidence.map((e) => `\`${e}\``).join(", ")} |`
    );
  }
  if (artifact.escalation_trigger) {
    lines.push(`| Escalation Trigger | ${artifact.escalation_trigger} |`);
    lines.push(`| Escalation Category | ${artifact.escalation_category} |`);
  }
  if (artifact.failure_context) {
    lines.push(`| Failure Context | ${artifact.failure_context} |`);
  }
  lines.push("");
  lines.push(`<details><summary>Artifact ID</summary>

\`${artifact.event_id}\`

</details>`);
  const rawContent = lines.join("\n");
  const omissionMarker = createOmissionBoundaryMarker();
  const enforcedPayload = attachReplaySurfaceMetadata(
    SURFACE_ID,
    rawContent,
    "non_authoritative_summary",
    omissionMarker
  );
  validateReplaySurfacePayload(SURFACE_ID, enforcedPayload);
  return enforcedPayload.content;
}
function formatDecisionBadge(decision) {
  switch (decision) {
    case "ALLOW":
      return "\u2705";
    case "DENY":
      return "\u274C";
    case "ESCALATE":
      return "\u26A0\uFE0F";
    default:
      return "\u2753";
  }
}
function mapDecisionToCheckConclusion(decision, rolloutMode) {
  if (decision === "ESCALATE") return "action_required";
  if (decision === "DENY" && rolloutMode === "enforce") return "failure";
  return "success";
}

// src/engine.ts
function evaluate(inputs) {
  let context = {};
  let policyVersion = "unknown";
  let policyDigest = POLICY_DIGEST_UNAVAILABLE;
  let provenanceResult = {
    provenance_valid: false,
    failure_reasons: ["Evaluation did not complete"]
  };
  let pathResult = {
    protected_paths_touched: [],
    is_protected_context: false
  };
  let evidenceResult = {
    evidence_requirements: [],
    evidence_present: false,
    missing_evidence: []
  };
  let policyDecision = {
    decision: "DENY",
    reason_code: "EVALUATION_FAILED",
    rationale_template_id: getTemplateId("EVALUATION_FAILED"),
    rendered_rationale: renderRationale("EVALUATION_FAILED", {
      failure_context: "Evaluation did not complete"
    })
  };
  let failureContext;
  try {
    if (inputs.contextOverride) {
      context = inputs.contextOverride;
    } else {
      context = ingestContext({
        repository: "unknown",
        pull_request: 0,
        actor_type: "unknown",
        actor_name: "unknown",
        session_id: "unknown",
        changed_paths: []
      });
    }
    const policyLoadResult = loadPolicy(inputs.policyPath);
    if (!policyLoadResult.ok) {
      failureContext = policyLoadResult.error.message;
      policyDecision = {
        decision: "DENY",
        reason_code: "POLICY_UNAVAILABLE",
        rationale_template_id: getTemplateId("POLICY_UNAVAILABLE"),
        rendered_rationale: renderRationale("POLICY_UNAVAILABLE", {
          failure_detail: policyLoadResult.error.message
        })
      };
      const artifact2 = buildArtifact({
        context,
        provenanceResult,
        pathResult,
        evidenceResult,
        policyDecision,
        policyVersion: "unknown",
        policyDigest: POLICY_DIGEST_UNAVAILABLE,
        rolloutMode: inputs.rolloutMode,
        hmacSecret: inputs.hmacSecret,
        failureContext
      });
      writeArtifact(artifact2, inputs.artifactOutputPath);
      const comment2 = formatRationaleComment(artifact2);
      const conclusion2 = mapDecisionToCheckConclusion(
        artifact2.decision,
        inputs.rolloutMode
      );
      return { artifact: artifact2, comment: comment2, conclusion: conclusion2 };
    }
    const policy = policyLoadResult.policy;
    policyVersion = policy.version;
    policyDigest = policyLoadResult.policyDigest;
    provenanceResult = validateProvenance(
      inputs.provenancePath,
      policy.provenance.required_fields
    );
    const changedPaths = context.changed_paths ?? [];
    pathResult = evaluateProtectedPaths(changedPaths, policy.protected_paths);
    evidenceResult = checkEvidence(
      pathResult.protected_paths_touched,
      changedPaths,
      policy.evidence_requirements
    );
    policyDecision = evaluatePolicy(
      provenanceResult,
      pathResult,
      evidenceResult,
      policy,
      changedPaths
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    failureContext = `Unhandled evaluation error: ${errorMsg}`;
    policyDigest = POLICY_DIGEST_UNAVAILABLE;
    policyDecision = {
      decision: "DENY",
      reason_code: "EVALUATION_FAILED",
      rationale_template_id: getTemplateId("EVALUATION_FAILED"),
      rendered_rationale: renderRationale("EVALUATION_FAILED", {
        failure_context: failureContext
      })
    };
  }
  const artifact = buildArtifact({
    context,
    provenanceResult,
    pathResult,
    evidenceResult,
    policyDecision,
    policyVersion,
    policyDigest,
    rolloutMode: inputs.rolloutMode,
    hmacSecret: inputs.hmacSecret,
    failureContext
  });
  writeArtifact(artifact, inputs.artifactOutputPath);
  const comment = formatRationaleComment(artifact);
  const conclusion = mapDecisionToCheckConclusion(
    artifact.decision,
    inputs.rolloutMode
  );
  return { artifact, comment, conclusion };
}

// src/cli.ts
function getFlag(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}
function deriveChangedPaths(base) {
  const cmd = base ? `git diff --name-only ${base}...HEAD` : "git diff --name-only HEAD";
  try {
    const out = (0, import_node_child_process.execSync)(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
var C = {
  reset: "\x1B[0m",
  dim: "\x1B[2m",
  bold: "\x1B[1m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m"
};
function decisionLabel(decision) {
  switch (decision) {
    case "ALLOW":
      return `${C.bold}${C.green}ALLOWED${C.reset}`;
    case "DENY":
      return `${C.bold}${C.red}DENIED${C.reset}`;
    case "ESCALATE":
      return `${C.bold}${C.yellow}ESCALATE${C.reset}`;
    default:
      return decision;
  }
}
function summaryLine(a) {
  const paths = a.protected_paths_touched.join(", ");
  switch (a.reason_code) {
    case "EVIDENCE_MISSING": {
      const types = (a.missing_evidence ?? []).map((e) => e.split(":")[0]).join(", ");
      return `Protected path ${paths} requires ${types || "approval"} evidence before merge.`;
    }
    case "CONDITIONS_SATISFIED":
      return `Authorization satisfied for ${paths} \u2014 required evidence present.`;
    case "ESCALATION_REQUIRED":
      return `Protected change to ${paths} requires human review before merge.`;
    case "PROVENANCE_INVALID":
      return "AI provenance is missing or invalid.";
    case "NO_PROTECTED_PATHS":
      return "No protected paths affected.";
    default:
      return a.rendered_rationale;
  }
}
function main() {
  const policyPath = getFlag("--policy", ".sentry/policy.yaml");
  const provenancePath = getFlag("--provenance", ".ai/provenance.json");
  const artifactOut = getFlag("--artifact-out", "./arbiter-artifact.json");
  const hmacSecret = getFlag("--hmac-secret", process.env.ARBITER_HMAC_SECRET);
  const repository = getFlag("--repo", path.basename(process.cwd()));
  const explicitChanged = getFlag("--changed");
  const base = getFlag("--base");
  const changedPaths = explicitChanged ? explicitChanged.split(",").map((s) => s.trim()).filter(Boolean) : deriveChangedPaths(base);
  const context = {
    event_id: (0, import_node_crypto.randomUUID)(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    repository,
    pull_request: 0,
    actor_type: "ai_agent",
    actor_name: "claude-code",
    session_id: "local",
    changed_paths: changedPaths
  };
  const result = evaluate({
    policyPath,
    provenancePath,
    rolloutMode: "enforce",
    artifactOutputPath: artifactOut,
    hmacSecret,
    githubToken: "",
    contextOverride: context
  });
  const a = result.artifact;
  const sig = a.hmac ? `  ${C.dim}sig:${a.hmac.slice(0, 12)}${C.reset}` : "";
  process.stdout.write("\n");
  process.stdout.write(`  ${C.bold}ARBITER${C.reset}  ${C.dim}\xB7  ${repository}${C.reset}

`);
  process.stdout.write(`  DECISION   ${decisionLabel(a.decision)}
`);
  process.stdout.write(`  ${summaryLine(a)}

`);
  process.stdout.write(`  ${C.dim}artifact:${C.reset} ${artifactOut}${sig}

`);
  process.exit(result.conclusion === "failure" ? 1 : 0);
}
main();

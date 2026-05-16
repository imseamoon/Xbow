import { VulnSeverity, VulnType } from '../interfaces/vuln.interface';

export type CvssMetricValue = 'N' | 'A' | 'L' | 'P' | 'H' | 'R' | 'U' | 'C';

export interface RiskInput {
  type: VulnType | string;
  severity: VulnSeverity;
  reflected: boolean;
  executed: boolean;
  payload: string;
  source?: string;
  sink?: string;
  exactMatch?: boolean;
  browserAlertTriggered?: boolean;
  assetValue?: number;
}

export interface CvssVector {
  attackVector: 'N' | 'A' | 'L' | 'P';
  attackComplexity: 'L' | 'H';
  privilegesRequired: 'N' | 'L' | 'H';
  userInteraction: 'N' | 'R';
  scope: 'U' | 'C';
  confidentiality: 'N' | 'L' | 'H';
  integrity: 'N' | 'L' | 'H';
  availability: 'N' | 'L' | 'H';
}

export interface RiskCalculationResult {
  model: 'cvss_v3_1_inspired_expected_loss';
  runtimeSeverity: VulnSeverity;
  cvssVector: CvssVector;
  cvssVectorString: string;
  cvssBaseScore: number;
  cvssSeverity: VulnSeverity;
  impactSubScore: number;
  exploitabilitySubScore: number;
  exploitProbability: number;
  singleLossExpectancy: number;
  annualizedRateOfOccurrence: number;
  annualizedLossExpectancy: number;
  assumptions: {
    assetValue: number;
    assetValueUnit: string;
    notes: string[];
  };
}

const AV = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC = { L: 0.77, H: 0.44 };
const PR_U = { N: 0.85, L: 0.62, H: 0.27 };
const PR_C = { N: 0.85, L: 0.68, H: 0.5 };
const UI = { N: 0.85, R: 0.62 };
const CIA = { H: 0.56, L: 0.22, N: 0 };

const DEFAULT_ASSET_VALUE = 10000;

export function calculateRisk(input: RiskInput): RiskCalculationResult {
  const vector = deriveCvssVector(input);
  const scores = calculateCvssScores(vector);
  const probability = estimateExploitProbability(input, vector, scores.baseScore);
  const assetValue = input.assetValue ?? DEFAULT_ASSET_VALUE;
  const impactRatio = Math.min(1, scores.impactSubScore / 6);
  const singleLossExpectancy = roundCurrency(assetValue * impactRatio);
  const annualizedRateOfOccurrence = roundProbability(probability * 12);
  const annualizedLossExpectancy = roundCurrency(
    annualizedRateOfOccurrence * singleLossExpectancy,
  );

  return {
    model: 'cvss_v3_1_inspired_expected_loss',
    runtimeSeverity: input.severity,
    cvssVector: vector,
    cvssVectorString: vectorToString(vector),
    cvssBaseScore: scores.baseScore,
    cvssSeverity: severityFromCvss(scores.baseScore),
    impactSubScore: scores.impactSubScore,
    exploitabilitySubScore: scores.exploitabilitySubScore,
    exploitProbability: probability,
    singleLossExpectancy,
    annualizedRateOfOccurrence,
    annualizedLossExpectancy,
    assumptions: {
      assetValue,
      assetValueUnit: 'relative monetary units',
      notes: [
        'Analytical report-layer estimate only; not the runtime severity algorithm.',
        'Asset value defaults to 10000 unless a deployment-specific value is supplied.',
        'Probability is estimated from scanner evidence and CVSS-style exploitability factors.',
      ],
    },
  };
}

export function deriveCvssVector(input: RiskInput): CvssVector {
  const payload = (input.payload ?? '').toLowerCase();
  const source = (input.source ?? '').toLowerCase();
  const sink = (input.sink ?? '').toLowerCase();
  const type = String(input.type ?? '').toLowerCase();

  const sensitivePayload =
    payload.includes('document.cookie') ||
    payload.includes('localstorage') ||
    payload.includes('sessionstorage') ||
    payload.includes('fetch(') ||
    payload.includes('xmlhttprequest');

  const highDangerSink =
    sink === 'eval' ||
    sink === 'script' ||
    sink === 'document.write' ||
    sink === 'location.assign' ||
    sink === 'location_assign';

  const clientOnlySource =
    source === 'location.hash' ||
    source === 'hash' ||
    source === 'urlsearchparams' ||
    source === 'document.cookie';

  const attackComplexity: 'L' | 'H' =
    input.executed ||
    input.browserAlertTriggered ||
    input.exactMatch ||
    type === VulnType.STORED_XSS
      ? 'L'
      : 'H';

  const scope: 'U' | 'C' =
    input.executed ||
    type === VulnType.STORED_XSS ||
    type === VulnType.DOM_XSS ||
    highDangerSink
      ? 'C'
      : 'U';

  const confidentiality: 'N' | 'L' | 'H' = sensitivePayload
    ? 'H'
    : input.executed || input.reflected
      ? 'L'
      : 'N';

  const integrity: 'N' | 'L' | 'H' =
    input.executed || input.browserAlertTriggered || highDangerSink
      ? 'H'
      : input.reflected
        ? 'L'
        : 'N';

  const availability: 'N' | 'L' | 'H' =
    payload.includes('while(true)') || payload.includes('setinterval(')
      ? 'L'
      : 'N';

  return {
    attackVector: clientOnlySource ? 'N' : 'N',
    attackComplexity,
    privilegesRequired: 'N',
    userInteraction: 'R',
    scope,
    confidentiality,
    integrity,
    availability,
  };
}

function calculateCvssScores(vector: CvssVector): {
  baseScore: number;
  impactSubScore: number;
  exploitabilitySubScore: number;
} {
  const iscBase =
    1 -
    (1 - CIA[vector.confidentiality]) *
      (1 - CIA[vector.integrity]) *
      (1 - CIA[vector.availability]);

  const impactSubScore =
    vector.scope === 'U'
      ? 6.42 * iscBase
      : 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15);

  const prWeights = vector.scope === 'U' ? PR_U : PR_C;
  const exploitabilitySubScore =
    8.22 *
    AV[vector.attackVector] *
    AC[vector.attackComplexity] *
    prWeights[vector.privilegesRequired] *
    UI[vector.userInteraction];

  if (impactSubScore <= 0) {
    return {
      baseScore: 0,
      impactSubScore: roundOneDecimal(Math.max(0, impactSubScore)),
      exploitabilitySubScore: roundOneDecimal(exploitabilitySubScore),
    };
  }

  const rawBase =
    vector.scope === 'U'
      ? Math.min(impactSubScore + exploitabilitySubScore, 10)
      : Math.min(1.08 * (impactSubScore + exploitabilitySubScore), 10);

  return {
    baseScore: roundUpOneDecimal(rawBase),
    impactSubScore: roundOneDecimal(impactSubScore),
    exploitabilitySubScore: roundOneDecimal(exploitabilitySubScore),
  };
}

function estimateExploitProbability(
  input: RiskInput,
  vector: CvssVector,
  baseScore: number,
): number {
  const reachability = vector.attackVector === 'N' ? 0.95 : 0.65;
  const executionEvidence = input.executed
    ? 0.95
    : input.reflected && input.exactMatch
      ? 0.65
      : input.reflected
        ? 0.45
        : 0.25;
  const complexity = vector.attackComplexity === 'L' ? 0.9 : 0.45;
  const userInteraction = vector.userInteraction === 'N' ? 0.9 : 0.65;
  const scorePressure = Math.max(0.1, baseScore / 10);

  return roundProbability(
    reachability *
      executionEvidence *
      complexity *
      userInteraction *
      scorePressure,
  );
}

function severityFromCvss(score: number): VulnSeverity {
  if (score >= 9) return VulnSeverity.CRITICAL;
  if (score >= 7) return VulnSeverity.HIGH;
  if (score >= 4) return VulnSeverity.MEDIUM;
  if (score > 0) return VulnSeverity.LOW;
  return VulnSeverity.INFO;
}

function vectorToString(vector: CvssVector): string {
  return [
    'CVSS:3.1',
    `AV:${vector.attackVector}`,
    `AC:${vector.attackComplexity}`,
    `PR:${vector.privilegesRequired}`,
    `UI:${vector.userInteraction}`,
    `S:${vector.scope}`,
    `C:${vector.confidentiality}`,
    `I:${vector.integrity}`,
    `A:${vector.availability}`,
  ].join('/');
}

function roundUpOneDecimal(value: number): number {
  return Math.ceil(value * 10) / 10;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundProbability(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

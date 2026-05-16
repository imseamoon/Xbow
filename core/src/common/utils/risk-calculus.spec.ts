import { VulnSeverity, VulnType } from '../interfaces/vuln.interface';
import { calculateRisk, deriveCvssVector } from './risk-calculus';

describe('risk-calculus', () => {
  it('calculates CVSS-inspired and expected-loss fields for confirmed XSS', () => {
    const result = calculateRisk({
      type: VulnType.REFLECTED_XSS,
      severity: VulnSeverity.CRITICAL,
      reflected: true,
      executed: true,
      payload: '<script>fetch("/x?c="+document.cookie)</script>',
      source: 'url_param',
      sink: 'script',
      exactMatch: true,
      browserAlertTriggered: true,
    });

    expect(result.model).toBe('cvss_v3_1_inspired_expected_loss');
    expect(result.cvssVectorString).toContain('CVSS:3.1/AV:N');
    expect(result.cvssBaseScore).toBeGreaterThanOrEqual(7);
    expect(result.exploitProbability).toBeGreaterThan(0);
    expect(result.singleLossExpectancy).toBeGreaterThan(0);
    expect(result.annualizedLossExpectancy).toBeGreaterThan(0);
    expect(result.assumptions.notes[0]).toContain('report-layer');
  });

  it('keeps reflected-only findings lower confidence than executed findings', () => {
    const reflectedOnly = calculateRisk({
      type: VulnType.REFLECTED_XSS,
      severity: VulnSeverity.HIGH,
      reflected: true,
      executed: false,
      payload: '<img src=x onerror=alert(1)>',
      source: 'url_param',
      sink: 'attribute',
      exactMatch: false,
      browserAlertTriggered: false,
    });
    const executed = calculateRisk({
      type: VulnType.REFLECTED_XSS,
      severity: VulnSeverity.HIGH,
      reflected: true,
      executed: true,
      payload: '<img src=x onerror=alert(1)>',
      source: 'url_param',
      sink: 'attribute',
      exactMatch: true,
      browserAlertTriggered: true,
    });

    expect(reflectedOnly.exploitProbability).toBeLessThan(
      executed.exploitProbability,
    );
  });

  it('derives higher impact for sensitive payloads', () => {
    const vector = deriveCvssVector({
      type: VulnType.DOM_XSS,
      severity: VulnSeverity.CRITICAL,
      reflected: true,
      executed: true,
      payload: 'localStorage.getItem("token")',
      source: 'URLSearchParams',
      sink: 'eval',
    });

    expect(vector.scope).toBe('C');
    expect(vector.confidentiality).toBe('H');
    expect(vector.integrity).toBe('H');
  });
});

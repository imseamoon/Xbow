#!/usr/bin/env python3
"""
Validation test for XSS Game Level 2 lab
Verifies which payloads actually work vs what RedSentinel reports

Lab URL: https://xss-game.appspot.com/level2/frame
Vulnerability: Stored XSS via innerHTML rendering of textarea content

Test Case Analysis:
- Input field: content (textarea)
- Vulnerability type: Stored XSS (user input saved and rendered to all users)
- How it works: JavaScript constructs HTML string with user input, assigns to innerHTML
- Expected working payloads: Any HTML/script that executes when rendered

Initial Findings:
- RedSentinel reported: <svg onload=alert()> ✓ (first scan)
- RedSentinel now reports: <SVg ONLoAD=ALERt()> ✓ (case variation, confirmed)
- Actual lab solution: <img src=x onerror=alert()> (what solves the challenge)

Question: Are we finding false positives or missing the correct payload?
"""

import json
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


class Level2ValidationTest:
    """Test RedSentinel's accuracy on XSS Game Level 2"""
    
    def __init__(self):
        self.lab_url = "https://xss-game.appspot.com/level2/frame"
        self.vulnerability_type = "Stored XSS"
        self.input_field = "content"
        self.rendering_method = "innerHTML"
        
    def analyze_payload_effectiveness(self):
        """Analyze which payloads work on this lab"""
        
        print("=" * 70)
        print("XSS GAME LEVEL 2 - PAYLOAD EFFECTIVENESS ANALYSIS")
        print("=" * 70)
        print(f"\nLab: {self.lab_url}")
        print(f"Vulnerability: {self.vulnerability_type}")
        print(f"Input Field: {self.input_field}")
        print(f"Rendering: {self.rendering_method}")
        
        # Payloads to analyze
        payloads = {
            "svg_lowercase": {
                "payload": "<svg onload=alert()>",
                "reported_by_redsent": "first_scan",
                "expected_result": "SHOULD WORK (innerHTML accepts SVG)"
            },
            "svg_case_variant": {
                "payload": "<SVg ONLoAD=ALERt()>",
                "reported_by_redsent": "current_scan (CONFIRMED)",
                "expected_result": "SHOULD WORK (case-insensitive)"
            },
            "img_onerror": {
                "payload": "<img src=x onerror=alert()>",
                "reported_by_redsent": "NOT FOUND",
                "expected_result": "WORKS (confirmed by user - solves lab)"
            },
            "svg_onload_alert": {
                "payload": "<svg onload=alert(1)>",
                "reported_by_redsent": "likely found",
                "expected_result": "SHOULD WORK (variant)"
            }
        }
        
        print("\n" + "=" * 70)
        print("PAYLOAD EFFECTIVENESS MATRIX")
        print("=" * 70)
        print(f"\n{'Payload':<40} {'ReportedBy':<20} {'Expected':<25}")
        print("-" * 85)
        
        for key, info in payloads.items():
            print(f"{info['payload']:<40} {info['reported_by_redsent']:<20} {info['expected_result']:<25}")
        
        # Root cause analysis
        print("\n" + "=" * 70)
        print("ROOT CAUSE ANALYSIS")
        print("=" * 70)
        
        print("\nTheory 1: FALSE POSITIVES")
        print("-" * 70)
        print("Scenario: We're reporting <svg> payloads but they DON'T actually work")
        print("Evidence: User says lab is solved with <img>, not <svg>")
        print("Problem: Our fuzzer might be detecting HTML injection but not execution")
        print("Impact: We report payloads that don't execute JavaScript")
        
        print("\nTheory 2: INCOMPLETE DISCOVERY")
        print("-" * 70)
        print("Scenario: We find <svg> payloads correctly but miss <img> payloads")
        print("Evidence: User found <img src=x onerror=alert()> works, we didn't report it")
        print("Problem: Our fuzzer payload generation might not test <img> variants")
        print("Impact: We under-report vulnerabilities by missing valid payloads")
        
        print("\nTheory 3: BROWSER VERIFICATION ISSUES")
        print("-" * 70)
        print("Scenario: We find payloads but browser verification fails inconsistently")
        print("Evidence: Different runs report different payloads as 'confirmed'")
        print("Problem: DOM rendering timing, async execution, browser state")
        print("Impact: Inconsistent reporting - some runs confirm, others don't")
        
        # Recommended investigation
        print("\n" + "=" * 70)
        print("RECOMMENDED INVESTIGATION")
        print("=" * 70)
        print("""
1. TEST PAYLOAD EXECUTION
   ├─ Send each payload to the lab via API
   ├─ Use browser automation (Selenium) to verify execution
   └─ Record which payloads trigger alerts
   
2. COMPARE TO REDSENT FINDINGS
   ├─ Run RedSentinel fuzzer on this URL
   ├─ Check what payloads our fuzzer tests
   ├─ Verify browser verification results
   └─ Compare payload lists
   
3. ANALYZE FUZZER COVERAGE
   ├─ Check payload generation templates
   ├─ Verify we test both <svg> AND <img> variants
   ├─ Check event handler coverage
   └─ Verify source/sink detection
   
4. REVIEW BROWSER VERIFICATION
   ├─ Check if alerts are properly detected
   ├─ Verify timeout handling
   ├─ Check for timing issues
   └─ Validate consistency across runs
        """)
        
        # Findings summary
        print("\n" + "=" * 70)
        print("KEY FINDINGS")
        print("=" * 70)
        print("""
✓ BOTH <svg> and <img> payloads should work on Level 2
  (Both are valid HTML that execute via innerHTML)

⚠ Discrepancy: We report <svg> but lab is solved with <img>
  
Possible Issues:
  1. We're not testing <img src=x onerror> variants
  2. We're reporting false positives for <svg>
  3. Browser verification is inconsistent
  4. Payload verification timing is wrong
  
Next Step: Run fuzzer on this URL and compare results to ground truth
        """)
        
        return payloads
    
    def generate_test_plan(self):
        """Generate a test plan to validate Level 2"""
        
        test_plan = {
            "test_case": "xss-game-level2",
            "url": self.lab_url,
            "tests": [
                {
                    "id": "test_1",
                    "name": "SVG payload execution",
                    "payload": "<svg onload=alert()>",
                    "field": "content",
                    "expected": "Alert should trigger",
                    "actual": "NEED TO VERIFY"
                },
                {
                    "id": "test_2",
                    "name": "IMG onerror execution",
                    "payload": "<img src=x onerror=alert()>",
                    "field": "content",
                    "expected": "Alert should trigger (confirmed by user)",
                    "actual": "NEED TO VERIFY"
                },
                {
                    "id": "test_3",
                    "name": "Case sensitivity",
                    "payload": "<SVg ONLoAD=ALERt()>",
                    "field": "content",
                    "expected": "Alert should trigger (case-insensitive)",
                    "actual": "NEED TO VERIFY"
                },
                {
                    "id": "test_4",
                    "name": "HTML rendering confirmation",
                    "payload": "<img src=x onerror=alert('img-works')>",
                    "field": "content",
                    "expected": "Alert with 'img-works' should trigger",
                    "actual": "NEED TO VERIFY"
                }
            ]
        }
        
        return test_plan


def main():
    """Run the validation analysis"""
    test = Level2ValidationTest()
    payloads = test.analyze_payload_effectiveness()
    test_plan = test.generate_test_plan()
    
    print("\n" + "=" * 70)
    print("TEST PLAN GENERATED")
    print("=" * 70)
    print(json.dumps(test_plan, indent=2))
    
    print("\n" + "=" * 70)
    print("CONCLUSION")
    print("=" * 70)
    print("""
This test reveals a critical accuracy issue in RedSentinel:

FINDING: We report <svg onload=alert()> as the working payload
REALITY: The lab is solved with <img src=x onerror=alert()>

IMPLICATION: Either
1. Our payload generation is incomplete (missing <img> variants)
2. Our browser verification is inaccurate (reporting false positives)
3. Our fuzzer isn't correctly detecting execution

RECOMMENDATION: 
- Expand payload testing to include ALL viable HTML elements
- Implement cross-validation with multiple browser test approaches
- Add fuzzer accuracy metrics to training data collection
    """)


if __name__ == "__main__":
    main()

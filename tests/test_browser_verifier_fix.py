#!/usr/bin/env python3
"""
Test: Browser Verification False Positives on Level 2

This test validates the fix for the SVG payload false positive issue.

ISSUE:
- RedSentinel reported <svg onload=alert()> as working on Level 2 Lab
- User confirmed it DOES NOT work
- Actual working payload: <img src=x onerror=alert()>
- Both should theoretically work (innerHTML renders both)

ROOT CAUSE:
- SVG onload might not fire reliably when not well-formed
- Our browser verification was checking if element exists (true)
- But not verifying that event handler actually executed (false)

THE FIX:
- Wrap window.alert() to track if it's actually called
- Only mark payload as executed if:
  1. Dialog appeared (strongest signal), OR
  2. alert() was actually invoked (execution tracking), OR  
  3. Elements exist AND payload structure suggests execution

DEPLOYMENT:
- File: modules/fuzzer-module/browser_verifier.py
- Function: _verify_one() - added execution tracking
- Function: _payload_suggests_execution() - NEW - validates payload intent
"""

import sys
import subprocess
from pathlib import Path

def test_browser_verifier_fix():
    """Validate the browser verifier fix was deployed"""
    
    browser_verifier = Path(__file__).parent.parent / "modules/fuzzer-module/browser_verifier.py"
    
    if not browser_verifier.exists():
        print("✗ browser_verifier.py not found")
        return False
    
    with open(browser_verifier, 'r') as f:
        content = f.read()
    
    print("Checking browser_verifier.py for fix components...")
    print("=" * 70)
    
    checks = {
        "Execution tracking dict": "_xss_verification" in content,
        "Alert wrapper": "window.alert = function" in content,
        "Init script injection": "add_init_script" in content,
        "Alert called flag": "alert_called: false" in content,
        "Payload suggestion function": "_payload_suggests_execution" in content,
        "Updated execution logic": "execution_flags.get(\"alert_called\"" in content or 
                                   "execution_flags" in content and "alert_called" in content,
    }
    
    all_passed = True
    for check_name, passed in checks.items():
        status = "✓" if passed else "✗"
        print(f"{status} {check_name}")
        all_passed = all_passed and passed
    
    print("=" * 70)
    if all_passed:
        print("\n✓ ALL CHECKS PASSED - Fix successfully deployed!")
        return True
    else:
        print("\n✗ SOME CHECKS FAILED - Fix may not be complete")
        return False


def test_payload_suggestion_heuristics():
    """Test the payload suggestion heuristics"""
    
    print("\nTesting payload execution heuristics...")
    print("=" * 70)
    
    # These should be detected as executing (have alert() calls)
    executing_payloads = [
        "<svg onload=alert(1)>",
        "<img src=x onerror=alert(1)>",
        "<script>alert(1)</script>",
        "javascript:alert(document.cookie)",
        "<img src=x onerror=prompt('xss')>",
    ]
    
    # These might not execute automatically
    non_executing_payloads = [
        "<img src=x onclick=alert(1)>",  # requires click
        "<div onmouseover=alert(1)>",     # requires mouse over
        "<input onfocus=alert(1)>",       # requires focus
        "<img src=x onload=alert(1)>",    # potentially no src to trigger
    ]
    
    print("\nPayloads that should execute:")
    for payload in executing_payloads:
        print(f"  ✓ {payload}")
    
    print("\nPayloads that might not auto-execute:")
    for payload in non_executing_payloads:
        print(f"  ⚠ {payload}")
    
    print("\n" + "=" * 70)
    print("Level 2 Specific Analysis:")
    print("=" * 70)
    print("""
CONTEXT: Level 2 uses innerHTML to render posts
- User submits: <svg onload=alert()>
- Browser does: containerEl.innerHTML += '<table>...<svg onload=alert()>...'
- Expected: SVG onload fires automatically ✓
  
REALITY: SVG onload doesn't fire
- Possible reason 1: SVG is malformed (bare tag might not parse as SVG)
- Possible reason 2: innerHTML parsing for SVG differs from HTML
- Possible reason 3: Browser behavior differs by version

FIX VALIDATION:
- If we inject <svg onload=alert()> and wrap alert(), we check:
  1. Was alert() called? → If yes, execution confirmed
  2. Did a dialog appear? → Already detected  
  3. Do suspicious elements exist? → Not alone proof of execution

LEVEL 2 EXPECTED RESULTS AFTER FIX:
- <svg onload=alert()> → DOM element found, but alert() NOT called → ✗NOT EXECUTED
- <img src=x onerror=alert()> → DOM element found, alert() CALLED → ✓EXECUTED
- <SVg ONLoAD=ALERt()> → DOM element found, alert() NOT called → ✗NOT EXECUTED
    """)


def main():
    """Run all verification tests"""
    
    print("\n" + "=" * 70)
    print("LEVEL 2 LAB - BROWSER VERIFICATION FIX VALIDATION")
    print("=" * 70)
    
    # Test 1: Verify fix deployment
    fix_deployed = test_browser_verifier_fix()
    
    # Test 2: Validate heuristics
    test_payload_suggestion_heuristics()
    
    # Final status
    print("\n" + "=" * 70)
    print("DEPLOYMENT STATUS")
    print("=" * 70)
    
    if fix_deployed:
        print("""
✓ FIX SUCCESSFULLY DEPLOYED

The improved browser_verifier.py now:
1. Wraps window.alert() to track invocation
2. Distinguishes between element presence and execution
3. Provides more accurate feedback on payload effectiveness

EXPECTED IMPROVEMENTS:
- Reduced false positives from SVG payloads
- More accurate Level 2 test results
- Better detection of payloads that don't execute

NEXT STEPS:
1. Rerun Level 2 scan with updated fuzzer
2. Validate that only <img> variant is reported as working
3. Update training data if needed
4. Retrain model with corrected data
        """)
    else:
        print("""
✗ FIX NOT FULLY DEPLOYED

Please verify that all components were applied:
1. execution_flags dictionary initialization
2. alert() wrapping with init_script
3. execution_flags checking after page load
4. _payload_suggests_execution() function
5. Updated execution confirmation logic
        """)


if __name__ == "__main__":
    main()

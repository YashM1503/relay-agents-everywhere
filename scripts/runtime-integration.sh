#!/usr/bin/env bash
# End-to-end runtime integration against a running RELAY Next.js server.
set -euo pipefail

BASE="${RELAY_BASE_URL:-http://127.0.0.1:3000}"
FAIL=0

pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; FAIL=1; }

json_get() {
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"
}

echo "RELAY runtime integration"
echo "Base URL: $BASE"
echo

# Health: home page
if curl -sf "$BASE/" -o /dev/null; then
  pass "GET / (home)"
else
  fail "GET / (home)"
fi

# 1. Create session
SESSION_RESP=$(curl -sf -X POST "$BASE/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{"demo":true}') || { fail "POST /api/sessions"; echo "$FAIL"; exit 1; }
SESSION_ID=$(echo "$SESSION_RESP" | json_get sessionId)
if [[ -n "$SESSION_ID" && "$SESSION_ID" != "" ]]; then
  pass "POST /api/sessions → sessionId=$SESSION_ID"
else
  fail "POST /api/sessions (no sessionId)"
fi

# 2. Observe QR
OBSERVE=$(curl -sf -X POST "$BASE/api/sessions/$SESSION_ID/observe" \
  -H "Content-Type: application/json" \
  -d '{"type":"qr","value":"demo-clinic-registration"}') || fail "POST observe"
if echo "$OBSERVE" | grep -q "Clinic registration"; then
  pass "POST observe → task recognized"
else
  fail "POST observe → task not recognized"
fi

# 3. Answer guided questions
for pair in "dob:1948-03-12" "emergency_contact:Alex Brooks" "sms_reminders:Yes" "reason_for_visit:Annual checkup"; do
  QID="${pair%%:*}"
  ANS="${pair#*:}"
  curl -sf -X POST "$BASE/api/sessions/$SESSION_ID/answer" \
    -H "Content-Type: application/json" \
    -d "{\"questionId\":\"$QID\",\"answer\":\"$ANS\"}" > /dev/null \
    && pass "POST answer → $QID" \
    || fail "POST answer → $QID"
done

# 4. Capture insurance front
curl -sf -X POST "$BASE/api/sessions/$SESSION_ID/capture" \
  -H "Content-Type: application/json" \
  -d '{"side":"front","image":"data:image/jpeg;base64,front"}' > /dev/null \
  && pass "POST capture → front" \
  || fail "POST capture → front"

# 5. Capture back (first attempt — demo error)
BACK1=$(curl -sf -X POST "$BASE/api/sessions/$SESSION_ID/capture" \
  -H "Content-Type: application/json" \
  -d '{"side":"back","image":"data:image/jpeg;base64,back1"}') || fail "POST capture → back1"
if echo "$BACK1" | grep -qi "other side\|DOCUMENT_SIDE"; then
  pass "POST capture → back1 triggers recovery error"
else
  fail "POST capture → back1 expected demo error"
fi

# 6. Capture back (retry)
curl -sf -X POST "$BASE/api/sessions/$SESSION_ID/capture" \
  -H "Content-Type: application/json" \
  -d '{"side":"back","image":"data:image/jpeg;base64,back2"}' > /dev/null \
  && pass "POST capture → back2 success" \
  || fail "POST capture → back2"

# 7. Propose action
PROPOSE=$(curl -sf -X POST "$BASE/api/actions/propose" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"action\":\"submitRegistration\"}") || fail "POST propose"
ACTION_ID=$(echo "$PROPOSE" | json_get actionId)
if [[ -n "$ACTION_ID" && "$ACTION_ID" != "" ]]; then
  pass "POST propose → actionId=$ACTION_ID"
else
  fail "POST propose (no actionId)"
fi

# 8. Evaluate COUNTERSIGN
EVAL=$(curl -sf -X POST "$BASE/api/actions/$ACTION_ID/evaluate") || fail "POST evaluate"
if echo "$EVAL" | grep -q "confirm\|allow\|hold"; then
  pass "POST evaluate → COUNTERSIGN verdict"
else
  fail "POST evaluate → no verdict"
fi

# 9. Confirm
curl -sf -X POST "$BASE/api/actions/$ACTION_ID/confirm" > /dev/null \
  && pass "POST confirm" \
  || fail "POST confirm"

# 10. Execute
EXEC=$(curl -sf -X POST "$BASE/api/actions/$ACTION_ID/execute") || fail "POST execute"
CODE=$(echo "$EXEC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('receipt',{}).get('confirmationCode',''))" 2>/dev/null || echo "")
if echo "$CODE" | grep -q "DEMO-"; then
  pass "POST execute → receipt $CODE"
else
  fail "POST execute → no confirmation code"
fi

# 11. Session state
STATE=$(curl -sf "$BASE/api/sessions/$SESSION_ID/state") || fail "GET state"
if echo "$STATE" | grep -q "complete\|receipt"; then
  pass "GET state → complete"
else
  fail "GET state → not complete"
fi

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "RUNTIME INTEGRATION: PASS"
  exit 0
else
  echo "RUNTIME INTEGRATION: FAIL"
  exit 1
fi

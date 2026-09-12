# Test Plan

## Happy path
- task correctly identified
- known profile fields reused
- missing fields requested
- front/back insurance captured
- user confirms
- form submitted
- receipt shown

## Functional edge cases
1. user says “stop” mid-session
2. user changes answer
3. model timeout
4. image unreadable
5. QR points to wrong domain
6. required field missing
7. document/profile conflict
8. appointment slot disappears
9. tool error
10. duplicate submit request

## COUNTERSIGN tests
- Tier 0 explanation auto-runs
- Tier 2 form submission requires confirmation
- Tier 3 money action never auto-runs
- rejection prevents action
- confirmation applies only to displayed payload
- payload change after confirmation triggers re-confirmation

## Accessibility tests
- browser zoom 200%
- keyboard-only
- screen-reader labels
- voice-only major path
- no tiny tap targets
- no color-only state
- understandable errors

## Privacy tests
- ending session stops capture
- raw microphone recording not retained by default
- only minimum task data sent to model
- trusted contact has no silent access
- receipts minimize sensitive detail

## Demo reliability
The exact demo must pass 3 consecutive times before feature work resumes.

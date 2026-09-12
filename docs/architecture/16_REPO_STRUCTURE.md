# Suggested Repository Structure

```text
relay/
  app/
    page.tsx
    session/
    receipt/
    preferences/
  components/
    HomeActions.tsx
    ActiveSession.tsx
    CameraCapture.tsx
    VoiceCapture.tsx
    QuestionCard.tsx
    CountersignCard.tsx
    ReceiptCard.tsx
  lib/
    api.ts
    accessibility.ts
    session.ts
  server/
    agents/
      registry.ts
      router.ts
      adapters/
    countersign/
      policy.ts
      evaluate.ts
    tools/
      profile.ts
      demoForm.ts
      calendar.ts
    state/
      sessionStore.ts
  api/
    sessions/
    router/
    actions/
  data/
    demo/
  tests/
  README.md
```

Keep one repo. Avoid microservices during the hackathon.

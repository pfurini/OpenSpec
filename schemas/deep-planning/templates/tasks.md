<!-- The TDD wave map. Value-ordered vertical slices. Checkboxes appear at WAVE grain ONLY
     (the parser counts every `- [ ]` as a progress unit). Per-wave detail uses plain `-`
     bullets; the coverage map uses a table. No scope-reduction language. -->

Each `## Wave N` is one fresh-session vertical slice, proven test-first. The single
`- [ ]` per wave is the only progress tick and means "wave gate passed".

## Coverage map

<!-- TRANSCRIBE the Layer column from design's Testing Approach - do not choose layers here.
     The Named test column is the only new content. -->

| Scenario | Layer | Named test | Wave |
|----------|-------|------------|------|
| `<capability/scenario>` | unit/integration/component/e2e | `<path::test name>` | 0 |

## Wave 0
<!-- Tracer bullet: one failing end-to-end happy-path test + scaffolds for missing test infra. Committed RED. -->

- [ ] <!-- observable-value goal, e.g. "skeleton wired end to end; happy-path e2e exists (RED)" -->
- components: <!-- units touched, from design -->
- interfaces: <!-- from design -->
- depends-on: —
- stamps: `size:S` `risk:low` `plannerTier:medium` `implTier:small`
- skills: <!-- SKILL.md paths, incl. project test-strategy skill -->
- acceptance: <!-- command(s) that prove the wave -->

## Wave 1

- [ ] <!-- observable-value goal -->
- components: <!-- ... -->
- interfaces: <!-- ... -->
- depends-on: Wave 0
- stamps: `size:M` `risk:med` `plannerTier:large` `implTier:medium`
- skills: <!-- ... -->
- acceptance: <!-- ... -->

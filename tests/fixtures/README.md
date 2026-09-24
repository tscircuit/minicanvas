# PCB fixture provenance

These are rendering fixtures, not electrically validated reference designs. Published routing/DRC diagnostics are retained.

## RP2040 motor controller

- Author: imrishabh18
- Source: https://tscircuit.com/imrishabh18/rp2040-motor-controller#files
- Release: v1.0.21, `d147f457-53fb-444e-9fa7-85ee390784e8`
- Published artifact: `dist/index/circuit.json`
- File ID: `c5e0f0d9-b79d-46a7-afbf-9589f53bebfd`
- Retrieval: https://api.tscircuit.com/package_files/get?package_file_id=c5e0f0d9-b79d-46a7-afbf-9589f53bebfd
- Retrieved 2026-09-24; `content_text` parsed and serialized as compact JSON without changing elements.
- 93 PCB components, 290 SMT pads, 221 traces, 175 vias, 45 copper pours, 20 plated holes, 4 mounting holes, and 88 silkscreen text elements.

## Arduino Uno

- Source: https://github.com/tscircuit/circuit-json-to-gltf/blob/654fa7133c32978597a24960fb3007bbce25890b/tests/fixtures/arduino-uno.circuit.json
- Copied unchanged from that repository's test fixture.
- 28 PCB components, 94 SMT pads, 113 traces, 144 vias, 44 plated holes, 4 mounting holes, and 59 silkscreen text elements.

## Feature board

`feature-board.ts` is a typed, local Circuit JSON rendering coupon. It covers rotated rounded rectangles, pill and polygon pads, negative/positive soldermask margins, oval drills, rounded rotated and polygon cutouts, tented/exposed vias, text/ovals, and BRep copper pours with curved inner rings. It is not a routed electrical design.

## Fixture checksums

SHA-256 of the checked-in files:

- `rp2040-motor-controller.json`: `16f06e75a0a1f0e1403d4c974805fc3dee47500108c44980a6d5e74f354ad3dc`
- `arduino-uno.json`: `d4be4fad8cc8e3fa7fffcac0f6e240a4ff89ecedd5d603f7a1f6a2aa90fb525f`

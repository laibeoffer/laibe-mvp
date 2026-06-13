# Plan Puzzle Target Loop 2 Browser Evidence

## Browser Run 1

- validation URL: http://127.0.0.1:50520/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=target-loop-2-door-window-opening
- browser: Headless Chrome via CDP fallback
- viewport: 1440x900
- bodyScrollHeight: 1188
- canvas rect: x 287, y 374.296875, width 791, height 439
- consoleErrorCount: 0
- .pc production export disabled: true

### Run 1 Evidence

- no-wall add-door:
  - clicked: true
  - openingsDom: 0
  - exported walls: 0
  - exported openings: []
- door placement:
  - controls present: offset, width, swing, delete
  - exported kind: door
  - offset: 1050
  - width: 900
  - swing: left
- door offset:
  - offset changed to 400
  - exported offset: 400
- door swing:
  - swing changed to right
  - exported swing: right
- door delete:
  - exported walls: 1
  - exported openings: []
- window placement:
  - exported kind: window
  - offset: 900
  - width: 1200
  - sillHeight: 900
- window offset:
  - offset changed to 500
  - exported offset: 500
- opening kind conversion:
  - kind changed to opening
  - exported kind: opening
- opening delete:
  - exported walls: 1
  - exported openings: []

## Browser Run 2

- validation URL: http://127.0.0.1:50540/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=target-loop-2-width-direct-opening
- browser: Headless Chrome via CDP fallback
- viewport: 1440x900
- bodyScrollHeight: 1188
- canvas rect: x 287, y 374.296875, width 791, height 439
- consoleErrorCount: 0
- .pc production export disabled: true

### Width Delta Evidence

- door default:
  - width: 900
  - swing: left
- door width adjusted:
  - fieldSet: true
  - exported width: 1000
- window default:
  - width: 1200
  - offset: 900
  - sillHeight: 900
- window width / offset adjusted:
  - fieldSet: true
  - exported width: 900
  - exported offset: 650
- direct opening placement:
  - data-opening-kind="opening" clicked: true
  - exported kind: opening
  - exported offset: 1000
  - exported width: 1000
- direct opening delete:
  - exported walls: 1
  - exported openings: []

## JSON Evidence Summary

Candidate JSON snapshots repeatedly contained:
- walls
- openings
- scale
- importSource
- wallGraph
- nodeGraph
- plancraftBridge

This remains candidate/mock data and is not a formal estimate or .pc production export.


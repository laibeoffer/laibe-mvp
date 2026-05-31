# Plan Puzzle Import Flow

Status: `CONTRACT_ONLY`

GitHub operating path acknowledged: Yes

## Flow

1. `not_started`
   - User has not imported a base plan.
   - Required prompt: import PNG / JPG, or use PDF interface with unsupported-preview warning.

2. `image_imported`
   - PNG / JPG is loaded as underlay.
   - Underlay may be moved or visually checked.
   - No drawing should be treated as calibrated quantity yet.

3. `pdf_interface_only`
   - PDF file selection is accepted only as an interface signal.
   - Current runtime should explain that direct PDF preview/calibration is not supported.
   - User should convert PDF to PNG / JPG before calibration.

4. `calibration_pending`
   - User must choose a known-length line.
   - Scale remains unverified.

5. `scale_set_placeholder`
   - Scale has been set by user action.
   - It is still a user-provided calibration result, not an official measurement.

6. `walls_in_progress`
   - User draws wall segments after scale is set.
   - Wall length can be exported as candidate context only.

7. `openings_in_progress`
   - User marks doors, windows, or wall openings on selected wall edges.
   - Opening counts are candidate context only.

8. `zones_in_progress`
   - User labels zones and optionally assigns boundary edges.
   - Zone area is candidate context only.

9. `facts_placeholder_ready`
   - The page or export may produce placeholder `PlanPuzzleQuantityFacts`.
   - `quantity_context_status` must stay `placeholder` or `linked` until manually verified.

## Required User Prompts

- Import PNG / JPG first.
- PDF interface exists, but direct preview is not supported yet.
- Calibrate before drawing walls.
- Draw walls before placing openings.
- Assign zone boundaries before trusting zone area readouts.
- Export facts only as placeholder context for later review.

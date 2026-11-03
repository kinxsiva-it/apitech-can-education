# EV IPMSM view configurations

Native model: ev-ipmsm-motor.sc. Exactly one underlying motor model, 63 components.

## Coordinate system and baseline

- Millimetres; longitudinal X axis; Z up.
- All 63 occurrence transforms are identity in the tested assembled baseline.
- Original component geometry is authored in world coordinates; do not recenter each mesh independently without compensating its placement.
- Export/web scale in metres: 0.001. Optional right-handed Y-up mapping: [x, y, z] -> [x, z, -y].

## Assembled View

Show all 63 components, clear section analysis, use assembled transforms. This is the saved model state.

## Cutaway View: visibility only

Hide these 21 bodies/components without deleting them:

- MotorHousing
- HousingAccessQuarter
- CoolingRib
- CoolingRib (2)
- CoolingRib (3)
- CoolingRib (4)
- CoolingRib (5)
- CoolingRib (6)
- CoolingRib (7)
- CoolingRib (8)
- CoolingRibAccess
- CoolingRibAccess (2)
- CoolingRibAccess (3)
- CoolingRibAccess (4)
- CoolingRibAccess (5)
- CoolingRibAccess (6)
- CoolingRibAccess (7)
- CoolingRibAccess (8)
- RearEndCover
- FrontEndCover
- FrontCoverAccessQuarter

This leaves 42 visible components. To reveal more of the rotor region and embedded magnets, additionally hide StatorAccessQuarter and RotorCore (40 visible components). Hidden rotor iron makes magnets appear unsupported; that is an educational isolation view, not a physical assembled configuration.

Optional non-destructive section settings already tested in SolidCraft:

- Longitudinal: inspect.section {plane: XZ, at: 0, flip: true, hatch: true}.
- Cross section: inspect.section {plane: YZ, at: 0, flip: false, hatch: false}.

Viewer clipping and cut-face caps must be implemented separately in a web viewer; native section display is not automatically an OBJ feature.

## Exploded Educational View: latest tested offsets

Apply deltas to assembled placements; never add repeatedly to the current animated placement.

| Group | Delta X | Delta Y | Delta Z (mm) |
|---|---:|---:|---:|
| Housing and cooling ribs | 0 | 0 | 0 |
| RearEndCover | -90 | 0 | 0 |
| RearBearing | -50 | 0 | 0 |
| All stator sections | 130 | 0 | 0 |
| All winding legs and both end-turn groups | 225 | 0 | 0 |
| RotorCore, DriveShaft, RotorShoulder, ShaftKey | 350 | 0 | 0 |
| All eight PermanentMagnet bodies | 460 | 0 | 0 |
| FrontBearing | 510 | 0 | 0 |
| FrontEndCover and FrontCoverAccessQuarter | 565 | 0 | 0 |
| MountingFoot | 0 | 0 | -45 |

45 components move; 18 housing/rib components stay fixed. All 63 components remained visible. Tested overall exploded bounds: X -150 to 625 mm, Y approximately -52 to +52 mm, Z -102 to +52 mm.

The exploded view shows assembly relationships, not a physically validated disassembly path. Magnets and windings are separated from their iron cores to make them visible.

Latest offsets above differ from older explodedDeltaMm values stored under native metadata com.example.evMotor. The companion component-metadata.json explicitly preserves the original native metadata and separately records latestTestedViews / testedExplodedDeltaMm. Use the latest tested values for future web work.

## Restore verification

The prior three-view test restored all 63 component occurrence records, body bounds and per-body volumes exactly to its baseline; total volume 711284.0794685573 mm³. No geometry was added, deleted or fused during that test.

## Limitations

- Copper end-turn overlaps with conductor legs represent intentional electrical joints.
- Bearings, winding connections, lamination stacks and magnetization are simplified.
- This save operation does not constitute a new exhaustive interference test or a production engineering validation.
- Keep component identities, materials, units and transforms during any future conversion. No OBJ, MTL, GLB or STL was exported for this save task.

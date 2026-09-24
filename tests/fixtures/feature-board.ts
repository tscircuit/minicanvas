import type { AnyCircuitElement } from "circuit-json"

/** Rendering coupon for geometry not guaranteed to appear in the routed boards. */
export const featureBoard: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 36,
    height: 28,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "rounded-slot",
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 9,
    height: 4,
    rotation: 25,
    corner_radius: 1,
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "triangle",
    shape: "polygon",
    points: [
      { x: 10, y: 0 },
      { x: 14, y: 0 },
      { x: 12, y: 4 },
    ],
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "oval-drill",
    hole_shape: "oval",
    x: -12,
    y: 0,
    hole_width: 4,
    hole_height: 2,
  },
]
for (const layer of ["top", "bottom"] as const) {
  featureBoard.push(
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: `pour-${layer}`,
      shape: "brep",
      layer,
      covered_with_solder_mask: true,
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -16, y: -12 },
            { x: 16, y: -12 },
            { x: 16, y: 12 },
            { x: -16, y: 12 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: -5, y: -5, bulge: 1 },
              { x: 5, y: -5, bulge: 1 },
            ],
          },
        ],
      },
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `rounded-${layer}`,
      shape: "rotated_rect",
      x: -10,
      y: 8,
      width: 5,
      height: 3,
      ccw_rotation: 30,
      corner_radius: 0.7,
      layer,
      soldermask_margin: -0.25,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `pill-${layer}`,
      shape: "rotated_pill",
      x: 0,
      y: 8,
      width: 6,
      height: 2,
      radius: 1,
      ccw_rotation: -25,
      layer,
      soldermask_margin: 0.3,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `poly-${layer}`,
      shape: "polygon",
      points: [
        { x: 9, y: 6 },
        { x: 14, y: 6 },
        { x: 13, y: 10 },
        { x: 10, y: 10 },
      ],
      layer,
    },
    {
      type: "pcb_silkscreen_oval",
      pcb_silkscreen_oval_id: `oval-${layer}`,
      pcb_component_id: "label",
      center: { x: -10, y: 8 },
      radius_x: 4,
      radius_y: 2.8,
      ccw_rotation: 30,
      layer,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: `text-${layer}`,
      pcb_component_id: "label",
      text: "CANVAS 2D",
      anchor_position: { x: 0, y: -10 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1.4,
      layer,
      ccw_rotation: 0,
    },
  )
}
featureBoard.push(
  {
    type: "pcb_via",
    pcb_via_id: "exposed",
    x: -12,
    y: -7,
    hole_diameter: 0.7,
    outer_diameter: 1.5,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "tented",
    x: 12,
    y: -7,
    hole_diameter: 0.7,
    outer_diameter: 1.5,
    layers: ["top", "bottom"],
    tented_on_top: true,
    tented_on_bottom: true,
  },
)

# Color Guide

## Goal

The UI needs to communicate several different meanings at once without making
the screen visually ambiguous:

- diff type: insert, delete, move, normal
- revision identity: revision 0, revision 1
- interaction state: selected, hovered, bulk-highlighted
- relationship state: move group, move partners

The key rule is to assign different visual channels to different meanings.

## Recommended Policy

- Use hue for diff type.
- Use layout and labels for revision identity.
- Use directional gradients sparingly for revision context in source panes.
- Use border or ring for selection and focus.
- Use underline or a side marker for move-group relationships.
- Use badges for metadata such as move ids.

## Diff Type

Reserve color hue for the four base diff kinds:

- `insert`: green or cyan
- `delete`: red
- `move`: amber or orange
- `plain`: neutral gray

This should be the primary color system for nodes, highlights, and source
fragments.

## Revision Identity

Do not spend another set of strong colors on revision identity if diff type is
already using hue.

Instead:

- `Revision 0`: fixed left placement, fixed label, fixed badge
- `Revision 1`: fixed right placement, fixed label, fixed badge
- `Revision 0` source pane: left-aligned header text
- `Revision 1` source pane: right-aligned header text
- source panes may use stronger opposing horizontal gradients to reinforce
  revision directionality, using the site background color as the tinted side
  and fading into the existing pane background
- revision-linked hyperlink pills may reuse those same opposing gradients for
  quick directional recognition in the tree and navigation UI

Revision identity should come from structure and labeling first, not from a
second competing highlight palette. The directional gradient is a supporting
cue, not the primary meaning carrier.

## Interaction State

Use emphasis styles rather than new semantic colors:

- `selected`: stronger border or ring plus a subtle glow
- `hovered`: lighter border or small background lift
- `bulk highlighted`: soft background wash

This keeps interaction state separate from diff meaning.

## Move Relationships

Use a different visual channel for relationship semantics:

- `move group`: underline, left rail, or pill marker with shared id
- active move group: same move hue, but stronger border or thicker underline
- individual moved node: normal move color

This avoids forcing move membership and move selection to fight for the same
background treatment.

## Practical Mapping

- background tint: diff kind
- opposing pane gradient: revision context in source panes only
- directional gradient pill: revision-linked navigation targets such as `r0`
  and `r1`
- border or ring: selected or focused state
- underline: move relationship or group membership
- bold text: current primary target only
- badge or pill: metadata like `move=12`, `r0`, `r1`

## What To Avoid

- Do not use one color to mean both diff type and revision.
- Do not let revision gradients overpower diff colors inside highlighted text.
- Do not use bold for multiple overlapping states.
- Do not rely only on background color; pair it with shape or typography.
- Do not make normal nodes visually loud.

## Suggested System

Define the UI in four layers:

1. Semantic colors for `insert`, `delete`, `move`, and `plain`
2. Structural labels for `revision 0` and `revision 1`
3. Directional pane treatment for revision context where needed
4. Interaction styles for `selected`, `hovered`, and `highlighted`
5. Relationship styles for `move group` and `move partners`

If this policy is followed consistently, the interface should stay readable
even when several states are visible at once.

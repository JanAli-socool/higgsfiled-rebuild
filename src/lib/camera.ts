// Camera moves are #tokens the user can type or insert into a prompt.
// We store and show the prompt with tokens; the provider gets the expanded text.

export type CameraMove = { token: string; label: string; hint: string; fragment: string };

export const CAMERA_MOVES: CameraMove[] = [
  { token: "push-in", label: "Push in", hint: "Slowly move toward the subject", fragment: "slow dolly push-in toward the subject" },
  { token: "pull-out", label: "Pull out", hint: "Reveal the wider scene", fragment: "slow dolly pull-out revealing the wider scene" },
  { token: "pan-left", label: "Pan left", hint: "Sweep the frame to the left", fragment: "smooth camera pan to the left" },
  { token: "pan-right", label: "Pan right", hint: "Sweep the frame to the right", fragment: "smooth camera pan to the right" },
  { token: "tilt-up", label: "Tilt up", hint: "Look up from the ground", fragment: "camera tilts up from the ground to the sky" },
  { token: "orbit", label: "Orbit", hint: "Circle around the subject", fragment: "camera orbits around the subject in a smooth arc" },
  { token: "crane-up", label: "Crane up", hint: "Rise high above the scene", fragment: "camera cranes up high above the scene" },
  { token: "handheld", label: "Handheld", hint: "Loose, documentary feel", fragment: "handheld camera with subtle natural shake" },
];

const TOKEN_RE = /#([a-z][a-z-]*)/g;

export function findMoves(prompt: string): CameraMove[] {
  const seen: CameraMove[] = [];
  for (const [, token] of prompt.matchAll(TOKEN_RE)) {
    const move = CAMERA_MOVES.find((m) => m.token === token);
    if (move && !seen.includes(move)) seen.push(move);
  }
  return seen;
}

// "a lighthouse #push-in #orbit" -> "a lighthouse. Camera: slow dolly push-in…, then camera orbits…"
// Order is kept, because the order of moves is the order of the shot.
export function expandPrompt(prompt: string): string {
  const moves = findMoves(prompt);
  const base = prompt.replace(TOKEN_RE, (whole, token) => (CAMERA_MOVES.some((m) => m.token === token) ? "" : whole));
  const clean = base.replace(/\s{2,}/g, " ").trim();
  if (!moves.length) return clean;
  return `${clean}. Camera: ${moves.map((m) => m.fragment).join(", then ")}.`;
}

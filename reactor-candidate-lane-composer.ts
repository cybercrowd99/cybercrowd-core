// FILE: reactor-candidate-lane-composer.ts
// CyberCrowd Core
// Reactor Room Candidate Lane Composer
//
// One rock.
// One object.
// One movement.
// One function.
// One entrance.
// One exit.
// One actual end.
//
// PURPOSE:
//
// Receive returned Reactor Room candidate envelopes
// and place them into declared presentation lanes.
//
// It answers only:
//
// "How should these returned candidates be grouped
// for the next response stage?"
//
// Candidate doctrine:
//
// FOUND != TRUE
// MATCH != AUTHORITY
// RANK != TRUTH
// POPULAR != CORRECT
//
// This organ does NOT rank candidates.
//
// This organ does NOT declare truth.
//
// This organ does NOT authorize movement.
//
// This organ does NOT execute search,
// classification, archive, data, live,
// financial, or governance functions.
//
// AVAILABLE LANES:
//
// - DIRECT
// - GEOGRAPHIC
// - CATEGORY
// - CHRONOLOGICAL
// - SOURCE_SELECTED
// - USER_FILTERED
//
// NON-ALGORITHMIC RULE:
//
// A candidate may be placed according to
// explicit structural context without being
// popularity-ranked or algorithmically promoted.
//
// BLEED RULE:
//
// Lane placement does not grant authority.
//
// BLAST RULE:
//
// Placement applies only to the candidate
// collection provided to this composer.

export type ReactorCandidateLane =
  | "DIRECT"
  | "GEOGRAPHIC"
  | "CATEGORY"
  | "CHRONOLOGICAL"
  | "SOURCE_SELECTED"
  | "USER_FILTERED";

export interface ReactorCandidate<T = unknown> {
  reactorId: string;
  originOrgan: string;
  sourceReference: string;
  data: T;
  isAuthoritative: false;
  timestamp: number;
}

export interface ReactorLaneAssignment<T = unknown> {
  candidate: ReactorCandidate<T>;
  lanes: ReactorCandidateLane[];
}

export interface ReactorCandidateLaneResult<T = unknown> {
  ok: boolean;
  reactorId: string | null;
  direct: ReactorCandidate<T>[];
  geographic: ReactorCandidate<T>[];
  category: ReactorCandidate<T>[];
  chronological: ReactorCandidate<T>[];
  sourceSelected: ReactorCandidate<T>[];
  userFiltered: ReactorCandidate<T>[];
  reason: string;
}

export function composeReactorCandidateLanes<T = unknown>(
  assignments: ReactorLaneAssignment<T>[]
): ReactorCandidateLaneResult<T> {
  if (!Array.isArray(assignments)) {
    return {
      ok: false,
      reactorId: null,
      direct: [],
      geographic: [],
      category: [],
      chronological: [],
      sourceSelected: [],
      userFiltered: [],
      reason: "REACTOR_CANDIDATE_ASSIGNMENTS_REQUIRED"
    };
  }

  if (assignments.length === 0) {
    return {
      ok: true,
      reactorId: null,
      direct: [],
      geographic: [],
      category: [],
      chronological: [],
      sourceSelected: [],
      userFiltered: [],
      reason: "REACTOR_CANDIDATE_LANES_EMPTY"
    };
  }

  const reactorId = assignments[0]?.candidate?.reactorId;

  if (
    typeof reactorId !== "string" ||
    !reactorId.trim()
  ) {
    return {
      ok: false,
      reactorId: null,
      direct: [],
      geographic: [],
      category: [],
      chronological: [],
      sourceSelected: [],
      userFiltered: [],
      reason: "REACTOR_CANDIDATE_REACTOR_ID_REQUIRED"
    };
  }

  const direct: ReactorCandidate<T>[] = [];
  const geographic: ReactorCandidate<T>[] = [];
  const category: ReactorCandidate<T>[] = [];
  const chronological: ReactorCandidate<T>[] = [];
  const sourceSelected: ReactorCandidate<T>[] = [];
  const userFiltered: ReactorCandidate<T>[] = [];

  for (const assignment of assignments) {
    if (
      !assignment ||
      !assignment.candidate ||
      assignment.candidate.reactorId !== reactorId
    ) {
      return {
        ok: false,
        reactorId,
        direct: [],
        geographic: [],
        category: [],
        chronological: [],
        sourceSelected: [],
        userFiltered: [],
        reason: "REACTOR_CANDIDATE_ID_MISMATCH"
      };
    }

    if (!Array.isArray(assignment.lanes)) {
      return {
        ok: false,
        reactorId,
        direct: [],
        geographic: [],
        category: [],
        chronological: [],
        sourceSelected: [],
        userFiltered: [],
        reason: "REACTOR_CANDIDATE_LANES_REQUIRED"
      };
    }

    for (const lane of assignment.lanes) {
      switch (lane) {
        case "DIRECT":
          direct.push(assignment.candidate);
          break;

        case "GEOGRAPHIC":
          geographic.push(assignment.candidate);
          break;

        case "CATEGORY":
          category.push(assignment.candidate);
          break;

        case "CHRONOLOGICAL":
          chronological.push(assignment.candidate);
          break;

        case "SOURCE_SELECTED":
          sourceSelected.push(assignment.candidate);
          break;

        case "USER_FILTERED":
          userFiltered.push(assignment.candidate);
          break;

        default:
          return {
            ok: false,
            reactorId,
            direct: [],
            geographic: [],
            category: [],
            chronological: [],
            sourceSelected: [],
            userFiltered: [],
            reason: "REACTOR_CANDIDATE_LANE_NOT_RECOGNIZED"
          };
      }
    }
  }

  chronological.sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return {
    ok: true,
    reactorId,
    direct,
    geographic,
    category,
    chronological,
    sourceSelected,
    userFiltered,
    reason: "REACTOR_CANDIDATE_LANES_COMPOSED"
  };
}

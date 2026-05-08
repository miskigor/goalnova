import type { VideoAnalysisProvider } from "./videoAnalysisProvider";
import type {
  MetricAssessment,
  VisibilityAnalysisDraft,
  VisibilityAnalysisPayload,
  VideoAnalysisScores,
} from "./types";
import { overallFromAssessableMetrics } from "./visibilityAnalysis";

function hashToUnit(input: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(31, h) + input.charCodeAt(i);
  }
  return Math.abs(h % 1000) / 1000;
}

function scoreInRange(input: string, salt: number, min = 58, max = 92): number {
  const u = hashToUnit(input, salt);
  return Math.round(min + u * (max - min));
}

function confInRange(input: string, salt: number, min = 0.42, max = 0.92): number {
  const u = hashToUnit(input, salt);
  return Math.round((min + u * (max - min)) * 100) / 100;
}

function na(reason: string): MetricAssessment {
  return { status: "not_assessable", reason };
}

function ok(
  input: string,
  salt: number,
  evidence: string,
): MetricAssessment {
  return {
    status: "assessable",
    score: scoreInRange(input, salt),
    confidence: confInRange(input, salt + 20),
    evidence,
  };
}

/**
 * Deterministic visibility-first mock: clip understanding varies by `videoId`;
 * only visible/relevant metrics receive scores.
 */
export const mockVideoAnalysisProvider: VideoAnalysisProvider = {
  async analyzeVideo({ videoId }) {
    await new Promise((r) => setTimeout(r, 900));

    const scenario = Math.floor(hashToUnit(videoId, 0) * 8);

    if (scenario === 7) {
      const invalid: VideoAnalysisScores = {
        valid_for_football_analysis: false,
        clip_type: "non_football",
        invalid_reason:
          "No football action detected — the footage does not clearly show a ball, pitch, or football-specific movement.",
        overall_score: 0,
        overall_confidence: 0,
        feedback_text:
          "PitchRusch only scores football highlights. This clip appears to be non-football content (or the camera never shows enough football context). Upload a clip where both the player and the ball are clearly visible in a football setting.",
        visibility_analysis: null,
        legacy: null,
      };
      return invalid;
    }

    let draft: VisibilityAnalysisDraft;

    switch (scenario) {
      case 0: {
        draft = {
          schema_version: 1,
          clip_type: "training_drill",
          clip_summary:
            "Close-up footwork in a cone grid: repeated tight touches and changes of direction with the ball staying under control.",
          visible_actions: [
            "close_control",
            "dribbling",
            "ball_control",
            "training_drill",
          ],
          camera: {
            quality: "adequate",
            assessment_note:
              "The framing stays on feet and ball, which supports judging touches; upper-body and wider pitch context are mostly out of frame.",
          },
          metrics: {
            ball_control: ok(
              videoId,
              1,
              "Touches stay close to the foot through the turns shown in the clip.",
            ),
            close_control: ok(
              videoId,
              2,
              "Direction changes are executed without the ball running away in the visible sequence.",
            ),
            dribbling: ok(
              videoId,
              3,
              "Short bursts with the ball stay under the player in the drill pattern.",
            ),
            agility: ok(
              videoId,
              4,
              "Quick lateral shifts between cones are visible and look coordinated.",
            ),
            shooting: na("No strike or goal attempt appears in this footage."),
            passing: na("No pass to a teammate is visible."),
            finishing: na("No shot on goal or end product is shown."),
            decision_making: na(
              "No match context or passing options are visible to judge choices.",
            ),
            defending: na("No defending duel or recovery run appears."),
            acceleration: na(
              "Only short drill steps are visible, not an open-field sprint.",
            ),
            first_touch: na(
              "The clip does not show receiving a pass; touches are already in possession.",
            ),
            coordination: ok(
              videoId,
              5,
              "Foot rhythm matches the cone pattern in what we can see.",
            ),
            balance: ok(
              videoId,
              6,
              "The player stays upright through the cuts shown.",
            ),
            composure: na(
              "Pressure from opponents is not visible, so composure under challenge cannot be scored.",
            ),
          },
        };
        break;
      }
      case 1: {
        draft = {
          schema_version: 1,
          clip_type: "match_play",
          clip_summary:
            "Wide-angle match moment: player receives and drives forward, then a shot toward goal from outside the box.",
          visible_actions: [
            "match_play",
            "first_touch",
            "dribbling",
            "shooting",
            "acceleration",
          ],
          camera: {
            quality: "strong",
            assessment_note:
              "Wide shot shows approach and strike; some detail of foot placement at contact is limited by distance.",
          },
          metrics: {
            first_touch: ok(
              videoId,
              11,
              "First touch moves the ball into the run visible right after receipt.",
            ),
            dribbling: ok(
              videoId,
              12,
              "A short carry under pressure is visible before the strike.",
            ),
            acceleration: ok(
              videoId,
              13,
              "The player clearly accelerates into space in the clip.",
            ),
            shooting: ok(
              videoId,
              14,
              "A shot from range is visible; contact and ball flight can be partially judged.",
            ),
            finishing: ok(
              videoId,
              15,
              "End product (shot) is in frame; outcome vs keeper is only partly visible.",
            ),
            decision_making: ok(
              videoId,
              16,
              "Choosing to drive and shoot from this position is observable in the sequence.",
            ),
            agility: ok(
              videoId,
              17,
              "Sharp adjustment before the shot is visible.",
            ),
            ball_control: ok(
              videoId,
              18,
              "The ball stays in play through the carry shown.",
            ),
            passing: na("No pass is selected in the highlighted sequence."),
            defending: na("The player is in possession; no defending action to score."),
            close_control: na(
              "Emphasis is on line and shot, not sustained tight dribble in a grid.",
            ),
            coordination: ok(
              videoId,
              19,
              "Approach steps and strike timing appear linked in what we see.",
            ),
            balance: ok(
              videoId,
              20,
              "The player stays balanced through the shot motion visible.",
            ),
            composure: ok(
              videoId,
              21,
              "Execution under opponent proximity (visible) supports a composure read.",
            ),
          },
        };
        break;
      }
      case 2: {
        draft = {
          schema_version: 1,
          clip_type: "goalkeeper_training",
          clip_summary:
            "Keeper angle: diving save to the side after a shot from inside the area.",
          visible_actions: ["goalkeeper_action", "match_play", "shooting"],
          camera: {
            quality: "adequate",
            assessment_note:
              "Focus is on the keeper; the shooter is partly in frame. Outfield footwork detail is limited.",
          },
          metrics: {
            agility: ok(
              videoId,
              31,
              "Explosive dive and extension are visible.",
            ),
            coordination: ok(
              videoId,
              32,
              "Dive and hand contact with the ball line up in the clip.",
            ),
            balance: ok(
              videoId,
              33,
              "Landing and recovery from the dive are partly visible.",
            ),
            composure: na(
              "Keeper decision-making is partly inferable but not fully visible (distribution after save is cut).",
            ),
            shooting: na(
              "Strike mechanics belong to the shooter; this angle prioritizes the save.",
            ),
            finishing: na("Not scored from this keeper-centric framing."),
            passing: na("No passing action visible for the outfield player here."),
            dribbling: na("No dribble sequence for the keeper save clip."),
            ball_control: na("Outfield control is not the focus of this footage."),
            close_control: na("Not applicable to the save action shown."),
            first_touch: na("No reception focus in this clip."),
            acceleration: na("Short dive burst only; not a field sprint."),
            defending: na("No outfield defending duel."),
            decision_making: na(
              "Limited view of options before the shot limits decision scoring.",
            ),
          },
        };
        break;
      }
      case 3: {
        draft = {
          schema_version: 1,
          clip_type: "static_skills",
          clip_summary:
            "Juggling and aerial touches in place; no defenders or goal in view.",
          visible_actions: ["juggling", "ball_control", "coordination"],
          camera: {
            quality: "limited",
            assessment_note:
              "Single fixed angle and occasional blur reduce confidence on fine touch quality.",
          },
          metrics: {
            ball_control: ok(
              videoId,
              41,
              "Rhythm of touches while juggling is visible despite average clarity.",
            ),
            coordination: ok(
              videoId,
              42,
              "Repeated contacts show timing between foot and ball.",
            ),
            balance: ok(
              videoId,
              43,
              "The player stays centered through the juggling sequence shown.",
            ),
            composure: na("No pressure or game context appears."),
            dribbling: na("No ground dribble against space or opponents."),
            passing: na("No passes."),
            shooting: na("No strike."),
            finishing: na("No attempt on goal."),
            defending: na("No defending."),
            decision_making: na("No tactical choices visible."),
            acceleration: na("On-the-spot work only."),
            agility: na("Small hops only; not enough for a full agility read."),
            first_touch: na("Throws from hands / juggle, not a typical first touch reception."),
            close_control: ok(
              videoId,
              44,
              "Keeps the ball within a small vertical window in the frames we have.",
            ),
          },
        };
        break;
      }
      case 4: {
        draft = {
          schema_version: 1,
          clip_type: "one_v_one",
          clip_summary:
            "1v1 in a wide channel: attacker feints past a defender, then crosses.",
          visible_actions: [
            "one_v_one",
            "dribbling",
            "defending",
            "passing",
            "match_play",
          ],
          camera: {
            quality: "strong",
            assessment_note:
              "Both players and the ball stay in frame for the duel.",
          },
          metrics: {
            dribbling: ok(
              videoId,
              51,
              "Feint and lateral exit from the defender are visible.",
            ),
            agility: ok(
              videoId,
              52,
              "Sharp change of direction to beat the defender is clear.",
            ),
            defending: ok(
              videoId,
              53,
              "Defender stance and attempted tackle timing are visible.",
            ),
            passing: ok(
              videoId,
              54,
              "The cross after the beat is in frame.",
            ),
            decision_making: ok(
              videoId,
              55,
              "Choice to go outside then cross is observable.",
            ),
            ball_control: ok(
              videoId,
              56,
              "Ball stays under the attacker through the 1v1.",
            ),
            close_control: ok(
              videoId,
              57,
              "Touch tightness in the duel area is visible.",
            ),
            shooting: na("The player crosses instead of shooting in this clip."),
            finishing: na("No shot on goal in the sequence."),
            first_touch: na(
              "Clip starts mid-duel; reception before that is not shown.",
            ),
            acceleration: ok(
              videoId,
              58,
              "Burst past the defender is visible.",
            ),
            balance: ok(
              videoId,
              59,
              "Contact from the defender is partly visible; balance through it can be partially judged.",
            ),
            composure: ok(
              videoId,
              60,
              "Execution in a live duel supports a composure read.",
            ),
            coordination: ok(
              videoId,
              61,
              "Footwork and upper body work together in the feint.",
            ),
          },
        };
        break;
      }
      case 5: {
        draft = {
          schema_version: 1,
          clip_type: "sprint_highlight",
          clip_summary:
            "Long lens: player sprinting off the ball into space; ball is often small in frame.",
          visible_actions: ["sprinting", "match_play"],
          camera: {
            quality: "limited",
            assessment_note:
              "Distance and motion are clear; ball proximity and foot detail are often hard to verify.",
          },
          metrics: {
            acceleration: ok(
              videoId,
              71,
              "Clear increase in speed over several strides is visible.",
            ),
            agility: na(
              "Mostly straight-line work; lateral agility is not really shown.",
            ),
            ball_control: na(
              "Ball is too small or off-frame too often for a fair control score.",
            ),
            dribbling: na("No sustained on-ball sequence in clear view."),
            passing: na("No pass in the highlighted sprint."),
            shooting: na("No shot."),
            finishing: na("No attempt."),
            defending: na("No defending action."),
            decision_making: na(
              "Run without visible passing options limits decision scoring.",
            ),
            first_touch: na("No reception in clip."),
            close_control: na("Not visible at this zoom."),
            coordination: ok(
              videoId,
              72,
              "Arm drive and stride rhythm are visible for a coordination note.",
            ),
            balance: ok(
              videoId,
              73,
              "Straight-line sprint posture is visible.",
            ),
            composure: na("No on-ball pressure moment to judge."),
          },
        };
        break;
      }
      default: {
        draft = {
          schema_version: 1,
          clip_type: "passing_drill",
          clip_summary:
            "Quick wall passes and one-twos in a small box; emphasis on weight and angle.",
          visible_actions: ["passing", "first_touch", "ball_control", "training_drill"],
          camera: {
            quality: "adequate",
            assessment_note:
              "Medium shot shows passes and receptions; full body mechanics are partly cropped.",
          },
          metrics: {
            passing: ok(
              videoId,
              81,
              "Pass weight into the partner’s path is visible in the exchanges.",
            ),
            first_touch: ok(
              videoId,
              82,
              "Touches to set the next pass are visible in the drill.",
            ),
            ball_control: ok(
              videoId,
              83,
              "The ball is managed quickly between passes in frame.",
            ),
            decision_making: na(
              "Drill is structured; match-like decisions are not really visible.",
            ),
            shooting: na("No shot."),
            finishing: na("No goal attempt."),
            defending: na("No defenders."),
            dribbling: na("Very short carries only; not a dribbling showcase."),
            acceleration: na("Small-area tempo only."),
            agility: ok(
              videoId,
              84,
              "Quick shifts to receive are partly visible.",
            ),
            close_control: ok(
              videoId,
              85,
              "Touches stay tight in the box drill.",
            ),
            coordination: ok(
              videoId,
              86,
              "Foot and pass timing line up in what we see.",
            ),
            balance: ok(
              videoId,
              87,
              "Stable through quick exchanges in frame.",
            ),
            composure: na("Opponent pressure is absent in the drill view."),
          },
        };
      }
    }

    const { overall_score, overall_confidence } = overallFromAssessableMetrics(
      draft.metrics,
    );

    const payload: VisibilityAnalysisPayload = {
      ...draft,
      overall_confidence,
    };

    const feedback_text =
      scenario === 0
        ? `The clip shows controlled touches in a tight drill pattern — see the evidence notes on close control and dribbling. Overall reflects only what is visible (${payload.camera.quality} camera read).`
        : scenario === 1
          ? `The footage includes a visible carry and shot sequence, so shooting and decision-making are scored from that action — not from parts of the game that are off-camera.`
          : scenario === 2
            ? `This angle follows the keeper: agility and coordination are scored from the dive; outfield shooting technique is not scored from this framing.`
            : scenario === 3
              ? `Juggling is clear in the clip, so ball control and coordination are assessed; there is no match pressure or defending to score.`
              : scenario === 4
                ? `The 1v1 and cross are in frame, so dribbling, defending, and passing reads are evidence-based; finishing was not shown.`
                : scenario === 5
                  ? `The sprint is visible, so acceleration is scored; ball-related metrics are skipped because the ball is not reliably visible.`
                  : `Passing and first-touch moments in the drill are visible — scores reflect only those actions, not hypothetical match play.`;

    const result: VideoAnalysisScores = {
      valid_for_football_analysis: true,
      clip_type: draft.clip_type,
      invalid_reason: null,
      overall_score,
      overall_confidence,
      feedback_text,
      visibility_analysis: payload,
      legacy: null,
    };
    return result;
  },
};

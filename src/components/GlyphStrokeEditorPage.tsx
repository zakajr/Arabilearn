import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  Play,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FlipHorizontal,
  Copy,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { LETTERS_DATA, LetterRecord } from '../data/lettersAndFamilies';
import {
  GlyphForm,
  GlyphBodyStroke,
  GlyphDotStroke,
  DotArrangement,
  computeGlyphDotClearanceAudit,
  buildTracingSubSteps,
  evaluateGlyphAnimationAtProgress,
  parseSvgPathToEditableSegments,
  serializeEditableSegmentsToSvgPath,
  reverseSvgPathDirection,
  sampleSvgPathEqualLength,
  getDotSize,
  getDotRectSide,
  DEFAULT_GLYPH_STROKE_WIDTH,
  EditablePathSegment,
} from '../lib/strokeMath';
import {
  loadGlyphEditorOverrides,
  saveGlyphEditorOverride,
  clearGlyphEditorOverride,
} from '../services/dataService';
import { CalligraphyAntSvgGroup } from './BlueprintComponents';

interface GlyphStrokeEditorPageProps {
  onBack: () => void;
  onGlyphSaved?: () => void;
}

type DragTarget =
  | { kind: 'anchor'; strokeIdx: number; segIdx: number }
  | { kind: 'cp1'; strokeIdx: number; segIdx: number }
  | { kind: 'cp2'; strokeIdx: number; segIdx: number }
  | { kind: 'dot'; dotIdx: number }
  | null;

function cloneGlyph(spec: GlyphForm): GlyphForm {
  return JSON.parse(JSON.stringify(spec));
}

export const GlyphStrokeEditorPage: React.FC<GlyphStrokeEditorPageProps> = ({
  onBack,
  onGlyphSaved,
}) => {
  const [overrides, setOverrides] = useState<Record<string, GlyphForm>>(() =>
    loadGlyphEditorOverrides()
  );
  const [selectedLetterId, setSelectedLetterId] = useState<string>('jiim');
  const selectedLetter: LetterRecord = useMemo(
    () => LETTERS_DATA.find((l) => l.id === selectedLetterId) || LETTERS_DATA[0],
    [selectedLetterId]
  );

  const getEffectiveGlyphForLetter = useCallback(
    (letter: LetterRecord, map: Record<string, GlyphForm>): GlyphForm => {
      if (map[letter.id]) {
        return cloneGlyph(map[letter.id]);
      }
      return cloneGlyph(letter.forms.isolated);
    },
    []
  );

  const [workingGlyph, setWorkingGlyph] = useState<GlyphForm>(() =>
    getEffectiveGlyphForLetter(
      LETTERS_DATA.find((l) => l.id === 'jiim') || LETTERS_DATA[0],
      loadGlyphEditorOverrides()
    )
  );
  const [undoStack, setUndoStack] = useState<GlyphForm[]>([]);
  const [redoStack, setRedoStack] = useState<GlyphForm[]>([]);
  const [activeStrokeIdx, setActiveStrokeIdx] = useState<number>(0);
  const [showReferenceOverlay, setShowReferenceOverlay] = useState<boolean>(true);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const previewPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const previewDotRefs = useRef<(SVGGElement | null)[]>([]);
  const antGroupRef = useRef<SVGGElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const bodyStrokes = useMemo(
    () =>
      workingGlyph.strokes.filter(
        (s): s is GlyphBodyStroke => s.kind === 'body'
      ),
    [workingGlyph]
  );

  const dotStrokes = useMemo(
    () =>
      workingGlyph.strokes.filter(
        (s): s is GlyphDotStroke => s.kind === 'dot'
      ),
    [workingGlyph]
  );

  const rebuildStrokes = (
    draft: GlyphForm,
    nextBodies: GlyphBodyStroke[],
    nextDots: GlyphDotStroke[]
  ) => {
    let nextId = 1;
    const bodies = nextBodies.map((b) => ({ ...b, id: nextId++ }));
    const dots = nextDots.map((d) => ({ ...d, id: nextId++ }));
    draft.strokes = [...bodies, ...dots];
    draft.dotRule.count = dots.length;
  };

  const stopAnimationPreview = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlayingPreview(false);
  }, []);

  const selectLetter = (letterId: string) => {
    stopAnimationPreview();
    const nextLetter =
      LETTERS_DATA.find((l) => l.id === letterId) || LETTERS_DATA[0];
    const currentOverrides = loadGlyphEditorOverrides();
    setOverrides(currentOverrides);
    setSelectedLetterId(letterId);
    setWorkingGlyph(getEffectiveGlyphForLetter(nextLetter, currentOverrides));
    setUndoStack([]);
    setRedoStack([]);
    setActiveStrokeIdx(0);
  };

  const pushChange = useCallback(
    (updater: (prev: GlyphForm) => GlyphForm, recordHistory = true) => {
      setWorkingGlyph((prev) => {
        const next = updater(cloneGlyph(prev));
        if (recordHistory) {
          setUndoStack((u) => [...u.slice(-24), cloneGlyph(prev)]);
          setRedoStack([]);
        }
        return next;
      });
    },
    []
  );

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, cloneGlyph(workingGlyph)]);
    setWorkingGlyph(cloneGlyph(prev));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, cloneGlyph(workingGlyph)]);
    setWorkingGlyph(cloneGlyph(next));
  };

  const handleSaveCurrent = (forcedStatus?: 'brouillon' | 'valide') => {
    const toSave: GlyphForm = {
      ...cloneGlyph(workingGlyph),
      status: forcedStatus ?? workingGlyph.status ?? 'valide',
    };
    setWorkingGlyph(toSave);
    saveGlyphEditorOverride(selectedLetter.id, toSave);
    const updatedOverrides = loadGlyphEditorOverrides();
    setOverrides(updatedOverrides);
    onGlyphSaved?.();
    const isValide =
      toSave.status === 'valide' || toSave.status === 'validated';
    showToast(
      `Lettre ${selectedLetter.shortName} sauvegardée (${
        isValide ? 'Validé' : 'Brouillon'
      }).`
    );
  };

  const handleResetLetter = () => {
    stopAnimationPreview();
    clearGlyphEditorOverride(selectedLetter.id);
    const updatedOverrides = loadGlyphEditorOverrides();
    setOverrides(updatedOverrides);
    const fresh = cloneGlyph(selectedLetter.forms.isolated);
    setWorkingGlyph(fresh);
    setUndoStack([]);
    setRedoStack([]);
    onGlyphSaved?.();
    showToast(`Lettre ${selectedLetter.shortName} réinitialisée.`);
  };

  const clientToSvgPoint = (
    clientX: number,
    clientY: number
  ): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [100, 100];
    const rect = svg.getBoundingClientRect();
    const x = Math.round(
      Math.max(
        14,
        Math.min(186, ((clientX - rect.left) / Math.max(1, rect.width)) * 200)
      )
    );
    const y = Math.round(
      Math.max(
        14,
        Math.min(186, ((clientY - rect.top) / Math.max(1, rect.height)) * 200)
      )
    );
    return [x, y];
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragTarget) return;
    const [x, y] = clientToSvgPoint(e.clientX, e.clientY);

    pushChange((draft) => {
      const bodies = draft.strokes.filter(
        (s): s is GlyphBodyStroke => s.kind === 'body'
      );
      const dots = draft.strokes.filter(
        (s): s is GlyphDotStroke => s.kind === 'dot'
      );

      if (dragTarget.kind === 'dot') {
        if (dots[dragTarget.dotIdx]) {
          dots[dragTarget.dotIdx] = {
            ...dots[dragTarget.dotIdx],
            at: [x, y],
          };
          rebuildStrokes(draft, bodies, dots);
        }
        return draft;
      }

      const stroke = bodies[dragTarget.strokeIdx];
      if (!stroke) return draft;
      const segments = parseSvgPathToEditableSegments(stroke.d);
      const seg = segments[dragTarget.segIdx];
      if (!seg) return draft;

      if (dragTarget.kind === 'anchor') {
        seg.x = x;
        seg.y = y;
      } else if (
        dragTarget.kind === 'cp1' &&
        (seg.cmd === 'Q' || seg.cmd === 'C')
      ) {
        seg.x1 = x;
        seg.y1 = y;
      } else if (dragTarget.kind === 'cp2' && seg.cmd === 'C') {
        seg.x2 = x;
        seg.y2 = y;
      }

      stroke.d = serializeEditableSegmentsToSvgPath(segments);
      const pts = sampleSvgPathEqualLength(stroke.d, 16);
      if (pts.length > 0) {
        stroke.startDot = [Math.round(pts[0].x), Math.round(pts[0].y)];
      }
      rebuildStrokes(draft, bodies, dots);
      return draft;
    }, false);
  };

  const handlePointerUp = () => {
    if (dragTarget) {
      setDragTarget(null);
    }
  };

  const handleAddSegmentPoint = () => {
    pushChange((draft) => {
      const bodies = draft.strokes.filter(
        (s): s is GlyphBodyStroke => s.kind === 'body'
      );
      const dots = draft.strokes.filter(
        (s): s is GlyphDotStroke => s.kind === 'dot'
      );
      const stroke = bodies[activeStrokeIdx];
      if (!stroke) return draft;
      const segs = parseSvgPathToEditableSegments(stroke.d);
      const last = segs[segs.length - 1] || { cmd: 'M' as const, x: 120, y: 80 };
      const nx = Math.max(20, Math.min(180, Math.round(last.x - 24)));
      const ny = Math.max(20, Math.min(180, Math.round(last.y + 18)));
      const nextSeg: EditablePathSegment = {
        cmd: 'Q',
        x1: Math.round((last.x + nx) / 2),
        y1: Math.round((last.y + ny) / 2 - 12),
        x: nx,
        y: ny,
      };
      segs.push(nextSeg);
      stroke.d = serializeEditableSegmentsToSvgPath(segs);
      rebuildStrokes(draft, bodies, dots);
      return draft;
    });
  };

  const handleRemoveSegmentPoint = () => {
    pushChange((draft) => {
      const bodies = draft.strokes.filter(
        (s): s is GlyphBodyStroke => s.kind === 'body'
      );
      const dots = draft.strokes.filter(
        (s): s is GlyphDotStroke => s.kind === 'dot'
      );
      const stroke = bodies[activeStrokeIdx];
      if (!stroke) return draft;
      const segs = parseSvgPathToEditableSegments(stroke.d);
      if (segs.length <= 2) return draft;
      segs.pop();
      stroke.d = serializeEditableSegmentsToSvgPath(segs);
      rebuildStrokes(draft, bodies, dots);
      return draft;
    });
  };

  const handleReverseStrokeDirection = (strokeIdx: number) => {
    pushChange((draft) => {
      const bodies = draft.strokes.filter(
        (s): s is GlyphBodyStroke => s.kind === 'body'
      );
      const dots = draft.strokes.filter(
        (s): s is GlyphDotStroke => s.kind === 'dot'
      );
      const stroke = bodies[strokeIdx];
      if (!stroke) return draft;
      const rev = reverseSvgPathDirection(stroke.d);
      stroke.d = rev.d;
      stroke.startDot = rev.startDot;
      rebuildStrokes(draft, bodies, dots);
      return draft;
    });
  };

  const handleMoveStrokeOrder = (strokeIdx: number, dir: -1 | 1) => {
    if (strokeIdx + dir < 0 || strokeIdx + dir >= bodyStrokes.length) return;
    const targetIdx = strokeIdx + dir;
    pushChange((draft) => {
      const bodies = draft.strokes.filter(
        (s): s is GlyphBodyStroke => s.kind === 'body'
      );
      const dots = draft.strokes.filter(
        (s): s is GlyphDotStroke => s.kind === 'dot'
      );
      const [moved] = bodies.splice(strokeIdx, 1);
      bodies.splice(targetIdx, 0, moved);
      rebuildStrokes(draft, bodies, dots);
      return draft;
    });
    setActiveStrokeIdx(targetIdx);
  };

  const handleSetDotCount = (count: 0 | 1 | 2 | 3) => {
    pushChange((draft) => {
      const bodies = draft.strokes.filter(
        (s): s is GlyphBodyStroke => s.kind === 'body'
      );
      const dots = draft.strokes.filter(
        (s): s is GlyphDotStroke => s.kind === 'dot'
      );
      const strokeW = bodies[0]?.width ?? DEFAULT_GLYPH_STROKE_WIDTH;
      const dotSize = getDotSize(strokeW);

      let nextPositions: [number, number][] = [];
      let nextArr: DotArrangement = 'none';

      if (count === 0) {
        draft.dotRule.position = 'none';
        nextArr = 'none';
        nextPositions = [];
      } else if (count === 1) {
        if (draft.dotRule.position === 'none') draft.dotRule.position = 'below';
        nextArr = 'single';
        const base = dots[0]?.at || [104, 136];
        nextPositions = [[base[0], base[1]]];
      } else if (count === 2) {
        if (draft.dotRule.position === 'none') draft.dotRule.position = 'above';
        nextArr = 'row';
        const cy = dots[0]?.at[1] ?? 68;
        nextPositions = [
          [88, cy],
          [112, cy],
        ];
      } else if (count === 3) {
        if (draft.dotRule.position === 'none') draft.dotRule.position = 'above';
        nextArr = 'triangle_up';
        const cy = dots[0]?.at[1] ?? 72;
        nextPositions = [
          [87, cy],
          [113, cy],
          [100, Math.max(24, cy - 18)],
        ];
      }

      draft.dotRule.count = count;
      draft.dotRule.arrangement = nextArr;
      draft.dotRule.size = dotSize;

      const nextDotStrokes: GlyphDotStroke[] = nextPositions.map(
        (pos, idx) => ({
          id: bodies.length + idx + 1,
          kind: 'dot',
          at: pos,
          radius: 7,
          size: dotSize,
          arrangement: nextArr,
        })
      );
      rebuildStrokes(draft, bodies, nextDotStrokes);
      return draft;
    });
  };

  const handleSetDotArrangement = (arr: DotArrangement) => {
    pushChange((draft) => {
      const bodies = draft.strokes.filter(
        (s): s is GlyphBodyStroke => s.kind === 'body'
      );
      const dots = draft.strokes.filter(
        (s): s is GlyphDotStroke => s.kind === 'dot'
      );
      draft.dotRule.arrangement = arr;
      if (arr === 'row' && dots.length >= 2) {
        const cy = dots[0].at[1];
        dots.forEach((d, idx) => {
          d.at = [88 + idx * 24, cy];
          d.arrangement = arr;
        });
      } else if (arr === 'triangle_up' && dots.length >= 3) {
        const cy = dots[0].at[1];
        dots[0].at = [87, cy];
        dots[1].at = [113, cy];
        dots[2].at = [100, Math.max(24, cy - 18)];
        dots.forEach((d) => {
          d.arrangement = arr;
        });
      }
      rebuildStrokes(draft, bodies, dots);
      return draft;
    });
  };

  const applyPreviewFrame = useCallback(
    (progress: number) => {
      const snap = evaluateGlyphAnimationAtProgress(workingGlyph, progress);
      bodyStrokes.forEach((_, idx) => {
        const el = previewPathRefs.current[idx];
        if (!el) return;
        const p = snap.strokeProgresses[idx] ?? 0;
        el.style.strokeDasharray = '1';
        el.style.strokeDashoffset = `${Math.max(0, 1 - p)}`;
        el.style.opacity = p > 0 ? '1' : '0';
      });
      dotStrokes.forEach((d, idx) => {
        const gEl = previewDotRefs.current[idx];
        if (!gEl) return;
        const dState = snap.dots[idx];
        const visible = dState?.visible ?? false;
        const scale = dState?.scale ?? 1;
        gEl.style.opacity = visible ? '1' : '0.35';
        gEl.setAttribute(
          'transform',
          `translate(${d.at[0].toFixed(1)}, ${d.at[1].toFixed(
            1
          )}) scale(${scale.toFixed(2)}) rotate(45)`
        );
      });
      const antEl = antGroupRef.current;
      if (antEl) {
        const bounceScale = snap.ant.isStrokeEndBounce ? 1.12 : 1;
        antEl.setAttribute(
          'transform',
          `translate(${snap.ant.x.toFixed(1)}, ${snap.ant.y.toFixed(
            1
          )}) rotate(${snap.ant.angleDeg.toFixed(1)}) scale(${bounceScale})`
        );
        antEl.setAttribute(
          'data-moving',
          snap.ant.isMoving ? 'true' : 'false'
        );
        const crumbEl = antEl.querySelector(
          '[data-ant-crumb="true"]'
        ) as SVGGElement | null;
        if (crumbEl) {
          crumbEl.style.opacity = snap.ant.isCarryingDot ? '1' : '0';
        }
      }
    },
    [workingGlyph, bodyStrokes, dotStrokes]
  );

  const playAnimationPreview = () => {
    stopAnimationPreview();
    setIsPlayingPreview(true);
    const snap0 = evaluateGlyphAnimationAtProgress(workingGlyph, 0);
    const totalMs = Math.max(900, snap0.totalDurationMs);
    const startTs = performance.now();
    applyPreviewFrame(0);

    const step = (now: number) => {
      const p = Math.min(1, (now - startTs) / totalMs);
      applyPreviewFrame(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        setIsPlayingPreview(false);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (!isPlayingPreview) {
      applyPreviewFrame(1);
    }
  }, [workingGlyph, isPlayingPreview, applyPreviewFrame]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const clearanceAudit = useMemo(
    () => computeGlyphDotClearanceAudit(workingGlyph),
    [workingGlyph]
  );
  const subSteps = useMemo(
    () => buildTracingSubSteps(workingGlyph),
    [workingGlyph]
  );

  const activeStroke: GlyphBodyStroke | undefined =
    bodyStrokes[activeStrokeIdx] || bodyStrokes[0];
  const editableSegments = useMemo(
    () =>
      activeStroke ? parseSvgPathToEditableSegments(activeStroke.d) : [],
    [activeStroke]
  );

  const handleCopyJson = async (mode: 'one' | 'all') => {
    const payload =
      mode === 'one'
        ? { [selectedLetter.id]: workingGlyph }
        : LETTERS_DATA.reduce<Record<string, GlyphForm>>((acc, l) => {
            acc[l.id] =
              l.id === selectedLetter.id
                ? workingGlyph
                : getEffectiveGlyphForLetter(l, overrides);
            return acc;
          }, {});
    const jsonStr = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(jsonStr);
      showToast(
        mode === 'one'
          ? `JSON copié pour ${selectedLetter.shortName}`
          : 'JSON copié pour les 28 lettres'
      );
    } catch {
      setImportJsonText(jsonStr);
      setImportModalOpen(true);
    }
  };

  const handleApplyImportedJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.strokes) && parsed.dotRule) {
          saveGlyphEditorOverride(selectedLetter.id, parsed as GlyphForm);
          setWorkingGlyph(cloneGlyph(parsed as GlyphForm));
        } else {
          Object.entries(parsed).forEach(([id, spec]) => {
            if (spec && typeof spec === 'object' && 'strokes' in spec) {
              saveGlyphEditorOverride(id, spec as GlyphForm);
              if (id === selectedLetter.id) {
                setWorkingGlyph(cloneGlyph(spec as GlyphForm));
              }
            }
          });
        }
        setOverrides(loadGlyphEditorOverrides());
        onGlyphSaved?.();
        setImportModalOpen(false);
        showToast('JSON importé et sauvegardé avec succès.');
      }
    } catch {
      showToast('Format JSON invalide.');
    }
  };

  const strokeW = bodyStrokes[0]?.width ?? DEFAULT_GLYPH_STROKE_WIDTH;
  const dotSide = getDotRectSide(strokeW);
  const isValideStatus =
    workingGlyph.status === 'valide' || workingGlyph.status === 'validated';

  return (
    <div
      data-testid="glyph-stroke-editor-page"
      className="min-h-screen bg-[#FAF6EE] dark:bg-[#0C1411] text-[#111C18] dark:text-[#F2EFE8] pb-24"
    >
      {/* Top Bar */}
      <header className="sticky top-0 z-30 h-14 px-3 bg-[#FAF6EE]/95 dark:bg-[#0C1411]/95 backdrop-blur border-b border-[#E3DDD2] dark:border-[#21322B] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour à l'application"
          className="min-w-[48px] min-h-[48px] px-2.5 rounded-xl flex items-center gap-1.5 font-semibold text-sm text-[#0D5C46] dark:text-[#4CC9A0] active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>

        <div className="text-center min-w-0">
          <p className="text-xs font-mono uppercase tracking-wider text-[#52605A]">
            Éditeur de glyphes · /dev/glyphs
          </p>
          <h1 className="text-sm font-bold truncate">
            {selectedLetter.order}. {selectedLetter.shortName} (
            {selectedLetter.arabicChar})
          </h1>
        </div>

        <button
          type="button"
          data-testid="editor-save-valide-btn"
          onClick={() => handleSaveCurrent('valide')}
          className="min-h-[48px] px-3.5 rounded-xl bg-[#0D5C46] text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Valider</span>
        </button>
      </header>

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto px-4 py-3 rounded-xl bg-[#111C18] text-white text-xs font-semibold shadow-lg flex items-center justify-between"
        >
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-3 space-y-4">
        {/* 28 Letters Horizontal Strip with Brouillon / Validé Status */}
        <section aria-label="Liste des 28 lettres">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-[#52605A]">
              28 lettres (statut Brouillon / Validé)
            </span>
            <span className="text-[11px] font-mono text-[#52605A]">
              {
                LETTERS_DATA.filter((l) => {
                  const st =
                    overrides[l.id]?.status ??
                    l.forms.isolated.status ??
                    'brouillon';
                  return st === 'valide' || st === 'validated';
                }).length
              }
              /28 validées
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {LETTERS_DATA.map((letter) => {
              const effStatus =
                overrides[letter.id]?.status ??
                letter.forms.isolated.status ??
                'brouillon';
              const isLetterValide =
                effStatus === 'valide' || effStatus === 'validated';
              const isSelected = letter.id === selectedLetter.id;
              return (
                <button
                  key={letter.id}
                  type="button"
                  data-testid={`editor-letter-btn-${letter.id}`}
                  onClick={() => selectLetter(letter.id)}
                  className={`min-w-[68px] min-h-[54px] px-2.5 py-1.5 rounded-xl border text-left shrink-0 flex flex-col justify-between transition-transform active:scale-95 ${
                    isSelected
                      ? 'bg-[#0D5C46] text-white border-[#0D5C46]'
                      : 'bg-white dark:bg-[#15211C] border-[#E3DDD2] dark:border-[#21322B]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate">
                      {letter.shortName}
                    </span>
                    <span className="font-arabic text-base leading-none">
                      {letter.arabicChar}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded w-fit ${
                      isLetterValide
                        ? isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#E3F3EC] text-[#0D5C46]'
                        : isSelected
                        ? 'bg-amber-300/25 text-amber-100'
                        : 'bg-[#FDF1DC] text-[#9A5B06]'
                    }`}
                  >
                    {isLetterValide ? 'Validé' : 'Brouillon'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Interactive 200x200 Authoring Canvas */}
        <section className="bg-white dark:bg-[#15211C] rounded-2xl border border-[#E3DDD2] dark:border-[#21322B] p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                aria-label="Annuler la modification"
                className="min-w-[48px] min-h-[48px] px-2.5 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] flex items-center justify-center disabled:opacity-40 active:scale-95"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                aria-label="Rétablir la modification"
                className="min-w-[48px] min-h-[48px] px-2.5 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] flex items-center justify-center disabled:opacity-40 active:scale-95"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowReferenceOverlay((v) => !v)}
                aria-label="Afficher ou masquer le calque de référence Amiri"
                className={`min-h-[48px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 active:scale-95 ${
                  showReferenceOverlay
                    ? 'bg-[#E3F3EC] border-[#0D5C46] text-[#0D5C46]'
                    : 'border-[#E3DDD2] dark:border-[#21322B] text-[#52605A]'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Calque Amiri (25%)</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="editor-play-animation-btn"
                onClick={playAnimationPreview}
                className="min-h-[48px] px-3.5 rounded-xl bg-[#D97706] text-white text-xs font-bold flex items-center gap-1.5 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Jouer l&apos;animation</span>
              </button>
              <button
                type="button"
                onClick={handleResetLetter}
                aria-label="Réinitialiser la lettre"
                className="min-w-[48px] min-h-[48px] px-2.5 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] text-xs font-semibold flex items-center justify-center active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative w-full max-w-[320px] aspect-square mx-auto rounded-2xl border-2 border-[#E3DDD2] dark:border-[#21322B] bg-[#FAF6EE] dark:bg-[#0C1411] overflow-hidden touch-none">
            <svg
              ref={svgRef}
              viewBox="0 0 200 200"
              className="w-full h-full select-none"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* 12-unit padding safety frame & guide lines */}
              <rect
                x={12}
                y={12}
                width={176}
                height={176}
                fill="none"
                stroke="#E3DDD2"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <line
                x1={12}
                y1={120}
                x2={188}
                y2={120}
                stroke="#D5CFC2"
                strokeWidth={1}
              />
              <line
                x1={100}
                y1={12}
                x2={100}
                y2={188}
                stroke="#E3DDD2"
                strokeWidth={1}
                strokeDasharray="2 4"
              />

              {/* Authoring-only Amiri 25% reference overlay */}
              {showReferenceOverlay && (
                <text
                  x={100}
                  y={132}
                  textAnchor="middle"
                  className="font-arabic pointer-events-none select-none"
                  fontSize={126}
                  fill="#0D5C46"
                  opacity={0.25}
                >
                  {selectedLetter.arabicChar}
                </text>
              )}

              {/* Light grey base paths */}
              {bodyStrokes.map((stroke, idx) => (
                <path
                  key={`base-${idx}`}
                  d={stroke.d}
                  fill="none"
                  stroke="#C9D6D1"
                  strokeWidth={stroke.width || DEFAULT_GLYPH_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Animated / drawn ink paths */}
              {bodyStrokes.map((stroke, idx) => (
                <path
                  key={`ink-${idx}`}
                  ref={(el) => {
                    previewPathRefs.current[idx] = el;
                  }}
                  d={stroke.d}
                  pathLength={1}
                  fill="none"
                  stroke={idx === activeStrokeIdx ? '#0D5C46' : '#1E7A5F'}
                  strokeWidth={stroke.width || DEFAULT_GLYPH_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Start point badges (offset above-left) */}
              {bodyStrokes.map((stroke, idx) => {
                const bx = Math.max(16, Math.min(184, stroke.startDot[0] - 16));
                const by = Math.max(16, Math.min(184, stroke.startDot[1] - 16));
                return (
                  <g key={`badge-${idx}`} transform={`translate(${bx}, ${by})`}>
                    <circle
                      r={9}
                      fill="#D97706"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#FFFFFF"
                      fontSize={10}
                      fontWeight={800}
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}

              {/* Diamond Dots (draggable) */}
              {dotStrokes.map((d, dIdx) => (
                <g
                  key={`dot-${dIdx}`}
                  ref={(el) => {
                    previewDotRefs.current[dIdx] = el;
                  }}
                  data-testid={`editor-dot-handle-${dIdx}`}
                  transform={`translate(${d.at[0]}, ${d.at[1]}) rotate(45)`}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (e.currentTarget as SVGGElement).setPointerCapture?.(
                      e.pointerId
                    );
                    setDragTarget({ kind: 'dot', dotIdx: dIdx });
                  }}
                >
                  <rect
                    x={-dotSide / 2}
                    y={-dotSide / 2}
                    width={dotSide}
                    height={dotSide}
                    rx={2}
                    fill="#0D5C46"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                </g>
              ))}

              {/* Active stroke Bézier control handles & anchor points */}
              {!isPlayingPreview &&
                editableSegments.map((seg, sIdx) => {
                  const prevSeg = sIdx > 0 ? editableSegments[sIdx - 1] : null;
                  return (
                    <g key={`seg-controls-${sIdx}`}>
                      {(seg.cmd === 'Q' || seg.cmd === 'C') && prevSeg && (
                        <>
                          <line
                            x1={prevSeg.x}
                            y1={prevSeg.y}
                            x2={seg.x1}
                            y2={seg.y1}
                            stroke="#D97706"
                            strokeWidth={1.2}
                            strokeDasharray="2 2"
                          />
                          <circle
                            cx={seg.x1}
                            cy={seg.y1}
                            r={5}
                            fill="#F59E0B"
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                            className="cursor-pointer"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setDragTarget({
                                kind: 'cp1',
                                strokeIdx: activeStrokeIdx,
                                segIdx: sIdx,
                              });
                            }}
                          />
                        </>
                      )}
                      {seg.cmd === 'C' && (
                        <>
                          <line
                            x1={seg.x}
                            y1={seg.y}
                            x2={seg.x2}
                            y2={seg.y2}
                            stroke="#D97706"
                            strokeWidth={1.2}
                            strokeDasharray="2 2"
                          />
                          <circle
                            cx={seg.x2}
                            cy={seg.y2}
                            r={5}
                            fill="#F59E0B"
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                            className="cursor-pointer"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setDragTarget({
                                kind: 'cp2',
                                strokeIdx: activeStrokeIdx,
                                segIdx: sIdx,
                              });
                            }}
                          />
                        </>
                      )}
                      <circle
                        cx={seg.x}
                        cy={seg.y}
                        r={6.5}
                        fill={sIdx === 0 ? '#15803D' : '#1D4ED8'}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        className="cursor-pointer"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setDragTarget({
                            kind: 'anchor',
                            strokeIdx: activeStrokeIdx,
                            segIdx: sIdx,
                          });
                        }}
                      />
                    </g>
                  );
                })}

              {/* Calligraphy Ant for Real Animation Preview */}
              <CalligraphyAntSvgGroup
                ref={antGroupRef}
                mode="kids"
              />
            </svg>
          </div>

          {/* Anchor & Stroke Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddSegmentPoint}
                className="min-h-[48px] px-3 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] text-xs font-semibold flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter point</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveSegmentPoint}
                className="min-h-[48px] px-3 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] text-xs font-semibold flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Retirer point</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[#52605A]">
                Statut :
              </label>
              <button
                type="button"
                onClick={() =>
                  pushChange((d) => {
                    d.status = isValideStatus ? 'brouillon' : 'valide';
                    return d;
                  })
                }
                className={`min-h-[48px] px-3 rounded-xl text-xs font-bold border ${
                  isValideStatus
                    ? 'bg-[#E3F3EC] border-[#0D5C46] text-[#0D5C46]'
                    : 'bg-[#FDF1DC] border-[#D97706] text-[#9A5B06]'
                }`}
              >
                {isValideStatus ? 'Validé' : 'Brouillon'}
              </button>
            </div>
          </div>
        </section>

        {/* Stroke Order & Dot Editor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stroke Order List */}
          <section className="bg-white dark:bg-[#15211C] rounded-2xl border border-[#E3DDD2] dark:border-[#21322B] p-3 space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#52605A]">
              Ordre des traits ({bodyStrokes.length})
            </h2>
            <div className="space-y-2">
              {bodyStrokes.map((st, idx) => (
                <div
                  key={`stroke-item-${idx}`}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                    idx === activeStrokeIdx
                      ? 'border-[#0D5C46] bg-[#E3F3EC]/40 dark:bg-[#0D5C46]/20'
                      : 'border-[#E3DDD2] dark:border-[#21322B]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveStrokeIdx(idx)}
                    className="min-h-[48px] flex-1 text-left flex flex-col justify-center"
                  >
                    <span className="text-xs font-bold">
                      Trait {idx + 1} · Départ ({st.startDot[0]},{' '}
                      {st.startDot[1]})
                    </span>
                    <span className="text-[11px] font-mono text-[#52605A] truncate max-w-[180px]">
                      {st.d}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleReverseStrokeDirection(idx)}
                      aria-label={`Inverser le sens du trait ${idx + 1}`}
                      className="min-w-[48px] min-h-[48px] rounded-lg border border-[#E3DDD2] dark:border-[#21322B] flex items-center justify-center active:scale-95"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStrokeOrder(idx, -1)}
                      aria-label={`Monter le trait ${idx + 1}`}
                      className="min-w-[48px] min-h-[48px] rounded-lg border border-[#E3DDD2] dark:border-[#21322B] flex items-center justify-center disabled:opacity-35 active:scale-95"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === bodyStrokes.length - 1}
                      onClick={() => handleMoveStrokeOrder(idx, 1)}
                      aria-label={`Descendre le trait ${idx + 1}`}
                      className="min-w-[48px] min-h-[48px] rounded-lg border border-[#E3DDD2] dark:border-[#21322B] flex items-center justify-center disabled:opacity-35 active:scale-95"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Dot Editor */}
          <section className="bg-white dark:bg-[#15211C] rounded-2xl border border-[#E3DDD2] dark:border-[#21322B] p-3 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#52605A]">
              Éditeur de points (losanges)
            </h2>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#52605A]">
                Nombre de points :
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {([0, 1, 2, 3] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleSetDotCount(cnt)}
                    className={`min-h-[48px] rounded-xl font-bold text-xs border ${
                      dotStrokes.length === cnt
                        ? 'bg-[#0D5C46] text-white border-[#0D5C46]'
                        : 'border-[#E3DDD2] dark:border-[#21322B]'
                    }`}
                  >
                    {cnt} {cnt > 1 ? 'points' : 'point'}
                  </button>
                ))}
              </div>
            </div>

            {dotStrokes.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#52605A]">
                    Disposition :
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'single', label: 'Simple' },
                        { id: 'row', label: 'Rangée' },
                        { id: 'triangle_up', label: 'Triangle haut' },
                      ] as const
                    ).map((arr) => (
                      <button
                        key={arr.id}
                        type="button"
                        onClick={() => handleSetDotArrangement(arr.id)}
                        className={`min-h-[48px] px-2 rounded-xl font-semibold text-xs border ${
                          workingGlyph.dotRule.arrangement === arr.id
                            ? 'bg-[#0D5C46] text-white border-[#0D5C46]'
                            : 'border-[#E3DDD2] dark:border-[#21322B]'
                        }`}
                      >
                        {arr.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coordinate inputs for deterministic fine-tuning & tests */}
                <div className="space-y-2 pt-1">
                  {dotStrokes.map((d, dIdx) => (
                    <div
                      key={`dot-coord-${dIdx}`}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-semibold">
                        Point {dIdx + 1} (X, Y) :
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          aria-label={`Coordonnée X du point ${dIdx + 1}`}
                          data-testid={`editor-dot-x-${dIdx}`}
                          value={d.at[0]}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            pushChange((draft) => {
                              const bodies = draft.strokes.filter(
                                (s): s is GlyphBodyStroke => s.kind === 'body'
                              );
                              const dots = draft.strokes.filter(
                                (s): s is GlyphDotStroke => s.kind === 'dot'
                              );
                              if (dots[dIdx]) {
                                dots[dIdx] = {
                                  ...dots[dIdx],
                                  at: [val, dots[dIdx].at[1]],
                                };
                                rebuildStrokes(draft, bodies, dots);
                              }
                              return draft;
                            });
                          }}
                          className="w-20 min-h-[48px] px-2.5 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] bg-[#FAF6EE] dark:bg-[#0C1411] font-mono text-center"
                        />
                        <input
                          type="number"
                          aria-label={`Coordonnée Y du point ${dIdx + 1}`}
                          data-testid={`editor-dot-y-${dIdx}`}
                          value={d.at[1]}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            pushChange((draft) => {
                              const bodies = draft.strokes.filter(
                                (s): s is GlyphBodyStroke => s.kind === 'body'
                              );
                              const dots = draft.strokes.filter(
                                (s): s is GlyphDotStroke => s.kind === 'dot'
                              );
                              if (dots[dIdx]) {
                                dots[dIdx] = {
                                  ...dots[dIdx],
                                  at: [dots[dIdx].at[0], val],
                                };
                                rebuildStrokes(draft, bodies, dots);
                              }
                              return draft;
                            });
                          }}
                          className="w-20 min-h-[48px] px-2.5 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] bg-[#FAF6EE] dark:bg-[#0C1411] font-mono text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Live Validation Panel (Red / Green) */}
        <section
          data-testid="editor-validation-panel"
          className="bg-white dark:bg-[#15211C] rounded-2xl border border-[#E3DDD2] dark:border-[#21322B] p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#52605A]">
              Panneau de validation automatique
            </h2>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                clearanceAudit.passed
                  ? 'bg-[#E3F3EC] text-[#0D5C46]'
                  : 'bg-[#FDE8E8] text-[#B91C1C]'
              }`}
            >
              {clearanceAudit.passed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conforme
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> À corriger
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div
              className={`p-2.5 rounded-xl border ${
                clearanceAudit.strokesInsideViewBox &&
                clearanceAudit.dots.every((d) => d.insideViewBoxWithPadding)
                  ? 'border-[#0D5C46]/30 bg-[#E3F3EC]/40 text-[#0D5C46]'
                  : 'border-[#B91C1C]/30 bg-[#FDE8E8]/50 text-[#B91C1C]'
              }`}
            >
              <p className="font-bold">Marges viewBox (12 u)</p>
              <p className="font-mono mt-0.5">
                Traits:{' '}
                {clearanceAudit.strokesInsideViewBox ? 'OK' : 'Hors cadre'} ·
                Points:{' '}
                {clearanceAudit.dots.every((d) => d.insideViewBoxWithPadding)
                  ? 'OK'
                  : 'Hors cadre'}
              </p>
            </div>

            <div
              className={`p-2.5 rounded-xl border ${
                clearanceAudit.passed
                  ? 'border-[#0D5C46]/30 bg-[#E3F3EC]/40 text-[#0D5C46]'
                  : 'border-[#B91C1C]/30 bg-[#FDE8E8]/50 text-[#B91C1C]'
              }`}
            >
              <p className="font-bold">
                Dégagement des points (min {clearanceAudit.requiredClearance} u)
              </p>
              <p className="font-mono mt-0.5">
                {clearanceAudit.dots.length === 0
                  ? 'Aucun point (0)'
                  : clearanceAudit.dots
                      .map(
                        (d, i) =>
                          `P${i + 1}: ${d.minDistanceToStrokeCenterline}u`
                      )
                      .join(' · ')}
              </p>
            </div>

            <div className="p-2.5 rounded-xl border border-[#0D5C46]/30 bg-[#E3F3EC]/40 text-[#0D5C46]">
              <p className="font-bold">Étapes de tracé</p>
              <p className="font-mono mt-0.5">
                {subSteps.length} étape(s) ({bodyStrokes.length} trait(s)
                {dotStrokes.length > 0 ? ' + 1 points' : ''})
              </p>
            </div>
          </div>
        </section>

        {/* Export / Import JSON Actions */}
        <section className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyJson('one')}
              className="min-h-[48px] px-3.5 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] bg-white dark:bg-[#15211C] text-xs font-bold flex items-center gap-1.5 active:scale-95"
            >
              <Copy className="w-4 h-4" />
              <span>Copier le JSON (lettre)</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopyJson('all')}
              className="min-h-[48px] px-3.5 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] bg-white dark:bg-[#15211C] text-xs font-bold flex items-center gap-1.5 active:scale-95"
            >
              <Copy className="w-4 h-4" />
              <span>Copier le JSON (28 lettres)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportJsonText(JSON.stringify(workingGlyph, null, 2));
                setImportModalOpen(true);
              }}
              className="min-h-[48px] px-3.5 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] bg-white dark:bg-[#15211C] text-xs font-bold flex items-center gap-1.5 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Importer un JSON</span>
            </button>
          </div>
        </section>
      </div>

      {/* JSON Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#15211C] rounded-2xl p-4 space-y-3 border border-[#E3DDD2] dark:border-[#21322B]">
            <h3 className="text-sm font-bold">
              Importer ou inspecter le JSON
            </h3>
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              rows={10}
              className="w-full p-2.5 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] bg-[#FAF6EE] dark:bg-[#0C1411] font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="min-h-[48px] px-4 rounded-xl border border-[#E3DDD2] dark:border-[#21322B] text-xs font-bold"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleApplyImportedJson}
                className="min-h-[48px] px-4 rounded-xl bg-[#0D5C46] text-white text-xs font-bold"
              >
                Appliquer le JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseCriticalStripCsv } from "@/features/critical-strip/criticalStripCsvLoader";
import { CriticalStripSceneController } from "@/features/critical-strip/criticalStripSceneController";
import { ARIAS_POS_T_SET, CRITICAL_STRIP_MANIFEST } from "@/features/critical-strip/criticalStripPointSetManifest";
import type { CriticalPointSet, SigmaRange, SpaceMode, ViewRange } from "@/features/critical-strip/criticalStripTypes";

async function fetchPointSet(id: string, filename: string): Promise<CriticalPointSet> {
  // encodeURI leaves `=`, `,`, `:` etc. unencoded (Vite's dev server returns
  // its SPA fallback for any URL with `%3D` in the path, so files whose names
  // contain `=` — like "Theta2 σ = 0.25.csv" — would otherwise fetch the
  // wrong content). encodeURI still handles spaces (→ %20) and the σ
  // character (→ %CF%83) correctly.
  const url = `/critical-strip-points/${encodeURI(filename)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${String(res.status)}`);
  const text = await res.text();
  return parseCriticalStripCsv(id, text);
}

export type CriticalStripState = {
  controller: CriticalStripSceneController;
  isExpanded: boolean;
  sigmaRange: SigmaRange;
  spaceMode: SpaceMode;
  bandsVisible: boolean;
  isLocked: boolean;
  viewRange: ViewRange;
  selectedSetIds: Set<string>;
  loadedSets: CriticalPointSet[];
  totalPoints: number;
  loadingIds: Set<string>;
  /** When true, ONLY the Arias positive-t f-zeros are shown; all other
   *  selected background overlays are hidden (their selection is preserved). */
  ariasExclusive: boolean;
  ariasLoading: boolean;

  toggleExpanded: () => void;
  setSigmaRange: (r: SigmaRange) => void;
  toggleSpaceMode: () => void;
  setBandsVisible: (v: boolean) => void;
  setLocked: (v: boolean) => void;
  togglePointSet: (id: string) => void;
  toggleAriasExclusive: () => void;
  centerOnCurrent: (durationMs?: number) => void;
};

export function useCriticalStripState(
  getCurrentPosition: () => { index: number; sigma: number },
  onSelectPoint: (index: number, sigma: number) => void,
): CriticalStripState {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sigmaRange, setSigmaRangeState] = useState<SigmaRange>(1);
  const [spaceMode, setSpaceMode] = useState<SpaceMode>("index");
  const [bandsVisible, setBandsVisibleState] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [viewRange, setViewRange] = useState<ViewRange>({ minY: 0, maxY: 7 });
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [loadedSets, setLoadedSets] = useState<CriticalPointSet[]>([]);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [ariasExclusive, setAriasExclusive] = useState(false);
  const [ariasSet, setAriasSet] = useState<CriticalPointSet | null>(null);
  const [ariasLoading, setAriasLoading] = useState(false);

  const controller = useMemo(
    () => new CriticalStripSceneController({ minY: 0, maxY: 7 }, "index", 1),
    [],
  );

  // Wire controller callbacks — runs whenever onSelectPoint identity changes, but does NOT
  // dispose the controller (disposing removes canvas listeners which are only re-attached
  // by CriticalStripCanvas on mount, not on every callback re-wire).
  useEffect(() => {
    controller.onViewportChange = () => {
      setViewRange(controller.getViewRange());
    };
    controller.onPointClick = (e) => {
      onSelectPoint(e.index, e.sigma);
    };
  }, [controller, onSelectPoint]);

  // Dispose only when the controller itself is replaced or the component unmounts.
  useEffect(() => {
    return () => { controller.dispose(); };
  }, [controller]);

  // Single source of truth for what the scene renders. In Arias-exclusive ("solo")
  // mode ONLY the Arias positive-t set is drawn; every other selected overlay is
  // hidden (but its selection is retained and restored when solo is turned off).
  useEffect(() => {
    if (ariasExclusive) {
      controller.setPointSets(ariasSet === null ? [] : [ariasSet]);
    } else {
      controller.setPointSets(loadedSets);
    }
  }, [controller, ariasExclusive, ariasSet, loadedSets]);

  // Sync locked auto-center
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const getPositionRef = useRef(getCurrentPosition);
  getPositionRef.current = getCurrentPosition;

  useEffect(() => {
    const id = setInterval(() => {
      if (!isLockedRef.current) return;
      const pos = getPositionRef.current();
      controllerRef.current.setCurrentPosition(pos.index, pos.sigma);
      controllerRef.current.centerOn(pos.index, 100);
    }, 50);
    return () => clearInterval(id);
  }, []);

  // Also update indicator on every animation frame when not locked
  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const pos = getPositionRef.current();
      controllerRef.current.setCurrentPosition(pos.index, pos.sigma);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const totalPoints = useMemo(
    () => ariasExclusive
      ? (ariasSet?.points.length ?? 0)
      : loadedSets.reduce((acc, s) => acc + s.points.length, 0),
    [ariasExclusive, ariasSet, loadedSets],
  );

  const toggleExpanded = useCallback(() => setIsExpanded((v) => !v), []);

  const setSigmaRange = useCallback(
    (r: SigmaRange) => {
      setSigmaRangeState(r);
      controller.setSigmaRange(r);
    },
    [controller],
  );

  const toggleSpaceMode = useCallback(() => {
    const next: SpaceMode = spaceMode === "index" ? "imaginary" : "index";
    setSpaceMode(next);
    controller.setSpaceMode(next);
  }, [controller, spaceMode]);

  const setBandsVisible = useCallback(
    (v: boolean) => {
      setBandsVisibleState(v);
      controller.setBandsVisible(v);
    },
    [controller],
  );

  const setLocked = useCallback((v: boolean) => {
    setIsLocked(v);
  }, []);

  const togglePointSet = useCallback(
    (id: string) => {
      const entry = CRITICAL_STRIP_MANIFEST.find((m) => m.id === id);
      if (entry === undefined) return;

      setSelectedSetIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          setLoadedSets((sets) => sets.filter((s) => s.id !== id));
        } else {
          next.add(id);
          setLoadingIds((l) => new Set(l).add(id));
          fetchPointSet(id, entry.filename)
            .then((set) => {
              setLoadedSets((sets) => [...sets, set]);
            })
            .catch((_err: unknown) => {
              setSelectedSetIds((s) => {
                const r = new Set(s);
                r.delete(id);
                return r;
              });
            })
            .finally(() => {
              setLoadingIds((l) => {
                const r = new Set(l);
                r.delete(id);
                return r;
              });
            });
        }
        return next;
      });
    },
    [controller],
  );

  // One-time: select the "Champions" set on initial mount.
  const didDefaultSelectRef = useRef(false);
  useEffect(() => {
    if (didDefaultSelectRef.current) return;
    didDefaultSelectRef.current = true;
    togglePointSet("01a-champions");
  }, [togglePointSet]);

  // Fetch the (large) Arias set lazily on first solo-enable; the render effect
  // above swaps the scene to show only it while `ariasExclusive` is true.
  const toggleAriasExclusive = useCallback(() => {
    setAriasExclusive((prev) => {
      const next = !prev;
      if (next && ariasSet === null && !ariasLoading) {
        setAriasLoading(true);
        fetchPointSet(ARIAS_POS_T_SET.id, ARIAS_POS_T_SET.filename)
          .then((set) => { setAriasSet(set); })
          .catch((_err: unknown) => { setAriasExclusive(false); })
          .finally(() => { setAriasLoading(false); });
      }
      return next;
    });
  }, [ariasSet, ariasLoading]);

  const centerOnCurrent = useCallback(
    (durationMs = 500) => {
      const pos = getCurrentPosition();
      controller.centerOn(pos.index, durationMs);
    },
    [controller, getCurrentPosition],
  );

  return {
    controller,
    isExpanded,
    sigmaRange,
    spaceMode,
    bandsVisible,
    isLocked,
    viewRange,
    selectedSetIds,
    loadedSets,
    totalPoints,
    loadingIds,
    ariasExclusive,
    ariasLoading,
    toggleExpanded,
    setSigmaRange,
    toggleSpaceMode,
    setBandsVisible,
    setLocked,
    togglePointSet,
    toggleAriasExclusive,
    centerOnCurrent,
  };
}

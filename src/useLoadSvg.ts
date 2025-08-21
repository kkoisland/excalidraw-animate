import { useCallback, useEffect, useState } from 'react';

import {
  exportToSvg,
  restoreElements,
  loadLibraryFromBlob,
  getNonDeletedElements,
} from '@excalidraw/excalidraw';

import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import { loadScene } from './vendor/loadScene';
import { animateSvg } from './animate';

const importLibraryFromUrl = async (url: string) => {
  try {
    const request = await fetch(url);
    const blob = await request.blob();
    const libraryItems = await loadLibraryFromBlob(blob);
    return libraryItems.map((libraryItem) =>
      getNonDeletedElements(restoreElements(libraryItem.elements, null)),
    );
  } catch {
    window.alert('Unable to load library');
    return [];
  }
};

export const useLoadSvg = (
  initialData:
    | { elements: ExcalidrawElement[]; appState: AppState; files: BinaryFiles }
    | undefined,
  theme: 'light' | 'dark',  
) => {
  const [loading, setLoading] = useState(true);
  const [loadedSvgList, setLoadedSvgList] = useState<
    {
      svg: SVGSVGElement; // For Viewer
      rawSvg: SVGSVGElement; // For Export
      finishedMs: number;
    }[]
  >([]);

  const loadDataList = useCallback(
    async (
      dataList: {
        elements: readonly ExcalidrawElement[];
        appState: Parameters<typeof exportToSvg>[0]['appState'];
        files: BinaryFiles;
      }[],
      inSequence?: boolean,
    ) => {
      const hash = window.location.hash.slice(1);
      const searchParams = new URLSearchParams(hash);
      const options = {
        startMs: undefined as number | undefined,
        pointerImg: searchParams.get('pointerImg') || undefined,
        pointerWidth: searchParams.get('pointerWidth') || undefined,
        pointerHeight: searchParams.get('pointerHeight') || undefined,
      };

      // Convert black tones to near-white in dark mode to maintain contrast
      const blackList = ['#000', '#000000', '#1e1e1e', 'black'];
      const toLightColorIfBlack = (c?: string) =>
        blackList.includes(c?.toLowerCase() ?? '') ? '#e0e0e0' : c;

      const svgList = await Promise.all(
        dataList.map(async (data) => {
          const elements = getNonDeletedElements(data.elements);

          // 1. Export SVG without any theme adjustments (original colors)
          const rawSvg = await exportToSvg({
            elements, // original
            files: data.files,
            appState: data.appState,
            exportPadding: 30,
          });

          const result = animateSvg(rawSvg, elements, options);
          if (inSequence) {
            // ToDo: Changes options.startMs inside Promise.all (race condition risk)
            options.startMs = result.finishedMs;
          }
          // 2. Create Viewer SVG with dark mode adjustments if needed
          const elementsForViewer =
            theme === 'dark'
              ? elements.map((el) => ({
                  ...el,
                  strokeColor: toLightColorIfBlack(el.strokeColor),
                  backgroundColor: toLightColorIfBlack(el.backgroundColor),
                }))
              : elements;
          const viewerSvg = await exportToSvg({
            elements: elementsForViewer,
            files: data.files,
            appState: { ...data.appState, exportBackground: false },
            exportPadding: 30,
          });
          const resultViewerSvg = animateSvg(viewerSvg, elements, options);
          if (inSequence) {
            // ToDo: Same issue: changes options.startMs (race condition risk)
            options.startMs = resultViewerSvg.finishedMs;
          }

          // Return both viewer and export SVGs
          return { svg: viewerSvg, rawSvg, finishedMs: result.finishedMs };
        }),
      );
      setLoadedSvgList(svgList);
      return svgList;
    },
    [theme],
  );

  useEffect(() => {
    (async () => {
      const hash = window.location.hash.slice(1);
      const searchParams = new URLSearchParams(hash);
      const matchIdKey = /([a-zA-Z0-9_-]+),?([a-zA-Z0-9_-]*)/.exec(
        searchParams.get('json') || '',
      );
      if (matchIdKey) {
        const [, id, key] = matchIdKey;
        const data = await loadScene(id, key, null);
        const [{ svg, finishedMs }] = await loadDataList([data]);
        if (searchParams.get('autoplay') === 'no') {
          svg.setCurrentTime(finishedMs);
        }
      }
      const matchLibrary = /(.*\.excalidrawlib)/.exec(
        searchParams.get('library') || '',
      );
      if (matchLibrary) {
        const [, url] = matchLibrary;
        const dataList = await importLibraryFromUrl(url);
        const svgList = await loadDataList(
          dataList.map((elements) => ({ elements, appState: {}, files: {} })),
          searchParams.has('sequence'),
        );
        if (searchParams.get('autoplay') === 'no') {
          svgList.forEach(({ svg, finishedMs }) => {
            svg.setCurrentTime(finishedMs);
          });
        }
      }
      if (!matchIdKey && !matchLibrary && initialData) {
        await loadDataList([initialData]);
      }
      setLoading(false);
    })();
  }, [loadDataList, initialData]);

  return { loading, loadedSvgList, loadDataList };
};

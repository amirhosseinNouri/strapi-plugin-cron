import '@testing-library/jest-dom';

// jsdom gaps used by CodeMirror / the design system.
if (!document.createRange().getClientRects) {
  (Range.prototype as any).getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] });
  (Range.prototype as any).getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
}
(window as any).ResizeObserver =
  (window as any).ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as any);
(window as any).scrollTo = () => {};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
(Element.prototype as any).hasPointerCapture = (Element.prototype as any).hasPointerCapture || (() => false);
(Element.prototype as any).releasePointerCapture = (Element.prototype as any).releasePointerCapture || (() => {});

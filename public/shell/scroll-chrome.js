/**
 * Sticky header scroll state + transient "is-scrolling" class on the scroll root.
 * @param {{ scrollRoot: Element; header: Element }} opts
 */
export function initScrollChrome({ scrollRoot, header }) {
  if (!scrollRoot || !header) return;
  let scrollTimer = null;
  const onScroll = () => {
    header.classList.toggle("is-doc-scrolled", scrollRoot.scrollTop > 20);
    scrollRoot.classList.add("is-scrolling");
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      scrollRoot.classList.remove("is-scrolling");
    }, 1500);
  };
  scrollRoot.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

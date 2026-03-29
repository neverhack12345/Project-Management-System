const STORAGE_KEY = "vault_sidebar_collapsed_v1";

/**
 * @param {HTMLElement | null} el
 * @returns {HTMLElement[]}
 */
function asToggleList(el) {
  if (!el) return [];
  return [el];
}

/**
 * Toggle `vault-sidebar-collapsed` on body; persist preference.
 * @param {{
 *   toggleEl?: HTMLElement | null;
 *   toggleEls?: HTMLElement[] | NodeListOf<HTMLElement> | null;
 *   sidebarEl: HTMLElement | null;
 * }} opts
 */
export function initVaultSidebarCollapse({ toggleEl, toggleEls, sidebarEl }) {
  const raw = toggleEls != null ? [...toggleEls] : asToggleList(toggleEl || null);
  const toggles = raw.filter(Boolean);
  if (!toggles.length || !sidebarEl) return;

  const controlsId = sidebarEl.id || "vaultSidebar";

  function syncUi(collapsed) {
    document.body.classList.toggle("vault-sidebar-collapsed", collapsed);
    for (const btn of toggles) {
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.setAttribute("aria-controls", controlsId);
      btn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
      const icon = btn.querySelector(".material-symbols-outlined");
      if (icon) icon.textContent = collapsed ? "chevron_right" : "chevron_left";
    }
    sidebarEl.setAttribute("aria-hidden", collapsed ? "true" : "false");
    if ("inert" in sidebarEl) sidebarEl.inert = collapsed;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  let collapsed = false;
  try {
    collapsed = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    /* ignore */
  }
  syncUi(collapsed);

  for (const btn of toggles) {
    btn.addEventListener("click", () => {
      syncUi(!document.body.classList.contains("vault-sidebar-collapsed"));
    });
  }
}

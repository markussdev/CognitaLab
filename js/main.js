/* Split from script.js. Loaded as classic global script. */
document.addEventListener('DOMContentLoaded', () => {
  buildTemplateGrid();
  setupTopbar();
  setupDock();
  setupCanvasEvents();
  setupKeyboardShortcuts();
  loadFromLocalStorage();
  renderDrawerDefault();
  updateStatusBar();
  updateUndoRedoButtons();
  setupHomeScroll();
});

function setupHomeScroll() {
  const screen = document.getElementById('homeScreen');
  const btnUp  = document.getElementById('homeScrollUp');
  const btnDn  = document.getElementById('homeScrollDown');
  if (!screen || !btnUp || !btnDn) return;

  const STEP = 320;

  btnUp.addEventListener('click', () => screen.scrollBy({ top: -STEP, behavior: 'smooth' }));
  btnDn.addEventListener('click', () => screen.scrollBy({ top:  STEP, behavior: 'smooth' }));

  function updateBtns() {
    const atTop    = screen.scrollTop <= 4;
    const atBottom = screen.scrollTop + screen.clientHeight >= screen.scrollHeight - 4;
    btnUp.classList.toggle('disabled', atTop);
    btnDn.classList.toggle('disabled', atBottom);
  }

  screen.addEventListener('scroll', updateBtns, { passive: true });
  updateBtns();
}


/* Split from script.js. Loaded as classic global script. */
function startPresentation() {
  if (state.blocks.length === 0) { toast('Nenhum bloco para apresentar', 'error'); return; }
  state.presentMode = true;
  state.presentStep = 0;
  document.getElementById('presentOverlay').style.display = 'flex';
  updatePresentCard();
  highlightPresentBlock();
  document.getElementById('dock').style.display = 'none';
  document.getElementById('drawer').style.display = 'none';
  document.getElementById('workspacePanel').style.display = 'none';
  document.getElementById('btnPresent').textContent = '';
}

function updatePresentCard() {
  const blocks = state.blocks;
  const i = state.presentStep;
  const block = blocks[i];
  if (!block) return;
  document.getElementById('presentStep').textContent = `Etapa ${i+1}/${blocks.length}`;
  document.getElementById('presentTitle').textContent = block.title;
  document.getElementById('presentDesc').textContent = block.description || 'Componente da arquitetura CognitaMente.';
  document.getElementById('presentPrev').disabled = i === 0;
  document.getElementById('presentNext').disabled = i === blocks.length - 1;
}

function highlightPresentBlock() {
  document.querySelectorAll('.block').forEach(el => el.classList.remove('present-highlight'));
  document.querySelectorAll('.connection-path').forEach(p => p.classList.remove('flow-animate'));
  const block = state.blocks[state.presentStep];
  if (!block) return;
  const el = document.getElementById('block-' + block.id);
  if (el) {
    el.classList.add('present-highlight');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  // Animate connections from this block
  const conn = state.connections.find(c => c.from === block.id);
  if (conn) {
    const path = document.querySelector(`.connection-path[data-id="${conn.id}"]`);
    if (path) path.classList.add('flow-animate');
  }
}

function stopPresentation() {
  state.presentMode = false;
  document.getElementById('presentOverlay').style.display = 'none';
  document.getElementById('dock').style.display = 'flex';
  document.getElementById('drawer').style.display = 'block';
  document.querySelectorAll('.block').forEach(el => el.classList.remove('present-highlight'));
  document.querySelectorAll('.connection-path').forEach(p => p.classList.remove('flow-animate'));
}

document.getElementById('presentNext').addEventListener('click', () => {
  if (state.presentStep < state.blocks.length - 1) {
    state.presentStep++;
    updatePresentCard();
    highlightPresentBlock();
  }
});
document.getElementById('presentPrev').addEventListener('click', () => {
  if (state.presentStep > 0) {
    state.presentStep--;
    updatePresentCard();
    highlightPresentBlock();
  }
});



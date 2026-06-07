/* Split from script.js. Loaded as classic global script. */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════ MODAL CUSTOMIZADO ════════════════════════════════
function openModal({ title, message, defaultValue = '', confirmText = 'Confirmar', cancelText = 'Cancelar', inputType = null }) {
  return new Promise((resolve) => {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modalConfirm').textContent = confirmText;
    document.getElementById('modalCancel').textContent = cancelText;

    const input = document.getElementById('modalInput');
    if (inputType) {
      input.style.display = 'block';
      input.type = inputType;
      input.value = defaultValue;
      setTimeout(() => input.focus(), 100);
    } else {
      input.style.display = 'none';
    }

    document.getElementById('modalOverlay').style.display = 'flex';

    const finish = (val) => {
      document.getElementById('modalOverlay').style.display = 'none';
      cleanup();
      resolve(val);
    };

    const onConfirm = () => finish(inputType ? input.value : true);
    const onCancel = () => finish(null);
    const onKey = (e) => {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    };

    document.getElementById('modalConfirm').addEventListener('click', onConfirm, { once: true });
    document.getElementById('modalCancel').addEventListener('click', onCancel, { once: true });
    document.getElementById('modalCloseBtn').addEventListener('click', onCancel, { once: true });
    document.addEventListener('keydown', onKey);

    function cleanup() {
      document.removeEventListener('keydown', onKey);
    }
  });
}

// ═══════════════════════════ TOAST ═══════════════════════════════════════════
function toast(message, type = 'info') {
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span style="color:var(--${type==='success'?'accent':type==='error'?'danger':'accent-blue'})">${icons[type]}</span>${escHtml(message)}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 350);
  }, 2200);
}


function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g,'&quot;');
}


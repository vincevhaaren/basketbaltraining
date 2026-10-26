(() => {
  const cfg = window.HOOPLAB_CONFIG || {};
  const $ = id => document.getElementById(id);
  const state = { token: null, user: null, trainings: [] };
  const loginView = $('login-view'), appView = $('app-view');
  const configured = () => cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('JOUW-PROJECT') && !cfg.SUPABASE_ANON_KEY.includes('JOUW_');
  async function api(action, payload = {}, file = null) {
    if (!configured()) throw new Error('De app is nog niet gekoppeld aan Supabase. Volg README.md om de configuratie af te maken.');
    const body = { action, ...payload };
    if (file) {
      if (file.size > 20 * 1024 * 1024) throw new Error('Bestanden mogen maximaal 20 MB zijn.');
      body.file = { name: file.name, type: file.type || 'application/octet-stream', base64: await toBase64(file) };
    }
    const response = await fetch(`${cfg.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/basketbal-api`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': cfg.SUPABASE_ANON_KEY, ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {}) }, body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Er ging iets mis. Probeer het opnieuw.');
    return data;
  }
  function toBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); }); }
  function showError(el, message) { el.textContent = message || ''; }
  function setLoggedIn(user, token) {
    state.user = user; state.token = token;
    loginView.classList.add('hidden'); appView.classList.remove('hidden');
    $('top-user').classList.remove('hidden'); $('top-user').textContent = `${user.label || (user.is_admin ? 'Beheerder' : 'Speler')}  ·  ${user.is_admin ? 'ADMIN' : 'SPELER'}`;
    $('admin-panel').classList.toggle('hidden', !user.is_admin);
  }
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault(); const btn = e.submitter; btn.disabled = true; showError($('login-error'), '');
    try { const result = await api('login', { code: $('access-code').value.trim() }); setLoggedIn(result.user, result.token); $('access-code').value = ''; await loadTrainings(); }
    catch (err) { showError($('login-error'), err.message); }
    finally { btn.disabled = false; }
  });
  $('logout-btn').addEventListener('click', async () => { try { await api('logout'); } catch (_) {} state.token = null; state.user = null; state.trainings = []; appView.classList.add('hidden'); loginView.classList.remove('hidden'); $('top-user').classList.add('hidden'); $('training-list').innerHTML = ''; });
  async function loadTrainings() {
    showError($('load-error'), ''); $('training-list').innerHTML = '<p class="muted">Trainingen laden...</p>';
    try { const result = await api('list'); state.trainings = result.trainings || []; renderTrainings(); }
    catch (err) { $('training-list').innerHTML = ''; showError($('load-error'), err.message); }
  }
  function renderTrainings() {
    const term = $('search').value.trim().toLowerCase();
    const rows = state.trainings.filter(t => `${t.title} ${t.category} ${t.description} ${t.level}`.toLowerCase().includes(term));
    $('training-count').textContent = state.trainings.length;
    $('training-list').innerHTML = rows.map(t => `<article class="training-card"><div class="training-art"><span class="category">${esc(t.category || 'Training')}</span><span class="ball">🏀</span></div><div class="training-content"><h3>${esc(t.title)}</h3><div class="meta"><span>◷ ${Number(t.duration) || 20} min</span><span>◆ ${esc(t.level || 'Alle niveaus')}</span></div><p>${esc(t.description)}</p>${t.file_url ? `<a class="attachment" href="${safeUrl(t.file_url)}" target="_blank" rel="noopener noreferrer">↗ Bekijk bijlage / video</a>` : ''}${state.user?.is_admin ? `<button class="delete-btn" data-delete="${esc(t.id)}">Verwijder training</button>` : ''}</div></article>`).join('');
    $('empty-state').classList.toggle('hidden', rows.length > 0); $('training-list').classList.toggle('hidden', rows.length === 0);
    $('training-list').querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('Weet je zeker dat je deze training wilt verwijderen?')) return; btn.disabled = true; try { await api('delete', { id: btn.dataset.delete }); await loadTrainings(); } catch (err) { alert(err.message); btn.disabled = false; } }));
  }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function safeUrl(v) { try { const u = new URL(v); return ['https:'].includes(u.protocol) ? esc(u.href) : '#'; } catch (_) { return '#'; } }
  $('search').addEventListener('input', renderTrainings);
  $('training-form').addEventListener('submit', async e => {
    e.preventDefault(); const btn = $('publish-btn'); btn.disabled = true; showError($('upload-status'), 'Training publiceren...');
    try {
      const file = $('training-file').files[0] || null;
      await api('create', { title: $('title').value.trim(), category: $('category').value, duration: Number($('duration').value) || 20, level: $('level').value, description: $('description').value.trim() }, file);
      $('training-form').reset(); $('duration').value = 20; showError($('upload-status'), 'Training gepubliceerd. Iedereen kan deze nu zien.'); await loadTrainings();
    } catch (err) { showError($('upload-status'), err.message); }
    finally { btn.disabled = false; }
  });
  if (!configured()) $('login-error').textContent = 'Setup nodig: vul eerst je Supabase URL en anon key in config.js in. Zie README.md.';
})();

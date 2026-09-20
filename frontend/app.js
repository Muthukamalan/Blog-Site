'use strict';

/* ------------------------------------------------------------------ *
 *  Conduit frontend – vanilla JS single-page app (hash routing)
 *  Covers every endpoint of the Conduit Realworld API spec:
 *    GET  /api/health-check
 *    POST /api/users                      (register)
 *    POST /api/users/login
 *    GET/PUT /api/user
 *    GET  /api/profiles/{username}
 *    POST/DELETE /api/profiles/{username}/follow
 *    GET  /api/tags
 *    GET  /api/articles/feed
 *    GET/POST /api/articles               (filters: tag, author, favorited)
 *    GET/PUT/DELETE /api/articles/{slug}
 *    POST/DELETE /api/articles/{slug}/favorite
 *    GET/POST /api/articles/{slug}/comments
 *    DELETE /api/articles/{slug}/comments/{id}
 * ------------------------------------------------------------------ */

const PAGE_SIZE = 10;

const state = {
  base: localStorage.getItem('conduit.base') || '',
  token: localStorage.getItem('conduit.token') || null,
  user: null,
};

const app = document.getElementById('app');
let routeId = 0; // guards against stale async renders

/* ---------------------------- helpers ----------------------------- */

const enc = encodeURIComponent;
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isAuthed = () => !!(state.token && state.user);
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function hash(path, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') qs.set(k, v);
  const s = qs.toString();
  return '#' + path + (s ? '?' + s : '');
}
const go = (path) => { location.hash = path; };

function currentRoute() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return {
    parts: path.split('/').filter(Boolean).map(decodeURIComponent),
    q: new URLSearchParams(qs),
  };
}

let toastTimer;
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 2600);
}

/* ------------------------------ API ------------------------------- */

class ApiError extends Error {
  constructor(status, messages) {
    super(messages[0] || 'Request failed');
    this.status = status;
    this.messages = messages;
  }
}

function parseErrors(status, statusText, data) {
  const out = [];
  const skip = ['body', 'query', 'path', 'user', 'article', 'comment'];
  if (data && Array.isArray(data.detail)) {
    for (const d of data.detail) {
      const field = Array.isArray(d.loc) ? d.loc.filter((x) => !skip.includes(x)).join('.') : '';
      out.push(field ? `${field}: ${d.msg}` : d.msg);
    }
  } else if (data && typeof data.detail === 'string') {
    out.push(data.detail);
  } else if (data && data.errors && typeof data.errors === 'object') {
    for (const [k, v] of Object.entries(data.errors)) out.push(`${k}: ${[].concat(v).join(', ')}`);
  }
  if (!out.length) out.push(`${status} ${statusText || 'Request failed'}`);
  return out;
}

async function api(method, path, { body, query } = {}) {
  let url = state.base.replace(/\/+$/, '') + path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    const s = qs.toString();
    if (s) url += '?' + s;
  }
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (state.token) headers['Authorization'] = 'Token ' + state.token;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, [
      `Cannot reach the API${state.base ? ' at ' + state.base : ''}. Check the API base URL in the footer (and CORS if it is on another origin).`,
    ]);
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const msgs = parseErrors(res.status, res.statusText, data);
    if ((res.status === 401 || res.status === 403) && !state.token) msgs.push('This request needs you to sign in.');
    throw new ApiError(res.status, msgs);
  }
  return data;
}

/* ---------------------------- session ----------------------------- */

function setSession(user) {
  state.token = user.token || state.token;
  state.user = user;
  localStorage.setItem('conduit.token', state.token);
}
function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('conduit.token');
}

/* ------------------------- view fragments ------------------------- */

function avatar(u, size = '') {
  const initial = (u.username || '?').charAt(0);
  return u.image
    ? `<img class="avatar ${size}" src="${esc(u.image)}" alt="" data-initial="${esc(initial)}">`
    : `<span class="avatar ${size}" aria-hidden="true">${esc(initial)}</span>`;
}
// Broken avatar URLs fall back to the initial
document.addEventListener('error', (e) => {
  const t = e.target;
  if (t instanceof HTMLImageElement && t.classList.contains('avatar')) {
    const s = document.createElement('span');
    s.className = t.className;
    s.textContent = t.dataset.initial || '?';
    t.replaceWith(s);
  }
}, true);

const tagsHtml = (list) =>
  list && list.length
    ? `<div class="tags">${list.map((t) => `<a class="tag" href="${hash('/', { tab: 'tag', tag: t })}">${esc(t)}</a>`).join('')}</div>`
    : '';

function favBtn(a, long = false) {
  const label = long ? (a.favorited ? 'Unfavorite article' : 'Favorite article') + ` (${a.favoritesCount})` : a.favoritesCount;
  return `<button type="button" class="fav ${a.favorited ? 'on' : ''}" data-fav="${esc(a.slug)}" data-on="${a.favorited}" data-long="${long}" aria-pressed="${a.favorited}" title="${a.favorited ? 'Remove from favorites' : 'Add to favorites'}">♥ ${label}</button>`;
}

const followBtn = (p) =>
  `<button type="button" class="btn ghost small" data-follow="${esc(p.username)}" data-on="${p.following}">${p.following ? 'Unfollow' : 'Follow'} ${esc(p.username)}</button>`;

const who = (u, dateIso) =>
  `<a class="who" href="#/profile/${enc(u.username)}">${avatar(u)}<span><strong>${esc(u.username)}</strong>${dateIso ? `<time datetime="${esc(dateIso)}">${fmtDate(dateIso)}</time>` : ''}</span></a>`;

function articlePreview(a) {
  return `<article class="preview">
    <div class="preview-head">${who(a.author, a.createdAt)}${favBtn(a)}</div>
    <a class="preview-body" href="#/article/${enc(a.slug)}"><h2>${esc(a.title)}</h2><p>${esc(a.description)}</p></a>
    ${tagsHtml(a.tagList)}
  </article>`;
}

function pager(count, page, hrefFor) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (pages <= 1) return '';
  return `<nav class="pager" aria-label="Pages">
    <a class="${page <= 1 ? 'off' : ''}" href="${hrefFor(page - 1)}">Previous</a>
    <span>Page ${page} of ${pages} · ${count} articles</span>
    <a class="${page >= pages ? 'off' : ''}" href="${hrefFor(page + 1)}">Next</a>
  </nav>`;
}

function field(label, name, o = {}) {
  const attrs = [
    `name="${name}"`, `id="f-${name}"`,
    o.required ? 'required' : '',
    o.minlength ? `minlength="${o.minlength}"` : '',
    o.placeholder ? `placeholder="${esc(o.placeholder)}"` : '',
    o.readonly ? 'readonly' : '',
    o.autocomplete ? `autocomplete="${o.autocomplete}"` : '',
  ].join(' ');
  const input = o.rows
    ? `<textarea ${attrs} rows="${o.rows}">${esc(o.value)}</textarea>`
    : `<input type="${o.type || 'text'}" ${attrs} value="${esc(o.value)}">`;
  return `<label class="field" for="f-${name}"><span>${label}</span>${input}${o.hint ? `<small>${o.hint}</small>` : ''}</label>`;
}

function showErrors(box, err) {
  const msgs = err.messages || [err.message || 'Something went wrong'];
  box.innerHTML = msgs.length > 1 ? `<ul>${msgs.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : esc(msgs[0]);
  box.hidden = false;
}

function bindForm(form, handler) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const box = form.querySelector('.errors');
    box.hidden = true;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await handler(Object.fromEntries(new FormData(form)));
    } catch (err) {
      showErrors(box, err);
    } finally {
      btn.disabled = false;
    }
  });
}

const errorPage = (err) => {
  app.innerHTML = `<div class="errors" role="alert">${(err.messages || [err.message]).map(esc).join('<br>')}</div>
    <p><a href="#/">Back to home</a></p>`;
};

/* ----------------------------- nav -------------------------------- */

function renderNav() {
  const { parts } = currentRoute();
  const a = parts[0] || '';
  const link = (href, label, active) =>
    `<a href="${href}" ${active ? 'class="active" aria-current="page"' : ''}>${label}</a>`;
  let h = link('#/', 'Home', a === '');
  if (isAuthed()) {
    h += link('#/editor', 'New article', a === 'editor' && !parts[1]);
    h += link('#/settings', 'Settings', a === 'settings');
    h += link(`#/profile/${enc(state.user.username)}`, esc(state.user.username), a === 'profile' && parts[1] === state.user.username);
  } else {
    h += link('#/login', 'Sign in', a === 'login');
    h += link('#/register', 'Sign up', a === 'register');
  }
  document.getElementById('nav').innerHTML = h;
}

/* --------------------------- article list ------------------------- */

async function articleList(id, el, endpoint, query, page, hrefFor) {
  el.innerHTML = '<p class="muted">Loading articles…</p>';
  try {
    const data = await api('GET', endpoint, { query: { ...query, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE } });
    if (id !== routeId) return;
    el.innerHTML = data.articles.length
      ? data.articles.map(articlePreview).join('') + pager(data.articlesCount, page, hrefFor)
      : '<p class="empty">No articles here yet.</p>';
  } catch (err) {
    if (id !== routeId) return;
    el.innerHTML = `<div class="errors" role="alert">${err.messages.map(esc).join('<br>')}</div>`;
  }
}

/* ------------------------------ pages ----------------------------- */

async function homePage(id, q) {
  const tag = q.get('tag');
  let tab = q.get('tab') || (tag ? 'tag' : isAuthed() ? 'feed' : 'global');
  if (tab === 'feed' && !isAuthed()) tab = 'global';
  if (tab === 'tag' && !tag) tab = 'global';
  const page = Math.max(1, parseInt(q.get('page'), 10) || 1);

  const tabLink = (key, label, params) =>
    `<a href="${hash('/', params)}" class="${tab === key ? 'active' : ''}">${label}</a>`;

  app.innerHTML = `
    <section class="masthead">
      <h1>Conduit</h1>
      <p>A place to share what you know.</p>
    </section>
    <div class="layout">
      <div>
        <div class="tabs">
          ${isAuthed() ? tabLink('feed', 'Your feed', { tab: 'feed' }) : ''}
          ${tabLink('global', 'Global feed', { tab: 'global' })}
          ${tag ? tabLink('tag', '#' + esc(tag), { tab: 'tag', tag }) : ''}
        </div>
        <div id="list"></div>
      </div>
      <aside class="side"><h3>Popular tags</h3><div id="tags" class="tags"><span class="muted">Loading…</span></div></aside>
    </div>`;

  api('GET', '/api/tags').then(({ tags }) => {
    if (id !== routeId) return;
    document.getElementById('tags').innerHTML = tags.length
      ? tags.map((t) => `<a class="tag" href="${hash('/', { tab: 'tag', tag: t })}">${esc(t)}</a>`).join('')
      : '<span class="muted">No tags yet.</span>';
  }).catch(() => {
    if (id === routeId) document.getElementById('tags').innerHTML = '<span class="muted">Tags unavailable.</span>';
  });

  const hrefFor = (p) => hash('/', { tab, tag: tab === 'tag' ? tag : '', page: p > 1 ? p : '' });
  const list = document.getElementById('list');
  if (tab === 'feed') await articleList(id, list, '/api/articles/feed', {}, page, hrefFor);
  else await articleList(id, list, '/api/articles', tab === 'tag' ? { tag } : {}, page, hrefFor);
}

function authPage(kind) {
  const login = kind === 'login';
  app.innerHTML = `
    <section class="narrow">
      <h1>${login ? 'Sign in' : 'Sign up'}</h1>
      <p class="sub">${login ? 'Need an account? <a href="#/register">Sign up</a>' : 'Have an account? <a href="#/login">Sign in</a>'}</p>
      <form id="f">
        <div class="errors" role="alert" hidden></div>
        ${login ? '' : field('Username', 'username', { required: true, minlength: 3, autocomplete: 'username', hint: 'At least 3 characters.' })}
        ${field('Email', 'email', { type: 'email', required: true, autocomplete: 'email' })}
        ${field('Password', 'password', { type: 'password', required: true, minlength: 8, autocomplete: login ? 'current-password' : 'new-password', hint: login ? '' : 'At least 8 characters.' })}
        <button class="btn block" type="submit">${login ? 'Sign in' : 'Create account'}</button>
      </form>
    </section>`;
  bindForm(document.getElementById('f'), async (d) => {
    const res = login
      ? await api('POST', '/api/users/login', { body: { user: { email: d.email, password: d.password } } })
      : await api('POST', '/api/users', { body: { user: { username: d.username, email: d.email, password: d.password } } });
    setSession(res.user);
    toast(login ? 'Signed in' : 'Account created');
    go('/');
  });
}

async function settingsPage(id) {
  app.innerHTML = '<p class="muted">Loading settings…</p>';
  try {
    const { user } = await api('GET', '/api/user');
    if (id !== routeId) return;
    setSession(user);
    renderNav();
  } catch (err) {
    if (id !== routeId) return;
    return errorPage(err);
  }
  const u = state.user;
  app.innerHTML = `
    <section class="narrow">
      <h1>Your settings</h1>
      <form id="f">
        <div class="errors" role="alert" hidden></div>
        ${field('Profile picture URL', 'image', { type: 'url', value: u.image, placeholder: 'https://…' })}
        ${field('Username', 'username', { required: true, minlength: 3, value: u.username, autocomplete: 'username' })}
        ${field('Bio', 'bio', { rows: 5, value: u.bio, placeholder: 'A few words about you' })}
        ${field('Email', 'email', { type: 'email', required: true, value: u.email, autocomplete: 'email' })}
        ${field('New password', 'password', { type: 'password', minlength: 8, autocomplete: 'new-password', hint: 'Leave blank to keep your current password.' })}
        <button class="btn" type="submit">Save changes</button>
      </form>
      <hr>
      <button class="btn danger" id="logout" type="button">Sign out</button>
    </section>`;
  bindForm(document.getElementById('f'), async (d) => {
    const user = { image: d.image, bio: d.bio };
    if (d.username && d.username !== u.username) user.username = d.username;
    if (d.email && d.email !== u.email) user.email = d.email;
    if (d.password) user.password = d.password;
    const res = await api('PUT', '/api/user', { body: { user } });
    setSession(res.user);
    renderNav();
    toast('Settings saved');
  });
  document.getElementById('logout').addEventListener('click', () => {
    clearSession();
    toast('Signed out');
    go('/');
    router();
  });
}

async function editorPage(id, slug) {
  let a = null;
  if (slug) {
    app.innerHTML = '<p class="muted">Loading article…</p>';
    try {
      a = (await api('GET', `/api/articles/${enc(slug)}`)).article;
    } catch (err) { if (id === routeId) errorPage(err); return; }
    if (id !== routeId) return;
    if (a.author.username !== state.user.username) return errorPage({ messages: ['Only the author can edit this article.'] });
  }
  app.innerHTML = `
    <section class="narrow" style="max-width:720px">
      <h1>${a ? 'Edit article' : 'New article'}</h1>
      <form id="f">
        <div class="errors" role="alert" hidden></div>
        ${field('Title', 'title', { required: true, minlength: 5, value: a?.title, hint: 'At least 5 characters.' })}
        ${field('Description', 'description', { required: true, minlength: 10, value: a?.description, hint: 'At least 10 characters. A one-line summary.' })}
        ${field('Body', 'body', { required: true, minlength: 10, rows: 12, value: a?.body, hint: 'At least 10 characters.' })}
        ${a
          ? field('Tags', 'tags', { readonly: true, value: (a.tagList || []).join(' '), hint: 'Tags can’t be changed after publishing.' })
          : field('Tags', 'tags', { placeholder: 'python fastapi kubernetes', hint: 'Separate tags with spaces or commas.' })}
        <button class="btn" type="submit">${a ? 'Save changes' : 'Publish article'}</button>
      </form>
    </section>`;
  bindForm(document.getElementById('f'), async (d) => {
    if (a) {
      const res = await api('PUT', `/api/articles/${enc(a.slug)}`, {
        body: { article: { title: d.title, description: d.description, body: d.body } },
      });
      toast('Changes saved');
      go(`/article/${enc(res.article.slug)}`);
    } else {
      const tagList = [...new Set((d.tags || '').split(/[\s,]+/).filter(Boolean))];
      const res = await api('POST', '/api/articles', {
        body: { article: { title: d.title, description: d.description, body: d.body, tagList } },
      });
      toast('Article published');
      go(`/article/${enc(res.article.slug)}`);
    }
  });
}

function commentHtml(c) {
  const mine = isAuthed() && c.author.username === state.user.username;
  return `<div class="comment" data-cid="${c.id}">
    <p>${esc(c.body)}</p>
    <footer>
      <a class="who small" href="#/profile/${enc(c.author.username)}">${avatar(c.author, 'sm')}<span>${esc(c.author.username)}</span></a>
      <time datetime="${esc(c.createdAt)}">${fmtDate(c.createdAt)}</time>
      ${mine ? `<button type="button" class="link danger" data-del-comment="${c.id}">Delete</button>` : ''}
    </footer>
  </div>`;
}

async function articlePage(id, slug) {
  app.innerHTML = '<p class="muted">Loading article…</p>';
  let a, comments;
  try {
    [{ article: a }, { comments }] = await Promise.all([
      api('GET', `/api/articles/${enc(slug)}`),
      api('GET', `/api/articles/${enc(slug)}/comments`),
    ]);
  } catch (err) { if (id === routeId) errorPage(err); return; }
  if (id !== routeId) return;

  const own = isAuthed() && a.author.username === state.user.username;
  app.innerHTML = `
    <section class="article-head">
      <h1>${esc(a.title)}</h1>
      <div class="byline">
        ${who(a.author, a.createdAt)}
        <div class="actions">
          ${own
            ? `<a class="btn ghost small" href="#/editor/${enc(a.slug)}">Edit article</a>
               <button type="button" class="btn danger small" id="del-article">Delete article</button>`
            : followBtn(a.author)}
          ${favBtn(a, true)}
        </div>
      </div>
    </section>
    <section class="article-body">
      <p class="lede">${esc(a.description)}</p>
      <div class="prose">${esc(a.body)}</div>
      ${tagsHtml(a.tagList)}
      ${a.updatedAt && a.updatedAt !== a.createdAt ? `<p class="muted" style="margin-top:16px;font-size:14px">Last updated ${fmtDate(a.updatedAt)}</p>` : ''}
    </section>
    <section class="comments">
      <h2>Comments (<span id="ccount">${comments.length}</span>)</h2>
      ${isAuthed()
        ? `<form id="cform" class="comment-form">
             <div class="errors" role="alert" hidden></div>
             <textarea name="body" rows="3" required placeholder="Write a comment…" aria-label="Comment"></textarea>
             <button class="btn small" type="submit">Post comment</button>
           </form>`
        : '<p class="muted"><a href="#/login">Sign in</a> or <a href="#/register">sign up</a> to comment.</p>'}
      <div id="clist">${comments.map(commentHtml).join('')}</div>
      <p class="empty" id="cempty" ${comments.length ? 'hidden' : ''}>No comments yet.</p>
    </section>`;

  const clist = document.getElementById('clist');
  const syncCount = () => {
    const n = clist.children.length;
    document.getElementById('ccount').textContent = n;
    document.getElementById('cempty').hidden = n > 0;
  };

  const delBtn = document.getElementById('del-article');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      if (!confirm('Delete this article? This can’t be undone.')) return;
      delBtn.disabled = true;
      try {
        await api('DELETE', `/api/articles/${enc(a.slug)}`);
        toast('Article deleted');
        go('/');
      } catch (err) { toast(err.message, true); delBtn.disabled = false; }
    });
  }

  const cform = document.getElementById('cform');
  if (cform) {
    bindForm(cform, async (d) => {
      const { comment } = await api('POST', `/api/articles/${enc(a.slug)}/comments`, { body: { comment: { body: d.body } } });
      clist.insertAdjacentHTML('afterbegin', commentHtml(comment));
      cform.reset();
      syncCount();
    });
  }

  clist.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del-comment]');
    if (!btn) return;
    btn.disabled = true;
    try {
      await api('DELETE', `/api/articles/${enc(a.slug)}/comments/${btn.dataset.delComment}`);
      btn.closest('.comment').remove();
      syncCount();
      toast('Comment deleted');
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  });
}

async function profilePage(id, username, sub, q) {
  app.innerHTML = '<p class="muted">Loading profile…</p>';
  let p;
  try {
    p = (await api('GET', `/api/profiles/${enc(username)}`)).profile;
  } catch (err) { if (id === routeId) errorPage(err); return; }
  if (id !== routeId) return;

  const favorites = sub === 'favorites';
  const page = Math.max(1, parseInt(q.get('page'), 10) || 1);
  const me = isAuthed() && state.user.username === p.username;
  app.innerHTML = `
    <section class="profile-head">
      ${avatar(p, 'lg')}
      <h1>${esc(p.username)}</h1>
      ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
      ${me ? '<a class="btn ghost small" href="#/settings">Edit profile settings</a>' : followBtn(p)}
    </section>
    <div class="tabs">
      <a href="#/profile/${enc(p.username)}" class="${favorites ? '' : 'active'}">Articles</a>
      <a href="#/profile/${enc(p.username)}/favorites" class="${favorites ? 'active' : ''}">Favorited</a>
    </div>
    <div id="list"></div>`;
  const base = `/profile/${enc(p.username)}${favorites ? '/favorites' : ''}`;
  await articleList(
    id, document.getElementById('list'), '/api/articles',
    favorites ? { favorited: p.username } : { author: p.username },
    page, (n) => hash(base, { page: n > 1 ? n : '' }),
  );
}

/* ----------------------------- router ----------------------------- */

async function router() {
  const id = ++routeId;
  const { parts, q } = currentRoute();
  const [a, b, c] = parts;
  renderNav();
  window.scrollTo(0, 0);

  const needAuth = ['settings', 'editor'].includes(a);
  if (needAuth && !isAuthed()) return go('/login');
  if ((a === 'login' || a === 'register') && isAuthed()) return go('/');

  try {
    if (!a) return await homePage(id, q);
    if (a === 'login' || a === 'register') return authPage(a);
    if (a === 'settings') return await settingsPage(id);
    if (a === 'editor') return await editorPage(id, b);
    if (a === 'article' && b) return await articlePage(id, b);
    if (a === 'profile' && b) return await profilePage(id, b, c, q);
    app.innerHTML = '<h1>Page not found</h1><p><a href="#/">Back to home</a></p>';
  } catch (err) {
    if (id === routeId) errorPage(err);
  }
}

/* --------------------- global click handlers ---------------------- */

app.addEventListener('click', async (e) => {
  const fav = e.target.closest('[data-fav]');
  if (fav) {
    if (!isAuthed()) return go('/login');
    const slug = fav.dataset.fav;
    const on = fav.dataset.on === 'true';
    fav.disabled = true;
    try {
      const { article } = await api(on ? 'DELETE' : 'POST', `/api/articles/${enc(slug)}/favorite`);
      document.querySelectorAll(`[data-fav="${CSS.escape(slug)}"]`).forEach((b) => {
        b.outerHTML = favBtn(article, b.dataset.long === 'true');
      });
    } catch (err) { toast(err.message, true); fav.disabled = false; }
    return;
  }

  const follow = e.target.closest('[data-follow]');
  if (follow) {
    if (!isAuthed()) return go('/login');
    const name = follow.dataset.follow;
    const on = follow.dataset.on === 'true';
    follow.disabled = true;
    try {
      const { profile } = await api(on ? 'DELETE' : 'POST', `/api/profiles/${enc(name)}/follow`);
      document.querySelectorAll(`[data-follow="${CSS.escape(name)}"]`).forEach((b) => {
        b.outerHTML = followBtn(profile);
      });
      toast(profile.following ? `Following ${name}` : `Unfollowed ${name}`);
    } catch (err) { toast(err.message, true); follow.disabled = false; }
  }
});

/* ------------------------ footer: base + health ------------------- */

async function checkHealth() {
  const dot = document.getElementById('health-dot');
  const text = document.getElementById('health-text');
  dot.className = 'dot';
  text.textContent = 'Checking API…';
  try {
    await api('GET', '/api/health-check');
    dot.className = 'dot ok';
    text.textContent = 'API is healthy';
  } catch (err) {
    dot.className = 'dot down';
    text.textContent = err.status ? `API responded ${err.status}` : 'API unreachable';
  }
}

document.getElementById('health-btn').addEventListener('click', checkHealth);

const baseInput = document.getElementById('base-input');
baseInput.value = state.base;
document.getElementById('base-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  state.base = baseInput.value.trim();
  localStorage.setItem('conduit.base', state.base);
  toast('API base URL saved');
  await loadCurrentUser();
  router();
  checkHealth();
});

/* ------------------------------ boot ------------------------------ */

async function loadCurrentUser() {
  if (!state.token) return;
  try {
    const { user } = await api('GET', '/api/user');
    setSession(user);
  } catch (err) {
    if (err.status === 401 || err.status === 403 || err.status === 422) clearSession();
  }
}

window.addEventListener('hashchange', router);
(async () => {
  await loadCurrentUser();
  router();
  checkHealth();
})();

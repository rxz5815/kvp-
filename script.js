document.addEventListener('DOMContentLoaded', function() {
  initBackground();
  fetchLinks();

  const modal = document.getElementById('modal-overlay');
  const searchInput = document.getElementById('search-input');
  
  // --- 背景逻辑 ---
  window.setBackground = function(type) {
    let bg = type === 'random' ? `https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80&rand=${Math.random()}` : 'linear-gradient(135deg, #2c3e50 0%, #000 100%)';
    applyBg(bg);
    localStorage.setItem('nav_bg', bg);
  };

  function applyBg(val) {
    const container = document.getElementById('bg-container');
    if (val.startsWith('http')) {
      container.innerHTML = `<img src="${val}" style="opacity:0; transition:1s" onload="this.style.opacity=1">`;
    } else {
      container.innerHTML = ''; document.body.style.background = val;
    }
  }

  function initBackground() {
    applyBg(localStorage.getItem('nav_bg') || 'linear-gradient(135deg, #1a1a1a 0%, #000 100%)');
  }

  // --- 搜索逻辑 ---
  let currentEngine = "https://www.baidu.com/s?wd=";
  let isInternal = false;

  document.querySelectorAll('.engine').forEach(el => {
    el.onclick = function() {
      document.querySelectorAll('.engine').forEach(e => e.classList.remove('active'));
      this.classList.add('active');
      currentEngine = this.dataset.url;
      if(!isInternal) searchInput.placeholder = this.innerText + "一下";
    };
  });

  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.onclick = function() {
      document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      isInternal = (this.dataset.type === 'internal');
      searchInput.placeholder = isInternal ? "搜索站内..." : "百度一下";
    };
  });

  const doSearch = () => {
    const q = searchInput.value.trim();
    if (!q) return;
    if (isInternal) {
      document.querySelectorAll('.link-card').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none';
      });
    } else {
      window.open(currentEngine + encodeURIComponent(q), '_blank');
    }
  };
  document.getElementById('search-btn').onclick = doSearch;
  searchInput.onkeypress = (e) => { if(e.key==='Enter') doSearch(); };

  // --- 弹窗逻辑 ---
  document.getElementById('toggle-edit-btn').onclick = () => modal.style.display = 'flex';
  document.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
  window.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; };

  document.addEventListener('contextmenu', (e) => {
    if(e.target.tagName === 'BODY' || e.target.id === 'bg-container') {
      e.preventDefault(); modal.style.display = 'flex';
    }
  });

  // 自动图标
  document.getElementById('url-input').oninput = function() {
    try {
      const host = new URL(this.value).hostname;
      document.getElementById('icon-preview').src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    } catch(e){}
  };

  // --- 数据渲染 ---
  async function fetchLinks() {
    const res = await fetch('/api/links');
    const links = await res.json();
    const nav = document.getElementById('nav-menu');
    const main = document.getElementById('main-content');
    const dlist = document.getElementById('category-list');
    
    nav.innerHTML = ''; main.innerHTML = ''; dlist.innerHTML = '';
    
    const grouped = links.reduce((acc, obj) => {
      acc[obj.category] = acc[obj.category] || [];
      acc[obj.category].push(obj);
      return acc;
    }, {});

    Object.keys(grouped).forEach(cat => {
      nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
      dlist.innerHTML += `<option value="${cat}">`;
      const sec = document.createElement('section');
      sec.id = cat;
      sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid"></div>`;
      main.appendChild(sec);
      const grid = sec.querySelector('.link-grid');
      grouped[cat].forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card';
        card.innerHTML = `<img src="${link.icon.startsWith('http') ? link.icon : 'https://www.google.com/s2/favicons?domain='+new URL(link.url).hostname+'&sz=64'}"><h3>${link.title}</h3>`;
        card.onclick = () => window.open(link.url, '_blank');
        grid.appendChild(card);
      });
    });
  }

  document.getElementById('link-form').onsubmit = async function(e) {
    e.preventDefault();
    const fd = new FormData(this);
    const data = Object.fromEntries(fd);
    const fav = `https://www.google.com/s2/favicons?domain=${new URL(data.url).hostname}&sz=64`;

    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: data.edit_password,
        link: { ...data, icon: fav }
      })
    });
    if(res.ok) { alert('成功'); modal.style.display='none'; fetchLinks(); }
    else { alert('失败，请检查密码'); }
  };
});

document.addEventListener('DOMContentLoaded', function() {
    const DEFAULT_LINKS = [{ category: '常用', title: 'Google', url: 'https://www.google.com', icon: 'https://www.google.com/s2/favicons?domain=google.com&sz=64' }];
    let allLinks = [];
    let currentEngine = "https://www.baidu.com/s?wd=";
    const grads = ['linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)','linear-gradient(135deg, #134e5e, #71b280)','linear-gradient(135deg, #202124, #3c4043)'];

    const updateBg = (v, s = true) => {
        const bg = document.getElementById('bg-canvas');
        if(v.startsWith('http')) bg.style.backgroundImage = `url(${v})`; else bg.style.background = v;
        if(s) localStorage.setItem('nav_bg_v8', v);
    };
    updateBg(localStorage.getItem('nav_bg_v8') || grads[0]);

    document.getElementById('btn-toggle-bg').onclick = () => {
        let c = localStorage.getItem('nav_bg_v8');
        updateBg(grads[(grads.indexOf(c) + 1) % grads.length] || grads[0]);
    };

    async function fetchData() {
        try {
            const res = await fetch('/api/links');
            const data = await res.json();
            allLinks = data.length > 0 ? data : DEFAULT_LINKS;
            render();
        } catch (e) { allLinks = DEFAULT_LINKS; render(); }
    }
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        const hint = document.getElementById('cat-hint');
        main.innerHTML = ''; nav.innerHTML = ''; hint.innerHTML = '<option value="">快捷选择</option>';
        const grouped = allLinks.reduce((acc, l) => {
            if(l.title === 'placeholder_hidden') return acc;
            acc[l.category] = acc[l.category] || []; acc[l.category].push(l); return acc;
        }, {});
        Object.keys(grouped).forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            hint.innerHTML += `<option value="${cat}">${cat}</option>`;
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid" data-cat="${cat}"></div>`;
            const grid = sec.querySelector('.link-grid');
            grid.ondragover = e => e.preventDefault();
            grid.ondrop = async (e) => {
                const url = e.dataTransfer.getData('text');
                const item = allLinks.find(l => l.url === url);
                if(item && item.category !== cat) { item.category = cat; await apiReq('save', { link: item }); }
            };
            grouped[cat].forEach(l => {
                const card = document.createElement('div');
                card.className = 'link-card'; card.draggable = true;
                card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'"><h3>${l.title}</h3>`;
                card.onclick = () => window.open(l.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
                card.ondragstart = (e) => e.dataTransfer.setData('text', l.url);
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    async function apiReq(action, data) {
        let pwd = localStorage.getItem('auth_pwd_v8') || data.password || prompt("管理密码:");
        if(!pwd) return;
        const res = await fetch('/api/links', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...data, password: pwd, action })
        });
        if(res.ok) { localStorage.setItem('auth_pwd_v8', pwd); fetchData(); return true; }
        alert("认证失败"); return false;
    }

    window。deleteSite = (e， u) => { e.stopPropagation(); if(confirm("确定删除吗？")) apiReq('delete', { link: {url:u} }); };

    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const updateUI = () => {
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(box.querySelector('.search-engines')) box.querySelector('.search-engines').style.display = isInt ? 'none' : 'flex';
            inp.placeholder = isInt ? "快速检索站点或书签" : "百度一下";
        };
        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active'); updateUI();
        });
        const exec = () => {
            const q = inp.value.trim(); if(!q) return;
            if(box.querySelector('.tab.active').dataset.type === 'internal') {
                document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none');
                if(boxSel.includes('modal')) document.getElementById('modal-search').style.display = 'none';
            } else window.open(currentEngine + encodeURIComponent(q), '_blank');
        };
        box.querySelector('.search-trigger-btn').onclick = exec;
        inp.onkeypress = e => e.key === 'Enter' && exec();
        updateUI();
    }
    setupSearch('.main-search'); setupSearch('.modal-inner-search');

    document.querySelectorAll('.engine').forEach(e => e.onclick = function() {
        document.querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
        this.classList.add('active'); currentEngine = this.dataset.url;
    });

    document.getElementById('btn-top').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
    document。getElementById('btn-float-search').onclick = () => document.getElementById('modal-search').style.display = 'flex';
    document.getElementById('btn-add-site').onclick = () => openEdit();
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };

    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        document.getElementById('in-url').value = l.url || '';
        const img = document.getElementById('prev-img');
        img.src = l.icon || '';
        img.style.display = l.icon ? 'block' : 'none';
        document.getElementById('main-pwd').style.display = localStorage.getItem('auth_pwd_v8') ? 'none' : 'block';
    };

    document.querySelectorAll('.modal-overlay').forEach(el => el.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('in-url').oninput = function() {
        try {
            const h = new URL(this.value).hostname;
            const img = document.getElementById('prev-img');
            img.src = `https://www.google.com/s2/favicons?domain=${h}&sz=64`;
            img.style.display = 'block';
        } catch(e){}
    };

    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        data.icon = document.getElementById('prev-img').src;
        if(await apiReq('save', { link: data, password: data.password })) document.getElementById('modal-link').style.display='none';
    };

    document.getElementById('btn-cat-admin').onclick = () => {
        const box = document.getElementById('cat-list-box');
        box.innerHTML = '';
        [...new Set(allLinks.map(l => l.category))].forEach(c => {
            box.innerHTML += `<div class="cat-admin-row"><input type="text" value="${c}"><button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button><button class="btn-mini red" onclick="deleteCat('${c}')">删除</button></div>`;
        });
        document.getElementById('modal-cat').style.display = 'flex';
    };

    window.renameCat = (o, b) => apiReq('renameCategory', { oldCategory: o, newCategory: b.previousElementSibling.value });
    window.deleteCat = (c) => confirm(`删除分类 "${c}"？`) && apiReq('deleteCategory', { oldCategory: c });
    window.addNewCategory = () => {
        const n = document.getElementById('new-cat-input').value;
        if(n) apiReq('addCategory', { newCategory: n });
    };
});

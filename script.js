document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let categoryOrder = [];
    let currentEngine = "https://www.baidu.com/s?wd=";

    const grads = [
        'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)',
        'linear-gradient(135deg, #134e5e, #71b280)',
        'linear-gradient(135deg, #202124, #3c4043)',
        'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'
    ];

    // --- 背景逻辑 ---
    const updateBg = (val, save = true) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        else bg.style.background = val;
        if(save) localStorage.setItem('nav_bg_v12', val);
    };
    updateBg(localStorage.getItem('nav_bg_v12') || grads[0]);

    document.getElementById('btn-toggle-bg').onclick = () => {
        let curr = localStorage.getItem('nav_bg_v12');
        let nextIdx = (grads.indexOf(curr) + 1) % grads.length;
        updateBg(grads[nextIdx]);
    };

    document.getElementById('btn-random-bg').onclick = async () => {
        const res = await fetch(`https://picsum.photos/1920/1080?random=${Math.random()}`);
        if(res.url) updateBg(res.url);
    };

    // --- 数据加载 ---
    async function fetchData() {
        try {
            const res = await fetch('/api/links');
            const data = await res.json();
            allLinks = data.links || [];
            categoryOrder = data.order || [];
            render();
        } catch (e) { render(); }
    }
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        const hint = document.getElementById('cat-hint');
        main.innerHTML = ''; nav.innerHTML = ''; hint.innerHTML = '<option value="">快捷选择</option>';

        const grouped = allLinks.reduce((acc, l) => {
            if (!acc[l.category]) acc[l.category] = [];
            if (l.title !== 'placeholder_hidden') acc[l.category].push(l);
            return acc;
        }, {});

        let cats = Object.keys(grouped);
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            hint.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid" data-cat="${cat}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async (e) => {
                grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text/plain');
                const item = allLinks.find(l => l.url === url);
                if(item && item.category !== cat) {
                    item.category = cat; await apiReq('save', { link: item });
                }
            };

            (grouped[cat] || []).forEach(l => {
                const card = document.createElement('div');
                card.className = 'link-card'; card.draggable = true;
                card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'"><h3>${l.title}</h3>`;
                card.onclick = () => window.open(l.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
                card.ondragstart = (e) => e.dataTransfer.setData('text/plain', l.url);
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 搜索逻辑 ---
    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const engines = box.querySelector('.search-engines');
        
        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            const isInt = t.dataset.type === 'internal';
            if(engines) engines.style.display = isInt ? 'none' : 'flex';
            inp.placeholder = isInt ? "快速检索站内站点..." : "百度一下";
        });

        const exec = () => {
            const q = inp.value.trim(); if(!q) return;
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(isInt) {
                document.querySelectorAll('.link-card').forEach(c => {
                    c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none';
                });
                if(boxSel.includes('modal')) document.getElementById('modal-search').style.display = 'none';
            } else window.open(currentEngine + encodeURIComponent(q), '_blank');
        };

        box.querySelector('.search-trigger-btn').onclick = exec;
        inp.onkeydown = e => e.key === 'Enter' && exec();
    }
    setupSearch('.main-search'); setupSearch('.modal-inner-search');

    document.body.addEventListener('click', e => {
        if(e.target.classList.contains('engine')) {
            document.querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active');
            currentEngine = e.target.dataset.url;
        }
    });

    // --- 弹窗逻辑 ---
    document.querySelectorAll('.modal-overlay').forEach(el => el.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    // --- 编辑站点逻辑修复（含防破图图标抓取） ---
    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        
        const urlInput = document.getElementById('in-url');
        const prevImg = document.getElementById('prev-img');
        
        urlInput.value = (l.url?.includes('placeholder') ? '' : l.url) || '';
        
        if (l.icon && l.icon !== '') {
            prevImg.src = l.icon;
            prevImg.classList.add('loaded');
        } else {
            prevImg.src = '';
            prevImg.classList.remove('loaded');
        }
    };

    document.getElementById('in-url').oninput = function() {
        const val = this.value.trim();
        const prevImg = document.getElementById('prev-img');
        if (!val || !val.startsWith('http')) {
            prevImg.src = ''; prevImg.classList.remove('loaded'); return;
        }
        try {
            const domain = new URL(val).hostname;
            const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            const tempImg = new Image();
            tempImg.src = iconUrl;
            tempImg.onload = () => { prevImg.src = iconUrl; prevImg.classList.add('loaded'); };
            tempImg.onerror = () => { prevImg.src = ''; prevImg.classList.remove('loaded'); };
        } catch (e) { prevImg.classList.remove('loaded'); }
    };

    // --- 分类管理与排序 ---
    document.getElementById('btn-cat-admin').onclick = () => {
        renderCatAdmin();
        document.getElementById('modal-cat').style.display = 'flex';
    };

    function renderCatAdmin() {
        const box = document.getElementById('cat-list-box');
        box.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach((c, idx) => {
            const row = document.createElement('div');
            row.className = 'cat-admin-row'; row.draggable = true;
            row.innerHTML = `<i class="fas fa-bars drag-handle"></i><input type="text" value="${c}"><div class="row-btns"><button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button><button class="btn-mini red" onclick="deleteCat('${c}')">删除</button></div>`;
            row.ondragstart = (e) => { e.dataTransfer.setData('idx', idx); row.style.opacity = '0.5'; };
            row.ondragend = () => row.style.opacity = '1';
            row.ondragover = e => e.preventDefault();
            row.ondrop = async (e) => {
                const from = e.dataTransfer.getData('idx');
                const to = idx;
                sortedCats.splice(to, 0, sortedCats.splice(from, 1)[0]);
                categoryOrder = sortedCats;
                await apiReq('updateOrder', { order: categoryOrder });
                renderCatAdmin();
            };
            box.appendChild(row);
        });
    }

    // --- 核心 API ---
    async function apiReq(action, data) {
        let pwd = localStorage.getItem('auth_pwd_v9') || data.password || prompt("管理密码:");
        if(!pwd) return;
        const res = await fetch('/api/links', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...data, password: pwd, action })
        });
        if(res.ok) { localStorage.setItem('auth_pwd_v9', pwd); fetchData(); return true; }
        return false;
    }

    window.deleteSite = (e, u) => { e.stopPropagation(); if(confirm("确定删除吗？")) apiReq('delete', { link: {url:u} }); };
    window.renameCat = (old, btn) => apiReq('renameCategory', { oldCategory: old, newCategory: btn.closest('.cat-admin-row').querySelector('input').value });
    window.deleteCat = (cat) => confirm(`删除分类 "${cat}"？`) && apiReq('deleteCategory', { oldCategory: cat });
    window.addNewCategory = () => {
        const name = document.getElementById('new-cat-input').value.trim();
        if(name) apiReq('addCategory', { newCategory: name }).then(() => document.getElementById('new-cat-input').value = '');
    };

    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        data.icon = document.getElementById('prev-img').src;
        if(await apiReq('save', { link: data })) document.getElementById('modal-link').style.display='none';
    };

    // --- 其他 UI ---
    document.getElementById('btn-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('btn-float-search').onclick = () => document.getElementById('modal-search').style.display='flex';
    document.getElementById('btn-add-site').onclick = () => openEdit();
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };
});

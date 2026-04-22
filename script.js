document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let categoryOrder = [];
    let currentEngine = "https://www.baidu.com/s?wd=";

    // --- 背景处理 ---
    const updateBg = (val, save = true) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        else bg.style.background = val;
        if(save) localStorage.setItem('nav_bg_v10', val);
    };
    updateBg(localStorage.getItem('nav_bg_v10') || 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)');

    document.getElementById('btn-random-bg').onclick = async () => {
        const res = await fetch(`https://picsum.photos/1920/1080?random=${Math.random()}`);
        if(res.url) updateBg(res.url);
    };

    // --- 数据加载与渲染 ---
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
            sec.className = "cat-section";
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid" data-cat="${cat}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
            // --- 站点跨分类拖拽逻辑 ---
            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async (e) => {
                grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text/plain');
                const item = allLinks.find(l => l.url === url);
                if(item && item.category !== cat) {
                    item.category = cat;
                    await apiReq('save', { link: item });
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

    // --- 搜索逻辑修复 ---
    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const exec = () => {
            const q = inp.value.trim(); if(!q) return;
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(isInt) {
                document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none');
                document.querySelectorAll('.cat-section').forEach(s => {
                   const has = Array.from(s.querySelectorAll('.link-card')).some(c => c.style.display !== 'none');
                   s.style.display = has ? 'block' : 'none';
                });
                if(boxSel.includes('modal')) document.getElementById('modal-search').style.display = 'none';
            } else window.open(currentEngine + encodeURIComponent(q), '_blank');
        };
        box.querySelector('.search-trigger-btn').onclick = exec;
        inp.onkeydown = e => e.key === 'Enter' && exec();
    }
    setupSearch('.main-search'); setupSearch('.modal-inner-search');

    document.querySelectorAll('.engine').forEach(e => e.onclick = function() {
        document.querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
        this.classList.add('active'); currentEngine = this.dataset.url;
    });

    // --- 分类管理：拖拽排序逻辑 ---
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
            row.className = 'cat-admin-row';
            row.draggable = true;
            row.dataset.index = idx;
            row.innerHTML = `
                <i class="fas fa-bars drag-handle"></i>
                <input type="text" value="${c}">
                <div class="row-btns">
                    <button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button>
                    <button class="btn-mini red" onclick="deleteCat('${c}')">删除</button>
                </div>
            `;
            // 拖拽事件
            row.ondragstart = (e) => { e.dataTransfer.setData('text/idx', idx); row.classList.add('dragging'); };
            row.ondragend = () => row.classList.remove('dragging');
            row.ondragover = (e) => e.preventDefault();
            row.ondrop = async (e) => {
                const fromIdx = e.dataTransfer.getData('text/idx');
                const toIdx = idx;
                const temp = sortedCats[fromIdx];
                sortedCats.splice(fromIdx, 1);
                sortedCats.splice(toIdx, 0, temp);
                categoryOrder = sortedCats;
                await apiReq('updateOrder', { order: categoryOrder });
                renderCatAdmin();
            };
            box.appendChild(row);
        });
    }

    // --- 通用 API ---
    async function apiReq(action, data) {
        let pwd = localStorage.getItem('auth_pwd_v9') || data.password || prompt("管理密码:");
        if(!pwd) return;
        const res = await fetch('/api/links', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...data, password: pwd, action })
        });
        if(res.ok) { localStorage.setItem('auth_pwd_v9', pwd); fetchData(); return true; }
        alert("操作失败"); return false;
    }

    window.deleteSite = (e, u) => { e.stopPropagation(); if(confirm("确定删除吗？")) apiReq('delete', { link: {url:u} }); };
    window.renameCat = (old, btn) => apiReq('renameCategory', { oldCategory: old, newCategory: btn.closest('.cat-admin-row').querySelector('input').value });
    window.deleteCat = (cat) => confirm(`确定删除分类 "${cat}"？`) && apiReq('deleteCategory', { oldCategory: cat });
    window.addNewCategory = () => {
        const inp = document.getElementById('new-cat-input');
        if(inp.value) apiReq('addCategory', { newCategory: inp.value }).then(() => inp.value = '');
    };

    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = l.title === 'placeholder_hidden' ? '' : (l.title || '');
        document.getElementById('in-url').value = l.url?.includes('placeholder') ? '' : (l.url || '');
    };

    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        data.icon = `https://www.google.com/s2/favicons?domain=${new URL(data.url).hostname}&sz=64`;
        if(await apiReq('save', { link: data })) document.getElementById('modal-link').style.display='none';
    };

    document.getElementById('btn-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('btn-float-search').onclick = () => document.getElementById('modal-search').style.display='flex';
    document.getElementById('btn-add-site').onclick = () => openEdit();
    window.onscroll = () => {
        const show = window.scrollY > 300 ? 'flex' : 'none';
        document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = show;
    };
});

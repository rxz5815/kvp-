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

    // --- 背景逻辑修复：保存真实地址而非随机接口 ---
    const updateBg = (val, save = true) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        else bg.style.background = val;
        if(save) localStorage.setItem('nav_bg_v9', val);
    };
    updateBg(localStorage.getItem('nav_bg_v9') || grads[0]);

    document.getElementById('btn-toggle-bg').onclick = () => {
        let curr = localStorage.getItem('nav_bg_v9');
        let idx = grads.indexOf(curr);
        updateBg(grads[(idx + 1) % grads.length] || grads[0]);
    };

    document.getElementById('btn-random-bg').onclick = async () => {
        const btn = document.getElementById('btn-random-bg');
        btn.style.opacity = '0.5';
        // 获取 Picsum 的重定向真实地址，防止刷新后图片变动
        const randomUrl = `https://picsum.photos/1920/1080?random=${Math.random()}`;
        try {
            const res = await fetch(randomUrl);
            if (res.url) updateBg(res.url); // 保存的是最终图片链接
        } catch (e) {
            updateBg(randomUrl); 
        }
        btn.style.opacity = '1';
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

        // 获取并合并分类顺序
        let cats = Object.keys(grouped);
        // 过滤掉已经在 order 里的分类，剩下的追加到末尾
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            hint.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid" data-cat="${cat}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
            (grouped[cat] || []).forEach(l => {
                const card = document.createElement('div');
                card.className = 'link-card'; card.draggable = true;
                card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'"><h3>${l.title}</h3>`;
                card.onclick = () => window.open(l.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 搜索逻辑修复：防止输入卡死和引擎混乱 ---
    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        
        const getMode = () => box.querySelector('.tab.active').dataset.type;

        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            inp.placeholder = getMode() === 'internal' ? "快速检索站内..." : "输入搜索内容";
            if(box.querySelector('.search-engines')) {
                box.querySelector('.search-engines').style.display = getMode() === 'internal' ? 'none' : 'flex';
            }
            inp.focus();
        });

        const exec = () => {
            const q = inp.value.trim(); 
            if(!q) return;
            if(getMode() === 'internal') {
                document.querySelectorAll('.link-card').forEach(c => {
                    const isMatch = c.innerText.toLowerCase().includes(q.toLowerCase());
                    c.style.display = isMatch ? 'block' : 'none';
                });
                // 隐藏没匹配到任何内容的分类标题
                document.querySelectorAll('section').forEach(sec => {
                    const hasVisible = Array.from(sec.querySelectorAll('.link-card')).some(c => c.style.display !== 'none');
                    sec.style.display = hasVisible ? 'block' : 'none';
                });
                if(boxSel.includes('modal')) document.getElementById('modal-search').style.display = 'none';
            } else {
                window.open(currentEngine + encodeURIComponent(q), '_blank');
            }
        };

        box.querySelector('.search-trigger-btn').onclick = (e) => { e.preventDefault(); exec(); };
        inp.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); exec(); } };
    }

    setupSearch('.main-search');
    setupSearch('.modal-inner-search');

    // 引擎切换逻辑
    document.querySelectorAll('.engine').forEach(e => e.onclick = function() {
        document.querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        currentEngine = this.dataset.url;
    });

    // --- 分类管理：增加排序功能 ---
    document.getElementById('btn-cat-admin').onclick = () => {
        renderCatAdmin();
        document.getElementById('modal-cat').style.display = 'flex';
    };

    function renderCatAdmin() {
        const box = document.getElementById('cat-list-box');
        box.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        
        // 按照当前渲染顺序排列管理界面
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach((c, idx) => {
            const row = document.createElement('div');
            row.className = 'cat-admin-row';
            row.innerHTML = `
                <input type="text" value="${c}">
                <button class="btn-mini" onclick="moveCat(${idx}, -1)"><i class="fas fa-arrow-up"></i></button>
                <button class="btn-mini" onclick="moveCat(${idx}, 1)"><i class="fas fa-arrow-down"></i></button>
                <button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button>
                <button class="btn-mini red" onclick="deleteCat('${c}')">删除</button>
            `;
            box.appendChild(row);
        });
    }

    window.moveCat = async (index, direction) => {
        const cats = [...new Set(allLinks.map(l => l.category))];
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        let newIndex = index + direction;
        if (newIndex < 0 || newIndex >= sortedCats.length) return;

        // 交换位置
        const temp = sortedCats[index];
        sortedCats[index] = sortedCats[newIndex];
        sortedCats[newIndex] = temp;

        categoryOrder = sortedCats;
        if(await apiReq('updateOrder', { order: categoryOrder })) {
            renderCatAdmin();
        }
    };

    // --- 基础 API 请求 ---
    async function apiReq(action, data) {
        let pwd = localStorage.getItem('auth_pwd_v9') || data.password || prompt("管理密码:");
        if(!pwd) return;
        try {
            const res = await fetch('/api/links', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ ...data, password: pwd, action })
            });
            if(res.ok) {
                localStorage.setItem('auth_pwd_v9', pwd);
                fetchData(); 
                return true;
            }
        } catch(e) {}
        alert("操作失败或密码错误"); return false;
    }

    // 全局函数挂载
    window.deleteSite = (e, u) => { e.stopPropagation(); if(confirm("确定删除吗？")) apiReq('delete', { link: {url:u} }); };
    window.renameCat = (old, btn) => apiReq('renameCategory', { oldCategory: old, newCategory: btn.parentElement.querySelector('input').value });
    window.deleteCat = (cat) => confirm(`删除分类 "${cat}" 及其下所有站点？`) && apiReq('deleteCategory', { oldCategory: cat });
    window.addNewCategory = () => {
        const name = document.getElementById('new-cat-input').value.trim();
        if(name) apiReq('addCategory', { newCategory: name }).then(() => { document.getElementById('new-cat-input').value = ''; });
    };

    // 其他 UI 交互保持
    document.getElementById('btn-top').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
    document.getElementById('btn-float-search').onclick = () => {
        document.getElementById('modal-search').style.display = 'flex';
        document.querySelector('.modal-inner-search .search-input').focus();
    };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    window.onscroll = () => {
        document.getElementById('btn-top').style.display = window.scrollY > 300 ? 'flex' : 'none';
        document.getElementById('btn-float-search').style.display = window.scrollY > 300 ? 'flex' : 'none';
    };
    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        document.getElementById('in-url').value = (l.url?.includes('placeholder') ? '' : l.url) || '';
    };
    document.querySelectorAll('.modal-overlay').forEach(el => el.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });
    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        const domain = new URL(data.url).hostname;
        data.icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        if(await apiReq('save', { link: data, password: data.password })) document.getElementById('modal-link').style.display='none';
    };
});

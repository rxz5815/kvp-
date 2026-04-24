document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let categoryOrder = [];
    let currentEngine = "https://www.baidu.com/s?wd=";

    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // 预设渐变色
    const grads = [
        'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', // 默认渐变蓝
        'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', // 渐变绿
        'linear-gradient(135deg, #202124 0%, #3c4043 100%)', // 渐变灰
        'linear-gradient(135deg, #2c3e50 0%, #4ca1af 80%)', // 墨青蓝绿
        'linear-gradient(45deg, #3d2b56 0%, #8e54e9 80%)', // 暗调茄紫
        'linear-gradient(135deg, #283048 0%, #859398 80%)', // 烟灰棕
        'linear-gradient(45deg, #1e2a38 0%, #5a7fa5 80%)', // 藏青灰
        'linear-gradient(135deg, #192841 0%, #607d8b 80%)', // 冷调钢灰
        'linear-gradient(45deg, #271f30 0%, #7b4397 80%)', // 暗调绛紫
        'linear-gradient(135deg, #182c39 0%, #486a78 80%)', // 青灰棕
        'linear-gradient(45deg, #221d2e 0%, #614e77 80%)', // 暗调藕紫
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'  // 渐变紫
        
    const updateBg = (v, s = true) => {
        const b = document.getElementById('bg-canvas');
        if(v.startsWith('http')) b.style.backgroundImage = `url(${v})`; else b.style.background = v;
        if(s) localStorage.setItem('nav_bg_v18', v);
    };
    updateBg(localStorage.getItem('nav_bg_v18') || grads[0]);

    document.getElementById('btn-toggle-bg').onclick = () => {
        let c = localStorage.getItem('nav_bg_v18');
        updateBg(grads[(grads.indexOf(c) + 1) % grads.length]);
    };

    document.getElementById('btn-random-bg').onclick = async () => {
        const res = await fetch(`https://picsum.photos/1920/1080?random=${Math.random()}`);
        if(res.url) updateBg(res.url);
    };

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

    // 核心渲染逻辑
    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        const hint = document.getElementById('cat-hint');
        main.innerHTML = ''; nav.innerHTML = ''; hint.innerHTML = '<option value="">选择分类</option>';

        const grouped = allLinks.reduce((acc, l) => {
            if (!acc[l.category]) acc[l.category] = [];
            if (l.title !== 'placeholder_hidden') acc[l.category].push(l);
            return acc;
        }, {});

        let sortedCats = categoryOrder.filter(c => Object.keys(grouped).includes(c));
        Object.keys(grouped).forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            hint.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const currentLinks = grouped[cat] || [];
            const subCats = ['全部', ...new Set(currentLinks.filter(l => l.subcategory).map(l => l.subcategory))];
            
            let subBarHtml = '';
            if (subCats.length > 1) { 
                subBarHtml = `<div class="category-divider">|</div><div class="subcategory-bar">`;
                subCats.forEach((s, i) => subBarHtml += `<span class="sub-tag ${i===0?'active':''}" data-sub="${s}">${s}</span>`);
                subBarHtml += `</div>`;
            }

            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<div class="category-header"><h2 class="category-title">${cat}</h2>${subBarHtml}</div><div class="link-grid" data-cat="${cat}"></div>`;
            
            const grid = sec.querySelector('.link-grid');
            const tags = sec.querySelectorAll('.sub-tag');

            tags.forEach(t => t.onclick = () => {
                tags.forEach(x => x.classList.remove('active')); t.classList.add('active');
                grid.querySelectorAll('.link-card').forEach(c => c.style.display = (t.dataset.sub==='全部' || c.dataset.subcat===t.dataset.sub) ? '' : 'none');
            });

            currentLinks.forEach(l => {
                const card = createCard(l);
                if (l.subcategory) card.dataset.subcat = l.subcategory;
                grid.appendChild(card);
            });

            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async (e) => {
                grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text/plain');
                if (e.target.classList.contains('link-grid')) {
                    const item = allLinks.find(l => l.url === url);
                    if (item) {
                        item.category = cat; render();
                        apiReq('updateLinksOrder', { link: allLinks }, true);
                    }
                }
            };
            main.appendChild(sec);
        });
    }

    function createCard(l) {
        const card = document.createElement('div');
        card.className = 'link-card'; card.draggable = true;
        if (l.desc) card.setAttribute('data-desc', l.desc);
        card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'"><h3>${l.title}</h3>`;
        card.onclick = () => window.open(l.url, '_blank');
        card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
        card.ondragstart = (e) => { e.dataTransfer.setData('text/plain', l.url); card.classList.add('dragging'); };
        card.ondragend = () => card.classList.remove('dragging');
        card.ondragover = e => { e.preventDefault(); if (document.querySelector('.dragging') !== card) card.classList.add('drag-insert-before'); };
        card.ondragleave = () => card.classList.remove('drag-insert-before');
        card.ondrop = async (e) => {
            e.preventDefault(); card.classList.remove('drag-insert-before');
            const draggedUrl = e.dataTransfer.getData('text/plain');
            if (draggedUrl === l.url) return;
            const from = allLinks.findIndex(x => x.url === draggedUrl), to = allLinks.findIndex(x => x.url === l.url);
            if (from > -1 && to > -1) {
                const item = allLinks.splice(from, 1)[0]; item.category = l.category; allLinks.splice(to, 0, item);
                render(); apiReq('updateLinksOrder', { link: allLinks }, true);
            }
        };
        return card;
    }

    // --- 核心修复：二级下拉框联动函数 ---
    function updateSubcatDropdown(selectedCat, currentSub = "") {
        const subSelect = document.getElementById('in-subcat');
        subSelect.innerHTML = '<option value="">二级小类 (选填)</option>';
        if (!selectedCat) return;
        const subCats = [...new Set(allLinks.filter(l => l.category === selectedCat && l.subcategory).map(l => l.subcategory))];
        subCats.forEach(s => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = s;
            if(s === currentSub) opt.selected = true;
            subSelect.appendChild(opt);
        });
    }

    // 监听大类切换
    document.getElementById('cat-hint').onchange = function() { updateSubcatDropdown(this.value); };

    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        document.getElementById('in-desc').value = l.desc || '';
        document.getElementById('cat-hint').value = l.category || '';
        updateSubcatDropdown(l.category || '', l.subcategory || '');
        const urlInput = document.getElementById('in-url'), prevImg = document.getElementById('prev-img');
        urlInput.value = (l.url?.includes('placeholder') ? '' : l.url) || '';
        if (l.icon) { prevImg.src = l.icon; prevImg.classList.add('loaded'); } else { prevImg.src = ''; prevImg.classList.remove('loaded'); }
    };

    // 分类管理界面
    function renderCatAdmin() {
        const box = document.getElementById('cat-list-box');
        box.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach((c, idx) => {
            const row = document.createElement('div');
            row.className = 'cat-admin-row'; row.draggable = true;
            row.innerHTML = `<i class="fas fa-bars drag-handle"></i><input type="text" value="${c}" style="flex:1;background:transparent;border:none;color:#fff"><div class="row-btns"><button class="btn-mini blue" onclick="addSubCatPrompt('${c}')">+子类</button><button class="btn-mini" onclick="renameCat('${c}', this)">改名</button><button class="btn-mini red" onclick="deleteCat('${c}')">删除</button></div>`;
            row.ondragstart = (e) => { e.dataTransfer.setData('idx', idx); row.style.opacity = '0.5'; };
            row.ondragend = () => row.style.opacity = '1';
            row.ondrop = async (e) => {
                e.preventDefault();
                const from = parseInt(e.dataTransfer.getData('idx')), to = idx;
                const newOrder = [...sortedCats]; const [moved] = newOrder.splice(from, 1); newOrder.splice(to, 0, moved);
                categoryOrder = newOrder; render(); renderCatAdmin();
                apiReq('updateOrder', { order: categoryOrder }, true);
            };
            box.appendChild(row);
        });
    }

    // 辅助功能
    window.addSubCatPrompt = (mainCat) => {
        const sub = prompt(`为 [${mainCat}] 添加二级小类名称:`);
        if (sub) apiReq('addCategory', { newCategory: mainCat, subcategory: sub.trim() });
    };

    async function apiReq(action, data, noRefresh = false) {
        let pwd = sessionStorage.getItem('auth_pwd_v9') || prompt("管理密码:");
        if(!pwd) return false;
        const res = await fetch('/api/links', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...data, password: pwd, action })
        });
        if(res.ok) { sessionStorage.setItem('auth_pwd_v9', pwd); if(!noRefresh) fetchData(); return true; }
        if(res.status === 401) { alert("密码错误！"); sessionStorage.removeItem('auth_pwd_v9'); }
        return false;
    }

    // 按钮绑定
    document.getElementById('btn-cat-admin').onclick = () => { renderCatAdmin(); document.getElementById('modal-cat').style.display = 'flex'; };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    
    // 其他原有搜索和工具逻辑 ( setupSearch, 图标抓取等 ) ... 
    // [此处省略你已写好的搜索逻辑，请保留你原本的代码]
    
    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        if (!data.category) return alert("请选择分类！");
        data.icon = document.getElementById('prev-img').src;
        if(await apiReq('save', { link: data })) document.getElementById('modal-link').style.display = 'none';
    };
});

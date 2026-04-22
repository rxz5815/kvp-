document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let categoryOrder = [];
    let currentEngine = "https://www.baidu.com/s?wd=";

    // 预设渐变色 (保留你的配色)
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
    ];

    const updateBg = (val, save = true) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        else bg.style.background = val;
        if(save) localStorage.setItem('nav_bg_v18', val);
    };
    updateBg(localStorage.getItem('nav_bg_v18') || grads[0]);

    document.getElementById('btn-toggle-bg').onclick = () => {
        let curr = localStorage.getItem('nav_bg_v18');
        let nextIdx = (grads.indexOf(curr) + 1) % grads.length;
        updateBg(grads[nextIdx]);
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

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        const hint = document.getElementById('cat-hint');
        main.innerHTML = '';
        nav.innerHTML = '';
        hint.innerHTML = '<option value="">快捷选择</option>';

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
            
            // --- 拖拽核心逻辑：开启线条窗口效果 ---
            grid.ondragover = function(e) {
                e.preventDefault();
                grid.classList.add('drag-over'); // 移入时显示虚线框
            };
            grid.ondragleave = function() {
                grid.classList.remove('drag-over'); // 移出时隐藏
            };
            grid.ondrop = async function(e) {
                grid.classList.remove('drag-over'); // 放下时隐藏
                const url = e.dataTransfer.getData('text/plain');
                const item = allLinks.find(l => l.url === url);
                if(item && item.category !== cat) {
                    item.category = cat;
                    await apiReq('save', { link: item });
                }
            };

            const currentLinks = grouped[cat] || [];
            currentLinks.forEach(l => {
                grid.appendChild(createCard(l));
            });
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
        card.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', l.url);
            card.style.opacity = '0.5';
        };
        card.ondragend = () => { card.style.opacity = '1'; };
        return card;
    }

    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const engineBar = box.querySelector('.search-engines');
        const isModal = boxSel.includes('modal');
        const resultsArea = document.getElementById('modal-results-area');

        const performSearch = () => {
            const q = inp.value.trim().toLowerCase();
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if (q.length === 0) {
                if(isModal) resultsArea.innerHTML = '';
                else {
                    document.body.classList.remove('is-searching');
                    document.querySelectorAll('.link-card, section').forEach(el => el.style.display = '');
                }
                return;
            }
            if(isInt) {
                if(isModal) {
                    resultsArea.innerHTML = '';
                    allLinks.filter(l => l.title !== 'placeholder_hidden' && l.title.toLowerCase().includes(q))
                            .forEach(l => resultsArea.appendChild(createCard(l)));
                } else {
                    document.body.classList.add('is-searching');
                    document.querySelectorAll('.link-card').forEach(c => {
                        const txt = c.querySelector('h3').innerText.toLowerCase();
                        c.style.display = txt.includes(q) ? 'block' : 'none';
                    });
                    document.querySelectorAll('section').forEach(sec => {
                        const has = Array.from(sec.querySelectorAll('.link-card')).some(c => c.style.display !== 'none');
                        sec.style.display = has ? 'block' : 'none';
                    });
                }
            } else {
                window.open(currentEngine + encodeURIComponent(q), '_blank');
            }
        };

        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            const isInt = t.dataset.type === 'internal';
            if(engineBar) engineBar.style.display = isInt ? 'none' : 'flex';
            inp.placeholder = isInt ? "快速检索站内..." : "输入搜索内容";
            inp.value = ""; 
            if(isModal) resultsArea.innerHTML = '';
            else {
                document.body.classList.remove('is-searching');
                document.querySelectorAll('.link-card, section').forEach(el => el.style.display = '');
            }
            inp.focus();
        });

        box.querySelector('.search-trigger-btn').onclick = performSearch;
        inp.addEventListener('input', () => {
            if(box.querySelector('.tab.active').dataset.type === 'internal') performSearch();
        });
        inp.onkeydown = e => { if(e.key === 'Enter') performSearch(); };
    }
    setupSearch('.main-search'); setupSearch('.modal-inner-search');

    document.body.addEventListener('click', e => {
        if(e.target.classList.contains('engine')) {
            document.querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active');
            currentEngine = e.target.dataset.url;
        }
    });

    document.querySelectorAll('.modal-overlay').forEach(el => el.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.getElementById('modal-results-area').innerHTML = '';
    });

    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        document.getElementById('in-desc').value = l.desc || '';
        const urlInput = document.getElementById('in-url');
        const prevImg = document.getElementById('prev-img');
        urlInput.value = (l.url?.includes('placeholder') ? '' : l.url) || '';
        if (l.icon && l.icon !== '') {
            prevImg.src = l.icon; prevImg.classList.add('loaded');
        } else {
            prevImg.src = ''; prevImg.classList.remove('loaded');
        }
    };

    document.getElementById('in-url').oninput = function() {
        const val = this.value.trim();
        const prevImg = document.getElementById('prev-img');
        if (!val || !val.startsWith('http')) { prevImg.src = ''; prevImg.classList.remove('loaded'); return; }
        try {
            const domain = new URL(val).hostname;
            const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            const tempImg = new Image();
            tempImg.src = iconUrl;
            tempImg.onload = () => { prevImg.src = iconUrl; prevImg.classList.add('loaded'); };
            tempImg.onerror = () => { prevImg.src = ''; prevImg.classList.remove('loaded'); };
        } catch (e) { prevImg.classList.remove('loaded'); }
    };

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

    document.getElementById('btn-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('btn-float-search').onclick = () => {
        document.getElementById('modal-search').style.display='flex';
        setTimeout(() => document.querySelector('.modal-inner-search .search-input').focus(), 100);
    };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };
});

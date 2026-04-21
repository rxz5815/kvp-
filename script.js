document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
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
        if(save) localStorage.setItem('nav_bg_p', val);
    };
    updateBg(localStorage.getItem('nav_bg_p') || grads[0]);

    document.getElementById('btn-toggle-bg').onclick = () => {
        let curr = localStorage.getItem('nav_bg_p');
        updateBg(grads[(grads.indexOf(curr) + 1) % grads.length] || grads[0]);
    };

    document.getElementById('btn-random-bg').onclick = async () => {
        const url = `https://picsum.photos/1920/1080?random=${Math.random()}`;
        const img = new Image();
        img.src = url;
        img.onload = () => updateBg(url); // 需求2: 只有手动点随机才保存，且保存当前链接
    };

    // --- 数据交互 ---
    async function fetchData() {
        const res = await fetch('/api/links');
        allLinks = await res.json();
        render();
    }
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        const hint = document.getElementById('cat-hint');
        main.innerHTML = ''; nav.innerHTML = ''; hint.innerHTML = '<option value="">选择分类</option>';

        const grouped = allLinks.reduce((acc, l) => {
            if(l.title === 'placeholder_hidden') return acc;
            acc[l.category] = acc[l.category] || [];
            acc[l.category].push(l);
            return acc;
        }, {});

        Object.keys(grouped).forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            hint.innerHTML += `<option value="${cat}">${cat}</option>`;
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid" data-cat="${cat}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
            // --- 拖拽换位回归 (问题5修正) ---
            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async (e) => {
                grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text');
                const item = allLinks.find(l => l.url === url);
                if(item && item.category !== cat) {
                    item.category = cat;
                    await apiReq('save', { link: item });
                }
            };

            grouped[cat].forEach(l => {
                const card = document.createElement('div');
                card.className = 'link-card';
                card.draggable = true;
                card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'"><h3>${l.title}</h3>`;
                card.onclick = () => window.open(l.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
                card.ondragstart = (e) => e.dataTransfer.setData('text', l.url);
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 认证缓存 (15分钟) ---
    const getAuth = () => {
        const ts = localStorage.getItem('auth_ts');
        if(ts && Date.now() - ts < 15 * 60 * 1000) return localStorage.getItem('auth_pwd');
        return null;
    };

    async function apiReq(action, data) {
        let pwd = getAuth() || data.password || prompt("请输入密码:");
        if(!pwd) return;
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...data, password: pwd, action })
        });
        if(res.ok) {
            localStorage.setItem('auth_pwd', pwd);
            localStorage.setItem('auth_ts', Date.now());
            fetchData(); return true;
        }
        alert("认证失败"); return false;
    }

    window.deleteSite = (e, url) => {
        e.stopPropagation();
        if(confirm("确定删除吗？")) apiReq('delete', { link: {url} });
    };

    // --- 搜索系统 (问题1, 2修正) ---
    const setupSearch = (boxSel) => {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const trigger = box.querySelector('.search-trigger-btn');
        const engines = box.querySelector('.search-engines');

        const updateUI = (type) => {
            const isInt = type === 'internal';
            if(engines) engines.style.display = isInt ? 'none' : 'flex';
            inp.placeholder = isInt ? "快速检索站点或书签" : "百度一下";
        };

        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            updateUI(t.dataset.type);
        });

        const exec = () => {
            const q = inp.value.trim();
            if(!q) return;
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(isInt) {
                document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none');
                if(boxSel.includes('modal')) document.getElementById('modal-search').style.display = 'none';
            } else window.open(currentEngine + encodeURIComponent(q), '_blank');
        };

        trigger.onclick = exec;
        inp.onkeypress = e => e.key === 'Enter' && exec();
        
        // 初始化一次UI
        updateUI(box.querySelector('.tab.active').dataset.type);
    };

    setupSearch('.main-search');
    setupSearch('#modal-search');

    document.querySelectorAll('.engine').forEach(e => e.onclick = function() {
        document。querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        currentEngine = this.dataset.url;
    });

    // --- 弹窗逻辑 ---
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };
    document.getElementById('btn-top').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});
    document.getElementById('btn-float-search').onclick = () => document.getElementById('modal-search').style.display = 'flex';
    document.querySelectorAll('.modal-overlay').forEach(o => o.onclick = () => o.parentElement.style.display = 'none');

    const modalLink = document.getElementById('modal-link');
    window.openEdit = (l = {}) => {
        modalLink.style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        document.getElementById('in-url').value = l.url || '';
        document.getElementById('prev-img').src = l.icon || '';
        document.getElementById('main-pwd').style.display = getAuth() ? 'none' : 'block';
    };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => b.closest('.modal').style.display = 'none');

    document.getElementById('in-url').oninput = function() {
        try {
            const h = new URL(this.value).hostname;
            document.getElementById('prev-img').src = `https://www.google.com/s2/favicons?domain=${h}&sz=64`;
        } catch(e){}
    };

    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        data.icon = document.getElementById('prev-img').src;
        if(await apiReq('save', { link: data, password: data.password })) modalLink.style.display='none';
    };

    // --- 分类管理 (问题修正) ---
    document.getElementById('btn-cat-admin').onclick = () => {
        const m = document.getElementById('modal-cat');
        const box = document.getElementById('cat-list-box');
        box.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        cats.forEach(c => {
            const row = document.createElement('div');
            row.className = 'cat-list-box';
            row.innerHTML = `<div class="cat-admin-row"><input type="text" value="${c}"><button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button><button class="btn-mini red" onclick="deleteCat('${c}')">删除</button></div>`;
            box.appendChild(row);
        });
        m.style.display = 'flex';
    };
    window.renameCat = (old, btn) => apiReq('renameCategory', { oldCategory: old, newCategory: btn.previousElementSibling.value });
    window.deleteCat = (cat) => confirm(`确定删除分类 "${cat}"？`) && apiReq('deleteCategory', { oldCategory: cat });
    window.addNewCategory = () => {
        const name = document.getElementById('new-cat-input').value;
        if(name) apiReq('addCategory', { newCategory: name });
    };
});

document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let currentEngine = "https://www.baidu.com/s?wd=";
    const grads = [
        'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)',
        'linear-gradient(135deg, #134e5e, #71b280)',
        'linear-gradient(135deg, #202124, #3c4043)',
        'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'
    ];

    // --- 背景逻辑 (需求 2 持久化修正) ---
    const updateBg = (val, save = true) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        else bg.style.background = val;
        if(save) localStorage.setItem('nav_bg_permanent', val);
    };

    updateBg(localStorage.getItem('nav_bg_permanent') || grads[0]);

    document.getElementById('btn-toggle-bg').onclick = () => {
        let curr = localStorage.getItem('nav_bg_permanent');
        let next = grads[(grads.indexOf(curr) + 1) % grads.length] || grads[0];
        updateBg(next);
    };

    document.getElementById('btn-random-bg').onclick = () => {
        const imgUrl = `https://picsum.photos/1920/1080?random=${Math.random()}`;
        const img = new Image();
        img.src = imgUrl;
        img.onload = () => updateBg(imgUrl); // 加载完成后再应用并保存
    };

    // --- 滚动监听 (需求 1 Sticky 修正) ---
    const btnTop = document.getElementById('btn-top');
    const btnSearch = document.getElementById('btn-float-search');
    window.onscroll = () => {
        const y = window.scrollY;
        btnTop.style.display = btnSearch.style.display = y > 300 ? 'flex' : 'none';
    };
    btnTop.onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

    // --- 数据加载 ---
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
            acc[l.category] = acc[l.category] || [];
            acc[l.category].push(l);
            return acc;
        }, {});

        Object.keys(grouped).forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            hint.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid"></div>`;
            const grid = sec.querySelector('.link-grid');

            grouped[cat].forEach(l => {
                const card = document.createElement('div');
                card.className = 'link-card';
                card.innerHTML = `
                    <div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div>
                    <img src="${l.icon}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><i class="fas fa-globe" style="display:none"></i>
                    <h3>${l.title}</h3>
                `;
                card.onclick = () => window.open(l.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 认证管理 (15分钟) ---
    const getAuth = () => {
        const ts = localStorage.getItem('auth_ts');
        if(ts && Date.now() - ts < 15 * 60 * 1000) return localStorage.getItem('auth_pwd');
        return null;
    };

    async function apiReq(action, data) {
        let pwd = getAuth() || data.password || prompt("请输入管理密码:");
        if(!pwd) return;
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...data, password: pwd, action })
        });
        if(res.ok) {
            localStorage.setItem('auth_pwd', pwd);
            localStorage.setItem('auth_ts', Date.now());
            fetchData();
            return true;
        }
        alert("认证失败"); return false;
    }

    window.deleteSite = (e, url) => {
        e.stopPropagation();
        if(confirm("确定删除吗？")) apiReq('delete', { link: {url} });
    };

    // --- 搜索逻辑 (需求 3 对齐) ---
    const setupSearch = (boxSel) => {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const exec = () => {
            const q = inp.value.trim();
            if(!q) return;
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(isInt) {
                document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none');
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            } else window.open(currentEngine + encodeURIComponent(q), '_blank');
        };
        box.querySelector('.search-btn').onclick = exec;
        inp.onkeypress = e => e.key === 'Enter' && exec();
        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
        });
    };

    setupSearch('.main-search');
    setupSearch('#modal-search');
    document.getElementById('btn-float-search').onclick = () => document.getElementById('modal-search').style.display = 'flex';

    // --- 弹窗逻辑 ---
    const modalLink = document.getElementById('modal-link');
    window.openEdit = (l = {}) => {
        modalLink.style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = l.title || '';
        document.getElementById('in-url').value = l.url || '';
        document.getElementById('prev-img').src = l.icon || '';
        document.getElementById('prev-img').style.display = l.icon ? 'block' : 'none';
        document.getElementById('def-icon').style.display = l.icon ? 'none' : 'block';
        document.getElementById('pwd-wrap').style.display = getAuth() ? 'none' : 'block';
    };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    document.querySelectorAll('.close-modal, .modal-overlay').forEach(el => el.onclick = () => el.closest('.modal').style.display = 'none');

    document.getElementById('in-url').oninput = function() {
        try {
            const h = new URL(this.value).hostname;
            const src = `https://www.google.com/s2/favicons?domain=${h}&sz=64`;
            document.getElementById('prev-img').src = src;
            document.getElementById('prev-img').style.display = 'block';
            document.getElementById('def-icon').style.display = 'none';
        } catch(e){}
    };

    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        data.icon = document.getElementById('prev-img').src;
        if(await apiReq('save', { link: data, password: data.password })) modalLink.style.display='none';
    };

    // --- 分类管理 ---
    document.getElementById('btn-cat-admin').onclick = () => {
        const m = document.getElementById('modal-cat');
        const box = document.getElementById('cat-list-box');
        box.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        cats.forEach(c => {
            const row = document.createElement('div');
            row.className = 'cat-admin-row';
            row.innerHTML = `<input type="text" value="${c}"><button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button><button class="btn-mini red" onclick="deleteCat('${c}')">删除</button>`;
            box.appendChild(row);
        });
        m.style.display = 'flex';
    };
    window.renameCat = (old, btn) => apiReq('renameCategory', { oldCategory: old, newCategory: btn.previousElementSibling.value });
    window.deleteCat = (cat) => confirm(`确定删除分类 "${cat}"？`) && apiReq('deleteCategory', { oldCategory: cat });
});

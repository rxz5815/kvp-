document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let currentEngine = "https://www.baidu.com/s?wd=";
    const gradients = [
        'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 100%)', // 默认深蓝
        'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', // 森林
        'linear-gradient(135deg, #202124 0%, #3c4043 100%)', // 谷歌灰
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'  // 明亮蓝
    ];

    // --- 背景系统 (需求 2 修正) ---
    const updateBg = (val, isPermanent = true) => {
        const canvas = document.getElementById('bg-canvas');
        if(val.startsWith('http')) canvas.style.backgroundImage = `url(${val})`;
        else canvas.style.background = val;
        if(isPermanent) localStorage.setItem('nav_bg_stable', val);
    };

    // 初始化背景
    const savedBg = localStorage.getItem('nav_bg_stable');
    updateBg(savedBg || gradients[0]);

    document.getElementById('btn-toggle-grad').onclick = () => {
        let curr = localStorage.getItem('nav_bg_stable');
        let idx = gradients.indexOf(curr);
        let next = gradients[(idx + 1) % gradients.length];
        updateBg(next);
    };

    document.getElementById('btn-random-bg').onclick = async () => {
        const imgUrl = `https://picsum.photos/1920/1080?random=${Math.random()}`;
        // 预加载确保图片可用
        const img = new Image();
        img.src = imgUrl;
        img.onload = () => updateBg(imgUrl);
    };

    // --- 数据加载 ---
    async function fetchData() {
        const res = await fetch('/api/links');
        allLinks = await res.json();
        render();
    }
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('nav-bar').querySelector('ul');
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
                // 图标解析逻辑 (需求 4 修正)
                let iconHTML = '';
                if(l.fa_icon) iconHTML = `<i class="${l.fa_icon}"></i>`;
                else iconHTML = `<img src="${l.icon}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><i class="fas fa-globe" style="display:none"></i>`;

                card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div>${iconHTML}<h3>${l.title}</h3>`;
                card.onclick = () => window.open(l.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEditModal(l); };
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 认证管理 (15分钟免密) ---
    const getAuth = () => {
        const ts = localStorage.getItem('auth_ts');
        if(ts && Date.now() - ts < 15 * 60 * 1000) return localStorage.getItem('auth_pwd');
        return null;
    };

    async function apiRequest(action, data) {
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
        alert("认证失败或系统错误");
        return false;
    }

    window.deleteSite = (e, url) => {
        e.stopPropagation();
        if(confirm("确定删除吗？")) apiRequest('delete', { link: {url} });
    };

    // --- 搜索逻辑 ---
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = y > 300 ? 'flex' : 'none';
        document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };

    const setupSearch = (inputSelector, triggerSelector) => {
        const input = document.querySelector(inputSelector);
        const exec = () => {
            const q = input.value.trim();
            if(!q) return;
            const isInt = document.querySelector('.tab.active').dataset.type === 'internal';
            if(isInt) {
                document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none');
                document.getElementById('modal-search').style.display = 'none';
            } else window.open(currentEngine + encodeURIComponent(q), '_blank');
        };
        document.querySelector(triggerSelector).onclick = exec;
        input.onkeypress = e => e.key === 'Enter' && exec();
    };

    setupSearch('.search-main-box .search-input', '.search-main-box .search-trigger');
    setupSearch('#modal-search .search-input', '#modal-search .search-trigger');

    document.getElementById('btn-float-search').onclick = () => document.getElementById('modal-search').style.display = 'flex';
    document.querySelectorAll('.modal-overlay').forEach(o => o.onclick = () => o.parentElement.style.display = 'none');

    // --- 分类管理 ---
    document.getElementById('btn-manage-cat').onclick = () => {
        const modal = document.getElementById('modal-cat');
        const container = document.getElementById('cat-list-container');
        container.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        cats.forEach(c => {
            const row = document.createElement('div');
            row.className = 'cat-manage-item';
            row.innerHTML = `<input type="text" value="${c}"><button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button><button class="btn-mini red" onclick="deleteCat('${c}')">删除</button>`;
            container.appendChild(row);
        });
        modal.style.display = 'flex';
    };

    window.renameCat = (oldCat, btn) => {
        const newCat = btn.previousElementSibling.value;
        if(newCat && newCat !== oldCat) apiRequest('renameCategory', { oldCategory: oldCat, newCategory: newCat });
    };
    window.deleteCat = (cat) => {
        if(confirm(`删除分类 "${cat}" 及其下所有站点？`)) apiRequest('deleteCategory', { oldCategory: cat });
    };

    // --- 弹窗逻辑 ---
    const modalLink = document.getElementById('modal-link');
    window.openEditModal = (l = {}) => {
        modalLink.style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = l.title || '';
        document.getElementById('in-url').value = l.url || '';
        document.getElementById('in-fa').value = l.fa_icon || '';
        document.getElementById('prev-img').src = l.icon || '';
        document.getElementById('main-pwd').style.display = getAuth() ? 'none' : 'block';
    };
    document.getElementById('btn-add-site').onclick = () => openEditModal();
    document.querySelectorAll('.close-btn').forEach(b => b.onclick = () => b.closest('.modal').style.display = 'none');

    document.getElementById('in-url').oninput = function() {
        try {
            const h = new URL(this.value).hostname;
            document.getElementById('prev-img').src = `https://www.google.com/s2/favicons?domain=${h}&sz=64`;
            document.getElementById('prev-img').style.display = 'block';
            document.getElementById('prev-fa').style.display = 'none';
        } catch(e){}
    };
    document.getElementById('in-fa').oninput = function() {
        const icon = document.getElementById('prev-fa');
        if(this.value) {
            icon.className = this.value;
            icon.style.display = 'block';
            document.getElementById('prev-img').style.display = 'none';
        }
    };

    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        data.icon = document.getElementById('prev-img').src;
        if(await apiRequest('save', { link: data, password: data.password })) modalLink.style.display='none';
    };
});

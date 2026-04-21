document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let currentEngine = "https://www.baidu.com/s?wd=";
    const gradients = [
        'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
        'linear-gradient(135deg, #202124 0%, #3c4043 100%)',
        'linear-gradient(135deg, #e65245 0%, #e43a15 100%)'
    ];

    // --- 背景逻辑 ---
    const updateBg = (val) => {
        const canvas = document.getElementById('bg-canvas');
        if(val.startsWith('http')) canvas.style.backgroundImage = `url(${val})`;
        else canvas.style.background = val;
        localStorage.setItem('nav_bg_pref', val);
    };
    updateBg(localStorage.getItem('nav_bg_pref') || gradients[0]);

    document.getElementById('btn-toggle-grad').onclick = () => {
        let curr = localStorage.getItem('nav_bg_pref');
        let idx = gradients.indexOf(curr);
        updateBg(gradients[(idx + 1) % gradients.length]);
    };

    document.getElementById('btn-random-bg').onclick = () => {
        const sources = [
            `https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80&r=${Math.random()}`,
            `https://picsum.photos/1920/1080?random=${Math.random()}`
        ];
        updateBg(sources[Math.floor(Math.random()*sources.length)]);
    };

    // --- 滚动监听 ---
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = y > 300 ? 'flex' : 'none';
        document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };
    document.getElementById('btn-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('btn-float-search').onclick = () => document.getElementById('modal-search').style.display = 'flex';

    // --- 认证缓存 (15分钟) ---
    const getAuth = () => {
        const ts = localStorage.getItem('auth_ts');
        if(ts && Date.now() - ts < 15 * 60 * 1000) return localStorage.getItem('auth_pwd');
        return null;
    };
    const setAuth = (pwd) => {
        localStorage.setItem('auth_pwd', pwd);
        localStorage.setItem('auth_ts', Date.now());
    };

    // --- 数据获取与渲染 ---
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
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid" data-cat="${cat}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
            // 绑定拖拽目标
            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async (e) => {
                grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text/plain');
                const link = allLinks.find(l => l.url === url);
                if(link && link.category !== cat) {
                    link.category = cat;
                    await submitData(link, 'save', true);
                }
            };

            grouped[cat].forEach(l => {
                const card = document.createElement('div');
                card.className = 'link-card';
                card.draggable = true;
                card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}"><h3>${l.title}</h3>`;
                card.onclick = () => window.open(l.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEditModal(l); };
                card.ondragstart = (e) => e.dataTransfer.setData('text/plain', l.url);
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 核心保存与删除逻辑 ---
    async function submitData(link, action = 'save', isSilent = false) {
        let pwd = getAuth();
        if(!pwd && !isSilent) {
            pwd = prompt("请输入管理密码:");
            if(!pwd) return;
        }
        
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: pwd, link, action })
        });
        
        if(res.ok) {
            setAuth(pwd);
            fetchData();
        } else {
            alert("操作失败，密码错误或服务器错误");
        }
    }

    window.deleteSite = (e, url) => {
        e.stopPropagation();
        if(confirm("确定删除该站点吗？")) {
            submitData({url}, 'delete');
        }
    };

    // --- 分类管理 (需求3修正) ---
    document.getElementById('btn-manage-cat').onclick = () => {
        const modal = document.getElementById('modal-cat');
        const container = document.getElementById('cat-list-container');
        container.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        cats.forEach(c => {
            const row = document.createElement('div');
            row.className = 'cat-manage-item';
            row.innerHTML = `<input type="text" value="${c}"><button onclick="renameCat('${c}', this)">改名</button><button onclick="deleteCat('${c}')">删全类</button>`;
            container.appendChild(row);
        });
        modal.style.display = 'flex';
    };

    window.renameCat = async (oldCat, btn) => {
        const newCat = btn.previousElementSibling.value;
        if(newCat && newCat !== oldCat) {
            const pwd = prompt("修改分类名将更新该类下所有站点，请输入密码:");
            if(!pwd) return;
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ password: pwd, action: 'renameCategory', oldCategory: oldCat, newCategory: newCat })
            });
            if(res.ok) { setAuth(pwd); fetchData(); document.getElementById('modal-cat').style.display = 'none'; }
        }
    };

    window.deleteCat = async (cat) => {
        if(confirm(`确定删除分类 "${cat}" 及其下所有站点吗？此操作不可恢复！`)) {
            const pwd = prompt("请输入密码确认删除整个分类:");
            if(!pwd) return;
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ password: pwd, action: 'deleteCategory', oldCategory: cat })
            });
            if(res.ok) { setAuth(pwd); fetchData(); document.getElementById('modal-cat').style.display = 'none'; }
        }
    }

    // --- 其他辅助逻辑 ---
    window.executeSearch = (type) => {
        const inputId = type === 'main' ? 'main-search-input' : 'modal-search-input';
        const q = document.getElementById(inputId).value.trim();
        if(!q) return;
        const isInt = document.querySelector('.tab.active').dataset.type === 'internal';
        if(isInt) {
            document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none');
            document.getElementById('modal-search').style.display = 'none';
        } else {
            window.open(currentEngine + encodeURIComponent(q), '_blank');
        }
    };

    const modalLink = document.getElementById('modal-link');
    window.openEditModal = (l = {}) => {
        modalLink.style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = l.title || '';
        document.getElementById('in-url').value = l.url || '';
        document.getElementById('prev-img').src = l.icon || '';
        const authPwd = getAuth();
        document.getElementById('pwd-field-wrap').style.display = authPwd ? 'none' : 'block';
    };
    document.getElementById('btn-add-site').onclick = () => openEditModal();
    document.querySelectorAll('.close-btn').forEach(b => b.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    document.getElementById('in-url').oninput = function() {
        try {
            const h = new URL(this.value).hostname;
            document.getElementById('prev-img').src = `https://www.google.com/s2/favicons?domain=${h}&sz=64`;
        } catch(e){}
    };

    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        if(!data.password) data.password = getAuth();
        data.icon = document.getElementById('prev-img').src;
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: data.password, link: data })
        });
        if(res.ok) { setAuth(data.password); modalLink.style.display='none'; fetchData(); } else alert("保存失败");
    };
});

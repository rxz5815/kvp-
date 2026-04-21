document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let currentEngine = "https://www.baidu.com/s?wd=";

    // --- 背景系统 ---
    const bgCanvas = document.getElementById('bg-canvas');
    const updateBg = (val) => {
        if(!val) return;
        bgCanvas.style.backgroundImage = val.startsWith('http') ? `url(${val})` : val;
        localStorage.setItem('nav_bg', val);
    };
    updateBg(localStorage.getItem('nav_bg') || 'linear-gradient(135deg, #1a1c2c 0%, #4a192c 100%)');

    // --- 数据加载 ---
    async function fetchData() {
        const res = await fetch('/api/links');
        allLinks = await res.json();
        render();
    }
    fetchData();

    // --- 滚动监听：显示/隐藏侧边搜索按钮 ---
    const floatSearchBtn = document.getElementById('float-search-btn');
    window.onscroll = () => {
        if (window.scrollY > 300) {
            floatSearchBtn.style.display = 'flex';
        } else {
            floatSearchBtn.style.display = 'none';
        }
    };

    // --- 搜索逻辑同步 (主搜索 & 弹窗搜索) ---
    function setupSearch(containerSelector) {
        const container = document.querySelector(containerSelector);
        const input = container.querySelector('.search-input');
        const engines = container.querySelector('.search-engines');
        const tabs = container.querySelectorAll('.tab');

        tabs.forEach(tab => {
            tab.onclick = () => {
                container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const isInt = tab.dataset.type === 'internal';
                engines.style.visibility = isInt ? 'hidden' : 'visible';
                input.placeholder = isInt ? "搜索站内站点..." : "百度一下";
            };
        });

        const exec = () => {
            const q = input.value.trim();
            if(!q) return;
            const isInt = container.querySelector('.tab.active').dataset.type === 'internal';
            if(isInt) {
                document.querySelectorAll('.link-card').forEach(c => {
                    c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none';
                });
                document.getElementById('modal-search').style.display = 'none';
            } else {
                window.open(currentEngine + encodeURIComponent(q), '_blank');
            }
        };

        container.querySelector('.search-trigger').onclick = exec;
        input.onkeypress = e => e.key === 'Enter' && exec();
    }

    setupSearch('.main-search');
    setupSearch('#modal-search');

    // 引擎选择同步
    document.querySelectorAll('.engine').forEach(en => {
        en.onclick = function() {
            document.querySelectorAll('.engine').forEach(e => e.classList.remove('active'));
            this.classList.add('active');
            currentEngine = this.dataset.url;
            document.querySelectorAll('.search-input').forEach(i => i.placeholder = this.innerText + "一下");
        };
    });

    // --- 页面渲染 ---
    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-nav');
        const select = document.getElementById('select-category');
        main.innerHTML = ''; nav.innerHTML = ''; select.innerHTML = '';

        const categories = [...new Set(allLinks.map(l => l.category))];
        categories.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid"></div>`;
            const grid = sec.querySelector('.link-grid');

            allLinks.filter(l => l.category === cat).forEach(link => {
                const card = document.createElement('div');
                card.className = 'link-card';
                card.innerHTML = `<img src="${link.icon}"><h3>${link.title}</h3>`;
                card.onclick = () => window.open(link.url, '_blank');
                
                // 右键编辑功能 (需求3 & 6)
                card.oncontextmenu = (e) => {
                    e.preventDefault();
                    openLinkModal(link);
                };
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 弹窗逻辑 ---
    const modalLink = document.getElementById('modal-link');
    const modalSearch = document.getElementById('modal-search');

    function openLinkModal(data = null) {
        modalLink.style.display = 'flex';
        if(data) {
            document.getElementById('in-title').value = data.title;
            document.getElementById('in-url').value = data.url;
            document.getElementById('select-category').value = data.category;
            document.getElementById('icon-preview').src = data.icon;
            modalLink.dataset.mode = "edit";
        } else {
            document.getElementById('form-link').reset();
            modalLink.dataset.mode = "add";
        }
    }

    document.getElementById('float-search-btn').onclick = () => modalSearch.style.display = 'flex';
    document.getElementById('btn-add').onclick = () => openLinkModal();
    document.getElementById('btn-bg').onclick = () => {
        const val = prompt("输入背景URL或 'random' 获取随机图");
        if(val === 'random') updateBg(`https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80&r=${Math.random()}`);
        else if(val) updateBg(val);
    };

    document.querySelectorAll('.close').forEach(c => c.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    window.onclick = e => { if(e.target.classList.contains('modal')) e.target.style.display = 'none'; };

    // 自动抓取图标
    document.getElementById('in-url').oninput = function() {
        try {
            const host = new URL(this.value).hostname;
            document.getElementById('icon-preview').src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
        } catch(e) {}
    };

    // 保存站点
    document.getElementById('form-link').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        data.icon = document.getElementById('icon-preview').src;
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: data.password, link: data })
        });
        if(res.ok) { modalLink.style.display = 'none'; fetchData(); }
        else alert('操作失败，请检查密码');
    };
});

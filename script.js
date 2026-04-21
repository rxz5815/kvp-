document。addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let currentEngine = "https://www.baidu.com/s?wd=";

    // --- 背景系统 (需求1修正) ---
    const updateBg = (val) => {
        const bg = document.getElementById('bg-canvas');
        if(val === 'grey') bg.style.background = '#202124';
        else if(val === 'gradient1') bg.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        else if(val === 'gradient2') bg.style.background = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
        else if(val === 'random') bg.style.backgroundImage = `url(https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80&r=${Math.random()})`;
        else if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        localStorage.setItem('nav_bg_v4', val);
    };
    updateBg(localStorage.getItem('nav_bg_v4') || 'gradient1');
    window.setBg = (v) => { if(v === 'custom') { const u = prompt("输入图片URL:"); if(u) updateBg(u); } else updateBg(v); };

    // --- 回到顶部 (需求1) ---
    document.getElementById('btn-top').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

    // --- 数据交互 ---
    async function fetchData() {
        const res = await fetch('/api/links');
        allLinks = await res.json();
        render();
    }
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-nav');
        const selectHint = document.getElementById('select-cat-hint');
        main.innerHTML = ''; nav.innerHTML = ''; selectHint.innerHTML = '<option value="">快速选择分类</option>';

        const cats = [...new Set(allLinks.map(l => l.category))];
        cats.forEach(cat => {
            nav.innerHTML += `<a href="#${cat}">${cat}</a>`;
            selectHint.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 style="border-left:4px solid #ff4d4f; padding-left:12px; margin:40px 0 20px;">${cat}</h2><div class="link-grid"></div>`;
            const grid = sec.querySelector('.link-grid');

            allLinks.filter(l => l.category === cat).forEach(link => {
                const card = document.createElement('div');
                card.className = 'link-card';
                card.innerHTML = `
                    <div class="del-x" onclick="handleDel(event, '${link.url}')"><i class="fas fa-times"></i></div>
                    <img src="${link.icon.startsWith('http') ? link.icon : 'https://www.google.com/s2/favicons?domain='+new URL(link.url).hostname+'&sz=64'}">
                    <h3>${link.title}</h3>
                `;
                card.onclick = () => window.open(link.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEdit(link); };
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 删除逻辑 (需求3&5修正) ---
    window.handleDel = async (e, url) => {
        e.stopPropagation();
        const pwd = prompt("请输入管理密码确认删除:");
        if(!pwd) return;
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: pwd, link: {url: url}, action: 'delete' })
        });
        if(res.ok) fetchData(); else alert("删除失败，请检查密码");
    };

    // --- 搜索逻辑 ---
    const searchInp = document.getElementById('search-input');
    document.querySelectorAll('.engine').forEach(en => {
        en.onclick = () => {
            document.querySelectorAll('.engine').forEach(e => e.classList.remove('active'));
            en.classList.add('active');
            currentEngine = en.dataset.url;
        };
    });

    const doSearch = () => {
        const q = searchInp.value.trim();
        if(!q) return;
        const isInt = document.querySelector('.search-tab.active').dataset.type === 'internal';
        if(isInt) {
            document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none');
        } else {
            window.open(currentEngine + encodeURIComponent(q), '_blank');
        }
    };
    document.getElementById('search-btn').onclick = doSearch;
    searchInp.onkeypress = (e) => e.key === 'Enter' && doSearch();

    // --- 弹窗逻辑 ---
    const modal = document.getElementById('modal-link');
    window.openEdit = (data = {}) => {
        modal.style.display = 'flex';
        document.getElementById('in-title').value = data.title || '';
        document.getElementById('in-url').value = data.url || '';
        document.getElementById('in-cat').value = data.category || '';
        document.getElementById('icon-preview').src = data.icon || '';
    };
    document.getElementById('btn-add').onclick = () => openEdit();
    document.querySelector('.close').onclick = () => modal.style.display = 'none';

    document.getElementById('form-link').onsubmit = async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const data = Object.fromEntries(fd);
        data.icon = `https://www.google.com/s2/favicons?domain=${new URL(data.url).hostname}&sz=64`;
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: data.password, link: data })
        });
        if(res.ok) { modal.style.display = 'none'; fetchData(); } else alert("保存失败");
    };
});

document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let currentEngine = "https://www.baidu.com/s?wd=";

    // --- 背景系统 ---
    const bg = document.getElementById('bg-canvas');
    window.changeBg = (type) => {
        if(type === 'grey') updateBg('#202124');
        else if(type === 'grad1') updateBg('linear-gradient(135deg, #0f0c29, #302b63, #24243e)');
        else if(type === 'grad2') updateBg('linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)');
        else if(type === 'random') updateBg(`https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80&r=${Math.random()}`);
        else if(type === 'custom') { const u = prompt("请输入背景图 URL:"); if(u) updateBg(u); }
    };
    function updateBg(v) {
        if(v.startsWith('http')) bg.style.backgroundImage = `url(${v})`;
        else bg.style.background = v;
        localStorage.setItem('nav_bg_final', v);
    }
    updateBg(localStorage.getItem('nav_bg_final') || 'grad1');

    // --- 数据交互 ---
    async function fetchData() {
        try {
            const res = await fetch('/api/links');
            if(!res.ok) throw new Error("Fetch failed");
            allLinks = await res.json();
            render();
        } catch (e) {
            console.error(e);
            alert("加载失败，请检查 KV 绑定或网络");
        }
    }
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('nav-bar').querySelector('ul');
        const hint = document.getElementById('cat-hint');
        
        main.innerHTML = ''; nav.innerHTML = '';
        hint.innerHTML = '<option value="">快捷选择</option>';

        if(allLinks.length === 0) return;

        const cats = [...new Set(allLinks.map(l => l.category))];
        cats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            hint.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 style="border-left:4px solid #ff4d4f; padding-left:12px; margin:40px 0 20px; font-size:18px;">${cat}</h2><div class="link-grid"></div>`;
            const grid = sec.querySelector('.link-grid');

            allLinks.filter(l => l.category === cat).forEach(link => {
                const card = document.createElement('div');
                card.className = 'link-card';
                // 图标解析保护
                let iconUrl = link.icon;
                if(!iconUrl || !iconUrl.startsWith('http')) {
                    try { iconUrl = `https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=64`; } catch(e){ iconUrl = ''; }
                }
                card.innerHTML = `
                    <div class="card-del" onclick="handleDelete(event, '${link.url}')"><i class="fas fa-times"></i></div>
                    <img src="${iconUrl}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'">
                    <h3>${link.title}</h3>
                `;
                card.onclick = () => window.open(link.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openModal(link); };
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 搜索逻辑 ---
    const searchInp = document.getElementById('search-input');
    document.querySelectorAll('.tab').forEach(t => t.onclick = function() {
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        const isInt = this.dataset.type === 'internal';
        document.getElementById('engine-list').style.display = isInt ? 'none' : 'flex';
        searchInp.placeholder = isInt ? "搜索站内书签..." : "百度一下";
    });

    document.querySelectorAll('.engine').forEach(e => e.onclick = function() {
        document.querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        currentEngine = this.dataset.url;
    });

    const doSearch = () => {
        const q = searchInp.value.trim();
        if(!q) return;
        if(document.querySelector('.tab.active').dataset.type === 'internal') {
            document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none');
        } else { window.open(currentEngine + encodeURIComponent(q), '_blank'); }
    };
    document.getElementById('search-btn').onclick = doSearch;
    searchInp.onkeypress = (e) => e.key === 'Enter' && doSearch();

    // --- 工具栏与置顶 ---
    document.getElementById('go-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    window.onscroll = () => document.getElementById('open-search').style.display = window.scrollY > 300 ? 'flex' : 'none';
    document.getElementById('open-search').onclick = () => window.scrollTo({top:0, behavior:'smooth'});

    // --- 弹窗逻辑 ---
    const modal = document.getElementById('link-modal');
    window.openModal = (data = {}) => {
        modal.style.display = 'flex';
        document.getElementById('title-input').value = data.title || '';
        document.getElementById('url-input').value = data.url || '';
        document.getElementById('cat-input').value = data.category || '';
        document.getElementById('prev-img').src = data.icon || '';
    };
    document.getElementById('add-site').onclick = () => openModal();
    document.getElementById('manage-cat').onclick = () => alert("提示：只需在编辑站点时修改分类名称，分类便会自动更新/增加。");
    document.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if(e.target == modal) modal.style.display = 'none'; };

    // 自动抓取图标
    document.getElementById('url-input').oninput = function() {
        try {
            const h = new URL(this.value).hostname;
            document.getElementById('prev-img').src = `https://www.google.com/s2/favicons?domain=${h}&sz=64`;
        } catch(e){}
    };

    // --- 保存与删除 ---
    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const data = Object.fromEntries(fd);
        data.icon = document.getElementById('prev-img').src;
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: data.password, link: data })
        });
        if(res.ok) { modal.style.display = 'none'; fetchData(); } else alert("管理密码错误！");
    };

    window.handleDelete = async (e, url) => {
        e.stopPropagation();
        const pwd = prompt("请输入管理密码确认删除站点:");
        if(!pwd) return;
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: pwd, link: {url: url}, action: 'delete' })
        });
        if(res.ok) fetchData(); else alert("删除失败，请检查密码");
    };
});

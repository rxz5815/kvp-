document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let currentEngine = "https://www.baidu.com/s?wd=";

    // --- 背景系统 ---
    const updateBg = (val) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        else bg.style.background = val;
        localStorage.setItem('nav_bg_v3', val);
    };
    updateBg(localStorage.getItem('nav_bg_v3') || 'linear-gradient(135deg, #1a1c2c 0%, #4a192c 100%)');

    window.setFastBg = (type) => {
        if(type === 'grey') updateBg('#2c3e50');
        else if(type === 'gradient') updateBg('linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)');
        else if(type === 'random') updateBg(`https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80&r=${Math.random()}`);
        else if(type === 'custom') {
            const url = prompt("请输入背景图片URL:");
            if(url) updateBg(url);
        }
    };

    // --- 一键置顶 (需求1) ---
    document.getElementById('btn-top').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

    // --- 数据获取与渲染 ---
    async function fetchData() {
        const res = await fetch('/api/links');
        allLinks = await res.json();
        render();
    }
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-nav');
        const select = document.getElementById('select-category');
        main.innerHTML = ''; nav.innerHTML = ''; select.innerHTML = '';

        const cats = [...new Set(allLinks.map(l => l.category))];
        cats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid"></div>`;
            const grid = sec.querySelector('.link-grid');

            allLinks.filter(l => l.category === cat).forEach(link => {
                const card = document.createElement('div');
                card.className = 'link-card';
                card.innerHTML = `
                    <div class="del-btn" onclick="deleteLink(event, '${link.url}')"><i class="fas fa-times"></i></div>
                    <img src="${link.icon}">
                    <h3>${link.title}</h3>
                `;
                card.onclick = () => window.open(link.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEditModal(link); };
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    // --- 删除逻辑 (需求5修正) ---
    window.deleteLink = async (e, url) => {
        e.stopPropagation();
        const pwd = prompt("请输入管理密码以确认删除:");
        if(!pwd) return;
        const res = await fetch('/api/links', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: pwd, deleteUrl: url }) // 这里需配合你的后台接口
        });
        if(res.ok) fetchData(); else alert("密码错误或删除失败");
    };

    // --- 弹窗逻辑 (分类管理需求4修正) ---
    const modalLink = document.getElementById('modal-link');
    const modalCat = document.getElementById('modal-cat');

    document.getElementById('btn-cat-open').onclick = () => {
        const list = document.getElementById('cat-list-box');
        list.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        cats.forEach(c => {
            list.innerHTML += `<div class="cat-item"><span>${c}</span><button onclick="alert('请在编辑站点中修改分类')">×</button></div>`;
        });
        modalCat.style.display = 'flex';
    };

    document.getElementById('add-cat-confirm').onclick = () => {
        const name = document.getElementById('new-cat-name').value;
        if(name) {
            alert("请通过添加一个该分类的站点来正式启用分类");
            modalCat.style.display = 'none';
            openEditModal({category: name});
        }
    };

    function openEditModal(data = {}) {
        modalLink.style.display = 'flex';
        document.getElementById('in-title').value = data.title || '';
        document.getElementById('in-url').value = data.url || '';
        document.getElementById('select-category').value = data.category || '';
        document.getElementById('icon-preview').src = data.icon || '';
    }

    document.getElementById('btn-add').onclick = () => openEditModal();
    document.querySelectorAll('.close').forEach(c => c.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });

    // 自动抓取图标
    document.getElementById('in-url').oninput = function() {
        try {
            const host = new URL(this.value).hostname;
            document.getElementById('icon-preview').src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
        } catch(e) {}
    };

    // --- 搜索同步 ---
    window.onscroll = () => {
        document.getElementById('float-search-btn').style.display = window.scrollY > 300 ? 'flex' : 'none';
    };
    document.getElementById('float-search-btn').onclick = () => {
        document.getElementById('modal-search').style.display = 'flex';
    };
});

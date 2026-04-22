document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];        // 存储所有站点链接数据
    let categoryOrder = [];   // 存储分类排序顺序
    let currentEngine = "https://www.baidu.com/s?wd="; // 默认搜索引擎

    // 默认渐变色背景数组
    const grads = [
        'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)',
        'linear-gradient(135deg, #134e5e, #71b280)',
        'linear-gradient(135deg, #202124, #3c4043)',
        'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'
    ];

    // 更新背景并保存到本地
    const updateBg = (val, save = true) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`;
        else bg.style.background = val;
        if(save) localStorage.setItem('nav_bg_v16', val); // 使用版本后缀防止冲突
    };
    // 初始化背景
    updateBg(localStorage.getItem('nav_bg_v16') || grads[0]);

    // 切换预设渐变色
    document.getElementById('btn-toggle-bg').onclick = () => {
        let curr = localStorage.getItem('nav_bg_v16');
        let nextIdx = (grads.indexOf(curr) + 1) % grads.length;
        updateBg(grads[nextIdx]);
    };

    // 获取随机美图背景
    document.getElementById('btn-random-bg').onclick = async () => {
        const res = await fetch(`https://picsum.photos/1920/1080?random=${Math.random()}`);
        if(res.url) updateBg(res.url);
    };

    // 从 KV 数据库拉取数据
    async function fetchData() {
        try {
            const res = await fetch('/api/links');
            const data = await res.json();
            allLinks = data.links || [];
            categoryOrder = data.order || [];
            render(); // 拉取完立即渲染页面
        } catch (e) { render(); }
    }
    fetchData();

    // 页面核心渲染函数
    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        const hint = document.getElementById('cat-hint');
        main.innerHTML = ''; nav.innerHTML = ''; hint.innerHTML = '<option value="">快捷选择</option>';

        // 1. 数据按分类分组
        const grouped = allLinks.reduce((acc, l) => {
            if (!acc[l.category]) acc[l.category] = [];
            if (l.title !== 'placeholder_hidden') acc[l.category].push(l);
            return acc;
        }, {});

        // 2. 结合排序顺序生成分类列表
        let cats = Object.keys(grouped);
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        // 3. 循环渲染每一个分类和其中的站点
        sortedCats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`; // 侧边导航
            hint.innerHTML += `<option value="${cat}">${cat}</option>`; // 编辑弹窗下拉框
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid" data-cat="${cat}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
            // 绑定跨分类拖拽放下逻辑
            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async (e) => {
                grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text/plain');
                const item = allLinks.find(l => l.url === url);
                if(item && item.category !== cat) {
                    item.category = cat; await apiReq('save', { link: item });
                }
            };

            // 渲染站点卡片
            (grouped[cat] || []).forEach(l => {
                grid.appendChild(createCard(l));
            });
            main.appendChild(sec);
        });
    }

    // 创建站点卡片 HTML 元素
    function createCard(l) {
        const card = document.createElement('div');
        card.className = 'link-card'; card.draggable = true;
        card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'"><h3>${l.title}</h3>`;
        card.onclick = () => window.open(l.url, '_blank');
        card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
        card.ondragstart = (e) => e.dataTransfer.setData('text/plain', l.url);
        return card;
    }

    // --- 搜索逻辑核心修复 (解决图 18, 19 问题) ---
    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const engineBar = box.querySelector('.search-engines');
        const isModal = boxSel.includes('modal');
        const modalGrid = document.getElementById('modal-results-area');

        // 切换 站内 / 搜索引擎 标签
        box.querySelectorAll('.tab').forEach(t => t.onclick = () => {
            box.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            const isInt = t.dataset.type === 'internal';
            
            // 修复点：切换到站内时，自动隐藏下方引擎栏，反之显示
            if(engineBar) engineBar.style.display = isInt ? 'none' : 'flex';
            
            inp.placeholder = isInt ? "快速检索站内..." : "输入搜索内容";
            inp.value = ""; // 切换时清空
            if(isModal) modalGrid.innerHTML = '';
            else {
                document.body.classList.remove('is-searching');
                document.querySelectorAll('.link-card, section').forEach(el => el.style.display = '');
            }
            inp.focus();
        });

        // 执行搜索的函数
        const performSearch = () => {
            const q = inp.value.trim().toLowerCase();
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(!q) return;

            if(isInt) {
                // 站内搜索模式
                if(isModal) {
                    modalGrid.innerHTML = '';
                    const matches = allLinks.filter(l => l.title !== 'placeholder_hidden' && l.title.toLowerCase().includes(q));
                    matches.forEach(l => modalGrid.appendChild(createCard(l)));
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
                // 网页搜索引擎模式：新窗口打开
                window.open(currentEngine + encodeURIComponent(q), '_blank');
            }
        };

        // 修复点：红色按钮点击执行搜索
        box.querySelector('.search-trigger-btn').onclick = performSearch;

        // 实时输入监听：如果是站内模式，支持实时筛选
        inp.addEventListener('input', function() {
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(isInt) performSearch();
            else if(!this.value.trim() && !isModal) {
                // 如果清空了输入内容，主页恢复默认显示
                document.body.classList.remove('is-searching');
                document.querySelectorAll('.link-card, section').forEach(el => el.style.display = '');
            }
        });

        // 敲回车执行搜索
        inp.onkeydown = e => { if(e.key === 'Enter') performSearch(); };
    }
    // 同时初始化主页搜索和弹窗搜索
    setupSearch('.main-search'); setupSearch('.modal-inner-search');

    // 引擎切换：点击切换当前搜索引擎地址
    document.body.addEventListener('click', e => {
        if(e.target.classList.contains('engine')) {
            document.querySelectorAll('.engine').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active');
            currentEngine = e.target.dataset.url;
        }
    });

    // 阴影点击：关闭所有打开的弹窗
    document.querySelectorAll('.modal-overlay').forEach(el => el.onclick = () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.getElementById('modal-results-area').innerHTML = ''; 
    });

    // 打开编辑站点弹窗
    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-cat').value = l.category || '';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        const urlInput = document.getElementById('in-url');
        const prevImg = document.getElementById('prev-img');
        urlInput.value = (l.url?.includes('placeholder') ? '' : l.url) || '';
        
        // 重置图片状态逻辑
        if (l.icon && l.icon !== '') {
            prevImg.src = l.icon; prevImg.classList.add('loaded');
        } else {
            prevImg.src = ''; prevImg.classList.remove('loaded');
        }
    };

    // 网址输入监听：自动尝试抓取图标
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

    // 打开分类管理弹窗
    document.getElementById('btn-cat-admin').onclick = () => {
        renderCatAdmin();
        document.getElementById('modal-cat').style.display = 'flex';
    };

    // 渲染分类管理列表及拖拽排序功能
    function renderCatAdmin() {
        const box = document.getElementById('cat-list-box');
        box.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach((c, idx) => {
            const row = document.createElement('div');
            row.className = 'cat-admin-row'; row.draggable = true;
            row.innerHTML = `
                <i class="fas fa-bars drag-handle"></i>
                <input type="text" value="${c}">
                <div class="row-btns">
                    <button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button>
                    <button class="btn-mini red" onclick="deleteCat('${c}')">删除</button>
                </div>`;
            // 分类拖拽排序逻辑
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

    // 后端接口通用请求函数
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

    // 操作函数挂载到全局
    window.deleteSite = (e, u) => { e.stopPropagation(); if(confirm("确定删除吗？")) apiReq('delete', { link: {url:u} }); };
    window.renameCat = (old, btn) => apiReq('renameCategory', { oldCategory: old, newCategory: btn.closest('.cat-admin-row').querySelector('input').value });
    window.deleteCat = (cat) => confirm(`删除分类 "${cat}"？`) && apiReq('deleteCategory', { oldCategory: cat });
    window.addNewCategory = () => {
        const name = document.getElementById('new-cat-input').value.trim();
        if(name) apiReq('addCategory', { newCategory: name }).then(() => document.getElementById('new-cat-input').value = '');
    };

    // 表单提交保存
    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        data.icon = document.getElementById('prev-img').src;
        if(await apiReq('save', { link: data })) document.getElementById('modal-link').style.display='none';
    };

    // 其他 UI 按钮逻辑
    document.getElementById('btn-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('btn-float-search').onclick = () => {
        document.getElementById('modal-search').style.display='flex';
        // 自动聚焦到输入框
        setTimeout(() => document.querySelector('.modal-inner-search .search-input').focus(), 100);
    };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    
    // 监听滚动显示/隐藏侧边悬浮搜索和置顶按钮
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };
});

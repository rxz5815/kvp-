document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let savedOrder = []; // 存储分类顺序
    let currentEngine = "https://www.baidu.com/s?wd=";

    // --- 背景逻辑保持不变 ---
    const updateBg = (val, save = true) => {
        const bg = document.getElementById('bg-canvas');
        if(val.startsWith('http')) bg.style.backgroundImage = `url(${val})`; else bg.style.background = val;
        if(save) localStorage.setItem('nav_bg_v10', val);
    };
    updateBg(localStorage.getItem('nav_bg_v10') || 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)');

    async function fetchData() {
        try {
            const res = await fetch('/api/links');
            const data = await res.json();
            allLinks = data.links;
            savedOrder = data.order || []; // 获取保存的顺序
            render();
        } catch (e) { render(); }
    }
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        const hint = document.getElementById('cat-hint');
        main.innerHTML = ''; nav.innerHTML = ''; hint.innerHTML = '<option value="">选择分类</option>';

        // 1. 分组数据
        const grouped = allLinks.reduce((acc, l) => {
            if (!acc[l.category]) acc[l.category] = [];
            if (l.title !== 'placeholder_hidden') acc[l.category].push(l);
            return acc;
        }, {});

        // 2. 确定排序后的分类列表
        let categories = Object.keys(grouped);
        // 如果后端有保存顺序，按顺序排列；新分类排在后面
        if (savedOrder.length > 0) {
            categories.sort((a, b) => {
                let idxA = savedOrder.indexOf(a);
                let idxB = savedOrder.indexOf(b);
                if (idxA === -1) idxA = 999;
                if (idxB === -1) idxB = 999;
                return idxA - idxB;
            });
        }

        // 3. 渲染
        categories.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            hint.innerHTML += `<option value="${cat}">${cat}</option>`;
            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<h2 class="category-title">${cat}</h2><div class="link-grid" data-cat="${cat}"></div>`;
            const grid = sec.querySelector('.link-grid');
            
            // 站点拖拽换类逻辑
            grid.ondragover = e => e.preventDefault();
            grid.ondrop = async (e) => {
                const url = e.dataTransfer.getData('link-url');
                if (!url) return;
                const item = allLinks.find(l => l.url === url);
                if(item && item.category !== cat) {
                    item.category = cat; await apiReq('save', { link: item });
                }
            };

            grouped[cat].forEach(l => {
                const card = document.createElement('div');
                card.className = 'link-card'; card.draggable = true;
                card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'"><h3>${l.title}</h3>`;
                card.onclick = () => window.open(l.url, '_blank');
                card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
                card.ondragstart = (e) => e.dataTransfer.setData('link-url', l.url); // 使用专用key防止冲突
                grid.appendChild(card);
            });
            main.appendChild(sec);
        });
    }

    async function apiReq(action, data) {
        let pwd = localStorage.getItem('auth_pwd_v10') || data.password || prompt("管理密码:");
        if(!pwd) return;
        const res = await fetch('/api/links', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...data, password: pwd, action })
        });
        if(res.ok) {
            localStorage.setItem('auth_pwd_v10', pwd);
            fetchData(); return true;
        }
        alert("认证失败"); return false;
    }

    // --- 分类管理：增加拖拽排序逻辑 ---
    document.getElementById('btn-cat-admin').onclick = () => {
        const box = document.getElementById('cat-list-box');
        box.innerHTML = '';
        
        // 这里的排序也要遵循 savedOrder
        let cats = [...new Set(allLinks.map(l => l.category))];
        if (savedOrder.length > 0) {
            cats.sort((a, b) => {
                let idxA = savedOrder.indexOf(a);
                let idxB = savedOrder.indexOf(b);
                return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
            });
        }

        cats.forEach(c => {
            const row = document.createElement('div');
            row.className = 'cat-admin-row';
            row.draggable = true;
            row.dataset.name = c;
            row.innerHTML = `<input type="text" value="${c}"><button class="btn-mini blue" onclick="renameCat('${c}', this)">改名</button><button class="btn-mini red" onclick="deleteCat('${c}')">删除</button>`;
            
            // 分类拖拽事件
            row.ondragstart = (e) => {
                e.dataTransfer.setData('cat-name', c);
                row.classList.add('dragging');
            };
            row.ondragend = () => row.classList.remove('dragging');
            row.ondragover = (e) => {
                e.preventDefault();
                row.classList.add('drag-over');
            };
            row.ondragleave = () => row.classList.remove('drag-over');
            row.ondrop = (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                const draggedName = e.dataTransfer.getData('cat-name');
                if (draggedName === c) return;

                // 重新计算顺序
                const allRows = [...box.querySelectorAll('.cat-admin-row')];
                const names = allRows.map(r => r.dataset.name);
                const fromIdx = names.indexOf(draggedName);
                const toIdx = names.indexOf(c);
                
                names.splice(toIdx, 0, names.splice(fromIdx, 1)[0]);
                // 保存新顺序到服务器
                apiReq('updateOrder', { order: names });
            };

            box.appendChild(row);
        });
        document.getElementById('modal-cat').style.display = 'flex';
    };

    // 其余逻辑（搜索、编辑弹窗等）保持不变...
    // [此处省略重复的搜索和编辑弹窗函数，请保留你当前 script.js 中的对应部分]
    
    // 注意：确保 setupSearch, deleteSite, openEdit 等函数都在这里。
});

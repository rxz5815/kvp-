document.addEventListener('DOMContentLoaded', function() {
    let allLinks = [];
    let categoryOrder = [];
    let currentEngine = "https://www.baidu.com/s?wd=";

        // 渐变背景
    const grads = [
        'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', // 默认渐变蓝
        'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', // 渐变绿
        'linear-gradient(135deg, #202124 0%, #3c4043 100%)', // 渐变灰
        'linear-gradient(135deg, #2c3e50 0%, #4ca1af 80%)', // 墨青蓝绿
        'linear-gradient(45deg, #3d2b56 0%, #8e54e9 80%)', // 暗调茄紫
        'linear-gradient(135deg, #283048 0%, #859398 80%)', // 烟灰棕
        'linear-gradient(45deg, #1e2a38 0%, #5a7fa5 80%)', // 藏青灰
        'linear-gradient(135deg, #192841 0%, #607d8b 80%)', // 冷调钢灰
        'linear-gradient(45deg, #271f30 0%, #7b4397 80%)', // 暗调绛紫
        'linear-gradient(135deg, #182c39 0%, #486a78 80%)', // 青灰棕
        'linear-gradient(45deg, #221d2e 0%, #614e77 80%)', // 暗调藕紫
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'  // 渐变紫
    ];

            // 图片背景
        document.getElementById('btn-random-bg').onclick = async () => {
        const res = await fetch(`https://picsum.photos/1920/1080?random=${Math.random()}`);
        if(res.url) updateBg(res.url);
    };

    // --- 修复问题 2: 点击遮罩层关闭弹窗 ---
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.onclick = () => {
            overlay.parentElement.style.display = 'none';
        };
    });

    const updateBg = (v, s = true) => {
        const b = document.getElementById('bg-canvas');
        if(v.startsWith('http')) b.style.backgroundImage = `url(${v})`; else b.style.background = v;
        if(s) localStorage.setItem('nav_bg_v18', v);
    };
    updateBg(localStorage.getItem('nav_bg_v18') || 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)');

    async function fetchData() {
        try {
            const res = await fetch('/api/links');
            const data = await res.json();
            allLinks = data.links || [];
            categoryOrder = data.order || [];
            render();
        } catch (e) { render(); }
    }
    fetchData();

    function render() {
        const main = document.getElementById('main-content');
        const nav = document.getElementById('category-ul');
        const hint = document.getElementById('cat-hint');
        main.innerHTML = ''; nav.innerHTML = ''; hint.innerHTML = '<option value="">选择大分类</option>';

        const grouped = allLinks.reduce((acc, l) => {
            if (!acc[l.category]) acc[l.category] = [];
            if (l.title !== 'placeholder_hidden') acc[l.category].push(l);
            return acc;
        }, {});

        let cats = Object.keys(grouped);
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });

        sortedCats.forEach(cat => {
            nav.innerHTML += `<li><a href="#${cat}">${cat}</a></li>`;
            hint.innerHTML += `<option value="${cat}">${cat}</option>`;
            
            const currentLinks = allLinks.filter(l => l.category === cat && l.title !== 'placeholder_hidden');
            const allSubsInCat = allLinks.filter(l => l.category === cat && l.subcategory).map(l => l.subcategory);
            const subCats = ['全部', ...new Set(allSubsInCat)];
            
            let subBarHtml = '';
            if (subCats.length > 1) { 
                subBarHtml = `<div class="category-divider">|</div><div class="subcategory-bar">`;
                subCats.forEach((s, i) => subBarHtml += `<span class="sub-tag ${i===0?'active':''}" data-sub="${s}">${s}</span>`);
                subBarHtml += `</div>`;
            }

            const sec = document.createElement('section');
            sec.id = cat;
            sec.innerHTML = `<div class="category-header"><h2 class="category-title">${cat}</h2>${subBarHtml}</div><div class="link-grid" data-cat="${cat}"></div>`;
            
            const grid = sec.querySelector('.link-grid');
            const tags = sec.querySelectorAll('.sub-tag');

            tags.forEach(t => t.onclick = () => {
                tags.forEach(x => x.classList.remove('active')); t.classList.add('active');
                grid.querySelectorAll('.link-card').forEach(c => c.style.display = (t.dataset.sub==='全部' || c.dataset.subcat===t.dataset.sub) ? '' : 'none');
            });

            currentLinks.forEach(l => {
                const card = createCard(l);
                if (l.subcategory) card.dataset.subcat = l.subcategory;
                grid.appendChild(card);
            });

            grid.ondragover = e => { e.preventDefault(); grid.classList.add('drag-over'); };
            grid.ondragleave = () => grid.classList.remove('drag-over');
            grid.ondrop = async (e) => {
                grid.classList.remove('drag-over');
                const url = e.dataTransfer.getData('text/plain');
                const item = allLinks.find(l => l.url === url);
                if (item) {
                    item.category = cat;
                    // --- 修复问题 6: 拖拽到有小分类激活的区域时，自动分配小分类 ---
                    const activeSub = sec.querySelector('.sub-tag.active')?.dataset.sub;
                    if (activeSub && activeSub !== '全部') {
                        item.subcategory = activeSub;
                    } else {
                        item.subcategory = ""; // 如果是“全部”，则清除小分类
                    }
                    render();
                    apiReq('updateLinksOrder', { link: allLinks }, true);
                }
            };
            main.appendChild(sec);
        });
    }

    function createCard(l) {
        const card = document.createElement('div');
        card.className = 'link-card'; card.draggable = true;
        if (l.desc) card.setAttribute('data-desc', l.desc);
        card.innerHTML = `<div class="card-del" onclick="deleteSite(event, '${l.url}')">&times;</div><img src="${l.icon}" onerror="this.src='https://www.google.com/s2/favicons?domain=github.com&sz=64'"><h3>${l.title}</h3>`;
        card.onclick = () => window.open(l.url, '_blank');
        card.oncontextmenu = (e) => { e.preventDefault(); openEdit(l); };
        card.ondragstart = (e) => { e.dataTransfer.setData('text/plain', l.url); card.classList.add('dragging'); };
        card.ondragend = () => card.classList.remove('dragging');
        return card;
    }

    function updateSubcatDropdown(selectedCat, currentSub = "") {
        const subSelect = document.getElementById('in-subcat');
        subSelect.innerHTML = '<option value="">选择二级小类</option>';
        if (!selectedCat) return;
        const subCats = [...new Set(allLinks.filter(l => l.category === selectedCat && l.subcategory).map(l => l.subcategory))];
        subCats.forEach(s => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = s;
            if(s === currentSub) opt.selected = true;
            subSelect.appendChild(opt);
        });
    }

    document.getElementById('cat-hint').onchange = function() { updateSubcatDropdown(this.value); };

    window.openEdit = (l = {}) => {
        document.getElementById('modal-link').style.display = 'flex';
        document.getElementById('in-title').value = (l.title === 'placeholder_hidden' ? '' : l.title) || '';
        document.getElementById('in-desc').value = l.desc || '';
        document.getElementById('cat-hint').value = l.category || '';
        updateSubcatDropdown(l.category || '', l.subcategory || '');
        const urlInput = document.getElementById('in-url'), prevImg = document.getElementById('prev-img');
        urlInput.value = (l.url?.includes('placeholder') ? '' : l.url) || '';
        if (l.icon) { prevImg.src = l.icon; prevImg.classList.add('loaded'); } else { prevImg.src = ''; prevImg.classList.remove('loaded'); }
    };

    // 分类管理渲染
    function renderCatAdmin() {
        const box = document.getElementById('cat-list-box'); box.innerHTML = '';
        const cats = [...new Set(allLinks.map(l => l.category))];
        let sortedCats = categoryOrder.filter(c => cats.includes(c));
        cats.forEach(c => { if(!sortedCats.includes(c)) sortedCats.push(c); });
        
        sortedCats.forEach((c, idx) => {
            const subs = [...new Set(allLinks.filter(l => l.category === c && l.subcategory).map(l => l.subcategory))];
            const row = document.createElement('div');
            row.className = 'cat-admin-container'; row.style.marginBottom = "15px";
            let subTagsHtml = subs.map(s => `<span class="mini-sub-tag">${s} <i class="fas fa-times" onclick="deleteSubCat('${c}', '${s}')"></i></span>`).join('');

            // 问题5修复：为“改名”增加 purple 类名
            row.innerHTML = `
                <div class="cat-admin-row" draggable="true">
                    <i class="fas fa-bars drag-handle"></i>
                    <input type="text" value="${c}" style="flex:1;background:transparent;border:none;color:#fff">
                    <div class="row-btns">
                        <button class="btn-mini blue" onclick="addSubCatPrompt('${c}')">+子类</button>
                        <button class="btn-mini purple" onclick="renameCat('${c}', this)">改名</button>
                        <button class="btn-mini red" onclick="deleteCat('${c}')">删除</button>
                    </div>
                </div>
                <div style="padding-left: 35px; margin-top: 5px; display: flex; gap: 8px; flex-wrap: wrap;">${subTagsHtml}</div>`;
            
            const adminRow = row.querySelector('.cat-admin-row');
            adminRow.ondragstart = (e) => { e.dataTransfer.setData('idx', idx); row.style.opacity = '0.5'; };
            adminRow.ondragend = () => row.style.opacity = '1';
            row.ondragover = e => e.preventDefault();
            row.ondrop = async (e) => {
                e.preventDefault();
                const from = parseInt(e.dataTransfer.getData('idx')), to = idx;
                if (from === to) return;
                const newOrder = [...sortedCats]; const [moved] = newOrder.splice(from, 1); newOrder.splice(to, 0, moved);
                categoryOrder = newOrder; render(); renderCatAdmin();
                apiReq('updateOrder', { order: categoryOrder }, true);
            };
            box.appendChild(row);
        });
    }

    // --- 修复问题 3 & 4: 自定义子类弹窗 & 实时渲染 ---
    let currentAddSubCatParent = "";
    window.addSubCatPrompt = (mainCat) => {
        currentAddSubCatParent = mainCat;
        document.getElementById('subcat-modal-title').innerText = `为 [${mainCat}] 添加子类`;
        document.getElementById('new-subcat-input').value = "";
        document.getElementById('modal-subcat').style.display = 'flex';
    };

    document.getElementById('btn-confirm-subcat').onclick = async () => {
        const subName = document.getElementById('new-subcat-input').value.trim();
        if (!subName) return;
        document.getElementById('modal-subcat').style.display = 'none';
        
        // 关键点：发送请求并重新获取数据渲染，确保分类管理处显示
        const success = await apiReq('addCategory', { newCategory: currentAddSubCatParent, subcategory: subName });
        if (success) {
            // fetchData 内部会调用 render，但我们手动调用 renderCatAdmin 确保管理界面同步
            setTimeout(renderCatAdmin, 500); 
        }
    };

    window.deleteSubCat = async (mainCat, subCat) => {
        if (!confirm(`确定要删除小分类 "${subCat}" 吗？`)) return;
        allLinks = allLinks.map(l => (l.category === mainCat && l.subcategory === subCat) ? { ...l, subcategory: "" } : l);
        render(); renderCatAdmin();
        apiReq('updateLinksOrder', { link: allLinks }, true);
    };

    async function apiReq(action, data, noRefresh = false) {
        let pwd = sessionStorage.getItem('auth_pwd_v9') || prompt("管理密码:");
        if(!pwd) return false;
        const res = await fetch('/api/links', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...data, password: pwd, action })
        });
        if(res.ok) { 
            sessionStorage.setItem('auth_pwd_v9', pwd); 
            if(!noRefresh) await fetchData(); 
            return true; 
        }
        if(res.status === 401) { alert("密码错误！"); sessionStorage.removeItem('auth_pwd_v9'); }
        return false;
    }

    // --- 修复问题 1: 站内搜索隐藏引擎 ---
    function setupSearch(boxSel) {
        const box = document.querySelector(boxSel);
        const inp = box.querySelector('.search-input');
        const engines = box.querySelector('.search-engines');
        const tabs = box.querySelectorAll('.tab');

        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // 如果是站内搜索，隐藏引擎，否则显示
                if (tab.dataset.type === 'internal') {
                    engines.classList.add('hidden');
                } else {
                    engines.classList.remove('hidden');
                }
            };
        });

        inp.addEventListener('input', function() {
            const q = this.value.trim().toLowerCase();
            const isInt = box.querySelector('.tab.active').dataset.type === 'internal';
            if(!isInt) return;
            if(!q) { 
                document.body.classList.remove('is-searching'); 
                document.querySelectorAll('.link-card, section').forEach(el => el.style.display = ''); 
                return;
            }
            document.body.classList.add('is-searching');
            document.querySelectorAll('.link-card').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q) ? '' : 'none');
            document.querySelectorAll('section').forEach(s => {
                const has = Array.from(s.querySelectorAll('.link-card')).some(c => c.style.display !== 'none');
                s.style.display = has ? '' : 'none';
            });
        });

        const confirm = () => { 
            const q = inp.value.trim(); 
            if(q && box.querySelector('.tab.active').dataset.type !== 'internal') 
                window.open(currentEngine + encodeURIComponent(q), '_blank'); 
        };
        box.querySelector('.search-trigger-btn').onclick = confirm;
        inp.onkeydown = e => { if(e.key === 'Enter') confirm(); };
    }
    setupSearch('.main-search');
    setupSearch('.modal-inner-search');

    document.getElementById('btn-cat-admin').onclick = () => { renderCatAdmin(); document.getElementById('modal-cat').style.display = 'flex'; };
    document.getElementById('btn-add-site').onclick = () => openEdit();
    window.deleteSite = (e, u) => { e.stopPropagation(); if(confirm("确定删除吗？")) apiReq('delete', { link: {url:u} }); };
    window.renameCat = (o, b) => apiReq('renameCategory', { oldCategory: o, newCategory: b.closest('.cat-admin-row').querySelector('input').value });
    window.deleteCat = (c) => confirm(`删除分类 "${c}"？`) && apiReq('deleteCategory', { oldCategory: c });
    window.addNewCategory = () => { const n = document.getElementById('new-cat-input').value.trim(); if(n) apiReq('addCategory', { newCategory: n }).then(() => { document.getElementById('new-cat-input').value = ''; renderCatAdmin(); }); };

    document.getElementById('link-form').onsubmit = async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        if(await apiReq('save', { link: data })) document.getElementById('modal-link').style.display = 'none';
    };

    document.getElementById('btn-top').onclick = () => window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('btn-float-search').onclick = () => { document.getElementById('modal-search').style.display='flex'; setTimeout(() => document.querySelector('.modal-inner-search .search-input').focus(), 100); };
    window.onscroll = () => {
        const y = window.scrollY;
        document.getElementById('btn-top').style.display = document.getElementById('btn-float-search').style.display = y > 300 ? 'flex' : 'none';
    };
});

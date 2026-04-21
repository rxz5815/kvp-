:root {
    --red: #ff4d4f;
    --dark: #202124;
    --glass: rgba(255, 255, 255, 0.05);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', system-ui, sans-serif; color: #fff; background: #000; min-height: 100vh; overflow-x: hidden; }

#bg-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background-size: cover; background-position: center; transition: 1s ease; }

。wrapper { max-width: 1100px; margin: 0 auto; padding: 20px; }
header { padding: 60px 0 20px; text-align: center; }
header h1 { font-weight: 300; font-size: 36px; color: #4facfe; margin-bottom: 30px; letter-spacing: 2px; }

/* 搜索栏：美化回归 */
。search-main-box { max-width: 650px; margin: 0 auto 40px; }
。search-tabs { display: flex; justify-content: center; gap: 20px; margin-bottom: 15px; }
。tab { cursor: pointer; opacity: 0.5; font-size: 15px; padding-bottom: 5px; transition: 0.3s; }
。tab.active { opacity: 1; border-bottom: 2px solid #fff; font-weight: bold; }

。search-bar {
    display: flex; background: rgba(32, 33, 36, 0.95); border-radius: 50px; padding: 6px 6px 6px 20px;
    border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
。search-bar input { flex: 1; background: transparent; border: none; color: #fff; font-size: 17px; outline: none; }
。search-bar button { background: var(--red); border: none; color: #fff; width: 50px; height: 44px; border-radius: 50px; cursor: pointer; }

。search-engines { display: flex; justify-content: center; gap: 15px; margin-top: 15px; font-size: 13px; }
。engine { cursor: pointer; opacity: 0.6; }
。engine.active { opacity: 1; font-weight: bold; }

/* 站点卡片：毛玻璃+呼吸灯 */
。link-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(115px, 1fr)); gap: 20px; margin-bottom: 40px; }
。link-card {
    position: relative; background: var(--glass); backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 18px; padding: 22px 10px;
    text-align: center; cursor: pointer; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
。link-card:hover {
    background: rgba(255, 255, 255, 0.15); transform: translateY(-8px);
    border-color: var(--red); box-shadow: 0 0 20px rgba(255, 77, 79, 0.3);
}
。link-card img { width: 42px; height: 42px; border-radius: 10px; margin-bottom: 10px; }
。link-card h3 { font-size: 13px; font-weight: 300; opacity: 0.8; }

/* 右上角删除 */
。card-del {
    position: absolute; top: -6px; right: -6px; background: var(--red); color: #fff;
    width: 22px; height: 22px; border-radius: 50%; font-size: 11px;
    display: none; align-items: center; justify-content: center; z-index: 10;
}
。link-card:hover .card-del { display: flex; }

/* 侧边栏：修复缩回问题 */
。side-toolbar { position: fixed; right: 25px; bottom: 30px; display: flex; flex-direction: column; gap: 12px; z-index: 1000; }
。side-btn {
    width: 50px; height: 50px; border-radius: 15px; background: rgba(32,33,36,0.9);
    border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; transition: 0.3s;
    display: flex; align-items: center; justify-content: center; font-size: 18px;
}
。side-btn:hover { background: var(--red); }

/* 背景二级菜单 */
。bg-menu-wrapper { position: relative; }
。bg-sub-menu {
    position: absolute; right: 65px; bottom: 0; display: none; gap: 8px;
    padding-right: 15px; animation: slideIn 0.3s forwards;
}
。bg-menu-wrapper:hover .bg-sub-menu { display: flex; }
。bg-ball {
    width: 44px; height: 44px; background: #202124; border-radius: 12px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    border: 1px solid #444; font-size: 12px; font-weight: bold;
}
。bg-ball:hover { background: #4facfe; transform: scale(1.1); }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* 弹窗 */
。modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; justify-content: center; align-items: center; }
。modal-body { background: #1a1a1a; padding: 30px; border-radius: 24px; width: 90%; max-width: 420px; border: 1px solid #333; box-shadow: 0 20px 50px rgba(0,0,0,1); }
#link-form input, #link-form select { width: 100%; padding: 14px; margin-bottom: 15px; background: #000; border: 1px solid #333; color: #fff; border-radius: 12px; outline: none; }
。save-button { width: 100%; padding: 14px; background: var(--red); border: none; color: #fff; border-radius: 12px; font-weight: bold; cursor: pointer; }
。preview-line { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; font-size: 13px; opacity: 0.6; }
。preview-line img { width: 32px; height: 32px; border-radius: 8px; }

nav { margin-bottom: 30px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 15px; text-align: center; }
nav ul { display: flex; justify-content: center; flex-wrap: wrap; list-style: none; gap: 10px; }
nav a { color: #aaa; text-decoration: none; font-size: 14px; padding: 5px 12px; border-radius: 5px; transition: 0.3s; }
nav a:hover { color: #fff; background: rgba(255,255,255,0.1); }

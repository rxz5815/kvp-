:root {
  --primary-color: #ff4d4f; /* 搜索按钮颜色 */
  --text-color: #ffffff;
  --glass-bg: rgba(0, 0, 0, 0.45);
  --glass-border: rgba(255, 255, 255, 0.1);
}

body {
  margin: 0;
  padding: 0;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text-color);
  min-height: 100vh;
  background-color: #1a1a1a;
}

/* 背景容器 */
#bg-container {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: -1;
  transition: 1s ease;
}
#bg-container img {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: brightness(0.7); /* 稍微压暗背景，保护视力 */
}

/* 玻璃拟态 UI 基准 */
。search-bar, .link-card, nav, .modal-content {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
}

header { padding: 40px 20px 10px; text-align: center; }
header h1 { margin-bottom: 20px; font-weight: 300; letter-spacing: 2px; }

/* 搜索栏样式 */
。search-container { max-width: 700px; margin: 0 auto 40px; }
。search-tabs { margin-bottom: 12px; }
。search-tab { margin: 0 15px; cursor: pointer; opacity: 0.6; position: relative; padding-bottom: 5px; }
。search-tab.active { opacity: 1; border-bottom: 2px solid #fff; font-weight: bold; }

。search-bar {
  display: flex; padding: 5px 5px 5px 20px; border-radius: 12px; align-items: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
。search-bar input {
  flex: 1; background: transparent; border: none; color: #fff; font-size: 18px; outline: none; padding: 12px 0;
}
。search-bar button {
  background: var(--primary-color); border: none; color: white;
  width: 45px; height: 45px; border-radius: 10px; cursor: pointer; transition: 0.2s;
}
。search-bar button:hover { transform: scale(1.05); }

。search-engines { margin-top: 12px; display: flex; justify-content: center; gap: 20px; font-size: 14px; }
。engine { cursor: pointer; opacity: 0.7; }
。engine.active { opacity: 1; font-weight: bold; text-decoration: underline; }

/* 导航样式 */
nav { position: sticky; top: 0; z-index: 100; padding: 10px 0; margin-bottom: 20px; }
nav ul { list-style: none; display: flex; justify-content: center; flex-wrap: wrap; margin: 0; padding: 0; }
nav a { color: #fff; text-decoration: none; padding: 8px 15px; border-radius: 8px; font-size: 14px; transition: 0.3s; }
nav a:hover { background: rgba(255,255,255,0.2); }

/* 链接网格 */
main { max-width: 1200px; margin: 0 auto; padding: 20px; }
。category-title { border-left: 4px solid var(--primary-color); padding-left: 12px; margin: 40px 0 20px; font-size: 20px; }
。link-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 20px; }

。link-card {
  padding: 18px 10px; border-radius: 15px; text-align: center; transition: 0.3s; cursor: pointer;
}
。link-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.15); }
。link-card img { width: 36px; height: 36px; margin-bottom: 10px; border-radius: 8px; }
。link-card h3 { font-size: 14px; margin: 0; font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 弹窗样式 */
。modal-overlay {
  display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7); z-index: 2000; justify-content: center; align-items: center;
}
。modal-content {
  width: 90%; max-width: 450px; padding: 30px; border-radius: 20px; position: relative;
}
。close-modal { position: absolute; right: 20px; top: 15px; font-size: 24px; cursor: pointer; }

/* 表单与按钮 */
。settings-group { margin-bottom: 20px; }
。bg-options { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
。action-btn { 
  background: rgba(255,255,255,0.2); border: none; color: #fff; padding: 6px 12px; 
  border-radius: 6px; cursor: pointer; font-size: 13px; 
}
。custom-bg-box { display: flex; width: 100%; gap: 5px; margin-top: 5px; }
。custom-bg-box input { flex: 1; background: rgba(0,0,0,0.2); border: 1px solid #555; color: #fff; border-radius: 5px; padding: 5px; }

#link-form input {
  display: block; width: 100%; margin-bottom: 15px; padding: 12px; 
  background: rgba(0,0,0,0.3); border: 1px solid #444; color: #fff; border-radius: 8px; box-sizing: border-box;
}
。icon-preview-wrapper { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 12px; opacity: 0.8; }
。icon-preview-wrapper img { width: 32px; height: 32px; border-radius: 5px; }
。save-btn { width: 100%; padding: 12px; background: var(--primary-color); border: none; color: #fff; border-radius: 8px; font-weight: bold; cursor: pointer; }

#toggle-edit {
  position: fixed; bottom: 30px; right: 30px; width: 55px; height: 55px; border-radius: 50%;
  background: var(--primary-color); color: #fff; border: none; font-size: 20px; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}

footer { text-align: center; padding: 40px; opacity: 0.6; font-size: 12px; }

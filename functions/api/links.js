export async function onRequest(context) {
  const { request, env } = context;
  const body = await request.json().catch(() => ({}));
  const { password, link, action, oldCategory, newCategory, order, parentCategory, oldSubCategory, newSubCategory } = body;

  if (request.method === 'GET') {
    const links = await env.LINKS_KV.get('all_links');
    const catOrder = await env.LINKS_KV.get('category_order');
    return new Response(JSON.stringify({
      links: JSON.parse(links || '[]'),
      order: JSON.parse(catOrder || '[]')
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (password !== env.EDIT_PASSWORD) return new Response('Unauthorized', { status: 401 });

  // 排序更新
  if (action === 'updateOrder') {
    await env.LINKS_KV.put('category_order', JSON.stringify(order));
    return new Response('OK', { status: 200 });
  }

  if (action === 'updateLinksOrder') {
    await env.LINKS_KV.put('all_links', JSON.stringify(link)); 
    return new Response('OK', { status: 200 });
  }

  let links = JSON.parse(await env.LINKS_KV.get('all_links') || '[]');

  switch (action) {
    case 'delete':
      links = links.filter(l => l.url !== link.url);
      break;

    case 'renameCategory':
      links = links.map(l => l.category === oldCategory ? { ...l, category: newCategory } : l);
      break;

    case 'deleteCategory':
      links = links.filter(l => l.category !== oldCategory);
      break;

    case 'addCategory':
      links.push({ category: newCategory, title: 'placeholder_hidden', url: 'https://placeholder' + Math.random(), icon: '' });
      break;

    // --- 新增：二级分类逻辑 ---
    case 'addSubCategory':
      links.push({ 
        category: parentCategory, 
        subCategory: newSubCategory, 
        title: 'placeholder_hidden', 
        url: 'https://placeholder_sub' + Math.random(), 
        icon: '' 
      });
      break;

    case 'renameSubCategory':
      links = links.map(l => (l.category === parentCategory && l.subCategory === oldSubCategory) ? { ...l, subCategory: newSubCategory } : l);
      break;

    case 'deleteSubCategory':
      // 这里的逻辑是将子分类标签设为空，保留站点；或者直接删除占位符
      links = links.map(l => (l.category === parentCategory && l.subCategory === oldSubCategory) ? { ...l, subCategory: "" } : l);
      links = links.filter(l => !(l.title === 'placeholder_hidden' && l.url.includes('placeholder_sub')));
      break;

    case 'save':
      // 过滤掉当前要保存站点的旧版本（如果存在）以及处理占位符
      links = links.filter(l => l.title !== 'placeholder_hidden');
      const idx = links.findIndex(l => l.url === link.url);
      if (idx > -1) links[idx] = link;
      else links.push(link);
      break;
  }

  await env.LINKS_KV.put('all_links', JSON.stringify(links));
  return new Response('OK', { status: 200 });
}

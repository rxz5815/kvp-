export async function onRequest(context) {
  const { request, env } = context;
  const body = await request.json().catch(() => ({}));
  const { password, link, action, oldCategory, newCategory, subcategory, order } = body;

  if (request.method === 'GET') {
    const links = await env.LINKS_KV.get('all_links');
    const catOrder = await env.LINKS_KV.get('category_order');
    return new Response(JSON.stringify({
      links: JSON.parse(links || '[]'),
      order: JSON.parse(catOrder || '[]')
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // 密码校验
  if (password !== env.EDIT_PASSWORD) return new Response('Unauthorized', { status: 401 });

  // 1. 更新大类排序
  if (action === 'updateOrder') {
    await env.LINKS_KV.put('category_order', JSON.stringify(order));
    return new Response('OK', { status: 200 });
  }

  // 2. 更新链接排序/属性
  if (action === 'updateLinksOrder') {
    await env.LINKS_KV.put('all_links', JSON.stringify(link)); 
    return new Response('OK', { status: 200 });
  }

  let links = JSON.parse(await env.LINKS_KV.get('all_links') || '[]');

  if (action === 'delete') {
    links = links.filter(l => l.url !== link.url);
  } else if (action === 'renameCategory') {
    links = links.map(l => l.category === oldCategory ? { ...l, category: newCategory } : l);
  } else if (action === 'deleteCategory') {
    links = links.filter(l => l.category !== oldCategory);
  } else if (action === 'addCategory') {
    // 创建一个占位符，使分类立即可见
    links.push({ 
        category: newCategory, 
        subcategory: subcategory || '', 
        title: 'placeholder_hidden', 
        url: 'https://placeholder-' + Math.random(), 
        icon: '' 
    });
  } else if (action === 'save') {
    // 移除之前的同名占位符或旧链接，然后保存新链接
    links = links.filter(l => l.url !== link.url);
    links.push(link);
  }

  await env.LINKS_KV.put('all_links', JSON.stringify(links));
  return new Response('OK', { status: 200 });
}

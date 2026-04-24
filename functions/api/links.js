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

  if (password !== env.EDIT_PASSWORD) return new Response('Unauthorized', { status: 401 });

  if (action === 'updateOrder') {
    await env.LINKS_KV.put('category_order', JSON.stringify(order));
    return new Response('OK', { status: 200 });
  }

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
    links.push({ 
        category: newCategory, subcategory: subcategory || '', 
        title: 'placeholder_hidden', url: 'https://placeholder-' + Math.random(), icon: '' 
    });
  } else {
    links = links.filter(l => l.url !== link.url && l.title !== 'placeholder_hidden');
    links.push(link);
  }

  await env.LINKS_KV.put('all_links', JSON.stringify(links));
  return new Response('OK', { status: 200 });
}

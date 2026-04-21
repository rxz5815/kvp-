export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'GET') {
    const links = await getLinks(env);
    return new Response(JSON.stringify(links), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else if (request.method === 'POST') {
    const { password, link, action } = await request.json();
    if (password !== env.EDIT_PASSWORD) {
      return new Response('Unauthorized', { status: 401 });
    }
    if (action === 'delete') {
      await deleteLink(env, link.url);
      return new Response('Deleted', { status: 200 });
    } else {
      await saveLink(env, link);
      return new Response('Saved', { status: 200 });
    }
  }
  return new Response('Not found', { status: 404 });
}

async function getLinks(env) {
  const stored = await env.LINKS_KV.get('all_links');
  return stored ? JSON.parse(stored) : []; // 如果KV为空则返回空数组，前端会处理默认值
}

async function saveLink(env, newLink) {
  let links = await getLinks(env);
  const idx = links.findIndex(l => l.url === newLink.url);
  if (idx > -1) links[idx] = newLink;
  else links.push(newLink);
  await env.LINKS_KV.put('all_links', JSON.stringify(links));
}

async function deleteLink(env, url) {
  let links = await getLinks(env);
  links = links.filter(l => l.url !== url);
  await env.LINKS_KV.put('all_links', JSON.stringify(links));
}

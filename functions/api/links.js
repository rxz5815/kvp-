export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'GET') {
    const links = await getLinks(env);
    return new Response(JSON.stringify(links), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else if (request.method === 'POST') {
    const { password, link, action } = await request.json();
    
    // 验证密码 (确保你在 Cloudflare Dashboard 设置了 EDIT_PASSWORD 环境变量)
    if (password !== env.EDIT_PASSWORD) {
      return new Response('Unauthorized: Incorrect password', { status: 401 });
    }
    
    if (action === 'delete') {
      await deleteLink(env, link.url);
      return new Response('Link deleted', { status: 200 });
    } else {
      await saveLink(env, link);
      return new Response('Link saved', { status: 200 });
    }
  }

  return new Response('Not found', { status: 404 });
}

async function getLinks(env) {
  const storedLinks = await env.LINKS_KV.get('all_links');
  return storedLinks ? JSON.parse(storedLinks) : getDefaultLinks();
}

async function saveLink(env, newLink) {
  const links = await getLinks(env);
  const index = links.findIndex(link => link.url === newLink.url);
  if (index > -1) {
    links[index] = newLink;
  } else {
    links.push(newLink);
  }
  await env.LINKS_KV.put('all_links', JSON.stringify(links));
}

// 新增删除函数
async function deleteLink(env, url) {
  const links = await getLinks(env);
  const filteredLinks = links.filter(link => link.url !== url);
  await env.LINKS_KV.put('all_links', JSON.stringify(filteredLinks));
}

function getDefaultLinks() {
  // ...保持你原有的那些默认链接不变...
  return [ { category: 'ai-search', title: 'Google', url: 'https://www.google.com', icon: 'fab fa-google' } ];
}

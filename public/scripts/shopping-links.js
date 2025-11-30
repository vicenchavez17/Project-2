function displayShoppingLinks(links, containerId = 'shoppingLinks') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  
  if (!links || links.length === 0) {
    container.style.display = 'none';
    return;
  }

  const ul = document.createElement('ul');
  
  links.forEach(link => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.url;
    a.textContent = link.title;
    a.target = '_blank';
    li.appendChild(a);
    ul.appendChild(li);
  });

  container.appendChild(ul);
  container.style.display = 'block';
}

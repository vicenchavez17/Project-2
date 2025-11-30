(function(){
  const statusEl = document.getElementById('status');
  const regForm = document.getElementById('testRegisterForm');
  const loginForm = document.getElementById('testLoginForm');
  const logoutBtn = document.getElementById('testLogoutBtn');

  const setStatus = (msg, color = '#d64545') => {
    statusEl.textContent = msg;
    statusEl.style.color = color;
  };

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = e.target.fullName.value.trim();
    const username = e.target.username.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    if (!fullName || !username || !email || !password) {
      setStatus('All fields are required');
      return;
    }

    try {
      const resp = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, email, password })
      });
      const data = await resp.json();
      if (resp.ok) {
        localStorage.setItem('token', data.token);
        setStatus('Register successful — token saved', '#28a745');
        regForm.reset();
      } else {
        setStatus(`Register failed: ${data.error || resp.status}`);
      }
    } catch (err) {
      setStatus(`Register error: ${err.message}`);
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    if (!email || !password) {
      setStatus('Email and password are required');
      return;
    }

    try {
      const resp = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (resp.ok) {
        localStorage.setItem('token', data.token);
        setStatus('Login successful — redirecting...', '#28a745');
        loginForm.reset();
        setTimeout(() => window.location.href = '/index.html', 500);
      } else {
        setStatus(`Login failed: ${data.error || resp.status}`);
      }
    } catch (err) {
      setStatus(`Login error: ${err.message}`);
    }
  });

  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    setStatus('Logged out', '#666');
  });
})();

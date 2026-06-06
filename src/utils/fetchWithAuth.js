/**
 * Helper para hacer peticiones fetch con autenticación JWT
 * Agrega automáticamente el header Authorization con el token de sessionStorage
 */

export async function fetchWithAuth(url, options = {}) {
  const token = sessionStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

/**
 * Helper para hacer peticiones GET con autenticación
 */
export async function getWithAuth(url) {
  const response = await fetchWithAuth(url);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Error ${response.status}`);
  }
  return response.json();
}

/**
 * Helper para hacer peticiones POST con autenticación
 */
export async function postWithAuth(url, body) {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Error ${response.status}`);
  }
  return response.json();
}

/**
 * Helper para hacer peticiones PUT con autenticación
 */
export async function putWithAuth(url, body) {
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Error ${response.status}`);
  }
  return response.json();
}

/**
 * Helper para hacer peticiones DELETE con autenticación
 */
export async function deleteWithAuth(url) {
  const response = await fetchWithAuth(url, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Error ${response.status}`);
  }
  return response.json();
}


import { authenticatedFetch } from './api';

export const registerUser = async (username: string, email: string, password: string) => {
  return authenticatedFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
};

export const loginUser = async (email: string, password: string) => {
  return authenticatedFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const logoutUser = async (token: string | null) => {
  if (!token) return;
  
  return authenticatedFetch('/logout', {
    method: 'POST',
  }, token);
};

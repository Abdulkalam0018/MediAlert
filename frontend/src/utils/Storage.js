export const saveData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const loadData = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};
import api from './client';

export const fetchProjects = async () => {
  const { data } = await api.get('/portfolio');
  return data;
};

export const createProject = async (projectData) => {
  const { data } = await api.post('/portfolio', projectData);
  return data;
};

export const updateProject = async (id, projectData) => {
  const { data } = await api.put(`/portfolio/${id}`, projectData);
  return data;
};

export const deleteProject = async (id) => {
  const { data } = await api.delete(`/portfolio/${id}`);
  return data;
};

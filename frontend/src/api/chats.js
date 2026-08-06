import api from './client';

export const fetchChats = async () => {
  const { data } = await api.get('/chats');
  return data;
};

export const createChat = async (payload = {}) => {
  const { data } = await api.post('/chats', payload);
  return data;
};

export const fetchChat = async (chatId) => {
  const { data } = await api.get(`/chats/${chatId}`);
  return data; // { chat, messages }
};

export const renameChat = async (chatId, title) => {
  const { data } = await api.patch(`/chats/${chatId}`, { title });
  return data;
};

export const deleteChat = async (chatId) => {
  const { data } = await api.delete(`/chats/${chatId}`);
  return data;
};

export const sendMessage = async (chatId, { role, content }) => {
  const { data } = await api.post(`/chats/${chatId}/messages`, { role, content });
  return data;
};

export const generateProposal = async (chatId, content) => {
  const { data } = await api.post(`/chats/${chatId}/generate`, { content });
  return data;
};

import { request } from '@umijs/max';

export async function generateAISummary(bookId) {
  return request('/aisummary', { 
    method: 'POST',
    data: { id: bookId },
    
  });
}


import { request } from '@umijs/max';

export async function generateAISummary(bookId) {
  return request('/aisummary', { 
    method: 'POST',
    // 超时时间100s 
    timeout:100000,
    data: { id: bookId },
    
  });
}


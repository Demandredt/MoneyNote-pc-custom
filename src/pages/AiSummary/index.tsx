import React, { useState } from 'react';
import { useRequest } from '@umijs/max';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Select, Button, Spin, message } from 'antd';
import { queryAll } from '@/services/common';
import {  generateAISummary } from '@/services/ai';

const { Option } = Select;

export default () => {
  // 账本列表请求
  const { data: books = [], loading: booksLoading, run: loadBooks } = useRequest(
    () => queryAll('books'),
    { manual: true }
  );

  // AI总结请求
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [summaryResult, setSummaryResult] = useState('');
  
  const { loading: summaryLoading, run: getSummary } = useRequest(
    async (bookId) => {
      try {
        
        const result = await generateAISummary(bookId);
        return result;
      } catch (error) {
        console.error('请求处理异常:', error);
        return error.toString(); 
      }
    },
    {
      manual: true,
      onSuccess: (rawResponse) => {
        console.log('原始响应:', rawResponse);
   
        setSummaryResult(
          typeof rawResponse === 'object' 
            ? rawResponse.data || rawResponse.message 
            : String(rawResponse)
        );
        message.destroy();
        message.success('内容已更新');
      },
      onError: (error) => {
        console.error('网络错误:', error);
        message.destroy();
        message.error('网络连接异常');
      }
    }
  );

  return (
    <div style={{
    background: 'linear-gradient(135deg, #f8f9fa 0%, #f0f3f5 100%)',
    minHeight: '100vh',
    padding: 24
  }}>
<PageContainer 
  title={
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '12px 0'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #2c3e50 20%, #3498db 100%)',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        fontSize: '26px',
        fontWeight: 600,
        letterSpacing: '1.2px',
        textShadow: '0 2px 4px rgba(0,0,0,0.08)'
      }}>
        · 慧算账本 ·
      </div>
      <div style={{
        color: '#7f8c8d',
        fontSize: '14px',
        fontWeight: 400,
        marginLeft: 2
      }}>
        AI智能财务分析系统
      </div>
    </div>
  }
  content={
    <div style={{
      display: 'flex',
      gap: 16,
      color: '#5a5a5a',
      fontSize: '14px',
      marginTop: -12
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ 
          backgroundColor: '#3498db',
          width: 4,
          height: 16,
          marginRight: 8,
          borderRadius: 2
        }}/>
        大语言模型驱动的财务对话分析
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ 
          backgroundColor: '#2ecc71',
          width: 4,
          height: 16,
          marginRight: 8,
          borderRadius: 2
        }}/>
        会说人话的账本分析师
      </div>
    </div>
  }
>
<ProCard 
  bordered={false}
  style={{
    borderRadius: 12,
    boxShadow: '0 8px 20px rgba(34,41,47,0.06)',
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(10px)'
  }}
>
        {/* 账本选择器 */}
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          alignItems: 'center', 
          marginBottom: 24,
          padding: 12,
          backgroundColor: '#fafafa',
          borderRadius: 8
        }}>
          <Select
            placeholder="请选择分析账本"
            style={{ width: 320 }}
            loading={booksLoading}
            onFocus={loadBooks}
            onChange={(value) => {
            //   console.log('当前选择账本ID:', value);
              setSelectedBookId(value);
            }}
            optionFilterProp="children"
            showSearch
            allowClear
          >
            {books.map(book => (
              <Option 
                key={book.id} 
                value={book.id}
                data-testid={`book-option-${book.id}`}
              >
                {book.name}
              </Option>
            ))}
          </Select>

          <Button
            type="primary"
            onClick={() => {
            //   console.log('触发分析请求，账本ID:', selectedBookId);
              getSummary(selectedBookId);
            }}
            disabled={!selectedBookId}
            loading={summaryLoading}
            style={{ 
              minWidth: 120,
              height: 40,
              fontWeight: 500
            }}
          >
            {summaryLoading ? '分析中...' : '开始分析'}
          </Button>
        </div>

        {/* 加载状态 */}
        <Spin 
          spinning={summaryLoading} 
          tip={
            <div style={{ fontSize: 14 }}>
              <div>AI引擎正在深度分析</div>
              <div style={{ color: '#666', marginTop: 4 }}>预计需要5-10秒，请稍候...</div>
            </div>
          }
          size="large"
          style={{ 
            position: 'absolute', 
            top: '40%',         
            left: '50%',        
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* 结果展示容器 */}
          <div style={{ minHeight: 200 }}>
            {summaryResult && (
              <ProCard 
              title="AI财务分析报告" 
              bordered={false}
              style={{ 
                marginTop: 24,
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(34,41,47,0.06)',
                border: '1px solid #f0f3f5'
              }}
              headStyle={{ 
                fontSize: 16,
                borderBottom: '1px solid #3498db',
                fontWeight: 600,
                color: '#2c3e50',
                padding: '16px 24px'
              }}
            >
              <div style={{ 
                padding: 24,
                borderLeft: '3px solid #3498db', // 左侧装饰线
                background: '#f8fafc' // 统一浅灰底色
              }}>
                <pre style={{ 
                  margin: 0,
                  fontFamily: 'inherit', // 继承系统字体
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  fontSize: 14,
                  color: '#34495e',
                }}>
                  {summaryResult.split('\n').map((line, index) => (
                    <div 
                      key={index} 
                      style={{
                        padding: '6px 0',
                        position: 'relative',
                        marginLeft: 12
                      }}
                    >
                      {line.startsWith('三色预警结论') ? (
                        <span style={{ 
                          backgroundColor: line.includes('绿') ? '#e8f5e9' : 
                                         line.includes('黄') ? '#fff3e0' : '#ffebee',
                          padding: '4px 12px',
                          borderRadius: 4,
                          display: 'inline-block',
                          borderLeft: `3px solid ${
                            line.includes('绿') ? '#2ecc71' : 
                            line.includes('黄') ? '#f1c40f' : '#e74c3c'
                          }`
                        }}>
                          {line}
                        </span>
                      ) : line}
                    </div>
                  ))}
                </pre>
              </div>
              
              {/* 保留原有时间戳 */}
            </ProCard>
            )}

            {/* 无结果提示 */}
            {!summaryResult && !summaryLoading && (
              <div style={{ 
                marginTop: 24,
                padding: 48,
                textAlign: 'center',
                color: '#666',
                border: '1px dashed #e8e8e8',
                borderRadius: 8,
                backgroundColor: '#fff'
              }}>
                <div style={{ fontSize: 16, marginBottom: 8 }}>🔄 准备就绪</div>
                <div style={{ color: '#8c8c8c' }}>请选择账本后点击上方按钮生成分析报告</div>
              </div>
            )}
          </div>
        </Spin>
      </ProCard>
    </PageContainer>
    </div>
  );
};
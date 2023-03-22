import { Space } from 'antd';
import { useModel } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-components';
import { spaceVProp } from '@/utils/prop';
import FlowFilter from '../components/FlowFilter';
import Chart from './Chart';

export default () => {
  const { run } = useModel('reports.ExpenseTag.model');

  return (
    <PageContainer title={false}>
      <Space {...spaceVProp}>
        <FlowFilter type={1} cat={2} run={run} />
        <Chart />
      </Space>
    </PageContainer>
  );
};

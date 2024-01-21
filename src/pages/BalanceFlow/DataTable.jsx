import {useState} from 'react';
import { Alert, Button, Dropdown, Form, Input, Modal, Space, Tag, Tooltip } from 'antd';
import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import {useModel, useRequest} from '@umijs/max';
import moment from 'moment';
import { confirm, statistics } from '@/services/flow';
import { queryAll, query, remove } from '@/services/common';
import {selectMultipleProp, selectSingleProp, tableProp, treeSelectMultipleProp} from '@/utils/prop';
import {datePickerRanges, tableSortFormat} from '@/utils/util';
import ActionForm from './ActionForm';
import AdjustForm from '../Account/AdjustForm';
import TagForm from './TagForm';
import FileUploadModal from './FileUploadModal';
import t from '@/utils/i18n';

export default () => {

  const { initialState } = useModel('@@initialState');
  const { actionRef } = useModel('BalanceFlow.model');
  const { show } = useModel('modal');

  const [currentBook, setCurrentBook] = useState(initialState.currentBook);
  const [type, setType] = useState();

  const { data : accounts = [], loading : accountsLoading, run : loadAccounts} = useRequest(() => queryAll('accounts'), { manual: true });

  const { data : categories = [], loading : categoriesLoading, run : loadCategories} = useRequest(() => queryAll('categories', {
    'bookId': currentBook?.id,
    'type': type,
  }), { manual: true });

  const { data : tags = [], loading : tagsLoading, run : loadTags} = useRequest(() => queryAll('tags', {
    'bookId': currentBook?.id,
    'canExpense': type === 'EXPENSE' ? true : null,
    'canIncome': type === 'INCOME' ? true : null,
    'canTransfer': type === 'TRANSFER' ? true : null,
  }), { manual: true });

  const { data : payees = [], loading : payeesLoading, run : loadPayees} = useRequest(() => queryAll('payees', {
    'bookId': currentBook?.id,
    'canExpense': type === 'EXPENSE' ? true : null,
    'canIncome': type === 'INCOME' ? true : null,
  }), { manual: true });

  const { data : books = [], loading: booksLoading, run: loadBooks } = useRequest(() => queryAll('books'), { manual: true });

  const [statisticsData, setStatisticsData] = useState([0, 0, 0]);

  function successHandler() {
    actionRef.current?.reload();
  }

  const updateHandler = (record) => {
    if (record.type === 'ADJUST') {
      show(<AdjustForm actionRef={actionRef} />, 2, record);
    } else {
      show(<ActionForm />, 2, record);
    }
  };

  const confirmHandler = async (record) => {
    await confirm(record.id);
    successHandler();
  };

  const messageDeleteConfirm = t('delete.confirm');
  const messageDeleteConfirmBalance = t('delete.confirm.balance');
  const deleteHandler = (record) => {
    Modal.confirm({
      title: record.confirm ? messageDeleteConfirmBalance : messageDeleteConfirm,
      onOk: async () => {
        await remove('balance-flows', record.id);
        successHandler();
      },
    });
  };

  const moreOperationItems = (record) => {
    return [
      {
        label: t('update'),
        onClick: () => updateHandler(record)
      },
      {
        label: t('refund'),
        disabled: record.type === 'ADJUST',
        onClick: () => show(<ActionForm />, 4, record)
      },
      {
        label: t('confirm'),
        disabled: record.type === 'ADJUST' || record.confirm,
        onClick: () => confirmHandler(record)
      },
      {
        label: t('flow.operation.file'),
        onClick: () => show(<FileUploadModal flowId={record.id} />)
      },
      {
        label: t('delete'),
        onClick: () => deleteHandler(record)
      },
    ]
  };

  const columns = [
    {
      title: t('flow.label.book'),
      dataIndex: 'book',
      sorter: true,
      render: (_, record) => record.book.name,
      hideInTable: false,
      valueType: 'select',
      initialValue: initialState.currentBook,
      search: { transform: value => ({ book: value.value }) },
      fieldProps: {
        ...selectSingleProp,
        onFocus: loadBooks,
        options: books,
        loading: booksLoading,
        onChange: (_, option) => setCurrentBook(option),
      },
    },
    {
      title: t('flow.label.title'),
      dataIndex: 'title',
      sorter: true,
    },
    {
      title: t('flow.label.type'),
      dataIndex: 'type',
      render: (_, record) => record.typeName,
      sorter: true,
      align: 'center',
      valueType: 'select',
      fieldProps: {
        options: [
          { label: t('expense'), value: 'EXPENSE' },
          { label: t('income'), value: 'INCOME' },
          { label: t('transfer'), value: 'TRANSFER' },
          { label: t('adjust.balance'), value: 'ADJUST' },
        ],
        onChange: value => setType(value),
      },
    },
    {
      title: t('flow.label.amount'),
      dataIndex: 'amount',
      sorter: true,
      search: { transform: (_) => null },
      renderFormItem: () => {
        return (
          <Space>
            <span>
              <Form.Item name="minAmount" noStyle={true}>
                <Input style={{ width: '43%' }} />
              </Form.Item>
              <span> — </span>
              <Form.Item name="maxAmount" noStyle={true}>
                <Input style={{ width: '43%' }} />
              </Form.Item>
            </span>
          </Space>
        );
      },
    },
    {
      title: t('flow.label.createTime'),
      dataIndex: 'createTime',
      sorter: true,
      align: 'center',
      render: (_, record) => moment(record.createTime).format('YYYY-MM-DD HH:mm'),
      valueType: 'dateRange',
      search: {
        transform: (value) => ({
          minTime: moment(value[0]).startOf('day').valueOf(),
          maxTime: moment(value[1]).endOf('day').valueOf(),
        }),
      },
      fieldProps: {
        allowEmpty: [true, true],
        ranges: datePickerRanges(),
      },
    },
    {
      title: t('flow.label.account'),
      dataIndex: 'account',
      sorter: true,
      render: (_, record) => record.accountName,
      valueType: 'select',
      fieldProps: {
        ...selectSingleProp,
        options: accounts,
        loading: accountsLoading,
        onFocus: loadAccounts,
        labelInValue: false,
      },
    },
    {
      title: t('flow.label.category'),
      dataIndex: 'categories',
      render: (_, record) => record.categoryName,
      valueType: 'treeSelect',
      search: { transform: e => ({categories : e.map(e2 => e2.value) }) },
      fieldProps: {
        ...treeSelectMultipleProp,
        onFocus: loadCategories,
        options: categories,
        loading: categoriesLoading,
      },
    },
    {
      title: t('flow.label.tag'),
      dataIndex: 'tags',
      render: (_, record) => tagColumnRender(record),
      valueType: 'treeSelect',
      search: { transform: e => ({tags : e.map(e2 => e2.value) }) },
      fieldProps: {
        onFocus: loadTags,
        ...treeSelectMultipleProp,
        options: tags,
        loading: tagsLoading,
      },
    },
    {
      title: t('flow.label.payee'),
      dataIndex: 'payee',
      sorter: true,
      render: (_, record) => record.payee?.name,
      valueType: 'select',
      search: { transform: value => ({ payees: value }) },
      fieldProps: {
        ...selectMultipleProp,
        options: payees,
        loading: payeesLoading,
        onFocus: loadPayees,
        labelInValue: false,
      },
    },
    {
      title: t('flow.label.confirm'),
      dataIndex: 'confirm',
      sorter: true,
      align: 'center',
      valueType: 'select',
      valueEnum: {
        true: { text: t('yes'), status: 'Success' },
        false: { text: t('no'), status: 'Error' },
      },
    },
    {
      title: t('flow.label.include'),
      dataIndex: 'include',
      sorter: true,
      align: 'center',
      valueType: 'select',
      valueEnum: {
        true: { text: t('yes'), status: 'Success' },
        false: { text: t('no'), status: 'Error' },
      },
    },
    {
      title: t('label.notes'),
      dataIndex: 'notes',
      hideInTable: true,
    },
    {
      title: t('operation'),
      align: 'center',
      width: 160,
      hideInSearch: true,
      render: (_, record) => [
        <Button type="link" disabled={record.type === 'ADJUST'} onClick={() => show(<ActionForm />, 3, record)}>
          {t('copy')}
        </Button>,
        <Dropdown
          menu={{
            items: moreOperationItems(record),
          }}
        >
          <Button type="text">
            {t('more')} <DownOutlined />
          </Button>
        </Dropdown>,
      ],
    },
  ];

  function tagColumnRender(record) {
    function tagRender(relation) {
      if (record.type === 'EXPENSE' || record.type === 'INCOME') {
        return (
          <Tooltip title={`${t('flow.label.amount')}: ${relation.amount}, ${t('click.edit')}`}>
            <Tag
              onClick={() => show(<TagForm flow={record} />, 2, relation)}
              style={{ cursor: 'pointer' }}
              color="blue"
            >
              {relation.tag.name}
            </Tag>
          </Tooltip>
        );
      } else {
        return <Tag color="blue">{relation.tag.name}</Tag>;
      }
    }
    return record.tags.map((i) => tagRender(i));
  }

  function expandedRowRender(record) {
    let notesItem = null;
    if (record.notes) {
      notesItem = (
        <span>
          {t('label.notes')}: {record.notes}
        </span>
      );
    }
    let currencyItem = null;
    if (record.needConvert) {
      currencyItem = (
        <span>
          {t('convertCurrency') + record.convertCode}: {record.convertedAmount}
        </span>
      );
    }
    if (notesItem || currencyItem) {
      return (
        <>
          {currencyItem}
          <span>&nbsp;&nbsp;</span>
          {notesItem}
        </>
      );
    } else {
      return null;
    }
  }

  function extraRender() {
    const total1 = `${t('flow.total.expense')}: ${statisticsData[0]}`;
    const total2 = `${t('flow.total.income')}: ${statisticsData[1]}`;
    const total3 = `${t('flow.total.surplus')}: ${statisticsData[2]}`;
    const message = (
      <span>
        {total1}&nbsp;&nbsp;&nbsp;&nbsp;{total2}&nbsp;&nbsp;&nbsp;&nbsp;{total3}
      </span>
    );
    return <Alert type="info" showIcon message={message} />;
  }

  return (
    <>
      <ProTable
        {...tableProp}
        defaultSize="small"
        actionRef={actionRef}
        tableExtraRender={extraRender}
        toolBarRender={() => [
          <Button type="primary" onClick={() => show(<ActionForm />)}>
            <PlusOutlined />
            {t('add')}
          </Button>,
        ]}
        columns={columns}
        expandable={{
          expandedRowRender: (record) => expandedRowRender(record),
          rowExpandable: (record) => expandedRowRender(record),
        }}
        request={(params = {}, sort, _) => {
          statistics(params).then((res) => {
            setStatisticsData(res.data);
          });
          return query('balance-flows', {
            ...params,
            ...{ sort: tableSortFormat(sort) }
          });
        }}
      />
    </>
  );
};

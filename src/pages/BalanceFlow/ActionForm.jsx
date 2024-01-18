import {useEffect, useState, useMemo, useRef} from 'react';
import {Col, Form, Row, Space, Tabs} from 'antd';
import {MinusCircleOutlined, PlusCircleOutlined} from '@ant-design/icons';
import {
  ProFormDateTimePicker,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { useModel, useRequest } from '@umijs/max';
import moment from 'moment';
import { translateAction, translateFlowType } from '@/utils/util';
import { queryAll, create, update } from '@/services/common';
import { treeSelectSingleProp, treeSelectMultipleProp, selectSingleProp } from '@/utils/prop';
import { requiredRules } from '@/utils/rules';
import MyModalForm from '@/components/MyModalForm';
import PayeeInput from "./PayeeInput";
import AddTagModal from './AddTagModal';
import AddPayeeModal from './AddPayeeModal';
import t from '@/utils/i18n';

export default ({ initType = 'EXPENSE' }) => {

  const { actionRef } = useModel('BalanceFlow.model');
  const formRef = useRef();
  const { initialState } = useModel('@@initialState');
  const { action, currentRow, visible } = useModel('modal');
  const [tabKey, setTabKey] = useState(initType);
  const [currentBook, setCurrentBook] = useState(initialState.currentBook);
  // 确保每次新增都是默认账单，修复先点击复制，之后再新增，遗留之前的数据。
  useEffect(() => {
    if (!visible) return;
    if (action === 1) {
      setCurrentBook(initialState.currentBook);
      setTabKey(initType);
    } else {
      setCurrentBook(currentRow.book);
      setTabKey(currentRow.type);
    }
  }, [action, currentRow, initType, visible]);

  // 默认的支出账户不可能是禁用的。
  const { data : accounts = [], loading : accountsLoading, run : loadAccounts} = useRequest(() => queryAll('accounts', {
    'canExpense': tabKey === 'EXPENSE' ? true : null,
    'canIncome': tabKey === 'INCOME' ? true : null,
    'canTransferFrom': tabKey === 'TRANSFER' ? true : null,
  }), { manual: true });

  const { data : toAccounts = [], loading : toAccountsLoading, run : loadToAccounts} = useRequest(() => queryAll('accounts', {
    'canTransferTo': tabKey === 'TRANSFER' ? true : null,
  }), { manual: true });

  const { data : categories = [], loading : categoriesLoading, run : loadCategories} = useRequest(() => queryAll('categories', {
    'bookId': currentBook.id,
    'type': tabKey,
  }), { manual: true });

  const { data : tags = [], loading : tagsLoading, run : loadTags} = useRequest(() => queryAll('tags', {
    'bookId': currentBook.id,
    'canExpense': tabKey === 'EXPENSE' ? true : null,
    'canIncome': tabKey === 'INCOME' ? true : null,
    'canTransfer': tabKey === 'TRANSFER' ? true : null,
  }), { manual: true });

  const { data : books = [], loading: booksLoading, run: loadBooks } = useRequest(() => queryAll('books'), { manual: true });

  const [account, setAccount] = useState();
  const [toAccount, setToAccount] = useState();
  const [confirm, setConfirm] = useState(true);
  const [initialValues, setInitialValues] = useState({});
  useEffect(() => {
    if (!visible) return;
    if (action === 1) {
      // if (!currentBook) return;
      let initAccount;
      let initToAccount;
      let categories = [{}];
      if (tabKey === 'EXPENSE') {
        initAccount = currentBook.defaultExpenseAccount;
        setAccount(currentBook.defaultExpenseAccount);
        if (currentBook.defaultExpenseCategory) {
          categories = [{category: currentBook.defaultExpenseCategory}];
        }
      } else if (tabKey === 'INCOME') {
        initAccount = currentBook.defaultIncomeAccount;
        setAccount(currentBook.defaultIncomeAccount);
        if (currentBook.defaultIncomeCategory) {
          categories = [{ category: currentBook.defaultIncomeCategory }];
        }
      } else if (tabKey === 'TRANSFER') {
        initAccount = currentBook.defaultTransferFromAccount;
        initToAccount = currentBook.defaultTransferToAccount;
        setAccount(currentBook.defaultTransferFromAccount);
        setToAccount(currentBook.defaultTransferToAccount);
      }
      setConfirm(true);
      setInitialValues({
        book: currentBook,
        createTime: moment(),
        account: initAccount, //account 和 to是受控组件。
        categories: categories,
        confirm: true,
        include: true,
        updateBalance: true,
        to: initToAccount,
      });
    } else {
      setAccount(currentRow.account);
      setToAccount(currentRow.to);
      setConfirm(currentRow.confirm);
      // 一定要深度复制
      let initialValues = JSON.parse(JSON.stringify(currentRow));
      initialValues.tags = initialValues.tags?.map((item) => item.tag);
      if (action !== 2) {
        initialValues.notes = null;
        initialValues.createTime = moment();
        initialValues.confirm = true;
        initialValues.include = true;
        setConfirm(true);
      }
      if (action === 4) {
        if (initialValues.type === 'EXPENSE' || initialValues.type === 'INCOME') {
          if (initialValues.categories) {
            initialValues.categories.forEach((element) => {
              element.amount = element.amount * -1;
              element.convertedAmount = element.convertedAmount * -1;
            });
          }
        } else { //转账
          initialValues.amount = initialValues.amount * -1;
          initialValues.convertedAmount = initialValues.convertedAmount * -1;
        }
      }
      initialValues.updateBalance = true;
      setInitialValues(initialValues);
    }
  }, [action, tabKey, currentRow, currentBook, visible]);

  const currencyConvert = useMemo(() => {
    if (!account) {
      return { 'needConvert': false };
    }
    if (tabKey === 'EXPENSE' || tabKey === 'INCOME') {
      return {
        'needConvert': account.currencyCode !== currentBook.defaultCurrencyCode,
        'convertCode': currentBook.defaultCurrencyCode
      }
    } else if (tabKey === 'TRANSFER') {
      if (!toAccount) {
        return { 'needConvert': false };
      }
      return {
        'needConvert': account.currencyCode !== toAccount?.currencyCode,
        'convertCode': toAccount.currencyCode
      }
    }
  }, [tabKey, account?.currencyCode, toAccount?.currencyCode, currentBook.defaultCurrencyCode]);

  const successHandler = () => {
    actionRef.current?.reload();
  };

  const requestHandler = async (values) => {
    let form = JSON.parse(JSON.stringify(values));
    // values.tags里面的数据带了label labelInValue
    if (form.tags) {
      form.tags = form.tags.map((i) => i?.value || i);
    }
    form.bookId = form.book.value;
    delete form.book;
    form.accountId = form.account?.value;
    delete form.account;
    form.payeeId = form.payee?.value;
    delete form.payee;
    form.toId = form.to?.value;
    delete form.to;
    if (form.categories) {
      form.categories = form.categories.map((e) => ({
        ...e,
        'categoryId': e.category.value,
      }));
      form.categories.forEach(e => delete e.category);
    }
    if (action !== 2) {
      await create('balance-flows', form);
    } else {
      await update('balance-flows', currentRow.id, form);
    }
  };

  const items = [
    {
      key: 'EXPENSE',
      label: t('add') + t('expense'),
    },
    {
      key: 'INCOME',
      label: t('add') + t('income'),
    },
    {
      key: 'TRANSFER',
      label: t('add') + t('transfer'),
    },
  ];

  const title = () => {
    if (action === 1) {
      return <Tabs activeKey={tabKey} items={items} onChange={(value) => setTabKey(value)} />;
    } else {
      return translateAction(action) + translateFlowType(currentRow.type);
    }
  };

  const categoryLabelMsg = t('flow.label.category');
  const amountLabelMsg = t('flow.label.amount');
  const convertCurrencyMsg = t('convertCurrency');
  const placeholderRefundMsg = t('placeholder.negative.refund');
  return (
    <>
      <MyModalForm
        width={720}
        title={title()}
        labelWidth={80}
        params={{ type: tabKey }}
        request={requestHandler}
        onSuccess={successHandler}
        initialValues={initialValues}
        formRef={formRef}
      >
        <ProFormSelect
          name="book"
          label={t('flow.label.book')}
          rules={requiredRules()}
          onChange={ (_, option) => setCurrentBook(option) }
          disabled={action !== 1}
          fieldProps={{
            ...selectSingleProp,
            onFocus: loadBooks,
            options: books,
            loading: booksLoading,
            allowClear: false,
          }}
        />
        <ProFormText name="title" label={t('flow.label.title')} />
        <ProFormDateTimePicker
          name="createTime"
          format="YYYY-MM-DD HH:mm"
          label={t('flow.label.createTime')}
          allowClear={false}
          rules={requiredRules()}
        />
        <ProFormSelect
          name="account"
          label={ tabKey !== 'TRANSFER' ? t('flow.label.account') : t('flow.label.transfer.from.account') }
          rules={ tabKey === 'TRANSFER' ? requiredRules() : null }
          onChange={ (_, option) => setAccount(option) }
          fieldProps={{
            ...selectSingleProp,
            onFocus: loadAccounts,
            options: accounts,
            loading: accountsLoading,
          }}
        />
        {tabKey === 'TRANSFER' && (
          <>
            <ProFormSelect
              name="to"
              label={t('flow.label.transfer.to.account')}
              rules={requiredRules()}
              onChange={ (_, option) => setToAccount(option) }
              fieldProps={{
                ...selectSingleProp,
                onFocus: loadToAccounts,
                options: toAccounts,
                loading: toAccountsLoading,
                allowClear: false,
              }}
            />
            <ProFormText name="amount" label={t('flow.label.amount')} rules={requiredRules()} />
            {currencyConvert.needConvert && (
              <ProFormText
                name="convertedAmount"
                label={convertCurrencyMsg + currencyConvert.convertCode}
                rules={requiredRules()}
              />
            )}
          </>
        )}
        {tabKey !== 'TRANSFER' && (
          <Col span={24}>
            <Form.List name="categories">
              {(fields, { add, remove }) =>
                fields.map((field) => (
                  <Row key={field.key} gutter={8} style={{ alignItems: 'baseline' }}>
                    <Col flex="auto">
                      <ProFormTreeSelect
                        name={[field.name, 'category']}
                        label={categoryLabelMsg}
                        rules={requiredRules()}
                        fieldProps={{
                          ...treeSelectSingleProp,
                          onFocus: loadCategories,
                          loading: categoriesLoading,
                          options: categories,
                        }}
                      />
                    </Col>
                    <Col flex="210px">
                      <ProFormText
                        name={[field.name, 'amount']}
                        label={amountLabelMsg}
                        rules={requiredRules()}
                        labelCol={{ span: 7 }}
                        placeholder={placeholderRefundMsg}
                      />
                    </Col>
                    {currencyConvert.needConvert && (
                      <Col flex="210px">
                        <ProFormText
                          name={[field.name, 'convertedAmount']}
                          label={convertCurrencyMsg + currencyConvert.convertCode}
                          rules={requiredRules()}
                          labelCol={{ span: 10 }}
                        />
                      </Col>
                    )}
                    <Col flex="25px">
                      <Space>
                        <PlusCircleOutlined onClick={() => add()} />
                        {fields.length > 1 ? (
                          <MinusCircleOutlined onClick={() => remove(field.name)} />
                        ) : null}
                      </Space>
                    </Col>
                  </Row>
                ))
              }
            </Form.List>
          </Col>
        )}
        {tabKey !== 'TRANSFER' && (
          <Col span={24}>
            <Row>
              <Col flex="auto">
                <PayeeInput currentBook={currentBook} tabKey={tabKey} formRef={formRef} />
              </Col>
              <Col flex="50px">
                <AddPayeeModal book={currentBook} type={tabKey} />
              </Col>
            </Row>
          </Col>
        )}
        <Col span={24}>
          <Row>
            <Col flex="auto">
              <ProFormTreeSelect
                name="tags"
                label={t('flow.label.tag')}
                fieldProps={{
                  ...treeSelectMultipleProp,
                  onFocus: loadTags,
                  loading: tagsLoading,
                  options: tags,
                }}
              />
            </Col>
            <Col flex="50px">
              <AddTagModal book={currentBook} type={tabKey} />
            </Col>
          </Row>
        </Col>
        <ProFormSwitch
          disabled={action === 2}
          name="confirm"
          label={t('flow.label.confirm')}
          colProps={{ xl: 6 }}
          fieldProps={{
            onChange: checked => setConfirm(checked)
          }}
        />
        <ProFormSwitch name="include" label={t('flow.label.include')} colProps={{ xl: 6 }} />
        <ProFormTextArea name="notes" label={t('label.notes')} />
      </MyModalForm>
    </>
  );
};

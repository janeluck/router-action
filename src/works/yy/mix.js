import Immutable from 'immutable';
import { genAction, proxy } from 'yxyweb/common/helpers/util';
import { setReceiptHang } from './menu';
import Status from './billingStatus';
import _ from 'lodash';
import uuid from 'uuid';
import { getBillingHeader } from './uretailHeader';
import { loadDefines, showHeaderInfo, getDefaultBusinessType, checkIsOwned, allEmloyeeIsSame } from './reserve';
import {
  handleBackBill,
  handlePresellBack,
  handleServerData,
  handleOnlineBill,
  transferProducts,
  transferProducts2Flatten,
  loadColumns,
  loadDetailColumns,
  setFocusedRow
} from './product';
import { getStoreWareHouse, loadEditColumns, checkVoucherDetail } from './editRow';
import { queryMemberById, setMemberBoxFocus } from './member';
import { print } from './receiptPrinter';
import { setSearchBoxFocus } from './goodsRefer';
import { deletePendingOrder } from './cancelPending';
import { showModal } from './actions';
import { getAuthData } from './config';
import { showOperator } from './operator';
import { defaultSettle, getFixedNumber } from './paymode';
import { getFromMapOrObject } from './electronicBalance';
import { cancelDiscount } from './discount';
import { cancelExecute, checkButtonAuth } from './actions';
import { initBadge } from './eCommerce';
import { canOpen as canPromotionOpen, getPromotionData } from './ExecutPromotion'
import { localProxy } from './offLine'
import { IDB_deleteOneData } from './indexedDB'

export const RetailVouchBillNo = 'rm_retailvouch';
export const GatheringVouchBillNo = 'rm_gatheringvouch';
export const MallOrderBillNo = 'rm_mallorderref';
export const mallOrderBackBillNo = 'rm_mallsalereturnref';

let options = null;
let functionOptioins = null;
const initialState = {
  billNo: 'rm_retailreceipt',
  statusField: '_status',
  meta: null,
  data: null
};

const DataStates = {
  Insert: 'Insert',
  Update: 'Update',
  Delete: 'Delete',
  Unchanged: 'Unchanged'
};

const PreferentialExecuteMap = {
  Real: { order: 0 },
  Member: { order: 0, text: '会员优惠', forbiddenTip: '不能执行会员优惠' },
  Quote: { order: 0, text: '改零售价', forbiddenTip: '不能改零售价' },
  Promotion: { order: 1, text: '促销优惠', forbiddenTip: '不能执行促销活动' },
  Scene: { order: 2, text: '现场折扣', forbiddenTip: '不能执行现场折扣' },
  Point: { order: 3, text: '积分抵扣', forbiddenTip: '不能执行积分抵扣' },
  Coupon: { order: 4, text: '优惠券', forbiddenTip: '不允许使用优惠券' },
  Zero: { order: 5, text: '抹零', forbiddenTip: '不能抹零' },
  EditRow: { order: 6, text: '改行', forbiddenTip: '不能改行' },
  Quantity: { order: 7, text: '改数量', forbiddenTip: '不能改数量' }
};
let iWarehouseid = null, iWarehouseid_name = null;
/*门店默认仓库*/
const promotionMutexMap = {
  iMemberDiscountEnable: false, /*与会员折扣互斥*/
  iIntegral: false, /*与积分抵扣互斥*/
  iCoupon: false, /*与优惠券互斥*/
  isAllCoupon: false, /*与全部优惠券互斥*/
  linecouponitem: [], /*互斥的优惠券列表*/
  iSpotDiscountEnable: false, /*与现场折扣互斥*/
  iOrderDiscountEnable: false, /*与整单折扣互斥*/
};
const PreferentialExecuteBackup = [];
let backBillInfo = null;
let presellBillInfo = null;
let mallorder = false;
let checkStockBackData = null;

let firstOpenPromotion = true; // 第一次打开促销面板

const $$initialState = Immutable.fromJS({})

// reducer
export default ($$state = $$initialState, action) => {
  switch (action.type) {
    case 'PLATFORM_UI_BILLING_INIT':
      initialState.meta = action.payload.meta;
      initialState.data = action.payload.data;
      console.log('action.payload.data >>>>>>>', action.payload.data);
      return $$state;
    case 'PLATFORM_UI_BILLING_EXECUTE_PREFERENTIAL_UPDATE_PRODUCTS':
      const { key, backup } = action.payload;
      const preferential = PreferentialExecuteBackup.find(item => {
        return item.key === key;
      });
      if (!preferential) {
        PreferentialExecuteBackup.push({ key, value: backup });
      } else {
        preferential.value = backup;
      }
      return $$state;
    case 'PLATFORM_UI_BILLING_CANCEL_PREFERENTIAL_UPDATE_PRODUCTS':
      PreferentialExecuteBackup.splice(PreferentialExecuteBackup.length - 1, 1);
      return $$state;
    case 'PLATFORM_UI_BILLING_CLEAR':
      PreferentialExecuteBackup.length = 0;
      backBillInfo = null;
      presellBillInfo = null;
      mallorder = false;
      firstOpenPromotion = true;
      return $$state;
    default:
      return $$state;
  }
}

const getRetailVouchData = (params, isSave) => {
  const { header, money, products, coupons } = params;
  const retailVouchMeta = initialState[`${RetailVouchBillNo}Meta`];
  const retailVouchEmpty = initialState[`${RetailVouchBillNo}Empty`];
  delete header.cGUID
  const retailVouchData = Object.assign({}, retailVouchEmpty, header);
  for (let attr in money) {
    const { field, value } = money[attr];
    if (field == null) continue;
    const decimal = attr === 'TotalQuantity' ? options.numPoint_Quantity : options.amountofdecimal;
    if(isSave)
      retailVouchData[field] = (parseFloat(value).toFixed(decimal.value));
    else
      retailVouchData[field] = parseFloat(parseFloat(value).toFixed(decimal.value));
  }
  const productsChildrenField = retailVouchMeta.childrenField0;
  const billProducts = [];
  retailVouchData[productsChildrenField] = billProducts;
  retailVouchData[initialState.statusField] = DataStates.Insert;
  const productsMeta = retailVouchMeta[productsChildrenField];
  products.forEach((item, index) => {
    const formatObj = {};
    // for (let attr in money) {
    //   const { childField } = money[attr];
    //   if (childField == null || !item[childField]) continue;
    //   const decimal = attr === 'TotalQuantity' ? options.numPoint_Quantity : options.amountofdecimal;
    //   formatObj[childField] = parseFloat(item[childField].toFixed(decimal.value));
    // }
    for (let attr in productsMeta) {
      if (!item[attr]) continue;
      const productMetaItem = productsMeta[attr];
      const lowerCtrlType = productMetaItem.cControlType && productMetaItem.cControlType.trim().toLocaleLowerCase();
      let decimal;
      if (lowerCtrlType === 'money') {
        decimal = options.amountofdecimal;
      } else if (lowerCtrlType === 'price') {
        decimal = options.monovalentdecimal;
      } else if (attr === 'fQuantity') {
        decimal = options.numPoint_Quantity;
      }
      if (!decimal) continue;
      try {
        if(isSave)
          formatObj[attr] = (parseFloat(item[attr]).toFixed(decimal.value));
        else
          formatObj[attr] = parseFloat(parseFloat(item[attr]).toFixed(decimal.value));
      } catch (e) {

      }
    }
    const product = isSave ? Object.assign({}, item, formatObj, { iOrder: index }) :Object.assign({}, item, { iOrder: index });
    if (!product.iWarehouseid) {
      product.iWarehouseid = iWarehouseid;
      product.iWarehouseid_name = iWarehouseid_name;
    }
    product[initialState.statusField] = DataStates.Insert;
    billProducts.push(product);
  });
  if (coupons)
    retailVouchData[retailVouchMeta.childrenField1] = coupons;
  return retailVouchData;
};

const getGatheringVouchData = (params) => {

  // 实收
  let receive = 0
  const {header, money, paymodes, originPaymodes} = params;
  const gatheringVouchMeta = initialState[`${GatheringVouchBillNo}Meta`];
  const gatheringVouchEmpty = initialState[`${GatheringVouchBillNo}Empty`];
  const gatheringVouchData = Object.assign({}, gatheringVouchEmpty, header);
  const {field, value} = money.Gathering;
  gatheringVouchData[field] = value;
  let finalPaymodes = []

  gatheringVouchData[initialState.statusField] = DataStates.Insert;


  //


  // 电商退单时组装数据: 支付方式为现金
  if (header.billingStatus === 'OnlineBackBill') {
    gatheringVouchData[gatheringVouchMeta.childrenField0] = [{
      [initialState.statusField]: DataStates.Insert,
      iPaymentid: '123',  // 为了后台校验通过，写死id  ^-.-^
      iPaytype: 1,
      fMoney: value,
    }]
  } else {
    let change = 0;
    // 如果整单金额为0， 重写数据为只使用最后一条支付方式
    // 或者预订状态可最低支付为0并且实际支付总额为0，  重写数据为只使用最后一条支付方式

    if (Number(value) === 0 ||
      (header.billingStatus === 'PresellBill' && header.MinPercentGiveMoneyPre == 0 && _.reduce(paymodes, (a, b) => {
        return Number(a) + Number(b.value || 0)
      }, 0) == 0)
    ) {
      const lastPay = _.last(_.sortBy(_.filter(paymodes, 'show'), p => {
        // 原单支付方式放在前面
        // 其他按照页面支付顺序排列
        return typeof p.order !== 'undefined' ? p.order : -1
      }))
      finalPaymodes.push({
        [initialState.statusField]: DataStates.Insert,
        iPaymentid: lastPay.paymethodId,
        iPaytype: lastPay.paymentType,
        fMoney: 0,
        iPaymentid_name: lastPay.name
      })


    } else {
      _.forEach(paymodes, (item) => {
        // 如果整单金额不为0， 过滤掉为0的支付方式
        if (!item.show || Number(item.value) === 0) return;

        const paymodeBaseInfo = _.extend({
          [initialState.statusField]: DataStates.Insert,
          iPaymentid: item.paymethodId,
          iPaytype: item.paymentType,
          fMoney: item.value,
          iPaymentid_name: item.name
        }, _.pick(item,
          ['authCode',//支付宝, 微信, 储值卡
            //  'pwd', // 储值卡
            'backUrl', // 储值卡回调参数
            'gatheringvouchPaydetail', // 畅捷支付
            'order'
          ]
        ))

        if (item.originalSamePaymodes) {
          // 存在原单支付信息时，拆出除了现金的所有原始支付方式
          _.forEach(item.originalSamePaymodes, op => {
            const { fMoney, ...others } = op
            finalPaymodes.push({
              [initialState.statusField]: DataStates.Insert,
              fMoney: 0 - fMoney,
              ...others
            })

            receive += Number(fMoney)
          })
        } else {
          finalPaymodes.push(paymodeBaseInfo)
          receive += paymodeBaseInfo.fMoney
        }


        // 如果有现金支付 增加一条找零数据
        if (item.change && parseFloat(item.change) > 0) {
          change += item.change;
          finalPaymodes.push(_.extend({}, paymodeBaseInfo, {
            fMoney: 0 - item.change,
            bIsChange: true
          }));


        }
      })
    }


    // 处理排序
    const sortedPaymodes = _.map(_.sortBy(finalPaymodes, p => {
      // 找零放在最后
      if (p.bIsChange) return Infinity
      // 原单支付方式放在前面
      // 其他按照页面支付顺序排列
      return typeof p.order !== 'undefined' ? p.order : -1
    }), (item, i) => {
      item.iOrder = i
      return item
    })

    gatheringVouchData[gatheringVouchMeta.childrenField0] = sortedPaymodes
    gatheringVouchData.fChangeMoney = change;

    // 赊销标识

    gatheringVouchData.iOwesState = 0

    // 预订单, 退订单不存在赊销标识
    if (_.get(header, 'infoData.iOwesState') == 1 && header.billingStatus !== 'PresellBill' || header.billingStatus !== 'PresellBack') {
      gatheringVouchData.iOwesState = Math.abs(receive) < Math.abs(value) ? 1 : 0
    }
  }


  return gatheringVouchData;
};

let isSaving = false;

export function save(callback, errorCallback) {
  return function (dispatch, getState) {
    if (isSaving) return;
    isSaving = true;
    const params = buildParams(getState());
    const data = {};
    data[RetailVouchBillNo] = getRetailVouchData(params, true);
    data[GatheringVouchBillNo] = getGatheringVouchData(params);
    const retailVouchMeta = initialState[`${RetailVouchBillNo}Meta`];
    const gatheringVouchMeta = initialState[`${GatheringVouchBillNo}Meta`];


    //todo 赊销
    data[RetailVouchBillNo].fChangeMoney = data[GatheringVouchBillNo].fChangeMoney;


    data[RetailVouchBillNo][retailVouchMeta.childrenField2] = data[GatheringVouchBillNo][gatheringVouchMeta.childrenField0];
    if (backBillInfo)
      data.backinfo = backBillInfo;
    if (presellBillInfo)
      data.presellinfo = presellBillInfo;
    if (mallorder === true)
      data.mallorder = true;
    const isTouch = cb.rest.interMode === 'touch' ? true : false;
    let networkConnect = getState().offLine.get('lineConnection');
    const config = {
      url: 'bill/save',
      method: 'POST',
      params: { billnum: initialState.billNo, data: JSON.stringify(data) },
      options: { async: isTouch, networkConnect, timeout: 6000 },
    }
    const proxy = cb.rest.DynamicProxy.create({
      saveBill: {
        url: 'bill/save',
        method: 'POST',
        options: { async: isTouch }
      }
    });
    const inputParams = { billnum: initialState.billNo, data: JSON.stringify(data) }
    if (isTouch) {
      let resultObj = {}
      localProxy(config).then(json=>{
        if(json.code !== 200)
          resultObj = {error: {message: json.message}}
        else
          resultObj = {result: json.data}
        dispatch(_save(resultObj, callback, errorCallback, params.header.bHang, isTouch));
      })
    } else {
      dispatch(_save(proxy.saveBill(inputParams), callback, errorCallback, params.header.bHang, isTouch));
    }
  }
}

const _save = function (saveResult, callback, errorCallback, bHang, isTouch) {
  return function (dispatch, getState) {
    try {
      let billingStatus = getState().uretailHeader.toJS().billingStatus;
      if (saveResult.error) {
        errorCallback(saveResult.error.message);
        isSaving = false;
        return;
      }
      try {
        localStorage.setItem('billing_lastStatus', mallorder ? billingStatus : 'CashSale');
        localStorage.setItem('billing_lastBillId', mallorder ? saveResult.result.id : JSON.parse(saveResult.result)[RetailVouchBillNo][0].id);
      } catch (e) {
        console.error('_save exception: ' + e.message);
      }
      const canPrint = getState().config.toJS().canPrint;
      if (canPrint)
        dispatch(print(isTouch && !mallorder && saveResult.result));
      if (bHang)
        dispatch(deletePendingOrder());
      /* 电商徽标 */
      billingStatus === 'OnlineBill' && dispatch(initBadge())
      dispatch(clear(false));
      callback();
      isSaving = false;
    } catch (e) {
      console.error('mix _save error: ' + e.message);
      isSaving = false;
    }
  }
}

export function rebootSave(dbData, callback, errorCallback){
  return new Promise(async(resolve, reject) => {
    if(!dbData.length){
      reject({message: 'db暂无数据'})
      return
    }
    for(let i = 0; i<dbData.length; i++){
      let currentData = dbData[i];
      let config = {
        url: 'bill/save',
        method: 'POST',
        params: { billnum: currentData.billnum, data: currentData.data }
      }
      let isContinue = ''
      try{
        isContinue = await rebootSave_per(currentData, config);
      }catch(e){
        cb.utils.alert('rebootSave_per保存服务错误！', 'error')
      }
      if(isContinue === 'break'){
        cb.utils.alert(`第${i+1}条数据bootSave保存时报错！`, 'error')
        reject(`第${i+1}条数据bootSave保存时报错！`)
        return
        // break
      }
    }
    resolve(true)
  })
}

const rebootSave_per = (currentData, config) => {
  return new Promise(resolve => {
    proxy(config).then(json=>{
      if(json.code === 200){
        IDB_deleteOneData(currentData.indexedDB_id).then(result=>{
          result == '删除成功' && resolve('continue')
          result == '删除失败' && resolve('break')
        }).catch(e=> cb.utils.alert('IDB_deleteOneData删除数据出错！', 'error'))
      } else
        resolve('break')
    })
  })
}

const getEmpty = (billNo, cGUID, networkConnect) => {
  const config = {
    url: 'bill/add',
    method: 'POST',
    params: {
      billnum: billNo
    },
    options: { timeout: 3000, networkConnect }
  };
  localProxy(config)
    .then(function (json) {
      if (json.code !== 200) return;
      delete json.data.vouchdate;
      json.data.cGUID = cGUID;
      json.data.ioffline = 0; //0:在线 1:离线
      json.data.cMachineid = cb.electron.getSharedObject('macAddress');
      initialState[`${billNo}Empty`] = json.data;
    });
};

export function getOriginRetailHeader(){
  return { rm_retailvouchEmpty: initialState.rm_retailvouchEmpty, rm_gatheringvouchEmpty: initialState.rm_gatheringvouchEmpty }
}

export function empty() {
  return function (dispatch, getState) {
    let lineConnection = getState().offLine.get('lineConnection')
    getEmpty(RetailVouchBillNo, uuid(), lineConnection);
    getEmpty(GatheringVouchBillNo, uuid(), lineConnection);
    const defaultFocus = options.newbilldefcursor && options.newbilldefcursor.value;
    if (defaultFocus == 1)
      return dispatch(setMemberBoxFocus(true));
    if (defaultFocus == 2)
      return dispatch(setSearchBoxFocus(true));
  }
}

export function clear(confirm) {
  return function (dispatch, getState) {
    if (confirm === false) {
      _clear(dispatch);
    } else {
      cb.utils.confirm('确定整单清除吗?', function () {
        let lineConnection = getState().offLine.get('lineConnection');
        if(cb.rest.interMode === 'touch' && lineConnection === 0){
          console.log('新开单 连网中=>连网')
          dispatch(genAction('PLATFORM_UI_OFF_LINE_CHANGE_LINE_CONNECT', { lineConnection: true }))
        }
        _clear(dispatch);
      });
    }
  }
}

const _clear = function (dispatch) {
  dispatch(setReceiptHang(true));
  dispatch(genAction('PLATFORM_UI_BILLING_CLEAR'));
  dispatch(empty());
}

const buildEntityTree = (nonMainEntities, parentCode, meta) => {
  const nonMainMap = {};
  const subEntities = [];
  nonMainEntities.forEach(function (entity) {
    nonMainMap[entity.cCode] = entity;
  });
  nonMainEntities.forEach(function (entity) {
    if (entity.cParentCode === parentCode) {
      subEntities.push(entity);
    } else {
      let parentEntity = nonMainMap[entity.cParentCode];
      if (!parentEntity) return;
      if (!parentEntity.children)
        parentEntity.children = [];
      parentEntity.children.push(entity);
    }
  });
  recursive(subEntities, meta);
}

const recursive = (entities, meta) => {
  entities.forEach((entity, index) => {
    meta[`childrenField${index}`] = entity.childrenField;
    const childMeta = {};
    meta[entity.childrenField] = childMeta;
    entity.fields.forEach(field => {
      childMeta[field.cItemName] = field;
    });
    if (!entity.children) return;
    recursive(entity.children, childMeta);
  });
}

const getMeta = (billNo, callback) => {
  const config = {
    url: 'billmeta/getbill',
    method: 'GET',
    params: {
      billno: billNo,
      bIncludeView: false,
      bIncludeViewModel: true
    }
  };
  proxy(config)
    .then(function (json) {
      if (json.code !== 200) {
        cb.utils.alert(`获取${billNo}元数据失败：${json.message}`, 'error');
        return;
      }
      const meta = {};
      const entities = json.data.viewmodel.entities;
      const nonMainEntities = [];
      let parentCode = null;
      entities.forEach(entity => {
        if (entity.cType !== 'Bill') return;
        if (entity.bMain) {
          parentCode = entity.cCode;
          const mainFields = [];
          const mainDefineMap = {};
          entity.fields.forEach(field => {
            const { cItemName, cSelfDefineType } = field;
            meta[cItemName] = field;
            mainFields.push(cItemName);
            if (!cSelfDefineType) return;
            mainDefineMap[cSelfDefineType] = cItemName;
          });
          meta.mainFields = mainFields;
          meta.mainDefineMap = mainDefineMap;
        } else {
          nonMainEntities.push(entity);
        }
      });
      buildEntityTree(nonMainEntities, parentCode, meta);
      initialState[`${billNo}Meta`] = meta;
      if (callback)
        callback(meta);
    });
};

export function init(billHead, showLines) {
  return function (dispatch, getState) {
    getMeta(RetailVouchBillNo, function (meta) {
      billHead && billHead.forEach(item => {
        item.dataIndex = meta.mainDefineMap[item.defineId];
        item.metaData = meta[item.dataIndex];
      });
      dispatch(loadDefines(billHead));
      const productsChildrenField = meta.childrenField0;
      const productsMeta = meta[productsChildrenField];
      let backBillMeta = {
        iCoRetailid: JSON.parse(meta['iCoRetailid'].cRefRetId),
        iCoRetailDetailId: JSON.parse(productsMeta['iCoRetailDetailId'].cRefRetId)
      }
      const defineMap = {};
      _.forEach(productsMeta, (item, key) => {
        const { cSelfDefineType } = item;
        if (!cSelfDefineType) return;
        defineMap[cSelfDefineType] = key;
      });
      const columns = [], detailColumns = [], editColumns = { common: [], define: [] };
      showLines.forEach(item => {
        const { variable } = item;
        item.dataIndex = defineMap[variable] || variable;
        item.metaData = productsMeta[item.dataIndex];
        if (item.isLineShow)
          columns.push(item);
        if (item.isDetailAreaShow)
          detailColumns.push(item);
        if (item.isEditShow)
          defineMap[variable] ? editColumns.define.push(item) : editColumns.common.push(item);
        if (item.variable == 'fAvailableAuantity')
          item.isLineShow === false && item.isEditShow === false ? dispatch(genAction('PLATFORM_UI_PRODUCT_CAN_QUANTITY', false)) : dispatch(genAction('PLATFORM_UI_PRODUCT_CAN_QUANTITY', true))
      });
      dispatch(loadColumns(columns));
      dispatch(loadDetailColumns(detailColumns));
      dispatch(loadEditColumns(editColumns, productsMeta.iBathid));
      const productFieldMeta = productsMeta.product;
      dispatch(genAction('PLATFORM_UI_PRODUCT_SET_CHILDREN_FIELD', productsChildrenField));
      dispatch(genAction('PLATFORM_UI_COUPON_SET_CHILDREN_FIELD', meta.childrenField1));
      dispatch(genAction('PLATFORM_UI_GATHERING_SET_CHILDREN_FIELD', meta.childrenField2));
      dispatch(genAction('PLATFORM_UI_PROMOTION_SET_CHILDREN_FIELD', productsMeta.childrenField0));
      dispatch(genAction('PLATFORM_UI_PRODUCT_REFER_TO_BILL_MAP', productFieldMeta && productFieldMeta.cRefRetId));
      dispatch(genAction('PLATFORM_UI_RETAIL_SET_MAIN_FIELDS', meta.mainFields));
      dispatch(genAction('PLATFORM_UI_BILLING_EMPLOYEE_REFER_META', productsMeta.iEmployeeid_name));
      dispatch(genAction('PLATFORM_UI_BILLING_BACK_BILL_RETURN_META', backBillMeta))
    });
    getMeta(GatheringVouchBillNo);
    getStoreDefaultWareHouse(getState());
    getPromotionMutex();

    dispatch(empty());
  }
}

/* add by jinzh1 获取门店默认仓库*/
const getStoreDefaultWareHouse = (globalState) => {
  const storeId = globalState.user.toJS().storeId;
  const config = {
    url: 'billTemplateSet/getCurrentStoreWarehouse',
    method: 'GET',
    params: { storeId: storeId }
  };
  proxy(config)
    .then(function (json) {
      if (json.code !== 200) {
        cb.utils.alert(json.message, 'error');
      }
      let defaultWarehouse = json.data.defaultWarehouse;
      if (defaultWarehouse.warehouse) {
        iWarehouseid = defaultWarehouse.warehouse;
        iWarehouseid_name = defaultWarehouse.warehouse_name;
      }
    });
}
/*add by jinzh1  促销活动互斥策略*/
const getPromotionMutex = () => {
  const config = {
    url: 'mall/bill/preferential/querylinemutexstrategy',
    method: 'GET'
  };
  proxy(config)
    .then(json => {
      if (json.code !== 200) {
        cb.utils.alert(json.message, 'error');
        return;
      }
      if (json.data[0]) {
        promotionMutexMap.iMemberDiscountEnable = (json.data[0].iMemberDiscountEnable == 1) ? true : false;
        promotionMutexMap.iIntegral = (json.data[0].iIntegral == 1) ? true : false;
        promotionMutexMap.iSpotDiscountEnable = (json.data[0].iSpotDiscountEnable == 1) ? true : false;

        promotionMutexMap.iOrderDiscountEnable = json.data[0].iOrderDiscountEnable;
        promotionMutexMap.iCoupon = (json.data[0].iCoupon == 1) ? true : false;
        promotionMutexMap.isAllCoupon = (json.data[0].isAllCoupon == 1) ? true : false;
        promotionMutexMap.linecouponitem = json.data[0].linecouponitem;
      }
    });
}
export const getRetailVoucherData = (globalState, bHang) => {
  const data = getRetailVouchData(buildParams(globalState));
  if (bHang)
    data.preferentialExecuteBackup = PreferentialExecuteBackup;
  return data;
}

const buildParams = (globalState) => {
  const header = getBillingHeader(globalState);
  const { products, coupons, money } = globalState.product.toJS();
  return {
    header,
    products: transferProducts2Flatten(products),
    coupons,
    money,
    paymodes: globalState.paymode.toJS().paymodes,
    // 原单支付信息
    originPaymodes: globalState.paymode.toJS().billPaymodes
  };
}

export function canExecute(globalState, key, callback, dispatch) {
  const currentText = PreferentialExecuteMap[key].forbiddenTip;
  const currentPreferential = PreferentialExecuteMap[key].text;
  if (PreferentialExecuteBackup.length) {
    const lastKey = PreferentialExecuteBackup[PreferentialExecuteBackup.length - 1].key;
    if (key === lastKey) {
      callback();
      return;
    }
    let showAlert = false;
    if (PreferentialExecuteMap[key].order < PreferentialExecuteMap[lastKey].order)
      showAlert = true;
    if (key == 'Scene' && promotionMutexMap.iSpotDiscountEnable && lastKey == 'Promotion')
      showAlert = true;
    if (key == 'Point' && promotionMutexMap.iIntegral && lastKey == 'Promotion')
      showAlert = true;
    if (key == 'Member' && promotionMutexMap.iMemberDiscountEnable && lastKey == 'Promotion')
      showAlert = true;
    if (key == 'Coupon' && promotionMutexMap.iCoupon && promotionMutexMap.isAllCoupon && lastKey == 'Promotion')
      showAlert = true;
    if (key === 'Promotion') {
      if (promotionMutexMap.iSpotDiscountEnable && lastKey == 'scene')
        showAlert = true;
      if (promotionMutexMap.iIntegral && lastKey == 'Point')
        showAlert = true;
      if (promotionMutexMap.iMemberDiscountEnable && lastKey == 'Member')
        showAlert = true;
    }
    if (key == 'Quantity') {
      // if (lastKey == 'Scene' || lastKey == 'Point' || lastKey == 'Coupon') {
      if (lastKey == 'Point' || lastKey == 'Coupon') {
        showAlert = true;
      }
    }
    if (showAlert) {
      if (key === 'Promotion') {
        let passCheck = checkOpen(globalState, key, null, currentText);
        /* 校验，不走callback*/
        if (passCheck === false) return false
        clearAfterPromotion(dispatch, callback)
        /* 清除，执行callback */
        return false
      }
      cb.utils.alert(`已经执行了${PreferentialExecuteMap[lastKey].text}, ${currentText}`, 'error');
      return;
    }
  }
  checkOpen(globalState, key, callback, currentText);
}

const checkOpen = (globalState, key, callback, currentText, params) => {
  params = params || {};
  let swallowTip = params.swallowTip;
  let failCallback = params.failCallback;
  const currentPreferential = PreferentialExecuteMap[key].text;
  const industry = globalState.user.toJS().tenant.industry;
  /*所属行业*/
  if (key !== 'Member') {
    const { products } = globalState.product.toJS();
    const { billingStatus, infoData } = globalState.uretailHeader.toJS();
    if (!products.length) {
      !swallowTip && cb.utils.alert(`未录入商品，${currentText}`, 'error');
      failCallback && failCallback()
      return false;
    }
    const items = [];
    products.forEach(item => {
      if (item.bFixedCombo) return false;
      if (item.specsBtn)
        items.push(item.product_cName);
    });

    // if (industry != 17) {/*珠宝行业不校验*/
    /*modify by jinzh1 改零售价需要根据单据状态等控制，故不在此控制了！*/
    if (items.length && key != 'Quote') {
      !swallowTip && cb.utils.alert(`未录入商品“${items.join('，')}”的规格，${currentText}`, 'error');
      failCallback && failCallback()
      return false;
    }
    // }
    let checkShipmentDM, checkPresellBillDM, checkPresellBack;

    if (key === 'Promotion' || key === 'Scene' || key === 'Point' || key === 'Coupon') {
      checkShipmentDM = true;
      checkPresellBillDM = true;
      checkPresellBack = true;
      /* “若列表中不存在“参与折扣计算”为是且实销金额大于零的商品行，则提示“没有可以执行积分抵扣的商品行” */
      let notToBe = products.every(product => {
        if (!product.children) {
          let pass = product.bCanDiscount === true && product.fMoney > 0;
          return !pass
        } else {
          let notToBe_children = product.children.every(item => {
            let pass_children = item.bCanDiscount === true && product.fMoney > 0;
            return !pass_children;
          })
          return notToBe_children
        }
      })
      if (notToBe === true) {
        !swallowTip && cb.utils.alert(`没有可以执行${currentPreferential}的商品行`, 'error');
        failCallback && failCallback()
        return false
      }
    }
    /*改零售价 【删行】*/
    if (key == 'Quote' || key == 'Quantity') {
      checkShipmentDM = true;
      checkPresellBack = true;
    }
    if (key == 'EditRow') {
      checkPresellBack = true;
    }
    /* 预交货状态 + ‘交货时可修改商品’=false */
    if (billingStatus === Status.Shipment && infoData.bDeliveryModify === false && checkShipmentDM == true) {
      !swallowTip && cb.utils.alert(`交货不能修改商品时，${currentText}！`, 'error');
      failCallback && failCallback()
      return false
    }
    /* 预定状态 + ‘交货时可修改商品’=true */
    if (billingStatus === Status.PresellBill && infoData.bDeliveryModify === true && checkPresellBillDM == true) {
      !swallowTip && cb.utils.alert(`预订状态且交货时可修改商品的情况下，${currentText}！`, 'error');
      failCallback && failCallback()
      return false
    }
    /* 预退状态 */
    if (billingStatus === Status.PresellBack && checkPresellBack == true) {
      !swallowTip && cb.utils.alert(`预订退订状态下，${currentText}！`, 'error');
      failCallback && failCallback()
      return false
    }
  }
  callback && callback();
}

export function canExecute_copy(globalState, key, callback, dispatch, resolve) {
    let failCallback = resolve ? () => {
    resolve(true)
  } : null
  const currentText = PreferentialExecuteMap[key].forbiddenTip;
  const currentPreferential = PreferentialExecuteMap[key].text;
  if (PreferentialExecuteBackup.length) {
    const lastKey = PreferentialExecuteBackup[PreferentialExecuteBackup.length - 1].key;
    if (key === lastKey) {
      callback();
      return;
    }
    let showAlert = false;
    if (PreferentialExecuteMap[key].order < PreferentialExecuteMap[lastKey].order)
      showAlert = true;
    if (key === 'Promotion') {
      if (promotionMutexMap.iSpotDiscountEnable && lastKey == 'scene')
        showAlert = true;
      if (promotionMutexMap.iIntegral && lastKey == 'Point')
        showAlert = true;
      if (promotionMutexMap.iMemberDiscountEnable && lastKey == 'Member')
        showAlert = true;
    }
    if (showAlert && key === 'Promotion') {
      /* 校验，不走callback*/
      let passCheck = checkOpen(globalState, key, null, currentText, { swallowTip: true });
      if (passCheck === false) {
        failCallback && failCallback();
        return false
      }
      clearAfterPromotion(dispatch, callback, resolve, true)
    }
  } else {
    checkOpen(globalState, key, callback, currentText, { swallowTip: true, failCallback: failCallback });
  }
}

/* 已经执行了现场折扣／优惠券／积分抵扣，点击促销活动的处理 */
const clearAfterPromotion = async (dispatch, callBack, resolve, swallowTip) => {
  let failCallback = resolve ? () => {
    resolve(true)
  } : null;
  let isPop = ''
  if (resolve) { //执行了现场折扣等 && 点击结算 => 先确定有无促销活动再弹框
    isPop = await dispatch(getPromotionData(swallowTip, failCallback))
    if (isPop === 'notPop') return
  }
  let tips = '', cancelTips = '';
  let length = PreferentialExecuteBackup.length;
  PreferentialExecuteBackup.forEach((ele, index) => {
    tips += `${PreferentialExecuteMap[ele.key].text}${(length != index + 1) ? '、' : ''}`
  })
  tips = `已经执行了：${tips}不能执行促销活动！您确定要取消${tips}？`
  cb.utils.confirm(tips, function () {
    for (let len = PreferentialExecuteBackup.length, i = len - 1; i >= 0; i--) {
      let key = PreferentialExecuteBackup[i].key, backupData = PreferentialExecuteBackup[i].value, rowData = null;
      if (key === 'Scene') {
        rowData = backupData.backData;
        dispatch(cancelDiscount());
      }
      if (key === 'Point' || key === 'Coupon') {
        rowData = backupData.voucherData.voucherDataBefore;
        dispatch(cancelExecute(rowData, key));
      }
      // (i == 0) && dispatch(genAction('PLATFORM_UI_BILLING_CANCEL_PREFERENTIAL_UPDATE_PRODUCTS', {key, value: rowData}));
      // dispatch(genAction(`PLATFORM_UI_BILLING_RESTORE_PREFERENTIAL_${key.toLocaleUpperCase()}_BACKUP`, backupData));
    }
    callBack && callBack()
  })
  resolve && resolve(false)
}

export function canCancel(key, callback) {
  if (PreferentialExecuteBackup.length) {
    const lastKey = PreferentialExecuteBackup[PreferentialExecuteBackup.length - 1].key;
    if (lastKey !== 'Real' && key !== lastKey) {
      cb.utils.alert(`请先取消${PreferentialExecuteMap[lastKey].text}`, 'error');
      return;
    }
  }
  callback();
}

export function handleBackBillData(data, originalData) {
  return function (dispatch, getState) {
    backBillInfo = originalData;
    const retailVouchData = data[RetailVouchBillNo];
    delete retailVouchData.vouchdate;
    const { iMemberid } = retailVouchData;
    /*王久龄说  不管有没有会员 先清*/
    dispatch(genAction('PLATFORM_UI_MEMBER_CLEAR', ''));
    if (iMemberid) {
      dispatch(queryMemberById(iMemberid));
    }
    const retailVouchMeta = initialState[`${RetailVouchBillNo}Meta`];
    const products = transferProducts(retailVouchData[retailVouchMeta.childrenField0]);
    dispatch(genAction('PLATFORM_UI_BILLING_REFER_BILL_OK', { status: Status.FormerBackBill, data: retailVouchData }));
    dispatch(handleBackBill(products));

    // 原单退货处理原单支付相关信息
    handleOriginBillPaymodes(dispatch, data['rm_gatheringvouch']['gatheringVouchDetail'])
    /*    dispatch(genAction('PLATFORM_UI_BILLING_BACKUP_BILL_PAYMODES', _.map(data['rm_gatheringvouch']['gatheringVouchDetail'], item => {
          const {fMoney, iPaytype, iPaymentid_name, iPaymentid, ...others} = item
          return {
            value: 0 - fMoney,
            originValue: 0 - fMoney,
            paymentType: iPaytype,
            name: iPaymentid_name,
            paymethodId: iPaymentid,
            show: true,
            ...others
          }
        })))*/
  }
}

export function handlePresellBillData(data, originalData, status) {
  return function (dispatch, getState) {
    presellBillInfo = originalData;
    const retailVouchData = data[RetailVouchBillNo];
    delete retailVouchData.vouchdate;
    const { iMemberid } = retailVouchData;
    /*王久龄说  不管有没有会员 先清*/
    dispatch(genAction('PLATFORM_UI_MEMBER_CLEAR', ''));
    if (iMemberid) {
      dispatch(queryMemberById(iMemberid));
    }
    const retailVouchMeta = initialState[`${RetailVouchBillNo}Meta`];
    const products = transferProducts(retailVouchData[retailVouchMeta.childrenField0]);
    dispatch(genAction('PLATFORM_UI_BILLING_REFER_BILL_OK', { status, data: retailVouchData }));
    if (status === Status.PresellBack) {
      dispatch(handlePresellBack(products));
    } else if (status === Status.Shipment) {
      let infoData = getState().uretailHeader.toJS().infoData
      let actionType = infoData.bDeliveryModify ? 'shipmentModify' : 'shipmentUnmodify'
      let member_id = originalData[RetailVouchBillNo].iMemberid;
      dispatch(handleServerData(member_id, actionType, products, originalData[RetailVouchBillNo][retailVouchMeta.childrenField0]));
    }

    // 退订处理原单支付相关信息
    handleOriginBillPaymodes(dispatch, data['rm_gatheringvouch']['gatheringVouchDetail'])
  }
}

/* 电商订单处理 */
export function handleOnlineBillData(data, originalData, isBack) {
  return function (dispatch, getState) {
    mallorder = true;
    const retailVouchData = data[RetailVouchBillNo];
    delete retailVouchData.vouchdate;
    const { iMemberid } = retailVouchData;
    /*王久龄说  不管有没有会员 先清*/
    dispatch(genAction('PLATFORM_UI_MEMBER_CLEAR', ''));
    /* 写入会员放到选择默认营业员之后,回车弹参照 */
    // if (iMemberid) {
    //   dispatch(queryMemberById(iMemberid));
    // }
    const retailVouchMeta = initialState[`${RetailVouchBillNo}Meta`];
    const products = transferProducts(retailVouchData[retailVouchMeta.childrenField0]);
    dispatch(genAction('PLATFORM_UI_BILLING_REFER_BILL_OK', {
      status: (isBack ? Status.OnlineBackBill : Status.OnlineBill),
      data: retailVouchData
    }));
    dispatch(getDefaultBusinessType('16'))
    !isBack ? dispatch(handleOnlineBill(iMemberid, products)) : dispatch(handleOnlineBill(iMemberid, products, 'back'));


    // 原单退货处理原单支付相关信息
    // handleOriginBillPaymodes(dispatch, data['rm_gatheringvouch']['gatheringVouchDetail'])
    /*    dispatch(genAction('PLATFORM_UI_BILLING_BACKUP_BILL_PAYMODES', _.map(data['rm_gatheringvouch']['gatheringVouchDetail'], item => {
          const {fMoney, iPaytype, iPaymentid_name, iPaymentid, ...others} = item
          return {
            value: 0 - fMoney,
            originValue: 0 - fMoney,
            paymentType: iPaytype,
            name: iPaymentid_name,
            paymethodId: iPaymentid,
            show: true,
            ...others
          }
        })))*/
  }
}


function handleOriginBillPaymodes(dispatch, originBillPaymodes) {
  // 原单退货和退订处理原单支付相关信息
  // 组织结算页面所需数据
  // 合并同id的支付方式
  dispatch(genAction('PLATFORM_UI_BILLING_BACKUP_BILL_PAYMODES', _.map(_.groupBy(originBillPaymodes, item => {
    return item.iPaymentid
  }), p => {
    const { iPaytype, iPaymentid_name, iPaymentid, cVoucherCode, ...others } = p[0]
    const money = _.reduce(p, function (a, b) {
      return getFixedNumber(Number(a) + Number(b.fMoney))
    }, 0)
    return {
      value: getFixedNumber(0 - money),
      originValue: getFixedNumber(0 - money),
      paymentType: iPaytype,
      name: iPaymentid_name,
      paymethodId: iPaymentid,
      show: true,
      cVoucherCode,
      // 除了'现金', '储值卡', '其他'支付方式, 其他的保存原单数据
      originalSamePaymodes: iPaytype != 1 && iPaytype != 5 && iPaytype != 9 && p
      //...others
    }
  })
  ))
}


export function handlePendingData(data) {
  return function (dispatch, getState) {
    const { iMemberid } = data;
    /*王久龄说  不管有没有会员 先清*/
    dispatch(genAction('PLATFORM_UI_MEMBER_CLEAR', ''));
    if (iMemberid) {
      dispatch(queryMemberById(iMemberid));
    }
    const { preferentialExecuteBackup } = data;
    delete data.preferentialExecuteBackup;
    const retailVouchMeta = initialState[`${RetailVouchBillNo}Meta`];
    const products = transferProducts(data[retailVouchMeta.childrenField0]);
    dispatch(genAction('PLATFORM_UI_BILLING_REFER_BILL_OK', { status: data.billingStatus, data, bHang: true }));
    const asyncCallback = () => {
      if (!preferentialExecuteBackup || !preferentialExecuteBackup.length) return;
      preferentialExecuteBackup.forEach(item => {
        const { key, value } = item;
        dispatch(genAction('PLATFORM_UI_BILLING_EXECUTE_PREFERENTIAL_UPDATE_PRODUCTS', {
          key,
          value: data,
          backup: value
        }));
        dispatch(genAction(`PLATFORM_UI_BILLING_RESTORE_PREFERENTIAL_${key.toLocaleUpperCase()}_BACKUP`, value));
      });
    }
    dispatch(handleServerData(null, 'cancelPending', products, null, asyncCallback));
  }
}


const mockOptions = {
  "monovalentdecimal": {
    "value": 3,
    "caption": "单价小数位"
  },
  "amountofdecimal": {
    "value": 3,
    "caption": "金额小数位"
  },
  "ERPsyscheckoutdate": {
    "caption": "ERP系统结账日期"
  },
  "maxzerolim": {
    "value": "2",
    "caption": "最大找零金额"
  }, // 0-不控制
  "newbilldefcursor": {
    "value": "2",
    "caption": "新开单据光标默认于"
  }, // 1-会员录入；2-商品录入
  "returnseasonentry": {
    "value": "false",
    "caption": "退货原因必输"
  },
  "displaymembercoupon": {
    "value": true,
    "caption": "显示会员优惠券"
  },
  "ticketprint": {
    "value": true,
    "caption": "收款时打印小票"
  },
  "billprinttype": {
    "value": "1",
    "caption": "开单打印类型"
  }, // 1-POS打印；2-单据打印
  "billdefaulttype": {
    "value": "003",
    "caption": "开单默认打印模板"
  },
  "goldprice": {
    "value": "2",
    "caption": "预订业务金价取值"
  } // 1-预订日期金价；2-交货日期金价
}

export function loadOptions(data) {
  return function (dispatch, getState) {
    // options = data;
    options = Object.assign({
      "numPoint_Quantity": { "value": 2, "caption": "数量小数位" },
      "numPoint_Rate": { "value": 2, "caption": "比率小数位" },
      "numPoint_Weight": { "value": 2, "caption": "重量小数位" }
    }, data);
    options.numPoint_Quantity.value = cb.rest.AppContext.option.quantitydecimal;
    options.numPoint_Weight.value = cb.rest.AppContext.option.scaledecimal;
  }
}

export function getOptions() {
  return options;
}

export function loadFunctionOptions(data, type) {
  return function (dispatch) {
    functionOptioins = {}
    functionOptioins[type] = !!data
  }
}

export function getFunctionOptions() {
  return functionOptioins
}

// 异步示例
function checkProductsku0(getState, dispatch) {
  return new Promise((resolve, reject) => {
    let canOpen = true
    const currentState = getState()
    const { infoData: { bPreselllockStock, bDeliveryModify }, billingStatus } = currentState['uretailHeader'].toJS()
    const { products } = currentState['product'].toJS()

    // 每个商品是否都选了规格
    const filledSku = _.every(products, p => {
      // 套餐商品bFixedCombo不需要判断规格productsku
      return p.bFixedCombo || !!p.productsku
    })
    // '现销'、'退货'、'交货'、'预订状态下交货不可修改'，如果存在没有选择规格的商品，弹窗提示
    switch (billingStatus) {
      case 'CashSale':/*现销*/
      case 'Shipment':/*交货*/
      case 'FormerBackBill':/*原单退货*/
      case 'NoFormerBackBill':/*非原单退货*/
        canOpen = filledSku
        break
      case 'PresellBill':/*预订 */
        //预订且占用可用量
        //预订且交货时不可修改商品
        if (!bDeliveryModify || bPreselllockStock) {
          canOpen = filledSku
        }
        break
    }

    if (!canOpen) {
      cb.utils.alert({
        title: '请先选择规格',
        type: 'error'
      })
      resolve(false)
    } else {
      resolve(true)
    }
  })
}

// 同步示例
function checkProductsku(getState, dispatch) {
  const currentState = getState()
  let canOpen = true
  const { infoData: { bPreselllockStock, bDeliveryModify }, billingStatus } = currentState['uretailHeader'].toJS()
  const { products } = currentState['product'].toJS()

  // 每个商品是否都选了规格
  const filledSku = _.every(products, p => {
    // 套餐商品bFixedCombo不需要判断规格productsku
    return p.bFixedCombo || !!p.productsku
  })
  // '现销'、'退货'、'交货'、'预订且占用可用量'、'预订且交货时不可修改商品'，如果存在没有选择规格的商品，弹窗提示
  switch (billingStatus) {
    case 'CashSale':
      /!*现销*!/
    case 'Shipment':
      /!*交货*!/
    case 'FormerBackBill':
      /!*原单退货*!/
    case 'NoFormerBackBill':
      /!*非原单退货*!/
      canOpen = filledSku
      break
    case 'PresellBill':
      /!*预订 *!/
      //预订且占用可用量
      //预订且交货时不可修改商品
      if (!bDeliveryModify || bPreselllockStock) {
        canOpen = filledSku
      }
      break
  }

  if (!canOpen) {
    cb.utils.alert({
      title: '请先选择规格',
      type: 'error'
    })
    return false
  }
  return canOpen
}


function checkBackReason(getState, dispatch) {
  const currentState = getState()
  const { products } = currentState['product'].toJS()
  const { billingStatus } = currentState['uretailHeader'].toJS()
  let arr = [], bSuccess = true;

  // 退货原因不是必填时，直接返回
  if (!(_.get(getOptions(), 'returnseasonentry.value') === true)) return true
  if (billingStatus == 'OnlineBackBill' || billingStatus == 'OnlineBill') return true

  // 非退订状态下检查退货原因是否填写
  if (billingStatus !== 'PresellBack') {
    // arr = _.filter(products, (p,i) => {
    //   return p.fQuantity < 0 && typeof p.iBackid === 'undefined'
    // })
    /*modfiy by jinzh1 由于退货原因和改行合并   校验退货原因等字段时 需要同时setFocusedRow*/
    for (var i = 0; i < products.length; i++) {
      if (products[i].fQuantity < 0 && typeof products[i].iBackid === 'undefined') {
        arr.push(products[i]);
        if (bSuccess) dispatch(setFocusedRow(products[i], i + 1));
        bSuccess = false;
      }
    }
  }

  if (arr.length > 0) {
    cb.utils.alert('请填写退货原因!', 'error')
    dispatch(showModal('UpdateBackInfo', arr))
    return false
  }
  return true
}

export function checkWight(globalState, dispatch) {
  let industry = cb.rest.AppContext.tenant.industry;
  if (industry !== 17) return true // 自定义项控制只限珠宝行业
  const { billingStatus } = globalState.uretailHeader.toJS();
  const { products } = globalState.product.toJS();
  if (billingStatus === 'NoFormerBackBill') {
    let arr = products.filter(ele => {
      return (ele.fQuantity < 0 && ele['product_productProps!define2'] == '是' && !ele['retailVouchDetailCustom!define1'])
    })
    if (arr.length > 0) {
      cb.utils.alert('重量不能为空或者0！', 'error')
      dispatch(showModal('UpdateBackInfo', arr))
      return false
    }
  }
  return true
}

export function checkOnline(globalState, dispatch) {
  let { billingStatus, infoData } = globalState.uretailHeader.toJS();
  let hadOpen = globalState.reserve.toJS().hadOpen;
  if (billingStatus === 'OnlineBill' && !hadOpen && infoData.cDeliverType === 'STOREDELIVERY') {
    dispatch(showHeaderInfo())
    return false
  }
  return true
}

export async function checkOutoPromotion(globalState, dispatch) {
  let billingStatus = globalState.uretailHeader.toJS().billingStatus;
  if (billingStatus == 'OnlineBackBill' || billingStatus == 'OnlineBill' || !firstOpenPromotion) return true
  // let flag = false;
  // flag = await dispatch(showModal('SetPromotionFocus'));
  // flag === false ? false : true;
  // return flag
  const flag = await promotionCanOpen('SetPromotionFocus', dispatch, globalState);
  return flag;
}

/* 结算时关联校验促销活动，不能执行促销时弹结算 */
export async function promotionCanOpen(key, dispatch, globalState) {
  if (key == 'SetPromotionFocus' && judgeFirstOpenPromotion('get')) {
    judgeFirstOpenPromotion('set', false)
  }
  if (key == 'SetPromotionFocus') {
    let hasAuth = checkButtonAuth('SetPromotionFocus', globalState, true);
    if (!hasAuth) return false;
  }
  return new Promise((resolve, reject) => {
    canExecute_copy(globalState, 'Promotion', () => {
      canPromotionOpen(dispatch, globalState, function () {
        dispatch(genAction('PLATFORM_UI_BILLING_Action_ShowModal', {modalKey_Current: key}));
        resolve(false)
      }, true, () => {
        resolve(true)
      });
    }, dispatch, resolve)
  });

}

// 交货时， 应收金额必须大于等于零
function checkShipmentValue(getState, dispatch) {
  const currentState = getState()
  const gathering = currentState.product.toJS().money.Gathering.value
  const { billingStatus } = currentState['uretailHeader'].toJS()
  if (billingStatus === 'Shipment' && Number(gathering) < 0) {
    cb.utils.alert({
      title: '应收金额必须大于等于零',
      type: 'error'
    })
    return false
  }
  return true
}

// 判断结算弹窗是否可打开
export async function canOpenSettleModal(getState, dispatch) {
  let result
  let lineConnection = getState().offLine.get('lineConnection');


  // 检查是否有数量/重量 为0的商品
  result = checkQuantityZero(getState)

  if (result) {
    // 检查是否已经在结算状态
    result = checkInSettle(getState)
  }

  if (result) {
    // 交货时， 应收金额必须大于等于零
    result = checkShipmentValue(getState, dispatch)
  }


  // if (result) {
  //   /*校验退款权限*/
  //   result = await checkRefundAuth(getState, dispatch);
  // }


  // 同步示例, 直接返回true或者false
  if (result) {
    result = checkProductsku(getState, dispatch)
  }
  // 同步示例， 直接返回true或者false
  if (result) {
    result = checkVoucherDetail(getState, dispatch)
  }

  if (result) {
    result = checkBackReason(getState, dispatch)
  }

  if (result) {
    result = checkWight(getState(), dispatch)
  }

  if (result) {
    result = checkOnline(getState(), dispatch)
  }

  if (result && options.autopromotion && options.autopromotion.value && firstOpenPromotion && lineConnection) {
    result = await checkOutoPromotion(getState(), dispatch)
  }

  // 异步示例, 使用'await'并返回promise
  if (result && (!options.allownegstock.value || options.autoDesignOutStockBatch.value) && lineConnection) {
    result = await checkStock(getState, dispatch)
  }

  /* 校验赊销营业员 */
  if (result) {
    result = await allEmloyeeIsSame(getState(), dispatch)
  }

  /* 校验赊销客户 */
  if (result) {
    result = await checkIsOwned(getState(), dispatch)
  }

  if (result) {
    /*校验业务类型*/
    let businessType = getState().uretailHeader.toJS().infoData.businessType;
    if (!businessType.id || businessType.id == '') {
      cb.utils.alert('未录入业务类型，请检查！', 'error');
      result = false;
    }
  }

  if (result) {
    /*校验退款权限*/
    result = await checkRefundAuth(getState, dispatch);
  }

  return result
}

/*校验退款权限*/
export function checkRefundAuth(getState, dispatch) {
  return new Promise(function (resolve) {
    /*应收为负*/
    let totalValue = getState().product.toJS().money.Total.value;
    if (totalValue < 0) {
      let authData = getAuthData();
      if (authData.BackPay == false) {
        dispatch(showOperator(true, false, 'returnmoney', 'RM20', () => {
          resolve(true);
        }));
      } else {
        resolve(true);
      }
    } else {
      resolve(true);
    }
  });
}

// 异步示例
export function checkStock(getState, dispatch) {
  let data = getRetailVoucherData(getState());
  checkStockBackData = data;
  /*记录 校验库存前 数据 方便 取消结算时回滚*/
  if (presellBillInfo)
    data.presellinfo = presellBillInfo;
  return new Promise(function (resolve) {
    const config = {
      url: 'bill/stockchecking',
      method: 'POST',
      params: data,
    };
    proxy(config)
      .then(json => {
        if (json.code !== 200) {
          cb.utils.alert(json.message, 'error');
          resolve(false);
          return;
        }
        dispatch(genAction('PLATFORM_UI_BILLING_EXECUTE_PREFERENTIAL_UPDATE_PRODUCTS', {
          key: 'Real',
          value: json.data
        }));
        resolve(true);
      });
  })
}

export function afterPayModalClose() {
  return function (dispatch, getState) {
    if (checkStockBackData) {
      dispatch(genAction('PLATFORM_UI_BILLING_CANCEL_PREFERENTIAL_UPDATE_PRODUCTS',
        { key: 'Real', value: checkStockBackData }));
      checkStockBackData = null;
    }
  }
}

export function getPromotionMutexMap() {
  return promotionMutexMap;
}

export function getProductWarehouse(product) {
  if (!product.iWarehouseid_name)
    product.iWarehouseid_name = iWarehouseid_name
  if (!product.iWarehouseid)
    product.iWarehouseid = iWarehouseid
}

export function judgeFirstOpenPromotion(type, value) {
  if (type === 'get')
    return firstOpenPromotion
  if (type == 'set')
    firstOpenPromotion = value
}


// 检查是否正在结算
export function checkInSettle(getState) {
  // return true
  //return !getState()['paymode'].get('onSettle')
  const currentState = getState()
  const products = currentState['product'].get('products').toJS()
  const onSettle = currentState['paymode'].get('onSettle')

  return !(_.isEmpty(products) || onSettle)
}

// 检查是否有数量/重量 为0的商品
export function checkQuantityZero(getState) {

  const products = getState()['product'].get('products')
  const hasZero = products.some(product => {
    return getFromMapOrObject(product, 'fQuantity') == 0
  })

  hasZero && cb.utils.alert('商品行有数量为0的数据，不可进行结算', 'error')

  return !hasZero
}

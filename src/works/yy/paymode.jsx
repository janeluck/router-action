import Immutable from 'immutable'
import {genAction, proxy, getRoundValue} from 'yxyweb/common/helpers/util'
import {getRetailVoucherData, getOptions, canOpenSettleModal, afterPayModalClose, save} from './mix'
import _ from 'lodash'

export const ConfigOptions = {}

export const getFixedNumber = _.bind(function (value, name) {
  name = name || 'amountofdecimal'
  const precision = _.get(this, `${name}.value`)
  value = isNaN(value) ? 0 : value
  // 参数错误的时候, 返回原值
  if (isNaN(precision)) {
    return value
  }
  return getRoundValue(value, precision)
}, ConfigOptions)


/*const generateFixed = function (precision) {
  // 参数错误的时候, 返回原值
  if (isNaN(precision)) {
    return function (value) {
      return value
    }
  }
  return function (value) {
    value = isNaN(value) ? 0 : value
    return Number(value).toFixed(precision)
  }
}*/
const $$initialState = Immutable.fromJS({
  payment: Immutable.Map(),
  paymodes: Immutable.Map(),
  currentFocus: '-1',
  visible: false,
  shortCutOpen: 0,
  delZero: Immutable.Map(),
  settle: Immutable.Map(),
  quickPay: [],
  // 快捷键切换支付方式
  shortCutToggle: '-1',
  finalSettle: 0,
  onSettle: false
})

// reducer
export default ($$state = $$initialState, action) => {
  switch (action.type) {
    case 'PLATFORM_UI_BILLING_QUERY_PAYMENT':
      return $$state.set('payment', Immutable.Map().withMutations(p => {
          _.forEach(action.payload, (v) => {
            v.paymethodId += ''
            p.set(v['paymethodId'], Immutable.Map(v))
          })
          return p
        })
      )

    // 批量更新支付金额
    case 'PLATFORM_UI_BILLING_SET_PAYMODES':

      return $$state.set('paymodes', Immutable.Map().withMutations(p => {
          _.forEach(action.payload, (v) => {
            v.paymethodId += ''
            p.set(v['paymethodId'], Immutable.Map(v))
          })
          return p
        })
      )

    // 备份当前订单的支付数据
    case 'PLATFORM_UI_BILLING_BACKUP_BILL_PAYMODES':
      return $$state.set('billPaymodes', $$state.get('payment').mergeDeep(Immutable.Map().withMutations(p => {
        _.forEach(action.payload, (v) => {
          v.paymethodId += ''
          p.set(v['paymethodId'], Immutable.Map(v))
        })
        return p
      })))

    case 'PLATFORM_UI_BILLING_LOAD_PAYDATA':
      return $$state.merge(action.payload)
    case 'PLATFORM_UI_BILLING_FINAL_SETTLE':
      return $$state.update('finalSettle', v => ++v)



    // 付款方式集合切换焦点
    case 'PLATFORM_UI_BILLING_TOGGLE_FOCUS':
      return $$state.set('currentFocus', action.payload.paymethodId)

    case 'PLATFORM_UI_BILLING_SHORTCUT_TOGGLE_FOCUS':
      return $$state.set('shortCutToggle', action.payload.paymethodId)



    // 默认结算
    case 'PLATFORM_UI_BILLING_OPEN_DEFAULT_PAYMODAL':
      const defaultPaymode = $$state.get('payment').findKey(paymode => paymode.get('isDefault'))
      if (typeof defaultPaymode === 'undefined') {
        cb.utils.alert({
          title: '请先设置默认的支付方式',
          type: 'error'
        })
        return $$state
      }
      return $$state.merge({
        visible: true,
        currentFocus: defaultPaymode,
        paymodes: $$state.get('payment').update(defaultPaymode, paymode => paymode.merge({
          show: true,
          value: action.payload.value
        }))
      })

    // 快捷结算
    case 'PLATFORM_UI_BILLING_OPEN_SHORTCUT_PAYMODAL':
      return $$state.merge({
        paymodes: $$state.get('payment').update(action.payload.paymethodId, paymode => paymode.merge({
          show: true,
          value: action.payload.value,
        }))
      }).update('shortCutOpen', v => ++v)

    // 关闭结算弹窗
    case 'PLATFORM_UI_BILLING_CLOSE_PAYMODAL':
      //case 'PLATFORM_UI_BILLING_CLEAR':
      return $$state.merge({currentFocus: '-1', visible: false, onSettle: false})


    // 更新结算方式集合
    case 'PLATFORM_UI_BILLING_UPDATE_PAYMODE':
      return $$state.update('paymodes', paymodes => {
        return paymodes.withMutations(maps => {

          // 支付方式的金额符号与应付金额的符号必须相同
          if (_.has(action.payload.data, 'value')) {
            let v = action.payload.data.value

            if (action.payload.realTotal >= 0) {
              if (isNaN(v)) {
                v = '0.00'
              }
              action.payload.data.value = (v + '').replace(/-/, '')
            } else {
              if (!(v + '').match(/-/)) {
                action.payload.data.value = '-' + v
              }
            }
          }


          maps.update(action.payload.index, paymode => paymode.merge(action.payload.data))


          // 应收金额为负的时候不记录找零
          if (action.payload.realTotal < 0) {
            return
          }

          // 获取可找零金额
          let maxzerolim = _.get(ConfigOptions, 'maxzerolim.value')
          maxzerolim = getFixedNumber(maxzerolim)

          // 计算当前找零金额
          let currentChange = getFixedNumber(maps.reduce(function (a, b) {
            return getFixedNumber(Number(a) + Number(b.get('value') || 0))
          }, 0) - action.payload.realTotal)

          // 抹零限额开启时， 限制抹零金额
          if (maxzerolim != 0 && currentChange > maxzerolim) {
            cb.utils.alert({title: '最大找零金额为：' + maxzerolim})
            //maps.updateIn([action.payload.index, 'value'], v => (v - getFixedNumber(currentChange - maxzerolim)))
            //currentChange = maxzerolim
          }

          //有现金(paymentType为1)支付时记录找零
          const cashPayKey = maps.findKey(map => map.get('paymentType') == 1)
          if (cashPayKey) {
            maps.update(cashPayKey, cashPay => {
              if (cashPay.get('show')) {
                return cashPay.set('change', currentChange
                )
              }
              return cashPay.set('change', 0)
            })
          }
        })
      })


    // 删除结算方式
    case 'PLATFORM_UI_BILLING_DELETE_PAYMODE':
      return $$state.updateIn(['paymodes', action.payload.index], paymode => {
        return paymode.merge({
          show: false,
          value: 0
        })
      }).set('currentFocus', '-1')

    // 微信,支付宝和储值卡添加卡号
    case 'PLATFORM_UI_BILLING_ADD_CARD':

      return $$state.withMutations(state => {
        _.forEach(action.payload.arr, item => {
          state.setIn(['paymodes', ...(item['keyPath'])], item['value'])
          // 储值卡添加后端所需参数
          if (item['isStoredValueCard']) {
            state.setIn(['paymodes', item['keyPath'][0], 'backUrl'], action.payload.backUrl)
          }
        })
        return state
      })

    // 切换是否使用抹零功能
    case 'PLATFORM_UI_BILLING_TOGGLE_DELZERO':
      //return $$state.updateIn(['delZero', 'isDefaultValue'], v => !v /*action.payload.checked*/)
      return $$state.updateIn(['delZero', 'isDefaultValue'], v => action.payload.checked)


    default:
      return $$state;
  }
}

export function loadPayment(data, shortcutArr) {
  return function (dispatch) {
    dispatch(genAction('PLATFORM_UI_BILLING_QUERY_PAYMENT', data))
    dispatch(genAction('PLATFORM_UI_BILLING_LOAD_PAYDATA', {
      shortcutArr
    }))
  }
}

export function loadQuickPaymodes(quickPay) {
  return function (dispatch) {
    dispatch(genAction('PLATFORM_UI_BILLING_LOAD_PAYDATA', {
      quickPay
    }))
  }
}

export function loadConfig(data) {
  return function (dispatch) {
    let delZero, settle;
    data.forEach(item => {
      if (item.command === 'DeleteZero')
        delZero = item;
      else if (item.command === 'Settle')
        settle = item;
    })
    dispatch(genAction('PLATFORM_UI_BILLING_LOAD_PAYDATA', {
      delZero: delZero || {},
      settle: settle || {}
    }))

    // 初始化配置参数
    _.extend(ConfigOptions, getOptions())
  }
}


// 记录促销前的数据
export function backUpBeforePreferential(backupData) {
  return {
    type: 'PLATFORM_UI_BILLING_LOAD_PAYDATA',
    payload: {
      backupData
    }
  }
}

// 关闭结算弹窗

export function closePaymodal(isComplete) {
  return function (dispatch, getState) {
    const backupData = getState()['paymode'].toJS()['backupData']
    // isComplete 是否完成订单
    if (isComplete) {
      dispatch(backUpBeforePreferential(false))
    } else {
      // 已经执行过促销的需要取消
      if (backupData) {
        dispatch(genAction('PLATFORM_UI_BILLING_CANCEL_PREFERENTIAL_UPDATE_PRODUCTS', {
          key: 'Zero',
          value: backupData,
        }));
      }
      dispatch(afterPayModalClose())
    }
    dispatch(genAction('PLATFORM_UI_BILLING_CLOSE_PAYMODAL'))

  }
}


// 批量更新结算方式
export function setPaymodes(obj) {
  return function (dispatch, getState) {
    dispatch(genAction('PLATFORM_UI_BILLING_SET_PAYMODES', obj));
  }
}


// 更新结算方式
export function updatePaymode(obj) {
  return function (dispatch, getState) {
    const realTotal = getFixedNumber(getState()['product'].getIn(['money', 'Gathering', 'value']))
    dispatch(genAction('PLATFORM_UI_BILLING_UPDATE_PAYMODE', {realTotal, ...obj}));
  }
}

// 删除结算方式
export function deletePaymode(index) {
  return {
    type: 'PLATFORM_UI_BILLING_DELETE_PAYMODE',
    payload: {
      index
    }
  }
}

// 微信,支付宝添加卡号
export function addCard(arr) {
  return function (dispatch, getState) {
    dispatch(genAction('PLATFORM_UI_BILLING_ADD_CARD', {
      arr,
      // 储值卡save回调参数
      backUrl: `${location.origin}/uniformdata/thirdparty/member/cardcallback?token=${getState()['user'].toJS()['token']}`
    }));
  }
}

// 最终结算
export function finalSettle() {
  return {
    type: 'PLATFORM_UI_BILLING_FINAL_SETTLE'
  }
}


// 默认结算
export function defaultSettle() {
  return function (dispatch, getState) {
    canOpenSettleModal(getState, dispatch).then(canOpen => {
      if (!canOpen) return
      //'PresellBack': /*退订*/

      const currentState = getState()
      const uretailHeader = currentState['uretailHeader'].toJS()
      const billingStatus = uretailHeader['billingStatus']

      const {iOwesState = 0} = uretailHeader.infoData

      // if (billingStatus === 'PresellBack' ) {
      if (billingStatus === 'PresellBack' || billingStatus === 'FormerBackBill') {
        // 应收金额
        // const gathering = getFixedNumber(currentState['product'].toJS().money.Gathering.value)

        // 抹零
        getDelZeroResult(dispatch, getState).then(result => {
          if (result >= 0) {
            dispatch(genAction('PLATFORM_UI_BILLING_OPEN_DEFAULT_PAYMODAL', {
              // 可赊销时默认结算设置代入金额为0
              value: iOwesState == 1 ? 0 : result
            }))
          } else {

            const paymodes = currentState['paymode'].toJS().billPaymodes
            let inUse = []
            // 只使用一种支付方式时更新为实时金额
            _.forEach(paymodes, (pay, paymethodId) => {
              if (pay.show && Number(pay.value) !== 0) {
                inUse.push(paymethodId)
              }
            })
            if (inUse.length === 1) {
              paymodes[inUse[0]]['value'] = result
            }

            dispatch(genAction('PLATFORM_UI_BILLING_LOAD_PAYDATA', {
              visible: true,
              paymodes: Immutable.fromJS(paymodes),
              currentFocus: inUse[0] + ''
            }))
          }

        })


      } else if (billingStatus === 'OnlineBackBill') {


        dispatch(save(data => {
          cb.utils.alert('电商结算成功')
        }, result => {
          cb.utils.alert('电商结算失败')
        }))

      } else {
        getDelZeroResult(dispatch, getState)
          .then(result => {
            dispatch(genAction('PLATFORM_UI_BILLING_OPEN_DEFAULT_PAYMODAL', {
              value: iOwesState == 1 ? 0 : result
            }))
          })
      }
    })
  }

}

// 快捷结算
export function shortcutSettle(paymethodId) {

  return function (dispatch, getState) {

    const billingStatus = getState()['uretailHeader'].toJS()['billingStatus']
    //'PresellBack': /*退订*/
    // 'FormerBackBill':/*原单退货*/
    // 'NoFormerBackBill':/*非原单退货*/
    // 'OnlineBackBill':/*电商退货*/

    if (billingStatus === 'OnlineBackBill' || billingStatus === 'PresellBack' || billingStatus === 'FormerBackBill' || billingStatus === 'NoFormerBackBill') {
      cb.utils.alert({
        title: `该状态下不能使用快捷结算`,
        type: 'error'
      })
      return
    }


    canOpenSettleModal(getState, dispatch).then(canOpen => {
      if (!canOpen) return
      paymethodId += ''
      getDelZeroResult(dispatch, getState)
        .then(result => {
          dispatch(genAction('PLATFORM_UI_BILLING_OPEN_SHORTCUT_PAYMODAL', {
            paymethodId,
            value: result
          }))
        })
    })


  }

}


// 切换支付方式input焦点
export function toggleFocus(paymethodId) {
  paymethodId += ''
  return {
    type: 'PLATFORM_UI_BILLING_TOGGLE_FOCUS',
    payload: {
      paymethodId
    }
  }
}

// 切换支付方式快捷键

export function togglePaymentType(paymethodId) {
  paymethodId += ''
  return {
    type: 'PLATFORM_UI_BILLING_SHORTCUT_TOGGLE_FOCUS',
    payload: {
      paymethodId
    }
  }
}

// 切换是否使用抹零功能
export function toggleDelZero(checked) {
  return {
    type: 'PLATFORM_UI_BILLING_TOGGLE_DELZERO',
    payload: {
      checked
    }
  }
}


function getShouldDelZero(currentState) {
  const {infoData, billingStatus} = currentState['uretailHeader'].toJS()
  let {delZero: {isDefaultValue}} = currentState['paymode'].toJS()
  let lineConnection = currentState.offLine.get('lineConnection')

  // 总金额为0, 不再执行抹零操作
  const value = Number(currentState['product'].getIn(['money', 'Gathering', 'value']))
  if (value === 0) {
    return false
  }
  if (!lineConnection && cb.rest.interMode === 'touch'){
    return false
  }
  switch (billingStatus) {
    // 电商退货 不进行抹零
    case 'OnlineBackBill':
    // 电商订单  不进行抹零
    case 'OnlineBill':
    // 退订不进行抹零
    case 'PresellBack': /*退订*/
      isDefaultValue = false
      break

    // 预订状态且“交货时可修改商品”为是, 不进行抹零
    case 'PresellBill':
      if (infoData.bDeliveryModify) {
        isDefaultValue = false
      }
      break
    // 交货状态且“交货时可修改商品”为否, 不进行抹零
    case 'Shipment':
      if (!infoData.bDeliveryModify) {
        isDefaultValue = false
      }
      break

  }


  return isDefaultValue

}

function getDelZeroResult(dispatch, getState) {
  const currentState = getState()
  const shouldDelZero = getShouldDelZero(currentState)
  const value = getFixedNumber(currentState['product'].getIn(['money', 'Gathering', 'value']))

  // 已付款金额
  const deposit = getFixedNumber(currentState['product'].getIn(['money', 'Deposit', 'value']))


  let data = false

  return new Promise(function (resolve, reject) {

    if (shouldDelZero) {

      data = getRetailVoucherData(currentState);
      const config = {
        url: 'thirdparty/member/wipesmall',
        method: 'POST',
        params: {
          data: JSON.stringify(data)
        }
      };

      proxy(config)
        .then(json => {
          if (json.code !== 200) {
            cb.utils.alert(json.message, 'error')
            reject()
            return
          }
          console.log('使用抹零')
          // 抹零后的结果
          const result = json.data.fMoneySum
          data = json.data
          dispatch(genAction('PLATFORM_UI_BILLING_EXECUTE_PREFERENTIAL_UPDATE_PRODUCTS', {
            key: 'Zero',
            value: json.data
          }));

          // 此时返回的是整单抹零的结果, 需要减去已付款金额
          resolve(getFixedNumber(Number(result) - deposit))
        });

    } else {
      resolve(value)
    }
    dispatch(backUpBeforePreferential(data))
  })
}

// save前设置预订额
export function setPresellMoney(value) {
  return {
    type: 'PLATFORM_UI_BILLING_PRESELL_PAY_MONEY',
    payload: value
  }
}


export function toggleSettleStatus(onSettle) {
  return {
    type: 'PLATFORM_UI_BILLING_LOAD_PAYDATA',
    payload: {
      onSettle
    }
  }
}











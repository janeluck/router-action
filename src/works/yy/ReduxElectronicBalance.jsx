import Immutable from 'immutable'
import {genAction, proxy} from 'yxyweb/common/helpers/util'
import {checkBeforeOpenQuantity} from './quote'
import {getFixedNumber} from './paymode'
import _ from 'lodash'
import addEventListener from 'add-dom-event-listener'


// 字符串'false'或者'true'转换为Boolean类型
// @param {String}
// return {Boolean }

function convertStringToBoolean(str) {
  switch (_.trim(str)) {
    case 'false':
      return false
    case 'true':
      return true
  }
}


// 电子秤参数
export const operationConfig = {
  keepWeigh: false, // 持续称重模式
  showTare: true, // 显示去皮按钮
  // info 开发使用true， 调试完使用false
  bMatch: false // 是否已经适配电子秤, 默认是false，
}


let transparentMask

// 初始化
export const initElectronEvent = function (dispatch) {


  if (window && window.Electron) {
    // 存取电子秤配置信息
    const remoteConfig = _.get(cb.electron.getSharedObject('scaleConfig'), 'configurations.0')

    if (!remoteConfig) {
      return
    }

    // 更新配置
    operationConfig.keepWeigh = convertStringToBoolean(remoteConfig.bContinuedDataRead)
    operationConfig.showTare = convertStringToBoolean(remoteConfig.bPeelingButton)
    operationConfig.bMatch = convertStringToBoolean(remoteConfig.bMatch)


    // 注册渲染线程通信事件
    const ipcRenderer = Electron.ipcRenderer
    const electronicBalanceOnChange = function (event, arg) {
      console.log('取重:')
      console.log(arg)
      dispatch(electronicBalanceChange({tare: JSON.parse(arg).tare, weigh: JSON.parse(arg).weight}))
    }

    if (operationConfig.bMatch) {
      let removed = false
      // 打开电子秤
      cb.electron.sendOrder('open')
      // 订阅服务端推送
      ipcRenderer.addListener('electronicBalance-change', electronicBalanceOnChange)


      // 连续称重模式下初始化遮罩组件
      if (operationConfig.keepWeigh) {


        transparentMask = new TransparentMask('touch_touchContent_focused-cell', () => {
          dispatch(reWeigh())
          dispatch(genAction('PLATFORM_UI_BILLING_ELECTRONIC_BALANCE_UPDATEKEY', null))
        })
      }


      const remove = function () {
        if (!removed) {
          ipcRenderer.removeListener('electronicBalance-change', electronicBalanceOnChange)
          // 卸载遮罩组件的绑定事件
          transparentMask && transparentMask.destroy()
          // 关闭电子秤
          cb.electron.sendOrder('close')
          removed = true
        }
      }
      // 页面不走router渲染时 注册unload事件
      window.onbeforeunload = remove


      return {
        remove
      }
    }

    return false

  }


}


const $$initialState = Immutable.fromJS({
  tare: '0.000', // 皮重
  weigh: '0.000', // 重量
  focusedProductUid: null
})

// reducer
export default ($$state = $$initialState, action) => {
  switch (action.type) {
    case 'PLATFORM_UI_BILLING_ELECTRONIC_BALANCE_CHANGE':
      return $$state.merge(action.payload)
    case 'PLATFORM_UI_BILLING_ELECTRONIC_BALANCE_UPDATEKEY':
      return $$state.set('focusedProductUid', action.payload)
    default:
      return $$state
  }
}


// 重称: reWeigh
export function reWeigh() {
  return (dispatch, getState) => {
    const currentState = getState()
    // 当前有focus行并且为可称重商品
    const focusedRow = currentState['product'].get('focusedRow')
    if (_.isNull(focusedRow)) return
    const weigh = getInputWeigh(currentState)
    if (getFromMapOrObject(focusedRow, 'enableWeight')) {
      dispatch(checkBeforeOpenQuantity('Quantity', weigh))
    }
  }
}

// 写入商品行
export function addEnableWeightProduct(product) {
  return (dispatch, getState) => {
    if (product.enableWeight) {
      const currentState = getState()
      const $$electronicBalance = currentState['electronicBalance']
      if (typeof  $$electronicBalance === 'undefined') {
        //cb.utils.alert('PC端暂不开放电子秤')
        return product
      }
      if (!operationConfig.bMatch) {
        cb.utils.alert('本地未适配电子秤')
        return product
      }


      if (operationConfig.keepWeigh) {
        transparentMask.show()
        //dispatch(genAction('PLATFORM_UI_BILLING_ELECTRONIC_BALANCE_UPDATEKEY', `${product.key.replace(/_\d+/, '')}`))
        dispatch(genAction('PLATFORM_UI_BILLING_ELECTRONIC_BALANCE_UPDATEKEY', product.product + '|' + product.productsku))
        product.fQuantity = 0
        product.fQuoteMoney = 0
        product.fMoney = 0
        return product
      } else {
        product.fQuantity = getInputWeigh(currentState)
        product.fQuoteMoney = product.fQuantity * product.fQuotePrice;
        product.fMoney = product.fQuantity * product.fPrice;
        return product
      }
    }
  }
}


export function electronicBalanceChange({tare, weigh} = {}) {


  return (dispatch, getState) => {
    // 页面示数区展现
    dispatch(genAction('PLATFORM_UI_BILLING_ELECTRONIC_BALANCE_CHANGE', {
      tare: getFixedNumber(tare, 'quantitydecimal'),
      weigh: getFixedNumber(weigh, 'quantitydecimal')
    }))

    // 前端页面处理逻辑

    const currentState = getState()

    // 当前有focus行并且为可称重商品
    const focusedRow = currentState['product'].get('focusedRow')
    if (_.isNull(focusedRow)) return


    if (getFromMapOrObject(focusedRow, 'enableWeight')) {

      if (operationConfig.keepWeigh) {
        // 可连续称重模式下 写入

        //  dispatch(checkBeforeOpenQuantity('Quantity', getInputWeigh(currentState)))
      } else {
        // 非可连续称重模式下为零状态写入
        if (getFromMapOrObject(focusedRow, 'fQuantity') == 0) {
          // 600ms内只执行一次
          if (window._billing_writeWeigh) {
            clearTimeout(window._billing_writeWeigh)
          }
          window._billing_writeWeigh = setTimeout(() => {
            window._billing_writeWeigh = null
            dispatch(checkBeforeOpenQuantity('Quantity', getInputWeigh(currentState)))
          }, 600)
        }
      }
    }
  }
}

// 获取实际写入到商品行的重量
// 根据订单状态决定正负
function getInputWeigh(currentState) {
  const weigh = currentState['electronicBalance'].get('weigh')
  const billingStatus = currentState['uretailHeader'].get('billingStatus')
  const backBill_checked = currentState['product'].get('backBill_checked')
  switch (billingStatus) {
    case "PresellBack":/*退订*/
    case "FormerBackBill":/*原单退货*/
    case "OnlineBackBill":/*电商退货*/
      return Number(getFixedNumber(0 - weigh, 'quantitydecimal'))
    case "NoFormerBackBill":/*非原单退货*/
      if (!!backBill_checked) {
        return Number(getFixedNumber(0 - weigh, 'quantitydecimal'))
      }
    default:
      return Number(getFixedNumber(weigh, 'quantitydecimal'))
  }
}

export function getFromMapOrObject(source, name) {
  if (source['@@__IMMUTABLE_MAP__@@']) {
    //if (Immutable.isImmutable(source)) {
    return source.get(name)
  }
  return source[name]
}


// 连续称重模式下的遮罩

class TransparentMask {
  constructor(focusedElementClassName, onHide) {
    this.focusedElementClassName = focusedElementClassName
    // 初始化响应区域

    this.onHide = onHide
    this.createMask()
  }


  createMask = () => {

    this.mask = document.getElementById('billing-TransparentMask')
    if (!this.mask) {
      this.mask = document.createElement('div')
      this.mask.setAttribute('id', 'billing-TransparentMask')
      document.body.appendChild(this.mask)
    }
    this.handler = addEventListener(this.mask, 'click', this.maskOnClick)
  }

  show = () => {
    this.mask.classList.add('show')

  }
  hide = () => {
    this.mask.classList.remove('show')
    if (typeof this.onHide === 'function') {
      this.onHide()
    }
  }
  destroy = () => {
    this.handler && this.handler.remove()
  }

  // 计算当前选中商品的可视坐标范围
  calculateRect = () => {
    let rect = {
      clientX: [0, 0],
      clientY: [0, 0]
    }
    const focusedElementCollect = document.getElementsByClassName(this.focusedElementClassName)
    const focusedElement = focusedElementCollect && focusedElementCollect[0]
    if (focusedElement) {
      const focusedRect = focusedElement.getBoundingClientRect()
      rect = {
        clientX: [focusedRect.left, focusedRect.left + focusedRect.width],
        clientY: [focusedRect.top, focusedRect.top + focusedRect.height],
      }

      return rect

    }
  }

  maskOnClick = (e) => {
    const rect = this.calculateRect()
    if (_.every(rect, (range, coordinateName) => {
        return e[coordinateName] > range[0] && e[coordinateName] < range[1]
      })) {
      this.hide()

    } else {
      cb.utils.alert('请先确认称重商品', 'error')
    }
  }
}


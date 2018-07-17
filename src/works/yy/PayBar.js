/*
 支付栏结算

	需求：
 	- 输入只有金额
	- 不考虑订单状态
	- 不需要validate
	- 取开单参数里面的金额小数位，找零限额?等
	- 输出最后结算

1. 取结算方式
2. 渲染支付栏
3. 组织结算弹层
*/


/*
*
* 顶层container PayBar管理status
* 快捷，默认，结算弹层 木偶组件
*
*
* */


/*todo
* shouldComponenntUpdate进行优化
*
* */

import _ from 'lodash'
import Immutable from 'immutable'
import classnames from 'classnames'
import React, {Component, PureComponent} from 'react'
import PropTypes from 'prop-types'
import {Button, Modal, Tabs, Spin} from 'antd'
import SvgIcon from 'SvgIcon'
import {connect} from 'react-redux';

import {genAction, proxy, getRoundValue} from 'yxyweb/common/helpers/util'
import InputButtonPanel from 'src/common/components/billing/Pay/InputButtonPanel'
import ModalLight from 'yxyweb/common/components/common/ModalLight'
import {openLoadingModal, paymentIconDict, showSuccessModal} from "src/common/components/SettleCommon"
import {usepos, refundorcancel, opencashdrawnocheck} from 'src/common/redux/modules/billing/localNode'

const TabPane = Tabs.TabPane


export function getFixedNumber(value, name) {
  name = name || 'amountofdecimal'
  const precision = _.get(cb.rest.AppContext.option, name)
  value = isNaN(value) ? 0 : value
  // 参数错误的时候, 返回原值
  if (isNaN(precision)) {
    return value
  }
  return getRoundValue(value, precision)
}

function noop() {
}


/*
* 快捷收款和普通收款 校验通用部分
*
* 应收小于0时，只能使用1，9两种支付方式
*
* @param {iterator} 使用的结算方式集合迭代器
* @param {Number | String} 应收金额
* */
function commonValidate(paymentsIterator, money) {
  if (Number(money) < 0) {
    for (const payment of paymentsIterator) {
      if (payment.value != 0) {
        if (!(payment.paymentType == 1 || payment.paymentType == 9)) {
          cb.utils.alert(`应收金额小于0时不能使用${payment.name}`, 'error')
          return false
        }
      }
    }
  }
  return true
}

// 组织数据
function rebuildData(selectedRows, pays, change, addBillData, extraData) {
  // 重组pays数据

  const gatheringVouchDetail = []
  let changeExited = false
  _.forEach(pays, p => {
    if (change > 0 && p.paymentType == 1 && !changeExited) {
      changeExited = true
      p.change = change
      // 如果有现金支付且存在找零 增加一条找零数据
      if (change > 0) {
        gatheringVouchDetail.push({
          "_status": "Insert",
          "iPaymentid": p.paymethodId,
          "iPaytype": p.paymentType,
          "iPaymentid_name": p.name,
          "fMoney": 0 - change,
          "bIsChange": true
        })
      }
    }

    gatheringVouchDetail.push({
      "_status": "Insert",
      "iPaymentid": p.paymethodId,
      "iPaytype": p.paymentType,
      "fMoney": p.value,
      "iPaymentid_name": p.name,
      // "iOrder": p.order,
      ...(_.pick(p,
        ['authCode',//支付宝, 微信, 储值卡
          //  'pwd', // 储值卡
          'backUrl', // 储值卡回调参数
          'gatheringvouchPaydetail', // 畅捷支付
          'order'
        ]))
    })
  })

  let iCustomerid, iMemberid
  const rm_retailvouch = _.map(selectedRows, row => {
    iCustomerid = row.iCustomerid
    iMemberid = row.iMemberid
    return _.pick(row, [
      "id",
      "fMoneySum",
      "fMoneyPaySum",
      "iMemberid",
      "iCustomerid"
    ])
  })
  return {
    rm_retailvouch,
    "rm_gatheringvouch": {
      iCustomerid,
      iMemberid,
      "iGathtype": 3,
      "bHang": false,
      "_status": "Insert",
      ...addBillData,
      ...extraData,
      "gatheringVouchDetail": _.map(_.sortBy(gatheringVouchDetail, p => {
        // 找零放在最后
        if (p.bIsChange) return Infinity
        // 按照页面支付顺序排列
        return typeof p.order !== 'undefined' ? p.order : -1
      }), (item, i) => {
        item.iOrder = i
        return item
      })
    }
  }
}


function sendSave(selectedRows, pays, fGatheringMoney, change, callback) {
  return (dispatch, getState) => {
    const user = getState()['user'].toJS()
    const currentStore = _.find(user.userStores, store => store.store == user.storeId)
    const extraData = {
      fGatheringMoney,
      store: user.storeId,
      store_name: currentStore.store_name,
      cStoreCode: currentStore.store_code,
      iGradeid: user.gradeId,
    }
    proxy({
      url: 'bill/add',
      method: 'POST',
      params: {
        billnum: "rm_gatheringvouch"
      }
    }).then(data => {
      if (data.code == 200) {
        proxy({
          url: 'bill/owepaysave',
          method: 'POST',
          params:

            rebuildData(
              selectedRows,
              pays,
              change,
              _.pick(data.data, [
                'createDate',
                'createTime',
                'creator',
                'vouchdate'
              ]),
              extraData)


        })
          .then(callback)
      } else {
        cb.utils.alert(data.message, 'error')
      }
    })
  }
}

async function setInfoInOrder(paymentsIterator) {
  const finalPayments = []
  for (const payment of paymentsIterator) {

    if (payment.value && payment.value != 0) {
      const result = await handlePayment(payment)
      if (result.status) {
        finalPayments.push(result.data)
      } else {
        return {
          status: false
        }
      }
    }
  }

  return {
    status: true,
    data: finalPayments
  }
}


function handlePayment(payment, isQuickPay) {
  switch (payment.paymentType) {
    // 支付宝,微信，储值卡和收钱吧结账时, 调用弹出框
    case  3:
    case '3':
    case  4:
    case  '4':
    case  10:
    case  '10':
      return getCodeFromModal({payment}).then(function (result) {
        //
        if (result.status) {
          payment.authCode = result.code
        } else {
          cb.utils.alert(result.message, 'error')
        }

        return Promise.resolve({
          status: result.status,
          data: payment
        })

      })
    case  5:
    case  '5':
      return getCodeFromModal({payment, isQuickPay, inputType: 'text'}).then(function (result) {
        if (result.status) {
          payment.authCode = result.code
          payment.backUrl = `${location.origin}/uniformdata/thirdparty/member/cardcallback?token=${cb.rest.AppContext.token}`
        } else {
          cb.utils.alert(result.message, 'error')
        }
        return Promise.resolve({
          status: result.status,
          data: payment
        })
      })

    case 6:
    case '6':
    case 7:
    case '7':
    case 8:
    case '8':
      return changjiePay({payment, isQuickPay}).then(function (result) {

        if (result.status) {
          payment.gatheringvouchPaydetail = result.code
        } else {
          cb.utils.alert(result.message + ' 开始执行本地支付回滚', 'error')

        }

        return Promise.resolve({
          status: result.status,
          data: payment
        })

      })
    default:
      return Promise.resolve({
        status: true,
        data: payment
      })
  }
}


// 支付宝,微信和储值卡结账时, 调用弹出框
function getCodeFromModal({payment, inputType = 'password'} = {}) {

  // 付款弹窗
  return new Promise(function (resolve) {
    let inputRef, clearIconRef
    const modal = ModalLight({
      className: 'billing-settle-barInputModal',
      onPressEnter: () => {
        const v = _.trim(inputRef['value'])
        if (v !== '') {
          modal.destroy()
          /*  setTimeout(() => {
              resolve({
                status: true,
                code: v
              })
            }, 200)*/


          resolve({
            status: true,
            code: v
          })

        } else {
          /* cb.utils.alert({
             type: 'warning',
             title: '请输入或扫描二维码'

           })*/
          resolve({
            status: false,
            message: '请输入或扫描二维码'
          })
        }


      },
      onPressEsc: () => {
        resolve({
            status: false,
            message: `支付方式: ${payment.name}失败`
          }
        )
      },
      maskClosable: false,
      keyboard: false,
      closable: false,
      // 储值卡结账时显示为密码框
      content: (<div>

        <div className="pay-logo">
          <SvgIcon type={paymentIconDict[payment.paymentType]}/>

        </div>
        <div className="pay-logo-title">{payment.name}支付</div>
        <div className="pay-input-count">

            <span>
              <input
                ref={input => {
                  inputRef = input
                  //
                  input && setTimeout(() => {
                    inputRef.focus()
                  }, 100)
                }}
                autoComplete="new-password"
                type={inputType}
                onChange={(e) => {
                  if (_.trim(e.target.value) === '') {
                    clearIconRef.style.display = 'none'
                  } else {
                    clearIconRef.style.display = 'block'
                  }
                }}/>
                  <i ref={clearIcon => clearIconRef = clearIcon} onClick={(e) => {
                    clearIconRef.style.display = 'none'
                    inputRef['value'] = ''
                    inputRef.focus()
                  }} className="anticon anticon-shurukuangshanchu ant-input-search-icon"/>
                  </span>


        </div>
        <div className="pay-footer-btn">
          <button
            type="button"
            className="ant-btn ant-btn-lg" onClick={() => {
            modal.destroy()
            resolve({
                status: false,
                message: `支付方式: ${payment.name}失败`
              }
            )

          }}>取消
          </button>
          <button
            type="button"
            className="ant-btn ant-btn-primary ant-btn-lg" onClick={() => {
            const v = _.trim(inputRef['value'])
            if (v !== '') {
              modal.destroy()
              setTimeout(() => {
                resolve({
                  status: true,
                  code: v
                })
              }, 200)
            } else {
              resolve({
                status: false,
                message: '请输入或扫描二维码'
              })
            }
          }}>确定
          </button>
        </div>
      </div>),
    })
  })
}

function changjiePay({payment} = {}) {

  return new Promise(function (resolve) {
    //todo  加载...
    usepos({
      balatype: payment.paymentType,
      balamoney: payment.value
    }).then(json => {
      if (json.code == 200) {
        resolve({
          status: true,
          code: [json.data],
          //   keyPath: [payment.paymethodId, 'gatheringvouchPaydetail'],

        })
      } else {
        resolve({
          status: false,
          message: json.message
        })
      }

    }, error => {
      resolve({
        status: false,
        message: '调用pos机失败'
      })
    })
  })
}


// 畅捷支付三种方式只能存在一种
//
// disabled状态
function getTabDisableStatus(payment, paymodes) {
  const changjiePays = [6, 7, 8]
  if (_.indexOf(changjiePays, Number(payment.paymentType)) < 0) {
    return false
  }

  const useChangejiePay = _.filter(paymodes, item => {
    return _.indexOf(changjiePays, Number(item.paymentType)) >= 0
  })

  if (_.some(useChangejiePay, item => {
      return !!item['show']
    })) {
    return !payment.show
  }

  return false
}

class PaymentTabs extends PureComponent {


  renderTabs(pay) {
    const nameExceed = pay['name'].length > 6
    let typeName = false
    if (pay.isDefault) {
      typeName = <div className='pay-style-DefaultType'>
        <SvgIcon type="moren"/>
      </div>
    } else if (pay.isQuick) {
      typeName = <div className='pay-style-QuickPayType'></div>
    }
    const content = (<div className={classnames({
      'pay-style': true,
      'payment-style-nameExceed': nameExceed,
    })}>
      {typeName}
      <SvgIcon type={paymentIconDict[pay.paymentType] || 'tongyongzhifufangshi'} className={classnames({
        'payment-style-smallIcon': pay.paymentType == 3 || pay.paymentType == 4,
      })}/>
      <div className="payment-style-title">{pay.name}</div>
    </div>)

    return <TabPane tab={content} key={pay.paymethodId}/>

  }

  render() {
    const {payments, currentFocus, onTabsClick} = this.props
    return <Tabs
      hideAdd
      onChange={onTabsClick}
      activeKey={currentFocus + ''}
      animated={false}
      className="billing-pay-tab"
    >
      {/*支付方式显示排序，默认 > 快捷 > 普通*/}
      {_.map(_.sortBy(payments, pay => {
        if (pay.isDefault) return -2
        if (pay.isQuick) return -1
        return 0
      }), this.renderTabs)}
    </Tabs>
  }
}

class SettleModal extends Component {
  constructor(props) {
    super(props)
    this.state = this.getStateFromProps(props)
  }

  // 实收
  receipts = 0
  static propTypes = {
    defaultPId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    money: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    visible: PropTypes.bool,
  }
  static  defaultProps = {
    visible: false,
    defaultPId: '-1',
    money: 0
  }

  getStateFromProps(props) {
    const {defaultPId, money} = props
    const rePayments = new Map()
    _.forEach(props.payments, pay => {
      const p = {...pay, value: 0}
      if (pay.paymethodId == defaultPId) {
        p.value = money
        p.show = true
      }
      rePayments.set(pay.paymethodId, p)
    })


    return {
      currentFocus: defaultPId,
      $$rePayments: Immutable.Map(rePayments)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.visible && nextProps.visible) {
      // 新打开弹层时重置state
      this.setState(this.getStateFromProps(nextProps))
    }
  }

  componentDidUpdate(prevProps) {

    if (!prevProps.visible && this.props.visible) {
      this.setFocusAndSelection(this.props.defaultPId)
    }
  }

  componentDidMount() {

  }


  setFocusAndSelection = (index) => {
    setTimeout( () =>{
      const input = this[`input${index}`]
      input.focus()
      setTimeout(function () {
        input.setSelectionRange(0, input.value.length)
      }, 0)
    }, 0)
  }


  shouldComponentUpdate(nextProps, nextState) {

    /*if (!this.props.visible && !nextProps.visible && Imutable.is(this.state.$$rePayments, nextState.$$rePayments)) {
      return false
    }
    return true*/


    return this.props.visible || nextProps.visible || !Immutable.is(this.state.$$rePayments, nextState.$$rePayments)

  }


  update$$RePayments = (id, obj) => {
    id = id + ''
    const {$$rePayments} = this.state
    console.log($$rePayments.update(id, p => _.assign(p, obj)).toJS())
    this.setState({
      $$rePayments: $$rePayments.update(id, p => _.assign(p, obj))
    })
  }


  onPanelChange = (value) => {
    const id = this.state.currentFocus
    this.update$$RePayments(id, {
      value
    })
  }

  // 渲染'找零'
  /*  getChangeValue(iterator, money, receipts) {
      let cashInUse = false
      for (const pay of iterator) {
        if (pay.paymentType == 1 && pay.value > 0) {
          cashInUse = true
        }
      }
      if (cashInUse && (receipts - money > 0)) {
        return getFixedNumber(receipts - money)
      }
      return 0
    }*/

  validate(money, receipts, change, iterator) {
    // 获取可找零金额
    let maxzerolim = _.get(cb.rest.AppContext.option, 'maxzerolim')
    if (isNaN(maxzerolim)) {
      cb.utils.alert('未设置最大可找零金额', 'error')
      return false
    } else {
      maxzerolim = getFixedNumber(maxzerolim)
    }

    //现金有在使用时校验找零状态
    if (change - maxzerolim > 0) {
      cb.utils.alert('找零金额超出限制，最大找零为' + maxzerolim, 'error')
      return false
    }

    // 通用校验
    if (!commonValidate(iterator, money)) {
      return false
    }

    /*   if (change == 0 && money != receipts) {
         cb.utils.alert('应收不等于实收，无法结算', 'error')
         return false
       }*/


    return true

  }


  onSettleBtnClick = () => {
    const {$$rePayments} = this.state
    const {money} = this.props

    //  根据paymentType的值排序决定同步执行的顺序，畅捷支付始终放在最后
    const iterator = $$rePayments.sortBy(rePayment => {
      switch (rePayment.paymentType) {
        case '6':
        case 6:
        case '7':
        case 7:
        case '8':
        case 8:
          return Infinity
        default:
          return 1
      }
    }).values()



    if (this.validate(money, this.receipts, this.change, iterator)) {
      this.handleSettleBtnClick(iterator, this.change)
    }
  }

  handleSettleBtnClick = (iterator, change) => {
    // 重组数据save

    setInfoInOrder(iterator).then(result => {
      if (result.status) {
        this.props.save(result.data, change, this.receipts)
      }
    })
  }

  // 计算实收同时记录找零
  setReceiptsAndChange = ($$rePaymentsSeq, money) => {
    let cashInUse = false, change = 0, receipts
    receipts = getFixedNumber($$rePaymentsSeq.reduce((a, b) => {
      const v = isNaN(b.value) ? 0 : Number(b.value)
      if (b.paymentType == 1 && v > 0) {
        cashInUse = true
      }
      return Number(a) + v
    }, 0))

    if (cashInUse && (receipts - money > 0)) {
      change = getFixedNumber(receipts - money)
    }
    this.change = change
    this.cashInUse = cashInUse

    return this.receipts = receipts
  }


  onTabsClick = (key) => {
    key = key + ''
    const {currentFocus, $$rePayments} = this.state


    // todo 换掉
    const obj = $$rePayments.toJS()
    if (getTabDisableStatus(obj[key], obj)) {
      cb.utils.alert({
        title: '畅捷支付只能使用一种'
      })
      return
    }


    const {money} = this.props

    if (key == currentFocus) return

    // 是否为新增支付方式

    if ($$rePayments.get(key).show) {
      return this.setState({
        currentFocus: key,
      }, () => {
        this[`input${key}`].focus()
      })
    }


    // 新增时添加顺序
    const maxOrder = $$rePayments.valueSeq().maxBy(pay => pay.order || 0).order || 0


    // 是否已经满额
    const isFull = this.payIsFull()

    this.setState({
      currentFocus: key,
      $$rePayments: $$rePayments.mapEntries(([k, v]) => {
        if (v.show) {
          isFull && ( v.value = getFixedNumber(0))
        } else {
          if (v.paymethodId == key) {
            v.order = maxOrder + 1
            v.show = true
            v.value = isFull ? money : getFixedNumber(Number(money) - Number(this.receipts))
          }
        }
        return [k, v]
      })
    }, () => {
      this[`input${key}`].focus()
    })
  }

  // 是否满额
  payIsFull = () => {
    return Number(this.receipts) >= Number(this.props.money)
  }

  handleCancel = () => {
    this.setState({
      visible: false
    })
  }

  render() {
    const {money, payments, visible, onCancel, onSettle} = this.props

    const {currentFocus, $$rePayments} = this.state


    // 应收  money
    const $$rePaymentsSeq = $$rePayments.valueSeq()

    // 实收
    const receipts = this.setReceiptsAndChange($$rePaymentsSeq, money)

    const that = this


    return <Modal
      wrapClassName="billing-settle-modal-wrap"
      maskClosable={false}
      visible={visible}
      //title="支付"
      closable={!onSettle}
      width="846px"
      //onOk={this.handleSettle}
      onCancel={onCancel}
      footer={null}>
      {/*tip*/}
      <Spin spinning={onSettle}>
        <div>
          <div className='pay-body'>
            <div className="clearfix">
              <PaymentTabs
                payments={payments}
                currentFocus={currentFocus}
                onTabsClick={this.onTabsClick}
              />
            </div>
            <div className="clearfix">
              <div style={{width: '400px', float: 'left'}} className="pay-list">
                <div>
                  <div className="pay-style-list">
                    <div className="pay-title">
                      <span>结算方式</span>
                      <span className="fr">金额</span>
                    </div>
                    <div className="empty-scroll">
                      <div className="pay-style-list-num">
                        {
                          $$rePaymentsSeq.sortBy(pay => {
                            return pay.order || 0
                          }).map(pay => {
                              const id = pay['paymethodId']
                              return <div key={id} style={{'display': pay.show ? 'block' : 'none'}}>

                                <span className="payment-name-list">{pay.name}</span>
                                <span className="fr empty"/>
                                <span className="fr pay-close-btn"
                                      onClick={() => {
                                        //   this.handlePaymode('delete', paymode, index)
                                        this.update$$RePayments(id, {
                                          value: 0,
                                          show: false
                                        })
                                      }}>
                                <i className="anticon anticon-delete pay-delect-margin"/>
                              </span>
                                <span className="fr">
                                <input
                                  ref={(input) => {
                                    that[`input${id}`] = input
                                  }}
                                  onBlur={e => {
                                    // 失去焦点时确认精度
                                    this.update$$RePayments(id, {
                                      value: getFixedNumber(e.target.value)
                                    })
                                  }}
                                  onFocus={() => {
                                    id != currentFocus && this.setState({currentFocus: id})
                                  }}
                                  value={pay.value}
                                  onChange={e => {
                                    this.update$$RePayments(id, {
                                      value: e.target.value
                                    })
                                  }}/>
                              </span>
                              </div>
                            }
                          )

                        }


                      </div>
                    </div>
                  </div>
                  <div className="pay-total">
                    < div>< span> 应收 </span><span>{money}</span></div>
                    <div><span>实收</span><span>{receipts}</span></div>
                    {this.cashInUse && <div className="pay-zl">
                      <span> 找零 </span>
                      <span>{this.change}</span>
                    </div>}
                  </div>
                </div>
              </div>
              <div style={{width: '310px', float: 'right'}}>
                <InputButtonPanel onChange={this.onPanelChange}/>
                <Button type='primary' onClick={this.onSettleBtnClick}
                        disabled={onSettle}
                        className="checkout">结算</Button>
                <div>
                </div>
              </div>
            </div>
            <div>
            </div>
          </div>
        </div>
      </Spin>
    </Modal>
  }
}

class PayBar extends Component {
  constructor(props) {
    super(props)
  }

  state = {
    paySettle: {},
    payments: null,
    defaultPId: 0,
    modalVisible: false,
    onSettle: false
  }

  componentDidMount() {
    this.getPayFunctionKeys()
  }


  // 获取结算方式
  getPayFunctionKeys = () => {
    proxy({
      url: 'billTemplateSet/getBelongTemplate',
      method: 'GET'
    }).then(json => {
      if (json.code != 200) {
        cb.utils.alert(json.message, 'error')
      } else {
        // 遍历重组数据格式
        // 分组, paySettle: 普通支付触发按钮, payments: 所有的支付方式
        // 默认支付方式的id: defaultPId
        let paySettle, payments = [], defaultPId, backupCashPId
        _.forEach(json.data.payFunctionKeys, item => {
          if (item.command === 'PaySettle') {
            paySettle = item
          } else {
            // 赊销收款过滤掉会员储值支付方式
            if (item.paymentType != 5) {
              payments.push(item)
              if (item.isDefault) {
                defaultPId = item.paymethodId
              }
            }

            // 备份现金的id
            if (item.paymentType == 1) {
              backupCashPId = item.paymethodId
            }


          }
        })

        // 如果系统设置会员储值为默认的支付方式， 改为现金
        defaultPId = defaultPId || backupCashPId

        this.setState({
          paySettle,
          payments,
          defaultPId
        })
      }
    })
  }

  /*
  * @param data {Array}  使用的结算方式集合
  * @param change {Number|String}找零
  * @param fGatheringMoney {Number|String}实际支付总金额
  * @param isQuickPay {Boolean}
  * */
  save = (data, change, fGatheringMoney, isQuickPay) => {

    const that = this
    let loadingModal
    if (isQuickPay) {
      loadingModal = openLoadingModal()
    }
    this.setState({
      onSettle: true
    }, () => {
      this.props.dispatch(sendSave(this.props.selectedRows, data, fGatheringMoney, change, r => {
        const partState = {
          onSettle: false
        }
        loadingModal && loadingModal.destroy()
        if (r.code == 200) {
          partState.modalVisible = false
          this.props.afterSave()
          showSuccessModal({
            receivable: this.props.money,//应收
            receipts: fGatheringMoney,//实收
            change
          })


          // 开钱箱
          /*

                     if (this.shouldOpenCash(lastPaymodes)) {
                      if (window.plus) {
                        plus.JavaToJs.HardwareInterface('opencashbox');
                      } else {
                        opencashdrawnocheck().then(json => {
                          if (json.code == 200) {
                            console.log('打开钱箱成功')
                          } else if (json.code == 500) {
                            // 未接钱箱
                            console.log('本地未接钱箱')
                          } else {
                            // code == '999'
                            cb.utils.alert({
                              title: json.message,
                              content: '打开钱箱失败',
                              type: 'error'
                            })
                          }
                        })
                      }
                    }*/


        } else {

          cb.utils.alert(r.message, 'error')

          /*  整单失败时使用畅捷支付（收款结算业务存在<=1个畅捷支付）的需要本地退款
           *  发送请求前有过重新排序，始终把畅捷支付放在最后一个， 所以这里只用判断最后一个是否为畅捷支付就可以
           *
           * */
          const lastPayment = data[data.length - 1]
          if (lastPayment.paymentType == 6 || lastPayment.paymentType == 7 || lastPayment.paymentType == 8) {
            refundorcancel({
              balamoney: lastPayment.value,
              orderid: _.get(lastPayment, 'gatheringvouchPaydetail.0.orderid')
            }).then(json => {
              if (json.code == 200) {
                cb.utils.alert('畅捷支付退款成功')
              } else {
                cb.utils.alert('畅捷支付退款失败', 'error')
              }
            })
          }


        }
        that.setState(partState)
      }))
    })
  }


  settlePayClick = () => {
    const modalVisible = this.state.modalVisible
    !modalVisible && this.setState({modalVisible: true})
  }

  handleCancel = () => {
    this.setState({
      modalVisible: false
    })
  }


  render() {
    const {
      paySettle,
      payments,
      defaultPId,
      modalVisible,
      onSettle
    } = this.state

    const {money} = this.props

    const disable = onSettle || money == 0

    return <div className="sell_credit_paybar">
      <QuickPay
        disable={disable}
        payments={_.filter(payments, p => p.isQuick)}
        save={this.save}
        money={money}
      />
      <SettlePay
        disable={disable}
        onClick={this.settlePayClick}
        paySettle={paySettle}
      />
      {/*获取到数据后再初始化结算弹层*/}
      {payments &&
      <SettleModal
        onSettle={onSettle}
        onCancel={this.handleCancel}
        money={money}
        visible={modalVisible}
        payments={payments}
        defaultPId={defaultPId}
        save={this.save}

      />}
    </div>
  }
}


class QuickPay extends PureComponent {
  static propTypes = {
    disable: PropTypes.bool,
    onClick: PropTypes.func
  }
  static  defaultProps = {
    disable: false,
    onClick: noop,
  }


  handleClick = (payment) => {
    setInfoInOrder([_.extend({value: this.props.money}, payment)]).then(result => {
      if (result.status) {
        // 快捷支付不存在找零
        // 标记使用的快捷支付方式， 用于渲染不同的loading
        this.props.save(result.data, 0, this.props.money, true)
      }
    })
  }

  render() {
    const {payments, disable} = this.props
    return <div className="sell_credit_paybar_method">

      {_.map(payments, item => {
        return <Button
          key={item.paymethodId} onClick={() => {
          if (disable) return
          this.handleClick(item)
        }}
          disabled={disable}
          className={classnames("cash-Settlement", `billing-touch-button-quickPay`)}>
          <SvgIcon type={paymentIconDict[item.paymentType] || 'tongyongzhifufangshi'}/>
          <div className="pay-title">{item.name}</div>
        </Button>
      })}
    </div>
  }
}

class SettlePay extends PureComponent {
  static propTypes = {
    disable: PropTypes.bool,
    onClick: PropTypes.func,
    paySettle: PropTypes.object,
  }
  static  defaultProps = {
    disable: false,
    onClick: noop,
    paySettle: {}
  }

  render() {
    const {paySettle, disable, onClick} = this.props
    return <div className="sell_credit_paybar_btn">
      <Button
        className={classnames(`billing-touch-button-defaultSettle`)}
        key="settle"
        type="pay"
        onClick={onClick}
        disabled={disable}>{paySettle.name}</Button>
    </div>
  }
}


function mapDispatchToProps(dispatch) {
  return {
    dispatch
  }
}


export default connect(null, mapDispatchToProps)(PayBar)


// iMemberid    会员id
//  iCustomerid  客户id




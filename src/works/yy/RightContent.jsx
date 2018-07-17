import React, {Component} from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {Button, Modal, Input, Tabs, Checkbox, message, Spin} from 'antd'
import _ from 'lodash'
import SvgIcon from 'SvgIcon'
import InputButtonPanel from 'src/common/components/billing/Pay/InputButtonPanel'
import {
  updatePaymode,
  addCard,
  shortcutSettle,
  ConfigOptions,
  getFixedNumber
} from 'src/common/redux/modules/billing/paymode'
import {toggleLoadingStatus} from 'yxyweb/common/redux/loading'
import {usepos, refundorcancel, opencashdrawnocheck} from 'src/common/redux/modules/billing/localNode'
import * as paymodeActions from 'src/common/redux/modules/billing/paymode'
import * as reserveActions from 'src/common/redux/modules/billing/reserve'
import {save, getOptions} from 'src/common/redux/modules/billing/mix'
import ModalLight from 'yxyweb/common/components/common/ModalLight'

import classnames from 'classnames'
import Shortcut from 'src/common/components/billing/shortcut'
import env from 'yxyweb/common/helpers/env';


// view层公共方法
import {validateSettle, cbError, openLoadingModal, paymentIconDict, showSuccessModal} from "src/common/components/SettleCommon"


const TabPane = Tabs.TabPane


let loadingModal

function refundorcancelfrompos(i, paymodes) {
  return new Promise(function (resolve, reject) {
    refundorcancel({
      balamoney: 0 - paymodes[i].fMoney,
      orderid: _.get(paymodes[i], 'gatheringvouchPaydetail.0.cVoucherCode')
    }).then(json => {
      if (json.code == 200) {
        resolve()
      } else {
        cbError(`${paymodes[i].iPaymentid_name}退款失败, 金额为${0 - paymodes[i].fMoney}, ${json.message}`)
        reject()
      }
    })
  })
}


async function refundorcancelInOrder(paymodes) {
  for (let j = 0; j < paymodes.length; j++) {
    await refundorcancelfrompos(j, paymodes)
  }
}


export class RightContent extends Component {
  constructor(props) {
    super(props)
    this.shortcut = false
    this.state = {
      isMounted: false
    }
    this.validateSettle = validateSettle.bind(this)
  }


  componentDidMount() {
    this.setState({
      isMounted: true
    })
    this.props.reserveActions.getDefaultBusinessType(1);
    this.props.reserveActions.getRegion();

  }

  initShortcut = () => {
    const that = this
    const shortcutArr = this.props.paymode.shortcutArr
    that.sc = new Shortcut({
      container: document.getElementsByClassName('billing-settle-modal-wrap')[0]
    })

    that.sc.add(_.map(shortcutArr, item => {
      return {
        shortCut: item.hotKeyExec,
        callback: () => {
          console.log(item.command)
          if (item.command === 'PaySettle') {
            that.props.paymodeActions.finalSettle()
          } else {
            that.props.paymodeActions.togglePaymentType(item.paymethodId)
          }
        },
        getEnableState() {
          return true
        }
      }
    }))
    that.shortcut = true

  }

  componentWillUnmount() {
    this.sc && this.sc.destroy()
  }

  componentWillReceiveProps(nextProps) {
    // 最终结算
    if (nextProps.paymode.finalSettle !== this.props.paymode.finalSettle) {
      this.handleSettle()
    }
  }

  componentDidUpdate(prevProps) {

    if (prevProps.paymode.shortCutToggle !== this.props.paymode.shortCutToggle) {
      this.onTabsClick(this.props.paymode.shortCutToggle)
    }

    // 默认结算
    if (!prevProps.paymode.visible && this.props.paymode.visible) {
      this.setFocusAndSelection(this.props.paymode.currentFocus)
    }
    // 快捷结算
    if (prevProps.paymode.shortCutOpen !== this.props.paymode.shortCutOpen) {
      this.handleSettle('quickPay')
    }


    if (this.props.paymode.visible && !this.shortcut) {
      this.initShortcut()
    }


  }



  shouldOpenCash = (paymodes) => {
    // 使用现金'1'或者其他'9'支付方式时， 开钱箱
    return _.some(paymodes, paymode => {
      if (paymode.paymentType == 1 || paymode.paymentType == 9) {
        return paymode.show && Number(paymode['value']) !== 0
      }
      return false
    })

  }

  handleSave = () => {
    const {billingStatus, infoData: {iOwesState = 0}} = this.props.uretailHeader
    const {paymodes} = this.props.paymode
    const lastPaymodes = _.cloneDeep(paymodes)
    // 结算调用接口前保存此单的数据
    let lastBill = _.pick(this, [
      'receivable',//应收
      'receipts',//实收

    ])
    lastBill.billingStatus = billingStatus
    lastBill.change = this.getChangeValue()



        // 判断是否为预订状态， 设定预订金额
    if (billingStatus === 'PresellBill') {
      this.props.paymodeActions.setPresellMoney(Math.min(this.receipts, this.receivable))
    } else {
      // 赊销状态, 修改金额使表头表体一致（为了后台校验通过  ^-.-^）
      if (iOwesState == 1) {
        if (Math.abs(lastBill.receipts) < Math.abs(lastBill.receivable)) {
          this.props.paymodeActions.setPresellMoney(_.minBy([Number(this.receipts), Number(this.receivable)], Math.abs))
        }
      }
    }




    setTimeout(() => {
      // return
      this.props.save(() => {
        //hide()
        // 存放完成的订单
        localStorage.setItem('billing_lastBill', JSON.stringify(lastBill))
        this.props.paymodeActions.closePaymodal(true)
        this.props.paymodeActions.toggleSettleStatus(false)
        setTimeout(() => {

          if (loadingModal) {

            loadingModal.destroy()
            loadingModal = null
          }
          showSuccessModal(lastBill)

          // 使用现金'1'或者其他'9'支付方式时， 开钱箱  finally
          if (this.shouldOpenCash(lastPaymodes)) {
            if (process.env.__CLIENT__ && env.INTERACTIVE_MODE !== 'touch') {
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
            } else {
              if (window.plus) plus.JavaToJs.HardwareInterface('opencashbox');
            }
          }
        }, 0)
      }, msg => {
        this.props.paymodeActions.toggleSettleStatus(false)

        if (loadingModal) {
          loadingModal.destroy()
          loadingModal = null

          // 快捷支付失败时恢复状态
          this.props.paymodeActions.closePaymodal(false)
        }

        cb.utils.alert({
          title: msg,
          type: 'error'
        })

        let promises = []
        // todo 错误处理 根据状态码回退或者撤销相关支付方式


        // 过滤出在使用的支付方式
        _.forEach(_.filter(paymodes, 'show'), paymode => {

          const paymentType = paymode.paymentType
          if (paymentType == 3 || paymentType == 4) {
            // todo 银联卡


          } else if (paymentType == 6 || paymentType == 7 || paymentType == 8) {
            // 畅捷支付
            promises.push(refundorcancel({
              balamoney: paymode.value,
              orderid: _.get(paymode, 'gatheringvouchPaydetail.0.orderid')

            }))
          }
        })
        Promise.all(promises).then(dataArr => {
          //todo 撤销成功
          _.forEach(dataArr, json => {
            if (json.code == 200) {
              cb.utils.alert('畅捷支付退款成功')
            } else {
              cbError('畅捷支付退款失败')
            }
          })

        }, err => {
          cbError(err)
        })

      })
    })


  }

  // 支付宝,微信和储值卡结账时, 调用弹出框
  inputConfirm = (paymode, isQuickPay) => {
    const that = this
    const isStoredValueCard = paymode.paymentType == 5
    // 退款
    if (this.receivable <= 0) {
      return Promise.resolve()
    }
    // 付款弹窗
    return new Promise(function (resolve, reject) {
      const modal = ModalLight({
        className: 'billing-settle-barInputModal',
        onPressEnter: () => {
          const v = _.trim(that[`input${paymode.paymethodId}`]['value'])
          if (v !== '') {
            modal.destroy()

            if (isQuickPay) {
              loadingModal = openLoadingModal()
            }

            setTimeout(() => {
              resolve({
                // keyPath: [paymode.paymethodId, isStoredValueCard ? 'pwd' : 'authCode'],
                keyPath: [paymode.paymethodId, 'authCode'],
                value: v,
                isStoredValueCard
              })
            }, 200)


          } else {

            cb.utils.alert({
              type: 'warning',
              title: '请输入或扫描二维码'

            })

            return Promise.reject()
          }


        },
        onPressEsc: () => {
          reject(`支付方式: ${paymode.name}失败`)
        },
        maskClosable: false,
        keyboard: false,
        closable: false,
        // 储值卡结账时显示为密码框
        content: (<div>

          <div className="pay-logo">
            <SvgIcon type={paymentIconDict[paymode.paymentType]}/>

          </div>
          <div className="pay-logo-title">{paymode.name}支付</div>
          <div className="pay-input-count">

            <span>
              <input
                autoComplete="new-password"
                type={isStoredValueCard ? 'password' : 'text'}
                onChange={(e) => {
                  if (_.trim(e.target.value) === '') {
                    that[`clearIcon${paymode.paymethodId}`].style.display = 'none'
                  } else {
                    that[`clearIcon${paymode.paymethodId}`].style.display = 'block'
                  }
                }}
                ref={input => that[`input${paymode.paymethodId}`] = input}/>
              <i ref={clearIcon => that[`clearIcon${paymode.paymethodId}`] = clearIcon} onClick={(e) => {
                that[`clearIcon${paymode.paymethodId}`].style.display = 'none'
                that[`input${paymode.paymethodId}`]['value'] = ''
                that[`input${paymode.paymethodId}`].focus()
              }} className="anticon anticon-shurukuangshanchu ant-input-search-icon"/>
            </span>


          </div>
          <div className="pay-footer-btn">
            <button
              type="button"
              className="ant-btn ant-btn-lg" onClick={() => {
              modal.destroy()
              reject(`支付方式: ${paymode.name}失败`)

            }}>取消
            </button>
            <button
              type="button"
              className="ant-btn ant-btn-primary ant-btn-lg" onClick={() => {
              const v = _.trim(that[`input${paymode.paymethodId}`]['value'])
              if (v !== '') {
                modal.destroy()

                if (isQuickPay) {
                  loadingModal = openLoadingModal()
                }


                setTimeout(() => {
                  resolve({
                    // keyPath: [paymode.paymethodId, isStoredValueCard ? 'pwd' : 'authCode'],
                    keyPath: [paymode.paymethodId, 'authCode'],
                    value: v,
                    isStoredValueCard
                  })
                }, 200)


              } else {
                cb.utils.alert({
                  type: 'warning',
                  title: '请输入或扫描二维码'
                })
              }
            }}>确定
            </button>
          </div>
        </div>),
      })
      // 扫码框自动聚焦
      setTimeout(() => {
        that[`input${paymode.paymethodId}`].focus()
      }, 100)
    })

  }

  // 畅捷支付（支付宝，微信，银联卡）
  changjiePay = (paymode, isQuickPay) => {
    const that = this
    // 退款
    if (this.receivable < 0) {
      // 新的写法不限数组的长度
      if (paymode.originalSamePaymodes) {
        return refundorcancelInOrder(paymode.originalSamePaymodes)
      } else {
        return new Promise(function (resolve, reject) {
          refundorcancel({
            balamoney: paymode.value,
            orderid: _.get(paymode, 'gatheringvouchPaydetail.0.orderid')
          }).then(json => {
            if (json.code == 200) {
              resolve()
            } else {
              cbError(`${paymodes[i].iPaymentid_name}退款失败, 金额为${0 - paymodes[i].fMoney}, ${json.message}`)
              reject(json)
            }

          })
        })
      }


    }

    // 付款
    if (this.receivable > 0) {
      return new Promise(function (resolve, reject) {
        usepos({
          balatype: paymode.paymentType,
          balamoney: paymode.value
        }).then(json => {
          if (json.code == 200) {
            resolve({
              keyPath: [paymode.paymethodId, 'gatheringvouchPaydetail'],
              value: [json.data]
            })
          } else {
            cbError(`${json.message}`)
            reject(json)
          }

        }, error => {
          reject(error)
        })
      })
    }
    // =0
    return Promise.resolve()

  }


  // 是否使用了现金结算
  isCashUse = () => {
    const {paymodes} = this.props.paymode
    let using = false
    _.forEach(paymodes, pay => {
      if (pay.paymentType == 1 && pay.value > 0) {
        using = true
      }
    })
    return using
  }


// 多种支付方式是同步的
  handleSettle = (arg1) => {
    const isQuickPay = arg1 === 'quickPay'

    const {onSettle} = this.props.paymode
    const {products} = this.props.product
    if (_.isEmpty(products) || onSettle) return

    const that = this

    if (!this.validateSettle()) return
    this.props.paymodeActions.toggleSettleStatus(true)


    const {paymodes} = this.props.paymode
    const addCard = this.props.addCard
    let promises = []
    // 过滤在使用的支付方式并且根据paymentType的值排序决定同步执行的顺序
    const finallyPaymodes = _.sortBy(_.filter(paymodes, paymode => paymode.show && paymode.value != 0), 'paymentType')
    _.forEach(finallyPaymodes, (paymode) => {
      if (paymode.paymentType == 3 || paymode.paymentType == 4 || paymode.paymentType == 5 || paymode.paymentType == 10) {
        promises.push(() => {
          return this.inputConfirm(paymode, isQuickPay)
        })
      } else if (paymode.paymentType == 6 || paymode.paymentType == 7 || paymode.paymentType == 8) {
        promises.push(() => {
          return this.changjiePay(paymode, isQuickPay)
        })
      } else {
        if (isQuickPay) {
          loadingModal = openLoadingModal()
        }
      }
    })


    const finalSave = values => {
      return new Promise((resolve, reject) => {
        if (this.receivable > 0) {
          addCard(values)
        }
        this.handleSave()
        resolve()
      })
    }

    async function setInfoInOrder(promises) {
      let results = []
      try {
        for (let p of promises) {
          const result = await p()

          results.push(result)


        }
        await finalSave(results)
      } catch (e) {
        that.props.paymodeActions.toggleSettleStatus(false)
        that.props.paymodeActions.closePaymodal()
        cb.utils.alert({
          title: '失败， 请重新结算',
          type: 'error'
        })
      }

    }

    setInfoInOrder(promises)


  }


  handleCancel = () => {
    this.props.paymodeActions.closePaymodal()
  }

  handlePaymode = (type, data, index) => {
    //const updatePaymode = this.props.updatePaymode
    const paymodeActions = this.props.paymodeActions

    if (type === 'delete') {

      paymodeActions.deletePaymode(index)
    } else {
      paymodeActions.updatePaymode({
        type,
        data,
        index
      })
    }
  }


  handleChange = (paymode, index, e) => {
    const updatePaymode = this.props.updatePaymode
    updatePaymode({
      type: 'update',
      data: {
        /*
         *  输入校正
         *  只可输入数字和小数点
         *  去除位首多余的0
         *
         * */
        //value: (e.target.value).replace(/([^\d\.])/g, '').replace(/(^0+)(?!\.)/, '')
        //value: (e.target.value).replace(/([^\d\.])/g, '').replace(/^0(\d{1}$)/, '$1')
        value: e.target.value
      },
      index
    })


  }


  onBlur = (paymode, index, e) => {
    const value = e.target.value
    const updatePaymode = this.props.updatePaymode
    updatePaymode({
      type: 'update',
      data: {
        value: getFixedNumber(value)
      },
      index
    })
  }


  onPanelChange = (value) => {
    const index = this.props.paymode.currentFocus
    const updatePaymode = this.props.updatePaymode
    updatePaymode({
      type: 'update',
      data: {
        value
      },
      index
    })
  }


  renderTabs = (pay, k, paymodes) => {
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

      {!nameExceed && (<div className="pay-style-shortcut">{pay.hotKey}</div>)}
    </div>)

    return <TabPane tab={content} key={pay.paymethodId}></TabPane>

  }

  onTabsClick = (key) => {

    const index = key
    const {paymodes} = this.props.paymode
    const paymodeActions = this.props.paymodeActions
    const {billingStatus, infoData} = this.props.uretailHeader
    if (this.getTabDisableStatus(paymodes[index], paymodes)) {
      cb.utils.alert({
        title: '畅捷支付只能使用一种'
      })
      return
    }


    // 预订且“交货时可修改商品”为是，或者预订交货且“交货时可修改商品”为否，不允许使用储值卡结算
    if (_.get(paymodes, [index, 'paymentType']) == 5) {
      // 预订且“交货时可修改商品”为是，不允许使用储值卡结算
      if (billingStatus === 'PresellBill' && infoData.bDeliveryModify === true) {
        cb.utils.alert({
          title: '预订且“交货时可修改商品”为是，不允许使用会员储值结算'
        })
        return
      }


      // 预订交货且“交货时可修改商品”为否，不允许使用储值卡结算
      if (billingStatus === 'Shipment' && infoData.bDeliveryModify === false) {
        cb.utils.alert({
          title: '预订交货且“交货时可修改商品”为否，不允许使用会员储值结算'
        })
        return
      }
    }

    paymodeActions.toggleFocus(index)

    const maxOrder = _.max(_.map(paymodes, pay => pay.order || 0))

    if (paymodes[index]['show']) {
      this.handlePaymode('update', Object.assign({}, paymodes[index], {
        value: paymodes[index].value || getFixedNumber(_.reduce(paymodes, function (a, b) {
          return _.max([Number(a) - Number(b.value || 0), 0])
        }, this.receivable))
      }), index)


    } else {
      //新增支付方式时，判断已有是否满额

      let paymentInUse = [], needClear = false, total = 0
      _.forEach(paymodes, paymode => {
        if (paymode.show) {
          paymentInUse.push(paymode.paymethodId)
          total += Number(paymode.value)
        }
      })


      // 满额清算
      if (Math.abs(total) >= Math.abs(this.receivable)) {
        needClear = true
      }


      const obj = _.map(paymodes, paymode => {

        if (_.indexOf(paymentInUse, paymode.paymethodId) >= 0) {
          // 满额清算
          if (needClear) {
            return _.extend({}, paymode, {value: `${this.receivable >= 0 ? '' : '-'}${getFixedNumber(0)}`})
          }
        }

        if (paymode.paymethodId == index) {
          return _.extend({}, paymode, {
            show: true,
            order: maxOrder + 1,
            value: needClear ? this.receivable : getFixedNumber(this.receivable - total)
          })
        }

        return _.clone(paymode)
      })

      paymodeActions.setPaymodes(obj)

    }
    /*this.handlePaymode('update', Object.assign({}, paymodes[index], {
      order: maxOrder + 1,
      show: true,
      value: paymodes[index].value || '-0.00'
    }), index)*/


    this.setFocusAndSelection(index)
  }

  setFocusAndSelection = (index) => {
    setTimeout(function () {
      const input = document.getElementById(`input${index}`)
      input.focus()


      setTimeout(function () {
        input.setSelectionRange(0, input.value.length)
      }, 0)

    }, 0)
  }


  /* add by jinzh1 预定*/
  onReserve = () => {
    const {reserveActions} = this.props;
    reserveActions.showHeaderInfo();
  }
  getDefineControl = (infoData, data) => {
    let controls = [];
    data.forEach(function (ele) {
      let value = infoData[ele.dataIndex];
      if (typeof (value) == 'object') {
        value = value.name;
      }
      if (value && value != '') {
        controls.push(
          <div key={ele.dataIndex}>
            <span>{ele.cShowCaption}</span><p>{value}</p>
          </div>
        )
      }
    }, this);
    return controls;
  }
  getBillingInfo = () => {
    const {infoData, billingStatus, defineData} = this.props.uretailHeader;
    const defineControl = this.getDefineControl(infoData, defineData);
    return (
      <div className="billing-Info">
        <div className="billing-Info-box">
          <div key="business">
            <span>业务类型</span><p>{infoData.businessType.name}</p>
            <span className="fl-btn"><Button onClick={this.onReserve} icon="edit"></Button></span>
          </div>
          {
            infoData.iCustomerName ?
              <div key="customer">
                <span>客户</span><p>{infoData.iCustomerName}</p>
              </div>
              :
              ""
          }
          {
            infoData.bRepair ?
              <div key="vouchdate">
                <span>单据日期</span><p>{infoData.vouchdate}</p>
              </div>
              :
              ""
          }
          {/* {
            (billingStatus == 'Shipment' || billingStatus == 'PresellBack') ?
              <div key="billNo">
                <span>单据编号</span><p>{infoData.billNo}</p>
              </div>
              :
              ""
          } */}
          {
            billingStatus == 'PresellBill' ?
              <div key="takeWay">
                <span>提货方式</span><p>{infoData.takeWay.name}</p>
              </div>
              :
              ""
          }
          {
            (billingStatus == 'PresellBill' && infoData.warehouse.id) ?
              <div key="warehouse">
                <span>交货仓库</span><p>{infoData.warehouse.name}</p>
              </div>
              :
              ""
          }
          {
            (billingStatus == 'PresellBill') ?
              <div key="reserveDate">
                <span>预交货日期</span><p>{infoData.reserveDate}</p>
              </div>
              :
              ""
          }
          {
            (billingStatus == 'PresellBill') ?
              <div key="address">
                <span>收货信息</span>
                <p>{infoData.contacts} {infoData.phone}<br/>{infoData.addressCascader.name}{infoData.address}</p>
              </div>
              :
              ""
          }
          {/* {
            (billingStatus == 'PresellBill' || billingStatus == 'Shipment' || billingStatus == 'PresellBack') ?
              <div key="reserveDate">
                <span>预交货日期</span><p>{infoData.reserveDate}</p>
              </div>
              :
              ""
          }
          {
            (billingStatus == 'PresellBill' || billingStatus == 'Shipment' || billingStatus == 'PresellBack') ?
              <div key="address">
                <span>收货信息</span>
                <p>{infoData.contacts} {infoData.phone}<br />{infoData.addressCascader.name}{infoData.address}</p>
              </div>
              :
              ""
          } */}
          {defineControl}
          {
            infoData.memo != '' ?
              <div key="memo">
                <span>备注</span><p>{infoData.memo}</p>
              </div>
              :
              ""
          }
        </div>

      </div>
    )
  }

  toggleDelZero = (e) => {
    this.props.paymodeActions.toggleDelZero(e.target.checked)
  }

// 抹零
  renderDelZero = (data) => {
    const {name, isEnable, isDefaultValue} = data


    if (!isEnable) return false
    return (
      <div>
        <span>{name}</span>
        <span className='render-zero'><Checkbox onChange={this.toggleDelZero} checked={isDefaultValue}/></span>
      </div>

    )
  }


// 畅捷支付三种方式只能存在一种
//
// disabled状态
  getTabDisableStatus(payment, paymodes) {
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


// 渲染'找零'
  getChangeValue = () => {
    const {paymodes} = this.props.paymode
    let cashInUse = false
    _.forEach(paymodes, pay => {
      if (pay.paymentType == 1 && pay.value > 0) {
        cashInUse = true
      }
    })
    return cashInUse && getFixedNumber(this.receipts - this.receivable) > 0 && getFixedNumber(this.receipts - this.receivable)
  }

// 是否显示上一单信息
  isShowLastBill = (lastBill, billingStatus, bRepair, bHang, products, userInfoStatus) => {


    switch (billingStatus) {
      case 'PresellBill':/*预订 */
      case 'Shipment':/*交货*/
      case 'PresellBack':/*退订*/
      case 'FormerBackBill':/*原单退货*/
      case 'NoFormerBackBill':/*非原单退货*/
        return false
    }

    // 补单
    // 新增商品
    // 新增会员信息
    // 本地存有上一单的信息

    return !bRepair && !bHang && !userInfoStatus && _.isEmpty(products) && !_.isEmpty(lastBill)
    //return !(bRepair || userInfoStatus || !_.isEmpty(products) || _.isEmpty(lastBill))

  }

  render() {

    const {products, money, productInfo} = this.props.product;
    const {billingStatus, MinPercentGiveMoneyPre, bRepair, bHang, infoData} = this.props.uretailHeader
    const {visible, currentFocus, paymodes, delZero, settle, quickPay, onSettle} = this.props.paymode;
    const {userInfoStatus} = this.props.member;
    const paymodeActions = this.props.paymodeActions;
    const {isMounted} = this.state
    let numDecimal = products.length > 0 ? (getOptions().numPoint_Quantity ? getOptions().numPoint_Quantity.value : 2) : 2;


    // 赊销相关处理
    const {iOwesState = 0} = infoData



    const preferentials = [];
    for (let attr in money) {
      const {value, text, preferential} = money[attr];
      if (value === 0 || !preferential || billingStatus === 'PresellBack' || billingStatus === 'Shipment' && infoData.bDeliveryModify === false) continue;
      preferentials.push(<div key={attr}>
        <span>{text}</span><span className="fr">{getFixedNumber(value)}</span>
      </div>);
    }


    this.total = getFixedNumber(money.Total.value)
    // 应收
    this.receivable = getFixedNumber(money.Gathering.value)


    // 实收

    this.receipts = getFixedNumber(_.reduce(paymodes, (a, b) => {
      return Number(a) + (isNaN(b.value) ? 0 : Number(b.value))
    }, 0))


    const lastBill = isMounted && JSON.parse(localStorage.getItem('billing_lastBill'))

    const billingInfo = this.getBillingInfo();

    const productsIsEmpty = _.isEmpty(products)


    const quickPayLength = quickPay && quickPay.length || 0

    return (<div className="billing-Settlement">

      {this.isShowLastBill(lastBill, billingStatus, bRepair, bHang, products, userInfoStatus) ? (<div>
        <div className="billing-s-details">

          <div className="prev-detail">上一单</div>
          <div className="change-detail clearfix"><span>找零</span><span>{lastBill.change}</span></div>
          <div className="star">*******************************************************************************</div>

          <div className="clearfix"><span>应收</span><span>{lastBill.receivable}</span></div>
          <div className="clearfix"><span>实收</span><span>{lastBill.receipts}</span></div>

        </div>
      </div>) : (<div>
        {billingInfo}
        <div className="billing-line"></div>
        <h1>结算明细</h1>


        <div className="billing-conts">
          <div className="billing-list">
            <div className="billing-list-money"><span>商品金额</span><span className="fr">{this.total}</span></div>

            {preferentials}

            {/*退货时如果有折扣,展现“退货折扣额*/}
            {(billingStatus === 'NoFormerBackBill' || billingStatus === 'FormerBackBill') && money.BackDiscount.value != 0 &&
            <div className="return-discount"><span>退货折扣额</span><span
              className="fr">{getFixedNumber(money.BackDiscount.value)}</span>
            </div>}
            {/*交货，退订时如果有折扣,展现“折扣额*/}
            {(billingStatus === 'Shipment' && infoData.bDeliveryModify === false || billingStatus === 'PresellBack') && money.Preferential.value != 0 &&
            <div className="return-discount"><span>折扣额</span><span
              className="fr">{getFixedNumber(money.Preferential.value)}</span>
            </div>}
            {/*原单退货，如果原单有折扣,展现“原单折扣额*/}
            {(billingStatus === 'FormerBackBill' || billingStatus === 'NoFormerBackBill') && money.FoldDiscount.value != 0 &&
            <div className="return-discount"><span>原单折扣额</span><span
              className="fr">{getFixedNumber(money.FoldDiscount.value)}</span>
            </div>}
            {this.renderDelZero(delZero)}

          </div>


        </div>


        <div className="billing-btns">
          {!productsIsEmpty && <div className='billing-conts'>
            <div className="billing-list clearfix"><span>总数量</span><span
              className="fr">{money.TotalQuantity.value.toFixed(numDecimal)}</span>
            </div>
          </div>}
          {/*交货状态下显示'已收款'*/}
          {(billingStatus === 'Shipment' || billingStatus === 'OnlineBill') &&
          <div className="clearfix billing-receivables"><span>已收款</span><span
            className="fr">{getFixedNumber(money.Deposit.value)}</span></div>}
          <div className="money"><span>应收</span><span className="fr ">{this.receivable}</span></div>

          <div className="billing-js-zfb clearfix">


            {_.map(_.chunk(_.concat([], quickPay || [], settle), 2), (p, i) => {
              const settleIsFullCol = p.length < 2


              return <p key={i}
                        className={classnames('billing-settleButton-wrap', {'billing-settleButton-defaultwrap': settleIsFullCol})}>{_.map(p, (item, j) => {

                //默认结算
                if ((i * 2 + j) == quickPayLength) {

                  return (<Button key="settle" type="pay" onClick={paymodeActions.defaultSettle}
                                  disabled={productsIsEmpty}>{settle.name + settle.hotKey}</Button>)

                }

                //快捷支付方式
                return (
                  <Button key={item.paymethodId} onClick={() => {
                    paymodeActions.shortcutSettle(item.paymethodId)
                  }}
                          disabled={productsIsEmpty}>
                    <SvgIcon type={paymentIconDict[item.paymentType] || 'tongyongzhifufangshi'}/>
                    {item.name}</Button>)
              })}</p>
            })}


          </div>

        </div>


      </div>)}

      <Modal
        wrapClassName="billing-settle-modal-wrap"
        maskClosable={false}
        visible={visible}
        //title="支付"
        closable={!onSettle}
        width="846px"
        onOk={this.handleSettle}
        onCancel={this.handleCancel}
        footer={null}>
        {/*tip*/}
        <Spin spinning={onSettle}>
          <div style={{position: 'relative'}}>
            <div>
              <div className='pay-body' style={{
                padding: `${billingStatus === 'PresellBill' ? '15' : '30'}px 30px 10px`
              }}>
                <div className="clearfix">

                  {/*可赊销状态不显示预订比例提示*/}
                  { iOwesState == 0 && billingStatus === 'PresellBill' && (<div className="billing-infor-proportion">
                    <SvgIcon className="icon-infor" type="tishi"/>
                    预订交款不得低于{getFixedNumber(_.multiply(this.receivable, MinPercentGiveMoneyPre) * 0.01)},
                    比例不得低于{MinPercentGiveMoneyPre}%</div>)}


                  <Tabs
                    hideAdd
                    onChange={this.onTabsClick}
                    activeKey={currentFocus + ''}
                    animated={false}
                    className="billing-pay-tab"
                  >
                    {/*支付方式显示排序，默认 > 快捷 > 普通*/}
                    {_.map(_.sortBy(paymodes, pay => {
                      if (pay.isDefault) return -2
                      if (pay.isQuick) return -1
                      return 0
                    }), this.renderTabs)}
                  </Tabs>


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
                              _.map(_.sortBy(paymodes, pay => pay['order'] || 0), (paymode) => {
                                const index = paymode.paymethodId
                                return <div key={index + ''} style={{'display': paymode.show ? 'block' : 'none'}}>
                                  <span className="payment-name-list">{paymode.name}</span>
                                  <span className="fr empty"></span>
                                  <span className="fr pay-close-btn"

                                        onClick={() => {
                                          this.handlePaymode('delete', paymode, index)

                                        }}> <i className="anticon anticon-delete pay-delect-margin"></i> </span>
                                  <span className="fr"><input id={`input${index}`}
                                                              onBlur={e => this.onBlur(paymode, index, e)}
                                                              onFocus={() => {
                                                                if (index == currentFocus) return
                                                                paymodeActions.toggleFocus(index)
                                                              }
                                                              }
                                                              value={paymode.value}

                                                              onChange={e => this.handleChange(paymode, index, e)}/></span>

                                </div>
                              })
                            }
                          </div>
                        </div>
                      </div>
                      <div className="pay-total">
                        <div><span>应收</span><span>{this.receivable}</span></div>
                        <div><span>实收</span><span>{this.receipts}</span></div>
                        <div className="pay-zl"><span>找零</span><span>
                    {this.getChangeValue()}
                    </span></div>

                      </div>
                    </div>

                  </div>
                  <div style={{width: '310px', float: 'right'}}>

                    <InputButtonPanel onChange={this.onPanelChange}/>

                    <Button type='primary' onClick={this.handleSettle}
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
          </div>
        </Spin>
      </Modal>
    </div>)

  }

}

function mapStateToProps(state) {
  return {
    product: state.product.toJS(),
    paymode: state.paymode.toJS(),
    uretailHeader: state.uretailHeader.toJS(),
    member: state.member.toJS(),
  }
}

function mapDispatchToProps(dispatch) {
  return {
    save: bindActionCreators(save, dispatch),
    updatePaymode: bindActionCreators(updatePaymode, dispatch),
    addCard: bindActionCreators(addCard, dispatch),
    paymodeActions: bindActionCreators(paymodeActions, dispatch),
    reserveActions: bindActionCreators(reserveActions, dispatch),
    toggleLoadingStatus: bindActionCreators(toggleLoadingStatus, dispatch),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(RightContent);

// 电子秤


import React, {Component} from 'react'
import {Row, Col, Button} from 'antd'

import {connect} from 'react-redux'
import _ from 'lodash'
import {
  initElectronEvent,
  reWeigh,
  operationConfig,
  getFromMapOrObject
} from 'src/common/redux/modules/billing/electronicBalance'
import {getFixedNumber} from "src/common/redux/modules/billing/paymode"


function NumDiv(props) {
  return <div className="electronic-display-num-splict">0
    <div>{props.num}</div>
  </div>
}

function NumPoint(props) {
  let point = '.'
  if (props && props.point === false) {
    point = false
  }

  return <div className="electronic-display-num-point">.
    <div>{point}</div>
  </div>
}

export class ElectronicBalance extends Component {
  constructor(props) {
    super(props)
  }

  componentWillMount() {
    // 注册事件
    this.electronEvent = initElectronEvent(this.props.dispatch)
  }

  componentWillUnmount() {
    // 清除事件

    this.electronEvent && this.electronEvent.remove()
  }


  renderValue(value) {
    value = _.trim(value)
    const rest = value.split('.')


    const intArr = rest[0].split('')
    const intLength = intArr.length
    intArr.unshift(...(_.times(3 - intLength, i => false)))
    const result = _.map(intArr, (s, i) => <NumDiv num={s} key={'int' + i}/>)

    if (rest.length > 1) {
      result.push(<NumPoint key={'point'}/>)
      const floatArr = rest[1].split('')

      const floatLength = floatArr.length
      floatArr.push(...(_.times(3 - floatLength, i => false)))

      result.push(...(_.map(floatArr, (s, i) => <NumDiv num={s} key={'float' + i}/>)))
    } else {
      result.push(<NumPoint key={'point'} point={false}/>, ...(_.times(3, i => <NumDiv num={false}
                                                                                       key={'float' + i}/>)))
    }
    return result
  }

  render() {
    const {tare, weigh} = this.props.electronicBalance.toJS()
    const focusedRow = this.props.focusedRow || {
      fQuotePrice: 0
    }
    const enableWeight = getFromMapOrObject(focusedRow, 'enableWeight')
    const fPrice = getFromMapOrObject(focusedRow, 'fPrice')


    return operationConfig.bMatch && (<div className="electronic-balance">
      <Col className="electronic-display">
        <div className="electronic-display-count">

          {operationConfig.showTare && <div className="electronic-display-list">
            <div className="electronic-display-title">皮重(千克)</div>
            <div className="electronic-display-num">
              {this.renderValue(tare)}
            </div>
          </div>}

          <div className="electronic-display-list">
            <div className="electronic-display-title">重量(千克)</div>
            <div className="electronic-display-num">
              {this.renderValue(weigh)}
            </div>
          </div>

          <div className="electronic-display-list">
            <div className="electronic-display-title">单价(元/千克)</div>
            <div className="electronic-display-num">
              {this.renderValue(getFixedNumber(enableWeight ? fPrice : 0))}
              {/* {this.renderValue( focusedRow.fQuotePrice)}*/}
            </div>
          </div>
          <div className="electronic-display-list">
            <div className="electronic-display-title">金额(元)</div>
            <div className="electronic-display-money">
              {this.renderValue(getFixedNumber(enableWeight ? fPrice * weigh : 0))}

            </div>
          </div>
        </div>

      </Col>
      <Col className="electronic-operation-btn">
        {operationConfig.showTare && <Button className="peel-btn" onClick={() => {
          cb.electron.sendOrder('tare', result => {
            if (result.code == 999) {
              cb.utils.alert({
                title: result.message,
                type: 'error'
              })
            }
          })
        }}>去皮</Button>}

        {operationConfig.showTare && <Button className="reset-btn" onClick={() => {
          cb.electron.sendOrder('zeroReset', result => {
            if (result.code == 999) {
              cb.utils.alert({
                title: result.message,
                type: 'error'
              })
            }
          })
        }}>置零</Button>}
        <Button className="weigher-btn" onClick={() => {
          this.props.dispatch(reWeigh())
        }}>取数</Button>

      </Col>

    </div>)
  }
}

function mapStateToProps(state) {
  return {
    electronicBalance: state.electronicBalance,
    focusedRow: state.product.get('focusedRow')
  }
}

function mapDispatchToProps(dispatch) {
  return {
    dispatch
  }
}


export default connect(mapStateToProps, mapDispatchToProps)(ElectronicBalance)

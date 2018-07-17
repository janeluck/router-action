import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Button, Modal, Input, Tabs} from 'antd'
import _ from 'lodash'
import SvgIcon from 'SvgIcon'
import InputButtonPanel from './InputButtonPanel'
import classnames from 'classnames'



// 储值卡输入
export  default  class StoredValuePay extends Component {
  constructor(props) {
    super(props)
    this.state = {
      cards: []
    }
  }

  defaultProps = {
    onBack: function () {
    }
  }
  renderList = (arr) => {
    return _.map(arr, (card, i) => {
      return <li key={i}>
        <span><input type="text"/></span>
        <span>100</span>
        <span><input type="text"/></span>
        <span>x</span>
      </li>

    })

  }

  back = () => {
    this.props.onBack(this.state.cards)
  }

  render() {
    const {cards} = this.state
    return (
      <div>

        <div>
          <div onClick={this.back} className="ant-title-header">返回支付页</div>
        </div>
        <div className='clearfix'>
          <div style={{width: '50%', float: 'left'}}>
            <ul>
              <li>
                <span>卡号</span>
                <span>余额</span>
                <span>使用金额</span>
              </li>
              {this.renderList(cards)}
            </ul>


          </div>
          <div style={{width: '50%', float: 'left'}}>
            <div>
              <div>
                <input type="text"/>
                <button>确定</button>
                <span>未找到储值卡</span>
              </div>
              <div>
                <InputButtonPanel/>
              </div>

            </div>
          </div>


        </div>

        <div className='clearfix'>
          <div style={{width: '50%', float: 'left'}}>储值卡总额: <span></span></div>
          <div style={{width: '50%', float: 'left'}}>
            <button onClick={this.back}>确定</button>
          </div>

        </div>

      </div>

    )
  }
}

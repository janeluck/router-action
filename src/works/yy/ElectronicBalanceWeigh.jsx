// 电子秤传回参数

import React, {Component} from 'react'
import {Modal, Button} from 'antd'


function initElectronEvent(func) {

  if (window && window.Electron) {
    // 注册渲染线程通信事件
    const ipcRenderer = Electron.ipcRenderer
    // 注册向服务端推送指令
    const electronicBalanceOnChange = function (event, arg) {
      console.log('取重:')
      console.log(arg)
      func({tare: JSON.parse(arg).tare, weigh: JSON.parse(arg).weight})
    }

    // 注册服务端推送
    ipcRenderer.addListener('electronicBalance-change', electronicBalanceOnChange)

    return {
      remove: function () {
        ipcRenderer.removeListener('electronicBalance-change', electronicBalanceOnChange)
      }
    }

  }
  return {
    remove: function () {

    }
  }
}


export default class ElectronicBalanceWeigh extends Component {

  constructor(props) {
    super(props);

  }

  setWeigh = ({tare, weigh} = {}) => {

    if (this.span) {
      this.span.innerHTML = weigh
    }
  }

  componentDidMount() {

    window.mockElectronChange = ({tare, weigh} = {}) => {
      this.setWeigh({tare, weigh})
    }
  }

  componentWillMount() {
    // 订阅电子秤推送事件
    this.electronEvent = initElectronEvent(this.setWeigh)
  }



  componentWillUnmount() {
    // 清除事件
    this.electronEvent && this.electronEvent.remove()

  }


  onKeyDown(key) {
    if (key === 'Enter')
      this.handleOk();
  }

  handleOk = () => {

    this.props.handleOk && this.props.handleOk()
    this.props.close && this.props.close()


  }
  handleCancel = () => {
    // close
    this.props.handleCancel && this.props.handleCancel();
    this.props.close && this.props.close()
  }

  render() {


    cb.utils.confirm(
      {
        title: <div>已读取重量：
          <span ref={span => this.span = span} />，该重量是否正确？
        </div>,
        onOk: this.handleOk,
        onCancel: this.handleCancel

      }
    )


    return null

  }
}

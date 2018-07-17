# 交接文档


## 业务模块

- 零售收款批量结算
- 开单结算
- Electron电子秤App



### 零售收款批量结算

#### 1. 模块相关


|-|负责人|文档地址|
|-|-|-|
|产品|袁慧|LS/02需求分析/零售管理/新零售V1.0需求分析-门店赊销.docx|
|后端|张琳|LS/04接口文档/U零售开单界面-API接口.docx|



#### 2. 前端

##### 2.1 页面

- 入口：`零售管理->零售收款`
- 展现：

![b4ec273e.png](:storage/6cd5f565-4f39-4f5e-8b28-385af80f45ff/b4ec273e.png)


##### 2.2 代码结构

- 入口：`src/common/components/meta/CreditGathering.jsx`
- 核心依赖：`src/common/components/SettleCommon/PayBar.jsx`
- 业务实现流程：通过gridmodel拿到表体选择的需要批量结算的零售单数据，引用PayBar组件实现结算逻辑
- 核心组件分析
  + PayBar
    - 概述：结算固定栏，顶层容器使用state处理交互逻辑，以props传入的方式管理木偶子组件。用于展示应收数据, 快捷结算按钮和默认结算模态层触发按钮。
    + 组织结构：
      ![ccfd5969.png](:storage/6cd5f565-4f39-4f5e-8b28-385af80f45ff/ccfd5969.png)

    + 具体方法：
      1. 组件初次渲染完调用服务`getPayFunctionKeys`获取可使用的支付方式完成state的初始化
      2. `settlePayClick`和`handleCancel`处理结算模态层的打开关闭
      3. `save`方法为快捷结算和普通结算统一调用,最后一个参数判断是否为快捷结算, 代码里都有详细的注释。

    + Children组件
      - QuickPay： 快捷结算
      - SettlePay： 默认结算
      - SettleModal： 结算弹出层

  + SettleModal
     + 概述：结算弹出层，处理使用支付方式交互逻辑。
    + 组织结构：
      ![da699d80.png](:storage/6cd5f565-4f39-4f5e-8b28-385af80f45ff/489c2448.png)

    + 生命周期：
      1. 组件初始化时从props上拿到数据通过`getStateFromProps`生成原始态state
      2. 重新打开层时通过`componentWillReceiveProps`重置state为原始态
      3. 通过`shouldComponentUpdate`控制只有在可视状态下更新渲染
      4. 如果是新打开弹出层, 通过`ComponentDidUpdate`在完成渲染后自动聚焦默认的支付方式input



##### 2.3 需要注意的点

1. `PaymentTabs`，`QuickPay`和`SettlePay`，继承的是纯组件`React.PureComponent`进行了优化，新增功能时需要注意是否符合刷新规则；
2. `SettleModal`的支付方式集合`$$rePayments`使用了`Immutable.Map`,传入具体处理方法时有做values处理，生成了迭代器。更新和使用该数据时需要注意数据结构形式；








### 开单结算

#### 1. 模块相关


|-|负责人|文档地址|
|-|-|-|
|产品|袁慧|LS/02需求分析/零售管理/新零售V1.0需求分析-零售开单.docx|
|后端|赵哲|LS/04接口文档/零售收款单保存.docx|



#### 2. 前端

##### 2.1 页面

- 入口： `零售管理 -> 零售开单`
- 页面：![fef53257.png](:storage/6cd5f565-4f39-4f5e-8b28-385af80f45ff/fef53257.png)



##### 2.2 代码结构

- 入口：
  - PC：`src/common/components/billing/RightContent.jsx`
  - Touch：`src/common/components/billing-touch/right-content/SettlementDetail.jsx`
- 公共依赖：
  - redux：`src/common/redux/modules/billing/paymode.jsx`
  - 通用方法： `src/common/components/SettleCommon/index.jsx`
- 业务实现流程：通过redux的`uretailHeader`和`product`拿到单据状态和商品信息，在paymode里实现业务规则计算，处理用户交互最终校验通过后存盘；

- 备注：
  业务与赊销收款主体一致，具体规则文件里代码注释比较全，可以作为细致参考。

### 待完成

+ '收款吧'结算方式后台还在写，前端暂时按照支付宝形式处理；
+ 收款单批量结算与后端对接小票打印。




### Electron电子秤App

#### 1. 项目相关


|-|负责人|文档地址|
|-|-|-|
|产品|袁慧|LS/02需求分析/零售管理/新零售V1.0需求分析-开单称重.docx|
|后端|蔡河威|-|

#### 2. 前端

##### 2.1 项目概述
+ 项目简介：使用`Electron`打包远程url地址生成windows桌面应用，集成本地串口，实现电子称重；
+ 安装部署：使用yarn管理npm依赖，具体请阅读项目`README.md`；
+ 项目主要文件：
  - main.js：electron入口主文件，打包远程地址，注册通信机制；
  - scale.js：调取本地node接口数据；
  - package.json：打包参数配置。

##### 2.2 通信机制

+ 共享数据：
  - Electron端：`global`下写入共享对象`sharedObj`；
  ```javascript
  global.sharedObj = {
        scaleConfig: scaleconfig,
        macAddress: mac
  }
  ```
  - 客户端：全局对象`cb`下封装了获得共享对象的通用方法。
  ```javascript
     /*
      * return {Object}
       * */
  cb.electron.getSharedObject = function(key) {
      const sharedObj = Electron.remote.getGlobal('sharedObj');
          return key ? sharedObj[key] : sharedObj;
  }
  ```
  -



+ 主进程和渲染进程通信：

  - Electron端：主进程监听名为`electronic-order`的事件, 回调里使用promise处理异步机制；
  ```javascript
  // 通用指令注册（类似ajax的通信机制）
    ipcMain.on('electronic-order', (event, orderID, order, data) => {
        console.log(`收到指令${order}, 参数为${data}, 开始执行...`)  // prints "ping"
        if (typeof  orderCollection[order] === 'function') {
            const p = new Promise(function (resolve) {
                orderCollection[order](resolve, data)
            })
            p.then(function (result) {
                console.log(`指令${order}已经执行, 结果: ${result}`)
                event.sender.send('electronic-order-reply', orderID, result)
            })
        }

    })


  ```

  - 客户端：`html.jsx`封装了`cb.electron.sendOrder`方法，通过`order`名和调用时间戳生成唯一的id，以标识会话。具体使用方式类似于`proxy`。
  ```javascript
  cb.electron.sendOrder = function(order, data) {
          return new Promise(function(resolve) {
            // 为事件生成唯一ID
            const orderID = new Date().getTime()
            Electron.ipcRenderer.send('electronic-order', orderID, order, data)
            var callback = function(event, executedOrderID, result) {
               console.log(result)
               if (orderID === executedOrderID) {
                   Electron.ipcRenderer.removeListener('electronic-order-reply', callback)
                   resolve(result)
               }
            }
            Electron.ipcRenderer.addListener('electronic-order-reply', callback)
          })
  }

  ```





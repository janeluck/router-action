// 挂载到cube上的电子秤方法，初始防错预制，最后在html.jsx里写入
function logError() {
  console.error('本地未接电子秤')
}

cb.electron = {
  getSharedObject: logError,
  sendOrder: function (){
    logError()
    return {
      then: logError
    }
  }
}

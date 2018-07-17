import Immutable from 'immutable';
import {genAction, proxy} from 'yxyweb/common/helpers/util';
import _ from 'lodash'

export function OpenCashDrawer(params, callback) {
  return function (dispatch) {
    const config = {
      crossDomain: true,
      url: 'http://127.0.0.1:3000/openCashDraw',
      method: 'POST',
      params: params
    };
    proxy(config)
      .then(function (json) {
        callback(json);
      });
  }
};

export function openCashDrawNoCheck(callback) {
  return function (dispatch) {
    const config = {
      crossDomain: true,
      url: 'http://127.0.0.1:3000/openCashDrawNoCheck',
      method: 'POST',
      params: ""
    };
    proxy(config)
      .then(function (json) {
        callback(json);
      });
  }
}


/*
export function usingPOS() {
  return function (dispatch) {
    debugger
    const config = {
      crossDomain: true,
      url: 'http://127.0.0.1:3000/usingPOS',
      method: 'POST',
      params: {
        balatype: '4',
        balamoney: 0.01,
        // 返回
        //orderid:'LSDD201710310001'

      }
    };
    proxy(config)
      .then(function (json) {
        if (json.code !== 200) return;
        debugger
      });
  }
};
*/

// 畅捷支付（支付宝，微信，银联卡）
/*
export function refundOrCancel() {

  return function (dispatch) {
    debugger
    const config = {
      crossDomain: true,
      url: 'http://127.0.0.1:3000/refundOrCancel',
      method: 'POST',
      params: {
        balamoney: 0.01,
        orderid: 'LSDD201710310001',
        refund_orderid: 'LSTD201710310001'
      }
    };
    proxy(config)
      .then(function (json) {
        if (json.code !== 200) return;
        debugger
      });
  }
}
*/

//todo 直接使用银联卡


// 畅捷支付（支付宝，微信，银联卡）
export function usepos(params) {
  const config = {
    crossDomain: true,
    url: 'http://127.0.0.1:3000/usingPOS',
    method: 'POST',
    params
  }
  return proxy(config)
}


export function refundorcancel(params) {
  const config = {
    crossDomain: true,
    url: 'http://127.0.0.1:3000/refundOrCancel',
    method: 'POST',
    params
  };
  return proxy(config)
}




// 结算成功后开钱箱
export function opencashdrawnocheck() {
  const config = {
    crossDomain: true,
    url: 'http://127.0.0.1:3000/openCashDrawNoCheck',
    method: 'POST',
    params: ""
  };
  return proxy(config)
}


//小票打印接口
export function print_for_temp(data) {
  const config = {
    crossDomain: true,
    url: 'http://127.0.0.1:3000/print_for_temp',
    method: 'POST',
    params: {
      data: data
    }
  };
  return proxy(config)

}

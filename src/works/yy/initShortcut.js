/**
 * Created by janeluck on 17/9/26.
 */
import _ from 'lodash'
import {executeAction} from 'src/common/redux/modules/billing/config'
import getEventTarget from 'react-dom/lib/getEventTarget.js'
import Shortcut from './shortcut'

function isElementInViewport(el) {

  const rect = el.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}


export default function (functionKeys, dispatch) {


  // 组织所有的快捷键信息生成数组

  const shortcutsArr = _.flatten(_.map(functionKeys))

  // 初始化快捷键

  const sc = new Shortcut()
  sc.add(_.map(shortcutsArr, (item) => {
    return {
      shortCut: item.hotKeyExec,
      callback: function (nativeEvent) {
        console.log(`${item.command},${item.hotKeyExec}`)
        dispatch(executeAction(item.command, item))
      },
      getEnableState: function (nativeEvent) {

        // 打开modal层时禁用bill快捷键
        const modalMask = document.getElementsByClassName('ant-modal-mask') || []

        if (_.every(modalMask, mask => !!mask.classList.toString().match('ant-modal-mask-hidden'))) {
          // 开单首页商品录入框触发快捷键，其他输入文本类不触发
          const target = getEventTarget(nativeEvent)
          if (target.tagName == 'INPUT' || target.tagName == 'TEXTAREA') {
            // checkbox类触发
            return target.type === 'checkbox' || target.dataset.id === 'barcodeInput'
          }
          return true
        }
        return false
      }
    }
  }))

}


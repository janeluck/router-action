/**
 * Created by janeluck on 17/11/01.
 * 页面快捷键
 */
import _ from 'lodash'
import getEventTarget from 'react-dom/lib/getEventTarget.js'
import addEventListener from 'add-dom-event-listener'
import {getEventModifiers, getEventKey, stopPropagation, preventDefault} from 'yxyweb/common/components/common/Util'

export default class Shortcut {
  _options = {
    type: 'keydown',
    container: document
  }

  shortcutCollection = {}

  constructor(options) {
    let container = options && options.container
    // 检测container是否为dom元素， 默认绑到document
    if (_.isElement(container)) {
      container.tabIndex < 0 && (container.tabIndex = 0)
    } else {
      container = document
    }
    this._init(container, _.assign({}, this._options, options))
  }

  _init(container, options) {
    const that = this

    const func = function (nativeEvent) {
      const target = getEventTarget(nativeEvent)
      /*const charCode = getEventCharCode(nativeEvent)
      const character = String.fromCharCode(charCode).toLowerCase()*/
      // if (options.disable_in_input && (target.tagName == 'INPUT' || target.tagName == 'TEXTAREA')) return

      // activeKeys储存触发事件的键名
      let activeKeys = getEventModifiers(nativeEvent)
      const key = getEventKey(nativeEvent)
      if (key !== '' && _.indexOf(['Ctrl', 'Shift', 'Alt', 'Meta'], key) < 0) {
        activeKeys.push(key)
      }
      const activeCombination = that._convertKey(activeKeys.join('+'))
      const item = that.shortcutCollection[activeCombination]
      if (item && item.getEnableState(nativeEvent) && _.isFunction(item['callback'])) {
        preventDefault(nativeEvent)
        stopPropagation(nativeEvent)
        item['callback'](nativeEvent)
      }
    }


    that.handler = addEventListener(container, options.type, func)

  }

  _convertKey(shortCut) {
    // 排序后转字符串，得到唯一的键名
    return shortCut.toLowerCase().split('+').sort().join('+')
  }

  _toArray(obj) {
    return _.isArray(obj) ? obj : [obj]
  }

  // 添加快捷键
  // 可以添加一条或者多条
  // @param {Object, Array}
  // {
  // shortCut:'Alt+K',
  // callback(){},
  // 判断该快捷键是否启用
  // getEnableState(){
  // }

  add(obj) {
    const that = this
    const combinations = that._toArray(obj)
    _.forEach(combinations, item => {
      if (_.isEmpty(item.shortCut)) return
      that.shortcutCollection[that._convertKey(item.shortCut)] = _.assign({
        getEnableState(nativeEvent) {
          const tagName = getEventTarget(nativeEvent).tagName
          //return tagName !== 'INPUT' && tagName !== 'TEXTAREA' && tagName !== 'SELECT'
          return !(tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT')
        },
        callback() {
        }
      }, _.pick(item, ['getEnableState', 'callback']))
    })
  }


  // 清除所有的快捷键
  clear() {
    this.shortcutCollection = {}
  }

  // 清除指定快捷键
  // 可以删除一条或者多条
  // @param {String, Array}
  remove(obj) {
    const that = this
    const result = that._toArray(obj)
    _.forEach(result, item => {
      const k = that._convertKey(item)
      delete  that.shortcutCollection[k]
    })
  }


  unbind() {
    this.handler.remove()
  }

  destroy() {
    this.unbind()
  }


}

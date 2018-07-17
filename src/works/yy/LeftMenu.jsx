import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Menu, Badge, Popover} from 'antd';
import SvgIcon from 'SvgIcon'
import CancelPending from './left-content/CancelPending'
import BackBill from './left-content/BackBill'
import ECommerce from './left-content/ECommerce'
import ECommerceBack from './left-content/ECommerceBack'
import Unsubscribe from './left-content/Unsubscribe'
import Reserve from './left-content/Reserve'
import RepairBill from './left-content/RepairBill'
import Operator from './Operator'
import LockScreen from './LockScreen'
import _ from 'lodash'
import addEventListener from 'add-dom-event-listener'
import {executeAction} from '../../redux/modules/billing/config';
import {initBadge} from '../../redux/modules/billing/eCommerce';
import * as menuActions from '../../redux/modules/billing/menu';
import classnames from 'classnames'

const MenuItem = Menu.Item
const SubMenu = Menu.SubMenu


class LeftMenu extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hoverKey: '',
      isMounted: false
    }
  }

  shouldComponentUpdate(nextProps) {
    const {menu: {isReceiptHang, menuData, leftMenuIsOpen}, eCommerceBadge} = this.props
    const {menu: {isReceiptHang: isReceiptHang_next, menuData: menuData_next, leftMenuIsOpen: leftMenuIsOpen_next}, eCommerceBadge: eCommerceBadge_next} = nextProps

    return (menuData.length !== menuData_next.length ||
      eCommerceBadge !== eCommerceBadge_next ||
      isReceiptHang !== isReceiptHang_next ||
      leftMenuIsOpen !== leftMenuIsOpen_next)


  }

  componentDidMount() {
    // 根据页面高度， 管理左侧导航栏'更多'
    this.handleResize = addEventListener(window, 'resize', (e) => {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => {
        this.forceUpdate()
      }, 100)
    })


    this.setState({
      isMounted: true
    })
    /* 电商订单徽标 */
    this.props.initBadge();
    clearInterval(this.getOnlineBadge)
    this.getOnlineBadge = setInterval(() => {
      this.props.initBadge()
    }, 1000 * 3600)
  }

  componentWillUnmount() {
    this.handleResize.remove();
    this.props.menuActions.clearMenu();
  }


  getViewMenu = (menuData) => {
    // 减去logo高度，底部悬浮框高度， 本身的padding
    const menuWrapHeight = top.innerHeight - 60 - 80 - 50

    // 91px: 一条menu的高度
    // 根据可视高度计算可展示出的数目
    const visibleNumbers = _.max([Math.floor(menuWrapHeight / 91) - 1, 0])

    // 高度足够时全部展开
    if (visibleNumbers + 1 >= menuData.length) return menuData

    // 重组menu数据，放不下的收进'更多'
    return menuData.slice(0, visibleNumbers).concat({
      key: 'More',
      type: 'gengduo',
      title: '更多',
      count: _.find(menuData.slice(visibleNumbers), m => {
        return m.key === 'OnlineBill'
      }) && this.props.eCommerceBadge || 0,

      items: _.flatten(_.map(menuData.slice(visibleNumbers), remainder => {

        if (_.has(remainder, 'items')) {
          // 平铺
          return remainder['items']
        }
        return remainder
      }))
    })
  }

  getOnline = (item) => {
    let content = null;
    if (item.key === 'OnlineBill' && this.props.eCommerceBadge) {
      content = <Badge dot={true}>
        <span className='Uretail-billing-leftMenu-title'>{item.title}</span>
      </Badge>
    } else {
      content = <span className='Uretail-billing-leftMenu-title'>{item.title}</span>
    }
    return content
  }

  getMenuTitle = (menu, hoverKey) => {
    let title = null;
    if ((menu.key === 'OnlineBill' || menu.key === 'More') && this.props.eCommerceBadge) {
      title = <div>
        <Badge dot={true}>
          <SvgIcon type={menu.type + (hoverKey === menu.key ? 1 : '')}/>
        </Badge>
        <p>{menu.title}</p>
      </div>
    } else {
      title = <div>
        <Badge count={menu.count}>
          <SvgIcon type={menu.type + (hoverKey === menu.key ? 1 : '')}/>
        </Badge>
        <p>{menu.title}</p>
      </div>
    }
    return title
  }

  renderMenu = (data, hoverKey) => {
    const that = this
    const menuData = this.getViewMenu(data)
    const trigger = this.props.interactiveMode === 'touch' ? 'click' : 'hover'
    return _.map(menuData, menu => {
      const title = this.getMenuTitle(menu, hoverKey)
      return (

        <MenuItem


          className={classnames(`Uretail-billing-leftMenu-Style${_.has(menu, 'items') ? '2' : '1'}`)}


          key={menu.key} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <div id={`menu${menu.type}`}>
            <Popover
              //  visible
              //   getPopupContainer={() => document.getElementById(`menu${menu.type}`)}
              overlayClassName={classnames('Uretail-billing-leftMenu-popover',
                `UretailBillPopover${menu.type}`,
                this.props.className,

                `Uretail-billing-leftMenu-popoverStyle${_.has(menu, 'items') ? '2' : '1'}`,
                // 没有预置/设置快捷键的，不显示快捷键的提示浮层
                {
                  'hide': !(_.has(menu, 'items') || menu.hotKey)
                }
              )}
              placement={_.has(menu, 'items') ? "rightTop" : "leftBottom"}
              title={null}
              content={<ul> {_.has(menu, 'items') ?
                _.map(menu.items, item => {
                  return (<li key={item.key}
                              onClick={() => {
                                this.handleMenuClick(item.key)
                                const wrap = document.querySelector(`.UretailBillPopover${menu.type}`)
                                wrap && wrap.classList.add('ant-popover-hidden')
                              }}>

                    {this.getOnline(item)}
                    <span
                      className='Uretail-billing-leftMenu-hotkey'>{item.hotKey}</span></li>)
                }) : <em>{menu.hotKey}</em>} </ul>}
              trigger={trigger}>
              {title}
            </Popover>
          </div>
        </MenuItem>)
    })
  }

  handleMenuClick(key) {
    this.props.executeAction(key);
  }

  onMouseEnter = (e, domEl) => {
    const hoverKey = e.key
    this.setState({
      hoverKey
    })
  }
  onMouseLeave = (e, domEl) => {
    this.setState({
      hoverKey: ''
    })
  }


  render() {
    const {menuData, leftMenuIsOpen} = this.props.menu;
    const {hoverKey, isMounted} = this.state
    const otherMenus = [];
    let bottomMenu = null;

    menuData.forEach(item => {
      if (item.key === 'LockedScreen')
        bottomMenu = item;
      else
        otherMenus.push(item);
    });
    let bottomEle = null;
    if (bottomMenu) {
      bottomEle = (
        <div className={classnames("bottom-setting", {"hide": !leftMenuIsOpen})}
             onClick={() => this.handleMenuClick('LockedScreen')}>
          <Popover
            overlayClassName={`Uretail-billing-leftMenu-popover ${this.props.className}`}
            placement="right"
            title={null}
            content={<ul><em>{bottomMenu.hotKey}</em></ul>}
            trigger="hover">
            <SvgIcon type={bottomMenu.type}/><em>锁屏</em>
          </Popover>
        </div>
      );
    }


    return (
      <div>
        {isMounted && <Menu onClick={args => this.handleMenuClick(args.key)}>
          {this.renderMenu(otherMenus, hoverKey)}
        </Menu>}
        {bottomEle}
        <Reserve/>{/*预定*/}
        <Unsubscribe/>{/*退订根组件*/}
        <BackBill/> {/* 退货根组件 */}
        <ECommerce/> {/* 电商订单组件 */}
        <ECommerceBack/> {/* 电商订单退货组件 */}
        <CancelPending/> {/* 解挂根组件 */}
        <RepairBill/>{/*补单*/}
        <Operator/>{/*操作员弹出框*/}
        <LockScreen/>{/*锁屏*/}
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    menu: state.menu.toJS(),
    eCommerceBadge: state.eCommerce.get('badge')
  }
}

function mapDispatchToProps(dispatch) {
  return {
    executeAction: bindActionCreators(executeAction, dispatch),
    menuActions: bindActionCreators(menuActions, dispatch),
    initBadge: bindActionCreators(initBadge, dispatch),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(LeftMenu);

import React, {PureComponent} from 'react'



export default class SvgIcon extends PureComponent {
  render() {
    const {type, className, ...others} = this.props
    return <svg {...others} className={`fancyIcon ${className || ''}`}>
      <use xlinkHref={`#fancy-${type}`}></use>
    </svg>
  }
}


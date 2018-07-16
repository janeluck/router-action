import React, {PureComponent} from 'react'

export default class A extends PureComponent {
    render(){
        const {text} = this.props    
        return <button>{text}</button>
    }
}
/**
 * Created by jane on 03/06/2018.
 */
import React, {Component} from "react"


class Parent extends Component {

    state = {
        text: 'default'
    }

    handleChildClick = () => {
        this.setState({
            text: Math.random() * 1000
        });
    }


    render = function () {
        console.log('parent render');

        return (
            <div className="parent">
                this is parent!
                <Child text={this.state.text} onClick={this.handleChildClick}/>
            </div>
        );
    }
}


function set() {
    this.setState({
        text: this.state.text + '-'
    })
    this.setState({
        text: this.state.text + '-'
    })
    this.setState({
        text: this.state.text + '-'
    })
}


class Child extends Component {


    state = {
        text: this.props.text + '~'
    }

    componentWillReceiveProps = function (nextProps) {
        this.setState({
            text: nextProps.text + '~'
        });
    }


    handleClick = () => {
        debugger
        this.setState({
            text: 'clicked'
        });

        this.props.onClick();
    }


    handlesync = () => {
        debugger
        set.apply(this)
    }

    handleSettimeout = () => {
        setTimeout(() => {
            debugger
            this.setState({
                text: this.state.text + '-'
            })
            this.setState({
                text: this.state.text + '-'
            })
            this.setState({
                text: this.state.text + '-'
            })
        })
    }


    render = function () {
        console.log('child render');

        return (
            <div className="child">
                I'm child
                <p>something from parent:</p>
                <p>{this.state.text}</p>
                <button onClick={this.handleClick}>click me</button>
                <button onClick={this.handleSettimeout}>click settimeout me</button>
                <button onClick={this.handlesync}>click handlesync</button>
            </div>
        );
    }
}


export default Parent
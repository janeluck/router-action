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
        text: 'x'
    }


    handlesync = () => {
        console.trace()
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

    handleSettimeout = () => {
        setTimeout(() => {
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

    handlePromise = () => {
        const p = new Promise(resolve => {
            resolve()
        })
        p.then(result => {
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

    handleSyncSet0 = () => {
        this.setState({
            text: this.state.text + '-'
        })
        this.handleSyncSet1()
    }
    handleSyncSet1 = () => {
        this.setState({
            text: this.state.text + '-'
        })
        this.handleSyncSet2()
    }
    handleSyncSet2 = () => {
        this.setState({
            text: this.state.text + '-'
        })
    }


    render = function () {
        console.log('child render');

        return (
            <div className="child">
                I'm child
                <p>something from parent:</p>
                <p>{this.state.text}</p>
                <button onClick={this.handleSettimeout}>click settimeout me</button>
                <button onClick={this.handlesync}>click handlesync</button>
                <button onClick={this.handlePromise}>click handlePromise</button>
                <button onClick={this.handleSyncSet0}>click handleSyncSet0</button>
            </div>
        );
    }
}


export default Parent
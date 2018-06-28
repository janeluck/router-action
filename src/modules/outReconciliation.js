/**
 * Created by jane on 28/06/2018.
 */
/**
 * Created by jane on 03/06/2018.
 */
import React, {Component} from "react"
class Child1 extends Component {

    componentWillUnmount() {
        console.log('child unmount')
    }

    render() {
        return <div>child div</div>
    }

}

class Parent extends Component {

    state = {
        text: 'default',
        canClick: true
    }

    handleChildClick = () => {
        this.setState({
            text: Math.random() * 1000
        });
    }


    componentWillUnmount() {
        console.log('Parent unmount')
    }


    render = function () {
        console.log('parent render');
        //debugger
        const canClick = this.state.canClick
        const props = {}
        if (canClick) {
            props.onClick = function () {
                //alert(1)
                console.log('parent callback')
            }
        }

        return (
            <div className="parent">
                this is parent!

                <Child
                    ref={child => this.child = child}
                />


                <button
                    ref={btn => this.btn = btn}
                    {...props}

                >mmq
                </button>
                <button onClick={() => {
                    console.log(this.btn)
                    console.log(this.child)
                }}>
                    get ref
                </button>

                <button
                    onClick={() => {
                        this.setState({
                            canClick: !canClick
                        })
                    }}

                >toggle click: {String(canClick)}</button>
            </div>
        );
    }
}


class Child extends Component {


    state = {
        text: 1
    }


    render = function () {
        console.log('child render');
        const text = this.state.text
        //debugger
        return (

            <div>

                {this.state.text}
                <button onClick={() => {
                    setTimeout(() => {
                        this.setState({
                            text: text + 1
                        })
                        console.log("this.state.text:")
                        console.log(this.state.text)
                        setTimeout(function () {
                            for (var i = 1; i < 1000000000; i++) {
                                Math.random() * Math.random()
                            }
                            console.log('over')
                        }, 10)
                    })

                }}>change state and prop by click child button
                </button>

            </div>

        )
    }
}


export default Parent
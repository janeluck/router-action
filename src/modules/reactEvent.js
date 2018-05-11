import React, {Component} from "react"

let a = {
    v: {
        value: 0
    },
    q: 0,
    r: 0
}

class A extends Component {
    constructor(props) {
        super(props)
    }

    componentDidUpdate() {
        debugger
    }

    state = a

    componentDidMount() {
        this.div.addEventListener('click', e => {

            console.log('dom event')
        }, false)

        this.div.addEventListener('click', e => {

            console.log('dom event  capture')
        }, true)

        /*   debugger
           this.setState({
               v: 1
           }, () => {
               debugger
           })
           this.setState({
               q: 1
           }, () => {
               debugger
           })
           this.setState({
               r: 1
           }, () => {
               debugger
           })
   */

        a.v.value = 1
        this.setState(a)
    }

    componentWillUnMount() {

    }

    divClick = (e) => {
        console.log('react event')

    }

    render() {
        const {v, q, r} = this.state
        return <div>
            <div>
                {v.value}
                {q}
                {r}
            </div>

            click
            <div>
                <div ref={div => this.div = div} onClick={this.divClick}>

                    <div onClick={() => {
                        console.log('div child event click')
                    }}

                         onClickCapture={() => {
                             console.log('11div child event click')
                         }}

                    >
                        divchild
                    </div>


                </div>
            </div>

        </div>
    }
}


export default A
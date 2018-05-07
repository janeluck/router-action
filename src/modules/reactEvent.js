import React, {Component} from "react"

export default class A extends Component {
    constructor(props) {
        super(props)
    }

    componentDidMount() {
        this.div.addEventListener('click', e => {

            console.log('dom event')
        }, false)

        this.div.addEventListener('click', e => {

            console.log('dom event  capture')
        }, true)
    }

    componentWillUnMount() {

    }

    divClick = (e) => {
        console.log('react event')

    }

    render() {
        return <div>
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
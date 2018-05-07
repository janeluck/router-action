import React, {Component} from "react"

export default class A extends Component {
    constructor(props) {
        super(props)
    }

    componentDidMount() {
        this.div.addEventListener('click', e => {
            console.log('dom event')
        })
    }

    componentWillUnMount() {

    }

    divClick = (e) => {
        console.log('react event')
        e.stopPropagation()
    }

    render() {
        return <div>
            click
            <div>
                <div ref={div => this.div = div} onClickCapture={this.divClick}>

                    <div onClickCapture={() => {
                        console.log('div child event click')
                    }}>
                        divchild
                    </div>


                </div>
            </div>
        </div>
    }
}
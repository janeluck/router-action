import React, {Component} from "react"

let i = 0

export class BlockUI extends Component {
    constructor(props) {
        super(props)

    }

    state = {
        onSettle: false

    }

    componentDidMount() {

    }

    render() {
        const {onSettle} = this.state
        return <div>
            <button onClick={() => {
                console.log(i++)
                let k = 0, m = 0
                this.div && this.div.remove()

                setTimeout(() => {
                    console.log('executed!!!')
                }, 1000)
                debugger

                /*   setTimeout(() => {
                       for (k; k < 1000000000; k++) {
                           m++
                       }
                       console.log('completed')
                   })*/
            }
            }>CLICK
            </button>
            <div ref={div => this.div = div}>00000</div>
        </div>
    }

}
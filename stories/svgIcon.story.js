/**
 * Created by jane on 30/07/2018.
 */
import React, {Component} from 'react';


import SvgIcon from '../src/works/yy/SvgIcon';


export default class Story extends Component {
    constructor(props) {
        super(props)
        this.state = {
            value: 0
        }
    }

    render() {
        return <div>

            <SvgIcon type="x"/>
        </div>
    }

}

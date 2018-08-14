/**
 * Created by jane on 30/07/2018.
 */
import React, {Component} from 'react';

require('../src/refinement/SvgIcon/fancy.svg')
import SvgIcon from '../src/refinement/SvgIcon'


export default class Story extends Component {
    constructor(props) {
        super(props)
        this.state = {
            value: 0
        }
    }

    render() {
        return <div>

            <SvgIcon type="huli"/>
        </div>
    }

}

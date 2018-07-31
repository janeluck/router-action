/**
 * Created by jane on 30/07/2018.
 */
import React, {Component} from 'react';

import {storiesOf} from '@storybook/react';
import {action} from '@storybook/addon-actions';
import {linkTo} from '@storybook/addon-links';

import {Button, Welcome} from '@storybook/react/demo'
import InputButtonPanel from '../src/works/inputButtonPanel';


export default class Story extends Component {
    constructor(props) {
        super(props)
        this.state = {
            value: 0
        }
    }
    componentDidMount(){
        this.input.focus()
    }

    onPanelChange = (value) => {
        this.setState({
            value
        })
    }

    onChange = (e) => {
        const value = e.target.value
        this.setState({
            value
        })
    }

    render() {
        return <div>
            <input ref= {input => this.input = input} type="text" value={this.state.value} onChange={this.onChange}/>
            <InputButtonPanel onChange={this.onPanelChange}/>
        </div>
    }

}

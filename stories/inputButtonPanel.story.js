/**
 * Created by jane on 30/07/2018.
 */
import React, {Component} from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import { Button, Welcome } from '@storybook/react/demo';
import InputButtonPanel from '../src/works/inputButtonPanel';




export default class Story extends Component {
    
    render(){
        
        return <div>

            <input type="text"/>
            <InputButtonPanel />
        </div>
    }
    
}

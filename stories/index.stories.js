import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import { Button, Welcome } from '@storybook/react/demo';
import A from '../src/works/forTest';
import InputButtonPanelStory from './inputButtonPanel.story';
import SvgIcon from './svgIcon.story';

storiesOf('Welcome', module).add('to Storybook', () => <Welcome showApp={linkTo('Button')} />);

storiesOf('Button', module)
  .add('with text', () => <Button onClick={action('clicked')}>Hello Button</Button>)
  .add('with some emoji', () => (
    <Button onClick={action('clicked')}>
      <span role="img" aria-label="so cool">
        😀 😎 👍 💯
      </span>
    </Button>
  ));

storiesOf('A', module).add('to Storybook', () => <A text={'A TEXT BUTTON'} />);
storiesOf('InputButtonPanel', module).add('to Storybook', () => <InputButtonPanelStory  />);
storiesOf('SvgIcon', module).add('to Storybook', () => <SvgIcon  />);
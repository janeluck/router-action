/**
 * Created by jane on 18/04/2018.
 */
import React, {Component} from 'react'
import ReactDom, {render} from 'react-dom'
import PropTypes from 'prop-types';
import Animate from 'rc-animate';
import 'rc-dialog/assets/index.css';
import Blocking from './modules/blockingRender'
import BatchUpdate from './modules/batchUpdate'
import OutReconciliation from './modules/outReconciliation'
import {BlockUI} from './modules/process'
import ReactEventComponent from './modules/reactEvent'
import {Log, VisualizerProvider} from 'react-lifecycle-visualizer'
import {
    BrowserRouter as Router,
    Route,
    Link
} from 'react-router-dom'
import './modules/handleDate'
import './modules/lo'
import './wheel/APromise'
import './modules/sprintf'

import {ajax} from './util'

const Home = () => (
    <div>
        <h2>Home</h2>
    </div>
)

const About = () => (
    <div>
        <h2>About</h2>
    </div>
)

const Topic = ({match}) => (
    <div>
        <h3>{match.params.topicId}</h3>
    </div>
)

const Topics = ({match}) => (
    <div>
        <h2>Topics</h2>
        <ul>
            <li>
                <Link to={`${match.url}/rendering`}>
                    Rendering with React
                </Link>
            </li>
            <li>
                <Link to={`${match.url}/components`}>
                    Components
                </Link>
            </li>
            <li>
                <Link to={`${match.url}/props-v-state`}>
                    Props v. State
                </Link>
            </li>
        </ul>

        <Route path={`${match.path}/:topicId`} component={Topic}/>
        <Route exact path={match.path} render={() => (
            <h3>Please select a topic.</h3>
        )}/>
    </div>
)

const BasicExample = () => (
    <VisualizerProvider>
        <div style={{display: 'flex'}}>
            <Router>
                <div>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/about">About</Link></li>
                        <li><Link to="/topics">Topics</Link></li>
                        <li><Link to="/blocking">Blocking</Link></li>
                        <li><Link to="/reactEvent">ReactEventComponent</Link></li>
                        <li><Link to="/batchUpdate">BatchUpdate</Link></li>
                        <li><Link to="/outReconciliation">OutReconciliation</Link></li>
                    </ul>
          {/*          <BlockUI/>*/}
                    <hr/>

                    <Route exact path="/" component={Home}/>
                    <Route path="/about" component={About}/>
                    <Route path="/topics" component={Topics}/>
                    <Route path="/blocking" component={Blocking}/>
                    <Route path="/reactEvent" component={ReactEventComponent}/>
                    <Route path="/batchUpdate" component={BatchUpdate}/>
                    <Route path="/outReconciliation" component={OutReconciliation}/>
                </div>
            </Router>
            <Log/>
        </div>


    </VisualizerProvider>
)


render(<BasicExample/>, document.getElementById('root'))
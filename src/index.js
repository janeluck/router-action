/**
 * Created by jane on 18/04/2018.
 */
import React, {Component} from 'react'
import ReactDom, {render} from 'react-dom'
import PropTypes from 'prop-types';
import Animate from 'rc-animate';
import 'rc-dialog/assets/index.css';
import Dialog from 'rc-dialog'
import {
    BrowserRouter as Router,
    Route,
    Link
} from 'react-router-dom'


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
    <Router>
        <div>
            <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/topics">Topics</Link></li>
                <C/>
            </ul>

            <hr/>

            <Route exact path="/" component={Home}/>
            <Route path="/about" component={About}/>
            <Route path="/topics" component={Topics}/>
        </div>
    </Router>
)


class C extends Component {
    constructor(props) {
        super(props)
    }

    container = null


    state = {
        visible: true,
    }

    onAppear = (key) => {
        console.log('appear', key);
    }

    onEnter = (key) => {
        console.log('enter', key);
    }

    onLeave = (key) => {
        console.log('leave', key);
    }

    toggleAnimate = () => {
        this.setState({
            visible: !this.state.visible,
        });
    }


    componentDidMount() {

        const div2 = document.getElementById('div2')
        this.getContainer()
        this.renderPortal()
    }

    removePortal = () => {
        console.log('unmountComponent')
        ReactDom.unmountComponentAtNode(this.container)
    }

    getContainer() {
        const container = document.createElement('div')
        document.body.appendChild(container)
        this.container = container
    }

    renderPortal = () => {
        ReactDom.render(<Dialog
            maskClosable
            closable
            title={'ss'}
            visible
        >
            <p>first dialog</p>
            <button onClick={this.removeInAPromise}>
                click me!
            </button>
        </Dialog>, this.container)
    }

    removeInAPromise = () => {
        const p = new Promise(resolve => {
            resolve()
            console.log('Promise inter')
            this.removePortal()
            //  resolve()
        })

        p.then(() => {
            console.log('then consoled')
            debugger
            new ajax({
                async: false,
                url: 'http://www.json-generator.com/api/json/get/bTETpwnziq?indent=2'
            })
        })
    }

    render() {
        return <div id='div1'>
            div1
            <div id='div2'>
                div2
            </div>


        </div>
    }
}


render(<BasicExample/>, document.getElementById('root'))
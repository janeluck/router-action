/**
 * Created by jane on 18/04/2018.
 */
import React, {Component} from 'react'
import ReactDom, {render} from 'react-dom'
import PropTypes from 'prop-types';
import Animate from 'rc-animate';

import {
    BrowserRouter as Router,
    Route,
    Link
} from 'react-router-dom'

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




class D extends Component {
    render() {
        return <div>D

          <Demo />

        </div>
    }
}

class C extends Component {
    constructor(props) {
        super(props)
    }

    container = null

    componentDidMount() {

        const div2 = document.getElementById('div2')
        this.getContainer()
        this.renderPortal()
    }

    removePortal() {
        ReactDom.unmountComponentAtNode(this.container)
    }

    getContainer() {
        const container = document.createElement('div')
        document.body.appendChild(container)
        this.container = container
    }

    renderPortal = () => {
        ReactDom.render(<D/>, this.container)
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
        })
    }

    render() {
        return <div id='div1'>
            div1
            <div id='div2'>
                div2
            </div>
            <button onClick={this.removeInAPromise}>
                click me!
            </button>


        </div>
    }
}




const Div = (props) => {
  const { style, show, ...restProps } = props;
  const newStyle = { ...style, display: show ? '' : 'none' };
  return <div {...restProps} style={newStyle}/>;
};

Div.propTypes = {
  style: PropTypes.object,
  show: PropTypes.bool,
};

class Demo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      exclusive: false,
      enter: true,
    };
  }

  toggle(field) {
    this.setState({
      [field]: !this.state[field],
    });
  }

  render() {
    const style = {
      width: '200px',
      height: '200px',
      backgroundColor: 'red',
    };
    return (
      <div>
        <label><input
          type="checkbox"
          onChange={this.toggle.bind(this, 'enter')}
          checked={this.state.enter}
        />
          show</label>
        &nbsp;
        <label><input
          type="checkbox"
          onChange={this.toggle.bind(this, 'exclusive')}
          checked={this.state.exclusive}
        />
          exclusive</label>
        <br/><br/>
        <Animate
          component=""
          exclusive={this.state.exclusive}
          showProp="show"
          transitionName="fade"
        >
          <Div show={this.state.enter} style={style}/>
        </Animate>
      </div>
    );
  }
}


render(<BasicExample/>, document.getElementById('root'))